import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedServerInventory } from '@/lib/serverMonitoring/inventoryService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || null;
    const accountId = searchParams.get('accountId');
    const region = searchParams.get('region');
    const status = searchParams.get('status')?.toLowerCase();

    // Fetch unified AWS EC2 inventory (cloud discovered + registered SSH servers on AWS)
    let resources = await getUnifiedServerInventory({
      provider: 'aws',
      region,
      search,
    });

    if (accountId && accountId !== 'all') {
      resources = resources.filter((r) => r.accountId === accountId);
    }

    if (status && status !== 'all') {
      resources = resources.filter((r) => (r.status || '').toLowerCase().includes(status));
    }

    return NextResponse.json(
      resources.map((r) => {
        const isRunning = (r.status || '').toLowerCase().includes('run');

        return {
          id: r.id,
          instanceId: r.resourceId,
          name: r.name,
          region: r.region,
          accountId: r.accountId || 'acc-aws-01',
          instanceType: r.vmSize || 't3.micro',
          state: isRunning ? 'running' : (r.status || 'stopped').toLowerCase(),
          status: isRunning ? 'running' : (r.status || 'stopped').toLowerCase(),
          privateIp: r.privateIp || '-',
          publicIp: r.publicIp || r.host || '-',
          launchTime: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : new Date().toISOString(),
          uptime: isRunning ? 'Active' : 'Stopped',
          os: r.os || 'Linux (amazon-linux-2)',
          tags: r.tags || {},

          // SSH Connection
          isSSHConnected: r.isSSHConnected,
          sshServerId: r.sshServerId,
          sshStatus: r.sshStatus,

          // Real Telemetry
          metrics: {
            cpuUtilization: r.metrics.cpu,
            memoryUtilization: r.metrics.memory,
            diskUtilization: r.metrics.disk,
            networkIn: r.metrics.networkIn,
            networkOut: r.metrics.networkOut,
          },

          cpuStatus: r.metrics.cpu !== null ? 'Available' : 'Unavailable',
          memoryStatus: r.metrics.memory !== null ? 'Available' : 'Unavailable',
          diskStatus: r.metrics.disk !== null ? 'Available' : 'Unavailable',
          metricSource: r.metrics.metricSource,
        };
      })
    );
  } catch (err: any) {
    console.error('EC2 instances fetch error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch EC2 instances' }, { status: 500 });
  }
}
