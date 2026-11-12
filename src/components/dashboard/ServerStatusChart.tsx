'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Server as ServerIcon, AlertTriangle, CheckCircle, ExternalLink, Clock, Plus } from 'lucide-react';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface ServerStatusChartProps {
  data?: any[];
  healthyPercentage?: number;
}

export interface ActualServerNode {
  id: string;
  name: string;
  provider: 'aws' | 'azure';
  region: string;
  ip: string;
  statusCategory: 'healthy' | 'warning' | 'critical' | 'unknown';
  powerState: 'Running' | 'Stopped' | 'Online' | 'Offline';
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  lastConnected: string | null;
  detailUrl: string;
}

export function ServerStatusChart({}: ServerStatusChartProps) {
  const router = useRouter();
  const { cloudProvider, filteredEC2Instances, filteredAzureVMs, customServers, selectedRegion } = useMonitoring();
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [hoveredNode, setHoveredNode] = useState<ActualServerNode | null>(null);

  // 1. Build the list of ONLY ACTUAL REGISTERED SERVERS (1 cell = 1 actual server)
  const actualServers: ActualServerNode[] = useMemo(() => {
    const map = new Map<string, ActualServerNode>();

    // 1a. Process Azure VMs
    if (cloudProvider === 'all' || cloudProvider === 'azure') {
      filteredAzureVMs.forEach((v) => {
        const key = (v.name || v.id).toLowerCase().trim();
        const isRunning = (v.powerState || '').toLowerCase().includes('run');
        const reg = v.region || (v as any).location || 'centralindia';

        // Match with custom server record for SSH metrics if available
        const matchedCustom = customServers.find(
          (s) =>
            (s.name || '').toLowerCase().trim() === key ||
            (s.host && (s.host === v.publicIp || s.host === v.privateIp))
        );

        const cpu = matchedCustom?.metrics?.cpu?.usagePercent ?? v.cpuUsage ?? (v as any).cpuUtilization ?? 0;
        const ram = matchedCustom?.metrics?.memory?.usagePercent ?? v.memoryUsage ?? (v as any).memoryUtilization ?? 0;
        const disk = matchedCustom?.metrics?.disks?.[0]?.usagePercent ?? v.diskUsage ?? (v as any).diskUtilization ?? 0;

        let statusCategory: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
        if (!isRunning) {
          statusCategory = 'critical';
        } else if (cpu > 70 || ram > 70) {
          statusCategory = 'warning';
        } else if (matchedCustom?.status && matchedCustom.status !== 'Online') {
          statusCategory = 'critical';
        }

        const lastCol = matchedCustom?.lastConnectedAt
          ? new Date(matchedCustom.lastConnectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : isRunning ? 'Real-time' : 'Stopped';

        map.set(key, {
          id: matchedCustom?._id || v.id,
          name: v.name,
          provider: 'azure',
          region: reg,
          ip: v.publicIp || v.privateIp || matchedCustom?.host || 'N/A',
          statusCategory,
          powerState: isRunning ? 'Running' : 'Stopped',
          cpuPercent: Math.round(cpu * 10) / 10,
          memoryPercent: Math.round(ram * 10) / 10,
          diskPercent: Math.round(disk * 10) / 10,
          lastConnected: lastCol,
          detailUrl: matchedCustom?._id ? `/dashboard/servers/${matchedCustom._id}` : `/dashboard/azure-vms/${v.id || v.name}`,
        });
      });
    }

    // 1b. Process AWS EC2 Instances
    if (cloudProvider === 'all' || cloudProvider === 'aws') {
      filteredEC2Instances.forEach((i) => {
        const key = (i.name || i.instanceId).toLowerCase().trim();
        const isRunning = i.status === 'Running';
        const reg = i.region || 'ap-southeast-2';

        const matchedCustom = customServers.find(
          (s) =>
            (s.name || '').toLowerCase().trim() === key ||
            (s.host && (s.host === i.publicIp || s.host === i.privateIp)) ||
            (s.tags && s.tags.includes(i.instanceId))
        );

        const cpu = matchedCustom?.metrics?.cpu?.usagePercent ?? i.cpuUsage ?? 0;
        const ram = matchedCustom?.metrics?.memory?.usagePercent ?? i.memoryUsage ?? 0;
        const disk = matchedCustom?.metrics?.disks?.[0]?.usagePercent ?? i.diskUsage ?? 0;

        let statusCategory: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
        if (!isRunning) {
          statusCategory = 'critical';
        } else if (cpu > 70 || ram > 70) {
          statusCategory = 'warning';
        } else if (matchedCustom?.status && matchedCustom.status !== 'Online') {
          statusCategory = 'critical';
        }

        const lastCol = matchedCustom?.lastConnectedAt
          ? new Date(matchedCustom.lastConnectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : isRunning ? 'Real-time' : 'Stopped in AWS';

        map.set(key, {
          id: matchedCustom?._id || i.instanceId,
          name: i.name || i.instanceId,
          provider: 'aws',
          region: reg,
          ip: i.publicIp || i.privateIp || matchedCustom?.host || 'N/A',
          statusCategory,
          powerState: isRunning ? 'Running' : 'Stopped',
          cpuPercent: Math.round(cpu * 10) / 10,
          memoryPercent: Math.round(ram * 10) / 10,
          diskPercent: Math.round(disk * 10) / 10,
          lastConnected: lastCol,
          detailUrl: matchedCustom?._id ? `/dashboard/servers/${matchedCustom._id}` : `/dashboard/ec2/${i.instanceId}`,
        });
      });
    }

    // 1c. Process any custom registered servers not matched above
    customServers.forEach((s) => {
      const key = (s.name || s._id).toLowerCase().trim();
      if (!map.has(key)) {
        const prov = (s.cloudProvider || '').toLowerCase() === 'aws' ? 'aws' : 'azure';
        if (cloudProvider === 'aws' && prov !== 'aws') return;
        if (cloudProvider === 'azure' && prov !== 'azure') return;
        if (selectedRegion !== 'all' && s.region && s.region !== selectedRegion) return;

        const isOnline = s.status === 'Online' || (s.status || '').toLowerCase().includes('run');
        const cpu = s.metrics?.cpu?.usagePercent ?? 0;
        const ram = s.metrics?.memory?.usagePercent ?? 0;
        const disk = s.metrics?.disks?.[0]?.usagePercent ?? 0;

        let statusCategory: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
        if (!isOnline) {
          statusCategory = 'critical';
        } else if (cpu > 70 || ram > 70) {
          statusCategory = 'warning';
        }

        const lastCol = s.lastConnectedAt
          ? new Date(s.lastConnectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : isOnline ? 'Online' : 'Stopped';

        map.set(key, {
          id: s._id,
          name: s.name,
          provider: prov,
          region: s.region || (prov === 'aws' ? 'ap-southeast-2' : 'centralindia'),
          ip: s.host || s.publicIp || 'N/A',
          statusCategory,
          powerState: isOnline ? 'Online' : 'Stopped',
          cpuPercent: Math.round(cpu * 10) / 10,
          memoryPercent: Math.round(ram * 10) / 10,
          diskPercent: Math.round(disk * 10) / 10,
          lastConnected: lastCol,
          detailUrl: `/dashboard/servers/${s._id}`,
        });
      }
    });

    return Array.from(map.values());
  }, [cloudProvider, filteredAzureVMs, filteredEC2Instances, customServers, selectedRegion]);

  const total = actualServers.length;
  const healthyCount = actualServers.filter((s) => s.statusCategory === 'healthy').length;
  const warningCount = actualServers.filter((s) => s.statusCategory === 'warning').length;
  const criticalCount = actualServers.filter((s) => s.statusCategory === 'critical').length;
  const healthyPct = total > 0 ? Math.round((healthyCount / total) * 100) : 0;

  // Filtered actual servers for the heatmap display
  const displayedServers = useMemo(() => {
    if (filter === 'all') return actualServers;
    return actualServers.filter((s) => s.statusCategory === filter);
  }, [actualServers, filter]);

  // Names of stopped/offline instances
  const stoppedServers = actualServers.filter((s) => s.powerState === 'Stopped' || s.statusCategory === 'critical');

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-auto min-h-full relative overflow-hidden group hover:border-emerald-500/40 transition-all">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Server Status Fleet
            </h3>
            <p className="text-[10px] text-slate-400">
              {total} {total === 1 ? 'Node' : 'Nodes'} Real-Time Health
            </p>
          </div>
        </div>

        {total > 0 && (
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{healthyPct}% Healthy</span>
          </span>
        )}
      </div>

      {/* 2. Empty State (if 0 servers) */}
      {total === 0 ? (
        <div className="py-8 text-center space-y-2 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
            <ServerIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-300">No Servers Found</span>
          <p className="text-[11px] text-slate-500 max-w-[200px]">
            No registered servers found for the current cloud view.
          </p>
          <Link
            href="/dashboard/servers"
            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold mt-1"
          >
            <Plus className="w-3 h-3" /> Register Server
          </Link>
        </div>
      ) : (
        <div className="py-3.5 space-y-3.5">
          {/* 3. Status Filter Buttons (Actual Counts Only) */}
          <div className="flex items-center justify-between gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all border ${
                filter === 'all'
                  ? 'bg-slate-700/80 text-white border-slate-500 shadow-sm'
                  : 'bg-[#0D1526] text-slate-400 border-[#1E293B] hover:text-white'
              }`}
            >
              All ({total})
            </button>

            <button
              type="button"
              onClick={() => setFilter('healthy')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all border ${
                filter === 'healthy'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-[#0D1526] text-slate-400 border-[#1E293B] hover:text-emerald-400'
              }`}
            >
              <span className="text-emerald-400 font-bold">{healthyCount}</span> Healthy
            </button>

            <button
              type="button"
              onClick={() => setFilter('warning')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all border ${
                filter === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-[#0D1526] text-slate-400 border-[#1E293B] hover:text-amber-400'
              }`}
            >
              <span className="text-amber-400 font-bold">{warningCount}</span> Warn
            </button>

            <button
              type="button"
              onClick={() => setFilter('critical')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all border ${
                filter === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                  : 'bg-[#0D1526] text-slate-400 border-[#1E293B] hover:text-rose-400'
              }`}
            >
              <span className="text-rose-400 font-bold">{criticalCount}</span> Crit
            </button>
          </div>

          {/* 4. DYNAMIC HEATMAP MATRIX (1 cell = 1 actual server, moves down when content expands) */}
          <div className="bg-[#0D1526] p-3 rounded-xl border border-[#1E293B] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="font-semibold text-slate-300">
                Heatmap ({displayedServers.length} {displayedServers.length === 1 ? 'Node' : 'Nodes'}):
              </span>
              <span className="text-slate-500 text-[10px]">Click node for details</span>
            </div>

            {/* Responsive Heatmap Grid: Cells wrap naturally, no extra rows, no fake cells */}
            <div className="flex flex-wrap gap-2.5 items-center">
              {displayedServers.map((node) => {
                const isHovered = hoveredNode?.id === node.id;

                let cellColor = 'bg-emerald-500 border-emerald-400/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
                if (node.statusCategory === 'warning') {
                  cellColor = 'bg-amber-500 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
                } else if (node.statusCategory === 'critical') {
                  cellColor = 'bg-rose-500 border-rose-400/50 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse';
                } else if (node.statusCategory === 'unknown') {
                  cellColor = 'bg-slate-600 border-slate-500';
                }

                return (
                  <div
                    key={node.id}
                    onClick={() => router.push(node.detailUrl)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    title={`${node.name} (${node.provider.toUpperCase()})
Status: ${node.powerState}
Region: ${node.region}
IP: ${node.ip}
CPU: ${node.cpuPercent}%
RAM: ${node.memoryPercent}%
Disk: ${node.diskPercent}%
Updated: ${node.lastConnected}`}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border ${cellColor} flex flex-col items-center justify-center cursor-pointer transition-all duration-200 transform ${
                      isHovered ? 'scale-115 ring-2 ring-white z-20 shadow-xl' : 'hover:scale-105'
                    }`}
                  >
                    <span className="text-[10px] font-black text-white font-mono leading-none truncate max-w-[32px] px-0.5">
                      {node.name.slice(0, 3)}
                    </span>
                    <span className="text-[8px] font-bold text-black/70 leading-none uppercase mt-0.5">
                      {node.provider === 'aws' ? 'AWS' : 'AZ'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Interactive Telemetry Card on Hover */}
            {hoveredNode && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-[#111A2E] border border-blue-500/40 text-xs space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    {hoveredNode.provider === 'aws' ? (
                      <AwsLogo className="w-3.5 h-2.5 text-[#FF9900]" />
                    ) : (
                      <AzureLogo className="w-3 h-3 text-[#0089D6]" />
                    )}
                    <span className="truncate max-w-[140px]">{hoveredNode.name}</span>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      hoveredNode.statusCategory === 'healthy'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : hoveredNode.statusCategory === 'warning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {hoveredNode.powerState}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 font-mono">
                  <div>
                    <span className="text-slate-500">IP:</span> {hoveredNode.ip}
                  </div>
                  <div>
                    <span className="text-slate-500">Region:</span> {hoveredNode.region}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#1E293B] text-[10px] font-mono text-center">
                  <div className="p-1 rounded bg-[#0D1526]">
                    <span className="text-slate-500 block text-[9px]">CPU</span>
                    <strong className="text-white">{hoveredNode.cpuPercent}%</strong>
                  </div>
                  <div className="p-1 rounded bg-[#0D1526]">
                    <span className="text-slate-500 block text-[9px]">RAM</span>
                    <strong className="text-white">{hoveredNode.memoryPercent}%</strong>
                  </div>
                  <div className="p-1 rounded bg-[#0D1526]">
                    <span className="text-slate-500 block text-[9px]">Disk</span>
                    <strong className="text-white">{hoveredNode.diskPercent}%</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Collected: {hoveredNode.lastConnected}</span>
                  </span>
                  <Link
                    href={hoveredNode.detailUrl}
                    className="text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>View Server</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Bottom Alert Footer Strip */}
      {total > 0 && (
        <div className="pt-2.5 border-t border-[#1E293B]/70 flex items-center justify-between text-[10px]">
          {criticalCount > 0 ? (
            <div className="text-rose-400 flex items-center gap-1.5 font-semibold min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="truncate">
                {criticalCount} Stopped ({stoppedServers.map((s) => s.name).join(', ')})
              </span>
            </div>
          ) : (
            <div className="text-emerald-400 flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>All nodes operational</span>
            </div>
          )}

          <span className="text-slate-400 font-mono shrink-0 ml-2">
            {healthyCount}/{total} Online
          </span>
        </div>
      )}
    </div>
  );
}
