import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';

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

    return NextResponse.json(
      clusters.map((c: any) => ({
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
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch clusters' }, { status: 500 });
  }
}
