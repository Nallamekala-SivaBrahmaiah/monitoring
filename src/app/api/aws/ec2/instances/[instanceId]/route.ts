import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedServerInventory } from '@/lib/serverMonitoring/inventoryService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await context.params;
    const resources = await getUnifiedServerInventory({ provider: 'aws' });

    const r = resources.find(
      (item) => item.resourceId === instanceId || item.id === instanceId
    );

    if (!r) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const isRunning = (r.status || '').toLowerCase().includes('run');

    return NextResponse.json({
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

      isSSHConnected: r.isSSHConnected,
      sshServerId: r.sshServerId,
      sshStatus: r.sshStatus,

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
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch EC2 instance' }, { status: 500 });
  }
}
