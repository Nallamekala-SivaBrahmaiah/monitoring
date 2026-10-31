import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const query: any = {
      resourceType: 'k8s_pod',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    };

    if (provider && provider !== 'all') {
      query.provider = provider;
    }

    const pods = await CloudResource.find(query).sort({ updatedAt: -1 }).lean();

    return NextResponse.json(
      pods.map((p: any) => ({
        id: p._id.toString(),
        podUid: p.resourceId,
        name: p.name,
        namespace: p.metadata?.namespace || 'default',
        cloudProvider: p.provider,
        cloud: p.provider,
        cluster: p.metadata?.cluster || 'unknown',
        node: p.metadata?.node || 'node-01',
        status: p.status,
        ready: p.metadata?.ready || '1/1',
        restartCount: p.metadata?.restarts || 0,
        restarts: p.metadata?.restarts || 0,
        age: p.metadata?.age || '1d',
        ip: p.privateIp || '-',
        cpuUsage: p.metrics?.cpuUtilization !== undefined ? p.metrics?.cpuUtilization : null,
        memoryUsage: p.metrics?.memoryUtilization !== undefined ? p.metrics?.memoryUtilization : null,
        cpuMetricStatus: p.metrics?.cpuUtilization !== null && p.metrics?.cpuUtilization !== undefined ? 'Available' : 'Unavailable',
        memoryMetricStatus: p.metrics?.memoryUtilization !== null && p.metrics?.memoryUtilization !== undefined ? 'Available' : 'Unavailable',
        metricSource: p.metricSource || 'metrics-server / Prometheus',
        creationTimestamp: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch pods' }, { status: 500 });
  }
}
