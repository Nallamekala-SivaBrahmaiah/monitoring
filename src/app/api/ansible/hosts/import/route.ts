import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import { discoverCloudServers } from '@/lib/ansible/ansibleCloudDiscovery';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';
import { purgeFakeAnsibleData } from '@/lib/ansible/ansibleEngine';

/**
 * GET: Discover real AWS EC2 & Azure VMs from existing integrations
 */
export async function GET() {
  try {
    await purgeFakeAnsibleData();
    const servers = await discoverCloudServers();
    return NextResponse.json({ success: true, servers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Import a selected cloud server into Ansible inventory as a verified managed node
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    await purgeFakeAnsibleData();
    const body = await req.json();

    const {
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

    let effectiveName = customName || existingServer?.name || cloudRes?.name || 'Managed-Node';
    let ip = existingServer?.host || cloudRes?.publicIp || body.ip;
    let privateIp = body.privateIp || (existingServer as any)?.privateIp || cloudRes?.privateIp;
    let provider = (existingServer?.cloudProvider || cloudRes?.provider || body.provider || 'linux').toLowerCase();
    let region = existingServer?.region || cloudRes?.region || body.region || 'us-east-1';
    let os = existingServer?.os?.name || (cloudRes?.metadata as any)?.os || body.os || 'Linux';
    let effectiveUser =
      username ||
      existingServer?.username ||
      (provider === 'aws' ? 'ec2-user' : provider === 'azure' ? 'azureuser' : 'ubuntu');

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

    if (!encSecret) {
      return NextResponse.json(
        { success: false, error: 'Please paste your SSH Private Key (.pem file content) or password to import this managed node.' },
        { status: 400 }
      );
    }

    if (!ip) {
      return NextResponse.json(
        { success: false, error: 'Valid IP address could not be resolved for this cloud instance.' },
        { status: 400 }
      );
    }

    // Check if managed node already exists by name, IP or instanceId
    const queryConditions: any[] = [{ ip }];
    if (effectiveName) queryConditions.push({ name: effectiveName });
    if (effectiveInstanceId) queryConditions.push({ instanceId: effectiveInstanceId });

    let host = await AnsibleHost.findOne({ $or: queryConditions });

    if (host) {
      host.name = effectiveName;
      if (effectiveInstanceId) host.instanceId = effectiveInstanceId;
      host.ip = ip;
      if (privateIp) host.privateIp = privateIp;
      host.provider = provider as any;
      host.region = region;
      host.os = os;
      host.username = effectiveUser;
      host.port = Number(port) || 22;
      host.authMethod = authMethod;
      host.encryptedAuthSecret = encSecret;
      host.authSecretIv = encIv;
      host.authSecretTag = encTag;
      host.sourceResourceId = serverId;
      host.sourceResourceType = existingServer ? 'server' : cloudRes ? (provider === 'aws' ? 'ec2' : 'azure-vm') : 'custom';
      await host.save();

      return NextResponse.json({
        success: true,
        hostId: host._id,
        message: `Managed node "${effectiveName}" updated with cloud instance settings.`,
      });
    }

    const newHost = await AnsibleHost.create({
      name: effectiveName,
      instanceId: effectiveInstanceId,
      ip,
      privateIp,
      provider,
      region,
      os,
      username: effectiveUser,
      port: Number(port) || 22,
      authMethod,
      encryptedAuthSecret: encSecret,
      authSecretIv: encIv,
      authSecretTag: encTag,
      status: 'Disconnected',
      sourceResourceId: serverId,
      sourceResourceType: existingServer ? 'server' : cloudRes ? (provider === 'aws' ? 'ec2' : 'azure-vm') : 'custom',
      groups: [provider, 'all'],
    });

    return NextResponse.json({
      success: true,
      hostId: newHost._id,
      message: `Cloud server "${effectiveName}" (${ip}) successfully added as a managed node.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
