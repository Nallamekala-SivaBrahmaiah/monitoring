import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { resolveServerCredentials } from '@/lib/terminal/serverResolver';
import { createTerminalSession } from '@/lib/terminal/terminalSessionManager';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access server terminal.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sshServerId, vmId, resourceId, name, host, cols = 80, rows = 24 } = body;

    if (!name && !host && !vmId && !sshServerId) {
      return NextResponse.json(
        { error: 'Missing target VM identification parameter.' },
        { status: 400 }
      );
    }

    // 2. Resolve credentials from registered infrastructure ONLY
    const creds = await resolveServerCredentials({
      sshServerId,
      vmId,
      resourceId,
      name,
      host,
    });

    if (!creds) {
      return NextResponse.json(
        {
          error: `No saved SSH credentials found for ${name || host || 'this VM'}. Please verify SSH credentials are configured in server settings.`,
          unconfigured: true,
        },
        { status: 404 }
      );
    }

    // 3. Initiate real SSH terminal session
    const termSession = await createTerminalSession({
      host: creds.host,
      port: creds.port,
      username: creds.username,
      authMethod: creds.authMethod,
      authSecret: creds.authSecret,
      serverName: creds.serverName,
      cols,
      rows,
    });

    return NextResponse.json({
      success: true,
      sessionId: termSession.id,
      serverName: termSession.serverName,
      host: termSession.host,
      port: termSession.port,
      username: termSession.username,
    });
  } catch (err: any) {
    console.error('Terminal session creation failed:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to establish SSH connection to target VM' },
      { status: 500 }
    );
  }
}

