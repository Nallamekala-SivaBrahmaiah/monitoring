'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Server,
  Plus,
  RefreshCw,
  Shield,
  Activity,
  HardDrive,
  Cpu,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Terminal,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Boxes,
  Lock,
  Globe,
  Radio,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { EC2InstancesTable } from '@/components/dashboard/EC2InstancesTable';
import { AzureVMsTable } from '@/components/dashboard/AzureVMsTable';
import { ServerStatusChart } from '@/components/dashboard/ServerStatusChart';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo, DockerIcon, KubernetesIcon } from '@/components/icons/CloudIcons';

interface RegisteredServer {
  _id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  environment: 'Production' | 'Staging' | 'Development';
  cloudProvider: 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other';
  region?: string;
  tags: string[];
  status: 'Online' | 'Offline' | 'Connecting' | 'Failed' | 'Warning';
  lastError: string | null;
  lastConnectedAt: string | null;
  lastHeartbeatAt: string | null;
  hostFingerprint: string | null;
  os: {
    name: string;
    version: string;
    kernel: string;
    arch: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
  };
  hardware: {
    cpuCores: number;
    cpuModel: string;
    totalMemoryBytes: number;
    totalDiskBytes: number;
  };
  metrics: {
    cpu: {
      usagePercent: number;
      loadAvg1m: number;
      loadAvg5m: number;
      loadAvg15m: number;
      cores: number;
      timestamp: string;
    };
    memory: {
      totalBytes: number;
      usedBytes: number;
      availableBytes: number;
      usagePercent: number;
      swapTotalBytes: number;
      swapUsedBytes: number;
      timestamp: string;
    };
    disks: Array<{
      filesystem: string;
      mount: string;
      totalBytes: number;
      usedBytes: number;
      availableBytes: number;
      usagePercent: number;
    }>;
    network: Array<{
      interface: string;
      bytesReceived: number;
      bytesSent: number;
      packetsReceived: number;
      packetsSent: number;
    }>;
  };
  docker: {
    detected: boolean;
    version: string;
    containersCount: number;
    runningCount: number;
    imagesCount: number;
  };
  kubernetes: {
    detected: boolean;
    version: string;
    podsCount: number;
  };
  agent: {
    installed: boolean;
    version: string;
    token: string;
    status: 'healthy' | 'unreachable' | 'not-installed';
  };
  createdAt: string;
}

