import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import {
  subscribeToTerminalSession,
  getSession,
} from '@/lib/terminal/terminalSessionManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new Response('Missing sessionId parameter', { status: 400 });
    }

    // Verify session in active memory
    const termSession = getSession(sessionId);
    if (!termSession || termSession.isClosed) {
      return new Response('Terminal session not found or already closed', { status: 404 });
    }

    // Authenticate user: check cookie, query token, or verified sessionId
    const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const queryToken = searchParams.get('token');
    const token = cookieToken || queryToken;

    if (token) {
      const verified = verifySessionToken(token);
      if (!verified) {
        return new Response('Unauthorized session token', { status: 401 });
      }
    }

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // 1. Initial connection ACK
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({
              serverName: termSession.serverInfo.name,
              host: termSession.serverInfo.host,
              username: termSession.serverInfo.username,
            })}\n\n`
          )
        );

        // 2. Subscribe to live shell data
        unsubscribe = subscribeToTerminalSession(
          sessionId,
          (data) => {
            try {
              controller.enqueue(
                encoder.encode(`event: data\ndata: ${JSON.stringify({ data })}\n\n`)
              );
            } catch (err) {
              console.error('Error enqueuing terminal stream chunk:', err);
            }
          },
          (reason) => {
            try {
              controller.enqueue(
                encoder.encode(
                  `event: close\ndata: ${JSON.stringify({
                    reason: reason || 'Session disconnected',
                  })}\n\n`
                )
              );
              controller.close();
            } catch {}
          }
        );
      },
      cancel() {
        if (unsubscribe) {
          unsubscribe();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: any) {
    console.error('Terminal stream error:', err);
    return new Response('Internal terminal stream error', { status: 500 });
  }
}
