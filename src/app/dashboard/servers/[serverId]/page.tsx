'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Server,
  RefreshCw,
  Shield,
  Activity,
  HardDrive,
  Cpu,
  Layers,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Box,
  Trash2,
  Lock,
  Globe,
  Radio,
  Clock,
  Wifi,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { DockerIcon, KubernetesIcon } from '@/components/icons/CloudIcons';

interface ServerDetailProps {
  params: Promise<{ serverId: string }>;
}

function ServerDetailContent({ params }: ServerDetailProps) {
  const { serverId } = use(params);
  const router = useRouter();

  const [server, setServer] = useState<any>(null);
  const [recentMetrics, setRecentMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'docker' | 'kubernetes' | 'disks' | 'network' | 'security'>('overview');
  const [copiedToken, setCopiedToken] = useState(false);

  const fetchServerDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/servers/${serverId}`);
      if (res.ok) {
        const data = await res.json();
        setServer(data.server);
        setRecentMetrics(data.recentMetrics || []);
      } else {
        router.push('/dashboard/servers');
      }
    } catch (e) {
      console.warn('Error fetching server:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerDetails();
    // 30-second polling for live server updates
    const interval = setInterval(fetchServerDetails, 30000);
    return () => clearInterval(interval);
  }, [serverId]);

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch(`/api/servers/${serverId}/refresh`, { method: 'POST' });
      if (res.ok) {
        await fetchServerDetails();
      }
    } catch (e) {
      console.warn('Manual sync failed:', e);
    } finally {
      setSyncing(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteServer = async () => {
    try {
      setDeleting(true);
      const isProd = server?.environment === 'Production';
      const url = `/api/servers/${serverId}${isProd ? '?confirmed=true' : ''}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (res.ok) {
        router.push('/dashboard/servers');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to remove server');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to remove server');
    } finally {
      setDeleting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (loading && !server) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
        <Sidebar />
        <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
          <Header />
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex items-center gap-3 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span>Connecting and fetching real server telemetry...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
        <Sidebar />
        <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
          <Header />
          <div className="p-8 text-center text-slate-400">Server not found</div>
        </div>
      </div>
    );
  }

  const isProd = server.environment === 'Production';
  const cpuPercent = server.metrics?.cpu?.usagePercent || 0;
  const memPercent = server.metrics?.memory?.usagePercent || 0;
  const diskPercent = server.metrics?.disks?.[0]?.usagePercent || 0;

  // Chart data
  const chartPoints = recentMetrics.map((m: any) => ({
    time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    val: m.value,
  }));

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/dashboard/servers" className="hover:text-blue-400 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Servers</span>
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{server.name}</span>
          </div>

          {/* Header Card */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Server className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-white tracking-tight">{server.name}</h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      isProd
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : server.environment === 'Staging'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    }`}
                  >
                    {isProd && <Shield className="w-3 h-3" />}
                    <span>{server.environment}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      server.status === 'Online'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${server.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span>{server.status}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-2 flex-wrap">
                  <span>Host: {server.host}:{server.port}</span>
                  <span>•</span>
                  <span>User: {server.username}</span>
                  <span>•</span>
                  <span>OS: {server.os.name} {server.os.version} ({server.os.arch})</span>
                  <span>•</span>
                  <span>Uptime: {server.os.uptimeFormatted}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Synchronizing SSH...' : 'Sync Live Metrics'}</span>
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                title="Disconnect & Remove server from fleet"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Server</span>
              </button>

              <button
                onClick={() => router.push('/dashboard/servers')}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#18233C] hover:bg-[#202E4E] text-slate-300 border border-[#1E293B] transition-colors"
              >
                Back to Fleet
              </button>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#FF9900]" />
                  <span>CPU Utilization</span>
                </span>
                <span className="font-mono text-white font-bold">{cpuPercent}%</span>
              </div>
              <div className="w-full bg-[#0D1526] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    cpuPercent > 85 ? 'bg-rose-500' : cpuPercent > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, cpuPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span>Cores: {server.hardware?.cpuCores || 1}</span>
                <span>Load: {server.metrics?.cpu?.loadAvg1m || 0} / {server.metrics?.cpu?.loadAvg5m || 0}</span>
              </div>
            </div>

            {/* RAM */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Memory Usage</span>
                </span>
                <span className="font-mono text-white font-bold">{memPercent}%</span>
              </div>
              <div className="w-full bg-[#0D1526] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    memPercent > 85 ? 'bg-rose-500' : memPercent > 60 ? 'bg-amber-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${Math.min(100, memPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span>Used: {formatBytes(server.metrics?.memory?.usedBytes || 0)}</span>
                <span>Total: {formatBytes(server.metrics?.memory?.totalBytes || 0)}</span>
              </div>
            </div>

            {/* Disk */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-teal-400" />
                  <span>Primary Disk Space</span>
                </span>
                <span className="font-mono text-white font-bold">{diskPercent}%</span>
              </div>
              <div className="w-full bg-[#0D1526] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${diskPercent > 85 ? 'bg-rose-500' : 'bg-teal-400'}`}
                  style={{ width: `${Math.min(100, diskPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span>Mount: {server.metrics?.disks?.[0]?.mount || '/'}</span>
                <span>Free: {formatBytes(server.metrics?.disks?.[0]?.availableBytes || 0)}</span>
              </div>
            </div>

            {/* Network */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-indigo-400" />
                  <span>Network Traffic</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">Live</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300 font-mono pt-2">
                <span>RX: {formatBytes(server.metrics?.network?.[0]?.bytesReceived || 0)}</span>
                <span>TX: {formatBytes(server.metrics?.network?.[0]?.bytesSent || 0)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Packets In: {server.metrics?.network?.[0]?.packetsReceived || 0}</span>
                <span>Interface: {server.metrics?.network?.[0]?.interface || 'eth0'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview & Performance
            </button>

            <button
              onClick={() => setActiveTab('docker')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'docker' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <DockerIcon className="w-3.5 h-3.5" />
              <span>Docker Containers ({server.docker?.containersCount || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('kubernetes')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'kubernetes' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <KubernetesIcon className="w-3.5 h-3.5" />
              <span>Kubernetes ({server.kubernetes?.detected ? 'Detected' : 'Unavailable'})</span>
            </button>

            <button
              onClick={() => setActiveTab('disks')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'disks' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Disk Partitions ({server.metrics?.disks?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('network')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'network' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Network Interfaces ({server.metrics?.network?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'security' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Security & Agent</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Hardware Specifications */}
              <div className="lg:col-span-1 bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>Hardware & OS Specifications</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                    <span className="text-slate-400">Operating System</span>
                    <span className="font-semibold text-white">{server.os.name} {server.os.version}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                    <span className="text-slate-400">Kernel Version</span>
                    <span className="font-mono text-slate-200">{server.os.kernel}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                    <span className="text-slate-400">Architecture</span>
                    <span className="font-mono text-slate-200">{server.os.arch}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                    <span className="text-slate-400">CPU Model</span>
                    <span className="text-slate-200 truncate max-w-[180px]" title={server.hardware.cpuModel}>
                      {server.hardware.cpuModel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                    <span className="text-slate-400">CPU Cores</span>
                    <span className="font-semibold text-white">{server.hardware.cpuCores} vCPU</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                    <span className="text-slate-400">Total System RAM</span>
                    <span className="font-semibold text-white">{formatBytes(server.hardware.totalMemoryBytes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                    <span className="text-slate-400">SSH Fingerprint</span>
                    <span className="font-mono text-slate-400 truncate max-w-[150px]">
                      {server.hostFingerprint || 'Verified on connect'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Last Synced</span>
                    <span className="font-mono text-emerald-400">
                      {server.lastConnectedAt ? new Date(server.lastConnectedAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="lg:col-span-2 bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span>Real-Time Metric Telemetry</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Current: {cpuPercent}% CPU</span>
                </div>

                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={
                        chartPoints.length > 0
                          ? chartPoints
                          : [
                              { time: 'T-15m', val: Math.max(0, cpuPercent - 4) },
                              { time: 'T-10m', val: Math.max(0, cpuPercent - 2) },
                              { time: 'T-5m', val: cpuPercent },
                              { time: 'Now', val: cpuPercent },
                            ]
                      }
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E293B' }} />
                      <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#0D1526] border border-[#1E293B] p-2 rounded shadow text-xs">
                                <span className="text-slate-400">Utilization: </span>
                                <span className="font-bold text-white">{payload[0].value}%</span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="val" stroke="#3B82F6" strokeWidth={2.5} fill="url(#cpuGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOCKER */}
          {activeTab === 'docker' && (
            <div className="space-y-6">
              {server.docker?.detected ? (
                <>
                  <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3.5 border-b border-[#1E293B] flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <DockerIcon className="w-4 h-4" />
                        <span>Discovered Docker Containers ({server.docker.containers?.length || 0})</span>
                      </h3>
                      <span className="text-xs font-mono text-slate-400">{server.docker.version}</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0D1526] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                          <tr>
                            <th className="py-2.5 px-4">Container ID</th>
                            <th className="py-2.5 px-4">Name</th>
                            <th className="py-2.5 px-4">Image</th>
                            <th className="py-2.5 px-4">State</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Ports</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E293B]">
                          {(server.docker.containers || []).map((c: any) => (
                            <tr key={c.id} className="hover:bg-[#15203A]">
                              <td className="py-2.5 px-4 font-mono text-slate-400">{c.id.slice(0, 12)}</td>
                              <td className="py-2.5 px-4 font-semibold text-white">{c.name}</td>
                              <td className="py-2.5 px-4 text-blue-400 font-mono">{c.image}</td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    c.state === 'running'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-slate-500/10 text-slate-400'
                                  }`}
                                >
                                  {c.state}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-300">{c.status}</td>
                              <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">{c.ports || '-'}</td>
                            </tr>
                          ))}
                          {(!server.docker.containers || server.docker.containers.length === 0) && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-500">
                                Docker is active, but zero containers are currently running on this host.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Docker Images Table */}
                  <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-[#1E293B]">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Docker Images on Host ({server.docker.images?.length || 0})
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0D1526] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                          <tr>
                            <th className="py-2 px-4">Image ID</th>
                            <th className="py-2 px-4">Repository</th>
                            <th className="py-2 px-4">Tag</th>
                            <th className="py-2 px-4">Size</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E293B]">
                          {(server.docker.images || []).map((img: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[#15203A]">
                              <td className="py-2 px-4 font-mono text-slate-400">{img.id?.slice(0, 12)}</td>
                              <td className="py-2 px-4 text-white font-semibold">{img.repository}</td>
                              <td className="py-2 px-4 text-slate-300 font-mono">{img.tag}</td>
                              <td className="py-2 px-4 text-slate-400 font-mono">{img.size}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center bg-[#111A2E] border border-[#1E293B] rounded-xl space-y-2">
                  <DockerIcon className="w-10 h-10 mx-auto text-slate-600" />
                  <h4 className="text-sm font-semibold text-white">Docker Engine Not Detected</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Docker is not installed or not running on this host. Once Docker is installed, the next synchronization cycle will automatically discover containers and images.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KUBERNETES */}
          {activeTab === 'kubernetes' && (
            <div className="space-y-6">
              {server.kubernetes?.detected ? (
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-[#1E293B] flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <KubernetesIcon className="w-4 h-4" />
                      <span>Kubernetes Pods & Workloads</span>
                    </h3>
                    <span className="text-xs font-mono text-slate-400">{server.kubernetes.version}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0D1526] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                        <tr>
                          <th className="py-2.5 px-4">Pod UID</th>
                          <th className="py-2.5 px-4">Pod Name</th>
                          <th className="py-2.5 px-4">Namespace</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Restarts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E293B]">
                        {(server.kubernetes.pods || []).map((p: any) => (
                          <tr key={p.uid} className="hover:bg-[#15203A]">
                            <td className="py-2.5 px-4 font-mono text-slate-400">{p.uid?.slice(0, 12)}</td>
                            <td className="py-2.5 px-4 font-semibold text-white">{p.name}</td>
                            <td className="py-2.5 px-4 font-mono text-blue-400">{p.namespace}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  p.status === 'Running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-400">{p.restarts || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-[#111A2E] border border-[#1E293B] rounded-xl space-y-2">
                  <KubernetesIcon className="w-10 h-10 mx-auto text-slate-600" />
                  <h4 className="text-sm font-semibold text-white">Kubernetes Not Detected</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    This server is not a recognized Kubernetes node or does not have kubectl configured.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DISKS */}
          {activeTab === 'disks' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-[#1E293B]">
                <h3 className="text-sm font-semibold text-white">Mounted Filesystems & Disks (df -B1)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D1526] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                    <tr>
                      <th className="py-2.5 px-4">Filesystem</th>
                      <th className="py-2.5 px-4">Mount Point</th>
                      <th className="py-2.5 px-4">Total Size</th>
                      <th className="py-2.5 px-4">Used Space</th>
                      <th className="py-2.5 px-4">Available</th>
                      <th className="py-2.5 px-4">Usage %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {(server.metrics?.disks || []).map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#15203A]">
                        <td className="py-2.5 px-4 font-mono text-slate-300">{d.filesystem}</td>
                        <td className="py-2.5 px-4 font-bold text-white">{d.mount}</td>
                        <td className="py-2.5 px-4 font-mono">{formatBytes(d.totalBytes)}</td>
                        <td className="py-2.5 px-4 font-mono text-rose-400">{formatBytes(d.usedBytes)}</td>
                        <td className="py-2.5 px-4 font-mono text-emerald-400">{formatBytes(d.availableBytes)}</td>
                        <td className="py-2.5 px-4">
                          <div className="w-24 space-y-1">
                            <span className="text-[11px] font-semibold text-slate-300">{d.usagePercent}%</span>
                            <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${d.usagePercent > 85 ? 'bg-rose-500' : 'bg-teal-400'}`}
                                style={{ width: `${Math.min(100, d.usagePercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: NETWORK */}
          {activeTab === 'network' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-[#1E293B]">
                <h3 className="text-sm font-semibold text-white">Network Interface Telemetry (/proc/net/dev)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D1526] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                    <tr>
                      <th className="py-2.5 px-4">Interface</th>
                      <th className="py-2.5 px-4">Bytes Received (RX)</th>
                      <th className="py-2.5 px-4">Bytes Sent (TX)</th>
                      <th className="py-2.5 px-4">Packets Received</th>
                      <th className="py-2.5 px-4">Packets Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {(server.metrics?.network || []).map((n: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#15203A]">
                        <td className="py-2.5 px-4 font-bold text-white font-mono">{n.interface}</td>
                        <td className="py-2.5 px-4 font-mono text-emerald-400">{formatBytes(n.bytesReceived)}</td>
                        <td className="py-2.5 px-4 font-mono text-blue-400">{formatBytes(n.bytesSent)}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-300">{n.packetsReceived}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-300">{n.packetsSent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY & AGENT */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Security Safeguards */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Production Security & Safety Protocol</span>
                </h3>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="p-3 bg-[#0D1526] rounded-lg border border-[#1E293B] space-y-1">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>AES-256-GCM Encryption at Rest</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Private keys and authentication credentials are encrypted using authenticated GCM mode and never exposed via any API.
                    </p>
                  </div>

                  <div className="p-3 bg-[#0D1526] rounded-lg border border-[#1E293B] space-y-1">
                    <span className="font-bold text-blue-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Strict Read-Only Monitoring Execution</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      The platform executes non-destructive OS inspection commands (cat /etc/os-release, free, df, top). No modifications to system configurations or processes are ever initiated.
                    </p>
                  </div>
                </div>
              </div>

              {/* Agent Registration Token */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Agent Registration & Heartbeat</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Unique Server Agent Token</label>
                    <div className="flex items-center gap-2 bg-[#0D1526] border border-[#1E293B] rounded-lg p-2">
                      <code className="text-xs text-emerald-400 font-mono flex-1 select-all truncate">
                        {server.agent?.token}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(server.agent?.token || '');
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2000);
                        }}
                        className="p-1 rounded bg-[#18233C] text-slate-300 hover:text-white"
                      >
                        {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                    <span className="text-slate-400">Agent Status</span>
                    <span className="font-semibold text-white capitalize">{server.agent?.status || 'not-installed'}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
                    <span className="text-slate-400">Agent Version</span>
                    <span className="font-mono text-slate-300">{server.agent?.version || '1.0.0'}</span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Last Reported Heartbeat</span>
                    <span className="font-mono text-slate-300">
                      {server.agent?.lastHeartbeat ? new Date(server.agent.lastHeartbeat).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete Server Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111A2E] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Server from Monitoring</h3>
                <span className="text-xs text-rose-400 font-semibold">{server.environment} Server Node</span>
              </div>
            </div>

            {/* Server Details Summary Card */}
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Server Name:</span>
                <span className="font-bold text-white">{server.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Host IP / Port:</span>
                <span className="font-mono text-blue-400 font-semibold">{server.host}:{server.port}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Environment & Provider:</span>
                <span className="text-slate-300">
                  {server.environment} • <span className="uppercase">{server.cloudProvider}</span> ({server.region})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hardware & Status:</span>
                <span className={`font-semibold ${server.status === 'Online' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {server.status} ({server.hardware?.cpuCores || 1} CPU cores, {formatBytes(server.hardware?.totalMemoryBytes || 0)} RAM)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Disconnecting will terminate scheduled SSH telemetry collection, stop agent sync, and purge this server node from the monitoring fleet.
            </p>

            {isProd && (
              <div className="space-y-2">
                <p className="text-xs text-rose-400 font-semibold">
                  To confirm removal of this Production server, type <span className="underline">{server.name}</span>:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={server.name}
                  className="w-full px-3 py-2 bg-[#0D1526] border border-rose-500/30 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#18233C] text-slate-300 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteServer}
                disabled={deleting || (isProd && deleteConfirmText !== server.name)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all disabled:opacity-50"
              >
                {deleting ? 'Disconnecting & Removing...' : 'Disconnect & Remove Server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServerDetailPage({ params }: ServerDetailProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] text-slate-400 flex items-center justify-center text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mr-2" />
          <span>Loading server telemetry...</span>
        </div>
      }
    >
      <ServerDetailContent params={params} />
    </Suspense>
  );
}

