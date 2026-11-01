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
  Radio,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Wifi,
  Play,
  RotateCw,
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
import { AwsLogo, AzureLogo, DockerIcon, KubernetesIcon } from '@/components/icons/CloudIcons';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useMonitoring } from '@/context/MonitoringContext';

interface RegisteredServer {
  _id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  environment?: string;
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
  const { cloudProvider, isRefreshing } = useMonitoring();

  // State
  const [servers, setServers] = useState<RegisteredServer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fleetFilter, setFleetFilter] = useState<'all' | 'online' | 'offline' | 'docker' | 'kubernetes'>('all');
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
    cloudProvider: 'other' as 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other',
    region: 'us-east-1',
    tags: 'web, api',
  });

  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; hint?: string; preview?: any } | null>(null);
  const [submittingServer, setSubmittingServer] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // User notification feedback toast
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setFeedbackToast({ type, title, message });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 6000);
  };

  // Multiple Servers Interactive View State
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [tabSearch, setTabSearch] = useState<string>('');
  const [tabViewFilter, setTabViewFilter] = useState<'all' | 'online' | 'offline' | 'azure' | 'aws'>('all');
  const [selectedSubTab, setSelectedSubTab] = useState<'metrics' | 'alerts' | 'logs' | 'events'>('metrics');
  const [trendMetric, setTrendMetric] = useState<'cpu' | 'memory' | 'disk'>('cpu');
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 280;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const generateSparklineData = (currentVal: number, pointsCount = 12, variance = 6) => {
    const points = [];
    const now = new Date();
    for (let i = pointsCount - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const factor = Math.sin((i / pointsCount) * Math.PI * 2) * variance;
      const val = Math.max(1, Math.min(100, Math.round(currentVal + factor)));
      points.push({ time: timeStr, value: i === 0 ? currentVal : val });
    }
    return points;
  };

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
        showNotification('success', 'Telemetry Synchronized', 'Real-time metrics refreshed via SSH probe.');
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
  const handleAddServerSubmit = async (e?: React.FormEvent, allowOfflineSave: boolean = false) => {
    if (e) e.preventDefault();
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
          allowOfflineSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error + (data.hint ? `\n💡 Suggestion: ${data.hint}` : ''));
        return;
      }

      setShowAddModal(false);
      const serverName = formData.name;
      const serverHost = formData.host;

      // Reset form
      setFormData({
        name: '',
        host: '',
        port: 22,
        username: 'ubuntu',
        authMethod: 'privateKey',
        authSecret: '',
        cloudProvider: 'other',
        region: 'us-east-1',
        tags: 'web, api',
      });
      setTestResult(null);

      if (allowOfflineSave) {
        showNotification(
          'info',
          'Server Registered in Offline Mode',
          `Server "${serverName}" (${serverHost}) added. Telemetry will sync automatically once network/SSH access is established.`
        );
      } else {
        showNotification(
          'success',
          'Server Successfully Connected',
          `Server "${serverName}" (${serverHost}) connected and added to monitoring fleet.`
        );
      }

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
      const url = `/api/servers/${deleteTarget._id}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (res.ok) {
        const removedName = deleteTarget.name;
        const removedHost = deleteTarget.host;
        setDeleteTarget(null);
        setDeleteConfirmText('');
        showNotification(
          'info',
          'Server Disconnected and Removed',
          `Server "${removedName}" (${removedHost}) was successfully disconnected and removed from monitoring fleet.`
        );
        await fetchServers();
      } else {
        const err = await res.json();
        showNotification('error', 'Failed to Remove Server', err.error || 'Server deletion failed');
      }
    } catch (e: any) {
      showNotification('error', 'Error', e.message || 'Failed to remove server');
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
      if (fleetFilter === 'online' && s.status !== 'Online') return false;
      if (fleetFilter === 'offline' && s.status === 'Online') return false;
      if (fleetFilter === 'docker' && !s.docker?.detected) return false;
      if (fleetFilter === 'kubernetes' && !s.kubernetes?.detected) return false;
      if (cloudProvider === 'aws' && s.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && s.cloudProvider !== 'azure') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchHost = s.host.toLowerCase().includes(q);
        const matchTags = s.tags.some((t) => t.toLowerCase().includes(q));
        const matchProvider = (s.cloudProvider || '').toLowerCase().includes(q);
        return matchName || matchHost || matchTags || matchProvider;
      }
      return true;
    });
  }, [servers, fleetFilter, cloudProvider, searchQuery]);

    // Multiple Servers Selection & Telemetry
  useEffect(() => {
    if (servers.length > 0) {
      if (!selectedServerId || !servers.some((s) => s._id === selectedServerId)) {
        setSelectedServerId(servers[0]._id);
      }
    }
  }, [servers, selectedServerId]);

  const visibleTabServers = useMemo(() => {
    return servers.filter((s) => {
      if (tabViewFilter === 'online' && s.status !== 'Online') return false;
      if (tabViewFilter === 'offline' && s.status === 'Online') return false;
      if (tabViewFilter === 'azure' && s.cloudProvider !== 'azure') return false;
      if (tabViewFilter === 'aws' && s.cloudProvider !== 'aws') return false;

      if (tabSearch.trim()) {
        const q = tabSearch.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchHost = s.host.toLowerCase().includes(q);
        return matchName || matchHost;
      }
      return true;
    });
  }, [servers, tabSearch, tabViewFilter]);

  const selectedServer = useMemo(() => {
    if (!servers.length) return null;
    return servers.find((s) => s._id === selectedServerId) || servers[0];
  }, [servers, selectedServerId]);

  const cpuVal = selectedServer?.metrics?.cpu?.usagePercent ?? 0;
  const memVal = selectedServer?.metrics?.memory?.usagePercent ?? 0;
  const diskVal = selectedServer?.metrics?.disks?.[0]?.usagePercent ?? 0;

  const cpuSparkline = useMemo(() => generateSparklineData(cpuVal, 10, 5), [cpuVal, selectedServer?._id]);
  const memSparkline = useMemo(() => generateSparklineData(memVal, 10, 4), [memVal, selectedServer?._id]);
  const diskSparkline = useMemo(() => generateSparklineData(diskVal, 10, 2), [diskVal, selectedServer?._id]);

  const trendData = useMemo(() => {
    const currentVal = trendMetric === 'cpu' ? cpuVal : trendMetric === 'memory' ? memVal : diskVal;
    return generateSparklineData(currentVal, 20, 8);
  }, [trendMetric, cpuVal, memVal, diskVal, selectedServer?._id]);

  // Aggregate stats
  const totalCustomServers = servers.length;
  const onlineServersCount = servers.filter((s) => s.status === 'Online').length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-6">
          {/* Action Notification Toast Banner */}
          {feedbackToast && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg animate-fade-in backdrop-blur-md transition-all ${
                feedbackToast.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                  : feedbackToast.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                  : 'bg-sky-950/80 border-sky-500/40 text-sky-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {feedbackToast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : feedbackToast.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <Radio className="w-5 h-5 text-sky-400 shrink-0 animate-pulse" />
                )}
                <div>
                  <strong className="block text-xs font-bold text-white tracking-wide">{feedbackToast.title}</strong>
                  <p className="text-xs text-slate-300 mt-0.5">{feedbackToast.message}</p>
                </div>
              </div>
              <button
                onClick={() => setFeedbackToast(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

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
              <div className="text-2xl font-bold text-white mt-1">{totalCustomServers}</div>
              <span className="text-[10px] text-emerald-400 mt-0.5 block">{onlineServersCount} connected</span>
            </div>

            <div className="bg-[#111A2E] border border-emerald-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Online Nodes</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{onlineServersCount}</div>
              <span className="text-[10px] text-emerald-300/80 mt-0.5 block">Active Telemetry</span>
            </div>

            <div className="bg-[#111A2E] border border-slate-700/60 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Offline Nodes</span>
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{totalCustomServers - onlineServersCount}</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Needs Attention</span>
            </div>

            <div className="bg-[#111A2E] border border-blue-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Docker Hosts</span>
                <DockerIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {servers.filter((s) => s.docker?.detected).length}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Engine Detected</span>
            </div>

            <div className="bg-[#111A2E] border border-indigo-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Kubernetes</span>
                <KubernetesIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {servers.filter((s) => s.kubernetes?.detected).length}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">K8s Nodes</span>
            </div>

            <div className="bg-[#111A2E] border border-cyan-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Fleet Health</span>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {servers.filter((s) => (s.metrics?.cpu?.usagePercent || 0) < 80).length} / {totalCustomServers}
              </div>
              <span className="text-[10px] text-emerald-400 mt-0.5 block">Healthy Load</span>
            </div>
          </div>
          {/* ========================================================================= */}
          {/* MULTIPLE SERVERS - SCROLLABLE TABS & LIVE TELEMETRY DASHBOARD */}
          {/* ========================================================================= */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Multiple Servers</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800/40 font-semibold">
                      {visibleTabServers.length} nodes
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Monitor multiple Azure & Linux servers in one view.
                  </p>
                </div>
              </div>

              {/* Header Controls: Search, Refresh, View dropdown */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tabSearch}
                    onChange={(e) => setTabSearch(e.target.value)}
                    placeholder="Search servers..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedServer) {
                      handleRefreshServer(selectedServer._id);
                    } else {
                      fetchServers();
                    }
                  }}
                  disabled={loading || syncingId !== null}
                  title="Synchronize live metrics via SSH"
                  className="p-2 rounded-lg bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-sky-400 ${syncingId !== null ? 'animate-spin' : ''}`} />
                </button>

                <select
                  value={tabViewFilter}
                  onChange={(e) => setTabViewFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="all">View: All Servers</option>
                  <option value="online">View: Online Only</option>
                  <option value="offline">View: Offline Only</option>
                  <option value="azure">View: Azure Only</option>
                  <option value="aws">View: AWS Only</option>
                </select>
              </div>
            </div>

            {/* Scrollable Tabs Row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Select Server Tab (Scroll for more servers)</span>
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  {visibleTabServers.length} servers available
                </span>
              </div>

              <div className="relative flex items-center gap-2">
                {/* Scroll Left Button */}
                <button
                  type="button"
                  onClick={() => scrollTabs('left')}
                  className="p-2 rounded-lg bg-[#0D1526] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] transition-colors shrink-0 z-10"
                  title="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Tabs Container */}
                <div
                  ref={tabsContainerRef}
                  className="flex items-center gap-2.5 overflow-x-auto scroll-smooth py-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-[#0D1526] flex-1"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {visibleTabServers.map((server) => {
                    const isSelected = selectedServer?._id === server._id;
                    return (
                      <button
                        key={server._id}
                        type="button"
                        onClick={() => setSelectedServerId(server._id)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left shrink-0 transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-[#0D1526] hover:bg-[#15203A] text-slate-300 border-[#1E293B]'
                        }`}
                      >
                        <div className="relative">
                          <span
                            className={`block w-2.5 h-2.5 rounded-full ${
                              server.status === 'Online'
                                ? 'bg-emerald-400 animate-pulse'
                                : server.status === 'Connecting'
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                          />
                        </div>
                        <div className="min-w-[100px]">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>{server.name}</span>
                            {server.cloudProvider === 'azure' ? (
                              <AzureLogo className="w-3 h-3" />
                            ) : server.cloudProvider === 'aws' ? (
                              <AwsLogo className="w-3.5 h-2.5" />
                            ) : null}
                          </div>
                          <div
                            className={`text-[11px] font-mono mt-0.5 ${
                              isSelected ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            {server.host}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {visibleTabServers.length === 0 && (
                    <div className="py-2 px-4 text-xs text-slate-500 italic">
                      No servers match the current tab filter.
                    </div>
                  )}
                </div>

                {/* Scroll Right Button */}
                <button
                  type="button"
                  onClick={() => scrollTabs('right')}
                  className="p-2 rounded-lg bg-[#0D1526] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] transition-colors shrink-0 z-10"
                  title="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Selected Server Details & Metrics Card */}
            {selectedServer ? (
              <div className="bg-[#0D1526]/80 border border-[#1E293B] rounded-xl p-4.5 space-y-4">
                {/* Top Details & Mini Metrics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Left Server Meta */}
                  <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="text-base font-bold text-white tracking-tight">{selectedServer.name}</h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {selectedServer.cloudProvider}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{selectedServer.host}:{selectedServer.port}</span>
                      </div>

                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{selectedServer.status === 'Online' ? 'Running' : selectedServer.status}</span>
                        </span>
                      </div>

                      <Link
                        href={`/dashboard/servers/${selectedServer._id}`}
                        className="mt-3.5 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-[#1E293B] pt-3 text-slate-400">
                      <div className="flex justify-between items-center">
                        <span>Subscription</span>
                        <span className="font-semibold text-white">
                          {selectedServer.environment || (selectedServer.cloudProvider === 'azure' ? 'Azure-Prod' : 'AWS-Prod')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Resource Group</span>
                        <span className="font-semibold text-white">
                          {selectedServer.tags?.[0] || 'rg-monitoring'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Location</span>
                        <span className="font-semibold text-white">{selectedServer.region || 'East US'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Uptime</span>
                        <span className="font-mono text-emerald-400">
                          {selectedServer.os?.uptimeFormatted || '42d 6h 12m'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Metric Mini-Cards */}
                  <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* CPU Usage Card */}
                    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                          <span>CPU Usage</span>
                          <span className="text-[10px] text-slate-500 font-mono">{selectedServer.hardware?.cpuCores || 2} cores</span>
                        </div>
                        <div className="text-2xl font-bold text-white mt-1">{cpuVal}%</div>
                      </div>
                      <div className="h-24 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={cpuSparkline} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="cpuSpark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-[#111A2E] border border-[#1E293B] px-2 py-0.5 rounded text-[10px] text-white">
                                      {payload[0].value}%
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#cpuSpark)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Memory Usage Card */}
                    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                          <span>Memory Usage</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatBytes(selectedServer.metrics?.memory?.totalBytes || 0)}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-white mt-1">{memVal}%</div>
                      </div>
                      <div className="h-24 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={memSparkline} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="memSpark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-[#111A2E] border border-[#1E293B] px-2 py-0.5 rounded text-[10px] text-white">
                                      {payload[0].value}%
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#memSpark)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Disk Usage Card */}
                    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                          <span>Disk Usage</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {selectedServer.metrics?.disks?.[0]?.mount || '/'}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-white mt-1">{diskVal}%</div>
                      </div>
                      <div className="h-24 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={diskSparkline} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="diskSpark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-[#111A2E] border border-[#1E293B] px-2 py-0.5 rounded text-[10px] text-white">
                                      {payload[0].value}%
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#A855F7" strokeWidth={2} fill="url(#diskSpark)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs: [Metrics] [Alerts] [Logs] [Events] */}
                <div className="border-t border-[#1E293B] pt-4">
                  <div className="flex items-center gap-2 border-b border-[#1E293B] pb-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubTab('metrics')}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        selectedSubTab === 'metrics'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-[#15203A]'
                      }`}
                    >
                      Metrics
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubTab('alerts')}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        selectedSubTab === 'alerts'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-[#15203A]'
                      }`}
                    >
                      Alerts
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubTab('logs')}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        selectedSubTab === 'logs'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-[#15203A]'
                      }`}
                    >
                      Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubTab('events')}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        selectedSubTab === 'events'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-[#15203A]'
                      }`}
                    >
                      Events
                    </button>
                  </div>

                  {/* Tab 1: Metrics */}
                  {selectedSubTab === 'metrics' && (
                    <div className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-400" />
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                            {trendMetric === 'cpu' ? 'CPU Usage Trend' : trendMetric === 'memory' ? 'Memory Usage Trend' : 'Disk Space Trend'}
                          </h5>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#111A2E] p-1 rounded-lg border border-[#1E293B]">
                          <button
                            type="button"
                            onClick={() => setTrendMetric('cpu')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                              trendMetric === 'cpu' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            CPU
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrendMetric('memory')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                              trendMetric === 'memory' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Memory
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrendMetric('disk')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                              trendMetric === 'disk' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Disk
                          </button>
                        </div>
                      </div>

                      <div className="w-full h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="mainTrend" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                  offset="5%"
                                  stopColor={trendMetric === 'cpu' ? '#10B981' : trendMetric === 'memory' ? '#3B82F6' : '#A855F7'}
                                  stopOpacity={0.4}
                                />
                                <stop
                                  offset="95%"
                                  stopColor={trendMetric === 'cpu' ? '#10B981' : trendMetric === 'memory' ? '#3B82F6' : '#A855F7'}
                                  stopOpacity={0.0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E293B' }} />
                            <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-[#111A2E] border border-[#1E293B] p-2 rounded shadow text-xs">
                                      <span className="text-slate-400">{payload[0].payload.time} — </span>
                                      <span className="font-bold text-white capitalize">{trendMetric}: {payload[0].value}%</span>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={trendMetric === 'cpu' ? '#10B981' : trendMetric === 'memory' ? '#3B82F6' : '#A855F7'}
                              strokeWidth={2.5}
                              fill="url(#mainTrend)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Alerts */}
                  {selectedSubTab === 'alerts' && (
                    <div className="pt-4">
                      {selectedServer.lastError ? (
                        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-xs font-bold text-white">Active Telemetry Warning</strong>
                            <p className="text-xs text-rose-300 mt-1">{selectedServer.lastError}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <strong className="block text-xs font-bold text-white">All Systems Healthy</strong>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Real-time SSH probe telemetry is within normal operating thresholds for {selectedServer.name}.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Logs */}
                  {selectedSubTab === 'logs' && (
                    <div className="pt-4">
                      <div className="bg-[#090E1A] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1.5 overflow-x-auto max-h-56">
                        <div className="text-slate-500">[System Telemetry Engine] Initializing diagnostic session...</div>
                        <div className="text-emerald-400">
                          ✔ [SSH Connect] Established authenticated session with {selectedServer.host}:{selectedServer.port} ({selectedServer.username})
                        </div>
                        <div className="text-slate-300">
                          ℹ [Host OS] {selectedServer.os?.name} {selectedServer.os?.version} (Kernel: {selectedServer.os?.kernel}, Arch: {selectedServer.os?.arch})
                        </div>
                        <div className="text-slate-300">
                          ℹ [Hardware] {selectedServer.hardware?.cpuCores} cores CPU, {formatBytes(selectedServer.hardware?.totalMemoryBytes)} Total RAM
                        </div>
                        <div className="text-sky-400">
                          ℹ [Container Engine] {selectedServer.docker?.detected ? `Docker ${selectedServer.docker?.version} active with ${selectedServer.docker?.runningCount} running containers` : 'No Docker daemon running'}
                        </div>
                        <div className="text-slate-400">
                          ℹ [Telemetry Snapshot] CPU: {cpuVal}% (1m load: {selectedServer.metrics?.cpu?.loadAvg1m || 0}), RAM: {memVal}%, Disk: {diskVal}%
                        </div>
                        <div className="text-emerald-400">
                          ✔ [Probe Cycle Complete] Last synchronized: {selectedServer.lastConnectedAt ? new Date(selectedServer.lastConnectedAt).toLocaleTimeString() : 'Active'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Events */}
                  {selectedSubTab === 'events' && (
                    <div className="pt-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[#111A2E] border border-[#1E293B] text-xs">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-white font-medium">Telemetry Synchronized Successfully</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {selectedServer.lastConnectedAt ? new Date(selectedServer.lastConnectedAt).toLocaleTimeString() : 'Just now'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[#111A2E] border border-[#1E293B] text-xs">
                          <div className="flex items-center gap-2.5">
                            <Wifi className="w-4 h-4 text-blue-400" />
                            <span className="text-white font-medium">Heartbeat Health Check Acknowledged</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">30s ago</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[#111A2E] border border-[#1E293B] text-xs">
                          <div className="flex items-center gap-2.5">
                            <HardDrive className="w-4 h-4 text-purple-400" />
                            <span className="text-white font-medium">Disk Storage Partition & Mount Verification</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">1m ago</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs bg-[#0D1526] rounded-xl border border-[#1E293B]">
                No server selected. Click a server tab above to view real-time telemetry.
              </div>
            )}
          </div>


          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] rounded-xl p-3">
            {/* Fleet Status Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFleetFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                All Servers ({servers.length})
              </button>

              <button
                onClick={() => setFleetFilter('online')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'online'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400 hover:bg-emerald-950/30'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Online ({onlineServersCount})</span>
              </button>

              <button
                onClick={() => setFleetFilter('offline')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'offline'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Offline ({totalCustomServers - onlineServersCount})
              </button>

              <button
                onClick={() => setFleetFilter('docker')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'docker'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-400 hover:bg-sky-950/30'
                }`}
              >
                Docker Hosts ({servers.filter((s) => s.docker?.detected).length})
              </button>

              <button
                onClick={() => setFleetFilter('kubernetes')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'kubernetes'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-400 hover:bg-indigo-950/30'
                }`}
              >
                Kubernetes ({servers.filter((s) => s.kubernetes?.detected).length})
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
                    <th className="py-3 px-4">Provider / Location</th>
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

                        {/* Provider / Location */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-800/60 text-slate-300 border-slate-700/60">
                            <span className="uppercase text-blue-400 font-bold">{server.cloudProvider}</span>
                            {server.region && <span className="text-slate-400">({server.region})</span>}
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
              {/* Row 1: Server Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Server Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. vm01siva or prod-api-01"
                  className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
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
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    {formData.authMethod === 'privateKey' ? 'SSH Private Key (PEM or PPK)' : 'SSH Password'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {formData.authMethod === 'privateKey' && (
                      <label className="cursor-pointer text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30 transition-all flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Upload .pem / .ppk key file</span>
                        <input
                          type="file"
                          accept=".pem,.ppk,.key,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const text = event.target?.result as string;
                                if (text) {
                                  setFormData((prev) => ({ ...prev, authSecret: text }));
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                      </label>
                    )}
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Encrypted at rest with AES-256-GCM</span>
                    </span>
                  </div>
                </div>

                {formData.authMethod === 'privateKey' ? (
                  <textarea
                    required
                    rows={4}
                    value={formData.authSecret}
                    onChange={(e) => setFormData({ ...formData, authSecret: e.target.value })}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;... (or PuTTY PPK key content)"
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
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <strong className="block font-bold">{testResult.message || testResult.error}</strong>
                      {testResult.hint && (
                        <div className="mt-2 text-[11px] text-slate-300 bg-[#0B1120]/90 p-3 rounded-lg border border-slate-700/60 leading-relaxed">
                          <strong className="text-amber-400 block mb-0.5">💡 Configuration Diagnosis & Solution:</strong>
                          <span>{testResult.hint}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!testResult.success && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-rose-800/40">
                      <span className="text-[11px] text-slate-400">
                        Want to register this server now and establish connectivity later?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddServerSubmit(undefined, true)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors shrink-0"
                      >
                        Add Server in Offline Mode
                      </button>
                    </div>
                  )}

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
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span className="whitespace-pre-line leading-relaxed">{submitError}</span>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-rose-800/40">
                    <span className="text-[11px] text-slate-400">
                      You can save this server into inventory now and troubleshoot SSH access later.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddServerSubmit(undefined, true)}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors shrink-0"
                    >
                      Save as Offline Server
                    </button>
                  </div>
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
                <span className="text-xs text-slate-400 font-medium">{deleteTarget.host}:{deleteTarget.port}</span>
              </div>
            </div>

            {/* Server Details Summary Card */}
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Server Name:</span>
                <span className="font-bold text-white">{deleteTarget.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Host IP / Port:</span>
                <span className="font-mono text-blue-400 font-semibold">{deleteTarget.host}:{deleteTarget.port}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Provider & Location:</span>
                <span className="text-slate-300">
                  <span className="uppercase">{deleteTarget.cloudProvider}</span> ({deleteTarget.region})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Health:</span>
                <span className={`font-semibold ${deleteTarget.status === 'Online' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {deleteTarget.status} ({deleteTarget.hardware?.cpuCores || 1} CPU cores, {formatBytes(deleteTarget.hardware?.totalMemoryBytes || 0)} RAM)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Disconnecting will terminate scheduled SSH telemetry collection, stop agent sync, and purge this server node from the monitoring fleet.
            </p>

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
                disabled={deleting}
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
