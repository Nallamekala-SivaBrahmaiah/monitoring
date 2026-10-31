import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import Metric from '@/models/Metric';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/servers/[id]
 * Get full server details and metrics history.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const server = await Server.findById(id)
      .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
      .lean();

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Also fetch recent metric trends for this server
    const recentMetrics = await Metric.find({ resourceId: `srv-${id}` })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({
      server,
      recentMetrics: recentMetrics.reverse(),
    });
  } catch (err: any) {
    console.error('Error fetching server detail:', err);
    return NextResponse.json({ error: 'Failed to fetch server details' }, { status: 500 });
  }
}

/**
 * DELETE /api/servers/[id]
 * Safely deregister a server from monitoring.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const server = await Server.findById(id);
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Safety check for production servers
    const { searchParams } = new URL(request.url);
    const confirmed = searchParams.get('confirmed');
    if (server.environment === 'Production' && confirmed !== 'true') {
      return NextResponse.json(
        {
          error: 'Production server removal requires explicit confirmation',
          requiresConfirmation: true,
          serverName: server.name,
        },
        { status: 400 }
      );
    }

    await Server.findByIdAndDelete(id);

    // Remove from CloudResource
    await CloudResource.deleteOne({ resourceId: `srv-${id}` });

    return NextResponse.json({ success: true, message: `Server ${server.name} removed from monitoring` });
  } catch (err: any) {
    console.error('Error deleting server:', err);
    return NextResponse.json({ error: 'Failed to delete server' }, { status: 500 });
  }
}
