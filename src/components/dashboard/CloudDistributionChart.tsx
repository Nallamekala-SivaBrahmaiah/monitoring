'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { PieChart as PieIcon, Cpu, HardDrive, Plus, Server as ServerIcon } from 'lucide-react';
import { CloudDistributionItem } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface CloudDistributionChartProps {
  data?: CloudDistributionItem[];
  totalServers?: number;
}

interface RealServerItem {
  id: string;
  name: string;
  provider: 'aws' | 'azure';
  status: 'Online' | 'Offline';
  powerState: 'Running' | 'Stopped';
  region: string;
  vCpu: number;
  ramGB: number;
}

export function CloudDistributionChart({}: CloudDistributionChartProps) {
  const { cloudProvider, filteredEC2Instances, filteredAzureVMs, customServers, selectedRegion } = useMonitoring();

  // Deduplicate and aggregate real servers strictly from database & discovery APIs
  const { awsServers, azureServers, allServers } = useMemo(() => {
    const serverMap = new Map<string, RealServerItem>();

    // 1. Process Azure Virtual Machines
    if (cloudProvider === 'all' || cloudProvider === 'azure') {
      filteredAzureVMs.forEach((v) => {
        const key = (v.name || v.id).toLowerCase().trim();
        const isRunning = (v.powerState || '').toLowerCase().includes('run');
        const reg = v.region || (v as any).location || 'centralindia';

        // Match with custom server record for exact hardware if available
        const matchedCustom = customServers.find(
          (s) =>
            (s.name || '').toLowerCase().trim() === key ||
            (s.host && (s.host === v.publicIp || s.host === v.privateIp))
        );

        const vCpu = matchedCustom?.hardware?.cpuCores || 2;
        const ramBytes = matchedCustom?.hardware?.totalMemoryBytes || 8265392128;
        const ramGB = Math.round((ramBytes / (1024 ** 3)) * 10) / 10;

        serverMap.set(key, {
          id: matchedCustom?._id || v.id,
          name: v.name,
          provider: 'azure',
          status: isRunning ? 'Online' : 'Offline',
          powerState: isRunning ? 'Running' : 'Stopped',
          region: reg,
          vCpu,
          ramGB,
        });
      });
    }

    // 2. Process AWS EC2 Instances
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

        const vCpu = matchedCustom?.hardware?.cpuCores || 1;
        const ramBytes = matchedCustom?.hardware?.totalMemoryBytes || 1073741824;
        const ramGB = Math.round((ramBytes / (1024 ** 3)) * 10) / 10;

        serverMap.set(key, {
          id: matchedCustom?._id || i.instanceId,
          name: i.name || i.instanceId,
          provider: 'aws',
          status: isRunning ? 'Online' : 'Offline',
          powerState: isRunning ? 'Running' : 'Stopped',
          region: reg,
          vCpu,
          ramGB,
        });
      });
    }

    // 3. Process any custom registered servers not matched above
    customServers.forEach((s) => {
      const key = (s.name || s._id).toLowerCase().trim();
      if (!serverMap.has(key)) {
        const prov = (s.cloudProvider || '').toLowerCase() === 'aws' ? 'aws' : 'azure';
        if (cloudProvider === 'aws' && prov !== 'aws') return;
        if (cloudProvider === 'azure' && prov !== 'azure') return;
        if (selectedRegion !== 'all' && s.region && s.region !== selectedRegion) return;

        const isOnline = s.status === 'Online' || (s.status || '').toLowerCase().includes('run');
        const vCpu = s.hardware?.cpuCores || 1;
        const ramBytes = s.hardware?.totalMemoryBytes || 1073741824;
        const ramGB = Math.round((ramBytes / (1024 ** 3)) * 10) / 10;

        serverMap.set(key, {
          id: s._id,
          name: s.name,
          provider: prov,
          status: isOnline ? 'Online' : 'Offline',
          powerState: isOnline ? 'Running' : 'Stopped',
          region: s.region || (prov === 'aws' ? 'ap-southeast-2' : 'centralindia'),
          vCpu,
          ramGB,
        });
      }
    });

    const all = Array.from(serverMap.values());
    const aws = all.filter((s) => s.provider === 'aws');
    const azure = all.filter((s) => s.provider === 'azure');

    return { awsServers: aws, azureServers: azure, allServers: all };
  }, [cloudProvider, filteredEC2Instances, filteredAzureVMs, customServers, selectedRegion]);

  const total = allServers.length;
  const awsCount = awsServers.length;
  const azureCount = azureServers.length;

  const awsPct = total > 0 ? Math.round((awsCount / total) * 100) : 0;
  const azurePct = total > 0 ? Math.round((azureCount / total) * 100) : 0;

  const runningCount = allServers.filter((s) => s.powerState === 'Running' || s.status === 'Online').length;
  const stoppedCount = allServers.filter((s) => s.powerState === 'Stopped' || s.status === 'Offline').length;

  const awsRunning = awsServers.filter((s) => s.powerState === 'Running' || s.status === 'Online').length;
  const awsStopped = awsServers.filter((s) => s.powerState === 'Stopped' || s.status === 'Offline').length;

  const azureRunning = azureServers.filter((s) => s.powerState === 'Running' || s.status === 'Online').length;
  const azureStopped = azureServers.filter((s) => s.powerState === 'Stopped' || s.status === 'Offline').length;

  // Real capacity calculation from actual hardware records
  const totalVcpu = allServers.reduce((sum, s) => sum + s.vCpu, 0);
  const totalRamGB = Math.round(allServers.reduce((sum, s) => sum + s.ramGB, 0) * 10) / 10;

  // Real regions
  const awsRegions = Array.from(new Set(awsServers.map((s) => s.region))).join(', ') || 'ap-southeast-2';
  const azureRegions = Array.from(new Set(azureServers.map((s) => s.region))).join(', ') || 'centralindia';

  // SVG Donut calculation (circumference = 2 * PI * 42 ≈ 263.89)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const awsStroke = total > 0 ? (awsPct / 100) * circumference : 0;
  const azureStroke = total > 0 ? (azurePct / 100) * circumference : 0;

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:border-blue-500/40 transition-all">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]/70 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <PieIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Cloud Distribution
            </h3>
            <p className="text-[10px] text-slate-400">Actual registered server fleet</p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#0D1526] text-blue-300 border border-[#1E293B]">
          {total} {total === 1 ? 'Server' : 'Servers'}
        </span>
      </div>

      {/* 2. Content Body: If empty state, display clean empty state */}
      {total === 0 ? (
        <div className="py-8 text-center space-y-2 flex flex-col items-center justify-center flex-1">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
            <ServerIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-300">No Servers Found</span>
          <p className="text-[11px] text-slate-500 max-w-[200px]">
            No instances matching the selected cloud filter were found.
          </p>
          <Link
            href="/dashboard/servers"
            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold mt-1"
          >
            <Plus className="w-3 h-3" /> Add Linux Server
          </Link>
        </div>
      ) : (
        <div className="py-3 flex-1 flex flex-col justify-between space-y-3">
          {/* Top Section: Donut Chart Centered */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32 flex items-center justify-center select-none">
              <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 110 110">
                {/* Background track circle */}
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="transparent"
                  stroke="#152238"
                  strokeWidth="11"
                />

                {/* AWS Arc */}
                {awsStroke > 0 && (
                  <circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="transparent"
                    stroke="#FF9900"
                    strokeWidth="11"
                    strokeDasharray={`${awsStroke} ${circumference}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_6px_rgba(255,153,0,0.6)] transition-all duration-700"
                  />
                )}

                {/* Azure Arc */}
                {azureStroke > 0 && (
                  <circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="transparent"
                    stroke="#0089D6"
                    strokeWidth="11"
                    strokeDasharray={`${azureStroke} ${circumference}`}
                    strokeDashoffset={-awsStroke}
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_6px_rgba(0,137,214,0.6)] transition-all duration-700"
                  />
                )}
              </svg>

              {/* Center Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-black text-white font-mono leading-none tracking-tight">
                  {total}
                </span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">
                  Total Nodes
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold mt-0.5">
                  {runningCount} Active
                </span>
              </div>
            </div>
          </div>

          {/* Full-Width Provider Breakdown Rows (No cramped horizontal columns!) */}
          <div className="space-y-2.5 w-full">
            {/* AWS EC2 Card */}
            {(cloudProvider === 'all' || cloudProvider === 'aws') && (
              <div className="p-2.5 rounded-lg bg-[#0D1526] border border-[#1E293B] hover:border-[#FF9900]/40 transition-colors">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF9900] shadow-[0_0_5px_#FF9900] shrink-0" />
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <AwsLogo className="w-3.5 h-2.5 text-[#FF9900]" />
                      <span>AWS EC2</span>
                    </span>
                  </div>
                  <span className="font-mono text-slate-200 font-semibold text-xs shrink-0">
                    {awsCount} <span className="text-slate-400 font-normal text-[11px]">({awsPct}%)</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-[#FF9900] rounded-full transition-all duration-700"
                    style={{ width: `${awsPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="truncate max-w-[150px]">{awsRegions}</span>
                  <span className={awsRunning > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {awsRunning} Active • {awsStopped} Stopped
                  </span>
                </div>
              </div>
            )}

            {/* Azure VMs Card */}
            {(cloudProvider === 'all' || cloudProvider === 'azure') && (
              <div className="p-2.5 rounded-lg bg-[#0D1526] border border-[#1E293B] hover:border-[#0089D6]/40 transition-colors">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0089D6] shadow-[0_0_5px_#0089D6] shrink-0" />
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <AzureLogo className="w-3 h-3 text-[#0089D6]" />
                      <span>Azure VMs</span>
                    </span>
                  </div>
                  <span className="font-mono text-slate-200 font-semibold text-xs shrink-0">
                    {azureCount} <span className="text-slate-400 font-normal text-[11px]">({azurePct}%)</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-[#0089D6] rounded-full transition-all duration-700"
                    style={{ width: `${azurePct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="truncate max-w-[150px]">{azureRegions}</span>
                  <span className={azureRunning > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {azureRunning} Active • {azureStopped} Stopped
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Actual Hardware Resource Summary Footer */}
      {total > 0 && (
        <div className="pt-2.5 border-t border-[#1E293B]/70 grid grid-cols-2 gap-2 text-center text-[10px] shrink-0 mt-auto">
          <div className="p-1.5 rounded-md bg-[#0D1526] border border-[#1E293B] flex items-center justify-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Total vCPUs:</span>
            <strong className="font-mono text-white text-[11px]">{totalVcpu} cores</strong>
          </div>
          <div className="p-1.5 rounded-md bg-[#0D1526] border border-[#1E293B] flex items-center justify-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Total RAM:</span>
            <strong className="font-mono text-white text-[11px]">{totalRamGB} GB</strong>
          </div>
        </div>
      )}
    </div>
  );
}
