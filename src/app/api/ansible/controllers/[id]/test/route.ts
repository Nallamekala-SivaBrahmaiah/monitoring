import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import { testSSHConnection } from '@/lib/ansible/ansibleSSH';
import { inspectRemoteSSHController } from '@/lib/ansible/ansibleController';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const controller = await AnsibleController.findById(id);
    if (!controller) {
      return NextResponse.json({ success: false, error: 'Controller not found' }, { status: 404 });
    }

    if (!controller.encryptedAuthSecret) {
      return NextResponse.json(
        { success: false, error: 'No SSH credentials stored for this controller.' },
        { status: 400 }
      );
    }

    controller.status = 'Connecting';
    await controller.save();

    const inspect = await inspectRemoteSSHController(
      {
        ip: controller.ipAddress,
        port: controller.port || 22,
        username: controller.username,
        authMethod: controller.authMethod,
        encryptedAuthSecret: controller.encryptedAuthSecret,
        authSecretIv: controller.authSecretIv || '',
        authSecretTag: controller.authSecretTag || '',
      },
      12000
    );

    controller.status = inspect.success ? 'Online' : 'Offline';
    controller.sshStatus = inspect.success ? 'Connected' : 'Disconnected';
    controller.lastCheckedAt = new Date();
    controller.lastLatencyMs = inspect.latencyMs;

    if (inspect.success) {
      controller.ansibleVersion = inspect.ansibleVersion;
      controller.pythonVersion = inspect.pythonVersion;
      controller.os = inspect.os;
      controller.uptimeFormatted = inspect.uptimeFormatted;
      controller.cpuCores = inspect.cpuCores;
      controller.memoryFormatted = inspect.memoryFormatted;
      controller.cpuUsage = inspect.cpuUsage;
      controller.memoryUsage = inspect.memoryUsage;
      controller.diskUsage = inspect.diskUsage;
      controller.lastError = null;
    } else {
      controller.lastError = inspect.error || 'Connection failed';
    }

    await controller.save();

    return NextResponse.json({
      success: inspect.success,
      status: controller.status,
      latencyMs: inspect.latencyMs,
      ansibleVersion: controller.ansibleVersion,
      pythonVersion: controller.pythonVersion,
      os: controller.os,
      cpuUsage: controller.cpuUsage,
      memoryUsage: controller.memoryUsage,
      diskUsage: controller.diskUsage,
      error: inspect.error,
      message: inspect.success
        ? `SSH connection to controller "${controller.name}" verified (${inspect.latencyMs}ms).`
        : `SSH connection failed: ${inspect.error}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

