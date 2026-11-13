import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
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

    let server: any = null;
    if (mongoose.isValidObjectId(id)) {
      server = await Server.findById(id)
        .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
        .lean();
    }
    if (!server) {
      server = await Server.findOne({
        $or: [
          { cloudResourceId: id },
          { instanceId: id },
          { resourceId: id },
          { name: id },
        ],
      })
        .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
        .lean();
    }

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

    let server: any = null;
    if (mongoose.isValidObjectId(id)) {
      server = await Server.findById(id);
    }
    if (!server) {
      server = await Server.findOne({
        $or: [
          { cloudResourceId: id },
          { instanceId: id },
          { resourceId: id },
          { name: id },
        ],
      });
    }

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    await Server.deleteOne({ _id: server._id });

    // Cascade remove from CloudResource (srv-id and any matching cloud provider instance records)
    await CloudResource.deleteMany({
      $or: [
        { resourceId: `srv-${server._id.toString()}` },
        { resourceId: `srv-${id}` },
        { 'metadata.sshServerId': server._id.toString() },
        { 'tags.sshServerId': server._id.toString() },
        { name: server.name },
        { publicIp: server.host },
        { privateIp: server.host },
      ],
    });

    // Cascade delete metrics
    await Metric.deleteMany({
      $or: [
        { resourceId: `srv-${id}` },
        { resourceId: server.name },
      ],
    }).catch(() => null);

    return NextResponse.json({ success: true, message: `Server ${server.name} removed from monitoring` });
  } catch (err: any) {
    console.error('Error deleting server:', err);
    return NextResponse.json({ error: 'Failed to delete server' }, { status: 500 });
  }
}
