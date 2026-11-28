'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Server } from 'lucide-react';
import { UnifiedServerTable } from '@/components/dashboard/UnifiedServerTable';
import { UnifiedServerItem } from '@/components/dashboard/UnifiedServerRow';
import { useMonitoring } from '@/context/MonitoringContext';

interface OnPremisesServersTableProps {
  servers?: any[];
  showViewAllButton?: boolean;
  limit?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  onAddClick?: () => void;
}

export function OnPremisesServersTable({
  servers,
  showViewAllButton = false,
  limit,
  isLoading = false,
  onRefresh,
  onAddClick,
}: OnPremisesServersTableProps) {
  const router = useRouter();
  const { customServers, triggerRefresh } = useMonitoring();
  const [localServers, setLocalServers] = useState<any[] | null>(null);

  const fetchDirectServers = async () => {
    try {
      const res = await fetch(`/api/servers?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setLocalServers(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDirectServers();
  }, []);

  // STRICT FILTER: Only display dedicated on-premises / standalone registered servers
  // Never show auto-discovered cloud fleet instances (AWS EC2 / Azure VMs) here
  const onPremServers = useMemo(() => {
    if (servers !== undefined) return servers;
    const rawList = localServers || customServers || [];
    return rawList.filter((s: any) => {
      const prov = (s.cloudProvider || '').toLowerCase();
      const resId = (s.cloudResourceId || s.instanceId || '').toLowerCase();

      // Include explicitly registered on-premise, datacenter, bare-metal or custom servers
      if (
        prov === 'on-premise' ||
        prov === 'on-premises' ||
        prov === 'onprem' ||
        prov === 'datacenter' ||
        prov === 'bare-metal' ||
        prov === 'custom'
      ) {
        return true;
      }

      // Filter out auto-synced cloud fleet instances
      if (prov === 'aws' || prov === 'azure' || prov === 'gcp') return false;
      if (resId.startsWith('i-') || resId.includes('/subscriptions/') || resId.includes('/resourcegroups/')) return false;

      return prov === 'other' || !prov;
    });
  }, [servers, localServers, customServers]);

  // Map into UnifiedServerItem array (STRICT: only onPremServers, never fall back to cloud servers)
  const unifiedServers: UnifiedServerItem[] = useMemo(() => {
    return onPremServers.map((s: any) => {
      const rawStatus = (s.status || '').toLowerCase();
      const isOnline =
        rawStatus === 'online' ||
        rawStatus === 'running' ||
        Boolean(s.isSSHConnected && rawStatus !== 'offline');

      const pubIp = s.publicIp && s.publicIp !== '-' ? s.publicIp : s.host || null;
      const privIp = s.privateIp && s.privateIp !== '-' ? s.privateIp : null;
      const hostIp = pubIp || privIp || s.host || '';

      const isSSHVerified = Boolean(
        s.isSSHConnected ||
        s.status === 'Online' ||
        s.hasSavedKey
      );

      return {
        id: s._id || s.id,
        serverId: s._id || s.id,
        name: s.name || s.host || 'On-Premise Server',
        resourceId: s._id || s.id,
        cloudProvider: 'on-premise',
        region: s.region || s.environment || 'Datacenter',
        host: hostIp,
        publicIp: pubIp,
        privateIp: privIp,
        port: s.port || 22,
        username: s.username || 'root',
        authMethod: s.authMethod || 'privateKey',
        status: isOnline ? 'Online' : 'Offline',
        cloudPowerState: isOnline ? 'Running' : 'Stopped',
        isSSHConnected: isSSHVerified,
        hasSavedKey: Boolean(s.hasSavedKey || isSSHVerified),
        lastError: s.lastError || null,
        lastConnectedAt: s.lastConnectedAt || s.lastHeartbeatAt || null,
        os: s.os || 'Linux Bare-Metal',
        hardware: s.hardware || {
          cpuCores: 2,
          cpuModel: 'Physical Server Node',
          totalMemoryBytes: 8589934592,
          totalDiskBytes: 32212254720,
        },
        metrics: s.metrics || {
          cpu: {
            usagePercent: s.metrics?.cpu?.usagePercent ?? null,
            cores: s.hardware?.cpuCores || 2,
            timestamp: new Date().toISOString(),
          },
          memory: {
            usagePercent: s.metrics?.memory?.usagePercent ?? null,
            totalBytes: s.hardware?.totalMemoryBytes || 8589934592,
            usedBytes: s.metrics?.memory?.usedBytes || 0,
            timestamp: new Date().toISOString(),
          },
          disks: s.metrics?.disks || [
            {
              mount: '/',
              usagePercent: s.metrics?.disks?.[0]?.usagePercent ?? null,
              totalBytes: s.hardware?.totalDiskBytes || 32212254720,
              usedBytes: s.metrics?.disks?.[0]?.usedBytes || 0,
            },
          ],
        },
        cpuUsage: s.metrics?.cpu?.usagePercent,
        memoryUsage: s.metrics?.memory?.usagePercent,
        diskUsage: s.metrics?.disks?.[0]?.usagePercent,
        totalMemoryBytes: s.hardware?.totalMemoryBytes || 8589934592,
      };
    });
  }, [onPremServers]);

  return (
    <UnifiedServerTable
      servers={unifiedServers}
      provider="on-prem"
      title="On-Premises Infrastructure Servers"
      subtitle="Dedicated bare-metal nodes and custom integrated servers with live telemetry"
      icon={<Server className="w-4 h-4 text-emerald-400" />}
      addLabel="Add On-Premise Server"
      onAddClick={onAddClick}
      showViewAllButton={showViewAllButton}
      viewAllHref="/dashboard/on-premises"
      limit={limit}
      detailUrlPrefix="/dashboard/on-premises"
      isLoading={isLoading}
      onRefresh={() => {
        fetchDirectServers();
        if (onRefresh) onRefresh();
        else triggerRefresh();
      }}
      emptyMessage="No on-premises servers registered yet. Click '+ Add On-Premise Server' to integrate your server via SSH."
    />
  );
}
