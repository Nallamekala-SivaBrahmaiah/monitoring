import { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AutomationExecution from '@/models/AutomationExecution';
import { getActiveSession } from '@/lib/automation/automationSessionManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return new Response('Missing executionId parameter', { status: 400 });
    }

    await connectToDatabase();
    const executionDoc = await AutomationExecution.findById(executionId);
    if (!executionDoc) {
      return new Response('Automation execution not found', { status: 404 });
    }

    const encoder = new TextEncoder();
    const active = getActiveSession(executionId);

    const stream = new ReadableStream({
      start(controller) {
        // Helper to push SSE event
        const pushEvent = (event: string, data: any) => {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {}
        };

        // 1. Initial State Sync
        pushEvent('init', {
          executionId: executionDoc._id.toString(),
          serverName: executionDoc.serverName,
          serverHost: executionDoc.serverHost,
          status: executionDoc.status,
          selectedTools: executionDoc.selectedTools,
          startedAt: executionDoc.startedAt,
          durationSeconds: executionDoc.durationSeconds,
        });

        // 2. Replay previous log buffer if present
        if (active && active.buffer.length > 0) {
          const replayChunk = active.buffer.join('');
          pushEvent('stdout', { data: replayChunk });
        } else if (executionDoc.logOutput) {
          pushEvent('stdout', { data: executionDoc.logOutput });
        }

        // If already completed or not active in memory, send finished event and close
        if (!active || active.status !== 'running') {
          pushEvent('finished', {
            status: executionDoc.status,
            exitCode: executionDoc.exitCode,
            durationSeconds: executionDoc.durationSeconds,
            completedAt: executionDoc.completedAt,
          });
          controller.close();
          return;
        }

        // 3. Listen to live events
        const listener = (eventObj: any) => {
          pushEvent(eventObj.type || 'stdout', eventObj);

          if (eventObj.type === 'finished' || eventObj.type === 'cancelled' || eventObj.type === 'error') {
            try {
              controller.close();
            } catch {}
          }
        };

        active.emitter.on('event', listener);

        // Cancel cleanup
        request.signal.addEventListener('abort', () => {
          if (active) {
            active.emitter.off('event', listener);
          }
        });
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
    return new Response('Internal automation terminal stream error', { status: 500 });
  }
}
