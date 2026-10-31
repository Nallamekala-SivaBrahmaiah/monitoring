import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';



export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const query: any = { resourceType: 'container' };
    if (provider && provider !== 'all') {
      query.provider = provider;
    }

    const containers = await CloudResource.find(query).lean();

    return NextResponse.json(
      containers.map((c: any) => ({
        id: c._id.toString(),
        containerId: c.resourceId,
        name: c.name,
        cloud: c.provider,
        status: c.status,
        image: c.metadata?.image || 'unknown',
        host: c.metadata?.host || c.region,
        region: c.region,
        cpuPercent: c.metrics?.cpuUtilization,
        memoryUsageMB: c.metrics?.memoryUtilization,
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch containers' }, { status: 500 });
  }
}
