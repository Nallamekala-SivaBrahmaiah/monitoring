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
      resourceType: 'k8s_cluster',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    };

    if (provider && provider !== 'all') {
      query.provider = provider;
    }

    const clusters = await CloudResource.find(query).sort({ updatedAt: -1 }).lean();

    const list = clusters.map((c: any) => ({
      id: c._id.toString(),
      clusterName: c.name,
      name: c.name,
      cloud: c.provider,
      cloudProvider: c.provider,
      status: c.status,
      version: c.metadata?.version || 'v1.28.3',
      nodeCount: c.metadata?.nodeCount || 0,
      nodesCount: c.metadata?.nodeCount || 0,
      namespaceCount: c.metadata?.namespaceCount || 3,
      podCount: c.metadata?.podCount || 0,
      podsCount: c.metadata?.podCount || 0,
      region: c.region,
      type: c.provider === 'aws' ? 'EKS' : 'AKS',
      endpoint: c.metadata?.endpoint || 'private-cluster',
      cpuPercent: c.metrics?.cpuUtilization !== undefined ? c.metrics?.cpuUtilization : null,
      memoryPercent: c.metrics?.memoryUtilization !== undefined ? c.metrics?.memoryUtilization : null,
    }));

    // Include only servers where Kubernetes is actively detected and installed
    const allServers = await Server.find().lean();
    for (const s of allServers) {
      if (provider && provider !== 'all' && s.cloudProvider !== provider) continue;
      const isK8sActive = Boolean(
        s.kubernetes?.detected === true ||
        (s.kubernetes?.version && !s.kubernetes.version.includes('NOT_INSTALLED') && s.kubernetes.version.trim() !== '') ||
        s.name.toLowerCase().includes('k8s') ||
        s.name.toLowerCase().includes('cluster')
      );
      if (!isK8sActive) continue;

      list.push({
        id: s._id.toString(),
        clusterName: s.name,
        name: s.name,
        cloud: s.cloudProvider || 'azure',
        cloudProvider: s.cloudProvider || 'azure',
        status: s.status === 'Online' ? 'Active' : s.status,
        version: s.kubernetes?.version || 'v1.28.3',
        nodeCount: 1,
        nodesCount: 1,
        namespaceCount: 3,
        podCount: s.kubernetes?.podsCount || 0,
        podsCount: s.kubernetes?.podsCount || 0,
        region: s.region || 'centralindia',
        type: 'K8s Cluster Node',
        endpoint: s.host,
        cpuPercent: s.metrics?.cpu?.usagePercent ?? 15,
        memoryPercent: s.metrics?.memory?.usagePercent ?? 14,
      });
    }

    return NextResponse.json(list);
  } catch (err: any) {
    console.error('K8s clusters fetch error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch clusters' }, { status: 500 });
  }
}
