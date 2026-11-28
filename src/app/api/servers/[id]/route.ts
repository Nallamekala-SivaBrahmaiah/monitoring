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
    const cleanId = id.replace(/^srv-/, '');

    let server: any = null;
    if (mongoose.isValidObjectId(cleanId)) {
      server = await Server.findById(cleanId)
        .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
        .lean();
    }
    if (!server && mongoose.isValidObjectId(id)) {
      server = await Server.findById(id)
        .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
        .lean();
    }
    if (!server) {
      server = await Server.findOne({
        $or: [
          { cloudResourceId: id },
          { cloudResourceId: cleanId },
          { instanceId: id },
          { instanceId: cleanId },
          { resourceId: id },
          { resourceId: cleanId },
          { name: id },
          { name: cleanId },
          { host: id },
          { host: cleanId },
        ],
      })
        .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
        .lean();
    }

    // Fallback: check CloudResource collection if this is a discovered cloud instance
    if (!server) {
      const cr = await CloudResource.findOne({
        $or: [
          ...(mongoose.isValidObjectId(cleanId) ? [{ _id: cleanId }] : []),
          ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : []),
          { resourceId: id },
          { resourceId: cleanId },
          { name: id },
          { name: cleanId },
          { publicIp: id },
          { privateIp: id },
        ],
      }).lean();

      if (cr) {
        const anyCr = cr as any;
        server = {
          _id: anyCr._id.toString(),
          name: anyCr.name,
          host: anyCr.publicIp || anyCr.privateIp || '-',
          publicIp: anyCr.publicIp,
          privateIp: anyCr.privateIp,
          cloudResourceId: anyCr.resourceId,
          cloudProvider: anyCr.provider || 'other',
          region: anyCr.region || 'default',
          port: 22,
          username: anyCr.provider === 'azure' ? 'siva' : 'ubuntu',
          authMethod: 'privateKey',
          status: (anyCr.status || '').toLowerCase().includes('run') ? 'Online' : 'Offline',
          tags: anyCr.tags ? (Array.isArray(anyCr.tags) ? anyCr.tags : Object.values(anyCr.tags)) : [],
          os: { name: anyCr.os || anyCr.metadata?.os || 'Linux', version: '', kernel: '', arch: 'x86_64', uptimeSeconds: 3600, uptimeFormatted: '1h' },
          hardware: { cpuCores: 2, cpuModel: anyCr.size || 'Cloud vCPU', totalMemoryBytes: 4294967296, totalDiskBytes: 32212254720 },
          metrics: {
            cpu: { usagePercent: anyCr.metrics?.cpuUtilization ?? 0 },
            memory: { usagePercent: anyCr.metrics?.memoryUtilization ?? 0 },
            disks: [{ mount: '/', usagePercent: anyCr.metrics?.diskUtilization ?? 0 }],
          },
        };
      }
    }

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Also fetch recent metric trends for this server
    const recentMetrics = await Metric.find({
      $or: [
        { resourceId: `srv-${cleanId}` },
        { resourceId: `srv-${id}` },
        { resourceId: cleanId },
        { resourceId: id },
      ],
    })
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

    // Cascade remove from NginxServer
    try {
      const NginxServer = (await import('@/models/NginxServer')).default;
      await NginxServer.deleteMany({
        $or: [
          { host: server.host },
          { name: server.name },
          { instanceId: server._id.toString() },
        ],
      });
    } catch {}

    // Cascade remove from ServerSchedule
    try {
      const ServerSchedule = (await import('@/models/ServerSchedule')).default;
      await ServerSchedule.deleteMany({
        $or: [
          { resourceId: server._id.toString() },
          { resourceId: server.host },
          { serverName: server.name },
        ],
      });
    } catch {}

    return NextResponse.json({ success: true, message: `Server ${server.name} removed from monitoring` });
  } catch (err: any) {
    console.error('Error deleting server:', err);
    return NextResponse.json({ error: 'Failed to delete server' }, { status: 500 });
  }
}
