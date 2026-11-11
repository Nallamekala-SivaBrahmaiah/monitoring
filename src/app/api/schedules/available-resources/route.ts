import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import CloudAccount from '@/models/CloudAccount';

export async function GET() {
  try {
    await connectToDatabase();

    // Query compute resources from CloudResource (EC2 instances and Azure VMs)
    const cloudResources: any[] = await CloudResource.find({
      $or: [
        { resourceType: 'ec2' },
        { resourceType: 'vm' },
        { provider: 'aws', resourceId: /^i-[0-9a-f]{8,17}$/i },
      ],
    }).lean();

    // Also query registered servers
    const servers = await Server.find({}).lean();

    const availableResources: Array<{
      id: string;
      name: string;
      resourceId: string;
      provider: 'aws' | 'azure';
      region: string;
      currentState: string;
      ipAddress?: string;
    }> = [];

    const seenIds = new Set<string>();

    for (const cr of cloudResources) {
      const resId = cr.resourceId || cr.name;
      if (!resId || seenIds.has(resId)) continue;
      seenIds.add(resId);

      const isRunning = cr.status === 'Running' || cr.status === 'Online';
      availableResources.push({
        id: cr._id.toString(),
        name: cr.name || resId,
        resourceId: resId,
        provider: cr.provider === 'aws' ? 'aws' : 'azure',
        region: cr.region || 'ap-southeast-2',
        currentState: isRunning ? 'Running' : 'Stopped',
        ipAddress: cr.publicIp || cr.privateIp,
      });
    }

    for (const s of servers) {
      const resId = s.host || s.name;
      if (!resId || seenIds.has(resId) || seenIds.has(s.name)) continue;
      seenIds.add(s.name);

      const isRunning = s.status === 'Online';
      availableResources.push({
        id: s._id.toString(),
        name: s.name,
        resourceId: s.name,
        provider: s.cloudProvider === 'azure' ? 'azure' : 'aws',
        region: s.region || 'ap-southeast-2',
        currentState: isRunning ? 'Running' : 'Stopped',
        ipAddress: s.host,
      });
    }

    return NextResponse.json({
      success: true,
      resources: availableResources,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
