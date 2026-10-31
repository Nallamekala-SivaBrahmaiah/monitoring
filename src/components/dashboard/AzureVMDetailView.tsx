'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCw,
  Power,
  AppWindow,
  Cpu,
  Activity,
  HardDrive,
  Network,
  Shield,
  Terminal,
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

interface AzureVMDetailViewProps {
  vm: AzureVirtualMachine;
}

export function AzureVMDetailView({ vm }: AzureVMDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Metrics' | 'Disks' | 'Networking'>('Overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isRunning = vm.powerState === 'Running';

  const defaultMetrics = [
    { timestamp: '14:00', cpu: 38, memory: 55, diskIo: 12, netIn: 18, netOut: 50 },
    { timestamp: '14:10', cpu: 46, memory: 57, diskIo: 16, netIn: 22, netOut: 58 },
    { timestamp: '14:20', cpu: 52, memory: 58, diskIo: 24, netIn: 26, netOut: 64 },
    { timestamp: '14:30', cpu: 45, memory: 58, diskIo: 18, netIn: 21, netOut: 55 },
    { timestamp: '14:40', cpu: 42, memory: 58, diskIo: 14, netIn: 19, netOut: 52 },
    { timestamp: '14:50', cpu: vm.cpuUsage, memory: vm.memoryUsage, diskIo: 15, netIn: vm.networkInMB, netOut: vm.networkOutMB },
  ];

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
                      {vm.powerState}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {vm.vmSize} • {vm.os} • Resource Group: {vm.resourceGroup}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] rounded-lg">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Bastion SSH</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] rounded-lg">
                  <RotateCw className="w-3.5 h-3.5 text-[#0089D6]" />
                  <span>Restart</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg">
                  <Power className="w-3.5 h-3.5" />
                  <span>Stop VM</span>
                </button>
              </div>
            </div>

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
              <div className="text-2xl font-bold text-white mb-2">{vm.cpuUsage}%</div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${vm.cpuUsage}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Azure Host Telemetry</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Memory Utilization</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">{vm.memoryUsage}%</div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${vm.memoryUsage}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Azure Diagnostics Extension</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Disk Utilization</span>
                <HardDrive className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">{vm.diskUsage}%</div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${vm.diskUsage}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Premium SSD OS Disk</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Network In</span>
                <Network className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">{vm.networkInMB} <span className="text-xs font-normal text-slate-400">MB/s</span></div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, vm.networkInMB * 2)}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Throughput In</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Network Out</span>
                <Network className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">{vm.networkOutMB} <span className="text-xs font-normal text-slate-400">MB/s</span></div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, vm.networkOutMB * 1.2)}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Throughput Out</span>
            </div>
          </div>

          {/* Historical Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Azure VM CPU Utilization (%)
              </h4>
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
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Azure VM Memory Utilization (%)
              </h4>
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
