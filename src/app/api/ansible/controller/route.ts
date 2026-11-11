import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import AnsibleHost from '@/models/AnsibleHost';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import { getAnsibleControllerInfo, inspectRemoteSSHController, ensureWorkerControllerAffinity } from '@/lib/ansible/ansibleController';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';

/**
 * GET: Get current primary controller node status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get('refresh') === 'true';

    const controller = await getAnsibleControllerInfo(refresh);
    return NextResponse.json({ success: true, controller });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Select, configure, or change the primary Ansible Controller Node
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      type = 'cloud', // 'cloud' | 'custom' | 'local'
      name,
      sourceResourceId,
      instanceId,
      ipAddress,
      privateIp,
      provider = 'aws',
      region,
      os = 'Linux',
      username = 'ubuntu',
      port = 22,
      authMethod = 'privateKey',
      authSecret,
      useExistingCredentials = false,
    } = body;

    // 1. Reset to Local Host Controller
    if (type === 'local') {
      await AnsibleController.updateMany({}, { isActive: false, isPrimary: false });
      let localCtrl = await AnsibleController.findOne({ type: 'local' });
      if (localCtrl) {
        localCtrl.isActive = true;
        localCtrl.isPrimary = true;
        await localCtrl.save();
      } else {
        localCtrl = await AnsibleController.create({
          name: 'Ansible-Controller-01',
          type: 'local',
          provider: 'local',
          hostname: 'localhost',
          ipAddress: '127.0.0.1',
          os: 'Windows/Linux (Local Host)',
          status: 'Online',
          sshStatus: 'Ready / Active',
          isPrimary: true,
          isActive: true,
        });
      }

      const info = await getAnsibleControllerInfo(false);
      return NextResponse.json({
        success: true,
        message: 'Primary Controller set to Local Host Environment.',
        controller: info,
      });
    }

    // 2. Remote Controller (Cloud EC2 / Azure VM / Custom Linux Server)
    if (!ipAddress) {
      return NextResponse.json(
        { success: false, error: 'Valid IP address or hostname is required for the controller.' },
        { status: 400 }
      );
    }

    let encSecret = '';
    let encIv = '';
    let encTag = '';

    // If user provided authSecret (private key or password), ALWAYS use it
    if (authSecret && authSecret.trim()) {
      const encrypted = encryptSecret(authSecret.trim());
      encSecret = encrypted.encrypted;
      encIv = encrypted.iv;
      encTag = encrypted.tag;
    } else if (useExistingCredentials) {
      // Look up credentials in Server collection
      let existingServer: any = null;
      if (sourceResourceId) {
        existingServer = await Server.findById(sourceResourceId).lean();
        if (!existingServer) {
          const cr = await CloudResource.findById(sourceResourceId).lean();
          const sshId = (cr as any)?.tags?.sshServerId || (cr as any)?.metadata?.sshServerId;
          if (sshId) {
            existingServer = await Server.findById(sshId).lean();
          }
        }
      }
      if (!existingServer && ipAddress) {
        existingServer = await Server.findOne({
          $or: [{ host: ipAddress.trim() }, { host: ipAddress }],
          encryptedAuthSecret: { $exists: true, $ne: '' },
        }).lean();
      }
      if (!existingServer && instanceId) {
        existingServer = await Server.findOne({
          resourceId: instanceId.trim(),
          encryptedAuthSecret: { $exists: true, $ne: '' },
        }).lean();
      }
      if (!existingServer && name) {
        existingServer = await Server.findOne({
          name: name.trim(),
          encryptedAuthSecret: { $exists: true, $ne: '' },
        }).lean();
      }
      if (!existingServer && (provider?.toLowerCase() === 'aws' || name?.toLowerCase().includes('ansible-controller'))) {
        existingServer = await Server.findOne({
          encryptedAuthSecret: { $exists: true, $ne: '' },
        }).lean();
      }

      if (existingServer && existingServer.encryptedAuthSecret) {
        encSecret = existingServer.encryptedAuthSecret;
        encIv = existingServer.authSecretIv;
        encTag = existingServer.authSecretTag;
      }
    }

    if (!encSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please paste your SSH Private Key (.pem file content) or SSH password to connect to this controller node.',
        },
        { status: 400 }
      );
    }

    // Remove this instance from managed nodes if it was previously registered
    // (A controller must not be listed as a managed server)
    await AnsibleHost.deleteMany({
      $or: [
        { ip: ipAddress.trim() },
        ...(instanceId ? [{ instanceId: instanceId.trim() }] : []),
        ...(sourceResourceId ? [{ sourceResourceId }] : []),
      ],
    });

    // Test and inspect remote machine over SSH
    let inspectResult: {
      success: boolean;
      latencyMs: number;
      os: string;
      pythonVersion: string;
      ansibleVersion: string;
      uptimeFormatted: string;
      cpuCores: number;
      memoryFormatted: string;
      error?: string;
    } = {
      success: false,
      latencyMs: 0,
      os: os || 'Linux Server',
      pythonVersion: 'Python 3.10+ (Standard Control Runtime)',
      ansibleVersion: 'Ansible Core 2.16',
      uptimeFormatted: 'Active',
      cpuCores: 2,
      memoryFormatted: 'Standard',
      error: undefined,
    };

    try {
      inspectResult = await inspectRemoteSSHController(
        {
          ip: ipAddress.trim(),
          port: Number(port) || 22,
          username: username.trim(),
          authMethod,
          encryptedAuthSecret: encSecret,
          authSecretIv: encIv,
          authSecretTag: encTag,
        },
        8000
      );
    } catch (err: any) {
      inspectResult.error = err.message || 'SSH connection attempt failed';
    }

    const totalControllers = await AnsibleController.countDocuments();
    const effectiveName = name?.trim() || `Ansible-Master-${provider.toUpperCase()}`;
    await AnsibleController.updateMany({}, { isActive: false });

    // If controller with this IP already exists, update it; otherwise create it
    let newController = await AnsibleController.findOne({ ipAddress: ipAddress.trim() });
    if (newController) {
      newController.name = effectiveName;
      newController.type = type;
      newController.sourceResourceId = sourceResourceId;
      newController.instanceId = instanceId?.trim() || undefined;
      newController.hostname = ipAddress.trim();
      newController.privateIp = privateIp?.trim() || undefined;
      newController.provider = provider.toLowerCase() as any;
      newController.region = region?.trim() || undefined;
      newController.os = inspectResult.os || os;
      newController.username = username.trim();
      newController.port = Number(port) || 22;
      newController.authMethod = authMethod;
      newController.encryptedAuthSecret = encSecret;
      newController.authSecretIv = encIv;
      newController.authSecretTag = encTag;
      newController.ansibleVersion = inspectResult.ansibleVersion;
      newController.pythonVersion = inspectResult.pythonVersion;
      newController.status = inspectResult.success ? 'Online' : 'Offline';
      newController.sshStatus = inspectResult.success ? 'Connected' : 'Disconnected';
      newController.uptimeFormatted = inspectResult.uptimeFormatted;
      newController.cpuCores = inspectResult.cpuCores;
      newController.memoryFormatted = inspectResult.memoryFormatted;
      newController.lastCheckedAt = new Date();
      newController.lastLatencyMs = inspectResult.latencyMs || null;
      newController.lastError = inspectResult.error || null;
      newController.isPrimary = false;
      newController.isActive = true;
      await newController.save();
    } else {
      newController = await AnsibleController.create({
        name: effectiveName,
        type,
        sourceResourceId,
        instanceId: instanceId?.trim() || undefined,
        hostname: ipAddress.trim(),
        ipAddress: ipAddress.trim(),
        privateIp: privateIp?.trim() || undefined,
        provider: provider.toLowerCase(),
        region: region?.trim() || undefined,
        os: inspectResult.os || os,
        username: username.trim(),
        port: Number(port) || 22,
        authMethod,
        encryptedAuthSecret: encSecret,
        authSecretIv: encIv,
        authSecretTag: encTag,
        ansibleVersion: inspectResult.ansibleVersion,
        pythonVersion: inspectResult.pythonVersion,
        status: inspectResult.success ? 'Online' : 'Offline',
        sshStatus: inspectResult.success ? 'Connected' : 'Disconnected',
        uptimeFormatted: inspectResult.uptimeFormatted,
        cpuCores: inspectResult.cpuCores,
        memoryFormatted: inspectResult.memoryFormatted,
        lastCheckedAt: new Date(),
        lastLatencyMs: inspectResult.latencyMs || null,
        lastError: inspectResult.error || null,
        isPrimary: false,
        isActive: true,
      });
    }

    // Bind worker nodes strictly to their respective controllers
    await ensureWorkerControllerAffinity();

    const info = await getAnsibleControllerInfo(false);

    if (inspectResult.success) {
      return NextResponse.json({
        success: true,
        message: `"${effectiveName}" (${ipAddress}) successfully connected and set as Active Ansible Controller.`,
        controller: info,
      });
    } else {
      return NextResponse.json({
        success: true,
        warning: `"${effectiveName}" configured, but SSH check failed: ${inspectResult.error}. Please verify security group port 22 access.`,
        controller: info,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
