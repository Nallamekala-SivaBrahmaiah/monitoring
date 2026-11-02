'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Search,
  RotateCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  Server,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useMonitoring } from '@/context/MonitoringContext';
import { AlertItem } from '@/types/monitoring';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { GroupedServerCardItem } from '@/app/api/alerts/grouped/route';

export default function AlertsPage() {
  const { cloudProvider, triggerRefresh } = useMonitoring();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [groupedServers, setGroupedServers] = useState<GroupedServerCardItem[]>([]);
  const [viewMode, setViewMode] = useState<'grouped' | 'timeline'>('grouped');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Fetch real alerts and grouped server metrics from backend
  const fetchAlerts = useCallback(async (evaluate = false) => {
    try {
      const url = `/api/alerts?status=all${evaluate ? '&evaluate=true' : ''}`;
      const [resAlerts, resGrouped] = await Promise.all([
        fetch(url),
        fetch('/api/alerts/grouped'),
      ]);

      if (resAlerts.ok) {
        const data = await resAlerts.json();
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      }

      if (resGrouped.ok) {
        const groupedData = await resGrouped.json();
        if (Array.isArray(groupedData)) {
          setGroupedServers(groupedData);
        }
      }
    } catch (err) {
      console.warn('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(true);
    const interval = setInterval(() => {
      fetchAlerts(false);
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Acknowledge alert
  const handleAcknowledge = async (id: string) => {
    setActionInProgress(id);
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'acknowledged' }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' } : a))
        );
        triggerRefresh();
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Resolve alert
  const handleResolve = async (id: string) => {
    setActionInProgress(id);
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'resolved' }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a))
        );
        triggerRefresh();
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAlerts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleServerExpand = (serverId: string) => {
    setExpandedServers((prev) => ({ ...prev, [serverId]: !prev[serverId] }));
  };

  const getInspectResourceUrl = (server: GroupedServerCardItem) => {
    if (server.rawProvider === 'azure' || server.resourceType === 'AzureVM') {
      return `/dashboard/azure-vms`;
    }
    if (server.rawProvider === 'aws' || server.resourceType === 'EC2Instance') {
      return `/dashboard/ec2`;
    }
    return `/dashboard/servers`;
  };

  // Filtered grouped servers
  const filteredGroupedServers = groupedServers.filter((server) => {
    // Cloud provider filter (global Header or local filter)
    const rawProv = (server.rawProvider || '').toLowerCase();
    if (cloudProvider === 'aws' && rawProv !== 'aws') return false;
    if (cloudProvider === 'azure' && rawProv !== 'azure') return false;

    if (providerFilter !== 'all') {
      if (providerFilter === 'azure' && rawProv !== 'azure') return false;
      if (providerFilter === 'aws' && rawProv !== 'aws') return false;
      if (providerFilter === 'other' && (rawProv === 'azure' || rawProv === 'aws')) return false;
    }

    // Status filter
    if (statusFilter === 'active' && server.status !== 'active') return false;
    if (statusFilter === 'resolved' && server.status !== 'resolved') return false;

    // Severity filter
    if (severityFilter !== 'all') {
      const matchActive =
        server.activeSeverity &&
        server.activeSeverity.toLowerCase() === severityFilter.toLowerCase();
      const matchAlert = server.alerts.some(
        (a) => a.severity.toLowerCase() === severityFilter.toLowerCase()
      );
      if (!matchActive && !matchAlert) return false;
    }

    // Metric type filter
    if (metricFilter !== 'all') {
      const mf = metricFilter.toLowerCase();
      const hasMetricAlert = server.alerts.some((a) => a.metricName.toLowerCase().includes(mf));
      const hasMetricExceeded =
        (mf === 'cpu' && server.cpu.current !== null && server.cpu.current >= server.cpu.threshold) ||
        (mf === 'memory' &&
          server.memory.current !== null &&
          server.memory.current >= server.memory.threshold) ||
        (mf === 'disk' && server.disk.current !== null && server.disk.current >= server.disk.threshold);
      if (!hasMetricAlert && !hasMetricExceeded) return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = server.serverName.toLowerCase().includes(q);
      const matchId = server.resourceId.toLowerCase().includes(q);
      const matchIp = server.ipAddress.toLowerCase().includes(q);
      const matchRegion = server.region.toLowerCase().includes(q);
      const matchAlert = server.alerts.some(
        (a) => a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q)
      );
      return matchName || matchId || matchIp || matchRegion || matchAlert;
    }

    return true;
  });

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    // Cloud provider filter (global Header or local filter)
    const prov = (a.provider || '').toLowerCase();
    if (cloudProvider === 'aws' && prov !== 'aws') return false;
    if (cloudProvider === 'azure' && prov !== 'azure') return false;

    if (providerFilter !== 'all' && prov !== providerFilter.toLowerCase()) {
      return false;
    }

    // Status filter
    if (statusFilter === 'active' && a.status === 'resolved') return false;
    if (statusFilter === 'resolved' && a.status !== 'resolved') return false;

    // Severity filter
    if (severityFilter !== 'all' && a.severity.toLowerCase() !== severityFilter.toLowerCase()) {
      return false;
    }

    // Metric type filter
    if (metricFilter !== 'all') {
      const mName = (a.metricName || '').toLowerCase();
      if (!mName.includes(metricFilter.toLowerCase())) return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (a.resourceName || '').toLowerCase().includes(q);
      const matchTitle = (a.title || '').toLowerCase().includes(q);
      const matchMessage = (a.message || '').toLowerCase().includes(q);
      const matchId = (a.resourceId || '').toLowerCase().includes(q);
      return matchName || matchTitle || matchMessage || matchId;
    }

    return true;
  });

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const criticalCount = alerts.filter(
    (a) => a.status === 'active' && a.severity.toLowerCase() === 'critical'
  ).length;
  const warningCount = alerts.filter(
    (a) => a.status === 'active' && a.severity.toLowerCase() === 'warning'
  ).length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;

  const formatTime = (iso?: string | null) => {
    if (!iso) return 'N/A';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const getMetricIcon = (metricName?: string) => {
    const m = (metricName || '').toLowerCase();
    if (m.includes('cpu')) return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
    if (m.includes('memory') || m.includes('ram')) return <Layers className="w-3.5 h-3.5 text-sky-400" />;
    if (m.includes('disk')) return <HardDrive className="w-3.5 h-3.5 text-purple-400" />;
    return <Server className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        activeAlertsCount={activeCount}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 space-y-6">
          {/* Header & Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link
                  href="/"
                  className="hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Alerts & Incidents</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Threshold-Based Infrastructure Alerts</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Real-time
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAlerts(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
                title="Run immediate metric evaluation"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Evaluate Now</span>
              </button>

              <Link
                href="/dashboard/settings"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Configure Thresholds</span>
              </Link>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Active Alerts</span>
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">{activeCount}</div>
              <div className="text-[11px] text-slate-400 mt-1">Requiring immediate attention</div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Critical Exceeded</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-rose-400 font-mono">{criticalCount}</div>
              <div className="text-[11px] text-slate-400 mt-1">&gt;= 90% utilization</div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Warnings</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300 font-mono">{warningCount}</div>
              <div className="text-[11px] text-slate-400 mt-1">&gt;= 70% threshold</div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Resolved Alerts</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{resolvedCount}</div>
              <div className="text-[11px] text-slate-400 mt-1">Returned below 70%</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            {/* Left: View Mode Toggle & Status Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle: Server Overview vs Incident History */}
              <div className="flex items-center bg-[#0D1526] p-1 rounded-lg border border-[#1E293B]">
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'grouped'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Server Cards: Live CPU, Memory, and Disk side-by-side for each server"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Server Cards ({groupedServers.length} Servers)</span>
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'timeline'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Historical Incident Log of all past and active alert events"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Incident Log ({alerts.length} Events)</span>
                </button>
              </div>

              {/* Status Toggle Tabs */}
              <div className="flex items-center bg-[#0D1526] p-1 rounded-lg border border-[#1E293B]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({viewMode === 'grouped' ? groupedServers.length : alerts.length})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    statusFilter === 'active'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter('resolved')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    statusFilter === 'resolved'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Resolved ({resolvedCount})
                </button>
              </div>
            </div>

            {/* Right: Search & Select Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search resource, metric, or alert..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48 sm:w-56"
                />
              </div>

              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                aria-label="Filter alerts by severity"
                className="px-2.5 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical (&gt;= 90%)</option>
                <option value="warning">Warning (&gt;= 70%)</option>
                <option value="info">Info</option>
              </select>

              {/* Provider Filter */}
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                aria-label="Filter alerts by cloud provider"
                className="px-2.5 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none"
              >
                <option value="all">All Providers</option>
                <option value="azure">Azure</option>
                <option value="aws">AWS</option>
                <option value="other">Linux Servers</option>
              </select>

              {/* Metric Type Filter */}
              <select
                value={metricFilter}
                onChange={(e) => setMetricFilter(e.target.value)}
                aria-label="Filter alerts by metric type"
                className="px-2.5 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none"
              >
                <option value="all">All Metrics</option>
                <option value="cpu">CPU Utilization</option>
                <option value="memory">Memory Utilization</option>
                <option value="disk">Disk Utilization</option>
              </select>
            </div>
          </div>

          {/* Grouped Server Cards View (Default) */}
          {viewMode === 'grouped' ? (
            <div className="space-y-4">
              {loading ? (
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RotateCw className="w-5 h-5 animate-spin text-blue-400" />
                  <span className="text-xs">Evaluating grouped server telemetry...</span>
                </div>
              ) : filteredGroupedServers.length === 0 ? (
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    {statusFilter === 'active'
                      ? 'All Monitored Servers Are Healthy'
                      : 'No Servers Match Your Filters'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    {statusFilter === 'active'
                      ? 'No threshold alerts are active. Real-time CPU, Memory, and Disk metrics across all connected AWS, Azure, and Linux servers are below the configured 70% threshold.'
                      : 'Try clearing your search query or selecting a different status/severity filter.'}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setSeverityFilter('all');
                        setProviderFilter('all');
                        setMetricFilter('all');
                        setSearch('');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => fetchAlerts(true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Run Check</span>
                    </button>
                  </div>
                </div>
              ) : (
                filteredGroupedServers.map((server) => {
                  const isExpanded = !!expandedServers[server.id];

                  return (
                    <div
                      key={server.id}
                      className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-sm space-y-4 hover:border-slate-700/80 transition-colors"
                    >
                      {/* Card Header: vm01 | Azure | austriaeast */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Cloud Provider Logo */}
                          <div className="p-1.5 rounded-lg bg-[#0D1526] border border-[#1E293B] flex-shrink-0">
                            {server.rawProvider === 'azure' ? (
                              <AzureLogo className="w-4 h-4 text-[#0089D6]" />
                            ) : server.rawProvider === 'aws' ? (
                              <AwsLogo className="w-4 h-4 text-[#FF9900]" />
                            ) : (
                              <Server className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>

                          {/* Server Name | Provider | Region Header */}
                          <div className="flex items-center gap-2 flex-wrap text-sm">
                            <span className="font-bold text-white text-base tracking-tight">
                              {server.serverName}
                            </span>
                            <span className="text-slate-500 font-semibold">|</span>
                            <span className="text-slate-300 font-medium">{server.provider}</span>
                            <span className="text-slate-500 font-semibold">|</span>
                            <span className="text-slate-400 font-mono text-xs">{server.region}</span>
                            {server.ipAddress && server.ipAddress !== '-' && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-slate-400 font-mono text-xs">
                                  {server.ipAddress}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Health & Severity Status Badge */}
                          {server.status === 'active' ? (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                                server.activeSeverity === 'Critical'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              <span>
                                {server.activeSeverity || 'Warning'} Alert ({server.activeAlertsCount})
                              </span>
                            </span>
                          ) : server.status === 'resolved' ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Recovered / Normal</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Healthy</span>
                            </span>
                          )}
                        </div>

                        {/* Quick Navigation Links */}
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/metrics?server=${encodeURIComponent(server.serverName)}`}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors px-2.5 py-1 rounded bg-[#0D1526] border border-[#1E293B]"
                          >
                            <span>Metrics</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                          <Link
                            href={getInspectResourceUrl(server)}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors px-2.5 py-1 rounded bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B]"
                          >
                            <span>Inspect Resource</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {/* Side-by-Side 3-Column Metric Grid: CPU | Memory | Disk */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                        {/* CPU Utilization Box */}
                        <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                              <Cpu className="w-3.5 h-3.5 text-amber-400" />
                              <span>CPU</span>
                            </div>
                            <div className="font-mono text-xs">
                              {server.cpu.current !== null ? (
                                <>
                                  <span
                                    className={`font-bold ${
                                      server.cpu.current >= 90
                                        ? 'text-rose-400'
                                        : server.cpu.current >= server.cpu.threshold
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                    }`}
                                  >
                                    {server.cpu.current}%
                                  </span>
                                  <span className="text-slate-400 font-normal">
                                    {' '}
                                    / {server.cpu.threshold}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-400 font-bold">N/A</span>
                                  <span className="text-slate-500 font-normal">
                                    {' '}
                                    / {server.cpu.threshold}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Compact Progress Bar */}
                          <div className="w-full h-2 bg-[#080D1A] rounded-full overflow-hidden border border-[#1E293B]/80">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                server.cpu.current === null
                                  ? 'w-0'
                                  : server.cpu.current >= 90
                                  ? 'bg-rose-500'
                                  : server.cpu.current >= server.cpu.threshold
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width:
                                  server.cpu.current !== null
                                    ? `${Math.min(100, Math.max(3, server.cpu.current))}%`
                                    : '0%',
                              }}
                            />
                          </div>

                          {/* Peak and Status */}
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="font-mono text-slate-400">
                              Peak:{' '}
                              {server.cpu.peak !== null ? (
                                <span className="text-slate-200 font-semibold">
                                  {server.cpu.peak}%
                                </span>
                              ) : (
                                <span className="text-slate-500">N/A</span>
                              )}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                server.cpu.current === null
                                  ? 'text-slate-500 bg-slate-800/40'
                                  : server.cpu.current >= 90
                                  ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                  : server.cpu.current >= server.cpu.threshold
                                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                                  : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              }`}
                            >
                              {server.cpu.current === null
                                ? 'N/A'
                                : server.cpu.current >= 90
                                ? 'Critical'
                                : server.cpu.current >= server.cpu.threshold
                                ? 'Exceeded'
                                : 'Normal'}
                            </span>
                          </div>
                        </div>

                        {/* Memory Utilization Box */}
                        <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                              <Layers className="w-3.5 h-3.5 text-sky-400" />
                              <span>Memory</span>
                            </div>
                            <div className="font-mono text-xs">
                              {server.memory.current !== null ? (
                                <>
                                  <span
                                    className={`font-bold ${
                                      server.memory.current >= 90
                                        ? 'text-rose-400'
                                        : server.memory.current >= server.memory.threshold
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                    }`}
                                  >
                                    {server.memory.current}%
                                  </span>
                                  <span className="text-slate-400 font-normal">
                                    {' '}
                                    / {server.memory.threshold}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-400 font-bold">N/A</span>
                                  <span className="text-slate-500 font-normal">
                                    {' '}
                                    / {server.memory.threshold}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Compact Progress Bar */}
                          <div className="w-full h-2 bg-[#080D1A] rounded-full overflow-hidden border border-[#1E293B]/80">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                server.memory.current === null
                                  ? 'w-0'
                                  : server.memory.current >= 90
                                  ? 'bg-rose-500'
                                  : server.memory.current >= server.memory.threshold
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width:
                                  server.memory.current !== null
                                    ? `${Math.min(100, Math.max(3, server.memory.current))}%`
                                    : '0%',
                              }}
                            />
                          </div>

                          {/* Peak and Status */}
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="font-mono text-slate-400">
                              Peak:{' '}
                              {server.memory.peak !== null ? (
                                <span className="text-slate-200 font-semibold">
                                  {server.memory.peak}%
                                </span>
                              ) : (
                                <span className="text-slate-500">N/A</span>
                              )}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                server.memory.current === null
                                  ? 'text-slate-500 bg-slate-800/40'
                                  : server.memory.current >= 90
                                  ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                  : server.memory.current >= server.memory.threshold
                                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                                  : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              }`}
                            >
                              {server.memory.current === null
                                ? 'N/A'
                                : server.memory.current >= 90
                                ? 'Critical'
                                : server.memory.current >= server.memory.threshold
                                ? 'Exceeded'
                                : 'Normal'}
                            </span>
                          </div>
                        </div>

                        {/* Disk Utilization Box */}
                        <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                              <span>
                                Disk {server.disk.mount ? `(${server.disk.mount})` : ''}
                              </span>
                            </div>
                            <div className="font-mono text-xs">
                              {server.disk.current !== null ? (
                                <>
                                  <span
                                    className={`font-bold ${
                                      server.disk.current >= 90
                                        ? 'text-rose-400'
                                        : server.disk.current >= server.disk.threshold
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                    }`}
                                  >
                                    {server.disk.current}%
                                  </span>
                                  <span className="text-slate-400 font-normal">
                                    {' '}
                                    / {server.disk.threshold}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-400 font-bold">N/A</span>
                                  <span className="text-slate-500 font-normal">
                                    {' '}
                                    / {server.disk.threshold}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Compact Progress Bar */}
                          <div className="w-full h-2 bg-[#080D1A] rounded-full overflow-hidden border border-[#1E293B]/80">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                server.disk.current === null
                                  ? 'w-0'
                                  : server.disk.current >= 90
                                  ? 'bg-rose-500'
                                  : server.disk.current >= server.disk.threshold
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width:
                                  server.disk.current !== null
                                    ? `${Math.min(100, Math.max(3, server.disk.current))}%`
                                    : '0%',
                              }}
                            />
                          </div>

                          {/* Peak and Status */}
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="font-mono text-slate-400">
                              Peak:{' '}
                              {server.disk.peak !== null ? (
                                <span className="text-slate-200 font-semibold">
                                  {server.disk.peak}%
                                </span>
                              ) : (
                                <span className="text-slate-500">N/A</span>
                              )}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                server.disk.current === null
                                  ? 'text-slate-500 bg-slate-800/40'
                                  : server.disk.current >= 90
                                  ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                  : server.disk.current >= server.disk.threshold
                                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                                  : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              }`}
                            >
                              {server.disk.current === null
                                ? 'N/A'
                                : server.disk.current >= 90
                                ? 'Critical'
                                : server.disk.current >= server.disk.threshold
                                ? 'Exceeded'
                                : 'Normal'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Optional Expandable Alert Lifecycle History for this server */}
                      {server.alerts.length > 0 && (
                        <div className="pt-2 border-t border-[#1E293B]/70">
                          <button
                            onClick={() => toggleServerExpand(server.id)}
                            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
                          >
                            <div className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-blue-400" />
                              <span>
                                Alert History ({server.alerts.length} record
                                {server.alerts.length > 1 ? 's' : ''})
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2 bg-[#0D1526]/60 p-3 rounded-lg border border-[#1E293B]">
                              {server.alerts.map((al) => (
                                <div
                                  key={al.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded bg-[#111A2E]/70 border border-[#1E293B]/60 text-xs"
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        al.status === 'active'
                                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      }`}
                                    >
                                      {al.status.toUpperCase()}
                                    </span>
                                    <span className="font-semibold text-white">{al.title}</span>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-slate-300 font-mono text-[11px]">
                                      {al.value}%
                                    </span>
                                    {typeof al.peakValue === 'number' && (
                                      <span className="text-slate-500 font-mono text-[11px]">
                                        (Peak: {al.peakValue}%)
                                      </span>
                                    )}
                                    <span className="text-slate-400">·</span>
                                    <span className="text-slate-500 text-[11px]">
                                      {formatTime(al.timestamp)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    {al.status === 'active' && (
                                      <button
                                        disabled={actionInProgress === al.id}
                                        onClick={() => handleAcknowledge(al.id)}
                                        className="px-2 py-0.5 text-[11px] font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-300 rounded border border-[#1E293B] transition-colors"
                                      >
                                        Acknowledge
                                      </button>
                                    )}
                                    {al.status !== 'resolved' && (
                                      <button
                                        disabled={actionInProgress === al.id}
                                        onClick={() => handleResolve(al.id)}
                                        className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded border border-emerald-500/30 transition-colors"
                                      >
                                        Resolve
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Timeline / Incident Log Feed View */
            <div className="space-y-4">
              {/* Informational Guidance Banner */}
              <div className="bg-[#111A2E] border border-blue-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-white font-semibold">Historical Incident Audit Log: </span>
                    <span className="text-slate-300">
                      Shows all past threshold-crossing events, incident peaks reached, and resolution details.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewMode('grouped')}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-sm"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>View Server Cards (Live Metrics)</span>
                </button>
              </div>

              <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
                {loading ? (
                  <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <RotateCw className="w-5 h-5 animate-spin text-blue-400" />
                    <span className="text-xs">Evaluating infrastructure alerts...</span>
                  </div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">
                      {statusFilter === 'active'
                        ? 'All Monitored Resources Are Healthy'
                        : 'No Alerts Match Your Filters'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md">
                      {statusFilter === 'active'
                        ? 'No threshold alerts are active. Real-time CPU, Memory, and Disk metrics across all connected AWS, Azure, and Linux servers are below the configured 70% threshold.'
                        : 'Try clearing your search query or selecting a different status/severity filter to view historical alert records.'}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setSeverityFilter('all');
                          setProviderFilter('all');
                          setMetricFilter('all');
                          setSearch('');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
                      >
                        Reset Filters
                      </button>
                      <button
                        onClick={() => fetchAlerts(true)}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Run Check</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1E293B]">
                    {filteredAlerts.map((alert) => {
                      const isExpanded = !!expandedAlerts[alert.id];
                      const isCritical = alert.severity === 'Critical';
                      const isWarning = alert.severity === 'Warning';
                      const isResolved = alert.status === 'resolved';
                      const isAcknowledged = alert.status === 'acknowledged';

                      const displayTitle = isResolved
                        ? `Recovered: ${alert.resourceName} · ${(alert.metricName || 'Metric').toUpperCase()} Normalized`
                        : alert.title;

                      const displayMessage = isResolved
                        ? `Incident resolved. Utilization peaked at ${alert.peakValue || alert.value}% during the alert, and has safely normalized to ${alert.value}% (below the ${alert.threshold || 70}% threshold).`
                        : alert.message ||
                          `${alert.metricName} threshold exceeded on ${alert.resourceName}`;

                      return (
                        <div
                          key={alert.id}
                          className="p-4 hover:bg-[#162238]/60 transition-colors space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {isResolved ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : isCritical ? (
                                  <AlertCircle className="w-5 h-5 text-rose-500" />
                                ) : isWarning ? (
                                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                                ) : (
                                  <Info className="w-5 h-5 text-blue-500" />
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-semibold text-white">
                                    {displayTitle}
                                  </h4>

                                  {/* Metric Badge */}
                                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-[#18233C] text-slate-200 border border-[#1E293B]">
                                    {getMetricIcon(alert.metricName)}
                                    <span className="capitalize">{alert.metricName}</span>
                                  </span>

                                  {/* Provider Badge */}
                                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-[#0D1526] text-slate-300 border border-[#1E293B]">
                                    {alert.provider === 'aws' ? (
                                      <AwsLogo className="w-3.5 h-3.5 text-[#FF9900]" />
                                    ) : alert.provider === 'azure' ? (
                                      <AzureLogo className="w-3.5 h-3.5 text-[#0089D6]" />
                                    ) : (
                                      <Server className="w-3.5 h-3.5 text-emerald-400" />
                                    )}
                                    <span className="uppercase">{alert.provider}</span>
                                  </span>

                                  {/* Severity / Recovered Badge */}
                                  <span
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                      isResolved
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : isCritical
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : isWarning
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    }`}
                                  >
                                    {isResolved ? 'Recovered' : alert.severity}
                                  </span>

                                  {/* Status Badge */}
                                  <span
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                      alert.status === 'active'
                                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                                        : isAcknowledged
                                        ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                                    }`}
                                  >
                                    {alert.status.toUpperCase()}
                                  </span>
                                </div>

                                {/* Message & Details */}
                                <p className="text-xs text-slate-300">{displayMessage}</p>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                                  <span>
                                    Resource:{' '}
                                    <span className="text-white font-medium">
                                      {alert.resourceName}
                                    </span>{' '}
                                    ({alert.resourceType || 'Server'})
                                  </span>
                                  {alert.filesystem && (
                                    <span>
                                      Mount:{' '}
                                      <span className="text-purple-300 font-mono font-medium">
                                        {alert.filesystem}
                                      </span>
                                    </span>
                                  )}
                                  <span>
                                    Region:{' '}
                                    <span className="text-slate-200">
                                      {alert.region || 'global'}
                                    </span>
                                  </span>
                                  <span>
                                    Triggered:{' '}
                                    <span className="text-slate-200">
                                      {formatTime(alert.triggeredAt || alert.timestamp)}
                                    </span>
                                  </span>
                                  {alert.lastEvaluatedAt && (
                                    <span>
                                      Updated:{' '}
                                      <span className="text-slate-200">
                                        {formatTime(alert.lastEvaluatedAt)}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Metric Value Progress & Actions */}
                            <div className="flex items-center gap-3 self-end sm:self-center">
                              {typeof alert.value === 'number' && (
                                <div className="text-right">
                                  {isResolved ? (
                                    <div className="space-y-0.5">
                                      <div className="flex items-baseline justify-end gap-1.5 font-mono">
                                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                          {alert.value}% (Normal)
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        Threshold: &lt; {alert.threshold || 70}%
                                      </div>
                                      {typeof alert.peakValue === 'number' && (
                                        <div className="text-[10px] text-amber-300 font-mono">
                                          Incident Peak: {alert.peakValue}%
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <div className="flex items-baseline justify-end gap-1 font-mono">
                                        <span
                                          className={`text-sm font-bold ${
                                            isCritical ? 'text-rose-400' : 'text-amber-400'
                                          }`}
                                        >
                                          {alert.value}%
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          / {alert.threshold || 70}%
                                        </span>
                                      </div>
                                      <div className="w-24 h-1.5 bg-[#0D1526] rounded-full overflow-hidden mt-1 border border-[#1E293B]">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            isCritical ? 'bg-rose-500' : 'bg-amber-500'
                                          }`}
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              Math.max(5, alert.value)
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                      {typeof alert.peakValue === 'number' && (
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                          Peak: {alert.peakValue}%
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {alert.status === 'active' && (
                                <button
                                  disabled={actionInProgress === alert.id}
                                  onClick={() => handleAcknowledge(alert.id)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-300 rounded-lg border border-[#1E293B] transition-colors disabled:opacity-50"
                                >
                                  Acknowledge
                                </button>
                              )}

                              {alert.status !== 'resolved' && (
                                <button
                                  disabled={actionInProgress === alert.id}
                                  onClick={() => handleResolve(alert.id)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-colors disabled:opacity-50"
                                >
                                  Resolve
                                </button>
                              )}

                              <button
                                onClick={() => toggleExpand(alert.id)}
                                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg bg-[#0D1526] border border-[#1E293B] transition-colors"
                                title="Toggle history timeline"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expandable History Timeline */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-[#1E293B] bg-[#0D1526]/80 rounded-lg p-3 text-xs space-y-2">
                              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-400" />
                                <span>Alert Lifecycle History & Transitions</span>
                              </div>

                              {Array.isArray(alert.history) && alert.history.length > 0 ? (
                                <div className="space-y-1.5 pl-2 border-l border-[#1E293B] ml-1">
                                  {alert.history.map((h, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-[11px]">
                                      <span className="text-slate-500 font-mono">
                                        {formatTime(h.timestamp)}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                          h.status === 'active'
                                            ? 'bg-rose-950 text-rose-300'
                                            : h.status === 'acknowledged'
                                            ? 'bg-amber-950 text-amber-300'
                                            : 'bg-emerald-950 text-emerald-300'
                                        }`}
                                      >
                                        {h.status.toUpperCase()}
                                      </span>
                                      <span className="text-slate-300">
                                        {h.message || `Value: ${h.value}%`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-500 italic">
                                  Initial active alert created on{' '}
                                  {formatTime(alert.triggeredAt || alert.timestamp)}. No subsequent
                                  transitions recorded yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
