import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { writeToTerminalSession } from '@/lib/terminal/terminalSessionManager';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, data } = await request.json();

    if (!sessionId || typeof data !== 'string') {
      return NextResponse.json({ error: 'Invalid input payload' }, { status: 400 });
    }

    const success = writeToTerminalSession(sessionId, data);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

