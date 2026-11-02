import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import { syncSingleServer } from '@/lib/serverMonitoring/serverSync';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/servers/[id]/power
 * Toggle server operational state: start, stop, restart.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const body = await request.json();
    const action = body?.action;

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: start, stop, restart' },
        { status: 400 }
      );
    }

    const server = await Server.findById(id);
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    if (action === 'stop') {
      server.status = 'Offline';
      server.lastError = 'Server stopped by operator';
      await server.save();

      // Mirror state to CloudResource
      await CloudResource.updateMany(
        {
          $or: [
            { resourceId: server.name },
            { name: server.name },
            { publicIp: server.host },
          ],
        },
        {
          $set: {
            status: 'Stopped',
            'metadata.powerState': 'VM stopped',
          },
        }
      );

      return NextResponse.json({
        success: true,
        action: 'stop',
        status: 'Offline',
        message: `Server "${server.name}" stopped successfully.`,
      });
    }

    if (action === 'start') {
      server.status = 'Online';
      server.lastError = null;
      await server.save();

      // Mirror state to CloudResource
      await CloudResource.updateMany(
        {
          $or: [
            { resourceId: server.name },
            { name: server.name },
            { publicIp: server.host },
          ],
        },
        {
          $set: {
            status: 'Running',
            'metadata.powerState': 'VM running',
          },
        }
      );

      // Trigger telemetry sync in background
      syncSingleServer(id).catch((err) => console.warn('Sync on start warning:', err));

      return NextResponse.json({
        success: true,
        action: 'start',
        status: 'Online',
        message: `Server "${server.name}" started successfully.`,
      });
    }

    if (action === 'restart') {
      server.status = 'Online';
      await server.save();
      syncSingleServer(id).catch((err) => console.warn('Sync on restart warning:', err));

      return NextResponse.json({
        success: true,
        action: 'restart',
        status: 'Online',
        message: `Server "${server.name}" restarted successfully.`,
      });
    }

    return NextResponse.json({ error: 'Unhandled power action' }, { status: 400 });
  } catch (err: any) {
    console.error('Server power action error:', err);
    return NextResponse.json({ error: err.message || 'Power action failed' }, { status: 500 });
  }
}

