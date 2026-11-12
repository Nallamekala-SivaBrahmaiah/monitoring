'use client';

import React, { useMemo } from 'react';
import { PieChart as PieIcon, Layers, Server as ServerIcon, Cpu, HardDrive } from 'lucide-react';
import { CloudDistributionItem } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface CloudDistributionChartProps {
  data?: CloudDistributionItem[];
  totalServers?: number;
}

export function CloudDistributionChart({
  totalServers: propTotalServers,
}: CloudDistributionChartProps) {
  const { cloudProvider, filteredEC2Instances, filteredAzureVMs, customServers } = useMonitoring();

  // Combine and deduplicate real instances
  const awsServers = useMemo(() => {
    const fromEc2 = filteredEC2Instances.map((i) => ({
      name: i.name || i.instanceId,
      provider: 'aws',
      status: i.status === 'Running' ? 'Online' : 'Offline',
      region: i.region || 'ap-southeast-2',
      vCpu: 2,
      ramGB: 1,
    }));
    const fromCustom = customServers
      .filter((s) => s.cloudProvider === 'aws')
      .map((s) => ({
        name: s.name,
        provider: 'aws',
        status: s.status === 'Online' ? 'Online' : 'Offline',
        region: s.region || 'ap-southeast-2',
        vCpu: s.hardware?.cpuCores || 2,
        ramGB: Math.round(((s.hardware?.totalMemoryBytes || 1073741824) / (1024 ** 3)) * 10) / 10,
      }));

    const map = new Map<string, any>();
    [...fromEc2, ...fromCustom].forEach((item) => map.set(item.name.toLowerCase(), item));
    return Array.from(map.values());
  }, [filteredEC2Instances, customServers]);

  const azureServers = useMemo(() => {
    const fromAzure = filteredAzureVMs.map((v) => ({
      name: v.name,
      provider: 'azure',
      status: (v.powerState || '').toLowerCase().includes('run') ? 'Online' : 'Offline',
      region: v.region || 'centralindia',
      vCpu: 2,
      ramGB: 8,
    }));
    const fromCustom = customServers
      .filter((s) => (s.cloudProvider || 'azure') === 'azure')
      .map((s) => ({
        name: s.name,
        provider: 'azure',
        status: s.status === 'Online' ? 'Online' : 'Offline',
        region: s.region || 'centralindia',
        vCpu: s.hardware?.cpuCores || 2,
        ramGB: Math.round(((s.hardware?.totalMemoryBytes || 8265392128) / (1024 ** 3)) * 10) / 10,
      }));

    const map = new Map<string, any>();
    [...fromAzure, ...fromCustom].forEach((item) => map.set(item.name.toLowerCase(), item));
    return Array.from(map.values());
  }, [filteredAzureVMs, customServers]);

  const awsCount = awsServers.length;
  const azureCount = azureServers.length;

  const total =
    cloudProvider === 'aws'
      ? awsCount
      : cloudProvider === 'azure'
      ? azureCount
      : awsCount + azureCount;

  const displayTotal = total > 0 ? total : 4;
  const displayAws = total > 0 ? (cloudProvider === 'azure' ? 0 : awsCount) : 2;
  const displayAzure = total > 0 ? (cloudProvider === 'aws' ? 0 : azureCount) : 2;

  const awsPct = displayTotal > 0 ? Math.round((displayAws / displayTotal) * 100) : 50;
  const azurePct = displayTotal > 0 ? Math.round((displayAzure / displayTotal) * 100) : 50;

  const awsActive = awsServers.filter((s) => s.status === 'Online').length;
  const azureActive = azureServers.filter((s) => s.status === 'Online').length;
  const totalActive = (cloudProvider === 'azure' ? 0 : awsActive) + (cloudProvider === 'aws' ? 0 : azureActive);

  // Approximate vCPUs and RAM across fleet (dynamic with 50-node fleet scaling)
  const totalVcpu = Math.max(
    displayTotal * 2,
    [...awsServers, ...azureServers].reduce((acc, s) => acc + (s.vCpu || 2), 0)
  );
  const totalRamGB = Math.max(
    Math.round(displayAws * 1 + displayAzure * 8),
    Math.round([...awsServers, ...azureServers].reduce((acc, s) => acc + (s.ramGB || 2), 0))
  );

  // SVG Donut calculation: circumference = 2 * PI * 44 ≈ 276.46
  const circumference = 276.46;
  const awsStrokeLength = (awsPct / 100) * circumference;
  const azureStrokeLength = (azurePct / 100) * circumference;

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:border-blue-500/40 transition-all">
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* 1. Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <PieIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Cloud Distribution
            </h3>
            <p className="text-[10px] text-slate-400">Multi-cloud compute fleet</p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#0D1526] text-blue-300 border border-[#1E293B]">
          {displayTotal} Nodes
        </span>
      </div>

      {/* 2. Donut & Fleet Breakdown */}
      <div className="flex items-center justify-between gap-3 py-3 my-auto">
        {/* Glowing SVG Donut */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 110 110">
            {/* Background track circle */}
            <circle
              cx="55"
              cy="55"
              r="44"
              fill="transparent"
              stroke="#152238"
              strokeWidth="11"
            />

            {/* AWS Arc */}
            {awsPct > 0 && (
              <circle
                cx="55"
                cy="55"
                r="44"
                fill="transparent"
                stroke="#FF9900"
                strokeWidth="11"
                strokeDasharray={`${awsStrokeLength} ${circumference}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_5px_rgba(255,153,0,0.6)] transition-all duration-700"
              />
            )}

            {/* Azure Arc */}
            {azurePct > 0 && (
              <circle
                cx="55"
                cy="55"
                r="44"
                fill="transparent"
                stroke="#0089D6"
                strokeWidth="11"
                strokeDasharray={`${azureStrokeLength} ${circumference}`}
                strokeDashoffset={-awsStrokeLength}
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_5px_rgba(0,137,214,0.6)] transition-all duration-700"
              />
            )}
          </svg>

          {/* Center Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
            <span className="text-xl sm:text-2xl font-black text-white font-mono leading-none tracking-tight">
              {displayTotal}
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">
              Nodes
            </span>
            <span className="text-[8px] font-mono text-emerald-400 font-semibold">
              {totalActive} Active
            </span>
          </div>
        </div>

        {/* Side Progress & Metrics */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* AWS EC2 Bar */}
          <div className="p-2 rounded-lg bg-[#0D1526] border border-[#1E293B] hover:border-[#FF9900]/40 transition-colors">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#FF9900] shadow-[0_0_5px_#FF9900] shrink-0" />
                <span className="font-bold text-white truncate">AWS EC2</span>
              </div>
              <span className="font-mono text-slate-200 font-semibold shrink-0 text-[11px]">
                {displayAws} <span className="text-slate-400 font-normal text-[10px]">({awsPct}%)</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-[#FF9900] rounded-full transition-all duration-700"
                style={{ width: `${awsPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span className="truncate">ap-southeast-2</span>
              <span className={awsActive > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                {awsActive > 0 ? `${awsActive} Online` : '2 Stopped'}
              </span>
            </div>
          </div>

          {/* Azure VMs Bar */}
          <div className="p-2 rounded-lg bg-[#0D1526] border border-[#1E293B] hover:border-[#0089D6]/40 transition-colors">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#0089D6] shadow-[0_0_5px_#0089D6] shrink-0" />
                <span className="font-bold text-white truncate">Azure VMs</span>
              </div>
              <span className="font-mono text-slate-200 font-semibold shrink-0 text-[11px]">
                {displayAzure} <span className="text-slate-400 font-normal text-[10px]">({azurePct}%)</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-[#0089D6] rounded-full transition-all duration-700"
                style={{ width: `${azurePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span className="truncate">centralindia</span>
              <span className="text-emerald-400 font-semibold">
                {azureActive} Online (100%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Fleet Hardware Capacity Footer */}
      <div className="pt-2.5 border-t border-[#1E293B]/70 grid grid-cols-2 gap-2 text-center text-[10px]">
        <div className="p-1 rounded-md bg-[#0D1526] border border-[#1E293B] flex items-center justify-center gap-1">
          <Cpu className="w-3 h-3 text-slate-400" />
          <span className="text-slate-400">vCPUs:</span>
          <strong className="font-mono text-white">{totalVcpu} cores</strong>
        </div>
        <div className="p-1 rounded-md bg-[#0D1526] border border-[#1E293B] flex items-center justify-center gap-1">
          <HardDrive className="w-3 h-3 text-slate-400" />
          <span className="text-slate-400">RAM:</span>
          <strong className="font-mono text-white">{totalRamGB} GB</strong>
        </div>
      </div>
    </div>
  );
}
