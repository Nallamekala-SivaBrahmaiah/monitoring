import { NextRequest, NextResponse } from 'next/server';
import {
  mockOverviewMetrics,
  mockEC2Instances,
  mockAzureVMs,
  mockDockerContainers,
  mockK8sClusters,
  mockRecentAlerts,
} from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider')?.toLowerCase();
  const accountId = searchParams.get('accountId');
  const subscriptionId = searchParams.get('subscriptionId');

  let ec2 = [...mockEC2Instances];
  let vms = [...mockAzureVMs];
  let docker = [...mockDockerContainers];
  let k8s = [...mockK8sClusters];
  let alerts = [...mockRecentAlerts];

  if (provider === 'aws') {
    vms = [];
    docker = docker.filter((d) => d.cloudProvider === 'aws');
    k8s = k8s.filter((k) => k.cloudProvider === 'aws');
    alerts = alerts.filter((a) => a.provider === 'aws');
  } else if (provider === 'azure') {
    ec2 = [];
    docker = docker.filter((d) => d.cloudProvider === 'azure');
    k8s = k8s.filter((k) => k.cloudProvider === 'azure');
    alerts = alerts.filter((a) => a.provider === 'azure');
  }

  if (accountId && accountId !== 'all') {
    ec2 = ec2.filter((i) => i.accountId === accountId);
  }

  if (subscriptionId && subscriptionId !== 'all') {
    vms = vms.filter((v) => v.subscriptionId === subscriptionId);
  }

  const totalServers = ec2.length + vms.length;
  const runningServers =
    ec2.filter((i) => i.status === 'Running').length +
    vms.filter((v) => v.powerState === 'Running').length;

  return NextResponse.json({
    awsResources: {
      total: provider === 'azure' ? 0 : ec2.length,
      changeText: '+1 new',
      trend: [8, 9, 10, 10, 11, ec2.length || 12],
    },
    azureResources: {
      total: provider === 'aws' ? 0 : vms.length,
      changeText: '+0 new',
      trend: [7, 7, 8, 8, 8, vms.length || 8],
    },
    totalServers: {
      total: totalServers,
      runningText: `${runningServers} running`,
      trend: [16, 17, 18, 19, 19, totalServers],
    },
    dockerContainers: {
      total: docker.length,
      runningText: `${Math.max(0, docker.length - 1)} running`,
      trend: [10, 11, 12, 13, 14, docker.length],
    },
    k8sClusters: {
      total: k8s.length,
      healthyText: `${k8s.length} healthy`,
      trend: [1, 1, 2, 2, 2, k8s.length],
    },
    activeAlerts: {
      total: alerts.filter((a) => a.status === 'active').length,
      newText: `${alerts.filter((a) => a.status === 'active').length} new`,
      trend: [1, 2, 1, 3, 2, alerts.filter((a) => a.status === 'active').length],
    },
  });
}
