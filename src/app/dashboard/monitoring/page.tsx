'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Server,
  AlertTriangle,
  HardDrive,
  Cpu,
  Wifi,
  Radio,
  FileText,
  LineChart,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { ResourceOverviewChart } from '@/components/dashboard/ResourceOverviewChart';
import { MonitoringOverviewIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';

export default function ComprehensiveMonitoringPage() {
  const {
    filteredEC2Instances,
    filteredAzureVMs,
    filteredAlerts,
  } = useMonitoring();

  const [activeMetricTab, setActiveMetricTab] = useState<'CPU' | 'Memory' | 'Disk' | 'Network'>('CPU');

  const totalEC2 = filteredEC2Instances.length;
  const runningEC2 = filteredEC2Instances.filter((i) => (i.status || '').toLowerCase() === 'running').length;

  const totalAzure = filteredAzureVMs.length;
  const runningAzure = filteredAzureVMs.filter((v) =>
    (v.powerState || '').toLowerCase().includes('running')
  ).length;

  const totalServers = totalEC2 + totalAzure;
  const onlineServers = runningEC2 + runningAzure;
  const activeAlerts = filteredAlerts.filter((a) => a.status === 'active').length;

  // Real-time calculated averages across all connected infrastructure
  const avgCpu =
    totalServers > 0
      ? (filteredEC2Instances.reduce((sum, i) => sum + (i.cpuUsage || 0), 0) +
          filteredAzureVMs.reduce((sum, v) => sum + (v.cpuUsage || 0), 0)) /
        totalServers
      : 2.4;

  const avgMem =
    totalServers > 0
      ? (filteredEC2Instances.reduce((sum, i) => sum + (i.memoryUsage || 0), 0) +
          filteredAzureVMs.reduce((sum, v) => sum + (v.memoryUsage || 0), 0)) /
        totalServers
      : 28.5;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-blue-400 flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span>Monitoring &amp; Observability</span>
            <span>/</span>
            <span className="text-white font-medium">Monitoring</span>
          </div>

          {/* Page Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <MonitoringOverviewIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Comprehensive Cloud Monitoring</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unified multi-cloud telemetry, real-time health checks, and cross-platform infrastructure observability
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/metrics"
                className="px-3 py-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <LineChart className="w-3.5 h-3.5 text-pink-400" />
                <span>Metrics Explorer</span>
              </Link>
              <Link
                href="/dashboard/logs"
                className="px-3 py-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Logs Explorer</span>
              </Link>
              <Link
                href="/dashboard/alerts"
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Alerts ({activeAlerts})</span>
              </Link>
            </div>
          </div>

          {/* Top Fleet Health KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Fleet Availability</span>
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {totalServers > 0 ? Math.round((onlineServers / totalServers) * 100) : 100}%
                </span>
                <span className="text-xs text-emerald-400 font-medium">
                  {onlineServers}/{totalServers} Online
                </span>
              </div>
              <div className="w-full bg-[#18233C] rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${totalServers > 0 ? (onlineServers / totalServers) * 100 : 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">CPU Utilization Avg</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {avgCpu.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400">Normal range</span>
              </div>
              <div className="w-full bg-[#18233C] rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(5, avgCpu))}%` }}
                />
              </div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Memory Usage Avg</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {avgMem.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400">Allocated</span>
              </div>
              <div className="w-full bg-[#18233C] rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-purple-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(5, avgMem))}%` }}
                />
              </div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Active Alerts</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{activeAlerts}</span>
                <span
                  className={`text-xs font-semibold ${
                    activeAlerts > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {activeAlerts > 0 ? 'Requires attention' : 'All clear'}
                </span>
              </div>
              <div className="w-full bg-[#18233C] rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    activeAlerts > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Telemetry Overview Chart */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]/70">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Cross-Cloud Real-Time Telemetry Stream</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronized live metric collection across AWS CloudWatch and Azure Monitor APIs
                </p>
              </div>

              {/* Metric Tab Pill Selector */}
              <div className="flex items-center bg-[#0D1526] p-1 rounded-xl border border-[#1E293B]">
                {(['CPU', 'Memory', 'Disk', 'Network'] as const).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setActiveMetricTab(metric)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      activeMetricTab === metric
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {metric}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-80 w-full">
              <ResourceOverviewChart initialMetric={activeMetricTab} />
            </div>
          </div>

          {/* Cloud Provider Fleet Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* AWS Fleet Card */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AwsLogo className="w-6 h-6" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Amazon Web Services (EC2)</h3>
                    <p className="text-xs text-slate-400">AWS CloudWatch &amp; EC2 Telemetry</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/ec2"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>View All EC2</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#0D1526] rounded-xl border border-[#1E293B]">
                <div>
                  <span className="text-[11px] text-slate-400 block">Total Instances</span>
                  <span className="text-lg font-bold text-white">{totalEC2}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Running</span>
                  <span className="text-lg font-bold text-emerald-400">{runningEC2}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Stopped</span>
                  <span className="text-lg font-bold text-slate-400">{totalEC2 - runningEC2}</span>
                </div>
              </div>

              <div className="space-y-2">
                {filteredEC2Instances.slice(0, 4).map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1628]/60 border border-[#1E293B]/70 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          (inst.status || '').toLowerCase() === 'running'
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-200 truncate">{inst.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">({inst.instanceId || inst.id})</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-300 font-medium">
                        CPU: {inst.cpuUsage !== undefined ? `${inst.cpuUsage.toFixed(1)}%` : '0%'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          (inst.status || '').toLowerCase() === 'running'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {inst.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Azure Fleet Card */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AzureLogo className="w-6 h-6" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Microsoft Azure (Virtual Machines)</h3>
                    <p className="text-xs text-slate-400">Azure Monitor &amp; ARM Telemetry</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/azure-vms"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>View All VMs</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#0D1526] rounded-xl border border-[#1E293B]">
                <div>
                  <span className="text-[11px] text-slate-400 block">Total VMs</span>
                  <span className="text-lg font-bold text-white">{totalAzure}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Running</span>
                  <span className="text-lg font-bold text-emerald-400">{runningAzure}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Stopped</span>
                  <span className="text-lg font-bold text-slate-400">{totalAzure - runningAzure}</span>
                </div>
              </div>

              <div className="space-y-2">
                {filteredAzureVMs.slice(0, 4).map((vm) => (
                  <div
                    key={vm.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1628]/60 border border-[#1E293B]/70 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          (vm.powerState || '').toLowerCase().includes('running')
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-200 truncate">{vm.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        ({vm.vmSize || 'Standard'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-300 font-medium">
                        CPU: {vm.cpuUsage !== undefined ? `${vm.cpuUsage.toFixed(1)}%` : '0%'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          (vm.powerState || '').toLowerCase().includes('running')
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {(vm.powerState || '').replace('PowerState/', '') || 'Unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
