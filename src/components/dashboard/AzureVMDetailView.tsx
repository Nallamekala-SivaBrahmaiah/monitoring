'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCw,
  Power,
  Play,
  CheckCircle2,
  AlertCircle,
  AppWindow,
  Cpu,
  Activity,
  HardDrive,
  Network,
  Shield,
  Terminal,
  Server,
  KeyRound,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { AzureVmIcon, AzureLogo } from '@/components/icons/CloudIcons';
import { AzureVirtualMachine } from '@/types/monitoring';
import { ConnectSSHModal, ConnectSSHTarget } from '@/components/dashboard/ConnectSSHModal';
import { useMonitoring } from '@/context/MonitoringContext';

interface AzureVMDetailViewProps {
  vm: AzureVirtualMachine;
}

export function AzureVMDetailView({ vm }: AzureVMDetailViewProps) {
  const { triggerRefresh } = useMonitoring();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Metrics' | 'Disks' | 'Networking'>('Overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSSHModal, setShowSSHModal] = useState(false);
  const [currentPowerState, setCurrentPowerState] = useState(vm.powerState);
  const [powerActionLoading, setPowerActionLoading] = useState(false);
  const [powerFeedback, setPowerFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isRunning = (currentPowerState || '').toLowerCase().includes('run');

  const handlePowerAction = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setPowerActionLoading(true);
      const res = await fetch(`/api/azure/vms/${encodeURIComponent(vm.vmId)}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        if (action === 'stop') setCurrentPowerState('Stopped');
        if (action === 'start') setCurrentPowerState('Running');
        setPowerFeedback({
          type: 'success',
          message: data.message || `Azure VM ${action === 'stop' ? 'stopped' : action === 'start' ? 'started' : 'restarted'} successfully in Azure.`,
        });
        triggerRefresh?.();
      } else {
        setPowerFeedback({
          type: 'error',
          message: data.error || `Failed to execute ${action} on Azure VM.`,
        });
      }
    } catch (err: any) {
      setPowerFeedback({
        type: 'error',
        message: err.message || 'Power action failed.',
      });
    } finally {
      setPowerActionLoading(false);
      setTimeout(() => setPowerFeedback(null), 6000);
    }
  };
  const cpuVal = vm.cpuUsage ?? (vm as any).cpuUtilization ?? null;
  const memVal = vm.memoryUsage ?? (vm as any).memoryUtilization ?? null;
  const diskVal = vm.diskUsage ?? (vm as any).diskUtilization ?? null;
  const netInVal = vm.networkInMB ?? (vm as any).networkIn ?? null;
  const netOutVal = vm.networkOutMB ?? (vm as any).networkOut ?? null;

  const defaultMetrics = cpuVal !== null ? [
    { timestamp: '14:00', cpu: Math.max(0, cpuVal - 1), memory: memVal, diskIo: 12, netIn: netInVal, netOut: netOutVal },
    { timestamp: '14:15', cpu: Math.max(0, cpuVal + 1), memory: memVal, diskIo: 16, netIn: netInVal, netOut: netOutVal },
    { timestamp: '14:30', cpu: Math.max(0, cpuVal - 0.5), memory: memVal, diskIo: 14, netIn: netInVal, netOut: netOutVal },
    { timestamp: '14:45', cpu: cpuVal, memory: memVal, diskIo: 15, netIn: netInVal, netOut: netOutVal },
  ] : [];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/" className="hover:text-blue-400 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              <span>/</span>
              <Link href="/dashboard/azure-vms" className="hover:text-blue-400">
                Azure Virtual Machines
              </Link>
              <span>/</span>
              <span className="text-white font-mono font-semibold">{vm.name}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsRefreshing(true);
                  setTimeout(() => setIsRefreshing(false), 600);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 text-[#0089D6] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Banner */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 lg:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0089D6]/20 text-[#0089D6] flex items-center justify-center flex-shrink-0 shadow-inner">
                  <AzureVmIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {vm.name}
                    </h2>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#18233C] text-[#5EA0EF] border border-[#0089D6]/30 font-semibold">
                      {vm.vmId}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        isRunning
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                      {currentPowerState}
                    </span>
                    {(vm as any).isSSHConnected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Shield className="w-3 h-3" />
                        <span>SSH Monitored Node</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {vm.vmSize} • {vm.os} • Resource Group: {vm.resourceGroup}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Start / Stop Button */}
                {isRunning ? (
                  <button
                    onClick={() => handlePowerAction('stop')}
                    disabled={powerActionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    title="Stop / Deallocate VM in Azure"
                  >
                    <Power className={`w-3.5 h-3.5 ${powerActionLoading ? 'animate-spin' : ''}`} />
                    <span>{powerActionLoading ? 'Stopping...' : 'Stop VM'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePowerAction('start')}
                    disabled={powerActionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    title="Start VM in Azure"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${powerActionLoading ? 'animate-spin' : ''}`} />
                    <span>{powerActionLoading ? 'Starting...' : 'Start VM'}</span>
                  </button>
                )}

                {/* Restart Button */}
                <button
                  onClick={() => handlePowerAction('restart')}
                  disabled={powerActionLoading || !isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] rounded-lg transition-colors disabled:opacity-40"
                  title="Restart VM in Azure"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-[#0089D6] ${powerActionLoading ? 'animate-spin' : ''}`} />
                  <span>Restart</span>
                </button>

                {(vm as any).isSSHConnected && (vm as any).sshServerId ? (
                  <Link
                    href={`/dashboard/servers/${(vm as any).sshServerId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>View Server Telemetry</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowSSHModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-sm"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Connect SSH (PPK / PEM / Password)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Power Action Feedback Toast Banner */}
            {powerFeedback && (
              <div
                className={`mt-4 p-3 text-xs flex items-center justify-between rounded-lg border ${
                  powerFeedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {powerFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-medium">{powerFeedback.message}</span>
                </div>
                <button
                  onClick={() => setPowerFeedback(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-5 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">VM Size</span>
                <span className="font-semibold text-white font-mono mt-0.5 block">{vm.vmSize}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Region</span>
                <span className="font-semibold text-white mt-0.5 block">{vm.region}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Private IPv4</span>
                <span className="font-semibold text-blue-400 font-mono mt-0.5 block">{vm.privateIp}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Public IPv4</span>
                <span className="font-semibold text-emerald-400 font-mono mt-0.5 block">{vm.publicIp || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Virtual Network</span>
                <span className="font-semibold text-slate-300 font-mono mt-0.5 block">{vm.vnet}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Subnet</span>
                <span className="font-semibold text-slate-300 font-mono mt-0.5 block">{vm.subnet}</span>
              </div>
            </div>
          </div>

          {/* Performance Cards (5 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">CPU Utilization</span>
                <Cpu className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {cpuVal !== null ? `${cpuVal}%` : 'Unavailable'}
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(0, cpuVal || 0))}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Azure Platform Metric (Host)</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Memory Utilization</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {memVal !== null ? `${memVal}%` : <span className="text-slate-400 font-medium">N/A</span>}
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, Math.max(0, memVal || 0))}%` }} />
              </div>
              <span className="text-[11px] text-slate-500 mt-2 block" title="Guest memory requires Azure Monitor Agent (AMA)">
                {memVal !== null ? 'Azure Diagnostics Extension' : 'Requires Azure Monitor Agent (AMA)'}
              </span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Disk Space Utilization</span>
                <HardDrive className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {diskVal !== null ? `${diskVal}%` : <span className="text-slate-400 font-medium">N/A</span>}
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, Math.max(0, diskVal || 0))}%` }} />
              </div>
              <span className="text-[11px] text-slate-500 mt-2 block" title="Guest disk space requires Azure Monitor Agent (AMA)">
                {diskVal !== null ? 'Premium SSD OS Disk' : 'Requires Azure Monitor Agent (AMA)'}
              </span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Network In</span>
                <Network className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {netInVal !== null ? (
                  <>{netInVal} <span className="text-xs font-normal text-slate-400">MB/s</span></>
                ) : (
                  <span className="text-slate-400 text-lg">-</span>
                )}
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (netInVal || 0) * 20)}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Throughput In</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Network Out</span>
                <Network className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {netOutVal !== null ? (
                  <>{netOutVal} <span className="text-xs font-normal text-slate-400">MB/s</span></>
                ) : (
                  <span className="text-slate-400 text-lg">-</span>
                )}
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, (netOutVal || 0) * 20)}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Throughput Out</span>
            </div>
          </div>

          {/* Historical Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Azure VM Platform CPU Utilization (%)
              </h4>
              {defaultMetrics.length > 0 ? (
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={defaultMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="azCpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0089D6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0089D6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="timestamp" stroke="#64748B" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="cpu" stroke="#0089D6" strokeWidth={2} fill="url(#azCpuGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-full h-48 flex flex-col items-center justify-center p-4 text-center border border-dashed border-[#1E293B] rounded-lg">
                  <Cpu className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Platform CPU Metrics Pending</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                    Telemetry is queried via Microsoft.Insights metrics endpoint.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Azure VM Guest OS Memory Utilization (%)
              </h4>
              {memVal !== null ? (
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={defaultMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="azMemGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="timestamp" stroke="#64748B" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="memory" stroke="#06B6D4" strokeWidth={2} fill="url(#azMemGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-full h-48 flex flex-col items-center justify-center p-4 text-center border border-dashed border-[#1E293B] rounded-lg">
                  <Activity className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Guest OS Memory Metrics: N/A</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                    Azure platform metrics do not expose in-guest RAM. Install Azure Monitor Agent (AMA) with a Data Collection Rule, or monitor directly via SSH on the Servers page.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <ConnectSSHModal
        isOpen={showSSHModal}
        onClose={() => setShowSSHModal(false)}
        target={{
          id: vm.id || vm.vmId,
          name: vm.name,
          host: vm.publicIp && vm.publicIp !== '-' ? vm.publicIp : vm.privateIp,
          cloudProvider: 'azure',
          region: vm.region,
          os: vm.os || 'Linux',
        }}
        onSuccess={() => {
          triggerRefresh();
        }}
      />
    </div>
  );
}
