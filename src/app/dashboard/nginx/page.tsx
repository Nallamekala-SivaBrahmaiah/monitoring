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
  Copy,
  Check,
  Table,
  Boxes,
  X,
  Bell,
  Clock,
  Settings,
  History as HistoryIcon,
  KeyRound,
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
import { NginxConfigTab } from '@/components/dashboard/nginx/NginxConfigTab';
import { NginxHistoryTab } from '@/components/dashboard/nginx/NginxHistoryTab';
import { NginxDirectPipeline } from '@/components/dashboard/nginx/NginxDirectPipeline';
import { AddNginxServerModal } from '@/components/dashboard/nginx/AddNginxServerModal';
import { CreateReverseProxyModal } from '@/components/dashboard/nginx/CreateReverseProxyModal';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { ConnectSSHModal, ConnectSSHTarget } from '@/components/dashboard/ConnectSSHModal';
import { INginxServerData } from '@/models/NginxServer';
import { INginxDeploymentData } from '@/models/NginxDeployment';
import { ReverseProxySite, GitRepoInfo, DiscoveredApp } from '@/lib/nginx/nginxEngine';

type NginxServerWorkspaceTab =
  | 'overview'
  | 'pm2'
  | 'pm2-logs'
  | 'access-logs'
  | 'error-logs'
  | 'proxy'
  | 'config'
  | 'files'
  | 'apps'
  | 'history'
  | 'deploy'
  | 'git'
  | 'service'
  | 'terminal';

function formatServerId(rawId?: string): string {
  if (!rawId) return '-';
  if (rawId.startsWith('/subscriptions/')) {
    const parts = rawId.split('/');
    const vmIndex = parts.indexOf('virtualMachines');
    const rgIndex = parts.indexOf('resourceGroups');
    const vmName = vmIndex !== -1 && parts[vmIndex + 1] ? parts[vmIndex + 1] : '';
    const rgName = rgIndex !== -1 && parts[rgIndex + 1] ? parts[rgIndex + 1] : '';
    if (vmName && rgName) return `${rgName}/${vmName}`;
    if (vmName) return vmName;
  }
  return rawId;
}

