'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import {
  Server,
  Terminal,
  Activity,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  FileText,
  Rocket,
  Globe,
  Folder,
  GitBranch,
  Package,
  ChevronDown,
  Cpu,
  HardDrive,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { NginxLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { NginxServerCard } from '@/components/dashboard/nginx/NginxServerCard';
import { NginxOverviewTab } from '@/components/dashboard/nginx/NginxOverviewTab';
import { NginxServiceTab } from '@/components/dashboard/nginx/NginxServiceTab';
import { NginxFileBrowserTab } from '@/components/dashboard/nginx/NginxFileBrowserTab';
import { NginxGitTab } from '@/components/dashboard/nginx/NginxGitTab';
import { NginxApplicationsTab } from '@/components/dashboard/nginx/NginxApplicationsTab';
import { NginxSSHTerminalTab } from '@/components/dashboard/nginx/NginxSSHTerminalTab';
import { NginxLogsTab } from '@/components/dashboard/nginx/NginxLogsTab';
import { NginxPM2Tab } from '@/components/dashboard/nginx/NginxPM2Tab';
import { NginxReverseProxyTab } from '@/components/dashboard/nginx/NginxReverseProxyTab';
import { NginxDirectPipeline } from '@/components/dashboard/nginx/NginxDirectPipeline';
import { AddNginxServerModal } from '@/components/dashboard/nginx/AddNginxServerModal';
import { CreateReverseProxyModal } from '@/components/dashboard/nginx/CreateReverseProxyModal';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { INginxServerData } from '@/models/NginxServer';
import { INginxDeploymentData } from '@/models/NginxDeployment';
import { ReverseProxySite, GitRepoInfo, DiscoveredApp } from '@/lib/nginx/nginxEngine';

type NginxServerWorkspaceTab =
  | 'deploy'
  | 'overview'
  | 'apps'
  | 'git'
  | 'service'
  | 'access-logs'
  | 'error-logs'
  | 'pm2'
  | 'files'
  | 'terminal'
  | 'proxy';

export default function NginxDashboardPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [servers, setServers] = useState<INginxServerData[]>([]);
  const [activeServer, setActiveServer] = useState<INginxServerData | null>(null);

  // Active Workspace Tab inside the Selected Server (Defaults directly to 'deploy')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<NginxServerWorkspaceTab>('deploy');

  // Search filter for All Servers view
  const [searchQuery, setSearchQuery] = useState('');

  // Server-specific details state
  const [serverDetailsMap, setServerDetailsMap] = useState<Record<string, any>>({});
  const [proxySitesMap, setProxySitesMap] = useState<Record<string, ReverseProxySite[]>>({});

  // Deployments and Apps state
  const [deployments, setDeployments] = useState<INginxDeploymentData[]>([]);
  const [gitRepos, setGitRepos] = useState<GitRepoInfo[]>([]);
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [loadingGit, setLoadingGit] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  // Loading & action states
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  const [refreshingServerId, setRefreshingServerId] = useState<string | null>(null);
  const [testingSSHServerId, setTestingSSHServerId] = useState<string | null>(null);
  const [actionLoadingServerId, setActionLoadingServerId] = useState<string | null>(null);
  const [lastActionResult, setLastActionResult] = useState<{ success: boolean; output: string } | null>(null);

  // Modals
  const [addServerModalOpen, setAddServerModalOpen] = useState(false);
  const [createProxyModalOpen, setCreateProxyModalOpen] = useState(false);
  const [proxyTargetServer, setProxyTargetServer] = useState<INginxServerData | null>(null);
  const [sshModalOpen, setSshModalOpen] = useState(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);

  // Feedback Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch Servers from database
  const fetchServers = useCallback(async () => {
    setIsLoadingServers(true);
    try {
      const res = await fetch('/api/nginx/servers');
      const data = await res.json();
      if (res.ok && data.servers) {
        const cleanServers = (data.servers as INginxServerData[]).filter(
          (s) =>
            s.host !== '44.199.21.34' &&
            !/racha|nacha|rachana/i.test(s.name || '') &&
            !/premise/i.test(s.cloudProvider || '')
        );
        setServers(cleanServers);

        // If an active server was already selected, update its reference
        setActiveServer((prev) => {
          if (!prev) return null;
          return cleanServers.find((s) => s._id === prev._id) || null;
        });

        return cleanServers;
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err);
    } finally {
      setIsLoadingServers(false);
    }
    return [];
  }, []);

  // 2. Fetch Single Server Details
  const fetchServerDetails = useCallback(async (server: INginxServerData) => {
    if (!server?._id) return;
    try {
      const res = await fetch(`/api/nginx/servers/${server._id}/status`);
      const data = await res.json();
      if (res.ok && data.details) {
        setServerDetailsMap((prev) => ({
          ...prev,
          [server._id]: data.details,
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch details for ${server.name}:`, err);
    }
  }, []);

  // 3. Fetch Single Server Reverse Proxies
  const fetchProxies = useCallback(async (server: INginxServerData) => {
    if (!server?._id) return;
    try {
      const res = await fetch(`/api/nginx/servers/${server._id}/proxy`);
      const data = await res.json();
      if (res.ok && data.sites) {
        setProxySitesMap((prev) => ({
          ...prev,
          [server._id]: data.sites,
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch reverse proxies for ${server.name}:`, err);
    }
  }, []);

  // 4. Fetch Deployments
  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch('/api/nginx/deployments');
      const data = await res.json();
      if (res.ok && data.deployments) {
        setDeployments(data.deployments);
      }
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    }
  }, []);

  // 5. Fetch Git Repos for Active Server
  const fetchGitRepos = useCallback(async () => {
    if (!activeServer?._id) return;
    setLoadingGit(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/git`);
      const data = await res.json();
      if (res.ok && data.repos) {
        setGitRepos(data.repos);
      }
    } catch (err) {
      console.error('Failed to fetch git repos:', err);
    } finally {
      setLoadingGit(false);
    }
  }, [activeServer?._id]);

  // 6. Fetch Applications for Active Server
  const fetchApps = useCallback(async () => {
    if (!activeServer?._id) return;
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps`);
      const data = await res.json();
      if (res.ok && data.apps) {
        setDiscoveredApps(data.apps);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    } finally {
      setLoadingApps(false);
    }
  }, [activeServer?._id]);

  // Select Server & Load its private workbench
  const handleSelectServer = useCallback((server: INginxServerData | null) => {
    setActiveServer(server);
    if (server) {
      fetchServerDetails(server);
      fetchProxies(server);
    }
  }, [fetchServerDetails, fetchProxies]);

  // Initial Data Load (Loads all servers without auto-forcing a single selection)
  useEffect(() => {
    const init = async () => {
      await fetchServers();
      fetchDeployments();
    };
    init();
  }, [fetchServers, fetchDeployments]);

  // Auto-fetch Git Repos or Apps when navigating to those tabs
  useEffect(() => {
    if (activeWorkspaceTab === 'git' && activeServer && gitRepos.length === 0) {
      fetchGitRepos();
    }
    if (activeWorkspaceTab === 'apps' && activeServer && discoveredApps.length === 0) {
      fetchApps();
    }
  }, [activeWorkspaceTab, activeServer?._id, fetchGitRepos, fetchApps, gitRepos.length, discoveredApps.length]);

  // Test SSH for active or target server
  const handleTestSSH = async (targetServer?: INginxServerData | null) => {
    const srv = targetServer || activeServer;
    if (!srv?._id) return;
    setTestingSSHServerId(srv._id);
    try {
      const res = await fetch(`/api/nginx/servers/${srv._id}/test`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `SSH verified for ${srv.name}! Latency: ${data.latencyMs}ms (${data.osInfo || 'Linux'})`);
        fetchServers();
      } else {
        showToast('error', data.error || `SSH test failed for ${srv.name}`);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setTestingSSHServerId(null);
    }
  };

  // Open PuTTY / SSH Web Terminal
  const handleOpenTerminal = (targetServer?: INginxServerData | null) => {
    const srv = targetServer || activeServer;
    if (!srv?._id) return;
    setTerminalTarget({
      sshServerId: srv._id,
      name: srv.name,
      host: srv.host,
      port: srv.port || 22,
      username: srv.username,
      cloudProvider: srv.cloudProvider,
      region: srv.region,
    });
    setSshModalOpen(true);
  };

  // Refresh Metrics for single server
  const handleRefreshServerMetrics = async (targetServer: INginxServerData) => {
    if (!targetServer?._id) return;
    setRefreshingServerId(targetServer._id);
    try {
      await fetchServerDetails(targetServer);
      await fetchProxies(targetServer);
      await fetchServers();
      showToast('success', `Live metrics updated for ${targetServer.name}`);
    } catch (err: any) {
      showToast('error', `Refresh failed: ${err.message}`);
    } finally {
      setRefreshingServerId(null);
    }
  };

  // Execute Nginx Lifecycle Action
  const handleNginxAction = async (
    targetServer: INginxServerData,
    action: 'install' | 'start' | 'stop' | 'restart' | 'reload' | 'test'
  ) => {
    if (!targetServer?._id) return;
    setActionLoadingServerId(targetServer._id);
    setLastActionResult(null);
    try {
      const res = await fetch(`/api/nginx/servers/${targetServer._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setLastActionResult({ success: data.success, output: data.output });
      if (res.ok && data.success) {
        showToast('success', data.message || `Nginx ${action} successfully executed.`);
        await fetchServerDetails(targetServer);
        await fetchServers();
      } else {
        showToast('error', data.output || data.error || `Nginx ${action} failed.`);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoadingServerId(null);
    }
  };

  // Open Create Proxy Modal for this server
  const handleOpenCreateProxyModal = (targetServer?: INginxServerData | null) => {
    setProxyTargetServer(targetServer || activeServer);
    setCreateProxyModalOpen(true);
  };

  // Delete Proxy Site
  const handleDeleteProxySite = async (targetServer: INginxServerData, fileName: string) => {
    if (!confirm(`Delete reverse proxy site configuration "${fileName}" from ${targetServer.name}?`)) {
      return;
    }
    try {
      const res = await fetch(
        `/api/nginx/servers/${targetServer._id}/proxy?file=${encodeURIComponent(fileName)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message || `Removed site ${fileName}`);
        fetchProxies(targetServer);
      } else {
        showToast('error', data.message || 'Failed to remove proxy site');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Display ALL servers together (searchable)
  const filteredAllServers = useMemo(() => {
    if (!searchQuery) return servers;
    const q = searchQuery.toLowerCase().trim();
    return servers.filter((s) => {
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchHost = (s.host || '').toLowerCase().includes(q);
      const matchPriv = (s.privateIp || '').toLowerCase().includes(q);
      const matchId = (s.instanceId || '').toLowerCase().includes(q);
      const matchRegion = (s.region || '').toLowerCase().includes(q);
      const matchProvider = (s.cloudProvider || '').toLowerCase().includes(q);
      return matchName || matchHost || matchPriv || matchId || matchRegion || matchProvider;
    });
  }, [servers, searchQuery]);

  // Server Workspace Navigation Pills: Display ALL features for the selected server
  const workspaceTabs = [
    { id: 'deploy' as const, label: 'Direct Deploy', icon: Rocket, badge: '5-Step' },
    { id: 'overview' as const, label: 'Overview', icon: Activity },
    { id: 'apps' as const, label: 'Applications', icon: Package, badge: discoveredApps.length > 0 ? discoveredApps.length : undefined },
    { id: 'git' as const, label: 'Git Repositories', icon: GitBranch, badge: gitRepos.length > 0 ? gitRepos.length : undefined },
    { id: 'service' as const, label: 'Nginx', icon: NginxLogo },
    { id: 'access-logs' as const, label: 'Access Logs', icon: FileText },
    { id: 'error-logs' as const, label: 'Error Logs', icon: AlertTriangle },
    { id: 'pm2' as const, label: 'PM2', icon: Layers },
    { id: 'files' as const, label: 'File Explorer', icon: Folder },
    { id: 'terminal' as const, label: 'SSH Terminal', icon: Terminal },
    { id: 'proxy' as const, label: 'Reverse Proxy', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Header */}
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/* Scrollable Dashboard Body */}
        <main className="p-4 lg:p-7 space-y-5 w-full">
          {/* Toast Notification */}
          {toast && (
            <div
              className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 border animate-in slide-in-from-top-2 duration-200 ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950/90 text-rose-300 border-rose-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. TOP HEADER & SERVER WORKBENCH SELECTOR */}
          {/* ========================================================================= */}
          <div className="bg-[#111A2E]/95 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-2 shadow-inner shrink-0">
                <NginxLogo className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-white tracking-wide">
                    Nginx Management &amp; Application Deployment
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {activeServer ? 'SELECTED SERVER' : 'FLEET OVERVIEW'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeServer
                    ? `Managing server: ${activeServer.name} (${activeServer.host})`
                    : 'Select any server from your infrastructure fleet to manage Nginx, explore files, and deploy applications'}
                </p>
              </div>
            </div>

            {/* Server Selector & Quick Fleet Actions */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Server Dropdown */}
              <div className="relative flex-1 sm:flex-initial min-w-[280px]">
                <select
                  value={activeServer?._id || ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      handleSelectServer(null);
                    } else {
                      const found = servers.find((s) => s._id === e.target.value);
                      if (found) handleSelectServer(found);
                    }
                  }}
                  className="w-full appearance-none pl-10 pr-9 py-2 rounded-xl bg-[#0B1120] border border-slate-700/80 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 shadow-inner transition cursor-pointer"
                >
                  <option value="">🖥️ All Servers Fleet ({servers.length})</option>
                  {servers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.host}) - {s.cloudProvider?.toUpperCase()} {s.connectionStatus === 'Online' ? '🟢' : '⚪'}
                    </option>
                  ))}
                </select>

                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                  {activeServer?.cloudProvider === 'azure' ? (
                    <AzureLogo className="w-4 h-4" />
                  ) : activeServer?.cloudProvider === 'aws' ? (
                    <AwsLogo className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Server className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* SSH Terminal Quick Button */}
              {activeServer && (
                <button
                  type="button"
                  onClick={() => handleOpenTerminal(activeServer)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                  title="Launch PuTTY Web Terminal"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>SSH Terminal</span>
                </button>
              )}

              {/* Test SSH */}
              {activeServer && (
                <button
                  type="button"
                  onClick={() => handleTestSSH(activeServer)}
                  disabled={!!testingSSHServerId}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition-all cursor-pointer disabled:opacity-50"
                  title="Verify SSH Connectivity"
                >
                  <Activity className={`w-3.5 h-3.5 text-emerald-400 ${testingSSHServerId ? 'animate-spin' : ''}`} />
                  <span>Test SSH</span>
                </button>
              )}

              {/* Refresh Fleet */}
              <button
                type="button"
                onClick={() => {
                  fetchServers();
                  if (activeServer) {
                    fetchServerDetails(activeServer);
                    fetchProxies(activeServer);
                  }
                  showToast('success', 'Server fleet metrics refreshed.');
                }}
                disabled={isLoadingServers}
                className="p-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition-all cursor-pointer"
                title="Refresh Fleet Telemetry"
              >
                <RefreshCw className={`w-4 h-4 text-blue-400 ${isLoadingServers ? 'animate-spin' : ''}`} />
              </button>

              {/* Add Server */}
              <button
                type="button"
                onClick={() => setAddServerModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Server</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. CONDITIONAL VIEW: NO SERVER SELECTED -> DISPLAY ALL SERVERS */}
          {/* ========================================================================= */}
          {!activeServer ? (
            <div className="space-y-4">
              {/* Header Banner for All Servers view */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>All Servers</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold font-mono">
                        {servers.length} Registered
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Displaying all connected cloud servers across your infrastructure. Click on any server to manage its Nginx and deployments.
                    </p>
                  </div>
                </div>

                {/* Search all servers */}
                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, IP, region..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#0D1526] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* All Servers List */}
              <div className="space-y-3.5">
                {filteredAllServers.length > 0 ? (
                  filteredAllServers.map((server) => {
                    const cpuP = server.metrics?.cpuPercent ?? 0;
                    const memP = server.metrics?.memoryPercent ?? 0;
                    const diskP = server.metrics?.diskPercent ?? 0;

                    return (
                      <div
                        key={server._id}
                        className="bg-[#111A2E] hover:bg-[#142038] border border-[#1E293B] hover:border-blue-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 transition-all space-y-4"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Left: Server Identity */}
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-[#0D1526] border border-[#1E293B] flex items-center justify-center p-2.5">
                              {server.cloudProvider === 'azure' ? (
                                <AzureLogo className="w-7 h-7" />
                              ) : server.cloudProvider === 'aws' ? (
                                <AwsLogo className="w-7 h-7 text-amber-400" />
                              ) : (
                                <Server className="w-7 h-7 text-purple-400" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-bold text-white tracking-wide">
                                  {server.name}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                  {server.cloudProvider}
                                </span>
                                {server.region && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#0D1526] border border-[#1E293B]">
                                    {server.region}
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    server.connectionStatus === 'Online'
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      server.connectionStatus === 'Online'
                                        ? 'bg-emerald-400 animate-pulse'
                                        : 'bg-rose-400'
                                    }`}
                                  />
                                  {server.connectionStatus}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                                <span>
                                  Host IP: <strong className="text-slate-200">{server.host}</strong>
                                </span>
                                {server.privateIp && (
                                  <span>
                                    Private: <strong className="text-slate-300">{server.privateIp}</strong>
                                  </span>
                                )}
                                {server.instanceId && (
                                  <span>
                                    ID: <strong className="text-slate-400">{server.instanceId}</strong>
                                  </span>
                                )}
                                <span>
                                  OS: <strong className="text-slate-300">{server.osName || 'Linux'}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick Action & Manage Button */}
                          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenTerminal(server)}
                              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                              title="PuTTY Web Terminal"
                            >
                              <Terminal className="w-3.5 h-3.5 text-blue-400" />
                              <span>Terminal</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTestSSH(server)}
                              disabled={testingSSHServerId === server._id}
                              className="px-3 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Test SSH Connectivity"
                            >
                              <Activity className={`w-3.5 h-3.5 text-emerald-400 ${testingSSHServerId === server._id ? 'animate-spin' : ''}`} />
                              <span>Test SSH</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectServer(server)}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <span>Select &amp; Manage Server</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Resource Meters Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#1E293B]/70">
                          {/* CPU */}
                          <div className="bg-[#0B1120]/70 border border-[#1E293B] rounded-xl p-2.5">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                                CPU
                              </span>
                              <span className="font-bold text-white font-mono">{cpuP}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-cyan-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, cpuP)}%` }}
                              />
                            </div>
                          </div>

                          {/* RAM */}
                          <div className="bg-[#0B1120]/70 border border-[#1E293B] rounded-xl p-2.5">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                RAM
                              </span>
                              <span className="font-bold text-white font-mono">{memP}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, memP)}%` }}
                              />
                            </div>
                          </div>

                          {/* Disk */}
                          <div className="bg-[#0B1120]/70 border border-[#1E293B] rounded-xl p-2.5">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                                Disk
                              </span>
                              <span className="font-bold text-white font-mono">{diskP}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, diskP)}%` }}
                              />
                            </div>
                          </div>

                          {/* Uptime */}
                          <div className="bg-[#0B1120]/70 border border-[#1E293B] rounded-xl p-2.5 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Activity className="w-3.5 h-3.5 text-amber-400" />
                              Uptime
                            </span>
                            <span className="font-mono text-amber-300 font-semibold text-[11px]">
                              {server.metrics?.uptime || 'Active'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400 space-y-3">
                    <Server className="w-10 h-10 mx-auto text-slate-500" />
                    <h4 className="text-base font-bold text-white">No Servers Found</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      No cloud servers were found matching your criteria. Try adding an AWS EC2 or Azure VM server.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAddServerModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Server</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 3. SERVER IS SELECTED: DISPLAY ALL WORKSPACE FEATURES FOR THIS SERVER */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Back button & Server Banner */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
                  {/* Left: Back button + Server Meta Info */}
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleSelectServer(null)}
                      className="p-2.5 rounded-xl bg-[#0D1526] hover:bg-slate-800 text-slate-300 hover:text-white border border-[#1E293B] transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
                      title="Return to All Servers Fleet view"
                    >
                      <ArrowLeft className="w-4 h-4 text-blue-400" />
                      <span>All Servers</span>
                    </button>

                    <div className="w-12 h-12 rounded-xl bg-[#0D1526] border border-[#1E293B] flex items-center justify-center p-2.5 shrink-0">
                      {activeServer.cloudProvider === 'azure' ? (
                        <AzureLogo className="w-7 h-7" />
                      ) : activeServer.cloudProvider === 'aws' ? (
                        <AwsLogo className="w-7 h-7 text-amber-400" />
                      ) : (
                        <Server className="w-7 h-7 text-purple-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-white tracking-wide">
                          {activeServer.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {activeServer.cloudProvider}
                        </span>
                        {activeServer.region && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#0D1526] border border-[#1E293B]">
                            {activeServer.region}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            activeServer.connectionStatus === 'Online'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              activeServer.connectionStatus === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                            }`}
                          />
                          {activeServer.connectionStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                        <span>
                          IP: <strong className="text-slate-200">{activeServer.host}</strong>
                        </span>
                        {activeServer.privateIp && (
                          <span>
                            Private: <strong className="text-slate-300">{activeServer.privateIp}</strong>
                          </span>
                        )}
                        {activeServer.instanceId && (
                          <span>
                            ID: <strong className="text-slate-400">{activeServer.instanceId}</strong>
                          </span>
                        )}
                        <span>
                          OS: <strong className="text-slate-300">{activeServer.osName || 'Linux'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRefreshServerMetrics(activeServer)}
                      disabled={refreshingServerId === activeServer._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${refreshingServerId === activeServer._id ? 'animate-spin' : ''}`} />
                      <span>Sync Metrics</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenTerminal(activeServer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition"
                    >
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      <span>PuTTY</span>
                    </button>
                  </div>
                </div>

                {/* 4 Live Resource Utilization Meters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {/* CPU Utilization */}
                  <div className="bg-[#0B1120]/80 border border-[#1E293B] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                        CPU Usage
                      </span>
                      <span className="font-bold text-white font-mono">
                        {activeServer.metrics?.cpuPercent ?? 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (activeServer.metrics?.cpuPercent ?? 0) > 85
                            ? 'bg-rose-500'
                            : (activeServer.metrics?.cpuPercent ?? 0) > 60
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, activeServer.metrics?.cpuPercent ?? 0)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">Live compute load</p>
                  </div>

                  {/* RAM / Memory Utilization */}
                  <div className="bg-[#0B1120]/80 border border-[#1E293B] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        RAM Usage
                      </span>
                      <span className="font-bold text-white font-mono">
                        {activeServer.metrics?.memoryPercent ?? 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (activeServer.metrics?.memoryPercent ?? 0) > 85
                            ? 'bg-rose-500'
                            : (activeServer.metrics?.memoryPercent ?? 0) > 70
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, activeServer.metrics?.memoryPercent ?? 0)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {activeServer.metrics?.memoryUsedGb !== undefined && activeServer.metrics?.memoryTotalGb
                        ? `${activeServer.metrics.memoryUsedGb} GB / ${activeServer.metrics.memoryTotalGb} GB`
                        : 'Physical memory'}
                    </p>
                  </div>

                  {/* Disk Space Utilization */}
                  <div className="bg-[#0B1120]/80 border border-[#1E293B] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                        Disk Storage
                      </span>
                      <span className="font-bold text-white font-mono">
                        {activeServer.metrics?.diskPercent ?? 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (activeServer.metrics?.diskPercent ?? 0) > 90
                            ? 'bg-rose-500'
                            : (activeServer.metrics?.diskPercent ?? 0) > 75
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, activeServer.metrics?.diskPercent ?? 0)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {activeServer.metrics?.diskUsedGb !== undefined && activeServer.metrics?.diskTotalGb
                        ? `${activeServer.metrics.diskUsedGb} GB / ${activeServer.metrics.diskTotalGb} GB`
                        : 'Primary filesystem'}
                    </p>
                  </div>

                  {/* Network & Uptime */}
                  <div className="bg-[#0B1120]/80 border border-[#1E293B] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        System Uptime
                      </span>
                      <span className="font-bold text-amber-300 font-mono text-[11px]">
                        {activeServer.metrics?.uptime || 'Active'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-300 flex items-center justify-between pt-1">
                      <span>Rx: {activeServer.metrics?.networkRx || 'Live'}</span>
                      <span>Tx: {activeServer.metrics?.networkTx || 'Live'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Continuous telemetry</p>
                  </div>
                </div>
              </div>

              {/* Internal Workspace Pills Navigation: Displays ALL Features for Selected Server */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-2 shadow-xl shadow-black/20 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max">
                  {workspaceTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeWorkspaceTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveWorkspaceTab(tab.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workspace Content Body for Selected Server */}
              <div>
                {/* DIRECT DEPLOY PIPELINE TAB (Default) */}
                {activeWorkspaceTab === 'deploy' && (
                  <NginxDirectPipeline
                    activeServer={activeServer}
                    onRefreshServer={() => handleRefreshServerMetrics(activeServer)}
                  />
                )}

                {/* OVERVIEW TAB */}
                {activeWorkspaceTab === 'overview' && (
                  <NginxOverviewTab
                    activeServer={activeServer}
                    serverDetails={serverDetailsMap[activeServer._id]}
                    deployments={deployments}
                    discoveredApps={discoveredApps}
                    onExecuteNginxAction={(act) => handleNginxAction(activeServer, act)}
                    onNavigateTab={(tab) => setActiveWorkspaceTab(tab as NginxServerWorkspaceTab)}
                    onOpenTerminal={() => handleOpenTerminal(activeServer)}
                    isActionLoading={actionLoadingServerId === activeServer._id}
                  />
                )}

                {/* APPLICATIONS TAB */}
                {activeWorkspaceTab === 'apps' && (
                  <NginxApplicationsTab
                    activeServer={activeServer}
                    apps={discoveredApps}
                    onRefresh={fetchApps}
                    onDeployNew={() => setActiveWorkspaceTab('deploy')}
                    loading={loadingApps}
                  />
                )}

                {/* GIT REPOSITORIES TAB */}
                {activeWorkspaceTab === 'git' && (
                  <NginxGitTab
                    activeServer={activeServer}
                    repos={gitRepos}
                    onRefresh={fetchGitRepos}
                    loading={loadingGit}
                  />
                )}

                {/* NGINX SERVICE MANAGEMENT TAB */}
                {activeWorkspaceTab === 'service' && (
                  <NginxServiceTab
                    activeServer={activeServer}
                    serverDetails={serverDetailsMap[activeServer._id]}
                    sites={proxySitesMap[activeServer._id] || []}
                    onExecuteNginxAction={(act) => handleNginxAction(activeServer, act)}
                    onRefresh={() => handleRefreshServerMetrics(activeServer)}
                    onRefreshSites={() => fetchProxies(activeServer)}
                    onCreateNewProxy={() => handleOpenCreateProxyModal(activeServer)}
                    onDeleteSite={(fileName) => handleDeleteProxySite(activeServer, fileName)}
                    isActionLoading={actionLoadingServerId === activeServer._id}
                    lastActionResult={lastActionResult}
                  />
                )}

                {/* ACCESS LOGS TAB */}
                {activeWorkspaceTab === 'access-logs' && (
                  <NginxLogsTab activeServer={activeServer} logType="access" />
                )}

                {/* ERROR LOGS TAB */}
                {activeWorkspaceTab === 'error-logs' && (
                  <NginxLogsTab activeServer={activeServer} logType="error" />
                )}

                {/* PM2 MANAGEMENT TAB */}
                {activeWorkspaceTab === 'pm2' && (
                  <NginxPM2Tab activeServer={activeServer} />
                )}

                {/* FILE EXPLORER TAB */}
                {activeWorkspaceTab === 'files' && (
                  <NginxFileBrowserTab activeServer={activeServer} />
                )}

                {/* SSH TERMINAL TAB */}
                {activeWorkspaceTab === 'terminal' && (
                  <NginxSSHTerminalTab activeServer={activeServer} />
                )}

                {/* REVERSE PROXY TAB */}
                {activeWorkspaceTab === 'proxy' && (
                  <NginxReverseProxyTab
                    activeServer={activeServer}
                    sites={proxySitesMap[activeServer._id] || []}
                    onRefresh={() => fetchProxies(activeServer)}
                    onCreateNew={() => handleOpenCreateProxyModal(activeServer)}
                    onDeleteSite={(fileName) => handleDeleteProxySite(activeServer, fileName)}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS */}
      {/* ========================================================================= */}
      <AddNginxServerModal
        isOpen={addServerModalOpen}
        onClose={() => setAddServerModalOpen(false)}
        onSaved={() => {
          fetchServers().then((srvs) => {
            if (srvs.length > 0 && !activeServer) {
              handleSelectServer(srvs[0]);
            }
          });
          showToast('success', 'Server added successfully.');
        }}
      />

      <CreateReverseProxyModal
        isOpen={createProxyModalOpen}
        onClose={() => {
          setCreateProxyModalOpen(false);
          setProxyTargetServer(null);
        }}
        activeServer={proxyTargetServer || activeServer}
        onCreated={() => {
          const target = proxyTargetServer || activeServer;
          if (target) fetchProxies(target);
          showToast('success', 'Reverse proxy configuration created and activated.');
        }}
      />

      <SSHTerminalModal
        isOpen={sshModalOpen}
        onClose={() => setSshModalOpen(false)}
        target={terminalTarget}
      />
    </div>
  );
}
