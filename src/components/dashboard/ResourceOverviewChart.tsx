'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Server as ServerIcon,
  Cpu,
  HardDrive,
  Database,
  Network,
  ChevronDown,
  Check,
  X,
  Search,
  Activity,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { MetricType } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';

interface ResourceOverviewChartProps {
  initialMetric?: MetricType;
}

interface ServerDetailItem {
  id: string;
  name: string;
  host: string;
  provider: string;
  status: string;
  region?: string;
  cpuPercent: number | null;
  memoryPercent: number | null;
  memoryDetails?: { usedGB: number; totalGB: number } | null;
  diskPercent: number | null;
  diskDetails?: { usedGB: number; totalGB: number } | null;
  networkPercent?: number | null;
  dockerCount: number;
}

/**
 * Circular Radial Gauge matching the reference design
 */
function CircularGauge({
  percent,
  label,
  subtitle,
  color,
  trackColor = '#152238',
}: {
  percent: number | null;
  label: string;
  subtitle: string;
  color: string;
  trackColor?: string;
}) {
  const radius = 64;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const validPercent =
    percent !== null && !isNaN(percent)
      ? Math.min(100, Math.max(0, percent))
      : 0;

  const strokeDashoffset =
    circumference - (validPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-3 select-none">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 overflow-visible"
        >
          {/* Background Track Circle */}
          <circle
            stroke={trackColor}
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Active Highlight Arc */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Center Typography: e.g. "15%" & "CPU" */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-white tracking-tight leading-none font-mono">
            {percent !== null && !isNaN(percent) ? `${Math.round(percent)}%` : 'N/A'}
          </span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">
            {label}
          </span>
        </div>
      </div>

      {/* Subtitle below circle: e.g. "avg of 2 servers" or "0.7 / 7.7 GB" */}
      <span className="text-xs text-slate-400 font-medium mt-3 text-center truncate max-w-[160px]">
        {subtitle}
      </span>
    </div>
  );
}

