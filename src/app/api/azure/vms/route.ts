import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';



export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase();
    const subscriptionId = searchParams.get('subscriptionId');
    const region = searchParams.get('region');
    const status = searchParams.get('status')?.toLowerCase();

    const query: any = { provider: 'azure', resourceType: 'vm' };

    if (subscriptionId && subscriptionId !== 'all') {
      query.subscriptionId = subscriptionId;
    }
    if (region && region !== 'all') {
      query.region = region;
    }
    if (status && status !== 'all') {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { resourceId: { $regex: search, $options: 'i' } },
      ];
    }

    const resources = await CloudResource.find(query).lean();

    return NextResponse.json(
      resources.map((r: any) => ({
        id: r._id.toString(),
        vmId: r.resourceId,
        name: r.name,
        resourceGroup: r.resourceGroup || 'default-rg',
        subscriptionId: r.subscriptionId,
        region: r.region,
        vmSize: r.size || 'Standard_B2s',
        powerState: r.status,
        privateIp: r.privateIp || '10.0.0.4',
        publicIp: r.publicIp || '-',
        cpuUtilization: r.metrics?.cpuUtilization,
        memoryUtilization: r.metrics?.memoryUtilization,
        diskUtilization: r.metrics?.diskUtilization,
        networkIn: r.metrics?.networkIn,
        networkOut: r.metrics?.networkOut,
        tags: r.metadata?.tags || {},
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Azure VMs' }, { status: 500 });
  }
}
