import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';

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

    const cloudPods = await CloudResource.find(query).sort({ updatedAt: -1 }).lean();

    const result = cloudPods.map((p: any) => ({
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
    }));

    // Include pods from registered SSH servers
    const k8sServers = await Server.find({ 'kubernetes.detected': true }).lean();
    for (const s of k8sServers) {
      if (provider && provider !== 'all' && s.cloudProvider !== provider) continue;
      if (s.kubernetes?.pods && Array.isArray(s.kubernetes.pods)) {
        for (const p of s.kubernetes.pods) {
          result.push({
            id: p.uid || p.name,
            podUid: p.uid || p.name,
            name: p.name,
            namespace: p.namespace || 'default',
            cloudProvider: s.cloudProvider || 'other',
            cloud: s.cloudProvider || 'other',
            cluster: s.name,
            node: s.name,
            status: p.status || 'Running',
            ready: '1/1',
            restartCount: p.restarts || 0,
            restarts: p.restarts || 0,
            age: p.age || '1d',
            ip: s.host,
            cpuUsage: null,
            memoryUsage: null,
            cpuMetricStatus: 'Unavailable',
            memoryMetricStatus: 'Unavailable',
            metricSource: 'SSH Node Telemetry',
            creationTimestamp: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('K8s pods fetch error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch pods' }, { status: 500 });
  }
}
