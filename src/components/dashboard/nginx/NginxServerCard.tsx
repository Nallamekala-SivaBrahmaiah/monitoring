'use client';

import React, { useState } from 'react';
import {
  Server,
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Layers,
  FileText,
  Shield,
  Rocket,
  Globe,
  GitBranch,
  Folder,
  Package,
} from 'lucide-react';
import { AwsLogo, AzureLogo, NginxLogo } from '@/components/icons/CloudIcons';
import { INginxServerData } from '@/models/NginxServer';
import { ReverseProxySite, GitRepoInfo, DiscoveredApp } from '@/lib/nginx/nginxEngine';
import { NginxServiceTab } from './NginxServiceTab';
import { NginxLogsTab } from './NginxLogsTab';
import { NginxPM2Tab } from './NginxPM2Tab';
import { NginxReverseProxyTab } from './NginxReverseProxyTab';
import { NginxDeployTab } from './NginxDeployTab';
import { NginxSSHTerminalTab } from './NginxSSHTerminalTab';
import { NginxFileBrowserTab } from './NginxFileBrowserTab';
import { NginxGitTab } from './NginxGitTab';
import { NginxApplicationsTab } from './NginxApplicationsTab';

interface NginxServerCardProps {
  server: INginxServerData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenTerminal: (server: INginxServerData) => void;
  onTestSSH: (server: INginxServerData) => void;
  onRefreshMetrics: (server: INginxServerData) => void;
  onExecuteNginxAction: (server: INginxServerData, action: 'install' | 'start' | 'stop' | 'restart' | 'reload' | 'test') => void;
  onCreateNewProxy: (server: INginxServerData) => void;
  onDeleteProxySite: (server: INginxServerData, fileName: string) => void;
  serverDetails?: any;
  proxySites?: ReverseProxySite[];
  isTestingSSH?: boolean;
  isRefreshing?: boolean;
  isActionLoading?: boolean;
  lastActionResult?: { success: boolean; output: string } | null;
}

type ServerInnerTab =
  | 'service'
  | 'files'
  | 'git'
  | 'apps'
  | 'terminal'
  | 'access-logs'
  | 'error-logs'
  | 'pm2'
  | 'proxy'
  | 'deploy';

