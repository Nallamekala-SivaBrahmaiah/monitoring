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

    // Include all registered servers as manageable Kubernetes nodes / clusters
    const allServers = await Server.find().lean();
    for (const s of allServers) {
      if (provider && provider !== 'all' && s.cloudProvider !== provider) continue;
      const isK8sActive = !!(s.kubernetes?.detected);
      list.push({
        id: s._id.toString(),
        clusterName: s.name,
        name: s.name,
        cloud: s.cloudProvider || 'azure',
        cloudProvider: s.cloudProvider || 'azure',
        status: s.status === 'Online' ? 'Active' : s.status,
        version: s.kubernetes?.version || (isK8sActive ? 'v1.28.3' : 'Node Agent (K8s Ready)'),
        nodeCount: 1,
        nodesCount: 1,
        namespaceCount: 3,
        podCount: s.kubernetes?.podsCount || s.docker?.containersCount || 0,
        podsCount: s.kubernetes?.podsCount || s.docker?.containersCount || 0,
        region: s.region || 'centralindia',
        type: isK8sActive ? 'K8s Cluster Node' : 'Managed Server Node',
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
