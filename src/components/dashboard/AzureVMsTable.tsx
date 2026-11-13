'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AzureVirtualMachine } from '@/types/monitoring';
import { AzureLogo } from '@/components/icons/CloudIcons';
import {
  UnifiedServerTable,
} from '@/components/dashboard/UnifiedServerTable';
import { UnifiedServerItem } from '@/components/dashboard/UnifiedServerRow';
import { useMonitoring } from '@/context/MonitoringContext';

interface AzureVMsTableProps {
  vms: AzureVirtualMachine[];
  showViewAllButton?: boolean;
  limit?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function AzureVMsTable({
  vms,
  showViewAllButton = true,
  limit,
  isLoading = false,
  onRefresh,
}: AzureVMsTableProps) {
  const router = useRouter();
  const { customServers, triggerRefresh } = useMonitoring();

  // Map AzureVirtualMachine array into UnifiedServerItem array with SSH telemetry cross-linking
  const unifiedServers: UnifiedServerItem[] = useMemo(() => {
    return vms.map((vm) => {
      // Find matching server document from /api/servers (customServers in context)
      const matchingServer = customServers?.find((s: any) => {
        if (s.cloudResourceId && s.cloudResourceId === vm.vmId) return true;
        if (s.instanceId && s.instanceId === vm.vmId) return true;
        if (s._id && s._id === (vm as any).sshServerId) return true;
        const sHost = (s.host || '').trim();
        if (sHost && (sHost === vm.publicIp || sHost === vm.privateIp)) return true;
        const sName = (s.name || '').toLowerCase().trim();
        if (sName && (sName === (vm.name || '').toLowerCase().trim() || sName === vm.vmId.toLowerCase())) return true;
        return false;
      });

      const isRunning =
        (vm.powerState || '').toLowerCase().includes('run') ||
        ((vm as any).status || '').toLowerCase().includes('run');

      const pubIp =
        vm.publicIp && vm.publicIp !== '-' && vm.publicIp !== 'N/A'
          ? vm.publicIp
          : matchingServer?.publicIp && matchingServer.publicIp !== '-'
          ? matchingServer.publicIp
          : (matchingServer?.host && !matchingServer.host.startsWith('10.') && !matchingServer.host.startsWith('172.') ? matchingServer.host : null);

      const privIp =
        vm.privateIp && vm.privateIp !== '-' && vm.privateIp !== 'N/A'
          ? vm.privateIp
          : matchingServer?.privateIp && matchingServer.privateIp !== '-'
          ? matchingServer.privateIp
          : null;

      const hostIp = pubIp || privIp || matchingServer?.host || '';

      const isSSHVerified = Boolean(
        (vm as any).isSSHConnected ||
        matchingServer?.isSSHConnected ||
        matchingServer?.status === 'Online' ||
        matchingServer?.hasSavedKey
      );

      return {
        id: matchingServer?._id || vm.id || vm.vmId,
        serverId: matchingServer?._id || (vm as any).sshServerId,
        name: vm.name,
        resourceId: vm.vmId,
        cloudProvider: 'azure',
        region: vm.region,
        host: hostIp,
        publicIp: pubIp,
        privateIp: privIp,
        port: matchingServer?.port || 22,
        username: matchingServer?.username || 'siva',
        authMethod: matchingServer?.authMethod || 'privateKey',
        status: isRunning
          ? (matchingServer?.status || 'Online')
          : 'Offline',
        cloudPowerState: isRunning ? 'Running' : 'Stopped',
        isSSHConnected: isSSHVerified,
        hasSavedKey: Boolean(matchingServer?.hasSavedKey || isSSHVerified),
        lastError: matchingServer?.lastError || null,
        lastConnectedAt: matchingServer?.lastConnectedAt || matchingServer?.lastHeartbeatAt || vm.uptime,
        os: matchingServer?.os || vm.os || 'Ubuntu 24.04.5 LTS',
        hardware: matchingServer?.hardware || {
          cpuCores: 2,
          cpuModel: vm.vmSize || 'Standard_D2s_v3',
          totalMemoryBytes: 8589934592,
          totalDiskBytes: 32212254720,
        },
        metrics: matchingServer?.metrics || {
          cpu: {
            usagePercent: typeof vm.cpuUsage === 'number' ? vm.cpuUsage : (vm as any).cpuUtilization ?? null,
            cores: 2,
            timestamp: new Date().toISOString(),
          },
          memory: {
            usagePercent: typeof vm.memoryUsage === 'number' ? vm.memoryUsage : (vm as any).memoryUtilization ?? null,
            totalBytes: 8589934592,
            usedBytes: Math.round(8589934592 * (((vm.memoryUsage as any) || 12) / 100)),
            timestamp: new Date().toISOString(),
          },
          disks: [
            {
              mount: '/',
              usagePercent: typeof vm.diskUsage === 'number' ? vm.diskUsage : (vm as any).diskUtilization ?? null,
              totalBytes: 32212254720,
              usedBytes: Math.round(32212254720 * (((vm.diskUsage as any) || 15) / 100)),
            },
          ],
        },
        cpuUsage: matchingServer?.metrics?.cpu?.usagePercent ?? vm.cpuUsage,
        memoryUsage: matchingServer?.metrics?.memory?.usagePercent ?? vm.memoryUsage,
        diskUsage: matchingServer?.metrics?.disks?.[0]?.usagePercent ?? vm.diskUsage,
        totalMemoryBytes: matchingServer?.hardware?.totalMemoryBytes || 8589934592,
      };
    });
  }, [vms, customServers]);

  return (
    <UnifiedServerTable
      servers={unifiedServers}
      provider="azure"
      title="Microsoft Azure Virtual Machines"
      subtitle="High-performance cloud virtual machines managed via Microsoft Azure Resource Manager (ARM)"
      icon={<AzureLogo className="w-4 h-4" />}
      addLabel="Add Azure VM"
      onAddClick={() => router.push('/dashboard/servers?add=azure')}
      showViewAllButton={showViewAllButton}
      viewAllHref="/dashboard/azure-vms"
      limit={limit}
      detailUrlPrefix="/dashboard/azure-vms"
      isLoading={isLoading}
      onRefresh={onRefresh || triggerRefresh}
      emptyMessage="No Azure Virtual Machines found matching the current search or region filter."
    />
  );
}
