import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import Alert from '@/models/Alert';



export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'all';

    const providerFilter: any = {};
    if (provider && provider !== 'all') {
      providerFilter.provider = provider;
    }

    // 1. Total resources
    const totalResources = await CloudResource.countDocuments(providerFilter);

    // 2. VMs
    const vmFilter = {
      ...providerFilter,
      resourceType: { $in: ['vm', 'ec2'] },
    };
    const totalVms = await CloudResource.countDocuments(vmFilter);
    const runningVms = await CloudResource.countDocuments({ ...vmFilter, status: 'Running' });
    const stoppedVms = totalVms - runningVms;

    // 3. Containers
    const totalContainers = await CloudResource.countDocuments({
      ...providerFilter,
      resourceType: 'container',
    });

    // 4. Kubernetes
    const k8sClusters = await CloudResource.countDocuments({
      ...providerFilter,
      resourceType: 'k8s_cluster',
    });
    const k8sPods = await CloudResource.countDocuments({
      ...providerFilter,
      resourceType: 'k8s_pod',
    });

    // 5. Alerts
    const alertFilter: any = { status: 'active' };
    if (provider && provider !== 'all') {
      alertFilter.provider = provider;
    }
    const activeAlerts = await Alert.countDocuments(alertFilter);
    const criticalAlerts = await Alert.countDocuments({ ...alertFilter, severity: 'critical' });
    const warningAlerts = await Alert.countDocuments({ ...alertFilter, severity: 'warning' });

    // 6. Average Utilization from real metrics
    const resourcesWithCpu = await CloudResource.find({
      ...providerFilter,
      'metrics.cpuUtilization': { $ne: null },
    })
      .select('metrics.cpuUtilization metrics.memoryUtilization metrics.diskUtilization')
      .lean();

    let avgCpu: number | null = null;
    let avgMem: number | null = null;
    let avgDisk: number | null = null;

    if (resourcesWithCpu.length > 0) {
      const cpuSum = resourcesWithCpu.reduce((sum, r) => sum + (r.metrics.cpuUtilization || 0), 0);
      avgCpu = Math.round((cpuSum / resourcesWithCpu.length) * 10) / 10;

      const memResources = resourcesWithCpu.filter((r) => r.metrics.memoryUtilization !== null);
      if (memResources.length > 0) {
        const memSum = memResources.reduce((sum, r) => sum + (r.metrics.memoryUtilization || 0), 0);
        avgMem = Math.round((memSum / memResources.length) * 10) / 10;
      }

      const diskResources = resourcesWithCpu.filter((r) => r.metrics.diskUtilization !== null);
      if (diskResources.length > 0) {
        const diskSum = diskResources.reduce((sum, r) => sum + (r.metrics.diskUtilization || 0), 0);
        avgDisk = Math.round((diskSum / diskResources.length) * 10) / 10;
      }
    }

    return NextResponse.json({
      totalResources,
      totalVms,
      runningVms,
      stoppedVms,
      totalContainers,
      k8sClusters,
      k8sPods,
      activeAlerts,
      healthyCount: runningVms,
      warningCount: warningAlerts,
      criticalCount: criticalAlerts,
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
