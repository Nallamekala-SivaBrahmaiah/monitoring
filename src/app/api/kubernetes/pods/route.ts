import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';



export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const query: any = { resourceType: 'k8s_pod' };
    if (provider && provider !== 'all') {
      query.provider = provider;
    }

    const pods = await CloudResource.find(query).lean();

    return NextResponse.json(
      pods.map((p: any) => ({
        id: p._id.toString(),
        name: p.name,
        namespace: p.metadata?.namespace || 'default',
        cloud: p.provider,
        cluster: p.metadata?.cluster || 'unknown',
        status: p.status,
        restarts: p.metadata?.restarts || 0,
        age: p.metadata?.age || '1d',
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch pods' }, { status: 500 });
  }
}
