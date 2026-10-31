import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const cluster = searchParams.get('cluster');

    // 1. Fetch any cloud-discovered k8s nodes
    const cloudNodes = await (CloudResource as any).find({
      resourceType: 'k8s_node',
      isDeleted: { $ne: true },
    }).lean();

    // 2. Fetch any registered SSH servers where Kubernetes is detected
    const k8sServers = await Server.find({
      'kubernetes.detected': true,
    }).lean();

    const nodes: any[] = [];

    for (const cn of cloudNodes) {
      if (cluster && cn.metadata?.cluster !== cluster) continue;
      nodes.push({
        id: cn._id.toString(),
        name: cn.name,
        cluster: cn.metadata?.cluster || 'unknown',
        cloudProvider: cn.provider,
        status: cn.status || 'Ready',
        role: cn.metadata?.role || 'worker',
        cpuUsage: cn.metrics?.cpuUtilization ?? null,
        memoryUsage: cn.metrics?.memoryUtilization ?? null,
        kubeletVersion: cn.metadata?.version || 'v1.28.3',
        podsCount: cn.metadata?.podsCount || 0,
      });
    }

    for (const s of k8sServers) {
      if (cluster && s.name !== cluster) continue;
      nodes.push({
        id: s._id.toString(),
        name: s.name,
        cluster: s.name,
        cloudProvider: s.cloudProvider || 'other',
        status: s.status === 'Online' ? 'Ready' : 'NotReady',
        role: s.kubernetes?.nodeRole || 'control-plane,worker',
        cpuUsage: s.metrics?.cpu?.usagePercent ?? null,
        memoryUsage: s.metrics?.memory?.usagePercent ?? null,
        kubeletVersion: s.kubernetes?.version || 'v1.28',
        podsCount: s.kubernetes?.podsCount || s.kubernetes?.pods?.length || 0,
      });
    }

    return NextResponse.json(nodes);
  } catch (err: any) {
    console.error('K8s nodes fetch error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
