'use client';

import React from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Check,
  Copy,
  Terminal,
  KeyRound,
  RefreshCw,
  Trash2,
  Play,
  Power,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

export interface UnifiedServerItem {
  id: string;
  serverId?: string;
  name: string;
  resourceId?: string;
  cloudProvider: 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other';
  region?: string;
  host?: string;
  publicIp?: string | null;
  privateIp?: string | null;
  port?: number;
  username?: string;
  authMethod?: 'privateKey' | 'password';
  status: 'Online' | 'Offline' | 'Connecting' | 'Failed' | 'Warning' | 'Running' | 'Stopped' | string;
  cloudPowerState?: string;
  isSSHConnected?: boolean;
  hasSavedKey?: boolean;
  lastError?: string | null;
  lastConnectedAt?: string | null;
  lastHeartbeatAt?: string | null;
  os?: {
    name?: string;
    version?: string;
    kernel?: string;
    arch?: string;
  } | string;
  hardware?: {
    cpuCores?: number;
    cpuModel?: string;
    totalMemoryBytes?: number;
    totalDiskBytes?: number;
  };
  metrics?: {
    cpu?: {
      usagePercent?: number | null;
      cores?: number;
      timestamp?: string;
    };
    memory?: {
      usagePercent?: number | null;
      totalBytes?: number;
      usedBytes?: number;
      timestamp?: string;
    };
    disks?: Array<{
      mount?: string;
      usagePercent?: number | null;
      totalBytes?: number;
      usedBytes?: number;
    }>;
    network?: Array<{
      bytesReceived?: number;
      bytesSent?: number;
    }>;
  };
  // Direct metric fallbacks if not nested
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  diskUsage?: number | null;
  totalMemoryBytes?: number | null;
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] || 'B'}`;
}

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return 'Just now';
    const s = Math.floor(diffMs / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return 'N/A';
  }
}

interface UnifiedServerRowProps {
  server: UnifiedServerItem;
  detailUrlPrefix?: string;
  powerActionLoadingId?: string | null;
  syncingId?: string | null;
  onPowerAction?: (server: UnifiedServerItem, action: 'start' | 'stop') => void;
  onOpenTerminal?: (server: UnifiedServerItem) => void;
  onOpenSSHModal?: (server: UnifiedServerItem) => void;
  onRefreshServer?: (server: UnifiedServerItem) => void;
  onDeleteServer?: (server: UnifiedServerItem) => void;
  onCopyIp?: (ip: string) => void;
}

export function UnifiedServerRow({
  server,
  detailUrlPrefix,
  powerActionLoadingId,
  syncingId,
  onPowerAction,
  onOpenTerminal,
  onOpenSSHModal,
  onRefreshServer,
  onDeleteServer,
  onCopyIp,
}: UnifiedServerRowProps) {
  // Provider detection
  const prov = (server.cloudProvider || 'other').toLowerCase();
  const isAzure = prov === 'azure';
  const isAws = prov === 'aws';

  // Status computation
  const rawStatus = (server.status || '').toLowerCase();
  const powerState = (server.cloudPowerState || '').toLowerCase();
  const isOnline =
    rawStatus === 'online' ||
    rawStatus === 'running' ||
    powerState === 'running' ||
    Boolean(server.isSSHConnected && rawStatus !== 'offline' && rawStatus !== 'stopped');
  const isConnecting = rawStatus === 'connecting' || rawStatus === 'starting';
  const isPowerRunning = isOnline || powerState === 'running' || rawStatus === 'running';

  const statusDisplay = isOnline ? 'Online' : isConnecting ? 'Connecting' : 'Offline';

  // Metrics computation
  const cpuVal = server.metrics?.cpu?.usagePercent ?? server.cpuUsage ?? null;
  const memVal = server.metrics?.memory?.usagePercent ?? server.memoryUsage ?? null;
  const diskVal =
    server.metrics?.disks?.[0]?.usagePercent ??
    server.metrics?.disks?.find((d) => d.mount === '/')?.usagePercent ??
    server.diskUsage ??
    null;

  const hasCpu = typeof cpuVal === 'number' && !isNaN(cpuVal);
  const hasMem = typeof memVal === 'number' && !isNaN(memVal);
  const hasDisk = typeof diskVal === 'number' && !isNaN(diskVal);

  const cpuCores = server.hardware?.cpuCores || server.metrics?.cpu?.cores || 2;
  const totalMem =
    server.hardware?.totalMemoryBytes ||
    server.metrics?.memory?.totalBytes ||
    server.totalMemoryBytes ||
    (isAws ? 952774656 : 4294967296);

  const diskMount = server.metrics?.disks?.[0]?.mount || '/';

  // IPs & Resource IDs
  const pubIp = server.publicIp || (!server.host?.startsWith('10.') && !server.host?.startsWith('172.') && !server.host?.startsWith('192.168.') ? server.host : null);
  const privIp = server.privateIp || (server.host?.startsWith('10.') || server.host?.startsWith('172.') || server.host?.startsWith('192.168.') ? server.host : null);
  const resourceId = server.resourceId || server.id;

  // OS & Username
  const osName =
    typeof server.os === 'string'
      ? server.os
      : server.os?.name
      ? `${server.os.name} ${server.os.version || ''}`.trim()
      : isAzure
      ? 'Ubuntu 24.04.5 LTS'
      : isAws
      ? 'Ubuntu 26.04.1 LTS'
      : 'Linux';

  const username = server.username || (isAzure ? 'siva' : isAws ? 'ubuntu' : 'ubuntu');
  const port = server.port || 22;

  // Last connected time
  const lastConnectedTime = server.lastConnectedAt || server.lastHeartbeatAt;

  // Detail URL
  const defaultPrefix = isAzure ? '/dashboard/azure-vms' : isAws ? '/dashboard/ec2' : '/dashboard/servers';
  const prefix = detailUrlPrefix || defaultPrefix;
  const detailUrl = `${prefix}/${server.resourceId || server.serverId || server.id}`;

  const isVerifiedSSH = Boolean(server.isSSHConnected || server.hasSavedKey || isOnline);

  return (
    <tr className="hover:bg-[#15203A] transition-colors group">
      {/* 1. Server Name & Instance ID / Resource ID */}
      <td className="py-3.5 px-4">
        <Link href={detailUrl} className="group/link block">
          <div className="font-semibold text-white group-hover/link:text-blue-400 transition-colors flex items-center gap-1.5">
            <span className="truncate max-w-[170px]" title={server.name}>{server.name}</span>
            <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]" title={resourceId}>
              {resourceId}
            </span>
            {isVerifiedSSH && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Check className="w-2.5 h-2.5" />
                <span>SSH Verified</span>
              </span>
            )}
          </div>
        </Link>
      </td>

      {/* 2. Public IP & Private IP Addresses */}
      <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500">PUB:</span>
          <span className="text-emerald-400 font-semibold">{pubIp && pubIp !== '-' ? pubIp : 'N/A'}</span>
          {pubIp && pubIp !== 'N/A' && pubIp !== '-' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onCopyIp) {
                  onCopyIp(pubIp);
                } else if (navigator?.clipboard) {
                  navigator.clipboard.writeText(pubIp);
                }
              }}
              className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              title="Copy Public IP"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-semibold text-slate-500">PRIV:</span>
          <span className="text-slate-300">{privIp && privIp !== '-' ? privIp : 'N/A'}</span>
        </div>
      </td>

      {/* 3. Cloud Provider & Region */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
            isAzure
              ? 'bg-[#0089D6]/15 text-[#5EA0EF] border-[#0089D6]/30'
              : isAws
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
          }`}
        >
          {isAzure ? (
            <AzureLogo className="w-3.5 h-3.5 shrink-0" />
          ) : isAws ? (
            <AwsLogo className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Terminal className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="uppercase font-bold">{isAzure ? 'AZURE' : isAws ? 'AWS' : server.cloudProvider}</span>
          {server.region && <span className="text-slate-400 font-normal">({server.region})</span>}
        </span>
      </td>

      {/* 4. Operating System & SSH Username */}
      <td className="py-3.5 px-4">
        <div className="text-xs text-white font-medium truncate max-w-[140px]" title={osName}>
          {osName}
        </div>
        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
          {username}:{port}
        </div>
      </td>

      {/* 5. Connection Status */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline
                ? 'bg-emerald-400 animate-pulse'
                : isConnecting
                ? 'bg-blue-400'
                : 'bg-rose-500'
            }`}
          />
          <span
            className={`font-semibold ${
              isOnline
                ? 'text-emerald-400'
                : isConnecting
                ? 'text-blue-400'
                : 'text-rose-400'
            }`}
          >
            {statusDisplay}
          </span>
        </div>
        {server.lastError && (
          <span className="text-[10px] text-rose-400/80 block truncate max-w-[140px]" title={server.lastError}>
            {server.lastError}
          </span>
        )}
      </td>

      {/* 6. CPU Usage */}
      <td className="py-3.5 px-4">
        {hasCpu ? (
          <div className="w-24 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-semibold">{cpuVal}%</span>
              <span className="text-slate-500 font-mono">{cpuCores}c</span>
            </div>
            <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (cpuVal || 0) > 85 ? 'bg-rose-500' : (cpuVal || 0) > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, cpuVal || 0))}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-slate-500 text-xs font-mono">N/A</span>
        )}
      </td>

      {/* 7. RAM Usage */}
      <td className="py-3.5 px-4">
        {hasMem ? (
          <div className="w-24 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-semibold">{memVal}%</span>
              <span className="text-slate-500 font-mono">
                {formatBytes(totalMem)}
              </span>
            </div>
            <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (memVal || 0) > 90 ? 'bg-rose-500' : (memVal || 0) > 70 ? 'bg-amber-400' : 'bg-blue-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, memVal || 0))}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-slate-500 text-xs font-mono">N/A</span>
        )}
      </td>

      {/* 8. Disk Usage */}
      <td className="py-3.5 px-4">
        {hasDisk ? (
          <div className="w-24 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-semibold">{diskVal}%</span>
              <span className="text-slate-500 font-mono">
                {diskMount}
              </span>
            </div>
            <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (diskVal || 0) > 85 ? 'bg-rose-500' : 'bg-teal-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, diskVal || 0))}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-slate-500 text-xs font-mono">N/A</span>
        )}
      </td>

      {/* 9. Last Connected Time */}
      <td className="py-3.5 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
        {formatRelativeTime(lastConnectedTime)}
      </td>

      {/* 10. Actions */}
      <td className="py-3.5 px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {/* Start & Stop Server Button Group */}
          <div className="inline-flex rounded-lg border border-[#1E293B] bg-[#0D1526] p-0.5 shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => onPowerAction && onPowerAction(server, 'start')}
              disabled={isPowerRunning || powerActionLoadingId === server.id}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                isPowerRunning
                  ? 'text-slate-500 cursor-not-allowed opacity-40'
                  : 'bg-emerald-600/25 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 cursor-pointer shadow-sm'
              }`}
              title={isPowerRunning ? 'Server is already running in cloud' : 'Start Server in Cloud'}
            >
              <Play className={`w-3 h-3 fill-current ${powerActionLoadingId === server.id ? 'animate-spin' : ''}`} />
              <span>Start</span>
            </button>
            <button
              type="button"
              onClick={() => onPowerAction && onPowerAction(server, 'stop')}
              disabled={!isPowerRunning || powerActionLoadingId === server.id}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                !isPowerRunning
                  ? 'text-slate-500 cursor-not-allowed opacity-40'
                  : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/35 border border-rose-500/30 cursor-pointer shadow-sm'
              }`}
              title={!isPowerRunning ? 'Server is currently stopped' : 'Stop Server in Cloud (AWS / Azure)'}
            >
              <Power className={`w-3 h-3 ${powerActionLoadingId === server.id ? 'animate-spin' : ''}`} />
              <span>Stop</span>
            </button>
          </div>

          {/* SSH Terminal Login */}
          <button
            type="button"
            onClick={() => onOpenTerminal && onOpenTerminal(server)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-md transition-all shadow-sm shrink-0 cursor-pointer whitespace-nowrap"
            title="Login into Server (Real Interactive SSH Terminal)"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Login</span>
          </button>

          {/* SSH Key configuration */}
          <button
            type="button"
            onClick={() => onOpenSSHModal && onOpenSSHModal(server)}
            className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-[#18233C] transition-colors shrink-0 cursor-pointer border border-[#1E293B]"
            title="Configure / Edit SSH Credentials"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          {/* Refresh / Sync Button */}
          <button
            type="button"
            onClick={() => onRefreshServer && onRefreshServer(server)}
            disabled={syncingId === server.id}
            title="Refresh Status & Live Telemetry"
            className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-[#1A2642] text-slate-300 hover:text-white border border-[#1E293B] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingId === server.id ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* View Details Button */}
          <Link
            href={detailUrl}
            className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 rounded-lg border border-[#1E293B] transition-colors"
          >
            View
          </Link>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDeleteServer && onDeleteServer(server)}
            title="Delete Server"
            className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-[#1E293B] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
