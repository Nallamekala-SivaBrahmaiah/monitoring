import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { resizeTerminalSession } from '@/lib/terminal/terminalSessionManager';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, cols, rows } = await request.json();

    if (!sessionId || !cols || !rows) {
      return NextResponse.json({ error: 'Invalid resize parameters' }, { status: 400 });
    }

    const success = resizeTerminalSession(sessionId, Number(cols), Number(rows));
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

