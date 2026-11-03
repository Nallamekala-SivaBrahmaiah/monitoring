import connectToDatabase from '@/lib/mongodb';
import Server, { IServer } from '@/models/Server';
import CloudResource, { ICloudResource } from '@/models/CloudResource';

export interface UnifiedServerResource {
  id: string;
  resourceId: string;
  name: string;
  host: string;
  publicIp: string;
  privateIp: string;
  cloudProvider: 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other';
  region: string;
  status: string; // e.g. 'Running' | 'Online' | 'Stopped'
  powerState?: string;
  vmSize?: string;
  resourceGroup?: string;
  subscriptionId?: string;
  accountId?: string;
  os: string;
  
  // Connection & Mapping Flags
  isCloudDiscovered: boolean;
  isSSHConnected: boolean;
  sshServerId?: string;
  sshStatus?: string;
  lastConnectedAt?: Date | null;
  lastSyncedAt?: Date | null;

  // Real In-Guest & Cloud Metrics
  metrics: {
    cpu: number | null;
    memory: number | null;
    disk: number | null;
    networkIn?: number | null;
    networkOut?: number | null;
    metricSource: string;
  };

  // Docker Telemetry
  docker: {
    detected: boolean;
    status: 'running' | 'permission_denied' | 'not_installed' | 'daemon_stopped' | 'error';
    statusMessage?: string;
    version: string;
    containersCount: number;
    runningCount: number;
    imagesCount: number;
    containers?: any[];
    images?: any[];
  };

  // Kubernetes Telemetry
  kubernetes: {
    detected: boolean;
    version: string;
    podsCount: number;
    pods?: any[];
  };

  tags?: Record<string, string>;
}

/**
 * Normalizes an IP or hostname string for matching.
 */
function normalizeIp(ip?: string | null): string {
  if (!ip) return '';
  return ip.trim().toLowerCase();
}

/**
 * Fetches and merges the registered SSH servers with cloud-discovered compute resources.
 * Ensures zero duplication and verified cross-mapping.
 */