export default function NginxDashboardPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [servers, setServers] = useState<INginxServerData[]>([]);
  const [activeServer, setActiveServer] = useState<INginxServerData | null>(null);

  // Active Workspace Tab inside the Selected Server (Defaults directly to 'apps')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<NginxServerWorkspaceTab>('apps');
  const [autoDeployEnabled, setAutoDeployEnabled] = useState(true);
  const [regionFilter, setRegionFilter] = useState('all');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Just now');

  // Search and view filters for All Servers view
  const [searchQuery, setSearchQuery] = useState('');
  const [cloudFilter, setCloudFilter] = useState<'online' | 'all' | 'azure' | 'aws' | 'offline'>('online');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

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
  const [sshTarget, setSshTarget] = useState<ConnectSSHTarget | null>(null);
  const [showSSHModal, setShowSSHModal] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch Servers from database (with live SSH availability verification)
  const fetchServers = useCallback(async (verifySSH: boolean = false) => {
    setIsLoadingServers(true);
    try {
      const endpoint = verifySSH ? '/api/nginx/servers?verify=true' : '/api/nginx/servers';
      const [resNginx, resServers] = await Promise.all([
        fetch(endpoint),
        fetch('/api/servers').catch(() => null),
      ]);
      const dataNginx = await resNginx.json();
      const dataServers = resServers && resServers.ok ? await resServers.json() : null;
      const registeredServers: any[] = dataServers?.servers || [];

      const KNOWN_FAKE_HOSTS = new Set([
        '4.240.109.230',
        '20.235.243.1',
        '52.63.226.201',
        '3.27.205.136',
        '3.107.183.202',
        '3.106.216.16',
        '32.236.173.166',
        '3.106.129.147',
        '4.194.249.85',
        '3.25.142.55',
      ]);

      if (resNginx.ok && dataNginx.servers) {
        const cleanServers = (dataNginx.servers as INginxServerData[])
          .filter((s) => {
            const h = (s.host || '').trim().toLowerCase();
            const nm = (s.name || '').toLowerCase();
            if (KNOWN_FAKE_HOSTS.has(h)) return false;
            if (/premise/i.test(s.cloudProvider || '')) return false;

            if (registeredServers.length > 0) {
              const matched = registeredServers.some((rs: any) => {
                const rHost = (rs.host || rs.publicIp || '').trim().toLowerCase();
                const rPriv = (rs.privateIp || '').trim().toLowerCase();
                const rName = (rs.name || '').trim().toLowerCase();
                const rId = (rs.cloudResourceId || rs.resourceId || '').trim().toLowerCase();
                const instNorm = (s.instanceId || '').trim().toLowerCase();
                return (
                  (rHost && (rHost === h || rHost === s.privateIp?.toLowerCase())) ||
                  (rPriv && rPriv === h) ||
                  (instNorm && rId && instNorm === rId) ||
                  (rName && rName === nm)
                );
              });
              return matched;
            }
            return true;
          })
          .map((s) => {
            const hostNorm = (s.host || '').trim().toLowerCase();
            const nameNorm = (s.name || '').trim().toLowerCase();
            const instNorm = (s.instanceId || '').trim().toLowerCase();

            const match = registeredServers.find((rs: any) => {
              const rHost = (rs.host || rs.publicIp || '').trim().toLowerCase();
              const rPriv = (rs.privateIp || '').trim().toLowerCase();
              const rName = (rs.name || '').trim().toLowerCase();
              const rId = (rs.cloudResourceId || rs.resourceId || '').trim().toLowerCase();
              return (
                (rHost && (rHost === hostNorm || rHost === rPriv)) ||
                (rPriv && rPriv === hostNorm) ||
                (instNorm && rId && instNorm === rId) ||
                (rName && rName === nameNorm)
              );
            });

            if (match) {
              const cpuP = match.metrics?.cpu?.usagePercent ?? s.metrics?.cpuPercent ?? 0;
              const memP = match.metrics?.memory?.usagePercent ?? s.metrics?.memoryPercent ?? 0;
              const diskP =
                match.metrics?.disks?.[0]?.usagePercent ??
                match.metrics?.disks?.find((d: any) => d.mount === '/')?.usagePercent ??
                s.metrics?.diskPercent ??
                0;
              const uptimeFormatted = match.os?.uptimeFormatted ?? s.metrics?.uptime;

              const memUsedGb = match.metrics?.memory?.usedBytes
                ? Number((match.metrics.memory.usedBytes / 1024 ** 3).toFixed(1))
                : s.metrics?.memoryUsedGb;
              const memTotalGb = match.metrics?.memory?.totalBytes
                ? Number((match.metrics.memory.totalBytes / 1024 ** 3).toFixed(1))
                : s.metrics?.memoryTotalGb;
              const diskUsedGb = match.metrics?.disks?.[0]?.usedBytes
                ? Number((match.metrics.disks[0].usedBytes / 1024 ** 3).toFixed(1))
                : s.metrics?.diskUsedGb;
              const diskTotalGb = match.metrics?.disks?.[0]?.totalBytes
                ? Number((match.metrics.disks[0].totalBytes / 1024 ** 3).toFixed(1))
                : s.metrics?.diskTotalGb;

              return {
                ...s,
                connectionStatus: (s.connectionStatus === 'Online' ? 'Online' : 'Failed') as any,
                privateIp: match.privateIp || s.privateIp,
                region: match.region || s.region,
                instanceId: match.cloudResourceId || match.resourceId || s.instanceId,
                osName: match.os?.name
                  ? `${match.os.name} ${match.os.version || ''}`.trim()
                  : s.osName || 'Linux',
                username: match.username || s.username,
                metrics: {
                  ...s.metrics,
                  cpuPercent: Math.round(cpuP),
                  memoryPercent: Math.round(memP),
                  diskPercent: Math.round(diskP),
                  uptime: uptimeFormatted || s.metrics?.uptime,
                  memoryUsedGb: memUsedGb,
                  memoryTotalGb: memTotalGb,
                  diskUsedGb: diskUsedGb,
                  diskTotalGb: diskTotalGb,
                  cpuCores: match.hardware?.cpuCores || 2,
                  diskMount: match.metrics?.disks?.[0]?.mount || '/',
                },
              };
            }

            return s;
          });

        setServers(cleanServers);
        setLastUpdatedTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        // Check if a specific server was requested in the URL query string
        let requestedServerId: string | null = null;
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          requestedServerId = urlParams.get('serverId');
        }

        // STRICT REQUIREMENT: Only select a server if explicitly in URL or already chosen by user.
        // Never auto-select or force-open any server on main landing page!
        setActiveServer((prev) => {
          if (requestedServerId) {
            const requested = cleanServers.find((s) => s._id === requestedServerId);
            if (requested && requested.connectionStatus === 'Online') {
              return requested;
            }
          }
          if (prev) {
            return cleanServers.find((s) => s._id === prev._id) || null;
          }
          return null; // Keep null so main landing page opens cleanly!
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

  // Select Server & Load its private workbench (with URL query synchronization & offline guard)
  const handleSelectServer = useCallback((server: INginxServerData | null) => {
    if (server) {
      if (server.connectionStatus !== 'Online') {
        showToast('error', `Cannot manage "${server.name}" because it is currently offline or SSH unreachable.`);
        return;
      }
      setActiveServer(server);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('serverId', server._id);
        window.history.pushState({ serverId: server._id }, '', url.toString());
      }
      fetchServerDetails(server);
      fetchProxies(server);
      fetchApps();
    } else {
      setActiveServer(null);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('serverId');
        window.history.pushState({}, '', url.pathname);
      }
    }
  }, [fetchServerDetails, fetchProxies, fetchApps]);

  // Handle browser Back and Forward navigation via popstate
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const serverId = params.get('serverId');
      if (serverId) {
        const matched = servers.find((s) => s._id === serverId);
        if (matched && matched.connectionStatus === 'Online') {
          setActiveServer(matched);
          fetchServerDetails(matched);
          fetchProxies(matched);
        } else {
          setActiveServer(null);
        }
      } else {
        setActiveServer(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [servers, fetchServerDetails, fetchProxies]);

  // Initial Data Load: Verifies real SSH connectivity on mount and loads fresh fleet status
  useEffect(() => {
    const init = async () => {
      await fetchServers(true);
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
      username: srv.username || (srv.cloudProvider === 'azure' || srv.host?.startsWith('4.') || srv.name?.toLowerCase().includes('ansible') || srv.name?.toLowerCase().includes('azure') ? 'siva' : 'ubuntu'),
      cloudProvider: srv.cloudProvider,
      region: srv.region,
    });
    setSshModalOpen(true);
  };

  const handleOpenSSHModal = (server: INginxServerData) => {
    setSshTarget({
      id: server._id,
      name: server.name,
      host: server.host && server.host !== '-' ? server.host : '',
      port: server.port || 22,
      username: server.username || (server.cloudProvider === 'azure' ? 'siva' : 'ubuntu'),
      authMethod: 'privateKey',
      cloudProvider: (server.cloudProvider as any) || 'other',
      region: server.region,
    });
    setShowSSHModal(true);
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

  // Display servers together (filtered & searchable, online-first)
  const filteredAllServers = useMemo(() => {
    let list = servers;
    if (cloudFilter === 'online') {
      list = list.filter((s) => s.connectionStatus === 'Online');
    } else if (cloudFilter === 'offline') {
      list = list.filter((s) => s.connectionStatus !== 'Online');
    } else if (cloudFilter === 'azure') {
      list = list.filter((s) => s.cloudProvider === 'azure');
    } else if (cloudFilter === 'aws') {
      list = list.filter((s) => s.cloudProvider === 'aws');
    }

    // Sort: Online & SSH reachable servers first!
    list = [...list].sort((a, b) => {
      const aOn = a.connectionStatus === 'Online';
      const bOn = b.connectionStatus === 'Online';
      if (aOn && !bOn) return -1;
      if (!aOn && bOn) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((s) => {
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchHost = (s.host || '').toLowerCase().includes(q);
      const matchPriv = (s.privateIp || '').toLowerCase().includes(q);
      const matchId = (s.instanceId || '').toLowerCase().includes(q);
      const matchRegion = (s.region || '').toLowerCase().includes(q);
      const matchProvider = (s.cloudProvider || '').toLowerCase().includes(q);
      return matchName || matchHost || matchPriv || matchId || matchRegion || matchProvider;
    });
  }, [servers, cloudFilter, searchQuery]);

  const azureCount = useMemo(() => servers.filter((s) => s.cloudProvider === 'azure').length, [servers]);
  const awsCount = useMemo(() => servers.filter((s) => s.cloudProvider === 'aws').length, [servers]);
  const onlineCount = useMemo(() => servers.filter((s) => s.connectionStatus === 'Online').length, [servers]);
  const offlineCount = useMemo(() => servers.filter((s) => s.connectionStatus !== 'Online').length, [servers]);

  const handleCopy = (text: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('success', `${label} copied to clipboard`);
    }
  };

  // Server Workspace Navigation: Only Applications & Deployment (Default)
  const workspaceTabs: { id: NginxServerWorkspaceTab; label: string; icon: any; badge?: string | number }[] = [
    { id: 'apps', label: 'Applications & Deployment', icon: Package },
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
          {/* 1. TOP HEADER (Exact match to Screenshot) */}
          {/* ========================================================================= */}
          <div className="bg-[#111A2E]/95 border border-[#1E293B] rounded-2xl p-4 lg:p-5 shadow-xl shadow-black/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-2 shadow-inner shrink-0">
                <NginxLogo className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">
                  Nginx Management
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage and monitor your Nginx reverse proxy servers
                </p>
              </div>
            </div>

            {/* Right: Updated time, Refresh, All Clouds, All Regions, Bell */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              {/* Updated Time Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B1120] border border-[#1E293B] text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400">Updated:</span>
                <span className="text-slate-200 font-semibold">{lastUpdatedTime}</span>
              </div>

              {/* Refresh Button */}
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
                className="p-2 rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-blue-400 border border-[#1E293B] transition cursor-pointer"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingServers ? 'animate-spin' : ''}`} />
              </button>

              {/* All Clouds Dropdown */}
              <div className="relative">
                <select
                  value={cloudFilter}
                  onChange={(e) => setCloudFilter(e.target.value as any)}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-[#0B1120] border border-[#1E293B] text-xs text-slate-300 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Clouds</option>
                  <option value="azure">Azure</option>
                  <option value="aws">AWS</option>
                  <option value="online">Online</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* All Regions Dropdown */}
              <div className="relative">
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-[#0B1120] border border-[#1E293B] text-xs text-slate-300 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Regions</option>
                  <option value="eastus">eastus</option>
                  <option value="centralindia">centralindia</option>
                  <option value="ap-southeast-2">ap-southeast-2</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                className="p-2 rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] transition cursor-pointer relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1.5 right-1.5" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. SUMMARY METRICS ROW (Actual Connected Server Data Only) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Servers */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">Total Servers</span>
                <h3 className="text-2xl font-bold text-white tracking-wide">
                  {servers.length}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                <Server className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Online Servers */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">Online Servers</span>
                <h3 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                  <span>{onlineCount}</span>
                  <span className="text-xs font-semibold text-emerald-400 font-mono">
                    ({servers.length > 0 ? Math.round((onlineCount / servers.length) * 100) : 0}%)
                  </span>
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Offline Servers */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">Offline Servers</span>
                <h3 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                  <span>{Math.max(0, servers.length - onlineCount)}</span>
                  <span className="text-xs font-semibold text-rose-400 font-mono">
                    ({servers.length > 0 ? Math.round((Math.max(0, servers.length - onlineCount) / servers.length) * 100) : 0}%)
                  </span>
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Auto Deploy */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">Auto Deploy</span>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {autoDeployEnabled ? 'Enabled' : 'Disabled'}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
                  <Rocket className="w-5 h-5" />
                </div>
                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setAutoDeployEnabled(!autoDeployEnabled);
                    showToast('success', `Auto Deploy ${!autoDeployEnabled ? 'Enabled' : 'Disabled'}`);
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    autoDeployEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  title="Toggle Auto Deploy"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      autoDeployEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. CONDITIONAL VIEW: NO SERVER SELECTED -> DISPLAY ALL SERVERS */}
          {/* ========================================================================= */}
          {!activeServer ? (
            <div className="space-y-4">
              {/* Header Banner & Filters Toolbar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <NginxLogo className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Nginx Server Fleet</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold font-mono">
                        {servers.length} Connected
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
                        {onlineCount} Online
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Select a server to manage reverse proxies, explore files, view logs, and run deployments.
                    </p>
                  </div>
                </div>

                {/* Cloud & Status Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Default Primary Pill: Online & SSH Reachable */}
                  <button
                    type="button"
                    onClick={() => setCloudFilter('online')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      cloudFilter === 'online'
                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                        : 'text-emerald-400 hover:bg-emerald-950/30'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Online ({onlineCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCloudFilter('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      cloudFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                    }`}
                  >
                    All ({servers.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCloudFilter('azure')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      cloudFilter === 'azure'
                        ? 'bg-[#0089D6] text-white shadow-sm ring-1 ring-[#5EA0EF]'
                        : 'text-[#5EA0EF] hover:bg-[#0089D6]/15 hover:text-white'
                    }`}
                  >
                    <AzureLogo className="w-3.5 h-3.5" />
                    <span>Azure ({azureCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCloudFilter('aws')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      cloudFilter === 'aws'
                        ? 'bg-[#FF9900] text-slate-950 font-bold shadow-sm ring-1 ring-amber-300'
                        : 'text-amber-400 hover:bg-amber-500/15 hover:text-white'
                    }`}
                  >
                    <AwsLogo className="w-3.5 h-3.5" />
                    <span>AWS ({awsCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCloudFilter('offline')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      cloudFilter === 'offline'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-rose-400 hover:bg-rose-950/30'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Offline ({offlineCount})</span>
                  </button>
                </div>

                {/* View Switcher + Search Input */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* View Mode Toggle: Table vs Cards */}
                  <div className="flex items-center rounded-lg bg-[#0D1526] p-0.5 border border-[#1E293B] shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Table View (Unified one-by-one rows)"
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        viewMode === 'cards'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Cards View"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, IP, region..."
                      className="w-full pl-9 pr-7 py-1.5 bg-[#0D1526] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* All Servers Content: Table vs Cards */}
              {filteredAllServers.length === 0 ? (
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400 space-y-4">
                  {cloudFilter === 'online' ? (
                    <>
                      <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 opacity-80" />
                      <h4 className="text-base font-bold text-white">No online servers available for Nginx management.</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        Currently, no registered servers are online and SSH reachable. Start an AWS EC2 instance or Azure VM, or test SSH connectivity.
                      </p>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => fetchServers(true)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/30"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Verify Server Availability</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCloudFilter('all')}
                          className="px-4 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition cursor-pointer"
                        >
                          View All Servers ({servers.length})
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Server className="w-12 h-12 mx-auto text-slate-500" />
                      <h4 className="text-base font-bold text-white">No Servers Match Filter</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        No servers match your current filter or search criteria.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCloudFilter('online');
                          setSearchQuery('');
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer"
                      >
                        <span>Reset to Online Servers</span>
                      </button>
                    </>
                  )}
                </div>
              ) : viewMode === 'table' ? (
                /* TABLE VIEW: Unified One-By-One Table Matching The App Standard */
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#1E293B] bg-[#0D1526]/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Server Name &amp; ID</th>
                          <th className="py-3 px-4">IP Addresses</th>
                          <th className="py-3 px-4">Provider / Region</th>
                          <th className="py-3 px-4">OS &amp; User</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">CPU</th>
                          <th className="py-3 px-4">RAM</th>
                          <th className="py-3 px-4">Disk</th>
                          <th className="py-3 px-4">Uptime</th>
                          <th className="py-3 px-4 text-right sticky right-0 bg-[#0D1526] z-10 shadow-[-10px_0_12px_-4px_rgba(0,0,0,0.5)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E293B]">
                        {filteredAllServers.map((server) => {
                          const isAzure = server.cloudProvider === 'azure';
                          const isAws = server.cloudProvider === 'aws';
                          const isOnline = server.connectionStatus === 'Online';
                          const cpuP = server.metrics?.cpuPercent ?? 0;
                          const memP = server.metrics?.memoryPercent ?? 0;
                          const diskP = server.metrics?.diskPercent ?? 0;
                          const uptimeVal = server.metrics?.uptime || (isOnline ? 'Online' : 'Offline');
                          const shortId = formatServerId(server.instanceId);

                          return (
                            <tr
                              key={server._id}
                              onClick={() => {
                                if (!isOnline) {
                                  showToast('error', `Cannot manage "${server.name}" because it is currently offline or SSH unreachable.`);
                                  return;
                                }
                                handleSelectServer(server);
                              }}
                              className={`transition-colors group ${
                                isOnline
                                  ? 'hover:bg-[#142038] cursor-pointer'
                                  : 'opacity-60 hover:bg-[#0F172A] cursor-not-allowed'
                              }`}
                            >
                              {/* 1. Server Name & ID */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-[#0B1120] border border-[#1E293B] flex items-center justify-center shrink-0 p-1.5">
                                    {isAzure ? (
                                      <AzureLogo className="w-4 h-4" />
                                    ) : isAws ? (
                                      <AwsLogo className="w-4 h-4 text-amber-400" />
                                    ) : (
                                      <Server className="w-4 h-4 text-purple-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-white text-sm block truncate group-hover:text-blue-400 transition-colors">
                                      {server.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span
                                        className="text-[10px] font-mono text-slate-400 truncate max-w-[130px] block"
                                        title={server.instanceId || server.name}
                                      >
                                        {shortId}
                                      </span>
                                      {server.instanceId && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(server.instanceId!, 'Resource ID')}
                                          className="text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
                                          title="Copy Full ID"
                                        >
                                          <Copy className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. IP Addresses */}
                              <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-semibold text-slate-500">PUB:</span>
                                  <span className="text-emerald-400 font-semibold">{server.host}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(server.host, 'Public IP')}
                                    className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                                    title="Copy IP"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                {server.privateIp && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-semibold text-slate-500">PRIV:</span>
                                    <span className="text-slate-400">{server.privateIp}</span>
                                  </div>
                                )}
                              </td>

                              {/* 3. Provider / Region */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                    isAzure
                                      ? 'bg-[#0089D6]/15 text-[#5EA0EF] border-[#0089D6]/30'
                                      : isAws
                                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                      : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                  }`}
                                >
                                  {isAzure ? (
                                    <AzureLogo className="w-3.5 h-3.5 shrink-0" />
                                  ) : isAws ? (
                                    <AwsLogo className="w-3.5 h-3.5 shrink-0" />
                                  ) : (
                                    <Server className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span className="uppercase font-bold">{server.cloudProvider}</span>
                                  {server.region && <span className="text-slate-400 font-normal">({server.region})</span>}
                                </span>
                              </td>

                              {/* 4. OS & User */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="text-xs text-white font-medium truncate max-w-[130px]" title={server.osName || 'Linux'}>
                                  {server.osName || 'Linux'}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  {server.username || 'ubuntu'}:{server.port || 22}
                                </div>
                              </td>

                              {/* 5. Status */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isOnline ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="font-semibold text-xs text-emerald-400">Online</span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
                                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                      <span>SSH Failed</span>
                                    </div>
                                    <span className="text-[10px] text-amber-400/90 block font-normal">
                                      Running in Cloud • Key Needed
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* 6. CPU */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="w-20 space-y-1">
                                  <div className="flex justify-between text-[11px] font-mono">
                                    <span className="text-slate-200 font-semibold">{cpuP}%</span>
                                    <span className="text-slate-500 text-[10px]">{(server.metrics as any)?.cpuCores || 2}c</span>
                                  </div>
                                  <div className="w-full bg-[#0B1120] rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        cpuP > 80 ? 'bg-rose-500' : cpuP > 50 ? 'bg-amber-400' : 'bg-cyan-400'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(2, cpuP))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* 7. RAM */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="w-20 space-y-1">
                                  <div className="flex justify-between text-[11px] font-mono">
                                    <span className="text-slate-200 font-semibold">{memP}%</span>
                                    {(server.metrics as any)?.memoryTotalGb && (
                                      <span className="text-slate-500 text-[10px]">{(server.metrics as any).memoryTotalGb}G</span>
                                    )}
                                  </div>
                                  <div className="w-full bg-[#0B1120] rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        memP > 85 ? 'bg-rose-500' : memP > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(2, memP))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* 8. Disk */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="w-20 space-y-1">
                                  <div className="flex justify-between text-[11px] font-mono">
                                    <span className="text-slate-200 font-semibold">{diskP}%</span>
                                    <span className="text-slate-500 text-[10px]">{(server.metrics as any)?.diskMount || '/'}</span>
                                  </div>
                                  <div className="w-full bg-[#0B1120] rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        diskP > 85 ? 'bg-rose-500' : diskP > 60 ? 'bg-amber-400' : 'bg-purple-400'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(2, diskP))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* 9. Uptime */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="text-xs font-mono text-amber-300 font-medium">
                                  {uptimeVal}
                                </span>
                              </td>

                              {/* 10. Actions */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap sticky right-0 bg-[#111A2E] group-hover:bg-[#142038] z-10 shadow-[-10px_0_12px_-4px_rgba(0,0,0,0.5)] transition-colors">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenTerminal(server);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#0D1526] hover:bg-slate-800 text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                    title="PuTTY Web Terminal"
                                  >
                                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Terminal</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTestSSH(server);
                                    }}
                                    disabled={testingSSHServerId === server._id}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                                    title="Test SSH Connectivity"
                                  >
                                    <Activity className={`w-3.5 h-3.5 text-emerald-400 ${testingSSHServerId === server._id ? 'animate-spin' : ''}`} />
                                    <span>Test SSH</span>
                                  </button>

                                  {isOnline ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectServer(server);
                                      }}
                                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                                    >
                                      <span>Select &amp; Manage Server</span>
                                      <ChevronRight className="w-3.5 h-3.5 text-blue-200" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenSSHModal(server);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer shadow-sm hover:border-amber-400"
                                      title="Provide SSH Key to connect to this running instance"
                                    >
                                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Connect SSH Key</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* CARDS VIEW: Stacked One-By-One Server Cards with Select & Manage */
                <div className="space-y-4">
                  {filteredAllServers.map((server) => {
                    const isAzure = server.cloudProvider === 'azure';
                    const isAws = server.cloudProvider === 'aws';
                    const isOnline = server.connectionStatus === 'Online';
                    const cpuP = server.metrics?.cpuPercent ?? 0;
                    const memP = server.metrics?.memoryPercent ?? 0;
                    const diskP = server.metrics?.diskPercent ?? 0;
                    const uptimeVal = server.metrics?.uptime || (isOnline ? 'Online' : 'Offline');
                    const shortId = formatServerId(server.instanceId);

                    return (
                      <div
                        key={server._id}
                        onClick={() => {
                          if (!isOnline) {
                            showToast('error', `Cannot manage "${server.name}" because it is currently offline or SSH unreachable.`);
                            return;
                          }
                          handleSelectServer(server);
                        }}
                        className={`bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-lg shadow-black/20 transition-all space-y-4 group ${
                          isOnline
                            ? 'hover:bg-[#142038] hover:border-blue-500/50 cursor-pointer'
                            : 'opacity-65 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Left: Server Identity */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-[#0D1526] border border-[#1E293B] flex items-center justify-center p-2.5 shrink-0">
                              {isAzure ? (
                                <AzureLogo className="w-7 h-7" />
                              ) : isAws ? (
                                <AwsLogo className="w-7 h-7 text-amber-400" />
                              ) : (
                                <Server className="w-7 h-7 text-purple-400" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-bold text-white tracking-wide group-hover:text-blue-400 transition-colors">
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
                                {isOnline ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Online</span>
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                      <span>Running in Cloud</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      <span>SSH: Key Required</span>
                                    </span>
                                  </div>
                                )}
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
                                  <span className="flex items-center gap-1">
                                    ID: <strong className="text-slate-300" title={server.instanceId}>{shortId}</strong>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(server.instanceId!, 'Resource ID');
                                      }}
                                      className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                                      title="Copy Full ID"
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                )}
                                <span>
                                  OS: <strong className="text-slate-300">{server.osName || 'Linux'}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick Action & Manage Button */}
                          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTerminal(server);
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                              title="PuTTY Web Terminal"
                            >
                              <Terminal className="w-3.5 h-3.5 text-blue-400" />
                              <span>Terminal</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTestSSH(server);
                              }}
                              disabled={testingSSHServerId === server._id}
                              className="px-3 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                              title="Test SSH Connectivity"
                            >
                              <Activity className={`w-3.5 h-3.5 text-emerald-400 ${testingSSHServerId === server._id ? 'animate-spin' : ''}`} />
                              <span>Test SSH</span>
                            </button>

                            {isOnline ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectServer(server);
                                }}
                                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer shrink-0"
                              >
                                <span>Select &amp; Manage Server</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSSHModal(server);
                                }}
                                className="px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm hover:border-amber-400 shrink-0"
                                title="Provide SSH Key to connect to this running instance"
                              >
                                <KeyRound className="w-4 h-4 text-amber-400" />
                                <span>Connect SSH Key</span>
                              </button>
                            )}
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
                                className={`h-full rounded-full transition-all ${
                                  cpuP > 80 ? 'bg-rose-500' : cpuP > 50 ? 'bg-amber-400' : 'bg-cyan-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, cpuP))}%` }}
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
                                className={`h-full rounded-full transition-all ${
                                  memP > 85 ? 'bg-rose-500' : memP > 60 ? 'bg-amber-400' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, memP))}%` }}
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
                                className={`h-full rounded-full transition-all ${
                                  diskP > 85 ? 'bg-rose-500' : diskP > 60 ? 'bg-amber-400' : 'bg-purple-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, diskP))}%` }}
                              />
                            </div>
                          </div>

                          {/* Uptime */}
                          <div className="bg-[#0B1120]/70 border border-[#1E293B] rounded-xl p-2.5 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Activity className="w-3.5 h-3.5 text-amber-400" />
                              Uptime
                            </span>
                            <span className="font-mono text-amber-300 font-semibold truncate max-w-[120px]">
                              {uptimeVal}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* 3. SERVER IS SELECTED: DISPLAY ALL WORKSPACE FEATURES FOR THIS SERVER */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Selected Server Banner Card (Matching Screenshot Exact UI) */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Provider Icon + Server Name + Details */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                    {activeServer.cloudProvider === 'azure' ? (
                      <AzureLogo className="w-8 h-8" />
                    ) : activeServer.cloudProvider === 'aws' ? (
                      <AwsLogo className="w-8 h-8 text-amber-400" />
                    ) : (
                      <Server className="w-8 h-8 text-blue-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-white tracking-wide truncate">{activeServer.name}</h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{activeServer.connectionStatus === 'Online' ? 'Online' : activeServer.connectionStatus}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono flex-wrap">
                      <span>Provider: <strong className="text-slate-200 capitalize">{activeServer.cloudProvider || 'Cloud'}</strong></span>
                      <span className="text-slate-600">|</span>
                      <span>Region: <strong className="text-slate-200">{activeServer.region || 'global'}</strong></span>
                      <span className="text-slate-600">|</span>
                      <span>IP: <strong className="text-slate-200">{activeServer.host || activeServer.publicIp || activeServer.privateIp || '-'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Uptime + Last Seen + Connect SSH button + Switcher */}
                <div className="flex items-center gap-6 self-end md:self-center shrink-0">
                  {/* Uptime */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Uptime</span>
                      <span className="text-sm font-bold text-white font-mono">{activeServer.metrics?.uptime || (activeServer.connectionStatus === 'Online' ? 'Active' : 'Offline')}</span>
                    </div>
                  </div>

                  {/* Last Seen */}
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full ${activeServer.connectionStatus === 'Online' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-500'}`} />
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Status</span>
                      <span className="text-sm font-bold text-white">{activeServer.connectionStatus === 'Online' ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>

                  {/* Connect SSH Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenTerminal(activeServer)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>Connect SSH</span>
                  </button>

                  {/* Return to All Servers */}
                  <button
                    type="button"
                    onClick={() => handleSelectServer(null)}
                    className="p-2.5 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] text-xs transition cursor-pointer"
                    title="All Servers Fleet View"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
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
                {/* 1. APPLICATIONS TAB (Default & Primary matching screenshot) */}
                {activeWorkspaceTab === 'apps' && (
                  <NginxApplicationsTab
                    activeServer={activeServer}
                    apps={discoveredApps}
                    onRefresh={fetchApps}
                    onDeployNew={() => setActiveWorkspaceTab('deploy')}
                    onNavigateToHistory={() => setActiveWorkspaceTab('history')}
                    loading={loadingApps}
                  />
                )}

                {/* 2. OVERVIEW TAB */}
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

                {/* 3. PM2 MANAGER TAB */}
                {activeWorkspaceTab === 'pm2' && (
                  <NginxPM2Tab activeServer={activeServer} />
                )}

                {/* 4. PM2 LOGS TAB */}
                {activeWorkspaceTab === 'pm2-logs' && (
                  <NginxLogsTab activeServer={activeServer} logType="pm2" />
                )}

                {/* 5. NGINX ACCESS LOGS TAB */}
                {activeWorkspaceTab === 'access-logs' && (
                  <NginxLogsTab activeServer={activeServer} logType="access" />
                )}

                {/* 6. NGINX ERROR LOGS TAB */}
                {activeWorkspaceTab === 'error-logs' && (
                  <NginxLogsTab activeServer={activeServer} logType="error" />
                )}

                {/* 7. SITES & REVERSE PROXY TAB */}
                {activeWorkspaceTab === 'proxy' && (
                  <NginxReverseProxyTab
                    activeServer={activeServer}
                    sites={proxySitesMap[activeServer._id] || []}
                    onRefresh={() => fetchProxies(activeServer)}
                    onCreateNew={() => handleOpenCreateProxyModal(activeServer)}
                    onDeleteSite={(fileName) => handleDeleteProxySite(activeServer, fileName)}
                  />
                )}

                {/* 8. CONFIGURATION TAB */}
                {activeWorkspaceTab === 'config' && (
                  <NginxConfigTab activeServer={activeServer} />
                )}

                {/* 9. FILE MANAGER TAB */}
                {activeWorkspaceTab === 'files' && (
                  <NginxFileBrowserTab activeServer={activeServer} />
                )}

                {/* 10. DEPLOYMENT HISTORY TAB */}
                {activeWorkspaceTab === 'history' && (
                  <NginxHistoryTab
                    deployments={deployments}
                    onRefresh={fetchDeployments}
                    onRollback={(dep) => {
                      showToast('success', `Initiating rollback for deployment ${dep.deploymentId}...`);
                    }}
                  />
                )}

                {/* DIRECT DEPLOY PIPELINE TAB */}
                {activeWorkspaceTab === 'deploy' && (
                  <NginxDirectPipeline
                    activeServer={activeServer}
                    onRefreshServer={() => handleRefreshServerMetrics(activeServer)}
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

                {/* SSH TERMINAL TAB */}
                {activeWorkspaceTab === 'terminal' && (
                  <NginxSSHTerminalTab activeServer={activeServer} />
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
        onConfigureSSH={(tgt) => {
          setSshModalOpen(false);
          setSshTarget({
            id: tgt.id || tgt.sshServerId || tgt.vmId,
            name: tgt.name,
            host: tgt.host && tgt.host !== '-' ? tgt.host : '',
            port: tgt.port || 22,
            username: tgt.username || (tgt.cloudProvider === 'azure' ? 'siva' : 'ubuntu'),
            authMethod: 'password',
            cloudProvider: (tgt.cloudProvider as any) || 'other',
            region: tgt.region,
          });
          setShowSSHModal(true);
        }}
      />

      {showSSHModal && sshTarget && (
        <ConnectSSHModal
          isOpen={showSSHModal}
          onClose={() => {
            setShowSSHModal(false);
            setSshTarget(null);
          }}
          target={sshTarget}
          onSuccess={(savedData) => {
            showToast('success', 'SSH Credentials Saved & Connected');
            fetchServers();
            if (sshTarget) {
              setTerminalTarget({
                id: savedData?._id || sshTarget.id,
                sshServerId: savedData?._id || sshTarget.id,
                name: sshTarget.name,
                host: sshTarget.host,
                port: sshTarget.port || 22,
                username: sshTarget.username,
                cloudProvider: sshTarget.cloudProvider,
                isSSHConnected: true,
              });
              setSshModalOpen(true);
            }
          }}
        />
      )}
    </div>
  );
}