export default function ServersPage() {
  const { cloudProvider, filteredEC2Instances, filteredAzureVMs, isRefreshing } = useMonitoring();

  // State
  const [servers, setServers] = useState<RegisteredServer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [envFilter, setEnvFilter] = useState<'all' | 'Production' | 'Staging' | 'Development'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'custom' | 'aws' | 'azure'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showAgentModal, setShowAgentModal] = useState<boolean>(false);
  const [selectedAgentServer, setSelectedAgentServer] = useState<RegisteredServer | null>(null);
  const [agentScriptData, setAgentScriptData] = useState<{ oneLiner: string; script: string; instructions: string[] } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<RegisteredServer | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);

  // Add Server Form State
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'ubuntu',
    authMethod: 'privateKey' as 'privateKey' | 'password',
    authSecret: '',
    environment: 'Production' as 'Production' | 'Staging' | 'Development',
    cloudProvider: 'other' as 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other',
    region: 'us-east-1',
    tags: 'web, api',
  });

  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; preview?: any } | null>(null);
  const [submittingServer, setSubmittingServer] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch servers from backend
  const fetchServers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/servers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setServers(data);
      }
    } catch (e) {
      console.warn('Failed to load registered servers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, [isRefreshing]);

  // Sync single server
  const handleRefreshServer = async (id: string) => {
    try {
      setSyncingId(id);
      const res = await fetch(`/api/servers/${id}/refresh`, { method: 'POST' });
      if (res.ok) {
        await fetchServers();
      }
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setSyncingId(null);
    }
  };

  // Test Connection in Modal
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      setSubmitError(null);

      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.host,
          port: formData.port,
          username: formData.username,
          authMethod: formData.authMethod,
          authSecret: formData.authSecret,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, error: e.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  // Submit Add Server Form
  const handleAddServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingServer(true);
      setSubmitError(null);

      const tagArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: tagArray,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add server');
      }

      setShowAddModal(false);
      // Reset form
      setFormData({
        name: '',
        host: '',
        port: 22,
        username: 'ubuntu',
        authMethod: 'privateKey',
        authSecret: '',
        environment: 'Production',
        cloudProvider: 'other',
        region: 'us-east-1',
        tags: 'web, api',
      });
      setTestResult(null);
      await fetchServers();
    } catch (err: any) {
      setSubmitError(err.message || 'Server registration failed');
    } finally {
      setSubmittingServer(false);
    }
  };

  // Open Agent Modal
  const handleOpenAgentModal = async (server: RegisteredServer) => {
    setSelectedAgentServer(server);
    setShowAgentModal(true);
    setCopiedCmd(false);
    try {
      const res = await fetch(`/api/servers/${server._id}/install-script`);
      if (res.ok) {
        const data = await res.json();
        setAgentScriptData(data);
      }
    } catch (e) {
      console.warn('Failed to fetch agent script:', e);
    }
  };

  // Confirm delete server
  const handleDeleteServer = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const isProd = deleteTarget.environment === 'Production';
      const url = `/api/servers/${deleteTarget._id}${isProd ? '?confirmed=true' : ''}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (res.ok) {
        setDeleteTarget(null);
        setDeleteConfirmText('');
        await fetchServers();
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

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Filtered servers
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      if (envFilter !== 'all' && s.environment !== envFilter) return false;
      if (cloudProvider === 'aws' && s.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && s.cloudProvider !== 'azure') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchHost = s.host.toLowerCase().includes(q);
        const matchTags = s.tags.some((t) => t.toLowerCase().includes(q));
        const matchEnv = s.environment.toLowerCase().includes(q);
        return matchName || matchHost || matchTags || matchEnv;
      }
      return true;
    });
  }, [servers, envFilter, cloudProvider, searchQuery]);

  // Aggregate stats
  const totalCustomServers = servers.length;
  const prodServersCount = servers.filter((s) => s.environment === 'Production').length;
  const stagingServersCount = servers.filter((s) => s.environment === 'Staging').length;
  const devServersCount = servers.filter((s) => s.environment === 'Development').length;
  const onlineServersCount = servers.filter((s) => s.status === 'Online').length;
  const totalCombinedNodes = totalCustomServers + filteredEC2Instances.length + filteredAzureVMs.length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-6">
          {/* Top Breadcrumb & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link href="/" className="hover:text-blue-400 flex items-center gap-1 transition-colors">
                  <span>Dashboard</span>
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Production Server Monitoring</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Server className="w-5 h-5" />
                </div>
                <span>Server Infrastructure & Node Fleet</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-semibold">
                  {onlineServersCount} Online
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Automatic, continuous monitoring for Production, Staging, and Development Linux hosts.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchServers}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Fleet</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Linux Server</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Servers</span>
              <div className="text-2xl font-bold text-white mt-1">{totalCombinedNodes}</div>
              <span className="text-[10px] text-emerald-400 mt-0.5 block">{onlineServersCount} connected</span>
            </div>

            <div className="bg-[#111A2E] border border-rose-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Production</span>
                <Shield className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{prodServersCount}</div>
              <span className="text-[10px] text-rose-300/80 mt-0.5 block">Critical Read-Only</span>
            </div>

            <div className="bg-[#111A2E] border border-purple-500/20 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">Staging</span>
              <div className="text-2xl font-bold text-white mt-1">{stagingServersCount}</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Pre-release nodes</span>
            </div>

            <div className="bg-[#111A2E] border border-sky-500/20 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">Development</span>
              <div className="text-2xl font-bold text-white mt-1">{devServersCount}</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Testing environments</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Docker Hosts</span>
                <DockerIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {servers.filter((s) => s.docker?.detected).length}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Docker enabled</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kubernetes</span>
                <KubernetesIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {servers.filter((s) => s.kubernetes?.detected).length}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">K8s nodes detected</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] rounded-xl p-3">
            {/* Environment Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setEnvFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  envFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                All Environments ({servers.length})
              </button>

              <button
                onClick={() => setEnvFilter('Production')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  envFilter === 'Production'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-400 hover:bg-rose-950/30'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Production ({prodServersCount})</span>
              </button>

              <button
                onClick={() => setEnvFilter('Staging')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  envFilter === 'Staging'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-400 hover:bg-purple-950/30'
                }`}
              >
                Staging ({stagingServersCount})
              </button>

              <button
                onClick={() => setEnvFilter('Development')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  envFilter === 'Development'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-400 hover:bg-sky-950/30'
                }`}
              >
                Development ({devServersCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search server, IP, tag..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Registered Linux Servers Table */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[#1E293B] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Registered Linux Servers</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800/40">
                    {filteredServers.length} nodes
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Continuous SSH & Agent telemetry with actual CPU, Memory, Disk, Docker, and Kubernetes state.
                </p>
              </div>

              {filteredServers.length > 0 && (
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  30s auto-refresh active
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0D1526] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                  <tr>
                    <th className="py-3 px-4">Server Name & Host</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">CPU Usage</th>
                    <th className="py-3 px-4">RAM Usage</th>
                    <th className="py-3 px-4">Disk Space</th>
                    <th className="py-3 px-4">Docker / K8s</th>
                    <th className="py-3 px-4">Last Sync</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {filteredServers.map((server) => {
                    const cpuVal = server.metrics?.cpu?.usagePercent ?? 0;
                    const memVal = server.metrics?.memory?.usagePercent ?? 0;
                    const diskVal = server.metrics?.disks?.[0]?.usagePercent ?? 0;
                    const isProd = server.environment === 'Production';

                    return (
                      <tr key={server._id} className="hover:bg-[#15203A] transition-colors">
                        {/* Server Name & Host */}
                        <td className="py-3 px-4">
                          <Link href={`/dashboard/servers/${server._id}`} className="group block">
                            <div className="font-semibold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                              <span>{server.name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                              <span>{server.host}:{server.port}</span>
                              <span>•</span>
                              <span>{server.os.name} {server.os.version}</span>
                            </div>
                          </Link>
                        </td>

                        {/* Environment */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isProd
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : server.environment === 'Staging'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            }`}
                          >
                            {isProd && <Shield className="w-2.5 h-2.5" />}
                            <span>{server.environment}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                server.status === 'Online'
                                  ? 'bg-emerald-400 animate-pulse'
                                  : server.status === 'Connecting'
                                  ? 'bg-blue-400'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span
                              className={`font-semibold ${
                                server.status === 'Online'
                                  ? 'text-emerald-400'
                                  : server.status === 'Connecting'
                                  ? 'text-blue-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {server.status}
                            </span>
                          </div>
                          {server.lastError && (
                            <span className="text-[10px] text-rose-400/80 block truncate max-w-[140px]" title={server.lastError}>
                              {server.lastError}
                            </span>
                          )}
                        </td>

                        {/* CPU */}
                        <td className="py-3 px-4">
                          <div className="w-28 space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-300 font-semibold">{cpuVal}%</span>
                              <span className="text-slate-500 font-mono">{server.hardware?.cpuCores || 1}c</span>
                            </div>
                            <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  cpuVal > 85 ? 'bg-rose-500' : cpuVal > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(100, cpuVal)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Memory */}
                        <td className="py-3 px-4">
                          <div className="w-28 space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-300 font-semibold">{memVal}%</span>
                              <span className="text-slate-500 font-mono">
                                {formatBytes(server.metrics?.memory?.totalBytes || 0)}
                              </span>
                            </div>
                            <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  memVal > 90 ? 'bg-rose-500' : memVal > 70 ? 'bg-amber-400' : 'bg-blue-400'
                                }`}
                                style={{ width: `${Math.min(100, memVal)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Disk */}
                        <td className="py-3 px-4">
                          <div className="w-24 space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-300 font-semibold">{diskVal}%</span>
                              <span className="text-slate-500 font-mono">
                                {server.metrics?.disks?.[0]?.mount || '/'}
                              </span>
                            </div>
                            <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  diskVal > 85 ? 'bg-rose-500' : 'bg-teal-400'
                                }`}
                                style={{ width: `${Math.min(100, diskVal)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Docker / K8s Detection */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {server.docker?.detected ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                title={`Docker running (${server.docker.runningCount} containers)`}
                              >
                                <DockerIcon className="w-3 h-3" />
                                <span>{server.docker.runningCount}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-mono">No Docker</span>
                            )}

                            {server.kubernetes?.detected && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                title="Kubernetes Node detected"
                              >
                                <KubernetesIcon className="w-3 h-3" />
                                <span>K8s</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Last Sync */}
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {server.lastConnectedAt ? new Date(server.lastConnectedAt).toLocaleTimeString() : 'Never'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRefreshServer(server._id)}
                              disabled={syncingId === server._id}
                              title="Synchronize live metrics via SSH"
                              className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-[#1A2642] text-slate-300 hover:text-white border border-[#1E293B] transition-colors"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${syncingId === server._id ? 'animate-spin text-blue-400' : ''}`} />
                            </button>

                            <button
                              onClick={() => handleOpenAgentModal(server)}
                              title="View Monitoring Agent instructions"
                              className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-[#1A2642] text-cyan-400 border border-[#1E293B] transition-colors"
                            >
                              <Terminal className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              href={`/dashboard/servers/${server._id}`}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 rounded-lg border border-[#1E293B] transition-colors"
                            >
                              Details
                            </Link>

                            <button
                              onClick={() => setDeleteTarget(server)}
                              title="Remove server"
                              className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-[#1E293B] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredServers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-[#111A2E] border border-[#1E293B] flex items-center justify-center mx-auto text-slate-500">
                            <Server className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-semibold text-white">No Registered Linux Servers Found</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Add a development, staging, or production Linux server once with SSH credentials to enable automatic, continuous metric collection without logging into a terminal every time.
                          </p>
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add First Server</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cloud VMs Section (AWS EC2 & Azure VMs from connected subscriptions) */}
          <div className="space-y-4 pt-4 border-t border-[#1E293B]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>Cloud Provider Infrastructure (AWS & Azure)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Virtual machines discovered through connected cloud subscriptions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/ec2"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FF9900]/10 hover:bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30 transition-all flex items-center gap-1.5"
                >
                  <AwsLogo className="w-3.5 h-2.5" />
                  <span>EC2 Instances ({filteredEC2Instances.length})</span>
                </Link>

                <Link
                  href="/dashboard/azure-vms"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0089D6]/10 hover:bg-[#0089D6]/20 text-[#5EA0EF] border border-[#0089D6]/30 transition-all flex items-center gap-1.5"
                >
                  <AzureLogo className="w-3 h-3" />
                  <span>Azure VMs ({filteredAzureVMs.length})</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EC2InstancesTable
                instances={filteredEC2Instances}
                showViewAllButton={true}
                limit={5}
              />
              <AzureVMsTable
                vms={filteredAzureVMs}
                showViewAllButton={true}
                limit={5}
              />
            </div>
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 1. ADD SERVER MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#1E293B] flex items-center justify-between sticky top-0 bg-[#111A2E] z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Linux Server to Monitoring</h3>
                  <p className="text-xs text-slate-400">
                    Connect once with SSH credentials. Real telemetry will be collected automatically.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setTestResult(null);
                  setSubmitError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#18233C]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddServerSubmit} className="p-6 space-y-5">
              {/* Production Safety Warning banner if Production environment chosen */}
              {formData.environment === 'Production' && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-rose-300 block">Production Server Safety Notice</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">
                      This server is treated as critical production infrastructure. Monitoring is strictly read-only by default. The system will never execute destructive commands, restart services, or alter configurations.
                    </p>
                  </div>
                </div>
              )}

              {/* Row 1: Server Name & Environment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Server Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. prod-api-01"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Environment <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Production">Production (Critical - Read Only)</option>
                    <option value="Staging">Staging</option>
                    <option value="Development">Development</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Host & Port */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Host IP or Domain <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="e.g. 20.235.241.140 or srv.mydomain.com"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    SSH Port <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 22 })}
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Username & Auth Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    SSH Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="ubuntu, root, ec2-user, or azureuser"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Authentication Method <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.authMethod}
                    onChange={(e) => setFormData({ ...formData, authMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="privateKey">SSH Private Key (PEM/RSA/Ed25519) - Recommended</option>
                    <option value="password">SSH Password</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Secret Key / Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    {formData.authMethod === 'privateKey' ? 'SSH Private Key Content (PEM)' : 'SSH Password'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Encrypted at rest with AES-256-GCM</span>
                  </span>
                </div>

                {formData.authMethod === 'privateKey' ? (
                  <textarea
                    required
                    rows={4}
                    value={formData.authSecret}
                    onChange={(e) => setFormData({ ...formData, authSecret: e.target.value })}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                ) : (
                  <input
                    type="password"
                    required
                    value={formData.authSecret}
                    onChange={(e) => setFormData({ ...formData, authSecret: e.target.value })}
                    placeholder="Enter SSH password"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                )}
              </div>

              {/* Row 5: Cloud Provider & Region & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Host Provider</label>
                  <select
                    value={formData.cloudProvider}
                    onChange={(e) => setFormData({ ...formData, cloudProvider: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="other">On-Premise / Bare Metal / Other</option>
                    <option value="aws">AWS EC2</option>
                    <option value="azure">Azure Virtual Machine</option>
                    <option value="gcp">Google Cloud Platform</option>
                    <option value="on-premise">On-Premises Datacenter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Region / Location</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g. us-east-1 or on-prem"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. web, prod, nginx"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Connection Test Results Preview */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    testResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{testResult.message || testResult.error}</span>
                  </div>

                  {testResult.preview && (
                    <div className="mt-2.5 pt-2.5 border-t border-emerald-800/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">OS:</span>
                        <span className="font-semibold text-white">
                          {testResult.preview.os?.name} {testResult.preview.os?.version}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">CPU & RAM:</span>
                        <span className="font-semibold text-white">
                          {testResult.preview.hardware?.cpuCores} Cores, {testResult.preview.initialMemory} Used
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Docker:</span>
                        <span className="font-semibold text-white">
                          {testResult.preview.dockerDetected
                            ? `${testResult.preview.dockerContainers} containers`
                            : 'Not Installed'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Kubernetes:</span>
                        <span className="font-semibold text-white">
                          {testResult.preview.k8sDetected ? 'Detected' : 'Not Detected'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {submitError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !formData.host || !formData.authSecret}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] transition-all disabled:opacity-50"
                >
                  <Radio className={`w-3.5 h-3.5 text-blue-400 ${testingConnection ? 'animate-pulse' : ''}`} />
                  <span>{testingConnection ? 'Verifying SSH...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingServer}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{submittingServer ? 'Connecting & Saving...' : 'Connect & Add Server'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AGENT INSTALLATION MODAL */}
      {/* ========================================================================= */}
      {showAgentModal && selectedAgentServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#1E293B] flex items-center justify-between sticky top-0 bg-[#111A2E] z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Monitoring Agent Setup</h3>
                  <p className="text-xs text-slate-400">
                    Optional background agent for server: <span className="text-white font-mono">{selectedAgentServer.name}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAgentModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs space-y-1.5">
                <span className="font-bold text-blue-300">Continuous Monitoring via Lightweight Agent</span>
                <p className="text-slate-300 leading-relaxed">
                  The agent runs read-only probes for OS telemetry, CPU, Memory, Disks, Docker containers, and Kubernetes pods. It reports back to the central platform via HTTPS and requires zero open inbound ports.
                </p>
              </div>

              {/* Single-line install command */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Run this single command on your Linux server:
                </label>
                <div className="flex items-center gap-2 bg-[#0D1526] border border-[#1E293B] rounded-lg p-2.5">
                  <code className="text-xs text-emerald-400 font-mono flex-1 overflow-x-auto select-all">
                    {agentScriptData?.oneLiner || `curl -sSL "http://localhost:3000/api/servers/${selectedAgentServer._id}/install-script" | bash`}
                  </code>
                  <button
                    onClick={() => {
                      if (agentScriptData?.oneLiner) {
                        navigator.clipboard.writeText(agentScriptData.oneLiner);
                        setCopiedCmd(true);
                        setTimeout(() => setCopiedCmd(false), 2000);
                      }
                    }}
                    className="p-1.5 rounded-md bg-[#18233C] text-slate-300 hover:text-white transition-colors flex-shrink-0"
                  >
                    {copiedCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Instructions list */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">Step-by-step Execution:</span>
                <ul className="text-xs text-slate-400 space-y-1.5 pl-4 list-disc">
                  <li>Log in to your target server via SSH as root or sudoer.</li>
                  <li>Execute the command above to transmit the first heartbeat.</li>
                  <li>(Optional) Add a cron job to automatically stream metrics every 60 seconds.</li>
                  <li>The dashboard will automatically update to show agent health as Online.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex justify-end">
                <button
                  onClick={() => setShowAgentModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all"
                >
                  Close & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111A2E] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Server from Monitoring</h3>
                <span className="text-xs text-rose-400 font-semibold">{deleteTarget.environment} Server</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to stop monitoring <strong className="text-white">{deleteTarget.name}</strong> ({deleteTarget.host})?
              All historical telemetry and inventory mirrors for this node will be removed.
            </p>

            {deleteTarget.environment === 'Production' && (
              <div className="space-y-2">
                <p className="text-xs text-rose-400 font-semibold">
                  To confirm removal of this Production server, type <span className="underline">{deleteTarget.name}</span>:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteTarget.name}
                  className="w-full px-3 py-2 bg-[#0D1526] border border-rose-500/30 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#18233C] text-slate-300 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteServer}
                disabled={deleting || (deleteTarget.environment === 'Production' && deleteConfirmText !== deleteTarget.name)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
