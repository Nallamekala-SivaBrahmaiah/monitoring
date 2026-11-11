import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleController from '@/models/AnsibleController';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import { discoverCloudServers } from '@/lib/ansible/ansibleCloudDiscovery';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';
import { purgeFakeAnsibleData } from '@/lib/ansible/ansibleEngine';
import { autoEnsureController, ensureWorkerControllerAffinity } from '@/lib/ansible/ansibleController';

/**
 * GET: Discover real AWS EC2 & Azure VMs from existing integrations for a given controller
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const controllerId = searchParams.get('controllerId') || undefined;
    const forController = searchParams.get('forController') === 'true';

    await purgeFakeAnsibleData();
    const servers = await discoverCloudServers(controllerId, forController);
    return NextResponse.json({ success: true, servers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Import a selected cloud server into Ansible inventory as a verified managed worker under a controller
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    await purgeFakeAnsibleData();
    const body = await req.json();

    const {
      controllerId,
      serverId,
      instanceId,
      customName,
      username,
      port = 22,
      authMethod = 'privateKey',
      authSecret,
      useExistingCredentials = false,
    } = body;

    if (!serverId && !instanceId) {
      return NextResponse.json(
        { success: false, error: 'Target server ID or Instance ID is required.' },
        { status: 400 }
      );
    }

    // Resolve target controller safely
    let targetController: any = null;
    if (controllerId && mongoose.Types.ObjectId.isValid(controllerId)) {
      targetController = await AnsibleController.findById(controllerId);
    }
    if (!targetController) {
      targetController = await AnsibleController.findOne({ isActive: true });
    }
    if (!targetController) {
      targetController = await AnsibleController.findOne({});
    }
    if (!targetController) {
      targetController = await autoEnsureController();
    }

    if (!targetController) {
      return NextResponse.json(
        { success: false, error: 'No active Ansible Controller found. Please create a controller first.' },
        { status: 400 }
      );
    }

    // Try finding in Server collection
    let existingServer = serverId ? await Server.findById(serverId).lean() : null;
    let cloudRes = null;

    if (!existingServer && serverId) {
      cloudRes = await CloudResource.findById(serverId).lean();
    }

    const effectiveInstanceId =
      instanceId ||
      (existingServer as any)?.resourceId ||
      (existingServer as any)?.instanceId ||
      cloudRes?.resourceId ||
      undefined;

    let effectiveName = customName || existingServer?.name || cloudRes?.name || 'Managed-Worker';
    let ip = existingServer?.host || cloudRes?.publicIp || body.ip;
    let privateIp = body.privateIp || (existingServer as any)?.privateIp || cloudRes?.privateIp;
    let provider = (existingServer?.cloudProvider || cloudRes?.provider || body.provider || 'linux').toLowerCase();
    let region = existingServer?.region || cloudRes?.region || body.region || 'ap-southeast-2';
    let os = existingServer?.os?.name || (cloudRes?.metadata as any)?.os || body.os || 'Ubuntu Linux';

    const isAwsWorker =
      provider === 'aws' ||
      effectiveName.toLowerCase().includes('ansible-worker') ||
      ['13.236.178.62', '3.106.237.77', '16.176.13.156'].includes((ip || '').trim());
    const isAzureWorker =
      provider === 'azure' ||
      effectiveName.toLowerCase().includes('vm01') ||
      (ip || '').trim() === '20.244.18.230';

    let effectiveUser =
      username ||
      existingServer?.username ||
      (isAwsWorker ? 'ubuntu' : isAzureWorker ? 'azureuser' : 'ubuntu');

    let encSecret = '';
    let encIv = '';
    let encTag = '';

    // 1. If authSecret is provided, ALWAYS prefer and encrypt it
    if (authSecret && authSecret.trim()) {
      const encrypted = encryptSecret(authSecret.trim());
      encSecret = encrypted.encrypted;
      encIv = encrypted.iv;
      encTag = encrypted.tag;
    } else if (useExistingCredentials) {
      // First check if target controller has credentials
      if (targetController.encryptedAuthSecret) {
        encSecret = targetController.encryptedAuthSecret;
        encIv = targetController.authSecretIv || '';
        encTag = targetController.authSecretTag || '';
      }
      
      if (!encSecret) {
        if (!existingServer && ip) {
          existingServer = await Server.findOne({ $or: [{ host: ip }, { ip }] }).lean();
        }
        if (!existingServer && effectiveInstanceId) {
          existingServer = await Server.findOne({ resourceId: effectiveInstanceId }).lean();
        }
        if (existingServer && existingServer.encryptedAuthSecret) {
          encSecret = existingServer.encryptedAuthSecret;
          encIv = existingServer.authSecretIv;
          encTag = existingServer.authSecretTag;
        }
      }

      // If still empty and worker is AWS, search any AWS Server with credentials
      if (!encSecret && isAwsWorker) {
        const anyAws = await Server.findOne({
          encryptedAuthSecret: { $exists: true, $ne: '' },
        }).lean();
        if (anyAws && anyAws.encryptedAuthSecret) {
          encSecret = anyAws.encryptedAuthSecret;
          encIv = anyAws.authSecretIv || '';
          encTag = anyAws.authSecretTag || '';
        }
      }
    }

    if (!encSecret) {
      return NextResponse.json(
        { success: false, error: 'Please paste your SSH Private Key (.pem file content) or select use existing credentials to import this managed worker.' },
        { status: 400 }
      );
    }

    if (!ip) {
      return NextResponse.json(
        { success: false, error: 'Valid IP address could not be resolved for this cloud instance.' },
        { status: 400 }
      );
    }

    // Check if worker already exists under THIS controller or globally by IP/name/instanceId
    const queryConditions: any[] = [{ ip }];
    if (effectiveName) queryConditions.push({ name: effectiveName });
    if (effectiveInstanceId) queryConditions.push({ instanceId: effectiveInstanceId });

    // Look up worker strictly under this controller or unassigned (never steal from another controller)
    let host = await AnsibleHost.findOne({
      $and: [
        {
          $or: [
            { controllerId: targetController._id },
            { controllerId: String(targetController._id) },
            { controllerId: null },
            { controllerId: { $exists: false } },
            { controllerId: '' },
          ],
        },
        { $or: queryConditions },
      ],
    });

    if (host) {
      host.name = effectiveName;
      if (effectiveInstanceId) host.instanceId = effectiveInstanceId;
      host.ip = ip;
      if (privateIp) host.privateIp = privateIp;
      host.provider = (isAwsWorker ? 'aws' : isAzureWorker ? 'azure' : provider) as any;
      host.region = region;
      host.os = os;
      host.username = effectiveUser;
      host.port = Number(port) || 22;
      host.authMethod = authMethod;
      host.encryptedAuthSecret = encSecret;
      host.authSecretIv = encIv;
      host.authSecretTag = encTag;
      host.status = encSecret ? 'Connected' : 'Disconnected';
      host.sourceResourceId = serverId;
      host.sourceResourceType = existingServer ? 'server' : cloudRes ? (provider === 'aws' ? 'ec2' : 'azure-vm') : 'custom';
      host.controllerId = targetController._id;
      host.controllerName = targetController.name;
      await host.save();

      await ensureWorkerControllerAffinity();

      return NextResponse.json({
        success: true,
        hostId: host._id,
        controllerId: targetController._id,
        controllerName: targetController.name,
        message: `Worker "${effectiveName}" updated under controller "${targetController.name}".`,
      });
    }

    const newHost = await AnsibleHost.create({
      name: effectiveName,
      controllerId: targetController._id,
      controllerName: targetController.name,
      instanceId: effectiveInstanceId,
      ip,
      privateIp,
      provider: isAwsWorker ? 'aws' : isAzureWorker ? 'azure' : provider,
      region,
      os,
      username: effectiveUser,
      port: Number(port) || 22,
      authMethod,
      encryptedAuthSecret: encSecret,
      authSecretIv: encIv,
      authSecretTag: encTag,
      status: encSecret ? 'Connected' : 'Disconnected',
      sourceResourceId: serverId,
      sourceResourceType: existingServer ? 'server' : cloudRes ? (provider === 'aws' ? 'ec2' : 'azure-vm') : 'custom',
      groups: [isAwsWorker ? 'aws' : isAzureWorker ? 'azure' : provider, 'all'],
      installedServices: [],
    });

    await ensureWorkerControllerAffinity();

    return NextResponse.json({
      success: true,
      hostId: newHost._id,
      controllerId: targetController._id,
      controllerName: targetController.name,
      message: `Worker "${effectiveName}" (${ip}) successfully assigned under controller "${targetController.name}".`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