export async function getUnifiedServerInventory(filter?: {
  provider?: string | null;
  region?: string | null;
  search?: string | null;
}): Promise<UnifiedServerResource[]> {
  await connectToDatabase();

  // 1. Fetch all registered SSH servers
  const servers = await Server.find().lean();

  // 2. Fetch all cloud compute resources (Azure VMs & AWS EC2)
  const cloudResources = await CloudResource.find({
    resourceType: { $in: ['vm', 'ec2'] },
    isDeleted: { $ne: true },
    status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
  }).lean();

  const unifiedList: UnifiedServerResource[] = [];
  const matchedServerIds = new Set<string>();

  // Process cloud resources first and check for matching SSH servers
  for (const cr of (cloudResources as any[])) {
    // Skip if terminated or deleted
    const statusLower = (cr.status || '').toLowerCase();
    if (statusLower === 'terminated' || statusLower === 'deleted') {
      continue;
    }

    // Skip if it's our own mirrored Server doc
    if (cr.resourceId && cr.resourceId.startsWith('srv-')) {
      continue;
    }

    const crPublicIp = normalizeIp(cr.publicIp);
    const crPrivateIp = normalizeIp(cr.privateIp);
    const crName = (cr.name || '').toLowerCase().trim();
    const crResourceId = (cr.resourceId || '').toLowerCase().trim();
    const crSshId = cr.tags?.sshServerId || cr.metadata?.sshServerId;

    // Find matching SSH server by sshServerId, Host/IP, or Name
    const matchingServer = servers.find((s: any) => {
      const sId = s._id?.toString();
      if (crSshId && sId && crSshId === sId) {
        return true;
      }
      const sHost = normalizeIp(s.host);
      const sName = (s.name || '').toLowerCase().trim();

      if (sHost && (sHost === crPublicIp || sHost === crPrivateIp)) {
        return true;
      }
      if (sName && (sName === crName || sName === crResourceId)) {
        return true;
      }
      return false;
    });

    const isRunning = (cr.status || '').toLowerCase().includes('run');

    if (matchingServer) {
      matchedServerIds.add(matchingServer._id.toString());

      // Merged Record: Real in-guest metrics from SSH server + Cloud metadata from Azure/AWS SDK
      unifiedList.push({
        id: cr._id.toString(),
        resourceId: cr.resourceId,
        name: cr.name || matchingServer.name,
        host: matchingServer.host || cr.publicIp || cr.privateIp || '-',
        publicIp: cr.publicIp || matchingServer.host || '-',
        privateIp: cr.privateIp || '-',
        cloudProvider: (cr.provider || matchingServer.cloudProvider || 'other') as any,
        region: cr.region || matchingServer.region || 'Region Not Available',
        status: matchingServer.status === 'Online' ? 'Running' : (cr.status || 'Stopped'),
        powerState: isRunning ? 'Running' : (cr.status || 'Stopped'),
        vmSize: cr.size || 'Standard_D2s_v3',
        resourceGroup: cr.resourceGroup || 'default-rg',
        subscriptionId: cr.subscriptionId,
        accountId: cr.accountId,
        os: `${matchingServer.os?.name || 'Linux'} ${matchingServer.os?.version || ''}`.trim(),

        isCloudDiscovered: true,
        isSSHConnected: true,
        sshServerId: matchingServer._id.toString(),
        sshStatus: matchingServer.status,
        lastConnectedAt: matchingServer.lastConnectedAt,
        lastSyncedAt: matchingServer.lastConnectedAt || cr.lastSyncedAt,

        metrics: {
          cpu: matchingServer.metrics?.cpu?.usagePercent ?? (cr.metrics?.cpuUtilization ?? null),
          memory: matchingServer.metrics?.memory?.usagePercent ?? null,
          disk:
            (matchingServer.metrics?.disks?.find((d: any) => d.mount === '/') ||
              matchingServer.metrics?.disks?.[0])?.usagePercent ??
            (cr.metrics?.diskUtilization ?? null),
          networkIn: matchingServer.metrics?.network?.[0]?.bytesReceived
            ? Math.round((matchingServer.metrics.network[0].bytesReceived / (1024 * 1024)) * 10) / 10
            : (cr.metrics?.networkIn ?? null),
          networkOut: matchingServer.metrics?.network?.[0]?.bytesSent
            ? Math.round((matchingServer.metrics.network[0].bytesSent / (1024 * 1024)) * 10) / 10
            : (cr.metrics?.networkOut ?? null),
          metricSource: 'SSH Agent / In-Guest Telemetry (Verified Mapping)',
        },

        docker: {
          detected: matchingServer.docker?.detected || false,
          status: matchingServer.docker?.status || 'not_installed',
          statusMessage: matchingServer.docker?.statusMessage || 'Docker: Not Installed',
          version: matchingServer.docker?.version || '',
          containersCount: matchingServer.docker?.containersCount || matchingServer.docker?.containers?.length || 0,
          runningCount: matchingServer.docker?.runningCount || matchingServer.docker?.containers?.filter((c: any) => (c.state || '').toLowerCase() === 'running').length || 0,
          imagesCount: matchingServer.docker?.imagesCount || matchingServer.docker?.images?.length || 0,
          containers: matchingServer.docker?.containers || [],
          images: matchingServer.docker?.images || [],
        },

        kubernetes: {
          detected: matchingServer.kubernetes?.detected || false,
          version: matchingServer.kubernetes?.version || '',
          podsCount: matchingServer.kubernetes?.podsCount || matchingServer.kubernetes?.pods?.length || 0,
          pods: matchingServer.kubernetes?.pods || [],
        },

        tags: (cr.tags as any) || {},
      });
    } else {
      // Cloud Discovered Only (No SSH credentials registered)
      unifiedList.push({
        id: cr._id.toString(),
        resourceId: cr.resourceId,
        name: cr.name,
        host: cr.publicIp || cr.privateIp || '-',
        publicIp: cr.publicIp || '-',
        privateIp: cr.privateIp || '-',
        cloudProvider: (cr.provider || 'other') as any,
        region: cr.region || 'Region Not Available',
        status: isRunning ? 'Running' : (cr.status || 'Stopped'),
        powerState: isRunning ? 'Running' : (cr.status || 'Stopped'),
        vmSize: cr.size || (cr.provider === 'aws' ? 't3.micro' : 'Standard_D2s_v3'),
        resourceGroup: cr.resourceGroup || 'default-rg',
        subscriptionId: cr.subscriptionId,
        accountId: cr.accountId,
        os: (cr.metadata as any)?.os || 'Linux',

        isCloudDiscovered: true,
        isSSHConnected: Boolean(cr.tags?.isSSHConnected === 'true' || cr.metadata?.isSSHConnected),
        sshServerId: cr.tags?.sshServerId || cr.metadata?.sshServerId,
        lastSyncedAt: cr.lastSyncedAt,

        metrics: {
          cpu: cr.metrics?.cpuUtilization ?? null,
          memory: cr.metrics?.memoryUtilization ?? null,
          disk: cr.metrics?.diskUtilization ?? null,
          networkIn: cr.metrics?.networkIn ?? null,
          networkOut: cr.metrics?.networkOut ?? null,
          metricSource: cr.metrics?.memoryUtilization !== null && cr.metrics?.memoryUtilization !== undefined
            ? 'In-Guest Telemetry'
            : (cr.provider === 'azure' ? 'Azure Monitor (Microsoft.Insights Platform Only)' : 'AWS CloudWatch Platform Only'),
        },

        docker: {
          detected: false,
          status: 'not_installed',
          statusMessage: 'Docker status unavailable (Register SSH to monitor containers)',
          version: '',
          containersCount: 0,
          runningCount: 0,
          imagesCount: 0,
        },

        kubernetes: {
          detected: false,
          version: '',
          podsCount: 0,
        },

        tags: (cr.tags as any) || {},
      });
    }
  }

  // 3. Add any registered SSH servers that were NOT discovered through Cloud SDK
  for (const s of servers as any[]) {
    if (matchedServerIds.has(s._id.toString())) {
      continue;
    }

    // Never inject into Azure or AWS cloud compute views if not discovered in that cloud
    // If a VM was deleted in Azure console or AWS console, it must NOT appear in Azure VMs or EC2 tables!
    if (filter?.provider === 'azure' || filter?.provider === 'aws') {
      continue;
    }

    // If an instance was tagged as azure or aws, but was not discovered in the cloud,
    // it means it was terminated or deleted in the cloud console. Exclude it.
    if (s.cloudProvider === 'azure' || s.cloudProvider === 'aws') {
      continue;
    }

    unifiedList.push({
      id: s._id.toString(),
      resourceId: `srv-${s._id.toString()}`,
      name: s.name,
      host: s.host,
      publicIp: s.host,
      privateIp: '-',
      cloudProvider: s.cloudProvider || 'other',
      region: s.region || 'Region Not Available',
      status: s.status === 'Online' ? 'Running' : s.status,
      powerState: s.status === 'Online' ? 'Running' : s.status,
      vmSize: `${s.hardware?.cpuCores || 1} vCPU / ${Math.round((s.hardware?.totalMemoryBytes || 0) / (1024 * 1024 * 1024))}GB`,
      os: `${s.os?.name || 'Linux'} ${s.os?.version || ''}`.trim(),

      isCloudDiscovered: false,
      isSSHConnected: true,
      sshServerId: s._id.toString(),
      sshStatus: s.status,
      lastConnectedAt: s.lastConnectedAt,
      lastSyncedAt: s.lastConnectedAt,

      metrics: {
        cpu: s.metrics?.cpu?.usagePercent ?? null,
        memory: s.metrics?.memory?.usagePercent ?? null,
        disk:
          (s.metrics?.disks?.find((d: any) => d.mount === '/') ||
            s.metrics?.disks?.[0])?.usagePercent ?? null,
        networkIn: s.metrics?.network?.[0]?.bytesReceived
          ? Math.round((s.metrics.network[0].bytesReceived / (1024 * 1024)) * 10) / 10
          : null,
        networkOut: s.metrics?.network?.[0]?.bytesSent
          ? Math.round((s.metrics.network[0].bytesSent / (1024 * 1024)) * 10) / 10
          : null,
        metricSource: 'Direct SSH Telemetry',
      },

      docker: {
        detected: s.docker?.detected || false,
        status: s.docker?.status || 'not_installed',
        statusMessage: s.docker?.statusMessage || 'Docker: Not Installed',
        version: s.docker?.version || '',
        containersCount: s.docker?.containersCount || s.docker?.containers?.length || 0,
        runningCount: s.docker?.runningCount || s.docker?.containers?.filter((c: any) => (c.state || '').toLowerCase() === 'running').length || 0,
        imagesCount: s.docker?.imagesCount || s.docker?.images?.length || 0,
        containers: s.docker?.containers || [],
        images: s.docker?.images || [],
      },

      kubernetes: {
        detected: s.kubernetes?.detected || false,
        version: s.kubernetes?.version || '',
        podsCount: s.kubernetes?.podsCount || s.kubernetes?.pods?.length || 0,
        pods: s.kubernetes?.pods || [],
      },

      tags: s.tags?.reduce((acc: any, t: string) => {
        acc[t] = 'true';
        return acc;
      }, {}) || {},
    });
  }

  // 4. Apply optional filters
  let result = unifiedList;
  if (filter?.provider && filter.provider !== 'all') {
    result = result.filter((r) => r.cloudProvider === filter.provider);
  }
  if (filter?.region && filter.region !== 'all') {
    const norm = filter.region.toLowerCase().replace(/[\s-_]+/g, '');
    result = result.filter((r) => (r.region || '').toLowerCase().replace(/[\s-_]+/g, '') === norm);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.host.toLowerCase().includes(q) ||
        r.resourceId.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q)
    );
  }

  return result;
}
