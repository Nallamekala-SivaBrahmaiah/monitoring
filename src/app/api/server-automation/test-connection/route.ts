import { NextRequest, NextResponse } from 'next/server';
import { resolveServerAuth } from '@/lib/automation/automationSessionManager';
import { testSSHConnection } from '@/lib/ansible/ansibleSSH';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, overrideAuth } = body;

    if (!serverId && !overrideAuth?.host) {
      return NextResponse.json(
        { error: 'Server host or ID is required for testing.' },
        { status: 400 }
      );
    }

    const auth = await resolveServerAuth(serverId, overrideAuth);

    // Encrypt secret temporarily to use with testSSHConnection
    const enc = encryptSecret(auth.secret);

    const testResult = await testSSHConnection({
      ip: auth.host,
      port: auth.port,
      username: auth.username,
      authMethod: auth.authMethod,
      encryptedAuthSecret: enc.encrypted,
      authSecretIv: enc.iv,
      authSecretTag: enc.tag,
    }, 8000);

    return NextResponse.json({
      success: testResult.success,
      serverName: auth.serverName,
      host: auth.host,
      latencyMs: testResult.latencyMs,
      osInfo: testResult.osInfo || auth.osName,
      error: testResult.error,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'SSH connection test failed',
      },
      { status: 400 }
    );
  }
}