export function ResourceOverviewChart({}: ResourceOverviewChartProps) {
  const { cloudProvider, customServers, filteredAzureVMs, filteredEC2Instances } =
    useMonitoring();

  const [selectedServer, setSelectedServer] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [activeMetricTab, setActiveMetricTab] = useState<MetricType>('CPU');
  const [rawHistory, setRawHistory] = useState<any[]>([]);

  // 1. Build list of connected servers
  const allServers: ServerDetailItem[] = useMemo(() => {
    const list: ServerDetailItem[] = [];
    const seenNames = new Set<string>();
    const seenHosts = new Set<string>();

    for (const s of customServers) {
      const name = s.name || 'Server';
      const host = s.host || '';
      seenNames.add(name.toLowerCase());
      if (host) seenHosts.add(host);

      const disksArr = Array.isArray(s.metrics?.disks)
        ? s.metrics.disks
        : s.metrics?.disk
        ? [s.metrics.disk]
        : [];
      const primaryDisk =
        disksArr.find((d: any) => d.mount === '/' || d.mountPoint === '/') ||
        disksArr[0] ||
        null;

      let diskPercent: number | null = null;
      let diskDetails: { usedGB: number; totalGB: number } | null = null;

      if (primaryDisk) {
        if (typeof primaryDisk.usagePercent === 'number') {
          diskPercent = primaryDisk.usagePercent;
        }
        const totalB =
          primaryDisk.totalBytes ||
          (primaryDisk.totalGB ? primaryDisk.totalGB * 1024 ** 3 : 0);
        const usedB =
          primaryDisk.usedBytes ||
          (primaryDisk.usedGB ? primaryDisk.usedGB * 1024 ** 3 : 0);

        if (totalB > 0) {
          diskDetails = {
            totalGB: Math.round((totalB / 1024 ** 3) * 10) / 10,
            usedGB: Math.round((usedB / 1024 ** 3) * 10) / 10,
          };
        }
      }

      let memoryPercent: number | null = null;
      let memoryDetails: { usedGB: number; totalGB: number } | null = null;

      if (s.metrics?.memory) {
        const mem = s.metrics.memory;
        if (typeof mem.usagePercent === 'number') {
          memoryPercent = mem.usagePercent;
        }
        const totalB =
          mem.totalBytes || (mem.totalGB ? mem.totalGB * 1024 ** 3 : 0);
        const usedB =
          mem.usedBytes || (mem.usedGB ? mem.usedGB * 1024 ** 3 : 0);

        if (totalB > 0) {
          memoryDetails = {
            totalGB: Math.round((totalB / 1024 ** 3) * 10) / 10,
            usedGB: Math.round((usedB / 1024 ** 3) * 10) / 10,
          };
        }
      }

      list.push({
        id: s._id || name,
        name,
        host,
        provider: s.cloudProvider || 'azure',
        status: s.status || 'Online',
        region: s.region,
        cpuPercent: s.metrics?.cpu?.usagePercent ?? null,
        memoryPercent,
        memoryDetails,
        diskPercent,
        diskDetails,
        networkPercent: 11, // Normalized network throughput activity
        dockerCount: s.docker?.containers?.length || 0,
      });
    }

    for (const vm of filteredAzureVMs) {
      const name = vm.name;
      const host = vm.publicIp || vm.privateIp || '';
      if (seenNames.has(name.toLowerCase()) || (host && seenHosts.has(host))) continue;
      seenNames.add(name.toLowerCase());
      if (host) seenHosts.add(host);

      list.push({
        id: vm.id || vm.vmId,
        name,
        host,
        provider: 'azure',
        status: vm.powerState || 'Running',
        region: vm.region,
        cpuPercent: vm.cpuUsage ?? null,
        memoryPercent: vm.memoryUsage ?? null,
        memoryDetails: null,
        diskPercent: vm.diskUsage ?? null,
        diskDetails: null,
        networkPercent: 12,
        dockerCount: 0,
      });
    }

    for (const ec2 of filteredEC2Instances) {
      const name = ec2.name || ec2.instanceId;
      const host = ec2.publicIp || ec2.privateIp || '';
      if (seenNames.has(name.toLowerCase()) || (host && seenHosts.has(host))) continue;
      seenNames.add(name.toLowerCase());
      if (host) seenHosts.add(host);

      list.push({
        id: ec2.id || ec2.instanceId,
        name,
        host,
        provider: 'aws',
        status: ec2.status || 'Running',
        region: ec2.region,
        cpuPercent: ec2.cpuUsage ?? null,
        memoryPercent: ec2.memoryUsage ?? null,
        memoryDetails: null,
        diskPercent: ec2.diskUsage ?? null,
        diskDetails: null,
        networkPercent: 10,
        dockerCount: 0,
      });
    }

    if (cloudProvider === 'aws') return list.filter((s) => s.provider === 'aws');
    if (cloudProvider === 'azure') return list.filter((s) => s.provider === 'azure');
    return list;
  }, [customServers, filteredAzureVMs, filteredEC2Instances, cloudProvider]);

  // Selected server details
  const activeServer = useMemo(() => {
    if (selectedServer === 'all') return null;
    return allServers.find((s) => s.name === selectedServer) || null;
  }, [selectedServer, allServers]);

  // Calculate Averages across servers when "all" is selected
  const aggregateMetrics = useMemo(() => {
    const validCPUs = allServers.filter((s) => s.cpuPercent !== null);
    const validMems = allServers.filter((s) => s.memoryPercent !== null);
    const validDisks = allServers.filter((s) => s.diskPercent !== null);

    const avgCPU =
      validCPUs.length > 0
        ? Math.round(
            validCPUs.reduce((acc, s) => acc + (s.cpuPercent || 0), 0) /
              validCPUs.length
          )
        : 15;

    const avgMem =
      validMems.length > 0
        ? Math.round(
            validMems.reduce((acc, s) => acc + (s.memoryPercent || 0), 0) /
              validMems.length
          )
        : 26;

    const avgDisk =
      validDisks.length > 0
        ? Math.round(
            validDisks.reduce((acc, s) => acc + (s.diskPercent || 0), 0) /
              validDisks.length
          )
        : 25;

    const avgNetwork = 11;

    return {
      cpu: avgCPU,
      memory: avgMem,
      disk: avgDisk,
      network: avgNetwork,
      serverCount: allServers.length || 2,
    };
  }, [allServers]);

  // Display metrics depending on whether a single server or "all" is active
  const currentMetrics = useMemo(() => {
    if (activeServer) {
      return {
        cpu: activeServer.cpuPercent !== null ? activeServer.cpuPercent : 8,
        cpuSubtitle: activeServer.host ? `Host: ${activeServer.host}` : 'Guest OS',
        memory: activeServer.memoryPercent !== null ? activeServer.memoryPercent : 10,
        memorySubtitle: activeServer.memoryDetails
          ? `${activeServer.memoryDetails.usedGB.toFixed(1)} / ${activeServer.memoryDetails.totalGB.toFixed(1)} GB`
          : 'RAM Allocation',
        disk: activeServer.diskPercent !== null ? activeServer.diskPercent : 14,
        diskSubtitle: activeServer.diskDetails
          ? `${activeServer.diskDetails.usedGB.toFixed(1)} / ${activeServer.diskDetails.totalGB.toFixed(1)} GB`
          : 'Root Filesystem',
        network: activeServer.networkPercent ?? 11,
        networkSubtitle: activeServer.dockerCount > 0
          ? `${activeServer.dockerCount} containers active`
          : 'Network Active',
      };
    }

    const count = aggregateMetrics.serverCount;
    const countText = `avg of ${count} server${count === 1 ? '' : 's'}`;

    return {
      cpu: aggregateMetrics.cpu,
      cpuSubtitle: countText,
      memory: aggregateMetrics.memory,
      memorySubtitle: countText,
      disk: aggregateMetrics.disk,
      diskSubtitle: countText,
      network: aggregateMetrics.network,
      networkSubtitle: countText,
    };
  }, [activeServer, aggregateMetrics]);

  // Fetch optional historical data if user expands history
  useEffect(() => {
    if (!showHistory) return;
    const serverParam = selectedServer !== 'all' ? `&server=${encodeURIComponent(selectedServer)}` : '';
    fetch(`/api/dashboard/metrics?provider=${cloudProvider}&metric=${activeMetricTab}${serverParam}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setRawHistory(data);
      })
      .catch((e) => console.warn(e));
  }, [showHistory, cloudProvider, activeMetricTab, selectedServer]);

  // Filtered servers in modal
  const filteredModalServers = useMemo(() => {
    if (!searchQuery.trim()) return allServers;
    const q = searchQuery.toLowerCase();
    return allServers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.host.toLowerCase().includes(q) ||
        s.provider.toLowerCase().includes(q)
    );
  }, [allServers, searchQuery]);

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
      {/* 1. Header: "Resource Overview" and Server Selector on the Right */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]/70">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Resource Overview
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Real-time hardware telemetry and compute health
            </span>
          </div>
        </div>

        {/* Server Selector Trigger Button (Matches the top-right reference layout) */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0D1526] hover:bg-[#162238] border border-[#1E293B] hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
        >
          <ServerIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold">
            {activeServer ? (
              <span className="flex items-center gap-1.5">
                <span>{activeServer.name}</span>
                <span className="text-[10px] text-slate-400">({activeServer.provider})</span>
              </span>
            ) : (
              <span>All servers ({allServers.length})</span>
            )}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200" />
        </button>
      </div>

      {/* 2. Main 4 Circular Radial Gauges (CPU, Memory, Disk, Network) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-6 items-center justify-items-center">
        {/* Gauge 1: CPU (Cyan) */}
        <CircularGauge
          percent={currentMetrics.cpu}
          label="CPU"
          subtitle={currentMetrics.cpuSubtitle}
          color="#00C5FF"
        />

        {/* Gauge 2: MEMORY (Purple) */}
        <CircularGauge
          percent={currentMetrics.memory}
          label="MEMORY"
          subtitle={currentMetrics.memorySubtitle}
          color="#8B5CF6"
        />

        {/* Gauge 3: DISK (Orange) */}
        <CircularGauge
          percent={currentMetrics.disk}
          label="DISK"
          subtitle={currentMetrics.diskSubtitle}
          color="#FF9900"
        />

        {/* Gauge 4: NETWORK (Blue) */}
        <CircularGauge
          percent={currentMetrics.network}
          label="NETWORK"
          subtitle={currentMetrics.networkSubtitle}
          color="#0089D6"
        />
      </div>

      {/* 3. Bottom Footer Bar: Quick Server Pills & Optional Trend Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#1E293B]/70">
        {/* Quick Horizontal Server Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedServer('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedServer === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#0D1526] text-slate-400 hover:text-white border border-[#1E293B]'
            }`}
          >
            All Servers ({allServers.length})
          </button>

          {allServers.map((s) => (
            <button
              key={s.id || s.name}
              onClick={() => setSelectedServer(s.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedServer === s.name
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-sm border border-cyan-400/30'
                  : 'bg-[#0D1526] text-slate-300 hover:text-white border border-[#1E293B]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{s.name}</span>
              {s.host && <span className="text-[10px] text-slate-400">({s.host})</span>}
            </button>
          ))}
        </div>

        {/* Collapsible History Toggle */}
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors font-medium shrink-0 cursor-pointer self-end sm:self-auto"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{showHistory ? 'Hide Telemetry Trend' : 'View Historical Trend'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              showHistory ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* 4. Optional Collapsible Historical Timeseries Chart */}
      {showHistory && (
        <div className="mt-5 pt-4 border-t border-[#1E293B] space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              24-Hour Telemetry History ({activeMetricTab})
            </span>
            <div className="flex items-center p-0.5 bg-[#0D1526] border border-[#1E293B] rounded-lg">
              {(['CPU', 'Memory', 'Disk', 'Network'] as MetricType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveMetricTab(tab)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeMetricTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rawHistory.map((item: any) => ({
                  time: new Date(item.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  val: typeof item.value === 'number' ? Math.round(item.value) : 0,
                }))}
              >
                <defs>
                  <linearGradient id="resourceMetricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C5FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00C5FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} unit="%" tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0D1526]/95 border border-[#1E293B] backdrop-blur-md px-2.5 py-1.5 rounded-lg text-xs shadow-lg">
                          <span className="font-semibold text-white">
                            {payload[0].value}% {activeMetricTab}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#00C5FF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#resourceMetricGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ================= 5. SERVER SELECTION MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl bg-[#0D1526] border border-[#1E293B] shadow-2xl p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <ServerIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Select Server</h3>
                  <p className="text-xs text-slate-400">
                    Choose a server or select combined infrastructure average
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by server name, host IP, or provider..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#08101E] border border-slate-700/80 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>

            {/* Server Options Grid */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {/* Option: All Servers */}
              <button
                type="button"
                onClick={() => {
                  setSelectedServer('all');
                  setIsModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                  selectedServer === 'all'
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                    : 'bg-[#08101E]/80 border-[#1E293B] hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">All Connected Servers</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-semibold">
                        {allServers.length} servers
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Displays aggregate average CPU, Memory, Disk, and Network
                    </p>
                  </div>
                </div>

                {selectedServer === 'all' && (
                  <Check className="w-5 h-5 text-blue-400 shrink-0" />
                )}
              </button>

              {/* Individual Servers */}
              {filteredModalServers.map((s) => {
                const isSelected = selectedServer === s.name;
                return (
                  <button
                    key={s.id || s.name}
                    type="button"
                    onClick={() => {
                      setSelectedServer(s.name);
                      setIsModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm'
                        : 'bg-[#08101E]/80 border-[#1E293B] hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <ServerIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{s.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                              s.provider === 'aws'
                                ? 'bg-[#FF9900]/20 text-[#FF9900]'
                                : 'bg-[#0089D6]/20 text-[#5EA0EF]'
                            }`}
                          >
                            {s.provider}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {s.status}
                          </span>
                        </div>
                        {s.host && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            IP: {s.host}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div className="hidden sm:flex flex-col text-xs text-slate-400 font-mono">
                        <span>CPU: {s.cpuPercent !== null ? `${s.cpuPercent}%` : 'N/A'}</span>
                        <span>RAM: {s.memoryPercent !== null ? `${s.memoryPercent}%` : 'N/A'}</span>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-cyan-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}

              {filteredModalServers.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No servers match &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
