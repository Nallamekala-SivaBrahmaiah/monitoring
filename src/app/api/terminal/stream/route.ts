import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import {
  subscribeToTerminalSession,
  getSession,
} from '@/lib/terminal/terminalSessionManager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);

    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new Response('Missing sessionId parameter', { status: 400 });
    }

    const termSession = getSession(sessionId);
    if (!termSession || termSession.isClosed) {
      return new Response('Terminal session not found or already closed', { status: 404 });
    }

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({
              serverName: termSession.serverInfo.name,
              host: termSession.serverInfo.host,
              username: termSession.serverInfo.username,
            })}\n\n`
          )
        );

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
