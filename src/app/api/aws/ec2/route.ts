import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';



export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const accountId = searchParams.get('accountId');

    const query: any = { provider: 'aws', resourceType: 'ec2' };
    if (region && region !== 'all') query.region = region;
    if (accountId && accountId !== 'all') query.accountId = accountId;

    const resources = await CloudResource.find(query).lean();

    return NextResponse.json(
      resources.map((r: any) => ({
        id: r._id.toString(),
        instanceId: r.resourceId,
        name: r.name,
        region: r.region,
        accountId: r.accountId,
        instanceType: r.size || 'unknown',
        state: r.status,
        privateIp: r.privateIp,
        publicIp: r.publicIp,
        cpuUtilization: r.metrics?.cpuUtilization,
        memoryUtilization: r.metrics?.memoryUtilization,
        diskUtilization: r.metrics?.diskUtilization,
        networkIn: r.metrics?.networkIn,
        networkOut: r.metrics?.networkOut,
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch EC2 instances' }, { status: 500 });
  }
}
