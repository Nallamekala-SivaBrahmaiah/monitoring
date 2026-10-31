import {
  OverviewMetrics,
  CloudAccount,
  EC2InstanceDetail,
  ResourceMetricPoint,
  AlertItem,
} from '@/types/monitoring';
import {
  mockOverviewMetrics,
  mockCloudAccounts,
  mockEC2Instances,
  mockPerformanceMetrics,
  mockRecentAlerts,
  mockCloudDistribution,
  mockServerStatus,
  mockTopRegions,
  mockRunningServices,
} from '@/mock/monitoringData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Multi-Cloud Monitoring API Service
 * Supports live REST API calls with fallback to development mock datasets.
 */

async function fetchJson<T>(endpoint: string, fallbackData: T): Promise<T> {
  // If no base URL is defined and we are on server or client without an external endpoint,
  // we attempt local fetch, falling back to mockData on error or in local mode.
  try {
    const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 15 },
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch {
    // In development mode or offline, gracefully return the mock dataset
    return fallbackData;
  }
}

export async function getDashboardOverview(): Promise<OverviewMetrics> {
  return fetchJson<OverviewMetrics>('/api/dashboard/overview', mockOverviewMetrics);
}

export async function getCloudAccounts(): Promise<CloudAccount[]> {
  return fetchJson<CloudAccount[]>('/api/cloud/accounts', mockCloudAccounts);
}

export async function getResources(): Promise<{
  cloudDistribution: typeof mockCloudDistribution;
  serverStatus: typeof mockServerStatus;
  topRegions: typeof mockTopRegions;
  runningServices: typeof mockRunningServices;
}> {
  return fetchJson('/api/resources', {
    cloudDistribution: mockCloudDistribution,
    serverStatus: mockServerStatus,
    topRegions: mockTopRegions,
    runningServices: mockRunningServices,
  });
}

export async function getEC2Instances(params?: {
  search?: string;
  region?: string;
  status?: string;
}): Promise<EC2InstanceDetail[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.region && params.region !== 'all') query.set('region', params.region);
  if (params?.status && params.status !== 'all') query.set('status', params.status);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const data = await fetchJson<EC2InstanceDetail[]>(
    `/api/aws/ec2/instances${queryString}`,
    mockEC2Instances
  );

  // Client filter fallback if using static mock data
  return data.filter((item) => {
    if (params?.search) {
      const q = params.search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchId = item.instanceId.toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    if (params?.region && params.region !== 'all' && item.region !== params.region) {
      return false;
    }
    if (params?.status && params.status !== 'all' && item.status.toLowerCase() !== params.status.toLowerCase()) {
      return false;
    }
    return true;
  });
}

export async function getEC2InstanceById(instanceId: string): Promise<EC2InstanceDetail | null> {
  const foundMock = mockEC2Instances.find(
    (i) => i.instanceId === instanceId || i.id === instanceId
  ) || null;

  return fetchJson<EC2InstanceDetail | null>(
    `/api/aws/ec2/instances/${instanceId}`,
    foundMock
  );
}

export async function getMetrics(
  metricType: string = 'CPU',
  timeRange: string = '1h'
): Promise<ResourceMetricPoint[]> {
  const fallback = mockPerformanceMetrics[metricType] || mockPerformanceMetrics['CPU'];
  return fetchJson<ResourceMetricPoint[]>(
    `/api/metrics?type=${metricType}&range=${timeRange}`,
    fallback
  );
}

export async function getAlerts(severity?: string): Promise<AlertItem[]> {
  const alerts = await fetchJson<AlertItem[]>('/api/alerts', mockRecentAlerts);
  if (severity && severity !== 'all') {
    return alerts.filter((a) => a.severity.toLowerCase() === severity.toLowerCase());
  }
  return alerts;
}

export async function getAzureVMs(params?: {
  search?: string;
  region?: string;
  status?: string;
  subscriptionId?: string;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.region && params.region !== 'all') query.set('region', params.region);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.subscriptionId && params.subscriptionId !== 'all') query.set('subscriptionId', params.subscriptionId);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchJson<any[]>(`/api/azure/vms${queryString}`, []);
}

export async function getAzureVMById(vmId: string): Promise<any | null> {
  return fetchJson<any | null>(`/api/azure/vms/${vmId}`, null);
}

export async function testAzureConnection(credentials: {
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ success: boolean; message?: string; error?: string; subscription?: any }> {
  try {
    const url = API_BASE_URL ? `${API_BASE_URL}/api/azure/test-connection` : '/api/azure/test-connection';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection test failed' };
  }
}

export async function refreshAzureSubscription(subscriptionId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const url = API_BASE_URL
      ? `${API_BASE_URL}/api/azure/subscriptions/${subscriptionId}/refresh`
      : `/api/azure/subscriptions/${subscriptionId}/refresh`;
    const res = await fetch(url, { method: 'POST' });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Refresh failed' };
  }
}