export function NginxServerCard({
  server,
  isExpanded,
  onToggleExpand,
  onOpenTerminal,
  onTestSSH,
  onRefreshMetrics,
  onExecuteNginxAction,
  onCreateNewProxy,
  onDeleteProxySite,
  serverDetails,
  proxySites = [],
  isTestingSSH,
  isRefreshing,
  isActionLoading,
  lastActionResult,
}: NginxServerCardProps) {
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<ServerInnerTab>('service');

  // Lazy-loaded data for this server
  const [gitRepos, setGitRepos] = useState<GitRepoInfo[]>([]);
  const [apps, setApps] = useState<DiscoveredApp[]>([]);
  const [loadingGit, setLoadingGit] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(type);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const fetchGitRepos = async () => {
    if (!server._id) return;
    setLoadingGit(true);
    try {
      const res = await fetch(`/api/nginx/servers/${server._id}/git`);
      const data = await res.json();
      if (res.ok && data.repos) setGitRepos(data.repos);
    } catch {}
    finally { setLoadingGit(false); }
  };

  const fetchApps = async () => {
    if (!server._id) return;
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/nginx/servers/${server._id}/apps`);
      const data = await res.json();
      if (res.ok && data.apps) setApps(data.apps);
    } catch {}
    finally { setLoadingApps(false); }
  };

  const handleTabChange = (tab: ServerInnerTab) => {
    setInnerTab(tab);
    if (tab === 'git' && gitRepos.length === 0) {
      fetchGitRepos();
    }
    if (tab === 'apps' && apps.length === 0) {
      fetchApps();
    }
  };

  // Metrics extraction
  const cpuPercent = server.metrics?.cpuPercent ?? serverDetails?.metrics?.cpuPercent;
  const memoryPercent = server.metrics?.memoryPercent ?? serverDetails?.metrics?.memoryPercent;
  const diskPercent = server.metrics?.diskPercent ?? serverDetails?.metrics?.diskPercent;
  const networkRx = server.metrics?.networkRx;
  const networkTx = server.metrics?.networkTx;
  const uptime = server.metrics?.uptime || serverDetails?.metrics?.uptime || 'N/A';

  const hasCpu = typeof cpuPercent === 'number' && !isNaN(cpuPercent);
  const hasMem = typeof memoryPercent === 'number' && !isNaN(memoryPercent);
  const hasDisk = typeof diskPercent === 'number' && !isNaN(diskPercent);

  // Statuses
  const isOnline = server.connectionStatus === 'Online';
  const nginxStatus = serverDetails?.nginxStatus || server.nginxStatus || 'UNKNOWN';
  const isNginxRunning = nginxStatus === 'RUNNING';
  const isNginxStopped = nginxStatus === 'STOPPED';
  const isNginxNotInstalled = nginxStatus === 'NOT_INSTALLED' || (!server.nginxInstalled && !serverDetails?.nginxInstalled);

  const pm2Count = serverDetails?.pm2Count ?? server.pm2Count ?? 0;
  const pm2Running = serverDetails?.pm2RunningCount ?? server.pm2RunningCount ?? 0;
  const isPm2Installed = serverDetails?.pm2Installed ?? server.pm2Installed ?? false;

  // Color helper for progress bar
  const getProgressBarColor = (val: number) => {
    if (val > 85) return 'bg-rose-500 shadow-rose-500/50';
    if (val > 70) return 'bg-amber-400 shadow-amber-400/50';
    return 'bg-emerald-400 shadow-emerald-400/50';
  };

  const getTextColor = (val: number) => {
    if (val > 85) return 'text-rose-400 font-bold';
    if (val > 70) return 'text-amber-400 font-bold';
    return 'text-emerald-400 font-bold';
  };

  return (
    <div
      className={`bg-[#111A2E] border rounded-2xl transition-all duration-300 shadow-xl overflow-hidden ${
        isExpanded
          ? 'border-blue-500/60 ring-1 ring-blue-500/30 shadow-blue-950/20'
          : 'border-[#1E293B] hover:border-slate-700/80'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. MAIN SERVER CARD HEADER & ESSENTIAL DETAILS */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Server Identity & Badges */}
          <div className="flex items-start sm:items-center gap-3.5">
            {/* Cloud Provider Logo Badge */}
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
                server.cloudProvider === 'azure'
                  ? 'bg-[#0089D6]/15 border-[#0089D6]/30 text-[#5EA0EF]'
                  : server.cloudProvider === 'aws'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
              }`}
            >
              {server.cloudProvider === 'azure' ? (
                <AzureLogo className="w-6 h-6" />
              ) : server.cloudProvider === 'aws' ? (
                <AwsLogo className="w-6 h-6 text-amber-400" />
              ) : (
                <Server className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">{server.name}</h3>

                {/* Connection Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isOnline
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                      : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </span>

                {/* Nginx Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isNginxRunning
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : isNginxStopped
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                  }`}
                >
                  <NginxLogo className="w-3.5 h-3.5" />
                  <span>
                    {isNginxRunning
                      ? 'Nginx Running'
                      : isNginxStopped
                      ? 'Nginx Stopped'
                      : isNginxNotInstalled
                      ? 'Nginx Not Installed'
                      : 'Nginx Unknown'}
                  </span>
                </span>

                {/* PM2 Applications Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  <span>
                    {isPm2Installed
                      ? `${pm2Running}/${pm2Count} PM2 Apps Active`
                      : 'PM2 Not Installed'}
                  </span>
                </span>
              </div>

              {/* Server Metadata Tags */}
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
                <span className="font-semibold text-slate-300 uppercase tracking-wide">
                  {server.cloudProvider}
                </span>
                <span>•</span>
                <span>{server.region || 'Region: N/A'}</span>
                <span>•</span>
                <span className="font-mono text-slate-300">{server.osName || 'Linux'}</span>
                <span>•</span>
                <span className="font-mono text-slate-400">User: {server.username}:{server.port || 22}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* PuTTY / SSH Terminal */}
            <button
              type="button"
              onClick={() => onOpenTerminal(server)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              title="Open Interactive Web / PuTTY SSH Terminal"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>SSH Terminal</span>
            </button>

            {/* Test SSH */}
            <button
              type="button"
              onClick={() => onTestSSH(server)}
              disabled={isTestingSSH}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition-all cursor-pointer"
              title="Test SSH Connectivity & Handshake"
            >
              <Activity className={`w-3.5 h-3.5 text-emerald-400 ${isTestingSSH ? 'animate-spin' : ''}`} />
              <span>Test SSH</span>
            </button>

            {/* Refresh Metrics */}
            <button
              type="button"
              onClick={() => onRefreshMetrics(server)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition-all cursor-pointer"
              title="Refresh live telemetry & Nginx status via SSH"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Expand / Manage Details Button */}
            <button
              type="button"
              onClick={onToggleExpand}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                isExpanded
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border-[#1E293B]'
              }`}
            >
              <span>{isExpanded ? 'Hide Details' : 'Manage Server'}</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-blue-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* IP Addresses Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-[#0B1120] border border-[#1E293B] rounded-xl p-3 text-xs font-mono">
          {/* Public IP */}
          <div className="flex items-center justify-between px-2">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Public IP</span>
              <div className="text-emerald-400 font-semibold">{server.host || 'N/A'}</div>
            </div>
            {server.host && (
              <button
                type="button"
                onClick={() => copyToClipboard(server.host, 'pub')}
                className="p-1 rounded text-slate-500 hover:text-white transition-colors cursor-pointer"
                title="Copy Public IP"
              >
                {copiedIp === 'pub' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Private IP */}
          <div className="flex items-center justify-between px-2 border-t sm:border-t-0 sm:border-l border-[#1E293B] pt-2 sm:pt-0">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Private IP</span>
              <div className="text-slate-300">{server.privateIp || 'N/A'}</div>
            </div>
            {server.privateIp && (
              <button
                type="button"
                onClick={() => copyToClipboard(server.privateIp!, 'priv')}
                className="p-1 rounded text-slate-500 hover:text-white transition-colors cursor-pointer"
                title="Copy Private IP"
              >
                {copiedIp === 'priv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Cloud Instance ID */}
          <div className="px-2 border-t md:border-t-0 md:border-l border-[#1E293B] pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Instance / Resource ID</span>
            <div className="text-slate-300 truncate" title={server.instanceId || server._id}>
              {server.instanceId || server._id}
            </div>
          </div>

          {/* Nginx Version & Ports */}
          <div className="px-2 border-t md:border-t-0 md:border-l border-[#1E293B] pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Nginx Web Server</span>
            <div className="text-slate-300 truncate">
              {server.nginxVersion ? `v${server.nginxVersion}` : 'Not Detected'}{' '}
              {server.nginxPorts && server.nginxPorts.length > 0 && (
                <span className="text-emerald-400">({server.nginxPorts.join(', ')})</span>
              )}
            </div>
          </div>

          {/* Server Uptime */}
          <div className="px-2 border-t md:border-t-0 md:border-l border-[#1E293B] pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Server Uptime</span>
            <div className="text-emerald-400 font-semibold truncate font-mono">
              {uptime}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. RESOURCE UTILIZATION BARS (CPU, RAM, DISK, NETWORK) */}
        {/* ========================================================================= */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-0.5">
            <div className="flex items-center gap-1.5 text-white">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Resource Utilization</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-normal">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Normal (&lt;70%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Warning (70-85%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical (&gt;85%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {/* CPU Usage Bar */}
            <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-3.5 space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>CPU Usage</span>
                </span>
                <span className={`font-mono text-xs ${hasCpu ? getTextColor(cpuPercent!) : 'text-slate-500'}`}>
                  {hasCpu ? `${cpuPercent}%` : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-[#1E293B] rounded-full h-2.5 overflow-hidden">
                {hasCpu ? (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(cpuPercent!)}`}
                    style={{ width: `${Math.min(100, Math.max(0, cpuPercent!))}%` }}
                  />
                ) : (
                  <div className="h-full bg-slate-700/50 w-full" />
                )}
              </div>
            </div>

            {/* RAM Usage Bar */}
            <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-3.5 space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>RAM Usage</span>
                </span>
                <span className={`font-mono text-xs ${hasMem ? getTextColor(memoryPercent!) : 'text-slate-500'}`}>
                  {server.metrics?.memoryUsedGb && server.metrics?.memoryTotalGb
                    ? `${server.metrics.memoryUsedGb} / ${server.metrics.memoryTotalGb} GB (${memoryPercent}%)`
                    : hasMem
                    ? `${memoryPercent}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-[#1E293B] rounded-full h-2.5 overflow-hidden">
                {hasMem ? (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(memoryPercent!)}`}
                    style={{ width: `${Math.min(100, Math.max(0, memoryPercent!))}%` }}
                  />
                ) : (
                  <div className="h-full bg-slate-700/50 w-full" />
                )}
              </div>
            </div>

            {/* Disk Usage Bar */}
            <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-3.5 space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Disk Usage</span>
                </span>
                <span className={`font-mono text-xs ${hasDisk ? getTextColor(diskPercent!) : 'text-slate-500'}`}>
                  {server.metrics?.diskUsedGb && server.metrics?.diskTotalGb
                    ? `${server.metrics.diskUsedGb} / ${server.metrics.diskTotalGb} GB (${diskPercent}%)`
                    : hasDisk
                    ? `${diskPercent}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-[#1E293B] rounded-full h-2.5 overflow-hidden">
                {hasDisk ? (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(diskPercent!)}`}
                    style={{ width: `${Math.min(100, Math.max(0, diskPercent!))}%` }}
                  />
                ) : (
                  <div className="h-full bg-slate-700/50 w-full" />
                )}
              </div>
            </div>

            {/* Network Upload / Download */}
            <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-3.5 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Wifi className="w-3.5 h-3.5 text-sky-400" />
                  <span>Network Telemetry</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Live</span>
              </div>
              <div className="text-xs font-mono flex items-center justify-between pt-0.5 text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="text-emerald-400 font-bold">↓</span> {networkRx || 'N/A'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-blue-400 font-bold">↑</span> {networkTx || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. EXPANDED SERVER-WISE WORKSPACE (NGINX, PM2, LOGS, PROXY, DEPLOY) */}
      {/* ========================================================================= */}
      {isExpanded && (
        <div className="border-t border-[#1E293B] bg-[#0E1528] p-5 sm:p-6 space-y-6 animate-fade-in">
          {/* Inner Navigation Tabs */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleTabChange('service')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'service'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <NginxLogo className="w-3.5 h-3.5" />
                <span>Nginx Service</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('files')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'files'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>File Explorer</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('git')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'git'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                <span>Git Repos ({gitRepos.length > 0 ? gitRepos.length : 'Scan'})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('apps')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'apps'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-sky-400" />
                <span>Applications ({apps.length > 0 ? apps.length : 'Scan'})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('access-logs')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'access-logs'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Access Logs</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('error-logs')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'error-logs'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Error Logs</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('pm2')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'pm2'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>PM2 &amp; Node Apps ({pm2Count})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('proxy')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'proxy'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Reverse Proxy ({proxySites.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('deploy')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'deploy'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <Rocket className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deploy App</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('terminal')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  innerTab === 'terminal'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>SSH Terminal</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Managing: <strong className="text-white">{server.name}</strong> ({server.host})
            </div>
          </div>

          {/* Tab Content Panes - Strictly for THIS Server */}
          <div className="space-y-4">
            {innerTab === 'service' && (
              <NginxServiceTab
                activeServer={server}
                serverDetails={serverDetails}
                sites={proxySites}
                onExecuteNginxAction={(act) => onExecuteNginxAction(server, act)}
                onRefresh={() => onRefreshMetrics(server)}
                onRefreshSites={() => onRefreshMetrics(server)}
                onCreateNewProxy={() => onCreateNewProxy(server)}
                onDeleteSite={(fileName) => onDeleteProxySite(server, fileName)}
                isActionLoading={isActionLoading}
                lastActionResult={lastActionResult}
              />
            )}

            {innerTab === 'files' && (
              <NginxFileBrowserTab activeServer={server} />
            )}

            {innerTab === 'git' && (
              <NginxGitTab
                activeServer={server}
                repos={gitRepos}
                onRefresh={fetchGitRepos}
                loading={loadingGit}
              />
            )}

            {innerTab === 'apps' && (
              <NginxApplicationsTab
                activeServer={server}
                apps={apps}
                onRefresh={fetchApps}
                onDeployNew={() => setInnerTab('deploy')}
                loading={loadingApps}
              />
            )}

            {innerTab === 'access-logs' && (
              <NginxLogsTab activeServer={server} logType="access" />
            )}

            {innerTab === 'error-logs' && (
              <NginxLogsTab activeServer={server} logType="error" />
            )}

            {innerTab === 'pm2' && (
              <NginxPM2Tab activeServer={server} />
            )}

            {innerTab === 'proxy' && (
              <NginxReverseProxyTab
                activeServer={server}
                sites={proxySites}
                onRefresh={() => onRefreshMetrics(server)}
                onCreateNew={() => onCreateNewProxy(server)}
                onDeleteSite={(fileName) => onDeleteProxySite(server, fileName)}
              />
            )}

            {innerTab === 'deploy' && (
              <NginxDeployTab
                servers={[server]}
                activeServer={server}
                onSelectServer={() => {}}
                onDeploymentSuccess={() => onRefreshMetrics(server)}
              />
            )}

            {innerTab === 'terminal' && (
              <NginxSSHTerminalTab activeServer={server} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
