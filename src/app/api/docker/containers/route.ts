import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import { syncDockerResources } from '@/lib/docker/sync';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const autoSync = searchParams.get('sync') === 'true';

    // 1. If explicit sync requested, run live sync against hosts
    if (autoSync) {
      try {
        await syncDockerResources();
      } catch (syncErr) {
        console.warn('[Docker Containers API] Auto-sync note:', syncErr);
      }
    }

    // 2. Fetch active containers from DB
    const query: any = {
      resourceType: 'container',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    };

    if (provider && provider !== 'all') {
      query.provider = provider;
    }

    let containers = await CloudResource.find(query).sort({ updatedAt: -1 }).lean();

    // 3. If zero containers in DB, run one sync cycle to see if host has containers
    if (containers.length === 0 && !autoSync) {
      try {
        await syncDockerResources();
        containers = await CloudResource.find(query).sort({ updatedAt: -1 }).lean();
      } catch {
        // host may be unreachable
      }
    }

    return NextResponse.json(
      containers.map((c: any) => ({
        id: c._id ? c._id.toString() : c.resourceId,
        containerId: c.resourceId,
        name: c.name,
        image: c.metadata?.image || 'unknown',
        hostInstance: c.metadata?.host || 'vm01siva',
        hostId: c.metadata?.hostId || c.resourceId,
        cloudProvider: c.provider as 'aws' | 'azure',
        region: c.region || 'centralindia',
        status: (c.status || 'Stopped') as 'Running' | 'Stopped' | 'Restarting' | 'Paused' | 'Exited',
        cpuUsage: c.metrics?.cpuUtilization !== undefined && c.metrics?.cpuUtilization !== null ? c.metrics.cpuUtilization : null,
        memoryUsage: c.metrics?.memoryUtilization !== undefined && c.metrics?.memoryUtilization !== null ? c.metrics.memoryUtilization : null,
        memoryLimit: c.metadata?.memoryLimit || 'Available',
        diskIO: c.metadata?.diskIO || '0 B',
        networkTraffic: c.metadata?.networkTraffic || '0 B',
        restartCount: c.metadata?.restartCount || 0,
        uptime: c.metadata?.uptime || 'Exited',
        created: c.metadata?.created || 'recently',
        publishedPorts: c.metadata?.publishedPorts || '-',
        healthStatus: c.metadata?.healthStatus || 'Healthy',
        metricSource: c.metricSource || 'Docker Engine API',
        lastUpdated: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch containers' }, { status: 500 });
  }
}
