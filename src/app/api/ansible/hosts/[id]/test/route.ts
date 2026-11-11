import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleController from '@/models/AnsibleController';
import { testSSHConnection } from '@/lib/ansible/ansibleSSH';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const host = await AnsibleHost.findById(id);
    if (!host) {
      return NextResponse.json({ success: false, error: 'Host not found' }, { status: 404 });
    }

    // Inherit credentials from controller if missing on node
    if (!host.encryptedAuthSecret) {
      const primaryController = await AnsibleController.findOne({ isPrimary: true }).lean();
      if (primaryController && primaryController.encryptedAuthSecret) {
        host.encryptedAuthSecret = primaryController.encryptedAuthSecret;
        host.authSecretIv = primaryController.authSecretIv || '';
        host.authSecretTag = primaryController.authSecretTag || '';
        host.authMethod = primaryController.authMethod || 'privateKey';
        await host.save();
      }
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
      15000
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
        errStr.includes('key') ||
        errStr.includes('handshake')
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
      message: result.success
        ? `SSH connection to "${host.name}" successful (${result.latencyMs}ms).`
        : `SSH connection to "${host.name}" failed: ${result.error}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
