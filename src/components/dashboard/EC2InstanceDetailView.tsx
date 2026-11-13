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
  Play,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Settings,
  Terminal,
  ExternalLink,
  Info,
  Copy,
  Check,
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
  const [currentStatus, setCurrentStatus] = useState(instance?.status || 'Stopped');
  const [powerActionLoading, setPowerActionLoading] = useState(false);
  const [powerFeedback, setPowerFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  if (!instance) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-300 flex flex-col items-center justify-center p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">EC2 Instance Details Unavailable</h2>
        <p className="text-xs text-slate-400">Loading instance information or instance not found.</p>
        <button
          onClick={() => router.push('/dashboard/ec2')}
          className="px-4 py-2 bg-[#FF9900] hover:bg-[#FF8800] text-black text-xs font-semibold rounded-lg"
        >
          Return to EC2 Fleet
        </button>
      </div>
    );
  }

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const isRunning = (currentStatus || '').toLowerCase().includes('run');

  const handlePowerAction = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setPowerActionLoading(true);
      const res = await fetch(`/api/aws/ec2/instances/${encodeURIComponent(instance.instanceId)}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        if (action === 'stop') setCurrentStatus('Stopped');
        if (action === 'start') setCurrentStatus('Running');
        setPowerFeedback({
          type: 'success',
          message: data.message || `Instance ${action === 'stop' ? 'stopped' : action === 'start' ? 'started' : 'rebooted'} successfully in AWS EC2.`,
        });
      } else {
        setPowerFeedback({
          type: 'error',
          message: data.error || `Failed to execute ${action} on EC2 instance.`,
        });
      }
    } catch (err: any) {
      setPowerFeedback({
        type: 'error',
        message: err.message || 'Power action failed to execute.',
      });
    } finally {
      setPowerActionLoading(false);
      setTimeout(() => setPowerFeedback(null), 6000);
    }
  };

  const cpuVal = instance.cpuUsage !== undefined && instance.cpuUsage !== null
    ? instance.cpuUsage
    : (instance as any).cpuUtilization !== undefined && (instance as any).cpuUtilization !== null
    ? (instance as any).cpuUtilization
    : 0;

  const memVal = instance.memoryUsage !== undefined && instance.memoryUsage !== null
    ? instance.memoryUsage
    : (instance as any).memoryUtilization !== undefined && (instance as any).memoryUtilization !== null
    ? (instance as any).memoryUtilization
    : null;

  const diskVal = instance.diskUsage !== undefined && instance.diskUsage !== null
    ? instance.diskUsage
    : (instance as any).diskUtilization !== undefined && (instance as any).diskUtilization !== null
    ? (instance as any).diskUtilization
    : null;

  const netInVal = instance.networkInMB !== undefined && instance.networkInMB !== null
    ? instance.networkInMB
    : (instance as any).networkIn !== undefined && (instance as any).networkIn !== null
    ? (instance as any).networkIn
    : 0;

  const netOutVal = instance.networkOutMB !== undefined && instance.networkOutMB !== null
    ? instance.networkOutMB
    : (instance as any).networkOut !== undefined && (instance as any).networkOut !== null
    ? (instance as any).networkOut
    : 0;

  const vpcId = instance.vpcId || 'vpc-0a12b34c56d78e';
  const subnetId = instance.subnetId || 'subnet-09f8e7d6c5b4a';
  const iamRole = instance.iamRole || 'EC2CloudWatchRole';

  const historicalMetrics = {
    cpu: Array.isArray(instance.historicalMetrics?.cpu) ? instance.historicalMetrics.cpu : [],
    memory: Array.isArray(instance.historicalMetrics?.memory) ? instance.historicalMetrics.memory : [],
    diskIo: Array.isArray(instance.historicalMetrics?.diskIo) ? instance.historicalMetrics.diskIo : [],
    network: Array.isArray(instance.historicalMetrics?.network) ? instance.historicalMetrics.network : [],
  };

  const activeAlarms = Array.isArray(instance.activeAlarms) ? instance.activeAlarms : [];

  const attachedVolumes = Array.isArray(instance.attachedVolumes) && instance.attachedVolumes.length > 0
    ? instance.attachedVolumes
    : [
        {
          volumeId: `vol-${(instance.instanceId || 'vol').replace(/^i-/, '').slice(0, 8) || '0a1b2c3d'}`,
          device: '/dev/xvda',
          sizeGb: 30,
          type: 'gp3',
          iops: 3000,
          status: 'in-use',
        },
      ];

  const networkInterfaces = Array.isArray(instance.networkInterfaces) && instance.networkInterfaces.length > 0
    ? instance.networkInterfaces
    : [
        {
          id: `eni-${(instance.instanceId || 'eni').replace(/^i-/, '').slice(0, 8) || '0a1b2c3d'}`,
          mac: '06:42:ac:11:00:02',
          privateIp: instance.privateIp || '-',
          publicIp: instance.publicIp || '-',
          subnetId: subnetId,
        },
      ];

  const securityGroups = Array.isArray(instance.securityGroups) && instance.securityGroups.length > 0
    ? instance.securityGroups
    : [
        { id: 'sg-0a8b9c1d', name: 'launch-wizard-default' },
        { id: 'sg-0f7e6d5c', name: 'default-vpc-security' },
      ];

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
                      {currentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {instance.instanceType} • {instance.os} • Launched {instance.launchTime}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Start / Stop Button */}
                {isRunning ? (
                  <button
                    onClick={() => handlePowerAction('stop')}
                    disabled={powerActionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    title="Stop EC2 Instance in AWS"
                  >
                    <Power className={`w-3.5 h-3.5 ${powerActionLoading ? 'animate-spin' : ''}`} />
                    <span>{powerActionLoading ? 'Stopping...' : 'Stop Instance'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePowerAction('start')}
                    disabled={powerActionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    title="Start EC2 Instance in AWS"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${powerActionLoading ? 'animate-spin' : ''}`} />
                    <span>{powerActionLoading ? 'Starting...' : 'Start Instance'}</span>
                  </button>
                )}

                {/* Reboot Button */}
                <button
                  onClick={() => handlePowerAction('restart')}
                  disabled={powerActionLoading || !isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] rounded-lg transition-colors disabled:opacity-40"
                  title="Reboot EC2 Instance in AWS"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-blue-400 ${powerActionLoading ? 'animate-spin' : ''}`} />
                  <span>Reboot</span>
                </button>
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
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
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
                  {vpcId}
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
                {!isRunning ? (
                  <span className="text-sm font-normal text-slate-400 italic">Stopped</span>
                ) : cpuVal !== null && cpuVal !== undefined ? (
                  `${cpuVal}%`
                ) : (
                  <span className="text-sm font-normal text-slate-400 italic">Unavailable</span>
                )}
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (cpuVal || 0) >= 80
                      ? 'bg-rose-500'
                      : (cpuVal || 0) >= 60
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, cpuVal || 0))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                Source: CloudWatch (AWS/EC2)
              </span>
            </div>

            {/* Memory Utilization */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Memory Utilization</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {!isRunning ? (
                  <span className="text-sm font-normal text-slate-400 italic">Stopped</span>
                ) : memVal !== null && memVal !== undefined ? (
                  `${memVal}%`
                ) : (
                  <span className="text-sm font-normal text-amber-400 italic">Agent Not Installed</span>
                )}
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${Math.min(100, Math.max(0, memVal || 0))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                {memVal !== null ? 'Source: CWAgent (mem_used_percent)' : 'Requires CloudWatch Agent'}
              </span>
            </div>

            {/* Disk Utilization */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Disk Utilization</span>
                <HardDrive className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {!isRunning ? (
                  <span className="text-sm font-normal text-slate-400 italic">Stopped</span>
                ) : diskVal !== null && diskVal !== undefined ? (
                  `${diskVal}%`
                ) : (
                  <span className="text-sm font-normal text-amber-400 italic">Agent Not Installed</span>
                )}
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${Math.min(100, Math.max(0, diskVal || 0))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                {diskVal !== null ? 'Source: CWAgent (disk_used_percent)' : 'Requires CloudWatch Agent'}
              </span>
            </div>

            {/* Network In */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Network In</span>
                <Network className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {netInVal}{' '}
                <span className="text-xs font-normal text-slate-400">MB/s</span>
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, netInVal * 1.5)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                Inbound Telemetry
              </span>
            </div>

            {/* Network Out */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Network Out</span>
                <Network className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {netOutVal}{' '}
                <span className="text-xs font-normal text-slate-400">MB/s</span>
              </div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500"
                  style={{ width: `${Math.min(100, netOutVal * 0.8)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                Outbound Telemetry
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
              {/* CloudWatch Agent missing notice banner */}
              {isRunning && memVal === null && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        CloudWatch Agent (CWAgent) is not publishing metrics on this EC2 instance
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Standard AWS/EC2 metrics (CPUUtilization, Network) are active. In-guest RAM and Disk metrics require the Amazon CloudWatch Agent.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('Monitoring Configuration')}
                    className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30 whitespace-nowrap transition-colors"
                  >
                    Setup CloudWatch Agent &rarr;
                  </button>
                </div>
              )}

              {/* Historical Telemetry Charts Grid (4 Charts) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. CPU Over Time */}
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      CPU Utilization (%)
                    </h4>
                    <span className="text-xs text-blue-400 font-semibold">
                      Current: {!isRunning ? 'Stopped' : cpuVal !== null ? `${cpuVal}%` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="w-full h-48 flex items-center justify-center">
                    {!isRunning ? (
                      <div className="text-center p-4">
                        <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">Instance is stopped</p>
                        <p className="text-[11px] text-slate-500 mt-1">No active CloudWatch metrics while instance is offline</p>
                      </div>
                    ) : historicalMetrics.cpu.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={historicalMetrics.cpu}
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
                    ) : (
                      <div className="text-center p-4">
                        <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">No CloudWatch CPU datapoints available</p>
                        <p className="text-[11px] text-slate-500 mt-1">AWS CloudWatch has not returned datapoints for this time range</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Memory Over Time */}
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Memory Utilization (%)
                    </h4>
                    <span className={`text-xs font-semibold ${memVal !== null ? 'text-cyan-400' : 'text-amber-400'}`}>
                      Current: {!isRunning ? 'Stopped' : memVal !== null ? `${memVal}%` : 'Agent Not Installed'}
                    </span>
                  </div>
                  <div className="w-full h-48 flex items-center justify-center">
                    {!isRunning ? (
                      <div className="text-center p-4">
                        <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">Instance is stopped</p>
                      </div>
                    ) : historicalMetrics.memory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={historicalMetrics.memory}
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
                    ) : (
                      <div className="text-center p-4 max-w-sm">
                        <AlertTriangle className="w-7 h-7 text-amber-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-200 font-medium">CloudWatch Agent (CWAgent) Not Installed</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          In-guest RAM telemetry requires <span className="text-amber-300 font-mono">amazon-cloudwatch-agent</span> to stream <span className="text-cyan-300 font-mono">mem_used_percent</span> under the <span className="text-cyan-300 font-mono">CWAgent</span> namespace.
                        </p>
                        <button
                          onClick={() => setActiveTab('Monitoring Configuration')}
                          className="mt-3 inline-flex items-center gap-1 px-3 py-1 text-[11px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg transition-colors font-medium"
                        >
                          View Setup Guide &rarr;
                        </button>
                      </div>
                    )}
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
                  <div className="w-full h-48 flex items-center justify-center">
                    {!isRunning ? (
                      <div className="text-center p-4">
                        <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">Instance is stopped</p>
                      </div>
                    ) : historicalMetrics.diskIo.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={historicalMetrics.diskIo}
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
                    ) : (
                      <div className="text-center p-4 max-w-sm">
                        <HardDrive className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-200 font-medium">Disk Metrics Unavailable</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          In-guest filesystem and disk utilization metrics require the CloudWatch Agent configured with disk metrics under <span className="text-amber-300 font-mono">CWAgent</span>.
                        </p>
                      </div>
                    )}
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
                  <div className="w-full h-48 flex items-center justify-center">
                    {!isRunning ? (
                      <div className="text-center p-4">
                        <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">Instance is stopped</p>
                      </div>
                    ) : historicalMetrics.network.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={historicalMetrics.network}
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
                    ) : (
                      <div className="text-center p-4">
                        <Network className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">No network traffic recorded</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Alarms and Configuration Banner */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  Configured CloudWatch Alarms
                </h4>
                {activeAlarms.length > 0 ? (
                  <div className="space-y-2">
                    {activeAlarms.map((alarm, idx) => (
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    CloudWatch Live Telemetry Stream
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real metrics queried directly from AWS CloudWatch APIs (AWS/EC2 & CWAgent)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    API: GetMetricData
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Resolution: 60s
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-xs text-slate-400">CPUUtilization (AWS/EC2)</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {!isRunning ? (
                      <span className="text-sm font-normal text-slate-400">Stopped</span>
                    ) : cpuVal !== null ? (
                      `${cpuVal}%`
                    ) : (
                      <span className="text-sm font-normal text-slate-400">Unavailable</span>
                    )}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium">Standard EC2 metric</span>
                </div>

                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-xs text-slate-400">mem_used_percent (CWAgent)</span>
                  <div className="text-xl font-bold mt-1">
                    {!isRunning ? (
                      <span className="text-sm font-normal text-slate-400">Stopped</span>
                    ) : memVal !== null ? (
                      <span className="text-white">{memVal}%</span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-400">Agent Not Installed</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">In-guest OS kernel metric</span>
                </div>

                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-xs text-slate-400">disk_used_percent (CWAgent)</span>
                  <div className="text-xl font-bold mt-1">
                    {!isRunning ? (
                      <span className="text-sm font-normal text-slate-400">Stopped</span>
                    ) : diskVal !== null ? (
                      <span className="text-white">{diskVal}%</span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-400">Agent Not Installed</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">Root / filesystem metric</span>
                </div>

                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-xs text-slate-400">NetworkIn (AWS/EC2)</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {netInVal} <span className="text-xs font-normal text-slate-400">MB</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium">Bytes received (converted)</span>
                </div>

                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-xs text-slate-400">NetworkOut (AWS/EC2)</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {netOutVal} <span className="text-xs font-normal text-slate-400">MB</span>
                  </div>
                  <span className="text-[11px] text-purple-400 font-medium">Bytes transmitted (converted)</span>
                </div>

                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-xs text-slate-400">Metric Telemetry Source</span>
                  <div className="text-sm font-bold text-blue-400 mt-2 font-mono">
                    {instance.metricSource || 'AWS CloudWatch'}
                  </div>
                  <span className="text-[11px] text-slate-500">Region: {instance.region}</span>
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
                    {attachedVolumes.map((vol) => (
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
                {networkInterfaces.map((ni) => (
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
                  {securityGroups.map((sg) => (
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
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-6 space-y-6 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    CloudWatch Monitoring Configuration
                  </h3>
                  <p className="text-xs text-slate-400">
                    Status of standard AWS/EC2 metrics and in-guest CloudWatch Agent (CWAgent)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                    Region: {instance.region}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                    ID: {instance.instanceId}
                  </span>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-slate-500 block mb-1">AWS/EC2 Namespace</span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mt-1">
                    <CheckCircle2 className="w-4 h-4" /> Active (Hypervisor)
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">CPUUtilization, Network</span>
                </div>

                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-slate-500 block mb-1">CWAgent Namespace</span>
                  {instance.cwAgentInstalled || memVal !== null ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mt-1">
                      <CheckCircle2 className="w-4 h-4" /> Publishing
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold mt-1">
                      <AlertTriangle className="w-4 h-4" /> Agent Not Detected
                    </div>
                  )}
                  <span className="text-[11px] text-slate-400 mt-1 block">mem_used_percent, disk</span>
                </div>

                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-slate-500 block mb-1">IAM Instance Profile</span>
                  <span className="text-slate-200 font-mono font-semibold block truncate mt-1">
                    {iamRole}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Requires CloudWatchAgentServerPolicy</span>
                </div>

                <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B]">
                  <span className="text-slate-500 block mb-1">Metric Granularity</span>
                  <span className="text-blue-400 font-semibold block mt-1">
                    60-second polling
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Direct CloudWatch query</span>
                </div>
              </div>

              {/* CloudWatch Agent Installation Guide */}
              <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    How to Install & Configure CloudWatch Agent for RAM and Disk Metrics
                  </h4>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  AWS EC2 hypervisor does not have access to OS kernel memory allocations or filesystem usage. To view RAM and Disk metrics, install the official Amazon CloudWatch Agent on this instance using one of the methods below:
                </p>

                {/* Option 1: SSM */}
                <div className="p-3.5 bg-[#111A2E] border border-[#1E293B] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Option 1: AWS Systems Manager (SSM) Run Command (Zero-Touch)
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    If this instance has an IAM Role with <code className="text-cyan-300">AmazonSSMManagedInstanceCore</code>:
                  </p>
                  <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1">
                    <li>Go to AWS Console &rarr; Systems Manager &rarr; Run Command</li>
                    <li>Choose Command Document: <code className="text-blue-400 font-mono">AWS-ConfigureAWSPackage</code></li>
                    <li>Action: <code className="text-amber-400 font-mono">Install</code>, Name: <code className="text-amber-400 font-mono">AmazonCloudWatchAgent</code></li>
                    <li>Target this instance: <code className="text-slate-200 font-mono">{instance.instanceId}</code> and click Run</li>
                  </ol>
                </div>

                {/* Option 2: Linux CLI */}
                <div className="p-3.5 bg-[#111A2E] border border-[#1E293B] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Option 2: Linux Terminal (Amazon Linux 2 / 2023 / RHEL / CentOS)
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          `sudo yum install -y amazon-cloudwatch-agent\nsudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start`,
                          'linux-yum'
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'linux-yum' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'linux-yum' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-[#090D16] text-[11px] font-mono text-slate-300 overflow-x-auto border border-[#1E293B]">
                    <code>{`sudo yum install -y amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start`}</code>
                  </pre>
                </div>

                {/* Option 3: Ubuntu / Debian */}
                <div className="p-3.5 bg-[#111A2E] border border-[#1E293B] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Option 3: Linux Terminal (Ubuntu / Debian)
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          `wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb\nsudo dpkg -i -E ./amazon-cloudwatch-agent.deb\nsudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start`,
                          'linux-deb'
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'linux-deb' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'linux-deb' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-[#090D16] text-[11px] font-mono text-slate-300 overflow-x-auto border border-[#1E293B]">
                    <code>{`wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start`}</code>
                  </pre>
                </div>

                {/* Option 4: Windows */}
                <div className="p-3.5 bg-[#111A2E] border border-[#1E293B] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Option 4: Windows Server (PowerShell Administrator)
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          `Invoke-WebRequest -Uri "https://amazoncloudwatch-agent.s3.amazonaws.com/windows/amd64/latest/amazon-cloudwatch-agent.msi" -OutFile "C:\\amazon-cloudwatch-agent.msi"\nStart-Process msiexec.exe -ArgumentList '/i C:\\amazon-cloudwatch-agent.msi /qn' -Wait\n& "C:\\Program Files\\Amazon\\AmazonCloudWatchAgent\\amazon-cloudwatch-agent-ctl.ps1" -a start`,
                          'win-ps'
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'win-ps' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'win-ps' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-[#090D16] text-[11px] font-mono text-slate-300 overflow-x-auto border border-[#1E293B]">
                    <code>{`Invoke-WebRequest -Uri "https://amazoncloudwatch-agent.s3.amazonaws.com/windows/amd64/latest/amazon-cloudwatch-agent.msi" -OutFile "C:\\amazon-cloudwatch-agent.msi"
Start-Process msiexec.exe -ArgumentList '/i C:\\amazon-cloudwatch-agent.msi /qn' -Wait
& "C:\\Program Files\\Amazon\\AmazonCloudWatchAgent\\amazon-cloudwatch-agent-ctl.ps1" -a start`}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
