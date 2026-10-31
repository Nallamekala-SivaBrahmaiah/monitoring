import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status')?.toLowerCase();

    const query: any = {
      provider: 'aws',
      resourceType: 'ec2',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    };

    if (region && region !== 'all') query.region = region;
    if (accountId && accountId !== 'all') query.accountId = accountId;

    let resources = await CloudResource.find(query).sort({ updatedAt: -1 }).lean();

    if (status && status !== 'all') {
      resources = resources.filter((r) => (r.status || '').toLowerCase().includes(status));
    }

    return NextResponse.json(
      resources.map((r: any) => {
        const cpu = r.metrics?.cpuUtilization !== undefined && r.metrics?.cpuUtilization !== null
          ? r.metrics.cpuUtilization
          : null;

        const memory = r.metrics?.memoryUtilization !== undefined && r.metrics?.memoryUtilization !== null
          ? r.metrics.memoryUtilization
          : null;

        const disk = r.metrics?.diskUtilization !== undefined && r.metrics?.diskUtilization !== null
          ? r.metrics.diskUtilization
          : null;

        const netIn = r.metrics?.networkIn !== undefined && r.metrics?.networkIn !== null
          ? r.metrics.networkIn
          : null;

        const netOut = r.metrics?.networkOut !== undefined && r.metrics?.networkOut !== null
          ? r.metrics.networkOut
          : null;

        return {
          id: r._id.toString(),
          instanceId: r.resourceId,
          name: r.name,
          region: r.region,
          accountId: r.accountId,
          instanceType: r.size || 't3.micro',
          state: r.status,
          status: r.status,
          privateIp: r.privateIp || '-',
          publicIp: r.publicIp || '-',
          cpuUtilization: cpu,
          cpuUsage: cpu,
          cpuStatus: cpu !== null ? 'Available' : 'Unavailable',
          memoryUtilization: memory,
          memoryUsage: memory,
          memoryStatus: memory !== null ? 'Available' : 'Unavailable',
          memoryExplanation: memory === null ? 'Guest memory requires Amazon CloudWatch Agent installed on instance' : undefined,
          diskUtilization: disk,
          diskStatus: disk !== null ? 'Available' : 'Unavailable',
          networkIn: netIn,
          networkOut: netOut,
          metricSource: 'Amazon CloudWatch (AWS/EC2)',
          metricTimestamp: r.metrics?.lastUpdated ? new Date(r.metrics.lastUpdated).toISOString() : new Date().toISOString(),
          tags: r.metadata?.tags || {},
        };
      })
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch EC2 instances' }, { status: 500 });
  }
}
