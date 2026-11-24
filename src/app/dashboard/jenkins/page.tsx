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
  Power,
  PowerOff,
  Sliders,
  FileEdit,
  Code2,
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
import { DEFAULT_DEVOPS_COMMANDS } from '@/lib/devops/devopsDefaults';

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
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'installed' | 'running' | 'stopped' | 'server-running' | 'server-stopped' | 'server-unreachable'
  >('all');

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

  // Custom Commands & Action Editor State
  const [toolConfigs, setToolConfigs] = useState<Record<PipelineTab, any>>({
    jenkins: null,
    sonarqube: null,
    trivy: null,
  });
  const [editCommandsModalOpen, setEditCommandsModalOpen] = useState(false);
  const [editTool, setEditTool] = useState<PipelineTab>('jenkins');
  const [editorTab, setEditorTab] = useState<'install' | 'uninstall' | 'settings'>('install');
  const [editorInstallCmds, setEditorInstallCmds] = useState('');
  const [editorUninstallCmds, setEditorUninstallCmds] = useState('');
  const [editorVerifyCmds, setEditorVerifyCmds] = useState('');
  const [editorServiceName, setEditorServiceName] = useState('');
  const [editorPort, setEditorPort] = useState<number>(8080);
  const [editorHealthCheck, setEditorHealthCheck] = useState('');
  const [editorTargetServer, setEditorTargetServer] = useState<string>('');
  const [testingCommand, setTestingCommand] = useState(false);
  const [testOutput, setTestOutput] = useState<{
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    message?: string;
    serverName?: string;
    serverHost?: string;
  } | null>(null);
  const [savingCommands, setSavingCommands] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Tab-level Target Server Selection
  const [tabTargetServer, setTabTargetServer] = useState<Record<PipelineTab, string>>({
    jenkins: '',
    sonarqube: '',
    trivy: '',
  });

  // Sync tab with URL
  const switchTab = (tab: PipelineTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/dashboard/jenkins?${params.toString()}`);
  };

  const fetchServers = useCallback(async (sync = false) => {
    if (sync) setIsSyncing(true);
    else setLoading((prev) => (servers.length === 0 ? true : false));

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
  }, [servers.length]);

  const fetchRecentScans = useCallback(async () => {
    try {
      const res = await fetch('/api/trivy/scans?limit=20');
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.scans || []);
      }
    } catch { }
  }, []);

  const fetchToolConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/devops/commands');
      if (res.ok) {
        const data = await res.json();
        if (data.configs && Array.isArray(data.configs)) {
          const map: any = {};
          data.configs.forEach((c: any) => {
            map[c.tool] = c;
          });
          setToolConfigs((prev) => ({ ...prev, ...map }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch tool commands:', err);
    }
  }, []);

  useEffect(() => {
    fetchServers(false);
    fetchRecentScans();
    fetchToolConfigs();
  }, [fetchServers, fetchRecentScans, fetchToolConfigs]);

  useEffect(() => {
    if (servers.length > 0) {
      setTabTargetServer((prev) => {
        const next = { ...prev };
        (['jenkins', 'sonarqube', 'trivy'] as PipelineTab[]).forEach((t) => {
          if (!next[t] || !servers.some((s) => s.id === next[t])) {
            const preferred = servers.find((s) => {
              const st = (s.status || '').toLowerCase();
              return st.includes('run') || st === 'online';
            }) || servers[0];
            if (preferred) next[t] = preferred.id;
          }
        });
        return next;
      });
    }
  }, [servers]);

  const openEditCommands = (tool: PipelineTab) => {
    setEditTool(tool);
    const cfg = toolConfigs[tool];
    if (cfg) {
      setEditorInstallCmds(cfg.installCommands || '');
      setEditorUninstallCmds(cfg.uninstallCommands || '');
      setEditorVerifyCmds(cfg.verificationCommands || '');
      setEditorServiceName(cfg.serviceName || '');
      setEditorPort(cfg.port || (tool === 'jenkins' ? 8080 : tool === 'sonarqube' ? 9000 : 0));
      setEditorHealthCheck(cfg.healthCheckCommand || '');
    }
    const defaultServer = tabTargetServer[tool] || servers[0]?.id || '';
    setEditorTargetServer(defaultServer);
    setTestOutput(null);
    setSaveSuccessNotice(null);
    setEditorTab('install');
    setEditCommandsModalOpen(true);
  };

  const handleSaveCommands = async () => {
    setSavingCommands(true);
    setSaveSuccessNotice(null);
    try {
      const res = await fetch('/api/devops/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: editTool,
          installCommands: editorInstallCmds,
          uninstallCommands: editorUninstallCmds,
          verificationCommands: editorVerifyCmds,
          serviceName: editorServiceName,
          port: editorPort,
          healthCheckCommand: editorHealthCheck,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToolConfigs((prev) => ({
          ...prev,
          [editTool]: data.config,
        }));
        setSaveSuccessNotice(`Commands for ${editTool.toUpperCase()} saved successfully!`);
        setTimeout(() => setSaveSuccessNotice(null), 4000);
      } else {
        alert(data.error || 'Failed to save commands');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving commands');
    } finally {
      setSavingCommands(false);
    }
  };

  const handleTestCommands = async () => {
    if (!editorTargetServer) {
      alert('Please select a target server to test the command.');
      return;
    }
    setTestingCommand(true);
    setTestOutput(null);

    const commandToTest =
      editorTab === 'install'
        ? editorVerifyCmds.trim() || 'which ' + (editorServiceName || editTool) + ' 2>&1 || echo "Not found"'
        : editorTab === 'uninstall'
        ? 'which ' + (editorServiceName || editTool) + ' 2>&1 || echo "Removed"'
        : editorHealthCheck.trim() || editorVerifyCmds.trim() || 'echo "Testing connection" && uname -a';

    try {
      const res = await fetch('/api/devops/commands/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: editTool,
          serverId: editorTargetServer,
          testCommand: commandToTest,
        }),
      });
      const data = await res.json();
      setTestOutput(data);
    } catch (err: any) {
      setTestOutput({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: err.message || 'Execution failed',
        message: 'Network or SSH test error',
      });
    } finally {
      setTestingCommand(false);
    }
  };

  const handleAction = async (tool: 'jenkins' | 'sonarqube' | 'trivy', serverId: string, action: string, options: any = {}) => {
    setActionLoading(`${tool}-${serverId}-${action}`);
    try {
      const res = await fetch(`/api/${tool}/servers/${serverId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...options }),
      });
      const data = await res.json();

      // Immediately update local state from action response for instantaneous UI reactivity
      if (data[tool]) {
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, [tool]: data[tool] } : s))
        );
      }

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
      await fetchToolConfigs();
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
  const runningServersCount = useMemo(
    () =>
      servers.filter((s) => {
        const st = (s.status || '').toLowerCase();
        return st === 'online' || st === 'running';
      }).length,
    [servers]
  );
  const stoppedServersCount = useMemo(
    () =>
      servers.filter((s) => {
        const st = (s.status || '').toLowerCase();
        return st.includes('stop');
      }).length,
    [servers]
  );
  const unreachableServersCount = useMemo(
    () =>
      servers.filter((s) => {
        const st = (s.status || '').toLowerCase();
        return st !== 'online' && st !== 'running' && !st.includes('stop');
      }).length,
    [servers]
  );

  const jenkinsInstalledCount = useMemo(() => servers.filter((s) => s.jenkins.detected).length, [servers]);
  const jenkinsRunningCount = useMemo(() => servers.filter((s) => s.jenkins.status === 'running').length, [servers]);
  const sonarInstalledCount = useMemo(() => servers.filter((s) => s.sonarqube.detected).length, [servers]);
  const sonarRunningCount = useMemo(() => servers.filter((s) => s.sonarqube.status === 'running').length, [servers]);
  const trivyInstalledCount = useMemo(() => servers.filter((s) => s.trivy.detected).length, [servers]);

  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      if (providerFilter !== 'all' && s.cloudProvider?.toLowerCase() !== providerFilter) return false;

      const sStatusLower = (s.status || '').toLowerCase();
      const isSrvRunning = sStatusLower === 'online' || sStatusLower === 'running';
      const isSrvStopped = sStatusLower.includes('stop');

      if (statusFilter === 'server-running' && !isSrvRunning) return false;
      if (statusFilter === 'server-stopped' && !isSrvStopped) return false;
      if (statusFilter === 'server-unreachable' && (isSrvRunning || isSrvStopped)) return false;

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
        const matchStatus = (s.status || '').toLowerCase().includes(q);
        return matchName || matchHost || matchStatus;
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
              <div
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner transition-all ${activeTab === 'jenkins'
                  ? 'bg-gradient-to-br from-red-500/20 via-rose-500/10 to-red-600/20 border-red-500/40'
                  : activeTab === 'sonarqube'
                    ? 'bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-cyan-600/20 border-cyan-500/40'
                    : 'bg-gradient-to-br from-teal-500/20 via-emerald-500/10 to-teal-600/20 border-teal-500/40'
                  }`}
              >
                {activeTab === 'jenkins' && <JenkinsLogo className="w-8 h-8" />}
                {activeTab === 'sonarqube' && <SonarQubeLogo className="w-8 h-8" />}
                {activeTab === 'trivy' && <TrivyLogo className="w-8 h-8" />}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    {activeTab === 'jenkins' && 'Jenkins CI/CD & DevOps Suite'}
                    {activeTab === 'sonarqube' && 'SonarQube Code Quality & Security'}
                    {activeTab === 'trivy' && 'Aqua Trivy Security & Vulnerability Scanner'}
                  </h1>
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
                  {activeTab === 'jenkins' &&
                    'Unified DevOps orchestration: Automatic discovery, port detection, and live SSH management for Jenkins CI/CD pipelines.'}
                  {activeTab === 'sonarqube' &&
                    'Automated static code analysis, security vulnerability detection, and code smell tracking for multi-cloud repositories.'}
                  {activeTab === 'trivy' &&
                    'Comprehensive security scanner for container images, filesystems, and software supply-chain vulnerabilities.'}
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

              {activeTab === 'trivy' && (
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-teal-400" />
                  <span>Scan History ({recentScans.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* DevOps Pipeline Integrated Tool Switcher Bar */}
          <div className="flex items-center gap-3 bg-[#0D1526] border border-[#1E293B] rounded-2xl p-2 shadow-sm overflow-x-auto">
            <button
              type="button"
              onClick={() => switchTab('jenkins')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeTab === 'jenkins'
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
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeTab === 'sonarqube'
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
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeTab === 'trivy'
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

          {/* Tool Control & Custom Command Action Hub */}
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Tool Identity & Commands Summary */}
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${
                    activeTab === 'jenkins'
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : activeTab === 'sonarqube'
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                      : 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                  }`}
                >
                  {activeTab === 'jenkins' && <JenkinsLogo className="w-6 h-6" />}
                  {activeTab === 'sonarqube' && <SonarQubeLogo className="w-6 h-6" />}
                  {activeTab === 'trivy' && <TrivyLogo className="w-6 h-6" />}
                </div>

                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      {activeTab === 'jenkins' && 'Jenkins CI/CD Automation Hub'}
                      {activeTab === 'sonarqube' && 'SonarQube Quality Gate Hub'}
                      {activeTab === 'trivy' && 'Trivy Security Scanner Hub'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#111A2E] text-slate-300 border border-slate-700/60">
                      {activeTab.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap font-mono">
                    <span className="text-slate-300">
                      Install:{' '}
                      <strong className="text-white">
                        {(toolConfigs[activeTab]?.installCommands || '').split('\n').filter(Boolean).length}
                      </strong>{' '}
                      cmds
                    </span>
                    <span>•</span>
                    <span className="text-slate-300">
                      Uninstall:{' '}
                      <strong className="text-white">
                        {(toolConfigs[activeTab]?.uninstallCommands || '').split('\n').filter(Boolean).length}
                      </strong>{' '}
                      cmds
                    </span>
                    {toolConfigs[activeTab]?.port > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-300">
                          Port: <strong>{toolConfigs[activeTab].port}</strong>
                        </span>
                      </>
                    )}
                    {toolConfigs[activeTab]?.serviceName && (
                      <>
                        <span>•</span>
                        <span className="text-slate-400">
                          Svc: {toolConfigs[activeTab].serviceName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Last Execution Info & Logs Trigger */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {toolConfigs[activeTab]?.lastExecutionAt ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111A2E] border border-slate-800 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        toolConfigs[activeTab].lastExecutionStatus === 'success'
                          ? 'bg-emerald-400 animate-pulse'
                          : toolConfigs[activeTab].lastExecutionStatus === 'running'
                          ? 'bg-amber-400 animate-spin'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-slate-400 text-[11px]">
                      Last {toolConfigs[activeTab].lastExecutionAction || 'action'}:
                    </span>
                    <span className="text-white font-semibold text-[11px]">
                      {toolConfigs[activeTab].lastExecutionServerName || toolConfigs[activeTab].lastExecutionServerHost || 'Server'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        toolConfigs[activeTab].lastExecutionStatus === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {toolConfigs[activeTab].lastExecutionStatus?.toUpperCase()}
                    </span>
                    {toolConfigs[activeTab]?.lastExecutionLog && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalLog({
                            title: `${activeTab.toUpperCase()} ${toolConfigs[activeTab].lastExecutionAction || 'LOGS'} - ${toolConfigs[activeTab].lastExecutionServerName || 'Host'}`,
                            output: toolConfigs[activeTab].lastExecutionLog,
                          })
                        }
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer ml-1"
                      >
                        View Logs
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic">No custom commands executed yet</div>
                )}
              </div>
            </div>

            {/* Target Server Selector & The 3 Primary Actions */}
            <div className="pt-3 border-t border-[#1E293B]/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Target Server Dropdown */}
              <div className="flex items-center gap-2.5 flex-1 max-w-xl">
                <span className="text-xs font-semibold text-slate-300 shrink-0">Target Server:</span>
                <select
                  value={tabTargetServer[activeTab] || ''}
                  onChange={(e) =>
                    setTabTargetServer((prev) => ({ ...prev, [activeTab]: e.target.value }))
                  }
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  {servers.map((s) => {
                    const st = (s.status || '').toLowerCase();
                    const stateLabel = st.includes('stop')
                      ? ' [STOPPED]'
                      : st === 'online' || st === 'running'
                      ? ' [RUNNING]'
                      : ` [${s.status}]`;
                    const toolObj = s[activeTab];
                    const isDetected = toolObj?.detected;
                    const toolStatus = isDetected
                      ? ` • ${activeTab.toUpperCase()} ${toolObj.status || 'Active'}${
                          toolObj.version ? ` (v${toolObj.version})` : ''
                        }`
                      : ` • Not Installed`;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.publicIp || s.host}){stateLabel}
                        {toolStatus}
                      </option>
                    );
                  })}
                </select>

                {/* Target Server Live Status Pill */}
                {(() => {
                  const targetS = servers.find((s) => s.id === tabTargetServer[activeTab]);
                  if (!targetS) return null;
                  const st = (targetS.status || '').toLowerCase();
                  const isStopped = st.includes('stop');
                  const toolObj = targetS[activeTab];
                  if (isStopped) {
                    return (
                      <span className="shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Server Stopped
                      </span>
                    );
                  }
                  if (toolObj?.detected) {
                    return (
                      <span className="shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {toolObj.status === 'running' ? 'Running' : 'Installed'}
                        {toolObj.version ? ` (v${toolObj.version})` : ''}
                      </span>
                    );
                  }
                  return (
                    <span className="shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      Not Installed
                    </span>
                  );
                })()}
              </div>

              {/* The 3 Actions: Install, Uninstall, Edit Commands */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {/* 1. Install Button */}
                <button
                  type="button"
                  disabled={
                    Boolean(actionLoading) ||
                    Boolean(
                      servers
                        .find((s) => s.id === tabTargetServer[activeTab])
                        ?.status?.toLowerCase()
                        .includes('stop')
                    )
                  }
                  onClick={() => {
                    const targetId = tabTargetServer[activeTab];
                    const targetS = servers.find((s) => s.id === targetId);
                    if (!targetS) return;
                    if (targetS.status?.toLowerCase().includes('stop')) {
                      alert('Target server is stopped. Power on the server first.');
                      return;
                    }
                    handleAction(activeTab, targetId, 'install', {
                      port:
                        toolConfigs[activeTab]?.port ||
                        (activeTab === 'jenkins' ? 8080 : activeTab === 'sonarqube' ? 9000 : 0),
                    });
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer ${
                    servers
                      .find((s) => s.id === tabTargetServer[activeTab])
                      ?.status?.toLowerCase()
                      .includes('stop')
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                      : activeTab === 'jenkins'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-500/20'
                      : activeTab === 'sonarqube'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-cyan-500/20'
                      : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-teal-500/20'
                  }`}
                >
                  {actionLoading === `${activeTab}-${tabTargetServer[activeTab]}-install` ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>
                    {servers.find((s) => s.id === tabTargetServer[activeTab])?.[activeTab]?.detected
                      ? 'Reinstall'
                      : 'Install'}
                  </span>
                </button>

                {/* 2. Uninstall Button */}
                <button
                  type="button"
                  disabled={
                    Boolean(actionLoading) ||
                    Boolean(
                      servers
                        .find((s) => s.id === tabTargetServer[activeTab])
                        ?.status?.toLowerCase()
                        .includes('stop')
                    )
                  }
                  onClick={() => {
                    const targetId = tabTargetServer[activeTab];
                    const targetS = servers.find((s) => s.id === targetId);
                    if (!targetS) return;
                    if (targetS.status?.toLowerCase().includes('stop')) {
                      alert('Target server is stopped. Power on the server first.');
                      return;
                    }
                    setUninstallTarget({ server: targetS, tool: activeTab });
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    servers
                      .find((s) => s.id === tabTargetServer[activeTab])
                      ?.status?.toLowerCase()
                      .includes('stop')
                      ? 'bg-slate-800/60 border-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Uninstall</span>
                </button>

                {/* 3. Edit Commands Button */}
                <button
                  type="button"
                  onClick={() => openEditCommands(activeTab)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-[#111A2E] hover:bg-[#18233C] text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Edit Commands</span>
                </button>

                {/* Trivy Run Scan Button */}
                {activeTab === 'trivy' && (
                  <button
                    type="button"
                    onClick={() => {
                      const curId = tabTargetServer.trivy || servers[0]?.id;
                      if (curId) setTrivyScanServer(curId);
                      setTrivyScanOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 rounded-xl transition-all cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Run Scan</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Fleet Compute Health & Server Power Status Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D1526] border border-[#1E293B] rounded-2xl px-5 py-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-300">Fleet Compute Status:</span>
              <span className="text-xs font-bold text-white font-mono">{servers.length} Monitored Servers</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'server-running' ? 'all' : 'server-running')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'server-running'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-sm'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20'
                  }`}
                title="Filter by running servers"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{runningServersCount} Server{runningServersCount === 1 ? '' : 's'} Running</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'server-stopped' ? 'all' : 'server-stopped')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'server-stopped'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/60 shadow-sm'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20'
                  }`}
                title="Filter by stopped servers"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{stoppedServersCount} Server{stoppedServersCount === 1 ? '' : 's'} Stopped</span>
              </button>

              {unreachableServersCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'server-unreachable' ? 'all' : 'server-unreachable')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'server-unreachable'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-sm'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20'
                    }`}
                  title="Filter by unreachable/timeout servers"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{unreachableServersCount} Server{unreachableServersCount === 1 ? '' : 's'} Unreachable</span>
                </button>
              )}

              {statusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2 ml-1"
                >
                  Reset filter
                </button>
              )}
            </div>
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">All Servers & Statuses</option>
                <option value="server-running">● Server: Running ({runningServersCount})</option>
                <option value="server-stopped">■ Server: Stopped ({stoppedServersCount})</option>
                {unreachableServersCount > 0 && (
                  <option value="server-unreachable">▲ Server: Unreachable ({unreachableServersCount})</option>
                )}
                <option value="installed">Tool: Installed Only</option>
                {activeTab !== 'trivy' && (
                  <>
                    <option value="running">Tool: Running</option>
                    <option value="stopped">Tool: Stopped</option>
                  </>
                )}
              </select>
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

                  const sStatusLower = (server.status || '').toLowerCase();
                  const isServerRunning = sStatusLower === 'online' || sStatusLower === 'running';
                  const isServerStopped = sStatusLower.includes('stop');
                  const isServerUnreachable = !isServerRunning && !isServerStopped;

                  return (
                    <div
                      key={server.id}
                      className={`bg-[#0D1526] border rounded-2xl p-5 shadow-lg transition-all space-y-4 ${isServerStopped
                        ? 'border-rose-900/40 bg-gradient-to-b from-[#0D1526] to-rose-950/10'
                        : isServerRunning
                          ? 'border-[#1E293B] hover:border-slate-700'
                          : 'border-amber-900/40 bg-gradient-to-b from-[#0D1526] to-amber-950/10'
                        }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-[#111A2E] border border-[#1E293B] flex items-center justify-center">
                              {server.cloudProvider?.toLowerCase() === 'azure' ? (
                                <AzureLogo className="w-5 h-5" />
                              ) : server.cloudProvider?.toLowerCase() === 'aws' ? (
                                <AwsLogo className="w-5 h-5" />
                              ) : (
                                <Server className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <span
                              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0D1526] ${isServerRunning
                                ? 'bg-emerald-400 animate-pulse'
                                : isServerStopped
                                  ? 'bg-rose-500'
                                  : 'bg-amber-400'
                                }`}
                              title={`Host Server: ${isServerRunning ? 'Running' : isServerStopped ? 'Stopped' : server.status || 'Offline'}`}
                            />
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

                              {/* Prominent Server Power Status Badge */}
                              {isServerRunning ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Server Running
                                </span>
                              ) : isServerStopped ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Server Stopped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  Server {server.status || 'Offline'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Platform OS: <span className="text-slate-300 font-medium">{server.osName}</span>
                              {isInstalled && j.installDate && (
                                <span className="ml-2 text-slate-500">• Installed: {j.installDate}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {isServerStopped ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-bold">
                                <Power className="w-3.5 h-3.5 text-rose-400" />
                                Server Stopped
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-semibold">
                                {isInstalled ? 'Jenkins Installed' : 'Not Installed'}
                              </span>
                            </div>
                          ) : isInstalled ? (
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
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm ${isRunning && isServerRunning
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
                            disabled={isServerStopped}
                            onClick={() => openTerminal(server)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-xl transition-all ${isServerStopped
                              ? 'bg-[#111A2E]/40 text-slate-500 border-[#1E293B]/40 cursor-not-allowed opacity-50'
                              : 'bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border-[#1E293B] cursor-pointer'
                              }`}
                            title={isServerStopped ? 'Cannot open terminal because the host server is stopped.' : 'Open SSH Terminal'}
                          >
                            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Terminal</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {isServerStopped ? (
                            <button
                              type="button"
                              disabled
                              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-slate-800/60 border border-rose-500/30 text-rose-400/80 rounded-xl cursor-not-allowed"
                              title="Host server is stopped. Please start the server from your cloud console or Server dashboard to perform operations."
                            >
                              <PowerOff className="w-3.5 h-3.5 text-rose-400" />
                              <span>{isInstalled ? 'Server Stopped' : 'Install Jenkins (Server Stopped)'}</span>
                            </button>
                          ) : isInstalled ? (
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

                  const sStatusLower = (server.status || '').toLowerCase();
                  const isServerRunning = sStatusLower === 'online' || sStatusLower === 'running';
                  const isServerStopped = sStatusLower.includes('stop');
                  const isServerUnreachable = !isServerRunning && !isServerStopped;

                  return (
                    <div
                      key={server.id}
                      className={`bg-[#0D1526] border rounded-2xl p-5 shadow-lg transition-all space-y-4 ${isServerStopped
                        ? 'border-rose-900/40 bg-gradient-to-b from-[#0D1526] to-rose-950/10'
                        : isServerRunning
                          ? 'border-[#1E293B] hover:border-slate-700'
                          : 'border-amber-900/40 bg-gradient-to-b from-[#0D1526] to-amber-950/10'
                        }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-[#111A2E] border border-[#1E293B] flex items-center justify-center">
                              {server.cloudProvider?.toLowerCase() === 'azure' ? (
                                <AzureLogo className="w-5 h-5" />
                              ) : server.cloudProvider?.toLowerCase() === 'aws' ? (
                                <AwsLogo className="w-5 h-5" />
                              ) : (
                                <Server className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <span
                              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0D1526] ${isServerRunning
                                ? 'bg-emerald-400 animate-pulse'
                                : isServerStopped
                                  ? 'bg-rose-500'
                                  : 'bg-amber-400'
                                }`}
                              title={`Host Server: ${isServerRunning ? 'Running' : isServerStopped ? 'Stopped' : server.status || 'Offline'}`}
                            />
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

                              {/* Prominent Server Power Status Badge */}
                              {isServerRunning ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Server Running
                                </span>
                              ) : isServerStopped ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Server Stopped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  Server {server.status || 'Offline'}
                                </span>
                              )}
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
                          {isServerStopped ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-bold">
                                <Power className="w-3.5 h-3.5 text-rose-400" />
                                Server Stopped
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-semibold">
                                {isInstalled ? 'SonarQube Installed' : 'Not Installed'}
                              </span>
                            </div>
                          ) : isInstalled ? (
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
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm ${isRunning && isServerRunning
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
                            disabled={isServerStopped}
                            onClick={() => openTerminal(server)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-xl transition-all ${isServerStopped
                              ? 'bg-[#111A2E]/40 text-slate-500 border-[#1E293B]/40 cursor-not-allowed opacity-50'
                              : 'bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border-[#1E293B] cursor-pointer'
                              }`}
                            title={isServerStopped ? 'Cannot open terminal because the host server is stopped.' : 'Open SSH Terminal'}
                          >
                            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Terminal</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {isServerStopped ? (
                            <button
                              type="button"
                              disabled
                              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-slate-800/60 border border-rose-500/30 text-rose-400/80 rounded-xl cursor-not-allowed"
                              title="Host server is stopped. Please start the server from your cloud console or Server dashboard to perform operations."
                            >
                              <PowerOff className="w-3.5 h-3.5 text-rose-400" />
                              <span>{isInstalled ? 'Server Stopped' : 'Deploy SonarQube (Server Stopped)'}</span>
                            </button>
                          ) : isInstalled ? (
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

                const sStatusLower = (server.status || '').toLowerCase();
                const isServerRunning = sStatusLower === 'online' || sStatusLower === 'running';
                const isServerStopped = sStatusLower.includes('stop');
                const isServerUnreachable = !isServerRunning && !isServerStopped;

                return (
                  <div
                    key={server.id}
                    className={`bg-[#0D1526] border rounded-2xl p-5 shadow-lg transition-all space-y-4 ${isServerStopped
                      ? 'border-rose-900/40 bg-gradient-to-b from-[#0D1526] to-rose-950/10'
                      : isServerRunning
                        ? 'border-[#1E293B] hover:border-slate-700'
                        : 'border-amber-900/40 bg-gradient-to-b from-[#0D1526] to-amber-950/10'
                      }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-[#111A2E] border border-[#1E293B] flex items-center justify-center">
                            {server.cloudProvider?.toLowerCase() === 'azure' ? (
                              <AzureLogo className="w-5 h-5" />
                            ) : server.cloudProvider?.toLowerCase() === 'aws' ? (
                              <AwsLogo className="w-5 h-5" />
                            ) : (
                              <Server className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <span
                            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0D1526] ${isServerRunning
                              ? 'bg-emerald-400 animate-pulse'
                              : isServerStopped
                                ? 'bg-rose-500'
                                : 'bg-amber-400'
                              }`}
                            title={`Host Server: ${isServerRunning ? 'Running' : isServerStopped ? 'Stopped' : server.status || 'Offline'}`}
                          />
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

                            {/* Prominent Server Power Status Badge */}
                            {isServerRunning ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Server Running
                              </span>
                            ) : isServerStopped ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Server Stopped
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Server {server.status || 'Offline'}
                              </span>
                            )}
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
                        {isServerStopped ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-bold">
                              <Power className="w-3.5 h-3.5 text-rose-400" />
                              Server Stopped
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-semibold">
                              {isInstalled ? 'Trivy Installed' : 'Not Installed'}
                            </span>
                          </div>
                        ) : isInstalled ? (
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
                              disabled={isServerStopped}
                              onClick={() => {
                                setTrivyScanServer(server.id);
                                setTrivyScanType('image');
                                setTrivyTarget('nginx:alpine');
                                setTrivyScanOpen(true);
                              }}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold border rounded-xl transition-all shadow-sm ${isServerStopped
                                ? 'bg-[#111A2E]/40 text-slate-500 border-[#1E293B]/40 cursor-not-allowed opacity-50'
                                : 'bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border-teal-500/40 cursor-pointer'
                                }`}
                              title={isServerStopped ? 'Server is stopped.' : 'Scan container image'}
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>Scan Image</span>
                            </button>

                            <button
                              type="button"
                              disabled={isServerStopped}
                              onClick={() => {
                                setTrivyScanServer(server.id);
                                setTrivyScanType('fs');
                                setTrivyTarget('/var/www');
                                setTrivyScanOpen(true);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-xl transition-all ${isServerStopped
                                ? 'bg-[#111A2E]/40 text-slate-500 border-[#1E293B]/40 cursor-not-allowed opacity-50'
                                : 'bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border-[#1E293B] cursor-pointer'
                                }`}
                              title={isServerStopped ? 'Server is stopped.' : 'Scan filesystem path'}
                            >
                              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Scan Path</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          disabled={isServerStopped}
                          onClick={() => openTerminal(server)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-xl transition-all ${isServerStopped
                            ? 'bg-[#111A2E]/40 text-slate-500 border-[#1E293B]/40 cursor-not-allowed opacity-50'
                            : 'bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border-[#1E293B] cursor-pointer'
                            }`}
                          title={isServerStopped ? 'Cannot open terminal because the host server is stopped.' : 'Open SSH Terminal'}
                        >
                          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Terminal</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isServerStopped ? (
                          <button
                            type="button"
                            disabled
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-slate-800/60 border border-rose-500/30 text-rose-400/80 rounded-xl cursor-not-allowed"
                            title="Host server is stopped. Please start the server from your cloud console or Server dashboard to perform operations."
                          >
                            <PowerOff className="w-3.5 h-3.5 text-rose-400" />
                            <span>{isInstalled ? 'Server Stopped' : 'Install Trivy CLI (Server Stopped)'}</span>
                          </button>
                        ) : isInstalled ? (
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
                  {servers.map((s) => {
                    const st = (s.status || '').toLowerCase();
                    const stateLabel = st.includes('stop') ? ' [STOPPED]' : st === 'online' || st === 'running' ? ' [RUNNING]' : ` [${s.status}]`;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.publicIp || s.host}){stateLabel} {s.jenkins.detected ? '• Already Installed' : ''}
                      </option>
                    );
                  })}
                </select>
                {servers.find((s) => s.id === jenkinsInstallServer)?.status?.toLowerCase().includes('stop') && (
                  <div className="flex items-center gap-2 p-2.5 mt-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Target server is <strong>STOPPED</strong>. Power on the server first before installing.</span>
                  </div>
                )}
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
                disabled={Boolean(servers.find((s) => s.id === jenkinsInstallServer)?.status?.toLowerCase().includes('stop'))}
                onClick={() => {
                  setJenkinsInstallOpen(false);
                  handleAction('jenkins', jenkinsInstallServer, 'install', { port: jenkinsPort });
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl shadow-lg transition-all ${servers.find((s) => s.id === jenkinsInstallServer)?.status?.toLowerCase().includes('stop')
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white shadow-red-500/20'
                  }`}
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
                  {servers.map((s) => {
                    const st = (s.status || '').toLowerCase();
                    const stateLabel = st.includes('stop') ? ' [STOPPED]' : st === 'online' || st === 'running' ? ' [RUNNING]' : ` [${s.status}]`;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.publicIp || s.host}){stateLabel} {s.sonarqube.detected ? '• Already Installed' : ''}
                      </option>
                    );
                  })}
                </select>
                {servers.find((s) => s.id === sonarInstallServer)?.status?.toLowerCase().includes('stop') && (
                  <div className="flex items-center gap-2 p-2.5 mt-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Target server is <strong>STOPPED</strong>. Power on the server first before deploying SonarQube.</span>
                  </div>
                )}
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
                disabled={Boolean(servers.find((s) => s.id === sonarInstallServer)?.status?.toLowerCase().includes('stop'))}
                onClick={() => {
                  setSonarInstallOpen(false);
                  handleAction('sonarqube', sonarInstallServer, 'install', { port: sonarPort });
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl shadow-lg transition-all ${servers.find((s) => s.id === sonarInstallServer)?.status?.toLowerCase().includes('stop')
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 text-white shadow-cyan-500/20'
                  }`}
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
                  {servers.map((s) => {
                    const st = (s.status || '').toLowerCase();
                    const stateLabel = st.includes('stop') ? ' [STOPPED]' : st === 'online' || st === 'running' ? ' [RUNNING]' : ` [${s.status}]`;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.publicIp || s.host}){stateLabel} {s.trivy.detected ? '• Trivy Ready' : '(Not installed)'}
                      </option>
                    );
                  })}
                </select>
                {servers.find((s) => s.id === trivyScanServer)?.status?.toLowerCase().includes('stop') && (
                  <div className="flex items-center gap-2 p-2.5 mt-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Target server is <strong>STOPPED</strong>. Power on the server first before running Trivy scans.</span>
                  </div>
                )}
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
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${trivyScanType === 'image'
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
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${trivyScanType === 'fs'
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
                disabled={Boolean(servers.find((s) => s.id === trivyScanServer)?.status?.toLowerCase().includes('stop'))}
                onClick={() => {
                  setTrivyScanOpen(false);
                  const action = trivyScanType === 'image' ? 'scan_image' : 'scan_fs';
                  handleAction('trivy', trivyScanServer, action, { target: trivyTarget.trim() });
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl shadow-lg transition-all ${servers.find((s) => s.id === trivyScanServer)?.status?.toLowerCase().includes('stop')
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 text-white shadow-teal-500/20'
                  }`}
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
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.severity === 'CRITICAL'
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
                {uninstallTarget.tool === 'jenkins' ? (
                  <JenkinsLogo className="w-6 h-6" />
                ) : uninstallTarget.tool === 'sonarqube' ? (
                  <SonarQubeLogo className="w-6 h-6" />
                ) : (
                  <TrivyLogo className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm{' '}
                  {uninstallTarget.tool === 'jenkins'
                    ? 'Jenkins'
                    : uninstallTarget.tool === 'sonarqube'
                      ? 'SonarQube'
                      : 'Trivy'}{' '}
                  Removal
                </h3>
                <p className="text-xs text-rose-300">
                  Server: {uninstallTarget.server.name} ({uninstallTarget.server.host})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to uninstall{' '}
              <strong className="text-white">
                {uninstallTarget.tool === 'jenkins'
                  ? 'Jenkins CI/CD'
                  : uninstallTarget.tool === 'sonarqube'
                    ? 'SonarQube'
                    : 'Trivy Scanner'}
              </strong>{' '}
              from this server?
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

      {/* Custom Command Editor Modal */}
      {editCommandsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-[#0B132B] border border-[#1E293B] rounded-2xl w-full max-w-4xl p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    editTool === 'jenkins'
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : editTool === 'sonarqube'
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                      : 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                  }`}
                >
                  {editTool === 'jenkins' && <JenkinsLogo className="w-6 h-6" />}
                  {editTool === 'sonarqube' && <SonarQubeLogo className="w-6 h-6" />}
                  {editTool === 'trivy' && <TrivyLogo className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Edit Custom Commands</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#111A2E] text-cyan-300 border border-cyan-500/30">
                      {editTool.toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Customize bash scripts executed over SSH during installation and uninstallation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditCommandsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editor Tab Navigation & Reset to Default */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 bg-[#070C18] border border-[#1E293B] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditorTab('install')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    editorTab === 'install'
                      ? 'bg-gradient-to-r from-red-600/30 to-rose-600/30 text-white border border-red-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Install Commands
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('uninstall')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    editorTab === 'uninstall'
                      ? 'bg-gradient-to-r from-rose-600/30 to-amber-600/30 text-white border border-rose-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Uninstall Commands
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('settings')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    editorTab === 'settings'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Additional Settings
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const defaults = DEFAULT_DEVOPS_COMMANDS[editTool];
                  if (defaults) {
                    if (editorTab === 'install') setEditorInstallCmds(defaults.installCommands);
                    else if (editorTab === 'uninstall') setEditorUninstallCmds(defaults.uninstallCommands);
                    else {
                      setEditorVerifyCmds(defaults.verificationCommands);
                      setEditorServiceName(defaults.serviceName);
                      setEditorPort(defaults.port);
                      setEditorHealthCheck(defaults.healthCheckCommand);
                    }
                  }
                }}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-cyan-300 px-2.5 py-1.5 rounded-lg hover:bg-[#111A2E] transition self-start sm:self-auto cursor-pointer"
                title="Restore official default script for this tab"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset This Tab to Defaults</span>
              </button>
            </div>

            {/* Editor Main Content Area */}
            {editorTab === 'install' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-2.5 py-1 bg-[#070C18] border border-[#1E293B] rounded-t-xl text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="text-slate-300 text-[11px] ml-1">bash • install_{editTool}.sh</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {editorInstallCmds.split('\n').length} lines
                  </span>
                </div>
                <div className="relative flex bg-[#070C18] border border-t-0 border-[#1E293B] rounded-b-xl overflow-hidden font-mono text-xs">
                  {/* Line Numbers Gutter */}
                  <div className="select-none py-3 px-2 text-right bg-[#090F1E] text-slate-600 border-r border-[#1E293B] text-[11px] leading-5 min-w-[3rem]">
                    {editorInstallCmds.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  {/* Multiline Code Editor Textarea */}
                  <textarea
                    value={editorInstallCmds}
                    onChange={(e) => setEditorInstallCmds(e.target.value)}
                    rows={13}
                    spellCheck={false}
                    className="flex-1 bg-transparent text-emerald-400 font-mono text-xs p-3 leading-5 resize-none focus:outline-none whitespace-pre overflow-x-auto"
                    placeholder="# Enter bash install commands here..."
                  />
                </div>
              </div>
            )}

            {editorTab === 'uninstall' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-2.5 py-1 bg-[#070C18] border border-[#1E293B] rounded-t-xl text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="text-slate-300 text-[11px] ml-1">bash • uninstall_{editTool}.sh</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {editorUninstallCmds.split('\n').length} lines
                  </span>
                </div>
                <div className="relative flex bg-[#070C18] border border-t-0 border-[#1E293B] rounded-b-xl overflow-hidden font-mono text-xs">
                  {/* Line Numbers Gutter */}
                  <div className="select-none py-3 px-2 text-right bg-[#090F1E] text-slate-600 border-r border-[#1E293B] text-[11px] leading-5 min-w-[3rem]">
                    {editorUninstallCmds.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  {/* Multiline Code Editor Textarea */}
                  <textarea
                    value={editorUninstallCmds}
                    onChange={(e) => setEditorUninstallCmds(e.target.value)}
                    rows={13}
                    spellCheck={false}
                    className="flex-1 bg-transparent text-rose-300 font-mono text-xs p-3 leading-5 resize-none focus:outline-none whitespace-pre overflow-x-auto"
                    placeholder="# Enter bash uninstallation commands here..."
                  />
                </div>
              </div>
            )}

            {editorTab === 'settings' && (
              <div className="space-y-4 p-4 rounded-xl bg-[#070C18] border border-[#1E293B]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Service Name (systemctl / process name)
                    </label>
                    <input
                      type="text"
                      value={editorServiceName}
                      onChange={(e) => setEditorServiceName(e.target.value)}
                      placeholder="e.g. jenkins, sonarqube, trivy"
                      className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Port Number (0 if CLI only)
                    </label>
                    <input
                      type="number"
                      value={editorPort}
                      onChange={(e) => setEditorPort(parseInt(e.target.value, 10) || 0)}
                      placeholder="e.g. 8080, 9000"
                      className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Optional Verification Command (executed to confirm install/uninstall)
                  </label>
                  <textarea
                    value={editorVerifyCmds}
                    onChange={(e) => setEditorVerifyCmds(e.target.value)}
                    rows={3}
                    placeholder="e.g. systemctl is-active jenkins && jenkins --version"
                    className="w-full bg-[#111A2E] border border-[#1E293B] text-cyan-300 text-xs font-mono rounded-xl p-3 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Optional Health Check Command (HTTP probe or CLI query)
                  </label>
                  <input
                    type="text"
                    value={editorHealthCheck}
                    onChange={(e) => setEditorHealthCheck(e.target.value)}
                    placeholder='e.g. curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/login'
                    className="w-full bg-[#111A2E] border border-[#1E293B] text-cyan-300 text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            )}

            {/* Test Commands Action & Server Selector */}
            <div className="p-3 rounded-xl bg-[#070C18] border border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-semibold text-slate-300 shrink-0">Test On Server:</span>
                <select
                  value={editorTargetServer}
                  onChange={(e) => setEditorTargetServer(e.target.value)}
                  className="bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/50 max-w-xs"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.publicIp || s.host})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={testingCommand || !editorTargetServer}
                onClick={handleTestCommands}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-[#111A2E] hover:bg-[#18233C] text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/60 rounded-xl transition cursor-pointer shrink-0"
              >
                {testingCommand ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <TerminalIcon className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Test Commands On Server</span>
              </button>
            </div>

            {/* Test Execution Output Drawer */}
            {testOutput && (
              <div className="space-y-2 p-3 rounded-xl bg-[#070C18] border border-[#1E293B] animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        testOutput.exitCode === 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      Exit Code: {testOutput.exitCode ?? 'N/A'} (
                      {testOutput.exitCode === 0 ? 'SUCCESS' : 'NON-ZERO / FAILED'})
                    </span>
                    <span className="text-xs text-slate-400">
                      Target: {testOutput.serverName} ({testOutput.serverHost})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestOutput(null)}
                    className="text-[11px] text-slate-500 hover:text-slate-300"
                  >
                    Clear Output
                  </button>
                </div>

                <div className="bg-[#040810] border border-slate-800 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap">
                  {testOutput.stdout && (
                    <div className="text-emerald-300/90">{testOutput.stdout}</div>
                  )}
                  {testOutput.stderr && (
                    <div className="text-rose-400 mt-1">{testOutput.stderr}</div>
                  )}
                  {!testOutput.stdout && !testOutput.stderr && (
                    <div className="text-slate-500 italic">No output produced by test command.</div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Note: Testing does not alter the server installation state in the database.
                </p>
              </div>
            )}

            {/* Save Success Notice */}
            {saveSuccessNotice && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveSuccessNotice}</span>
              </div>
            )}

            {/* Modal Bottom Actions: Save, Cancel */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setEditCommandsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingCommands}
                onClick={handleSaveCommands}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 transition cursor-pointer"
              >
                {savingCommands && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Commands</span>
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
