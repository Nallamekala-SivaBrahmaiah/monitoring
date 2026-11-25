'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  BarChart3,
  Boxes,
  Radio,
  ArrowUpRight,
  X,
  Layers,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import {
  ResourceOverviewChart,
  ServerDetailItem,
} from '@/components/dashboard/ResourceOverviewChart';
import { useMonitoring } from '@/context/MonitoringContext';
import { ModuleCustomizeButton } from '@/components/dashboard/style-studio/ModuleCustomizeButton';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

export default function MetricsPage() {
  const {
    cloudProvider,
    customServers,
    filteredAzureVMs,
    filteredEC2Instances,
    triggerRefresh,
    isRefreshing,
  } = useMonitoring();

  // Active selected server for chart & telemetry inspection
  const [selectedServer, setSelectedServer] = useState<string | null>('vm01siva-mon');
  const [fleetServers, setFleetServers] = useState<ServerDetailItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'azure' | 'aws' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Handle IP copy
  const handleCopyIp = (ip: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  // Compile full server list directly from context as fallback & instant render
  const compiledServers: ServerDetailItem[] = useMemo(() => {
    if (fleetServers.length > 0) return fleetServers;

    const list: ServerDetailItem[] = [];
    const seenNames = new Set<string>();

    for (const s of customServers) {
      const name = s.name || 'Server';
      seenNames.add(name.toLowerCase());
      list.push({
        id: s._id || name,
        name,
        host: s.host || (s as any).publicIp || '',
        publicIp: (s as any).publicIp || s.host || '',
        privateIp: (s as any).privateIp || '',
        provider: s.cloudProvider || 'azure',
        status: s.status || 'Online',
        region: s.region,
        cpuPercent: typeof s.metrics?.cpu?.usagePercent === 'number' ? s.metrics.cpu.usagePercent : 4.5,
        memoryPercent: typeof s.metrics?.memory?.usagePercent === 'number' ? s.metrics.memory.usagePercent : 15,
        memoryDetails: { usedGB: 1.2, totalGB: 7.7 },
        diskPercent: 32,
        diskDetails: { usedGB: 9.0, totalGB: 29.0 },
        networkPercent: s.metrics?.network?.usagePercent ?? 11,
        dockerCount: s.docker?.containers?.length || 0,
      });
    }

    for (const vm of filteredAzureVMs) {
      const name = vm.name;
      if (seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());
      list.push({
        id: vm.id || vm.vmId,
        name,
        host: vm.publicIp || vm.privateIp || '',
        publicIp: vm.publicIp || '',
        privateIp: vm.privateIp || '',
        provider: 'azure',
        status: vm.powerState || 'Running',
        region: vm.region,
        cpuPercent: typeof vm.cpuUsage === 'number' ? vm.cpuUsage : 4.5,
        memoryPercent: typeof vm.memoryUsage === 'number' ? vm.memoryUsage : 15,
        memoryDetails: { usedGB: 1.2, totalGB: 7.7 },
        diskPercent: typeof vm.diskUsage === 'number' ? vm.diskUsage : 32,
        diskDetails: { usedGB: 9.0, totalGB: 29.0 },
        networkPercent: 11,
        dockerCount: 0,
      });
    }

    for (const ec2 of filteredEC2Instances) {
      const name = ec2.name || ec2.instanceId;
      if (seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());
      const isRunning = (ec2.status || '').toLowerCase().includes('run');
      list.push({
        id: ec2.id || ec2.instanceId,
        name,
        host: ec2.publicIp || ec2.privateIp || '',
        publicIp: ec2.publicIp || '',
        privateIp: ec2.privateIp || '',
        provider: 'aws',
        status: ec2.status || 'Stopped',
        region: ec2.region,
        cpuPercent: isRunning ? (typeof ec2.cpuUsage === 'number' ? ec2.cpuUsage : 1.5) : 0,
        memoryPercent: isRunning ? (typeof ec2.memoryUsage === 'number' ? ec2.memoryUsage : 20) : 0,
        memoryDetails: { usedGB: isRunning ? 0.2 : 0, totalGB: 1.0 },
        diskPercent: typeof ec2.diskUsage === 'number' ? ec2.diskUsage : 15,
        diskDetails: { usedGB: 4.5, totalGB: 30.0 },
        networkPercent: 5,
        dockerCount: 0,
      });
    }

    return list;
  }, [fleetServers, customServers, filteredAzureVMs, filteredEC2Instances]);

  // Filtered servers by search and cloud tab
  const displayServers = useMemo(() => {
    return compiledServers.filter((s) => {
      // Cloud provider filter
      if (filterType === 'azure' && s.provider.toLowerCase() !== 'azure') return false;
      if (filterType === 'aws' && s.provider.toLowerCase() !== 'aws') return false;

      const isOnline =
        (s.status || '').toLowerCase().includes('run') ||
        (s.status || '').toLowerCase().includes('online');
      if (filterType === 'online' && !isOnline) return false;
      if (filterType === 'offline' && isOnline) return false;

      // Text query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.host && s.host.toLowerCase().includes(q)) ||
        (s.publicIp && s.publicIp.toLowerCase().includes(q)) ||
        (s.privateIp && s.privateIp.toLowerCase().includes(q)) ||
        (s.region && s.region.toLowerCase().includes(q)) ||
        s.provider.toLowerCase().includes(q)
      );
    });
  }, [compiledServers, filterType, searchQuery]);

  // Counts
  const azureCount = useMemo(() => compiledServers.filter((s) => s.provider.toLowerCase() === 'azure').length, [compiledServers]);
  const awsCount = useMemo(() => compiledServers.filter((s) => s.provider.toLowerCase() === 'aws').length, [compiledServers]);
  const onlineCount = useMemo(
    () =>
      compiledServers.filter(
        (s) =>
          (s.status || '').toLowerCase().includes('run') ||
          (s.status || '').toLowerCase().includes('online')
      ).length,
    [compiledServers]
  );
  const offlineCount = compiledServers.length - onlineCount;

  // Selected server item
  const activeServer = useMemo(
    () => compiledServers.find((s) => s.name === selectedServer || s.id === selectedServer) || null,
    [compiledServers, selectedServer]
  );

  // Click server action
  const handleSelectServer = (serverName: string) => {
    setSelectedServer(serverName);
    const targetEl = document.getElementById('metrics-chart-section');
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-6">
          {/* Master Control Bar Box (Terraform Style) */}
          <div className="bg-[#090F1E]/90 border border-teal-500/30 rounded-2xl p-5 shadow-2xl shadow-teal-950/30 backdrop-blur-md">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                  <Link href="/" className="hover:text-blue-400 flex items-center gap-1 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Link>
                  <span>/</span>
                  <span className="text-white font-medium">Metrics Explorer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-blue-500/20 border border-teal-500/40 flex items-center justify-center shadow-lg shadow-teal-950/40 shrink-0">
                    <Activity className="w-7 h-7 text-teal-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                        {cloudProvider === 'aws'
                          ? 'AWS CloudWatch Metrics Explorer'
                          : cloudProvider === 'azure'
                          ? 'Azure Monitor Telemetry Explorer'
                          : 'Cross-Cloud Metrics Explorer'}
                      </h1>
                      {activeServer && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-1.5 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>{activeServer.name}</span>
                        </span>
                      )}
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                        Real-Time Telemetry
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time multi-cloud telemetry, CPU, memory, and disk observability across all infrastructure servers
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => triggerRefresh()}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0D1526] hover:bg-gray-800 text-slate-200 border border-gray-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  title="Sync Live Metrics"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-teal-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Sync Metrics</span>
                </button>

                <ModuleCustomizeButton
                  moduleId="metrics-explorer"
                  moduleName="Metrics Explorer"
                  variant="pill"
                />
              </div>
            </div>
          </div>

          {/* ================= 1. RESOURCE OVERVIEW METRICS CHART ================= */}
          <div id="metrics-chart-section" className="w-full">
            <ResourceOverviewChart
              initialMetric="CPU"
              selectedServerName={selectedServer}
              onServerSelect={(srv) => setSelectedServer(srv)}
              onServersLoaded={(servers) => setFleetServers(servers)}
            />
          </div>

          {/* ================= 2. ALL INFRASTRUCTURE SERVERS FLEET ================= */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/20 space-y-5">
            {/* Fleet Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <span>Infrastructure Servers Fleet &amp; Node Directory</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {compiledServers.length} Total
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Click any server below to display its live CPU, RAM, Disk telemetry and real-time chart above.
                </p>
              </div>

              {/* Active Selection Status Pill */}
              <div className="flex items-center gap-2 self-start lg:self-auto">
                <span className="text-xs text-slate-400 font-medium">Currently Selected:</span>
                {selectedServer === 'all' || !selectedServer ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-blue-400" />
                    <span>All Servers (Fleet Overview)</span>
                  </span>
                ) : activeServer ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.25)] flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>{activeServer.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase bg-cyan-950 text-cyan-400">
                      {activeServer.provider}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Filter Toolbar & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Tab Filters (Glowing Cyan Style) */}
              <div className="flex items-center gap-1 border-b border-[#1E293B] overflow-x-auto pb-0.5 select-none text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    filterType === 'all'
                      ? 'border-cyan-400 text-white bg-[#0B1120] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#18233C]/50 font-medium'
                  }`}
                >
                  <Server className={`w-3.5 h-3.5 ${filterType === 'all' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                  <span>All Servers</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterType === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {compiledServers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('azure')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    filterType === 'azure'
                      ? 'border-cyan-400 text-white bg-[#0B1120] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#18233C]/50 font-medium'
                  }`}
                >
                  <AzureLogo className="w-3.5 h-3.5" />
                  <span>Azure VMs</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterType === 'azure' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {azureCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('aws')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    filterType === 'aws'
                      ? 'border-cyan-400 text-white bg-[#0B1120] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#18233C]/50 font-medium'
                  }`}
                >
                  <AwsLogo className="w-3.5 h-3.5" />
                  <span>AWS EC2</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterType === 'aws' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {awsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('online')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    filterType === 'online'
                      ? 'border-cyan-400 text-white bg-[#0B1120] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#18233C]/50 font-medium'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online ({onlineCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('offline')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    filterType === 'offline'
                      ? 'border-cyan-400 text-white bg-[#0B1120] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#18233C]/50 font-medium'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Offline ({offlineCount})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search servers by name, IP, region..."
                  className="w-full pl-9 pr-8 py-2 bg-[#0B1120] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Fleet Overview Switcher Card */}
            <div
              onClick={() => {
                setSelectedServer('all');
                const targetEl = document.getElementById('metrics-chart-section');
                if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                selectedServer === 'all'
                  ? 'bg-gradient-to-r from-blue-950/60 via-[#111A2E] to-blue-900/30 border-blue-500/70 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                  : 'bg-[#0E1628] hover:bg-[#131D33] border-[#1E293B] hover:border-blue-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Fleet Aggregate Overview (All {compiledServers.length} Servers)</span>
                    {selectedServer === 'all' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                        Active in Chart Above
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Switch top chart to full cluster aggregate radial gauges (CPU, Memory, Disk, Network)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>{selectedServer === 'all' ? 'Currently Displaying' : 'Display Fleet Overview'}</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Server Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayServers.map((s) => {
                const isSelected = selectedServer === s.name || selectedServer === s.id;
                const isAws = s.provider.toLowerCase() === 'aws';
                const isOnline =
                  (s.status || '').toLowerCase().includes('run') ||
                  (s.status || '').toLowerCase().includes('online');
                const ip = s.publicIp || s.host || s.privateIp;

                return (
                  <div
                    key={s.id || s.name}
                    onClick={() => handleSelectServer(s.name)}
                    className={`rounded-2xl p-4 sm:p-5 transition-all cursor-pointer relative flex flex-col justify-between gap-4 group ${
                      isSelected
                        ? 'bg-[#111A2E] border-2 border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.22)] ring-1 ring-cyan-400/40'
                        : 'bg-[#0E1628] hover:bg-[#131D33] border border-[#1E293B] hover:border-cyan-500/50 shadow-sm'
                    }`}
                  >
                    {/* Header Row: Provider, Name, Status, Region */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                            isAws
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-[#0089D6]/10 border-[#0089D6]/30 text-[#0089D6]'
                          }`}
                        >
                          {isAws ? (
                            <AwsLogo className="w-5 h-5 text-[#FF9900]" />
                          ) : (
                            <AzureLogo className="w-5 h-5 text-[#0089D6]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate flex items-center gap-2">
                            <span>{s.name}</span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            )}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="uppercase font-semibold tracking-wider text-slate-300">
                              {isAws ? 'AWS EC2' : 'Azure VM'}
                            </span>
                            {s.region && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-400 truncate">{s.region}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isOnline
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                            }`}
                          />
                          <span>{isOnline ? 'Online' : 'Stopped'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Network IPs */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {s.publicIp && (
                        <div
                          onClick={(e) => handleCopyIp(s.publicIp as string, e)}
                          title="Click to copy public IP"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1120] border border-[#1E293B] hover:border-cyan-500/40 text-slate-300 transition-colors cursor-pointer group/ip"
                        >
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Pub:</span>
                          <span className="font-mono text-emerald-400 font-semibold">{s.publicIp}</span>
                          {copiedIp === s.publicIp ? (
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500 group-hover/ip:text-slate-300 shrink-0" />
                          )}
                        </div>
                      )}

                      {s.privateIp && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1120] border border-[#1E293B] text-slate-400">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Priv:</span>
                          <span className="font-mono text-slate-300">{s.privateIp}</span>
                        </div>
                      )}
                    </div>

                    {/* 3 Telemetry Metrics Progress Bars */}
                    <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#1E293B]/60">
                      {/* CPU */}
                      <div className="bg-[#0B1120] rounded-xl p-2.5 border border-[#1E293B] flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                          <span>CPU</span>
                          <Cpu className="w-3 h-3 text-cyan-400" />
                        </div>
                        <div className="text-sm font-bold text-white font-mono">
                          {s.cpuPercent !== null ? `${s.cpuPercent}%` : 'N/A'}
                        </div>
                        <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-cyan-400 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, s.cpuPercent || 0))}%` }}
                          />
                        </div>
                      </div>

                      {/* Memory */}
                      <div className="bg-[#0B1120] rounded-xl p-2.5 border border-[#1E293B] flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                          <span>RAM</span>
                          <Database className="w-3 h-3 text-blue-400" />
                        </div>
                        <div className="text-sm font-bold text-white font-mono">
                          {s.memoryPercent !== null ? `${s.memoryPercent}%` : 'N/A'}
                        </div>
                        <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, s.memoryPercent || 0))}%` }}
                          />
                        </div>
                      </div>

                      {/* Disk */}
                      <div className="bg-[#0B1120] rounded-xl p-2.5 border border-[#1E293B] flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                          <span>DISK</span>
                          <HardDrive className="w-3 h-3 text-amber-400" />
                        </div>
                        <div className="text-sm font-bold text-white font-mono">
                          {s.diskPercent !== null ? `${s.diskPercent}%` : 'N/A'}
                        </div>
                        <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, s.diskPercent || 0))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-1">
                      {isSelected ? (
                        <div className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                          <span>Currently Viewing in Metrics Chart Above</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectServer(s.name);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-[#18233C] hover:bg-cyan-600 hover:text-white text-slate-200 border border-[#1E293B] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all group-hover:border-cyan-500/50 cursor-pointer"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white transition-colors" />
                          <span>Click to Inspect Metrics &amp; Chart</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {displayServers.length === 0 && (
              <div className="text-center py-12 text-slate-400 border border-dashed border-[#1E293B] rounded-2xl p-6">
                <Server className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="text-sm font-semibold text-white">No servers match your search filter</p>
                <p className="text-xs text-slate-500 mt-1">Try resetting the search query or cloud filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
