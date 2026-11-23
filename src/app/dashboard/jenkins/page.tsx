'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  RotateCw,
  ExternalLink,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Download,
  Terminal as TerminalIcon,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  X,
  Plus,
  Box,
  FileCode,
  History,
  Check,
  Activity,
  Cpu,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import {
  JenkinsLogo,
  SonarQubeLogo,
  TrivyLogo,
  AwsLogo,
  AzureLogo,
} from '@/components/icons/CloudIcons';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';

export type PipelineTab = 'jenkins' | 'sonarqube' | 'trivy';

interface IServerPipeline {
  id: string;
  name: string;
  host: string;
  publicIp?: string;
  privateIp?: string;
  cloudProvider: string;
  region: string;
  osName: string;
  status: string;
  jenkins: {
    detected: boolean;
    status: 'running' | 'stopped' | 'not_installed' | 'unreachable';
    version: string;
    port: number;
    url: string;
    installDate?: string;
    serviceName?: string;
    lastSyncedAt?: string;
    lastError?: string | null;
  };
  sonarqube: {
    detected: boolean;
    status: 'running' | 'stopped' | 'not_installed' | 'unreachable';
    version: string;
    port: number;
    url: string;
    mode: 'docker' | 'service' | 'standalone' | 'unknown';
    containerId?: string;
    healthStatus?: string;
    lastSyncedAt?: string;
    lastError?: string | null;
  };
  trivy: {
    detected: boolean;
    status: 'installed' | 'not_installed' | 'unreachable';
    version: string;
    installMethod?: string;
    lastScanAt?: string;
    lastScanTarget?: string;
    lastScanSummary?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      unknown: number;
    };
    lastSyncedAt?: string;
    lastError?: string | null;
  };
}

interface ITrivyVulnerability {
  vulnerabilityId: string;
  pkgName: string;
  installedVersion: string;
  fixedVersion?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  title?: string;
  description?: string;
  primaryUrl?: string;
}

interface ITrivyScanRecord {
  _id: string;
  serverId: string;
  serverName: string;
  serverHost: string;
  scanType: 'image' | 'fs' | 'repo';
  target: string;
  status: 'SUCCESS' | 'FAILED';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    total: number;
  };
  vulnerabilities: ITrivyVulnerability[];
  scannedAt: string;
}

function JenkinsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as PipelineTab) || 'jenkins';

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PipelineTab>(initialTab);
  const [servers, setServers] = useState<IServerPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'azure' | 'aws'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'installed' | 'running' | 'stopped'>('all');

  // Action status / logs
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalLog, setModalLog] = useState<{ title: string; output: string } | null>(null);

  // Install Modals
  const [jenkinsInstallOpen, setJenkinsInstallOpen] = useState(false);
  const [jenkinsInstallServer, setJenkinsInstallServer] = useState<string>('');
  const [jenkinsPort, setJenkinsPort] = useState<number>(8080);

  const [sonarInstallOpen, setSonarInstallOpen] = useState(false);
  const [sonarInstallServer, setSonarInstallServer] = useState<string>('');
  const [sonarPort, setSonarPort] = useState<number>(9000);

  // Trivy Scan Modal
  const [trivyScanOpen, setTrivyScanOpen] = useState(false);
  const [trivyScanServer, setTrivyScanServer] = useState<string>('');
  const [trivyScanType, setTrivyScanType] = useState<'image' | 'fs'>('image');
  const [trivyTarget, setTrivyTarget] = useState<string>('nginx:alpine');

  // Trivy findings & history
  const [activeScanResult, setActiveScanResult] = useState<ITrivyScanRecord | null>(null);
  const [recentScans, setRecentScans] = useState<ITrivyScanRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Uninstall confirm modal
  const [uninstallTarget, setUninstallTarget] = useState<{
    server: IServerPipeline;
    tool: 'jenkins' | 'sonarqube' | 'trivy';
  } | null>(null);
  const [preserveData, setPreserveData] = useState(true);

  // SSH Terminal Modal
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);

  // Sync tab with URL
  const switchTab = (tab: PipelineTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/dashboard/jenkins?${params.toString()}`);
  };

  const fetchServers = useCallback(async (sync = false) => {
    if (sync) setIsSyncing(true);
    else setLoading(true);

    try {
      // Use Jenkins servers endpoint with sync flag to trigger devopsToolsEngine
      const res = await fetch(`/api/jenkins/servers?sync=${sync ? 'true' : 'false'}`);
      if (res.ok) {
        // Also fetch SonarQube & Trivy to ensure complete state
        const [sonarRes, trivyRes] = await Promise.all([
          fetch(`/api/sonarqube/servers`),
          fetch(`/api/trivy/servers`),
        ]);

        const jenkinsData = await res.json();
        const sonarData = sonarRes.ok ? await sonarRes.json() : { servers: [] };
        const trivyData = trivyRes.ok ? await trivyRes.json() : { servers: [] };

        const combined: IServerPipeline[] = (jenkinsData.servers || []).map((js: any) => {
          const sMatch = (sonarData.servers || []).find((ss: any) => ss.id === js.id);
          const tMatch = (trivyData.servers || []).find((ts: any) => ts.id === js.id);
          return {
            ...js,
            sonarqube: sMatch?.sonarqube || {
              detected: false,
              status: 'not_installed',
              version: '',
              port: 9000,
              url: '',
              mode: 'unknown',
              containerId: '',
              healthStatus: 'UNKNOWN',
            },
            trivy: tMatch?.trivy || {
              detected: false,
              status: 'not_installed',
              version: '',
              installMethod: 'unknown',
              lastScanTarget: '',
              lastScanSummary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
            },
          };
        });

        setServers(combined);
      }
    } catch (err) {
      console.error('Failed to fetch pipeline servers:', err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  const fetchRecentScans = useCallback(async () => {
    try {
      const res = await fetch('/api/trivy/scans?limit=20');
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.scans || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchServers(false);
    fetchRecentScans();
  }, [fetchServers, fetchRecentScans]);

  const handleAction = async (tool: 'jenkins' | 'sonarqube' | 'trivy', serverId: string, action: string, options: any = {}) => {
    setActionLoading(`${tool}-${serverId}-${action}`);
    try {
      const res = await fetch(`/api/${tool}/servers/${serverId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...options }),
      });
      const data = await res.json();

      if (data.scanResult) {
        setActiveScanResult(data.scanResult);
        await fetchRecentScans();
      } else if (data.output) {
        setModalLog({
          title: `${tool.toUpperCase()} ${action.toUpperCase()} - ${data.success ? 'Success' : 'Notice'}`,
          output: data.output || data.message,
        });
      }
      await fetchServers(false);
    } catch (err: any) {
      setModalLog({
        title: `Action Error`,
        output: err.message || 'Execution error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmUninstall = async () => {
    if (!uninstallTarget) return;
    const { server, tool } = uninstallTarget;
    setUninstallTarget(null);
    await handleAction(tool, server.id, 'uninstall', { preserveData });
  };

  const openTerminal = (server: IServerPipeline) => {
    setTerminalTarget({
      id: server.id,
      name: server.name,
      host: server.publicIp || server.host,
      username: server.cloudProvider === 'azure' ? 'azureuser' : 'ubuntu',
      cloudProvider: server.cloudProvider,
      region: server.region,
    });
    setTerminalOpen(true);
  };

  // Aggregated Counters
  const totalServers = servers.length;
  const jenkinsInstalledCount = useMemo(() => servers.filter((s) => s.jenkins.detected).length, [servers]);
  const jenkinsRunningCount = useMemo(() => servers.filter((s) => s.jenkins.status === 'running').length, [servers]);
  const sonarInstalledCount = useMemo(() => servers.filter((s) => s.sonarqube.detected).length, [servers]);
  const sonarRunningCount = useMemo(() => servers.filter((s) => s.sonarqube.status === 'running').length, [servers]);
  const trivyInstalledCount = useMemo(() => servers.filter((s) => s.trivy.detected).length, [servers]);

  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      if (providerFilter !== 'all' && s.cloudProvider?.toLowerCase() !== providerFilter) return false;

      // Status filter depends on active tab
      if (activeTab === 'jenkins') {
        if (statusFilter === 'installed' && !s.jenkins.detected) return false;
        if (statusFilter === 'running' && s.jenkins.status !== 'running') return false;
        if (statusFilter === 'stopped' && (s.jenkins.status !== 'stopped' || !s.jenkins.detected)) return false;
      } else if (activeTab === 'sonarqube') {
        if (statusFilter === 'installed' && !s.sonarqube.detected) return false;
        if (statusFilter === 'running' && s.sonarqube.status !== 'running') return false;
        if (statusFilter === 'stopped' && (s.sonarqube.status !== 'stopped' || !s.sonarqube.detected)) return false;
      } else if (activeTab === 'trivy') {
        if (statusFilter === 'installed' && !s.trivy.detected) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchHost = (s.host || '').toLowerCase().includes(q);
        return matchName || matchHost;
      }
      return true;
    });
  }, [servers, activeTab, providerFilter, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 max-w-[1700px] w-full mx-auto space-y-6">
          {/* Top Banner & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D1526] border border-[#1E293B] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/15 via-cyan-500/15 to-teal-500/15 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-inner">
                <JenkinsLogo className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-white tracking-tight">Jenkins CI/CD & DevOps Suite</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider">
                    Pipeline Automation
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                    SonarQube Analysis
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                    Trivy Security
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Unified DevOps orchestration: Automatic discovery, port detection, and live SSH management for Jenkins, SonarQube, and Trivy.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchServers(true)}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] hover:border-slate-700 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Probing All Nodes...' : 'Sync & Detect'}</span>
              </button>

              {activeTab === 'jenkins' && (
                <button
                  type="button"
                  onClick={() => {
                    const available = servers.find((s) => !s.jenkins.detected) || servers[0];
                    if (available) setJenkinsInstallServer(available.id);
                    setJenkinsInstallOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Install Jenkins</span>
                </button>
              )}

              {activeTab === 'sonarqube' && (
                <button
                  type="button"
                  onClick={() => {
                    const available = servers.find((s) => !s.sonarqube.detected) || servers[0];
                    if (available) setSonarInstallServer(available.id);
                    setSonarInstallOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deploy SonarQube</span>
                </button>
              )}

              {activeTab === 'trivy' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-teal-400" />
                    <span>Scan History ({recentScans.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const installed = servers.find((s) => s.trivy.detected) || servers[0];
                      if (installed) setTrivyScanServer(installed.id);
                      setTrivyScanOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Run Vulnerability Scan</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DevOps Pipeline Integrated Tool Switcher Bar */}
          <div className="flex items-center gap-3 bg-[#0D1526] border border-[#1E293B] rounded-2xl p-2 shadow-sm overflow-x-auto">
            <button
              type="button"
              onClick={() => switchTab('jenkins')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'jenkins'
                  ? 'bg-red-500/20 text-white border border-red-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111A2E] border border-transparent'
              }`}
            >
              <JenkinsLogo className="w-4 h-4" />
              <span>Jenkins CI/CD</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {jenkinsInstalledCount} Inst • {jenkinsRunningCount} Run
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('sonarqube')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'sonarqube'
                  ? 'bg-cyan-500/20 text-white border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111A2E] border border-transparent'
              }`}
            >
              <SonarQubeLogo className="w-4 h-4" />
              <span>SonarQube Analysis</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {sonarInstalledCount} Inst • {sonarRunningCount} Run
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('trivy')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'trivy'
                  ? 'bg-teal-500/20 text-white border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111A2E] border border-transparent'
              }`}
            >
              <TrivyLogo className="w-4 h-4" />
              <span>Trivy Security</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {trivyInstalledCount} Installed
              </span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0D1526] border border-[#1E293B] rounded-xl p-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search server name, IP address, or version..."
                className="w-full bg-[#111A2E] border border-[#1E293B] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as any)}
                className="bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">All Clouds</option>
                <option value="azure">Azure VMs</option>
                <option value="aws">AWS EC2</option>
              </select>

              {activeTab !== 'trivy' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="installed">Installed Only</option>
                  <option value="running">Running</option>
                  <option value="stopped">Stopped</option>
                </select>
              )}
            </div>
          </div>

          {/* Server List Container */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#0D1526] border border-[#1E293B] rounded-2xl">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-300">Checking tool states on monitored servers...</p>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-16 bg-[#0D1526] border border-dashed border-[#1E293B] rounded-2xl p-6">
              {activeTab === 'jenkins' ? (
                <JenkinsLogo className="w-12 h-12 mx-auto mb-3 opacity-60" />
              ) : activeTab === 'sonarqube' ? (
                <SonarQubeLogo className="w-12 h-12 mx-auto mb-3 opacity-60" />
              ) : (
                <TrivyLogo className="w-12 h-12 mx-auto mb-3 opacity-60" />
              )}
              <h3 className="text-sm font-bold text-white">No Matching Servers Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No servers matched your filter criteria or no servers currently have this tool detected.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServers.map((server) => {
                const hostIp = server.publicIp || server.host;

                // ==========================================
                // 1. JENKINS TAB VIEW
                // ==========================================
                if (activeTab === 'jenkins') {
                  const j = server.jenkins;
                  const isInstalled = j.detected;
                  const isRunning = j.status === 'running';
                  const isStopped = j.status === 'stopped';
                  const port = j.port || 8080;
                  const jenkinsUrl = j.url || `http://${hostIp}:${port}`;

                  return (
                    <div
                      key={server.id}
                      className="bg-[#0D1526] border border-[#1E293B] hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all space-y-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#111A2E] border border-[#1E293B] flex items-center justify-center shrink-0">
                            {server.cloudProvider?.toLowerCase() === 'azure' ? (
                              <AzureLogo className="w-5 h-5" />
                            ) : server.cloudProvider?.toLowerCase() === 'aws' ? (
                              <AwsLogo className="w-5 h-5" />
                            ) : (
                              <Server className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white font-mono">{server.name}</span>
                              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                                {server.publicIp || server.host}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60 px-2 py-0.5 rounded">
                                {server.cloudProvider?.toUpperCase()} • {server.region}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Platform OS: <span className="text-slate-300 font-medium">{server.osName}</span>
                              {j.installDate && (
                                <span className="ml-2 text-slate-500">• Installed: {j.installDate}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {isInstalled ? (
                            <>
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
                                <span className="text-slate-400">Port:</span>
                                <span className="font-mono font-bold text-white">{port}</span>
                              </div>

                              {isRunning ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                  Running ({j.version ? `v${j.version}` : 'Active'})
                                </span>
                              ) : isStopped ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                  Stopped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-xs font-bold">
                                  Unknown Status
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-semibold">
                              Not Installed
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#1E293B] flex-wrap">
                        <div className="flex items-center gap-2">
                          {isInstalled && (
                            <a
                              href={jenkinsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
                                isRunning
                                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white shadow-red-500/20'
                                  : 'bg-[#111A2E] text-slate-500 border border-[#1E293B] pointer-events-none opacity-60'
                              }`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Jenkins</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => openTerminal(server)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                          >
                            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Terminal</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {isInstalled ? (
                            <>
                              {isRunning ? (
                                <button
                                  type="button"
                                  disabled={actionLoading === `jenkins-${server.id}-stop`}
                                  onClick={() => handleAction('jenkins', server.id, 'stop')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
                                >
                                  {actionLoading === `jenkins-${server.id}-stop` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5" />
                                  )}
                                  <span>Stop</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={actionLoading === `jenkins-${server.id}-start`}
                                  onClick={() => handleAction('jenkins', server.id, 'start')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl transition-all cursor-pointer"
                                >
                                  {actionLoading === `jenkins-${server.id}-start` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5" />
                                  )}
                                  <span>Start</span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={actionLoading === `jenkins-${server.id}-restart`}
                                onClick={() => handleAction('jenkins', server.id, 'restart')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                              >
                                {actionLoading === `jenkins-${server.id}-restart` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                <span>Restart</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setUninstallTarget({ server, tool: 'jenkins' })}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Uninstall</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoading === `jenkins-${server.id}-install`}
                              onClick={() => handleAction('jenkins', server.id, 'install')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md shadow-red-500/20 transition-all cursor-pointer"
                            >
                              {actionLoading === `jenkins-${server.id}-install` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>Install Jenkins</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // ==========================================
                // 2. SONARQUBE TAB VIEW
                // ==========================================
                if (activeTab === 'sonarqube') {
                  const s = server.sonarqube;
                  const isInstalled = s.detected;
                  const isRunning = s.status === 'running';
                  const isStopped = s.status === 'stopped';
                  const port = s.port || 9000;
                  const sonarUrl = s.url || `http://${hostIp}:${port}`;

                  return (
                    <div
                      key={server.id}
                      className="bg-[#0D1526] border border-[#1E293B] hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all space-y-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#111A2E] border border-[#1E293B] flex items-center justify-center shrink-0">
                            {server.cloudProvider?.toLowerCase() === 'azure' ? (
                              <AzureLogo className="w-5 h-5" />
                            ) : server.cloudProvider?.toLowerCase() === 'aws' ? (
                              <AwsLogo className="w-5 h-5" />
                            ) : (
                              <Server className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white font-mono">{server.name}</span>
                              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                                {server.publicIp || server.host}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60 px-2 py-0.5 rounded">
                                {server.cloudProvider?.toUpperCase()} • {server.region}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>OS: {server.osName}</span>
                              {isInstalled && s.mode && (
                                <span className="text-slate-500">
                                  • Mode: <span className="text-cyan-400 capitalize">{s.mode}</span>
                                </span>
                              )}
                              {s.containerId && (
                                <span className="text-slate-500 font-mono text-[10px]">
                                  ({s.containerId.substring(0, 12)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {isInstalled ? (
                            <>
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
                                <span className="text-slate-400">Port:</span>
                                <span className="font-mono font-bold text-white">{port}</span>
                              </div>

                              {isRunning ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                  Running ({s.version ? `v${s.version}` : 'Community'})
                                  {s.healthStatus && s.healthStatus !== 'UNKNOWN' && (
                                    <span className="ml-1 text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                                      {s.healthStatus}
                                    </span>
                                  )}
                                </span>
                              ) : isStopped ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                  Stopped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-xs font-bold">
                                  Unknown Status
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-semibold">
                              Not Installed
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#1E293B] flex-wrap">
                        <div className="flex items-center gap-2">
                          {isInstalled && (
                            <a
                              href={sonarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
                                isRunning
                                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-cyan-500/20'
                                  : 'bg-[#111A2E] text-slate-500 border border-[#1E293B] pointer-events-none opacity-60'
                              }`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open SonarQube</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => openTerminal(server)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                          >
                            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Terminal</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {isInstalled ? (
                            <>
                              {isRunning ? (
                                <button
                                  type="button"
                                  disabled={actionLoading === `sonarqube-${server.id}-stop`}
                                  onClick={() => handleAction('sonarqube', server.id, 'stop')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
                                >
                                  {actionLoading === `sonarqube-${server.id}-stop` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5" />
                                  )}
                                  <span>Stop</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={actionLoading === `sonarqube-${server.id}-start`}
                                  onClick={() => handleAction('sonarqube', server.id, 'start')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl transition-all cursor-pointer"
                                >
                                  {actionLoading === `sonarqube-${server.id}-start` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5" />
                                  )}
                                  <span>Start</span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={actionLoading === `sonarqube-${server.id}-restart`}
                                onClick={() => handleAction('sonarqube', server.id, 'restart')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                              >
                                {actionLoading === `sonarqube-${server.id}-restart` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                <span>Restart</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setUninstallTarget({ server, tool: 'sonarqube' })}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Uninstall</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoading === `sonarqube-${server.id}-install`}
                              onClick={() => handleAction('sonarqube', server.id, 'install')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                            >
                              {actionLoading === `sonarqube-${server.id}-install` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>Deploy SonarQube</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // ==========================================
                // 3. TRIVY TAB VIEW
                // ==========================================
                const t = server.trivy;
                const isInstalled = t.detected;
                const summary = t.lastScanSummary;

                return (
                  <div
                    key={server.id}
                    className="bg-[#0D1526] border border-[#1E293B] hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#111A2E] border border-[#1E293B] flex items-center justify-center shrink-0">
                          {server.cloudProvider?.toLowerCase() === 'azure' ? (
                            <AzureLogo className="w-5 h-5" />
                          ) : server.cloudProvider?.toLowerCase() === 'aws' ? (
                            <AwsLogo className="w-5 h-5" />
                          ) : (
                            <Server className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white font-mono">{server.name}</span>
                            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                              {server.publicIp || server.host}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60 px-2 py-0.5 rounded">
                              {server.cloudProvider?.toUpperCase()} • {server.region}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>OS: {server.osName}</span>
                            {isInstalled && (
                              <span className="text-slate-500">
                                • Method: <span className="text-teal-400 uppercase font-semibold">{t.installMethod}</span>
                              </span>
                            )}
                            {t.lastScanTarget && (
                              <span className="text-slate-500">
                                • Last Target: <span className="text-slate-300 font-mono">{t.lastScanTarget}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {isInstalled ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-400 text-xs font-bold font-mono">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Trivy v{t.version || 'installed'}
                            </span>

                            {summary && (
                              <div className="flex items-center gap-1 text-[11px] font-bold font-mono">
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  {summary.critical} Crit
                                </span>
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {summary.high} High
                                </span>
                                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {summary.medium} Med
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-semibold">
                            Not Installed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#1E293B] flex-wrap">
                      <div className="flex items-center gap-2">
                        {isInstalled && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setTrivyScanServer(server.id);
                                setTrivyScanType('image');
                                setTrivyTarget('nginx:alpine');
                                setTrivyScanOpen(true);
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>Scan Image</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTrivyScanServer(server.id);
                                setTrivyScanType('fs');
                                setTrivyTarget('/var/www');
                                setTrivyScanOpen(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                            >
                              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Scan Path</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => openTerminal(server)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                        >
                          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Terminal</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isInstalled ? (
                          <>
                            <button
                              type="button"
                              disabled={actionLoading === `trivy-${server.id}-version`}
                              onClick={() => handleAction('trivy', server.id, 'version')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                            >
                              {actionLoading === `trivy-${server.id}-version` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              <span>Check Version</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setUninstallTarget({ server, tool: 'trivy' })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Uninstall</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading === `trivy-${server.id}-install`}
                            onClick={() => handleAction('trivy', server.id, 'install')}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                          >
                            {actionLoading === `trivy-${server.id}-install` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Install Trivy CLI</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Install Jenkins Modal */}
      {jenkinsInstallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setJenkinsInstallOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
                <JenkinsLogo className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install Jenkins CI/CD</h3>
                <p className="text-xs text-slate-400">Automated OpenJDK 17 + Jenkins installation</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Target Server</label>
                <select
                  value={jenkinsInstallServer}
                  onChange={(e) => setJenkinsInstallServer(e.target.value)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500/50"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.publicIp || s.host}) {s.jenkins.detected ? '• Already Installed' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">HTTP Port</label>
                <input
                  type="number"
                  value={jenkinsPort}
                  onChange={(e) => setJenkinsPort(parseInt(e.target.value, 10) || 8080)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500/50"
                  placeholder="8080"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setJenkinsInstallOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setJenkinsInstallOpen(false);
                  handleAction('jenkins', jenkinsInstallServer, 'install', { port: jenkinsPort });
                }}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white rounded-xl shadow-lg shadow-red-500/20"
              >
                Start Installation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy SonarQube Modal */}
      {sonarInstallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSonarInstallOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                <SonarQubeLogo className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Deploy SonarQube</h3>
                <p className="text-xs text-slate-400">Docker container deployment with persistent storage</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Target Server</label>
                <select
                  value={sonarInstallServer}
                  onChange={(e) => setSonarInstallServer(e.target.value)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/50"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.publicIp || s.host}) {s.sonarqube.detected ? '• Already Installed' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Web Port</label>
                <input
                  type="number"
                  value={sonarPort}
                  onChange={(e) => setSonarPort(parseInt(e.target.value, 10) || 9000)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/50"
                  placeholder="9000"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSonarInstallOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSonarInstallOpen(false);
                  handleAction('sonarqube', sonarInstallServer, 'install', { port: sonarPort });
                }}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/20"
              >
                Deploy SonarQube
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trivy Vulnerability Scan Modal */}
      {trivyScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setTrivyScanOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
                <TrivyLogo className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Execute Trivy Scan</h3>
                <p className="text-xs text-slate-400">Live security analysis on host</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Monitored Host</label>
                <select
                  value={trivyScanServer}
                  onChange={(e) => setTrivyScanServer(e.target.value)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/50"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.publicIp || s.host}) {s.trivy.detected ? '• Trivy Ready' : '(Not installed)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Scan Target Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTrivyScanType('image');
                      setTrivyTarget('nginx:alpine');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      trivyScanType === 'image'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm'
                        : 'bg-[#111A2E] border-[#1E293B] text-slate-400'
                    }`}
                  >
                    Container Image
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTrivyScanType('fs');
                      setTrivyTarget('/var/www');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      trivyScanType === 'fs'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm'
                        : 'bg-[#111A2E] border-[#1E293B] text-slate-400'
                    }`}
                  >
                    Filesystem Path
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {trivyScanType === 'image' ? 'Image Name & Tag' : 'Path'}
                </label>
                <input
                  type="text"
                  value={trivyTarget}
                  onChange={(e) => setTrivyTarget(e.target.value)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/50"
                  placeholder={trivyScanType === 'image' ? 'e.g. nginx:latest, python:3.9-slim' : 'e.g. /var/www'}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTrivyScanOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrivyScanOpen(false);
                  const action = trivyScanType === 'image' ? 'scan_image' : 'scan_fs';
                  handleAction('trivy', trivyScanServer, action, { target: trivyTarget.trim() });
                }}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 text-white rounded-xl shadow-lg shadow-teal-500/20"
              >
                Start Security Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vulnerability Report Viewer Modal */}
      {activeScanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-4xl p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setActiveScanResult(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Trivy Vulnerability Scan Findings</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Target: <span className="text-teal-300">{activeScanResult.target}</span> • Server: {activeScanResult.serverName} ({activeScanResult.serverHost})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="bg-[#111A2E] border border-rose-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-rose-400 uppercase">Critical</span>
                  <div className="text-xl font-black text-rose-300">{activeScanResult.summary?.critical || 0}</div>
                </div>
                <div className="bg-[#111A2E] border border-amber-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">High</span>
                  <div className="text-xl font-black text-amber-300">{activeScanResult.summary?.high || 0}</div>
                </div>
                <div className="bg-[#111A2E] border border-blue-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-blue-400 uppercase">Medium</span>
                  <div className="text-xl font-black text-blue-300">{activeScanResult.summary?.medium || 0}</div>
                </div>
                <div className="bg-[#111A2E] border border-slate-700 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Low</span>
                  <div className="text-xl font-black text-slate-300">{activeScanResult.summary?.low || 0}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-[#1E293B] rounded-xl bg-[#070C18]">
              {activeScanResult.vulnerabilities.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  No vulnerabilities detected in this target!
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111A2E] text-slate-400 font-semibold sticky top-0 border-b border-[#1E293B]">
                    <tr>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Vulnerability ID</th>
                      <th className="p-3">Package</th>
                      <th className="p-3">Installed Version</th>
                      <th className="p-3">Fixed In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {activeScanResult.vulnerabilities.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : v.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : v.severity === 'MEDIUM'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-slate-700/40 text-slate-300'
                            }`}
                          >
                            {v.severity}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-cyan-300">
                          {v.primaryUrl ? (
                            <a
                              href={v.primaryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>{v.vulnerabilityId}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>
                          ) : (
                            v.vulnerabilityId
                          )}
                        </td>
                        <td className="p-3 text-slate-200">{v.pkgName}</td>
                        <td className="p-3 text-slate-400">{v.installedVersion}</td>
                        <td className="p-3 text-emerald-400 font-semibold">{v.fixedVersion || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveScanResult(null)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 rounded-xl"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Scans Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-3xl p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-teal-400" />
              <span>Historical Trivy Vulnerability Scans</span>
            </h3>

            <div className="flex-1 overflow-y-auto border border-[#1E293B] rounded-xl bg-[#070C18]">
              {recentScans.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No scan records available yet.</div>
              ) : (
                <div className="divide-y divide-[#1E293B]">
                  {recentScans.map((scan) => (
                    <div
                      key={scan._id}
                      onClick={() => {
                        setActiveScanResult(scan);
                        setShowHistoryModal(false);
                      }}
                      className="p-3.5 hover:bg-slate-900/50 cursor-pointer flex items-center justify-between gap-3 text-xs transition"
                    >
                      <div>
                        <div className="font-mono font-bold text-white flex items-center gap-2">
                          <span className="text-teal-300">{scan.target}</span>
                          <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.2 bg-slate-800 rounded">
                            {scan.scanType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Server: {scan.serverName} ({scan.serverHost}) • {new Date(scan.scannedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          {scan.summary.critical} Crit
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          {scan.summary.high} High
                        </span>
                        <span className="text-slate-400 text-[10px] ml-1">View Details &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uninstall Confirmation Modal */}
      {uninstallTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm {uninstallTarget.tool.toUpperCase()} Removal
                </h3>
                <p className="text-xs text-rose-300">
                  Server: {uninstallTarget.server.name} ({uninstallTarget.server.host})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to uninstall {uninstallTarget.tool.toUpperCase()} from this server?
            </p>

            {uninstallTarget.tool !== 'trivy' && (
              <div className="p-3 rounded-xl bg-[#111A2E] border border-slate-800 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={preserveData}
                    onChange={(e) => setPreserveData(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold">Preserve Configurations & Persistent Data</span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6">
                  When checked, application configurations and database volumes are preserved on the host.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUninstallTarget(null)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUninstall}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/30"
              >
                Confirm & Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Log Modal */}
      {modalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setModalLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>{modalLog.title}</span>
            </h3>

            <div className="bg-[#070C18] border border-[#1E293B] rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap">
              {modalLog.output || 'No output stream returned.'}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setModalLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live SSH Terminal Modal */}
      {terminalOpen && terminalTarget && (
        <SSHTerminalModal
          isOpen={terminalOpen}
          target={terminalTarget}
          onClose={() => {
            setTerminalOpen(false);
            setTerminalTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default function JenkinsModulePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#070C18] text-cyan-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <JenkinsContent />
    </Suspense>
  );
}
