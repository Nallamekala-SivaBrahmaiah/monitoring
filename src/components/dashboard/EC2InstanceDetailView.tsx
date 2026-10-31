'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Server,
  Cpu,
  HardDrive,
  Activity,
  Network,
  Shield,
  Clock,
  RotateCw,
  Power,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Settings,
  Terminal,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { AiAssistantDrawer } from '@/components/dashboard/AiAssistantDrawer';
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
import { Ec2Icon, AwsLogo } from '@/components/icons/CloudIcons';
import { EC2InstanceDetail, TimeRange } from '@/types/monitoring';

interface EC2InstanceDetailViewProps {
  instance: EC2InstanceDetail;
}

export function EC2InstanceDetailView({ instance }: EC2InstanceDetailViewProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    'Overview' | 'Metrics' | 'Storage' | 'Network' | 'Monitoring Configuration'
  >('Overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('10s');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const isRunning = instance.status === 'Running';

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />


        <main className="p-4 lg:p-8 space-y-6">
          {/* Breadcrumbs & Navigation Back */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link
                href="/"
                className="hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              <span>/</span>
              <Link
                href="/dashboard/ec2"
                className="hover:text-blue-400 transition-colors"
              >
                EC2 Instances
              </Link>
              <span>/</span>
              <span className="text-white font-mono font-semibold">
                {instance.instanceId}
              </span>
            </div>

            {/* Controls: Auto Refresh & Refresh Button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] text-xs">
                <span className="text-slate-400">Auto Refresh:</span>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`w-7 h-4 rounded-full transition-colors relative ${
                    autoRefresh ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                      autoRefresh ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(e.target.value)}
                    aria-label="Auto refresh interval"
                    className="bg-transparent text-slate-300 font-semibold text-xs focus:outline-none"
                  >
                    <option value="5s" className="bg-[#111A2E]">5s</option>
                    <option value="10s" className="bg-[#111A2E]">10s</option>
                    <option value="30s" className="bg-[#111A2E]">30s</option>
                  </select>
                )}
              </div>

              <button
                onClick={handleManualRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors shadow-sm"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 text-blue-400 ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Instance Identity Header Banner */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 lg:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Ec2Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {instance.name}
                    </h2>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#18233C] text-blue-400 border border-blue-500/20 font-semibold">
                      {instance.instanceId}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        isRunning
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {instance.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {instance.instanceType} • {instance.os} • Launched {instance.launchTime}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setAiDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg shadow-sm shadow-blue-500/25 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Troubleshoot with AI</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] rounded-lg transition-colors">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Connect (SSH)</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] rounded-lg transition-colors">
                  <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Reboot</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors">
                  <Power className="w-3.5 h-3.5" />
                  <span>Stop Instance</span>
                </button>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-5 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Instance Type</span>
                <span className="font-semibold text-white font-mono mt-0.5 block">
                  {instance.instanceType}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">AWS Region</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {instance.region}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Availability Zone</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {instance.availabilityZone}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Private IPv4</span>
                <span className="font-semibold text-blue-400 font-mono mt-0.5 block">
                  {instance.privateIp}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Public IPv4</span>
                <span className="font-semibold text-emerald-400 font-mono mt-0.5 block">
                  {instance.publicIp}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">VPC ID</span>
                <span className="font-semibold text-slate-300 font-mono mt-0.5 block">
                  {instance.vpcId}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Cards Row (5 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* CPU Utilization */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">CPU Utilization</span>
                <Cpu className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {instance.cpuUsage}%
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    instance.cpuUsage >= 80
                      ? 'bg-rose-500'
                      : instance.cpuUsage >= 60
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${instance.cpuUsage}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                Avg: 68% • Max: 81%
              </span>
            </div>

            {/* Memory Utilization */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Memory Utilization</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {instance.memoryUsage}%
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${instance.memoryUsage}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                10.9 GB / 16.0 GB used
              </span>
            </div>

            {/* Disk Utilization */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Disk Utilization</span>
                <HardDrive className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {instance.diskUsage}%
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${instance.diskUsage}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                262.5 GB / 350 GB
              </span>
            </div>

            {/* Network In */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Network In</span>
                <Network className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {instance.networkInMB}{' '}
                <span className="text-xs font-normal text-slate-400">MB/s</span>
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, instance.networkInMB * 1.5)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                Peak: 50.2 MB/s
              </span>
            </div>

            {/* Network Out */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Network Out</span>
                <Network className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {instance.networkOutMB}{' '}
                <span className="text-xs font-normal text-slate-400">MB/s</span>
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500"
                  style={{ width: `${Math.min(100, instance.networkOutMB * 0.8)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                Peak: 135.0 MB/s
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-[#1E293B] flex items-center gap-2 overflow-x-auto">
            {(
              [
                'Overview',
                'Metrics',
                'Storage',
                'Network',
                'Monitoring Configuration',
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content 1: Overview */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              {/* Historical Telemetry Charts Grid (4 Charts) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. CPU Over Time */}
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      CPU Utilization (%)
                    </h4>
                    <span className="text-xs text-blue-400 font-semibold">
                      Current: {instance.cpuUsage}%
                    </span>
                  </div>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={instance.historicalMetrics.cpu}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#0D1526] border border-[#1E293B] px-3 py-1.5 rounded-lg text-xs shadow-lg">
                                  <span className="text-slate-400">{label}: </span>
                                  <span className="text-blue-400 font-bold">{payload[0].value}%</span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          fill="url(#cpuGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Memory Over Time */}
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Memory Utilization (%)
                    </h4>
                    <span className="text-xs text-cyan-400 font-semibold">
                      Current: {instance.memoryUsage}%
                    </span>
                  </div>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={instance.historicalMetrics.memory}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#0D1526] border border-[#1E293B] px-3 py-1.5 rounded-lg text-xs shadow-lg">
                                  <span className="text-slate-400">{label}: </span>
                                  <span className="text-cyan-400 font-bold">{payload[0].value}%</span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#06B6D4"
                          strokeWidth={2}
                          fill="url(#memGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. Disk Read / Write (MB/s) */}
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Disk I/O Traffic (Read vs Write MB)
                    </h4>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Read
                      </span>
                      <span className="flex items-center gap-1 text-orange-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-orange-500" /> Write
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={instance.historicalMetrics.diskIo}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#0D1526] border border-[#1E293B] px-3 py-1.5 rounded-lg text-xs shadow-lg">
                                  <div className="text-slate-400 mb-1">{label}</div>
                                  <div className="text-amber-400">Read: {payload[0]?.value} MB</div>
                                  <div className="text-orange-400">Write: {payload[1]?.value} MB</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="readMB"
                          stroke="#F59E0B"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="writeMB"
                          stroke="#EA580C"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 4. Network In vs Out Traffic */}
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Network Traffic (In vs Out MB)
                    </h4>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> In
                      </span>
                      <span className="flex items-center gap-1 text-purple-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-purple-400" /> Out
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={instance.historicalMetrics.network}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="netInGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="netOutGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#A855F7" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#0D1526] border border-[#1E293B] px-3 py-1.5 rounded-lg text-xs shadow-lg">
                                  <div className="text-slate-400 mb-1">{label}</div>
                                  <div className="text-emerald-400">In: {payload[0]?.value} MB</div>
                                  <div className="text-purple-400">Out: {payload[1]?.value} MB</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="inMB"
                          stroke="#10B981"
                          strokeWidth={2}
                          fill="url(#netInGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="outMB"
                          stroke="#A855F7"
                          strokeWidth={2}
                          fill="url(#netOutGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Alarms and Configuration Banner */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  Configured CloudWatch Alarms
                </h4>
                {instance.activeAlarms.length > 0 ? (
                  <div className="space-y-2">
                    {instance.activeAlarms.map((alarm, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#0D1526] border border-[#1E293B]"
                      >
                        <div className="flex items-center gap-3">
                          {alarm.status === 'ALARM' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                          <div>
                            <span className="text-xs font-semibold text-white">
                              {alarm.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              Condition: {alarm.metric}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            alarm.status === 'ALARM'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {alarm.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    No active alarms currently triggering on this instance.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab Content 2: Metrics */}
          {activeTab === 'Metrics' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    High Resolution Telemetry
                  </h3>
                  <p className="text-xs text-slate-400">
                    Detailed 1-minute metrics streamed via CloudWatch Agent
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Granularity: 60 Seconds
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-xs text-slate-400">CPU Credit Balance</span>
                  <div className="text-xl font-bold text-white mt-1">576.00</div>
                  <span className="text-[11px] text-emerald-400 font-medium">100% surplus</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-xs text-slate-400">EBS Read Ops</span>
                  <div className="text-xl font-bold text-white mt-1">2,480 ops/sec</div>
                  <span className="text-[11px] text-slate-400">Burst threshold: 3,000</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-xs text-slate-400">StatusCheckFailed (Any)</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">0</div>
                  <span className="text-[11px] text-emerald-400 font-medium">System checks passing</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Storage */}
          {activeTab === 'Storage' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-6">
              <h3 className="text-base font-semibold text-white mb-4">
                Attached EBS Storage Volumes
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-[#1E293B] text-slate-400 pb-2">
                      <th className="py-2.5 px-3">Volume ID</th>
                      <th className="py-2.5 px-3">Device</th>
                      <th className="py-2.5 px-3">Size (GiB)</th>
                      <th className="py-2.5 px-3">Volume Type</th>
                      <th className="py-2.5 px-3">IOPS</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                    {instance.attachedVolumes.map((vol) => (
                      <tr key={vol.volumeId} className="hover:bg-[#162238]/60">
                        <td className="py-3 px-3 font-mono text-blue-400">
                          {vol.volumeId}
                        </td>
                        <td className="py-3 px-3 font-mono">{vol.device}</td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {vol.sizeGb} GiB
                        </td>
                        <td className="py-3 px-3 uppercase text-slate-300">
                          {vol.type}
                        </td>
                        <td className="py-3 px-3">{vol.iops}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-400 font-semibold">
                            {vol.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content 4: Network */}
          {activeTab === 'Network' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-6 space-y-6">
              <h3 className="text-base font-semibold text-white">
                Network Interfaces & Security Groups
              </h3>

              <div className="space-y-4">
                {instance.networkInterfaces.map((ni) => (
                  <div
                    key={ni.id}
                    className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B] text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-blue-400 font-bold">
                        {ni.id}
                      </span>
                      <span className="text-slate-400 font-mono">MAC: {ni.mac}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-slate-300">
                      <div>
                        <span className="text-slate-500 block">Private IP</span>
                        <span className="font-mono text-white font-semibold">
                          {ni.privateIp}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Public IP</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {ni.publicIp || 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Subnet</span>
                        <span className="font-mono text-slate-300">{ni.subnetId}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                  Assigned Security Groups
                </h4>
                <div className="space-y-2">
                  {instance.securityGroups.map((sg) => (
                    <div
                      key={sg.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#0D1526] border border-[#1E293B] text-xs"
                    >
                      <span className="font-semibold text-slate-200">{sg.name}</span>
                      <span className="font-mono text-slate-400">{sg.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 5: Monitoring Configuration */}
          {activeTab === 'Monitoring Configuration' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-6 space-y-4 text-xs">
              <h3 className="text-base font-semibold text-white mb-2">
                Agent Telemetry Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-slate-500 block mb-1">Detailed Monitoring</span>
                  <span className="text-emerald-400 font-semibold">Enabled (1-min frequency)</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-slate-500 block mb-1">IAM Instance Profile</span>
                  <span className="text-slate-200 font-mono font-semibold">{instance.iamRole}</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-slate-500 block mb-1">Agent Version</span>
                  <span className="text-slate-200 font-semibold">amazon-cloudwatch-agent v1.300045.0</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-slate-500 block mb-1">Log Group Destination</span>
                  <span className="text-blue-400 font-mono font-semibold">/aws/ec2/production/{instance.name}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        initialContext={{
          resourceName: instance.name,
          resourceId: instance.instanceId,
          provider: 'aws',
          region: instance.region,
          status: instance.status,
          publicIp: instance.publicIp,
          metrics: {
            cpu: instance.cpuUsage,
            memory: instance.memoryUsage,
            disk: instance.diskUsage,
            netIn: instance.networkInMB,
            netOut: instance.networkOutMB,
          },
        }}
      />
    </div>
  );
}
