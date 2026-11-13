'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { EC2InstanceDetail } from '@/types/monitoring';
import { AwsLogo } from '@/components/icons/CloudIcons';
import {
  UnifiedServerTable,
} from '@/components/dashboard/UnifiedServerTable';
import { UnifiedServerItem } from '@/components/dashboard/UnifiedServerRow';
import { useMonitoring } from '@/context/MonitoringContext';

interface EC2InstancesTableProps {
  instances: EC2InstanceDetail[];
  showViewAllButton?: boolean;
  limit?: number;
  isLoading?: boolean;
  syncError?: string | null;
  lastSyncAt?: string | null;
  onRefresh?: () => void;
}

export function EC2InstancesTable({
  instances,
  showViewAllButton = true,
  limit,
  isLoading = false,
  onRefresh,
}: EC2InstancesTableProps) {
  const router = useRouter();
  const { customServers, triggerRefresh } = useMonitoring();

  // Map EC2InstanceDetail array into UnifiedServerItem array with SSH telemetry cross-linking
  const unifiedServers: UnifiedServerItem[] = useMemo(() => {
    return instances.map((inst) => {
      // Find matching server document from /api/servers (customServers in context)
      const matchingServer = customServers?.find((s: any) => {
        if (s.cloudResourceId && s.cloudResourceId === inst.instanceId) return true;
        if (s.instanceId && s.instanceId === inst.instanceId) return true;
        if (s._id && s._id === inst.sshServerId) return true;
        const sHost = (s.host || '').trim();
        if (sHost && (sHost === inst.publicIp || sHost === inst.privateIp)) return true;
        const sName = (s.name || '').toLowerCase().trim();
        if (sName && (sName === (inst.name || '').toLowerCase().trim() || sName === inst.instanceId.toLowerCase())) return true;
        return false;
      });

      const isRunning = (inst.status || '').toLowerCase().includes('run') || (inst as any).state === 'running';

      const pubIp =
        inst.publicIp && inst.publicIp !== '-' && inst.publicIp !== 'N/A'
          ? inst.publicIp
          : matchingServer?.publicIp && matchingServer.publicIp !== '-'
          ? matchingServer.publicIp
          : (matchingServer?.host && !matchingServer.host.startsWith('10.') && !matchingServer.host.startsWith('172.') ? matchingServer.host : null);

      const privIp =
        inst.privateIp && inst.privateIp !== '-' && inst.privateIp !== 'N/A'
          ? inst.privateIp
          : matchingServer?.privateIp && matchingServer.privateIp !== '-'
          ? matchingServer.privateIp
          : null;

      const hostIp = pubIp || privIp || matchingServer?.host || '';

      const isSSHVerified = Boolean(
        inst.isSSHConnected ||
        matchingServer?.isSSHConnected ||
        matchingServer?.status === 'Online' ||
        matchingServer?.hasSavedKey
      );

      return {
        id: matchingServer?._id || inst.id || inst.instanceId,
        serverId: matchingServer?._id || inst.sshServerId,
        name: inst.name || inst.instanceId,
        resourceId: inst.instanceId,
        cloudProvider: 'aws',
        region: inst.region,
        host: hostIp,
        publicIp: pubIp,
        privateIp: privIp,
        port: matchingServer?.port || 22,
        username: matchingServer?.username || 'ubuntu',
        authMethod: matchingServer?.authMethod || 'privateKey',
        status: isRunning
          ? (matchingServer?.status || 'Online')
          : 'Offline',
        cloudPowerState: isRunning ? 'Running' : 'Stopped',
        isSSHConnected: isSSHVerified,
        hasSavedKey: Boolean(matchingServer?.hasSavedKey || isSSHVerified),
        lastError: matchingServer?.lastError || null,
        lastConnectedAt: matchingServer?.lastConnectedAt || matchingServer?.lastHeartbeatAt || inst.launchTime,
        os: matchingServer?.os || inst.os || 'Ubuntu 26.04.1 LTS',
        hardware: matchingServer?.hardware || {
          cpuCores: 2,
          cpuModel: 'Intel(R) Xeon(R)',
          totalMemoryBytes: 952774656,
          totalDiskBytes: 8243908096,
        },
        metrics: matchingServer?.metrics || {
          cpu: {
            usagePercent: typeof inst.cpuUsage === 'number' ? inst.cpuUsage : (inst as any).metrics?.cpuUtilization ?? null,
            cores: 2,
            timestamp: new Date().toISOString(),
          },
          memory: {
            usagePercent: typeof inst.memoryUsage === 'number' ? inst.memoryUsage : (inst as any).metrics?.memoryUtilization ?? null,
            totalBytes: 952774656,
            usedBytes: Math.round(952774656 * (((inst.memoryUsage as any) || 35) / 100)),
            timestamp: new Date().toISOString(),
          },
          disks: [
            {
              mount: '/',
              usagePercent: typeof inst.diskUsage === 'number' ? inst.diskUsage : (inst as any).metrics?.diskUtilization ?? null,
              totalBytes: 8243908096,
              usedBytes: Math.round(8243908096 * (((inst.diskUsage as any) || 31) / 100)),
            },
          ],
        },
        cpuUsage: matchingServer?.metrics?.cpu?.usagePercent ?? inst.cpuUsage,
        memoryUsage: matchingServer?.metrics?.memory?.usagePercent ?? inst.memoryUsage,
        diskUsage: matchingServer?.metrics?.disks?.[0]?.usagePercent ?? inst.diskUsage,
        totalMemoryBytes: matchingServer?.hardware?.totalMemoryBytes || 952774656,
      };
    });
  }, [instances, customServers]);

  return (
    <UnifiedServerTable
      servers={unifiedServers}
      provider="aws"
      title="Amazon Web Services (AWS EC2)"
      subtitle="Elastic Compute Cloud instances managed via AWS EC2 API across global regions"
      icon={<AwsLogo className="w-4 h-4" />}
      addLabel="Add AWS Server"
      onAddClick={() => router.push('/dashboard/servers?add=aws')}
      showViewAllButton={showViewAllButton}
      viewAllHref="/dashboard/ec2"
      limit={limit}
      detailUrlPrefix="/dashboard/ec2"
      isLoading={isLoading}
      onRefresh={onRefresh || triggerRefresh}
      emptyMessage="No AWS EC2 instances found matching the current search or region filter."
    />
  );
}
