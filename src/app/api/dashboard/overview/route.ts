import { NextRequest, NextResponse } from 'next/server';
import { fetchResources } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'all';

    const resources = await fetchResources({
      provider: provider !== 'all' ? provider : null,
    });

    const totalResources = resources.length;
    const vms = resources.filter((r) => r.resourceType === 'vm' || r.resourceType === 'ec2');
    const totalVms = vms.length;
    const runningVms = vms.filter((r) => r.status === 'Running').length;
    const stoppedVms = totalVms - runningVms;

    const totalContainers = resources.filter((r) => r.resourceType === 'container').length;
    const k8sClusters = resources.filter((r) => r.resourceType === 'k8s_cluster').length;
    const k8sPods = resources.filter((r) => r.resourceType === 'k8s_pod').length;

    // Averages
    const withCpu = resources.filter((r) => r.metrics?.cpuUtilization !== null && r.metrics?.cpuUtilization !== undefined);
    let avgCpu: number | null = null;
    let avgMem: number | null = null;
    let avgDisk: number | null = null;

    if (withCpu.length > 0) {
      avgCpu = Math.round((withCpu.reduce((sum, r) => sum + r.metrics.cpuUtilization, 0) / withCpu.length) * 10) / 10;
    }

    const withMem = resources.filter((r) => r.metrics?.memoryUtilization !== null && r.metrics?.memoryUtilization !== undefined);
    if (withMem.length > 0) {
      avgMem = Math.round((withMem.reduce((sum, r) => sum + r.metrics.memoryUtilization, 0) / withMem.length) * 10) / 10;
    }

    const withDisk = resources.filter((r) => r.metrics?.diskUtilization !== null && r.metrics?.diskUtilization !== undefined);
    if (withDisk.length > 0) {
      avgDisk = Math.round((withDisk.reduce((sum, r) => sum + r.metrics.diskUtilization, 0) / withDisk.length) * 10) / 10;
    }

    return NextResponse.json({
      totalResources,
      totalVms,
      runningVms,
      stoppedVms,
      totalContainers,
      k8sClusters,
      k8sPods,
      activeAlerts: 0,
      healthyCount: runningVms,
      warningCount: 0,
      criticalCount: 0,
      averageCpu: avgCpu,
      averageMemory: avgMem,
      averageDisk: avgDisk,
      provider,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch overview metrics' }, { status: 500 });
  }
}
