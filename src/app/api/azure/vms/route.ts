import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedServerInventory } from '@/lib/serverMonitoring/inventoryService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || null;
    const subscriptionId = searchParams.get('subscriptionId') || null;
    const region = searchParams.get('region') || null;
    const status = searchParams.get('status')?.toLowerCase() || null;

    // Fetch unified Azure VMs (cross-reconciled with SSH servers)
    let resources = await getUnifiedServerInventory({
      provider: 'azure',
      region,
      search,
    });

    // Only include real Azure VMs discovered from Azure ARM API / CloudResource
    resources = resources.filter((r) => r.isCloudDiscovered);

    if (subscriptionId && subscriptionId !== 'all') {
      resources = resources.filter((r) => r.subscriptionId === subscriptionId);
    }

    if (status && status !== 'all') {
      resources = resources.filter((r) =>
        (r.status || '').toLowerCase().includes(status) ||
        (r.powerState || '').toLowerCase().includes(status)
      );
    } else {
      // Default: exclude terminated or deleted VMs
      resources = resources.filter((r) => {
        const s = (r.status || '').toLowerCase();
        const p = (r.powerState || '').toLowerCase();
        return !s.includes('terminate') && !s.includes('delete') && !p.includes('terminate') && !p.includes('delete');
      });
    }

    return NextResponse.json(
      resources.map((r) => {
        const isRunning = (r.status || '').toLowerCase().includes('run');

        return {
          id: r.id,
          vmId: r.resourceId,
          name: r.name,
          resourceGroup: r.resourceGroup || 'default-rg',
          subscriptionId: r.subscriptionId,
          region: r.region,
          vmSize: r.vmSize || 'Standard_D2s_v3',
          powerState: isRunning ? 'Running' : (r.powerState || 'Stopped'),
          privateIp: r.privateIp || '-',
          publicIp: r.publicIp || r.host || '-',

          // SSH Connection and Verification
          isSSHConnected: r.isSSHConnected,
          sshServerId: r.sshServerId,
          sshStatus: r.sshStatus,
          isCloudDiscovered: r.isCloudDiscovered,

          // Metrics
          cpuUsage: r.metrics.cpu,
          cpuUtilization: r.metrics.cpu,
          cpuStatus: r.metrics.cpu !== null ? 'Available' : 'Unavailable',

          memoryUsage: r.metrics.memory,
          memoryUtilization: r.metrics.memory,
          memoryStatus: r.metrics.memory !== null ? 'Available' : 'Unavailable',
          memoryExplanation:
            r.metrics.memory === null
              ? 'Guest memory requires Azure Monitor Agent (AMA) extension on Linux host or direct SSH registration'
              : undefined,

          diskUsage: r.metrics.disk,
          diskUtilization: r.metrics.disk,
          diskStatus: r.metrics.disk !== null ? 'Available' : 'Unavailable',
          diskExplanation:
            r.metrics.disk === null
              ? 'Guest disk space requires Azure Monitor Agent (AMA) extension or direct SSH registration'
              : undefined,

          networkInMB: r.metrics.networkIn ?? null,
          networkIn: r.metrics.networkIn ?? null,
          networkOutMB: r.metrics.networkOut ?? null,
          networkOut: r.metrics.networkOut ?? null,

          metricSource: r.metrics.metricSource,
          metricTimestamp: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : new Date().toISOString(),
          uptime: isRunning ? 'Running' : 'Stopped / Deallocated',
          os: r.os || 'Linux',
          tags: r.tags || {},

          // Docker & Kubernetes indicators
          docker: r.docker,
          kubernetes: r.kubernetes,
        };
      })
    );
  } catch (err: any) {
    console.error('Azure VMs fetch error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch Azure VMs' }, { status: 500 });
  }
}
