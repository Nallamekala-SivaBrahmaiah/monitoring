import { NextRequest, NextResponse } from 'next/server';
import { fetchResources } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || null;
    const subscriptionId = searchParams.get('subscriptionId') || null;
    const region = searchParams.get('region') || null;
    const status = searchParams.get('status')?.toLowerCase() || null;

    const resources = await fetchResources({
      provider: 'azure',
      resourceType: 'vm',
      subscriptionId,
      region,
      search,
    });

    const filtered = status && status !== 'all'
      ? resources.filter((r) => r.status?.toLowerCase() === status)
      : resources;

    return NextResponse.json(
      filtered.map((r: any) => ({
        id: r._id ? r._id.toString() : r.resourceId,
        vmId: r.resourceId,
        name: r.name,
        resourceGroup: r.resourceGroup || 'default-rg',
        subscriptionId: r.subscriptionId,
        region: r.region,
        vmSize: r.size || 'Standard_B2s',
        powerState: r.status,
        privateIp: r.privateIp || '-',
        publicIp: r.publicIp || '-',
        cpuUtilization: r.metrics?.cpuUtilization !== undefined ? r.metrics.cpuUtilization : null,
        memoryUtilization: r.metrics?.memoryUtilization !== undefined ? r.metrics.memoryUtilization : null,
        diskUtilization: r.metrics?.diskUtilization !== undefined ? r.metrics.diskUtilization : null,
        networkIn: r.metrics?.networkIn !== undefined ? r.metrics.networkIn : null,
        networkOut: r.metrics?.networkOut !== undefined ? r.metrics.networkOut : null,
        tags: r.metadata?.tags || {},
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Azure VMs' }, { status: 500 });
  }
}
