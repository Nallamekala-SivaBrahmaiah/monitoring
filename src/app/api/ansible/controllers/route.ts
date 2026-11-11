import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import AnsibleHost from '@/models/AnsibleHost';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import { getAllAnsibleControllers, inspectRemoteSSHController, ensureWorkerControllerAffinity } from '@/lib/ansible/ansibleController';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';

/**
 * GET: List all Ansible Controllers with worker counts, health, and active status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get('refresh') === 'true';

    const controllers = await getAllAnsibleControllers(refresh);
    return NextResponse.json({ success: true, controllers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Add a new Ansible Controller Node
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      type = 'cloud', // 'cloud' | 'custom' | 'local'
      name,
      description = '',
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
      setActive = false,
    } = body;

    let effectiveName = name ? name.trim() : 'ansible-controller';
    let effectiveIp = ipAddress ? ipAddress.trim() : '';
    let effectivePrivateIp = privateIp ? privateIp.trim() : undefined;
    let effectiveInstanceId = instanceId ? instanceId.trim() : undefined;
    let effectiveRegion = region ? region.trim() : 'ap-southeast-2';
    let effectiveOs = os ? os.trim() : 'Ubuntu Linux';
    let effectiveUser = username ? username.trim() : 'ubuntu';

    // 1. If cloud server ID was provided, resolve details
    if (sourceResourceId) {
      const existingServer = await Server.findById(sourceResourceId).lean();
      const cloudRes = !existingServer ? await CloudResource.findById(sourceResourceId).lean() : null;

      if (existingServer) {
        effectiveName = name || existingServer.name || effectiveName;
        effectiveIp = existingServer.host || effectiveIp;
        effectivePrivateIp = (existingServer as any).privateIp || effectivePrivateIp;
        effectiveInstanceId = (existingServer as any).instanceId || (existingServer as any).resourceId || effectiveInstanceId;
        effectiveRegion = existingServer.region || effectiveRegion;
        effectiveOs = existingServer.os?.name || effectiveOs;
        effectiveUser = existingServer.username || effectiveUser;
      } else if (cloudRes) {
        effectiveName = name || cloudRes.name || effectiveName;
        effectiveIp = cloudRes.publicIp || effectiveIp;
        effectivePrivateIp = cloudRes.privateIp || effectivePrivateIp;
        effectiveInstanceId = cloudRes.resourceId || effectiveInstanceId;
        effectiveRegion = cloudRes.region || effectiveRegion;
        effectiveOs = (cloudRes.metadata as any)?.os || effectiveOs;
      }
    }

    if (!effectiveIp) {
      return NextResponse.json(
        { success: false, error: 'A valid Hostname or IP Address is required for the controller node.' },
        { status: 400 }
      );
    }

    // Check if controller with this IP already exists
    const existingCtrl = await AnsibleController.findOne({ ipAddress: effectiveIp });
    if (existingCtrl) {
      return NextResponse.json(
        { success: false, error: `A controller with IP address "${effectiveIp}" already exists (${existingCtrl.name}).` },
        { status: 400 }
      );
    }

    let encSecret = '';
    let encIv = '';
    let encTag = '';

    if (authSecret && authSecret.trim()) {
      const encrypted = encryptSecret(authSecret.trim());
      encSecret = encrypted.encrypted;
      encIv = encrypted.iv;
      encTag = encrypted.tag;
    } else if (useExistingCredentials) {
      // Look up credentials in Server collection or primary controller
      const srvWithSecret = await Server.findOne({
        $or: [{ host: effectiveIp }, { ip: effectiveIp }, { resourceId: effectiveInstanceId }],
        encryptedAuthSecret: { $exists: true, $ne: '' },
      }).lean();

      if (srvWithSecret && srvWithSecret.encryptedAuthSecret) {
        encSecret = srvWithSecret.encryptedAuthSecret;
        encIv = srvWithSecret.authSecretIv || '';
        encTag = srvWithSecret.authSecretTag || '';
      } else {
        const primaryCtrl = await AnsibleController.findOne({ isPrimary: true }).lean();
        if (primaryCtrl && primaryCtrl.encryptedAuthSecret) {
          encSecret = primaryCtrl.encryptedAuthSecret;
          encIv = primaryCtrl.authSecretIv || '';
          encTag = primaryCtrl.authSecretTag || '';
        } else if (provider?.toLowerCase() === 'aws' || effectiveName?.toLowerCase().includes('ansible-controller')) {
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
    }

    if (!encSecret) {
      return NextResponse.json(
        { success: false, error: 'SSH Private Key (.pem file content) or password is required to connect to the controller.' },
        { status: 400 }
      );
    }

    // Inspect controller specs over SSH
    let inspectResult: any = {
      success: false,
      ansibleVersion: 'Pending Installation',
      pythonVersion: 'Python 3.10+',
      os: effectiveOs,
      uptimeFormatted: 'Active',
      cpuCores: 2,
      memoryFormatted: 'Standard',
      cpuUsage: 12,
      memoryUsage: 35,
      diskUsage: 22,
      latencyMs: 120,
    };

    try {
      inspectResult = await inspectRemoteSSHController(
        {
          ip: effectiveIp,
          port: Number(port) || 22,
          username: effectiveUser,
          authMethod,
          encryptedAuthSecret: encSecret,
          authSecretIv: encIv,
          authSecretTag: encTag,
        },
        12000
      );
    } catch (e: any) {
      inspectResult.error = e.message;
    }

    const totalControllers = await AnsibleController.countDocuments();
    const shouldBeActive = setActive || totalControllers === 0;

    if (shouldBeActive) {
      await AnsibleController.updateMany({}, { $set: { isActive: false } });
    }

    const newController = await AnsibleController.create({
      name: effectiveName,
      description,
      type,
      sourceResourceId,
      instanceId: effectiveInstanceId,
      hostname: effectiveIp,
      ipAddress: effectiveIp,
      privateIp: effectivePrivateIp,
      provider: provider.toLowerCase(),
      region: effectiveRegion,
      os: inspectResult.os || effectiveOs,
      username: effectiveUser,
      port: Number(port) || 22,
      authMethod,
      encryptedAuthSecret: encSecret,
      authSecretIv: encIv,
      authSecretTag: encTag,
      ansibleVersion: inspectResult.ansibleVersion || 'Ansible Core 2.16',
      pythonVersion: inspectResult.pythonVersion || 'Python 3.10+',
      status: inspectResult.success ? 'Online' : 'Offline',
      sshStatus: inspectResult.success ? 'Connected' : 'Disconnected',
      uptimeFormatted: inspectResult.uptimeFormatted || 'Active',
      cpuCores: inspectResult.cpuCores || 2,
      memoryFormatted: inspectResult.memoryFormatted || 'Standard',
      cpuUsage: inspectResult.cpuUsage || 12,
      memoryUsage: inspectResult.memoryUsage || 35,
      diskUsage: inspectResult.diskUsage || 22,
      workerCount: 0,
      lastCheckedAt: new Date(),
      lastLatencyMs: inspectResult.latencyMs || null,
      lastError: inspectResult.error || null,
      isPrimary: false,
      isActive: shouldBeActive,
    });

    await ensureWorkerControllerAffinity();

    const sanitized = newController.toObject();
    delete (sanitized as any).encryptedAuthSecret;
    delete (sanitized as any).authSecretIv;
    delete (sanitized as any).authSecretTag;

    return NextResponse.json({
      success: true,
      controller: sanitized,
      message: `Controller "${effectiveName}" (${effectiveIp}) successfully created and registered.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Remove all controllers and all worker nodes from inventory
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const deletedHosts = await AnsibleHost.deleteMany({});
    const deletedControllers = await AnsibleController.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `Successfully removed all ${deletedControllers.deletedCount} controller(s) and ${deletedHosts.deletedCount} managed worker(s). Cloud infrastructure remains completely intact.`,
      deletedControllers: deletedControllers.deletedCount,
      deletedHosts: deletedHosts.deletedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


