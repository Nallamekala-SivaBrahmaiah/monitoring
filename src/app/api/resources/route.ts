import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';



export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const resourceType = searchParams.get('resourceType');
    const region = searchParams.get('region');
    const subscriptionId = searchParams.get('subscriptionId');
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search')?.toLowerCase();

    const query: any = {};

    if (provider && provider !== 'all') {
      query.provider = provider;
    }
    if (resourceType && resourceType !== 'all') {
      query.resourceType = resourceType;
    }
    if (region && region !== 'all') {
      query.region = region;
    }
    if (subscriptionId && subscriptionId !== 'all') {
      query.subscriptionId = subscriptionId;
    }
    if (accountId && accountId !== 'all') {
      query.accountId = accountId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { resourceId: { $regex: search, $options: 'i' } },
      ];
    }

    const resources = await CloudResource.find(query).sort({ updatedAt: -1 }).limit(200).lean();

    return NextResponse.json(
      resources.map((r: any) => ({
        id: r._id.toString(),
        resourceId: r.resourceId,
        name: r.name,
        provider: r.provider,
        resourceType: r.resourceType,
        region: r.region,
        subscriptionId: r.subscriptionId,
        accountId: r.accountId,
        resourceGroup: r.resourceGroup,
        status: r.status,
        size: r.size,
        privateIp: r.privateIp,
        publicIp: r.publicIp,
        metrics: r.metrics,
        metadata: r.metadata,
        updatedAt: r.updatedAt,
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch resources' }, { status: 500 });
  }
}
