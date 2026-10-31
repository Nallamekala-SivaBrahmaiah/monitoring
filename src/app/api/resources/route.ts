import { NextRequest, NextResponse } from 'next/server';
import {
  mockCloudDistribution,
  mockServerStatus,
  mockTopRegions,
  mockRunningServices,
  mockEC2Instances,
  mockAzureVMs,
  mockDockerContainers,
  mockK8sClusters,
} from '@/mock/monitoringData';

interface CloudResourceItem {
  provider: string;
  accountId?: string;
  subscriptionId?: string;
  region: string;
  resourceType: string;
  resourceId: string;
  name: string;
  status: string;
  metadata?: Record<string, unknown>;
}

// Normalized cloud resources list adhering to the MongoDB schema
const defaultResources: CloudResourceItem[] = [
  ...mockEC2Instances.map((i) => ({
    provider: 'aws',
    accountId: i.accountId || '1234-5678-9012',
    region: i.region,
    resourceType: 'ec2',
    resourceId: i.instanceId,
    name: i.name,
    status: i.status,
    metadata: {
      instanceType: i.instanceType,
      ip: i.publicIp || i.privateIp,
      cpuUsage: i.cpuUsage,
      memoryUsage: i.memoryUsage,
    },
  })),
  ...mockAzureVMs.map((v) => ({
    provider: 'azure',
    subscriptionId: v.subscriptionId || 'sub-89af4100-cba9-4f21-9988-ef129841bb01',
    region: v.region,
    resourceType: 'virtual-machine',
    resourceId: v.vmId,
    name: v.name,
    status: v.powerState,
    metadata: {
      vmSize: v.vmSize,
      ip: v.publicIp || v.privateIp,
      cpuUsage: v.cpuUsage,
      memoryUsage: v.memoryUsage,
    },
  })),
  ...mockDockerContainers.map((c) => ({
    provider: c.cloudProvider,
    accountId: c.cloudProvider === 'aws' ? '1234-5678-9012' : undefined,
    subscriptionId: c.cloudProvider === 'azure' ? 'sub-89af4100-cba9-4f21-9988-ef129841bb01' : undefined,
    region: c.region,
    resourceType: 'container',
    resourceId: c.containerId,
    name: c.name,
    status: c.status,
    metadata: {
      image: c.image,
      hostInstance: c.hostInstance,
      cpuUsage: c.cpuUsage,
    },
  })),
  ...mockK8sClusters.map((k) => ({
    provider: k.cloudProvider,
    accountId: k.cloudProvider === 'aws' ? '1234-5678-9012' : undefined,
    subscriptionId: k.cloudProvider === 'azure' ? 'sub-89af4100-cba9-4f21-9988-ef129841bb01' : undefined,
    region: k.region,
    resourceType: 'cluster',
    resourceId: k.id,
    name: k.name,
    status: k.status,
    metadata: {
      type: k.type,
      version: k.version,
      nodes: k.nodeCount,
      pods: k.podCount,
    },
  })),
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider')?.toLowerCase();
  const accountId = searchParams.get('accountId');
  const subscriptionId = searchParams.get('subscriptionId');
  const region = searchParams.get('region');
  const resourceType = searchParams.get('resourceType')?.toLowerCase();
  const search = searchParams.get('search')?.toLowerCase();

  let filtered = [...defaultResources];

  // Provider filter: aws, azure, or all
  if (provider === 'aws') {
    filtered = filtered.filter((r) => r.provider === 'aws');
  } else if (provider === 'azure') {
    filtered = filtered.filter((r) => r.provider === 'azure');
  } else if (provider === 'all' || !provider) {
    filtered = filtered.filter((r) => r.provider === 'aws' || r.provider === 'azure');
  }

  // Account / Subscription filters
  if (accountId && accountId !== 'all') {
    filtered = filtered.filter((r) => r.accountId === accountId || (accountId === '1234-5678-9012' && r.accountId === 'acc-aws-01'));
  }
  if (subscriptionId && subscriptionId !== 'all') {
    filtered = filtered.filter((r) => r.subscriptionId === subscriptionId || (subscriptionId.startsWith('sub-89af') && r.subscriptionId === 'sub-azure-01'));
  }

  // Region filter
  if (region && region !== 'all') {
    filtered = filtered.filter((r) => r.region === region);
  }

  // Resource type filter
  if (resourceType && resourceType !== 'all') {
    filtered = filtered.filter((r) => r.resourceType === resourceType);
  }

  // Search filter
  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.resourceId.toLowerCase().includes(search)
    );
  }

  // Generate filtered distribution metrics
  let cloudDistribution = [...mockCloudDistribution];
  if (provider === 'aws') {
    cloudDistribution = cloudDistribution.filter((d) => d.name === 'AWS');
  } else if (provider === 'azure') {
    cloudDistribution = cloudDistribution.filter((d) => d.name === 'Azure');
  }

  // Top regions filtered by provider
  let topRegions = [...mockTopRegions];
  if (provider === 'aws') {
    topRegions = topRegions.filter((r) => r.cloud === 'aws');
  } else if (provider === 'azure') {
    topRegions = topRegions.filter((r) => r.cloud === 'azure');
  }

  // Server status filtered
  const ec2Count = filtered.filter((r) => r.resourceType === 'ec2').length;
  const vmCount = filtered.filter((r) => r.resourceType === 'virtual-machine').length;
  const totalServers = ec2Count + vmCount;
  const healthyServers = filtered.filter(
    (r) =>
      (r.resourceType === 'ec2' || r.resourceType === 'virtual-machine') &&
      (r.status.toLowerCase() === 'running' || r.status.toLowerCase() === 'healthy')
  ).length;

  const serverStatus = [
    { name: 'Healthy', value: healthyServers, color: '#10b981' },
    { name: 'Warning', value: totalServers > healthyServers ? totalServers - healthyServers : 0, color: '#f59e0b' },
    { name: 'Critical', value: 0, color: '#ef4444' },
  ];

  const queryObj =
    provider === 'aws'
      ? { provider: 'aws' }
      : provider === 'azure'
      ? { provider: 'azure' }
      : { provider: { $in: ['aws', 'azure'] } };

  return NextResponse.json({
    success: true,
    count: filtered.length,
    provider: provider || 'all',
    mongoQuery: queryObj,
    resources: filtered,
    cloudDistribution,
    serverStatus,
    topRegions,
    runningServices: mockRunningServices,
  });
}
