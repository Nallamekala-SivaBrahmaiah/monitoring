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
      ? resources.filter((r) => (r.status || '').toLowerCase().includes(status))
      : resources;

    return NextResponse.json(
      filtered.map((r: any) => {
        const rawStatus = r.status || 'Stopped';
        const isRunning = rawStatus.toLowerCase().includes('run');

        const cpu = r.metrics?.cpuUtilization !== null && r.metrics?.cpuUtilization !== undefined
          ? r.metrics.cpuUtilization
          : null;

        const memory = r.metrics?.memoryUtilization !== null && r.metrics?.memoryUtilization !== undefined
          ? r.metrics.memoryUtilization
          : null;

        const disk = r.metrics?.diskUtilization !== null && r.metrics?.diskUtilization !== undefined
          ? r.metrics.diskUtilization
          : null;

        const netIn = r.metrics?.networkIn !== null && r.metrics?.networkIn !== undefined
          ? r.metrics.networkIn
          : null;

        const netOut = r.metrics?.networkOut !== null && r.metrics?.networkOut !== undefined
          ? r.metrics.networkOut
          : null;

        return {
          id: r._id ? r._id.toString() : r.resourceId,
          vmId: r.resourceId,
          name: r.name,
          resourceGroup: r.resourceGroup || 'default-rg',
          subscriptionId: r.subscriptionId,
          region: r.region,
          vmSize: r.size || 'Standard_D2s_v3',
          powerState: isRunning ? 'Running' : rawStatus.replace('PowerState/', ''),
          privateIp: r.privateIp || '-',
          publicIp: r.publicIp || '-',
          cpuUsage: cpu,
          cpuUtilization: cpu,
          cpuStatus: cpu !== null ? 'Available' : 'Unavailable',
          memoryUsage: memory,
          memoryUtilization: memory,
          memoryStatus: memory !== null ? 'Available' : 'Unavailable',
          memoryExplanation: memory === null ? 'Guest memory requires Azure Monitor Agent (AMA) extension on Linux host' : undefined,
          diskUsage: disk,
          diskUtilization: disk,
          diskStatus: disk !== null ? 'Available' : 'Unavailable',
          networkInMB: netIn,
          networkIn: netIn,
          networkOutMB: netOut,
          networkOut: netOut,
          metricSource: 'Azure Monitor (Microsoft.Insights)',
          metricTimestamp: r.metrics?.lastUpdated ? new Date(r.metrics.lastUpdated).toISOString() : new Date().toISOString(),
          uptime: isRunning ? 'Running' : 'Stopped / Deallocated',
          os: r.metadata?.os || 'Linux (ubuntu 22.04)',
          vnet: r.metadata?.vnet || 'vnet-centralindia-1',
          subnet: r.metadata?.subnet || 'default',
          tags: r.metadata?.tags || {},
        };
      })
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Azure VMs' }, { status: 500 });
  }
}
