'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  BarChart3,
  Activity,
  RotateCw,
  Server as ServerIcon,
  Cpu,
  HardDrive,
  Database,
  Boxes,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MetricType, ResourceMetricPoint } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';

interface ResourceOverviewChartProps {
  initialMetric?: MetricType;
  data?: Record<string, ResourceMetricPoint[]>;
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
  dockerCount: number;
}

interface EnhancedMetricPoint {
  time: string;
  serverName: string;
  host: string;
  provider: string;
  value: number;
  aws: number;
  azure: number;
}

export function ResourceOverviewChart({
  initialMetric = 'CPU',
  data,
}: ResourceOverviewChartProps) {
  const { cloudProvider, isRefreshing, customServers, filteredAzureVMs, filteredEC2Instances } =
    useMonitoring();

  const [selectedMetric, setSelectedMetric] = useState<MetricType>(initialMetric);
  const [rawList, setRawList] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Compile unified list of registered servers with actual live CPU, RAM, Disk, and Docker specs
  const allServers: ServerDetailItem[] = useMemo(() => {
    const list: ServerDetailItem[] = [];
    const seenNames = new Set<string>();
    const seenHosts = new Set<string>();

    // Registered SSH servers with full guest telemetry
    for (const s of customServers) {
      const name = s.name || 'Server';
      const host = s.host || '';
      seenNames.add(name.toLowerCase());
      if (host) seenHosts.add(host);

      // Extract root or primary disk from s.metrics.disks array or s.metrics.disk
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

      // If disk was not in Server doc directly, check if matching Azure VM has diskUsage
      if (diskPercent === null) {
        const matchingVM = filteredAzureVMs.find(
          (v) =>
            v.name?.toLowerCase() === name.toLowerCase() ||
            (host && (v.publicIp === host || v.privateIp === host))
        );
        if (matchingVM && typeof matchingVM.diskUsage === 'number') {
          diskPercent = matchingVM.diskUsage;
        }
      }

      // Extract memory
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
        dockerCount: s.docker?.containers?.length || 0,
      });
    }

    // Include cloud Azure VMs not yet in customServers
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
        dockerCount: 0,
      });
    }

    // Include cloud AWS EC2 instances not yet in customServers
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
        dockerCount: 0,
      });
    }

    // Filter by active cloudProvider view if filtered
    if (cloudProvider === 'aws') {
      return list.filter((s) => s.provider === 'aws');
    }
    if (cloudProvider === 'azure') {
      return list.filter((s) => s.provider === 'azure');
    }

    return list;
  }, [customServers, filteredAzureVMs, filteredEC2Instances, cloudProvider]);

  // Set default selected server if current selection is invalid
  useEffect(() => {
    if (selectedServer !== 'all' && !allServers.some((s) => s.name === selectedServer)) {
      setSelectedServer('all');
    }
  }, [allServers, selectedServer]);

  // Fetch telemetry time-series from backend
  useEffect(() => {
    if (data) return;
    let isMounted = true;

    async function loadTelemetry() {
      try {
        setLoading(true);
        const res = await fetch(`/api/dashboard/metrics?provider=${cloudProvider}`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && isMounted) {
            setRawList(list);
          }
        }
      } catch (e) {
        console.warn('Real telemetry fetch note:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTelemetry();
    return () => {
      isMounted = false;
    };
  }, [cloudProvider, selectedMetric, isRefreshing, data]);

  const metricTabs: MetricType[] = ['CPU', 'Memory', 'Disk', 'Network'];

  // Current active server detail for stats card display
  const activeServerDetail = useMemo(() => {
    if (selectedServer === 'all') {
      return allServers.length === 1 ? allServers[0] : null;
    }
    return allServers.find((s) => s.name === selectedServer) || null;
  }, [selectedServer, allServers]);

  // Filter raw time-series data for selected server
  const filteredList = useMemo(() => {
    if (selectedServer === 'all') return rawList;
    return rawList.filter(
      (item: any) => (item.serverName || item.resourceName) === selectedServer
    );
  }, [rawList, selectedServer]);

  // Transform raw telemetry points into Recharts data
  const chartData: EnhancedMetricPoint[] = useMemo(() => {
    if (data) {
      const fallback = data[selectedMetric] || data['CPU'] || [];
      return fallback.map((p) => ({
        time: p.time,
        serverName: activeServerDetail?.name || 'vm01siva',
        host: activeServerDetail?.host || '',
        provider: 'azure',
        value: p.azure || p.aws || 0,
        aws: p.aws || 0,
        azure: p.azure || 0,
      }));
    }

    return filteredList.map((item: any) => {
      const date = new Date(item.timestamp || Date.now());
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const metricVal =
        selectedMetric === 'CPU'
          ? (item.cpu ?? (item.metricName === 'CPU' ? item.value : 0))
          : selectedMetric === 'Memory'
          ? (item.memory ?? (item.metricName === 'Memory' ? item.value : 0))
          : selectedMetric === 'Disk'
          ? (item.disk ?? (item.metricName === 'Disk' ? item.value : 0))
          : (item.networkIn ?? 0);

      const num = typeof metricVal === 'number' ? Math.round(metricVal) : 0;
      const isAws = item.provider === 'aws';
      const sName = item.serverName || item.resourceName || activeServerDetail?.name || 'vm01siva';

      return {
        time: timeStr,
        serverName: sName,
        host: item.host || activeServerDetail?.host || '',
        provider: item.provider || 'azure',
        value: num,
        aws: isAws ? num : 0,
        azure: !isAws ? num : 0,
      };
    });
  }, [data, filteredList, selectedMetric, activeServerDetail]);

  const showAws = cloudProvider === 'all' || cloudProvider === 'aws';
  const showAzure = cloudProvider === 'all' || cloudProvider === 'azure';

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm flex flex-col gap-4">
      {/* 1. Header with Title and Metric Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Resource Overview</h3>
              {activeServerDetail && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeServerDetail.name} ({activeServerDetail.host || activeServerDetail.provider})
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              Live guest OS telemetry & hardware usage for connected server inventory
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-2.5 text-xs">
            {showAws && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9900]" />
                <span className="text-slate-300 font-medium">AWS</span>
              </div>
            )}
            {showAzure && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0089D6]" />
                <span className="text-slate-300 font-medium">
                  {activeServerDetail ? `${activeServerDetail.name} (Azure)` : 'Azure'}
                </span>
              </div>
            )}
          </div>

          {/* Metric Switcher Tabs */}
          <div className="flex items-center p-0.5 bg-[#0D1526] border border-[#1E293B] rounded-lg">
            {metricTabs.map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedMetric === metric
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {metric}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Scrollable Server Selector Bar */}
      <div className="relative group/scroll flex items-center">
        {allServers.length > 3 && (
          <button
            onClick={scrollLeft}
            aria-label="Scroll servers left"
            className="p-1 rounded-md bg-[#0D1526] border border-[#1E293B] text-slate-400 hover:text-white mr-1.5 shadow-sm transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none scroll-smooth flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* All Servers Option */}
          <button
            onClick={() => setSelectedServer('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none ${
              selectedServer === 'all'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 border border-blue-500'
                : 'bg-[#0D1526] text-slate-400 hover:text-white hover:bg-[#18233C] border border-[#1E293B]'
            }`}
          >
            <ServerIcon className="w-3.5 h-3.5" />
            <span>All Servers</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">
              {allServers.length}
            </span>
          </button>

          {/* Individual Server Chips */}
          {allServers.map((srv) => {
            const isSelected = selectedServer === srv.name;
            const isOnline =
              srv.status === 'Online' || (srv.status || '').toLowerCase().includes('run');

            return (
              <button
                key={srv.id || srv.name}
                onClick={() => setSelectedServer(srv.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all select-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white border border-blue-400/50 shadow-md shadow-blue-500/20 font-semibold'
                    : 'bg-[#0D1526] text-slate-300 hover:text-white hover:bg-[#18233C] border border-[#1E293B] font-medium'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="truncate max-w-[120px]">{srv.name}</span>
                {srv.host && (
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[100px]">
                    {srv.host}
                  </span>
                )}
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold tracking-wider ${
                    srv.provider === 'aws'
                      ? 'bg-[#FF9900]/20 text-[#FF9900]'
                      : srv.provider === 'azure'
                      ? 'bg-[#0089D6]/20 text-[#5EA0EF]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {srv.provider}
                </span>
              </button>
            );
          })}
        </div>

        {allServers.length > 3 && (
          <button
            onClick={scrollRight}
            aria-label="Scroll servers right"
            className="p-1 rounded-md bg-[#0D1526] border border-[#1E293B] text-slate-400 hover:text-white ml-1.5 shadow-sm transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. Live Server Metrics Summary Cards (CPU, RAM, Disk, Docker) for Selected Server */}
      {activeServerDetail && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* CPU Metric Card */}
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">CPU Usage</span>
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-white font-mono">
                {activeServerDetail.cpuPercent !== null ? `${activeServerDetail.cpuPercent}%` : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Guest OS</span>
            </div>
            <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, activeServerDetail.cpuPercent || 0))}%` }}
              />
            </div>
          </div>

          {/* RAM / Memory Metric Card */}
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">RAM Usage</span>
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-white font-mono">
                {activeServerDetail.memoryPercent !== null
                  ? `${activeServerDetail.memoryPercent}%`
                  : 'N/A'}
              </span>
              {activeServerDetail.memoryDetails && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeServerDetail.memoryDetails.usedGB.toFixed(1)} / {activeServerDetail.memoryDetails.totalGB.toFixed(1)} GB
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, activeServerDetail.memoryPercent || 0))}%`,
                }}
              />
            </div>
          </div>

          {/* Disk Metric Card */}
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Disk Usage</span>
              <Database className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-white font-mono">
                {activeServerDetail.diskPercent !== null
                  ? `${activeServerDetail.diskPercent}%`
                  : 'N/A'}
              </span>
              {activeServerDetail.diskDetails && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeServerDetail.diskDetails.usedGB.toFixed(1)} / {activeServerDetail.diskDetails.totalGB.toFixed(1)} GB
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, activeServerDetail.diskPercent || 0))}%`,
                }}
              />
            </div>
          </div>

          {/* Docker Containers Metric Card */}
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Containers</span>
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-white font-mono">
                {activeServerDetail.dockerCount}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Active Host</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-1">
              {activeServerDetail.dockerCount > 0
                ? `${activeServerDetail.dockerCount} container(s) running`
                : 'No containers running'}
            </div>
          </div>
        </div>
      )}

      {/* 4. Recharts Area Chart */}
      <div className="w-full h-56 min-h-[220px]">
        {loading && chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs gap-2">
            <RotateCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Loading telemetry...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Activity className="w-6 h-6 mb-2 text-slate-600" />
            <span>No telemetry recorded yet for this metric.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="awsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9900" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FF9900" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="azureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0089D6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0089D6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1E293B"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1E293B' }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0]?.payload as EnhancedMetricPoint | undefined;
                    return (
                      <div className="bg-[#0D1526]/95 border border-[#1E293B] backdrop-blur-md px-3 py-2.5 rounded-lg shadow-xl text-xs space-y-1.5 min-w-[160px]">
                        <div className="flex items-center justify-between gap-3 border-b border-[#1E293B] pb-1">
                          <span className="text-slate-400 font-semibold">{label}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400">
                            {dataPoint?.serverName || activeServerDetail?.name || 'vm01siva'}
                          </span>
                        </div>
                        {(dataPoint?.host || activeServerDetail?.host) && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Host: {dataPoint?.host || activeServerDetail?.host}
                          </div>
                        )}
                        <div className="space-y-1">
                          {payload
                            .filter(
                              (p) =>
                                (showAws && p.dataKey === 'aws') ||
                                (showAzure && p.dataKey === 'azure')
                            )
                            .map((p, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: p.stroke }}
                                  />
                                  <span className="text-slate-300 font-medium">
                                    {dataPoint?.serverName ||
                                      activeServerDetail?.name ||
                                      (p.dataKey === 'aws' ? 'AWS' : 'Azure')}
                                    :
                                  </span>
                                </div>
                                <span className="font-bold text-white font-mono">
                                  {p.value}% {selectedMetric}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showAws && (
                <Area
                  type="monotone"
                  dataKey="aws"
                  stroke="#FF9900"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#awsGradient)"
                  dot={{ r: 4, fill: '#FF9900', strokeWidth: 1, stroke: '#111A2E' }}
                  activeDot={{ r: 6, fill: '#FF9900', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
              {showAzure && (
                <Area
                  type="monotone"
                  dataKey="azure"
                  stroke="#0089D6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#azureGradient)"
                  dot={{ r: 4, fill: '#0089D6', strokeWidth: 1, stroke: '#111A2E' }}
                  activeDot={{ r: 6, fill: '#0089D6', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
