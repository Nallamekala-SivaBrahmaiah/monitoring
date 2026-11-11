import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import AnsibleHost from '@/models/AnsibleHost';
import Server from '@/models/Server';
import { testSSHConnection } from '@/lib/ansible/ansibleSSH';

interface RouteContext {
  params: Promise<{ id: string; workerId: string }>;
}

/**
 * POST /api/ansible/controllers/:id/workers/:workerId/test-ssh
 * Tests real SSH connectivity from this controller to its assigned worker node.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id, workerId } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid controller ID' }, { status: 400 });
    }
    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return NextResponse.json({ success: false, error: 'Invalid worker ID' }, { status: 400 });
    }

    const controller = await AnsibleController.findById(id).lean();
    if (!controller) {
      return NextResponse.json({ success: false, error: 'Controller not found' }, { status: 404 });
    }

    const host = await AnsibleHost.findOne({
      _id: workerId,
      $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
    });

    if (!host) {
      return NextResponse.json(
        { success: false, error: 'Worker node not found under this controller' },
        { status: 404 }
      );
    }

    // Inherit credentials from controller or server monitoring if missing on host
    if (!host.encryptedAuthSecret) {
      if (controller.encryptedAuthSecret) {
        host.encryptedAuthSecret = controller.encryptedAuthSecret;
        host.authSecretIv = controller.authSecretIv || '';
        host.authSecretTag = controller.authSecretTag || '';
        host.authMethod = controller.authMethod || 'privateKey';
      } else {
        const srv = await Server.findOne({
          $or: [{ host: host.ip }, { ip: host.ip }, { name: host.name }],
          encryptedAuthSecret: { $exists: true, $ne: '' },
        }).lean();
        if (srv && srv.encryptedAuthSecret) {
          host.encryptedAuthSecret = srv.encryptedAuthSecret;
          host.authSecretIv = srv.authSecretIv || '';
          host.authSecretTag = srv.authSecretTag || '';
        }
      }
      await host.save();
    }

    host.status = 'Connecting';
    await host.save();

    const result = await testSSHConnection(
      {
        ip: host.ip,
        port: host.port || 22,
        username: host.username,
        authMethod: host.authMethod,
        encryptedAuthSecret: host.encryptedAuthSecret,
        authSecretIv: host.authSecretIv,
        authSecretTag: host.authSecretTag,
      },
      12000
    );

    host.lastCheckedAt = new Date();
    host.lastLatencyMs = result.latencyMs;

    if (result.success) {
      host.status = 'Connected';
      host.lastError = null;
      if (result.osInfo && host.os === 'Linux') {
        host.os = result.osInfo;
      }
    } else {
      const errStr = (result.error || '').toLowerCase();
      if (
        errStr.includes('auth') ||
        errStr.includes('permission denied') ||
        errStr.includes('password') ||
        errStr.includes('key')
      ) {
        host.status = 'Authentication Failed';
      } else {
        host.status = 'Disconnected';
      }
      host.lastError = result.error || 'Connection failed';
    }

    await host.save();

    return NextResponse.json({
      success: result.success,
      status: host.status,
      latencyMs: result.latencyMs,
      osInfo: result.osInfo,
      banner: result.banner,
      error: result.error,
      controllerId: id,
      controllerName: controller.name,
      workerId: host._id,
      workerName: host.name,
      message: result.success
        ? `SSH connection to "${host.name}" (${host.ip}) from controller "${controller.name}" succeeded in ${result.latencyMs}ms.`
        : `SSH connection to "${host.name}" failed: ${result.error}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
