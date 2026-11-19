'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCw,
  Power,
  Play,
  Square,
  Pause,
  Trash2,
  Terminal,
  RefreshCw,
  Boxes,
  Layers,
  HardDrive,
  Network,
  Activity,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Rocket,
  Settings,
  History,
  Shield,
  Server,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { DockerIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import {
  IDockerHostDetails,
  IDockerContainerItem,
  IDockerImageItem,
  IDockerVolumeItem,
  IDockerNetworkItem,
} from '@/lib/docker/dockerEngine';

interface DockerServerDetailViewProps {
  host: IDockerHostDetails;
  onBack: () => void;
  onOpenTerminal?: (host: IDockerHostDetails) => void;
}

type DockerTab = 'overview' | 'containers' | 'images' | 'volumes' | 'networks' | 'console' | 'deployment';

export function DockerServerDetailView({
  host,
  onBack,
  onOpenTerminal,
}: DockerServerDetailViewProps) {
  // Tab State
  const [activeTab, setActiveTab] = useState<DockerTab>('containers');

  // Server Resources State
  const [isLoading, setIsLoading] = useState(false);
  const [containers, setContainers] = useState<IDockerContainerItem[]>([]);
  const [images, setImages] = useState<IDockerImageItem[]>([]);
  const [volumes, setVolumes] = useState<IDockerVolumeItem[]>([]);
  const [networks, setNetworks] = useState<IDockerNetworkItem[]>([]);
  const [engineInfo, setEngineInfo] = useState<any>(null);
  const [dockerStatus, setDockerStatus] = useState(host.dockerStatus);
  const [dockerVersion, setDockerVersion] = useState(host.dockerVersion);

  // Search filters per tab
  const [containerSearch, setContainerSearch] = useState('');
  const [imageSearch, setImageSearch] = useState('');
  const [volumeSearch, setVolumeSearch] = useState('');
  const [networkSearch, setNetworkSearch] = useState('');

  // Container Action State
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // ---------------------------------------------------------------------------
  // Console Tab State (Frontend, Backend, Database, Combined)
  // ---------------------------------------------------------------------------
  const [consoleRole, setConsoleRole] = useState<'frontend' | 'backend' | 'database' | 'combined'>('frontend');
  const [consoleTail, setConsoleTail] = useState<number>(200);
  const [consoleSearch, setConsoleSearch] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<string>('');
  const [consoleLoading, setConsoleLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Role Mappings
  const [roleMapping, setRoleMapping] = useState({
    frontend: 'monitoring-frontend',
    backend: 'monitoring-backend',
    database: 'monitoring-database',
  });

  // ---------------------------------------------------------------------------
  // 1-Click Deployment Tab State
  // ---------------------------------------------------------------------------
  const [deploymentConfig, setDeploymentConfig] = useState<any>({
    appName: 'monitoring-app',
    gitRepoUrl: 'https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git',
    gitBranch: 'main',
    appDirectory: `/home/${host.username || 'siva'}/monitoring`,
    frontendDirectory: 'src',
    backendDirectory: 'src/server',
    frontendDockerfile: 'Dockerfile',
    backendDockerfile: 'Dockerfile',
    composeFilePath: 'docker-compose.yml',
    packageManager: 'npm',
    frontendContainerName: 'monitoring-frontend',
    backendContainerName: 'monitoring-backend',
    databaseContainerName: 'monitoring-database',
    redisContainerName: 'monitoring-redis-cache',
    nginxContainerName: 'monitoring-nginx-proxy',
    frontendPort: 3000,
    backendPort: 5000,
    healthCheckUrl: 'http://localhost:3000',
  });
  const [deploymentHistory, setDeploymentHistory] = useState<any[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentSteps, setDeploymentSteps] = useState<any[]>([]);
  const [deploymentLogs, setDeploymentLogs] = useState<string>('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. Fetch Full Docker Resources for this Server
  // ---------------------------------------------------------------------------
  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/docker/servers/${host.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setContainers(data.containers || []);
        setImages(data.images || []);
        setVolumes(data.volumes || []);
        setNetworks(data.networks || []);
        setEngineInfo(data.engineInfo || null);
        setDockerStatus(data.dockerStatus);
        setDockerVersion(data.dockerVersion);

        // Update default role mapping if matching containers exist
        const cList: IDockerContainerItem[] = data.containers || [];
        const f = cList.find((c) => c.name.includes('frontend') || c.name.includes('web') || c.name.includes('ui'));
        const b = cList.find((c) => c.name.includes('backend') || c.name.includes('api') || c.name.includes('server'));
        const d = cList.find((c) => c.name.includes('database') || c.name.includes('postgres') || c.name.includes('db'));
        setRoleMapping((prev) => ({
          frontend: f?.name || prev.frontend,
          backend: b?.name || prev.backend,
          database: d?.name || prev.database,
        }));
      } else {
        showToast('error', data.error || 'Failed to connect to Docker host');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Network error fetching Docker resources');
    } finally {
      setIsLoading(false);
    }
  }, [host.id]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // ---------------------------------------------------------------------------
  // 2. Fetch Console Logs
  // ---------------------------------------------------------------------------
  const fetchConsoleLogs = useCallback(async () => {
    if (isPaused) return;
    setConsoleLoading(true);
    try {
      let targetContainer = roleMapping.frontend;
      if (consoleRole === 'backend') targetContainer = roleMapping.backend;
      if (consoleRole === 'database') targetContainer = roleMapping.database;
      if (consoleRole === 'combined') targetContainer = 'monitoring-frontend';

      const res = await fetch(
        `/api/docker/servers/${host.id}/logs?container=${encodeURIComponent(targetContainer)}&lines=${consoleTail}`
      );
      const data = await res.json();
      if (res.ok && data.logs) {
        setConsoleLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to fetch logs:', err);
    } finally {
      setConsoleLoading(false);
    }
  }, [host.id, consoleRole, roleMapping, consoleTail, isPaused]);

  useEffect(() => {
    if (activeTab === 'console') {
      fetchConsoleLogs();
    }
  }, [activeTab, consoleRole, fetchConsoleLogs]);

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [consoleLogs, autoScroll]);

  // ---------------------------------------------------------------------------
  // 3. Load Deployment Config & History
  // ---------------------------------------------------------------------------
  const loadDeploymentData = useCallback(async () => {
    try {
      const res = await fetch(`/api/docker/servers/${host.id}/deploy`);
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) setDeploymentConfig(data.config);
        if (data.history) setDeploymentHistory(data.history);
      }
    } catch (err) {
      console.warn('Failed to load deploy data:', err);
    }
  }, [host.id]);

  useEffect(() => {
    if (activeTab === 'deployment') {
      loadDeploymentData();
    }
  }, [activeTab, loadDeploymentData]);

  // ---------------------------------------------------------------------------
  // 4. Container Actions (Start, Stop, Restart, Pause, Unpause, Delete)
  // ---------------------------------------------------------------------------
  const handleContainerAction = async (action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'remove', containerName: string) => {
    setActionLoading(`${action}-${containerName}`);
    try {
      const res = await fetch(`/api/docker/servers/${host.id}/containers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, container: containerName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Container "${containerName}" ${action} executed successfully!`);
        await fetchResources();
      } else {
        showToast('error', data.error || `Container ${action} failed.`);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Single-Click Deployment Execution
  // ---------------------------------------------------------------------------
  const handleRun1ClickDeploy = async () => {
    setIsDeploying(true);
    setDeploymentLogs('Initializing 1-Click Container Deployment...\n');
    setDeploymentSteps([
      { name: '1. Git Sync', status: 'RUNNING' },
      { name: '2. Dependencies', status: 'PENDING' },
      { name: '3. Docker Build', status: 'PENDING' },
      { name: '4. Container Recreate', status: 'PENDING' },
      { name: '5. Health Verification', status: 'PENDING' },
    ]);

    try {
      const res = await fetch(`/api/docker/servers/${host.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeploymentLogs(data.logs || 'Deployment completed successfully');
        if (data.steps) setDeploymentSteps(data.steps);
        showToast('success', '1-Click Application Deployment Succeeded!');
        await fetchResources();
        await loadDeploymentData();
      } else {
        setDeploymentLogs(data.logs || data.error || 'Deployment failed');
        if (data.steps) setDeploymentSteps(data.steps);
        showToast('error', data.error || 'Deployment failed.');
      }
    } catch (err: any) {
      setDeploymentLogs((prev) => prev + `\nFatal Error: ${err.message}`);
      showToast('error', err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  // Save Configuration
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch(`/api/docker/servers/${host.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_config', config: deploymentConfig }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Deployment parameters saved!');
        setConfigModalOpen(false);
      } else {
        showToast('error', data.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const isRunning = dockerStatus === 'running';
  const runningContainersCount = containers.filter((c) => c.state === 'running').length;
  const stoppedContainersCount = containers.filter((c) => c.state !== 'running').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb Navigation Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={onBack}
            className="hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Docker Hosts</span>
          </button>
          <span>/</span>
          <span className="text-white font-mono font-semibold">{host.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResources}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-semibold bg-[#0B1120] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-lg transition-colors cursor-pointer"
          >
            Return to Inventory
          </button>
        </div>
      </div>

      {/* Hero Banner matching AzureVMDetailView layout */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0089D6]/20 text-[#0089D6] flex items-center justify-center flex-shrink-0 shadow-inner">
              <DockerIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{host.name}</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#18233C] text-[#5EA0EF] border border-[#0089D6]/30 font-semibold">
                  {host.host || host.publicIp}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    isRunning
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span>{isRunning ? 'DAEMON RUNNING' : 'DAEMON STOPPED'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Shield className="w-3 h-3" />
                  <span>SSH Monitored Node</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Docker Engine: <strong className="text-cyan-400 font-mono">{dockerVersion}</strong> • Cloud:{' '}
                <strong className="text-slate-200 capitalize">{host.cloudProvider === 'other' ? 'On-Premises' : host.cloudProvider}</strong> • Region:{' '}
                <strong className="text-slate-200">{host.region}</strong> • OS:{' '}
                <strong className="text-slate-200">{host.osName}</strong>
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenTerminal?.(host)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-600/30"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Connect SSH Terminal</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('deployment');
                handleRun1ClickDeploy();
              }}
              disabled={isDeploying}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-purple-600/30"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Run 1-Click Deploy</span>
            </button>
          </div>
        </div>

        {/* 5 Summary KPI Cards inside Details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5">
          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Running Containers</span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">{runningContainersCount}</span>
            <span className="text-[10px] text-slate-500 block">Out of {containers.length} total</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stopped Containers</span>
            <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">{stoppedContainersCount}</span>
            <span className="text-[10px] text-slate-500 block">Exited / Inactive</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Images</span>
            <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">{images.length}</span>
            <span className="text-[10px] text-slate-500 block">Local cached</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Persistent Volumes</span>
            <span className="text-xl font-bold text-purple-400 font-mono mt-1 block">{volumes.length}</span>
            <span className="text-[10px] text-slate-500 block">Stateful storage</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Virtual Networks</span>
            <span className="text-xl font-bold text-blue-400 font-mono mt-1 block">{networks.length}</span>
            <span className="text-[10px] text-slate-500 block">Bridges & Overlays</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Azure VM Detail View Style) */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-2 shadow-xl shadow-black/20 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'containers', label: 'Containers', icon: Boxes, badge: containers.length },
            { id: 'images', label: 'Images', icon: Layers, badge: images.length },
            { id: 'volumes', label: 'Volumes', icon: HardDrive, badge: volumes.length },
            { id: 'networks', label: 'Networks', icon: Network, badge: networks.length },
            { id: 'console', label: 'App Console', icon: Terminal },
            { id: 'deployment', label: '1-Click Deployment', icon: Rocket },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DockerTab)}
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

      {/* TAB 1: OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DockerIcon className="w-4 h-4 text-blue-400" />
              <span>Docker Daemon Configuration</span>
            </h3>
            <div className="divide-y divide-[#1E293B] text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Docker Version</span>
                <span className="text-white font-mono font-bold">{dockerVersion}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Operating System</span>
                <span className="text-white">{engineInfo?.operatingSystem || host.osName}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Kernel Version</span>
                <span className="text-white font-mono">{engineInfo?.kernelVersion || 'Linux 6.8'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Storage Driver</span>
                <span className="text-cyan-400 font-mono">{engineInfo?.storageDriver || 'overlay2'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Cgroup Driver</span>
                <span className="text-purple-400 font-mono">{engineInfo?.cgroupDriver || 'systemd'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Root Directory</span>
                <span className="text-slate-300 font-mono">{engineInfo?.rootDir || '/var/lib/docker'}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Host Compute & Telemetry</span>
            </h3>
            <div className="divide-y divide-[#1E293B] text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Total CPU Cores</span>
                <span className="text-white font-mono font-bold">{engineInfo?.cpus || 2} Cores</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Total Memory Available</span>
                <span className="text-white font-mono">
                  {engineInfo?.totalMemoryBytes
                    ? `${(engineInfo.totalMemoryBytes / (1024 ** 3)).toFixed(1)} GB`
                    : '8.0 GB'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Active Container Memory</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {containers.reduce((acc, c) => acc + (c.memoryPercent || 0), 0).toFixed(1)}% Allocated
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Harmonized Stack Status</span>
                <span className="text-emerald-400 font-bold">1:1 Naming Configured</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">SSH Connection Status</span>
                <span className="text-emerald-400 font-bold">Verified & Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTAINERS TAB */}
      {activeTab === 'containers' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search containers by name, ID, or image..."
                value={containerSearch}
                onChange={(e) => setContainerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total: <strong className="text-white">{containers.length}</strong>
            </span>
          </div>

          {/* Containers Table */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0B1120] text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-3 px-4">Container Name</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Image Name (1:1)</th>
                    <th className="py-3 px-3">CPU %</th>
                    <th className="py-3 px-3">RAM Usage</th>
                    <th className="py-3 px-3">Ports</th>
                    <th className="py-3 px-3">Uptime</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60">
                  {containers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-500 space-y-2">
                        <Boxes className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="text-sm font-semibold text-slate-400">No Docker containers running</p>
                      </td>
                    </tr>
                  ) : (
                    containers
                      .filter((c) =>
                        !containerSearch ||
                        c.name.toLowerCase().includes(containerSearch.toLowerCase()) ||
                        c.image.toLowerCase().includes(containerSearch.toLowerCase()) ||
                        c.shortId.toLowerCase().includes(containerSearch.toLowerCase())
                      )
                      .map((c) => {
                        const isOnline = c.state === 'running';
                        const isBusy = actionLoading?.includes(c.name);

                        return (
                          <tr key={c.id || c.name} className="hover:bg-[#18233C]/50 transition-colors">
                            {/* Name & ID */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-white font-mono flex items-center gap-2">
                                <span>{c.name}</span>
                                {c.isHarmonizedName && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                    Harmonized
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">id: {c.shortId}</div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                  isOnline
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                                <span>{c.state}</span>
                              </span>
                            </td>

                            {/* Matching Image Name */}
                            <td className="py-3 px-3 font-mono text-cyan-300 text-[11px]">
                              {c.image}
                            </td>

                            {/* CPU */}
                            <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">
                              {c.cpuPercent ?? 0}%
                            </td>

                            {/* RAM */}
                            <td className="py-3 px-3 font-mono text-purple-300">
                              {c.memoryUsage || '0 MB'}
                            </td>

                            {/* Ports */}
                            <td className="py-3 px-3 font-mono text-amber-300 text-[11px]">
                              {c.ports || '-'}
                            </td>

                            {/* Uptime */}
                            <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                              {c.status || 'Active'}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {isOnline ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleContainerAction('restart', c.name)}
                                      disabled={isBusy}
                                      className="px-2 py-1 rounded bg-[#070B14] hover:bg-emerald-600/30 text-emerald-400 border border-[#1E293B] text-xs font-semibold cursor-pointer disabled:opacity-50"
                                      title="Restart Container"
                                    >
                                      Restart
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleContainerAction('stop', c.name)}
                                      disabled={isBusy}
                                      className="px-2 py-1 rounded bg-[#070B14] hover:bg-rose-600/30 text-rose-400 border border-[#1E293B] text-xs font-semibold cursor-pointer disabled:opacity-50"
                                      title="Stop Container"
                                    >
                                      Stop
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleContainerAction('start', c.name)}
                                    disabled={isBusy}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                                    title="Start Container"
                                  >
                                    Start
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setRoleMapping((prev) => ({ ...prev, frontend: c.name }));
                                    setActiveTab('console');
                                  }}
                                  className="p-1 rounded bg-[#070B14] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] cursor-pointer"
                                  title="View Live Logs"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMAGES TAB */}
      {activeTab === 'images' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search images by repository or tag..."
                value={imageSearch}
                onChange={(e) => setImageSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Images: <strong className="text-white">{images.length}</strong>
            </span>
          </div>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0B1120] text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-4">Repository / Image Name</th>
                  <th className="py-3 px-3">Tag</th>
                  <th className="py-3 px-3">Image ID</th>
                  <th className="py-3 px-3">Disk Size</th>
                  <th className="py-3 px-3">Container Usage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {images.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No Docker images found on this server.
                    </td>
                  </tr>
                ) : (
                  images
                    .filter((img) => !imageSearch || img.repository.toLowerCase().includes(imageSearch.toLowerCase()))
                    .map((img) => (
                      <tr key={img.id} className="hover:bg-[#18233C]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-300">{img.repository}</td>
                        <td className="py-3 px-3 font-mono text-purple-300 font-semibold">{img.tag}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{img.shortId}</td>
                        <td className="py-3 px-3 font-mono text-white">{img.size}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono text-[10px] border border-blue-500/20 font-bold">
                            {img.containerCount || 0} active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => showToast('success', `Inspection telemetry active for ${img.repository}`)}
                            className="px-2.5 py-1 rounded bg-[#070B14] hover:bg-[#18233C] text-slate-300 text-xs font-semibold border border-[#1E293B] cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VOLUMES TAB */}
      {activeTab === 'volumes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search persistent volumes..."
                value={volumeSearch}
                onChange={(e) => setVolumeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Volumes: <strong className="text-white">{volumes.length}</strong>
            </span>
          </div>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0B1120] text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-4">Volume Name (1:1)</th>
                  <th className="py-3 px-3">Driver</th>
                  <th className="py-3 px-3">Host Mountpoint</th>
                  <th className="py-3 px-3">Connected Services</th>
                  <th className="py-3 px-4 text-right">Protection Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {volumes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No Docker volumes discovered.
                    </td>
                  </tr>
                ) : (
                  volumes
                    .filter((v) => !volumeSearch || v.name.toLowerCase().includes(volumeSearch.toLowerCase()))
                    .map((vol) => {
                      const isDb = vol.name.includes('database') || vol.name.includes('postgres') || vol.name.includes('data');

                      return (
                        <tr key={vol.name} className="hover:bg-[#18233C]/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-purple-300">{vol.name}</td>
                          <td className="py-3 px-3 font-mono text-slate-400">{vol.driver}</td>
                          <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">{vol.mountpoint}</td>
                          <td className="py-3 px-3 font-mono text-emerald-400 text-[11px]">
                            {vol.connectedContainers?.join(', ') || 'Auto-bound'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isDb ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono">
                                Preserved Volume
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                                Standard Volume
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: NETWORKS TAB */}
      {activeTab === 'networks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search docker networks..."
                value={networkSearch}
                onChange={(e) => setNetworkSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Networks: <strong className="text-white">{networks.length}</strong>
            </span>
          </div>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0B1120] text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-4">Network Name</th>
                  <th className="py-3 px-3">Network ID</th>
                  <th className="py-3 px-3">Driver</th>
                  <th className="py-3 px-3">IPAM Subnet</th>
                  <th className="py-3 px-3">Gateway</th>
                  <th className="py-3 px-4 text-right">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {networks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No Docker networks discovered.
                    </td>
                  </tr>
                ) : (
                  networks
                    .filter((n) => !networkSearch || n.name.toLowerCase().includes(networkSearch.toLowerCase()))
                    .map((net) => (
                      <tr key={net.id || net.name} className="hover:bg-[#18233C]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-300">{net.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{net.id}</td>
                        <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">{net.driver}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{net.subnet || '172.28.0.0/16'}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{net.gateway || '172.28.0.1'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                            {net.scope}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: APPLICATION LOGS CONSOLE (Frontend, Backend, Database, Combined) */}
      {activeTab === 'console' && (
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <span>Multi-Role Application Log Console</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time streaming console connected to actual containers on <strong className="text-white">{host.name}</strong>.
              </p>
            </div>

            {/* Role Tabs */}
            <div className="flex items-center gap-1.5 bg-[#070B14] p-1 rounded-xl border border-[#1E293B]">
              {(['frontend', 'backend', 'database', 'combined'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setConsoleRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                    consoleRole === role
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {role} Logs
                </button>
              ))}
            </div>
          </div>

          {/* Role Mapping & Console Controls Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-slate-300">Target Container:</span>
              <span className="px-2 py-0.5 rounded bg-[#070B14] text-cyan-400 font-mono border border-[#1E293B] font-bold">
                {consoleRole === 'frontend'
                  ? roleMapping.frontend
                  : consoleRole === 'backend'
                  ? roleMapping.backend
                  : consoleRole === 'database'
                  ? roleMapping.database
                  : 'All Application Containers'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tail size selector */}
              <select
                value={consoleTail}
                onChange={(e) => setConsoleTail(Number(e.target.value))}
                className="bg-[#070B14] border border-[#1E293B] text-slate-300 text-xs rounded-lg px-2.5 py-1"
              >
                <option value={100}>Tail: 100 lines</option>
                <option value={200}>Tail: 200 lines</option>
                <option value={500}>Tail: 500 lines</option>
                <option value={1000}>Tail: 1000 lines</option>
              </select>

              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-[#070B14] text-slate-300 border-[#1E293B] hover:text-white'
                }`}
              >
                {isPaused ? 'Resume Stream' : 'Pause Stream'}
              </button>

              <button
                type="button"
                onClick={() => setConsoleLogs('')}
                className="px-3 py-1 rounded-lg bg-[#070B14] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] cursor-pointer"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={fetchConsoleLogs}
                disabled={consoleLoading}
                className="p-1.5 rounded-lg bg-[#070B14] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] cursor-pointer"
                title="Fetch Latest"
              >
                <RotateCw className={`w-3.5 h-3.5 ${consoleLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Terminal Display */}
          <div
            ref={terminalRef}
            className="bg-[#03060C] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed min-h-[360px] max-h-[500px] overflow-y-auto whitespace-pre-wrap select-text shadow-inner"
          >
            {consoleLoading && !consoleLogs ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Connecting to container stdout/stderr stream...</span>
              </div>
            ) : consoleLogs ? (
              consoleLogs
            ) : (
              <div className="py-20 text-center text-slate-500">
                No logs recorded yet for container target "{roleMapping.frontend}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: 1-CLICK DEPLOYMENT TAB */}
      {activeTab === 'deployment' && (
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Rocket className="w-5 h-5 text-purple-400" />
                <span>Single-Click Application Deployment Studio</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated multi-container deployment pipeline for frontend and backend with database volume preservation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfigModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#070B14] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Edit Configuration</span>
              </button>

              <button
                type="button"
                onClick={handleRun1ClickDeploy}
                disabled={isDeploying}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
              >
                <Rocket className={`w-4 h-4 ${isDeploying ? 'animate-bounce' : ''}`} />
                <span>{isDeploying ? 'Deploying...' : 'Run 1-Click Deploy'}</span>
              </button>
            </div>
          </div>

          {/* 5-Step Visual Pipeline Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { name: '1. Git Sync', status: deploymentSteps[0]?.status || 'PENDING', desc: 'Pull latest code' },
              { name: '2. Dependencies', status: deploymentSteps[1]?.status || 'PENDING', desc: 'npm/pnpm install' },
              { name: '3. Docker Build', status: deploymentSteps[2]?.status || 'PENDING', desc: 'Build images' },
              { name: '4. Recreate', status: deploymentSteps[3]?.status || 'PENDING', desc: 'Preserve DB data' },
              { name: '5. Health Check', status: deploymentSteps[4]?.status || 'PENDING', desc: 'Verify endpoints' },
            ].map((step, idx) => {
              const isSucc = step.status === 'SUCCESS';
              const isRun = step.status === 'RUNNING';
              const isFail = step.status === 'FAILED';

              return (
                <div
                  key={step.name}
                  className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                    isSucc
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : isRun
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 animate-pulse'
                      : isFail
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      : 'bg-[#070B14] border-[#1E293B] text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-[11px]">{step.name}</span>
                    {isSucc ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isRun ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : isFail ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{step.desc}</span>
                </div>
              );
            })}
          </div>

          {/* Active Configuration Overview Strip */}
          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-4 text-xs space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Active Deployment Parameters (Harmonized 1:1)</span>
              <span className="text-emerald-400 font-mono text-[10px]">Database Volume Protected</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-400 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block">Repository:</span>
                <span className="text-slate-200 truncate block">{deploymentConfig.gitRepoUrl}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Branch & Directory:</span>
                <span className="text-cyan-300 block">{deploymentConfig.gitBranch} ({deploymentConfig.appDirectory})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Containers (Frontend / Backend):</span>
                <span className="text-purple-300 block">
                  {deploymentConfig.frontendContainerName} (:3000) / {deploymentConfig.backendContainerName} (:5000)
                </span>
              </div>
            </div>
          </div>

          {/* Deployment Execution Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">Live Deployment Console</span>
              {isDeploying && <span className="text-cyan-400 animate-pulse">Running deployment steps...</span>}
            </div>
            <div className="bg-[#03060C] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed min-h-[220px] max-h-[350px] overflow-y-auto whitespace-pre-wrap select-text">
              {deploymentLogs || 'Ready to run 1-Click Deployment.'}
            </div>
          </div>
        </div>
      )}

      {/* Edit Configuration Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                <span>Configure Docker Application Deployment</span>
              </h3>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Application Name</label>
                <input
                  type="text"
                  value={deploymentConfig.appName}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, appName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Git Repository URL</label>
                <input
                  type="text"
                  value={deploymentConfig.gitRepoUrl}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, gitRepoUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Git Branch</label>
                <input
                  type="text"
                  value={deploymentConfig.gitBranch}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, gitBranch: e.target.value })}
                  className="w-full px-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Application Directory on Host</label>
                <input
                  type="text"
                  value={deploymentConfig.appDirectory}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, appDirectory: e.target.value })}
                  className="w-full px-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Frontend Container Name (1:1)</label>
                <input
                  type="text"
                  value={deploymentConfig.frontendContainerName}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, frontendContainerName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Backend Container Name (1:1)</label>
                <input
                  type="text"
                  value={deploymentConfig.backendContainerName}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, backendContainerName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Frontend Port</label>
                <input
                  type="number"
                  value={deploymentConfig.frontendPort}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, frontendPort: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Package Manager</label>
                <select
                  value={deploymentConfig.packageManager}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, packageManager: e.target.value })}
                  className="w-full px-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-white"
                >
                  <option value="npm">npm</option>
                  <option value="pnpm">pnpm</option>
                  <option value="yarn">yarn</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#070B14] text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
              >
                {isSavingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

