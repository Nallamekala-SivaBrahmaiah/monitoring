import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';



export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const query: any = { resourceType: 'k8s_cluster' };
    if (provider && provider !== 'all') {
      query.provider = provider;
    }

    const clusters = await CloudResource.find(query).lean();

    return NextResponse.json(
      clusters.map((c: any) => ({
        id: c._id.toString(),
        clusterName: c.name,
        cloud: c.provider,
        status: c.status,
        version: c.metadata?.version || 'v1.28.3',
        nodesCount: c.metadata?.nodesCount || 0,
        podsCount: c.metadata?.podsCount || 0,
        region: c.region,
        cpuPercent: c.metrics?.cpuUtilization,
        memoryPercent: c.metrics?.memoryUtilization,
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch clusters' }, { status: 500 });
  }
}
