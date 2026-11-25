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
  Sparkles,
  Palette,
  ChevronDown,
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
import { useTheme } from '@/context/ThemeContext';
import { ModuleCustomizeButton } from '@/components/dashboard/style-studio/ModuleCustomizeButton';

export type PipelineTab = 'integrated' | 'jenkins' | 'sonarqube' | 'trivy';

export type DevopsModelId = 1 | 2 | 3 | 4 | 5 | 6;

export interface IDevopsModelMeta {
  id: DevopsModelId;
  name: string;
  tagline: string;
  archetype: string;
  accentColor: string;
  badge: string;
  layers: string[];
}

export const DEVOPS_MODELS: Record<DevopsModelId, IDevopsModelMeta> = {
  1: {
    id: 1,
    name: 'Pipeline Stage Rail',
    tagline: 'Sequential DevSecOps Flow with checkgates',
    archetype: 'Linear Rail & Checkgate',
    accentColor: '#06B6D4',
    badge: 'MODEL 01',
    layers: ['Layer 1: CI/CD Build Engine', 'Layer 2: Sonar Quality Gate', 'Layer 3: Security CVE Shield'],
  },
  2: {
    id: 2,
    name: '3D Layer Stack & Deck',
    tagline: 'Isometric stacked planes with depth tilt',
    archetype: '3D Exploded Depth Deck',
    accentColor: '#A855F7',
    badge: 'MODEL 02',
    layers: ['Layer 01: Orchestration (Base)', 'Layer 02: Quality Gate (Middle)', 'Layer 03: Security Shield (Top)'],
  },
  3: {
    id: 3,
    name: 'DevOps Fleet Matrix',
    tagline: 'Dual-axis server grid & cross-tool table',
    archetype: 'Multi-Cloud Operational Matrix',
    accentColor: '#10B981',
    badge: 'MODEL 03',
    layers: ['Server Fleet Y-Axis', 'Cross-Tool Telemetry X-Axis', 'Direct Terminal & Pipeline Trigger Layer'],
  },
  4: {
    id: 4,
    name: 'Cyberpunk Cockpit',
    tagline: 'Tri-Circular Radar HUD & real-time telemetry',
    archetype: 'Autonomous Cyber Telemetry',
    accentColor: '#F43F5E',
    badge: 'MODEL 04',
    layers: ['Tri-Circular Metric Radar', 'Live SSH Console Stream', 'Vulnerability & Quality Smells Audit'],
  },
  5: {
    id: 5,
    name: 'Glassmorphic Bento Grid',
    tagline: 'Apple-inspired modular interconnected cards',
    archetype: 'Modular Glass Bento',
    accentColor: '#3B82F6',
    badge: 'MODEL 05',
    layers: ['Hero DevSecOps Telemetry', 'Target Server Selector', 'Tri-Tool Command Control Tiles'],
  },
  6: {
    id: 6,
    name: 'Radial Security Wheel',
    tagline: 'Orbital 120° pillars around central cloud core',
    archetype: 'Orbital Tri-Pillar Hub',
    accentColor: '#14B8A6',
    badge: 'MODEL 06',
    layers: ['Central Host Fleet Core', 'Tri-Orbital Tool Pillars', 'Cross-Pillar Synced Security Rims'],
  },
};

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
  const initialTab = (searchParams.get('tab') as PipelineTab) || 'integrated';
  const { openModuleCustomizer, getModuleStyle, updateModuleStyle } = useTheme();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PipelineTab>(initialTab);
  const [selectedModel, setSelectedModel] = useState<DevopsModelId>(1);
  const [showModelPickerModal, setShowModelPickerModal] = useState<boolean>(false);
  const [modelPickerTab, setModelPickerTab] = useState<'models' | 'layers'>('models');
  const [modelPickerToast, setModelPickerToast] = useState<string | null>(null);
  const [previewDepth, setPreviewDepth] = useState<number>(25);
  const [previewTilt, setPreviewTilt] = useState<number>(10);
  const [previewGlow, setPreviewGlow] = useState<string>('#06B6D4');
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

  // Trivy host server images
  const [serverImages, setServerImages] = useState<
    Record<string, Array<{ fullTag: string; repository: string; tag: string; size: string; id: string }>>
  >({});
  const [loadingImagesServer, setLoadingImagesServer] = useState<string | null>(null);

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
    integrated: null,
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
    integrated: '',
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

  useEffect(() => {
    const tabParam = searchParams.get('tab') as PipelineTab;
    if (tabParam && ['integrated', 'jenkins', 'sonarqube', 'trivy'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab('integrated');
    }
  }, [searchParams]);

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
        (['integrated', 'jenkins', 'sonarqube', 'trivy'] as PipelineTab[]).forEach((t) => {
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

  const fetchServerImages = useCallback(async (serverId: string) => {
    if (!serverId) return;
    setLoadingImagesServer(serverId);
    try {
      const res = await fetch(`/api/trivy/servers/${serverId}/images`);
      const data = await res.json();
      if (data.success && Array.isArray(data.images)) {
        setServerImages((prev) => ({ ...prev, [serverId]: data.images }));
        if (data.images.length > 0) {
          setTrivyTarget((current) => {
            if (current === 'nginx:alpine' || !current) {
              return data.images[0].fullTag;
            }
            return current;
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch server images:', err);
    } finally {
      setLoadingImagesServer(null);
    }
  }, []);

  useEffect(() => {
    if (trivyScanOpen && trivyScanServer) {
      fetchServerImages(trivyScanServer);
    }
  }, [trivyScanOpen, trivyScanServer, fetchServerImages]);

  useEffect(() => {
    if (activeTab === 'trivy') {
      const targetId = tabTargetServer.trivy || servers[0]?.id;
      if (targetId && !serverImages[targetId]) {
        fetchServerImages(targetId);
      }
    }
  }, [activeTab, tabTargetServer.trivy, servers, serverImages, fetchServerImages]);

  const openEditCommands = (tool: PipelineTab) => {
    const validTool = tool === 'integrated' ? 'jenkins' : tool;
    setEditTool(validTool);
    const cfg = toolConfigs[validTool];
    const def = DEFAULT_DEVOPS_COMMANDS[validTool];
    setEditorInstallCmds(cfg?.installCommands || def?.installCommands || '');
    setEditorUninstallCmds(cfg?.uninstallCommands || def?.uninstallCommands || '');
    setEditorVerifyCmds(cfg?.verificationCommands || def?.verificationCommands || '');
    setEditorServiceName(cfg?.serviceName || def?.serviceName || '');
    setEditorPort(cfg?.port || def?.port || (validTool === 'jenkins' ? 8080 : validTool === 'sonarqube' ? 9000 : 0));
    setEditorHealthCheck(cfg?.healthCheckCommand || def?.healthCheckCommand || '');
    const defaultServer = tabTargetServer[validTool] || servers[0]?.id || '';
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
          <div
            data-module-id={activeTab}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D1526] border border-[#1E293B] rounded-2xl p-6 shadow-xl relative z-50 overflow-visible transition-all"
          >
            <div className="flex items-center gap-4 module-header">
              <div
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner transition-all module-icon ${
                  activeTab === 'integrated'
                    ? 'bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-cyan-500/25 border-cyan-500/50 shadow-cyan-500/20'
                    : activeTab === 'jenkins'
                    ? 'bg-gradient-to-br from-red-500/20 via-rose-500/10 to-red-600/20 border-red-500/40'
                    : activeTab === 'sonarqube'
                    ? 'bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-cyan-600/20 border-cyan-500/40'
                    : 'bg-gradient-to-br from-teal-500/20 via-emerald-500/10 to-teal-600/20 border-teal-500/40'
                }`}
              >
                {activeTab === 'integrated' && <Sparkles className="w-8 h-8 text-cyan-300 animate-pulse" />}
                {activeTab === 'jenkins' && <JenkinsLogo className="w-8 h-8" />}
                {activeTab === 'sonarqube' && <SonarQubeLogo className="w-8 h-8" />}
                {activeTab === 'trivy' && <TrivyLogo className="w-8 h-8" />}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-white tracking-tight module-heading">
                    DevSecops CI/CD Pipeline (Jenkins + SonarQube + Trivy)
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider">
                    CI/CD Automation
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                    SonarQube Quality
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                    Aqua Trivy Security
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  <span className="font-bold text-cyan-300 font-mono">{DEVOPS_MODELS[selectedModel]?.badge}: {DEVOPS_MODELS[selectedModel]?.name}</span> &bull; {DEVOPS_MODELS[selectedModel]?.tagline}. Unified DevOps orchestration for Jenkins CI/CD, SonarQube quality gates, and Aqua Trivy security.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap relative z-50">
              <ModuleCustomizeButton
                moduleId={activeTab}
                moduleName={
                  activeTab === 'integrated'
                    ? 'DevSecops CI/CD Pipeline'
                    : activeTab === 'jenkins'
                    ? 'Jenkins CI/CD Module'
                    : activeTab === 'sonarqube'
                    ? 'SonarQube Quality Module'
                    : 'Trivy Security Module'
                }
                variant="dropdown"
                label="3D Anime, Design & Layer"
                onOpenModelPicker={() => setShowModelPickerModal(true)}
              />

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

          {/* DevSecOps 3-in-1 Combined Suite Control Bar with Model Switcher */}
          <div className="flex flex-col gap-3 bg-[#0D1526] border border-[#1E293B] rounded-2xl p-3 shadow-lg relative z-20">
            {/* Row 1: Model Switcher & Architecture Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold shrink-0 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Select Model:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {([1, 2, 3, 4, 5, 6] as DevopsModelId[]).map((mId) => {
                    const m = DEVOPS_MODELS[mId];
                    const isCur = selectedModel === mId;
                    return (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => setSelectedModel(mId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          isCur
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400 ring-2 ring-cyan-400/30'
                            : 'bg-[#111A2E] text-slate-300 hover:text-white hover:bg-[#18233C] border border-slate-800'
                        }`}
                        title={`${m.name} - ${m.tagline}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isCur ? 'bg-cyan-300 animate-ping' : 'bg-slate-600'}`} />
                        <span>M0{mId}: {m.name}</span>
                        {isCur && <span className="text-[9px] bg-white/20 px-1 rounded text-white font-sans">Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModelPickerModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/40 via-cyan-600/40 to-blue-600/40 hover:from-purple-600/60 hover:to-blue-600/60 text-white border border-cyan-400/50 text-xs font-bold transition shadow-lg shadow-cyan-500/20 cursor-pointer"
                  title="Open 6-Model & 3D Layer Architecture Visual Showcase"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>📐 Models, Design & Layers Studio</span>
                </button>
              </div>
            </div>

            {/* Row 2: Active Model Summary & Tri-Tool Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#070B14] border border-cyan-500/30 text-xs">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Active Design:</span>
                  <span className="text-white font-bold">{DEVOPS_MODELS[selectedModel].name}</span>
                  <span className="text-[10px] font-mono text-cyan-300">({DEVOPS_MODELS[selectedModel].archetype})</span>
                </div>

                {/* Combined Tri-Tool Status Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111A2E] border border-red-500/30">
                    <JenkinsLogo className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-mono text-red-300 font-bold">
                      {jenkinsInstalledCount} Inst • {jenkinsRunningCount} Run
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111A2E] border border-cyan-500/30">
                    <SonarQubeLogo className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-mono text-cyan-300 font-bold">
                      {sonarInstalledCount} Inst • {sonarRunningCount} Run
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111A2E] border border-teal-500/30">
                    <TrivyLogo className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-mono text-teal-300 font-bold">
                      {trivyInstalledCount} Installed
                    </span>
                  </div>
                </div>
              </div>

              {/* Customize DevSecops CI/CD Pipeline Button */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() =>
                    openModuleCustomizer(
                      'integrated',
                      'DevSecops CI/CD Pipeline'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition cursor-pointer"
                  title="Customize DevSecops CI/CD Pipeline styling & 3D layers"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Customize 3D Style & Layers</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* DYNAMIC MODEL RENDERER (MODELS 1 THROUGH 6)               */}
          {/* ========================================================= */}
          {activeTab === 'integrated' && (
            <div className="space-y-6 relative z-10">
              {/* ======================================================= */}
              {/* MODEL 1: PIPELINE STAGE PROGRESSION RAIL                */}
              {/* ======================================================= */}
              {selectedModel === 1 && (
                <div className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-sm flex items-center justify-center border border-cyan-500/30">
                        01
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>Model 1: Unified DevSecOps Pipeline Stage Rail</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Sequential Flow
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400">
                          Automated multi-stage delivery pipeline: Build & Test &rarr; Quality Gate &rarr; Security CVE Shield with live checkgates.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openTerminal(servers.find((s) => s.id === tabTargetServer.integrated) || servers[0])}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>SSH Terminal</span>
                      </button>
                    </div>
                  </div>

                  {/* Stage Rail Canvas */}
                  <div className="bg-[#070C18] border border-slate-800/80 rounded-2xl p-6 relative">
                    {/* Connecting Flow Line */}
                    <div className="hidden md:block absolute top-1/2 left-16 right-16 h-1 bg-gradient-to-r from-red-500 via-cyan-500 to-teal-400 -translate-y-6 opacity-30 z-0" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                      {/* Stage 1: Jenkins */}
                      <div
                        data-module-id="jenkins"
                        className="bg-[#0D1526]/90 border border-red-500/40 rounded-2xl p-5 shadow-xl space-y-3 relative group hover:border-red-400 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center font-bold text-lg">
                              👨‍✈️
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-white">STAGE 1: BUILD & TEST</h3>
                              <div className="text-[10px] text-red-400 font-mono font-semibold">Jenkins CI/CD Engine</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {jenkinsRunningCount > 0 ? 'ACTIVE' : 'CHECKGATE'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px] font-mono bg-[#070B14] p-3 rounded-xl border border-slate-800">
                          <div className="flex justify-between text-slate-300">
                            <span>Service Port:</span>
                            <span className="text-cyan-400 font-bold">8080 (Listening)</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Active Nodes:</span>
                            <span className="text-white font-bold">{jenkinsInstalledCount} Installed ({jenkinsRunningCount} Run)</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Unit Tests:</span>
                            <span className="text-emerald-400 font-bold">100% Passed</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Target Node:</span>
                            <span className="text-slate-200">{servers.find((s) => s.id === tabTargetServer.integrated)?.name || 'azure'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800">
                          <span className="text-slate-400">Duration: 1m 24s</span>
                          <button
                            type="button"
                            onClick={() => openEditCommands('jenkins')}
                            className="text-red-400 font-bold hover:underline cursor-pointer"
                          >
                            Edit Commands &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Stage 2: SonarQube */}
                      <div
                        data-module-id="sonarqube"
                        className="bg-[#0D1526]/90 border border-cyan-500/40 rounded-2xl p-5 shadow-xl space-y-3 relative group hover:border-cyan-400 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-lg">
                              🔍
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-white">STAGE 2: QUALITY GATE</h3>
                              <div className="text-[10px] text-cyan-400 font-mono font-semibold">SonarQube Static Analysis</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            PASSED (A)
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px] font-mono bg-[#070B14] p-3 rounded-xl border border-slate-800">
                          <div className="flex justify-between text-slate-300">
                            <span>Code Coverage:</span>
                            <span className="text-cyan-400 font-bold">89.4%</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Bugs & Smells:</span>
                            <span className="text-emerald-400">0 Bugs • 2 Minor</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Security Rating:</span>
                            <span className="text-emerald-300 font-bold">Grade A (0 Hotspots)</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Service Port:</span>
                            <span className="text-cyan-400">9000 (Community)</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800">
                          <span className="text-slate-400">Tech Debt: 15 mins</span>
                          <button
                            type="button"
                            onClick={() => openEditCommands('sonarqube')}
                            className="text-cyan-400 font-bold hover:underline cursor-pointer"
                          >
                            Edit Commands &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Stage 3: Trivy */}
                      <div
                        data-module-id="trivy"
                        className="bg-[#0D1526]/90 border border-teal-500/40 rounded-2xl p-5 shadow-xl space-y-3 relative group hover:border-teal-400 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold text-lg">
                              🛡️
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-white">STAGE 3: SECURITY SHIELD</h3>
                              <div className="text-[10px] text-teal-400 font-mono font-semibold">Trivy Vulnerability Engine</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                            SECURE
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px] font-mono bg-[#070B14] p-3 rounded-xl border border-slate-800">
                          <div className="flex justify-between text-slate-300">
                            <span>Target Image:</span>
                            <span className="text-teal-300 font-bold">{trivyTarget || 'nginx:alpine'}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Critical CVEs:</span>
                            <span className="text-emerald-400 font-bold">0 Found (Clean)</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>High / Medium:</span>
                            <span className="text-amber-300 font-bold">0 High • 1 Med</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Host Scanner:</span>
                            <span className="text-slate-300">{trivyInstalledCount > 0 ? 'Active' : 'Ready'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800">
                          <span className="text-slate-400">Scanned recently</span>
                          <button
                            type="button"
                            onClick={() => {
                              const curId = tabTargetServer.integrated || servers[0]?.id;
                              if (curId) setTrivyScanServer(curId);
                              setTrivyScanOpen(true);
                            }}
                            className="text-teal-400 font-bold hover:underline cursor-pointer"
                          >
                            Run Scan &rarr;
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Operational Node Bar */}
                    <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-300 font-semibold">Active Fleet Target:</span>
                        <select
                          value={tabTargetServer.integrated || ''}
                          onChange={(e) =>
                            setTabTargetServer((prev) => ({ ...prev, integrated: e.target.value }))
                          }
                          className="bg-[#111A2E] border border-slate-700 font-mono text-cyan-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                        >
                          {servers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.publicIp || s.host})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const curId = tabTargetServer.integrated || servers[0]?.id;
                            if (curId) setJenkinsInstallServer(curId);
                            setJenkinsInstallOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700 transition cursor-pointer"
                        >
                          Deploy Pipeline
                        </button>
                        <button
                          type="button"
                          onClick={() => fetchServers(true)}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold transition shadow-md shadow-cyan-600/20 cursor-pointer"
                        >
                          Sync & Trigger All 3 Stages
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3-Layer Breakdown Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-[#070C18] p-4 rounded-xl border border-red-500/30 space-y-1">
                      <div className="font-bold text-red-400 font-mono">LAYER 1: AUTOMATION ENGINE</div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Continuous Integration runner managing Git webhooks, artifact compilation, and SSH worker daemon on port 8080.
                      </p>
                    </div>
                    <div className="bg-[#070C18] p-4 rounded-xl border border-cyan-500/30 space-y-1">
                      <div className="font-bold text-cyan-400 font-mono">LAYER 2: CODE QUALITY GATE</div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Static code analysis, code smell detection, and security rating enforcement before packaging on port 9000.
                      </p>
                    </div>
                    <div className="bg-[#070C18] p-4 rounded-xl border border-teal-500/30 space-y-1">
                      <div className="font-bold text-teal-400 font-mono">LAYER 3: SECURITY & CVE SHIELD</div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Comprehensive vulnerability scanner analyzing container images and host filesystems against official CVE databases.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* MODEL 2: 3D EXPLODED LAYER STACK & DECK                 */}
              {/* ======================================================= */}
              {selectedModel === 2 && (
                <div className="bg-[#0B1120] border-2 border-purple-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 font-black text-sm flex items-center justify-center border border-purple-500/30">
                        02
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>Model 2: 3D Exploded Layer Stack & Deck</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Isometric Depth
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400">
                          Vertical isometric stacked planes with layer depth control, tilt physics, and isolated operational scoping.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070C18] border border-slate-800/80 rounded-2xl p-8 relative flex flex-col items-center justify-center min-h-[380px]">
                    <div className="w-full max-w-2xl space-y-4">
                      {/* Top Plane: Trivy Security Shield */}
                      <div
                        data-module-id="trivy"
                        className="bg-[#0D1526]/90 border border-teal-500/50 p-4 rounded-xl shadow-xl transform hover:-translate-y-2 transition-all duration-300 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                              LAYER 03 • TOP SHIELD
                            </span>
                            <span className="text-xs font-bold text-white">Aqua Trivy Container Security Shield</span>
                          </div>
                          <span className="text-xs font-mono text-teal-400 font-bold">0 Critical CVEs</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>CVE Database: Synced • Inspecting local container images</span>
                          <span className="text-teal-300 font-mono font-semibold">Depth: +40px (Top)</span>
                        </div>
                      </div>

                      {/* Middle Plane: SonarQube Quality Gate */}
                      <div
                        data-module-id="sonarqube"
                        className="bg-[#0D1526]/90 border border-cyan-500/50 p-4 rounded-xl shadow-xl transform hover:-translate-y-2 transition-all duration-300 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              LAYER 02 • MIDDLE GATE
                            </span>
                            <span className="text-xs font-bold text-white">SonarQube Static Analysis & Quality Gate</span>
                          </div>
                          <span className="text-xs font-mono text-cyan-400 font-bold">Grade A (Passed)</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>Coverage 89% • 0 Security Hotspots • Port 9000 Community</span>
                          <span className="text-cyan-300 font-mono font-semibold">Depth: +20px (Middle)</span>
                        </div>
                      </div>

                      {/* Base Plane: Jenkins Automation Hub */}
                      <div
                        data-module-id="jenkins"
                        className="bg-[#0D1526]/90 border border-red-500/50 p-4 rounded-xl shadow-xl transform hover:-translate-y-2 transition-all duration-300 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                              LAYER 01 • BASE ORCHESTRATION
                            </span>
                            <span className="text-xs font-bold text-white">Jenkins CI/CD Automation & Build Nodes</span>
                          </div>
                          <span className="text-xs font-mono text-red-400 font-bold">Port 8080 Active</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>Pipeline triggers on push • Live SSH node execution</span>
                          <span className="text-red-300 font-mono font-semibold">Depth: 0px (Base Platform)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* MODEL 3: MULTI-CLOUD DEVOPS FLEET MATRIX                */}
              {/* ======================================================= */}
              {selectedModel === 3 && (
                <div className="bg-[#0B1120] border-2 border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-sm flex items-center justify-center border border-emerald-500/30">
                        03
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>Model 3: Multi-Cloud DevOps Fleet Matrix</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Dual-Axis Table
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400">
                          Dual-axis operational grid: Monitored Servers on Y-Axis &times; DevOps Suite Tools on X-Axis.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070C18] border border-slate-800/80 rounded-2xl overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#0B1222] border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3.5">Host Server</th>
                          <th className="p-3.5">Power</th>
                          <th className="p-3.5 text-red-400">Jenkins CI/CD</th>
                          <th className="p-3.5 text-cyan-400">SonarQube</th>
                          <th className="p-3.5 text-teal-400">Trivy Security</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {servers.map((s) => {
                          const isRun = (s.status || '').toLowerCase().includes('run') || (s.status || '').toLowerCase() === 'online';
                          return (
                            <tr key={s.id} className="hover:bg-[#0D1526] transition">
                              <td className="p-3.5 font-bold text-white flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isRun ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                                <span>{s.name}</span>
                                <span className="text-slate-400 text-[10px] font-normal font-mono">{s.publicIp || s.host}</span>
                              </td>
                              <td className="p-3.5">
                                <span className={`font-bold ${isRun ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isRun ? 'Online' : 'Stopped'}
                                </span>
                              </td>
                              <td className="p-3.5">
                                {s.jenkins?.detected ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    Running :8080
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Not Installed</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                {s.sonarqube?.detected ? (
                                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                    Active :9000
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Not Installed</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                {s.trivy?.detected ? (
                                  <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                                    Installed (Clean)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Not Installed</span>
                                )}
                              </td>
                              <td className="p-3.5 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => openTerminal(s)}
                                  className="px-2.5 py-1 rounded bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700 hover:text-white transition cursor-pointer"
                                >
                                  SSH
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* MODEL 4: CYBERPUNK AUTONOMOUS COCKPIT                   */}
              {/* ======================================================= */}
              {selectedModel === 4 && (
                <div className="bg-[#0B1120] border-2 border-rose-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 font-black text-sm flex items-center justify-center border border-rose-500/30">
                        04
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>Model 4: Cyberpunk Autonomous Cockpit</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            HUD Telemetry
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400">
                          Tri-Circular Radar HUD, live streaming SSH logs, and real-time security telemetry.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Console Stream */}
                    <div className="bg-[#070C18] border border-slate-800 rounded-xl p-4 font-mono text-[11px] space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400 font-bold">STREAM: DEVOPS SUITE</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <div className="text-emerald-400 space-y-1 h-44 overflow-y-auto">
                        <div>[jenkins@azure ~]$ systemctl status jenkins</div>
                        <div className="text-slate-400">● jenkins.service - Continuous Integration</div>
                        <div className="text-cyan-300">   Active: active (running) :8080</div>
                        <div>[trivy@azure ~]$ trivy image --severity CRITICAL nginx:alpine</div>
                        <div className="text-teal-300">Total: 0 (CRITICAL: 0, HIGH: 0)</div>
                        <div className="text-emerald-300">&gt; SUCCESS: DevSecOps threshold passed.</div>
                      </div>
                    </div>

                    {/* Center: Tri-Circular Gauge */}
                    <div className="bg-[#070C18] border border-cyan-500/30 rounded-xl p-4 flex flex-col items-center justify-center space-y-3">
                      <div className="text-xs font-bold text-slate-300">TRI-METRIC COMPOSITE RADAR</div>
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="72" cy="72" r="54" stroke="#1E293B" strokeWidth="8" fill="none" />
                          <circle cx="72" cy="72" r="54" stroke="#06B6D4" strokeWidth="8" strokeDasharray="339" strokeDashoffset="35" fill="none" strokeLinecap="round" />
                          <circle cx="72" cy="72" r="40" stroke="#10B981" strokeWidth="6" strokeDasharray="251" strokeDashoffset="15" fill="none" strokeLinecap="round" />
                          <circle cx="72" cy="72" r="28" stroke="#F43F5E" strokeWidth="5" strokeDasharray="175" strokeDashoffset="20" fill="none" strokeLinecap="round" />
                        </svg>
                        <div className="absolute text-center">
                          <div className="text-xl font-black text-white">98%</div>
                          <div className="text-[9px] font-mono text-cyan-400">COMPOSITE</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono">
                        <span className="text-red-400">● Build: 92%</span>
                        <span className="text-cyan-400">● Quality: 96%</span>
                        <span className="text-emerald-400">● Sec: 100%</span>
                      </div>
                    </div>

                    {/* Right: Security Audit */}
                    <div className="bg-[#070C18] border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-slate-300">SECURITY & QUALITY AUDIT</span>
                        <span className="text-teal-400 font-mono text-[10px]">Trivy + Sonar</span>
                      </div>
                      <div className="space-y-2 font-mono">
                        <div className="flex justify-between items-center p-2 rounded bg-[#0D1526]">
                          <span className="text-slate-400">Critical CVEs:</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">0 Clean</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#0D1526]">
                          <span className="text-slate-400">Code Coverage:</span>
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">89.4%</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#0D1526]">
                          <span className="text-slate-400">Code Smells:</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">2 Minor</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* MODEL 5: GLASSMORRHIC MODULAR BENTO GRID                */}
              {/* ======================================================= */}
              {selectedModel === 5 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Hero Bento Tile (8 cols) */}
                  <div className="lg:col-span-8 bg-[#0D1526]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
                          Model 5: DevSecOps Unified Orchestration
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        TRI-TOOL HEALTHY
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        Jenkins CI/CD • SonarQube Gate • Aqua Trivy Security
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Automated pipeline delivery, static code quality scanning, and container CVE vulnerability detection linked across your multi-cloud server fleet.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div
                        data-module-id="jenkins"
                        className="p-3 rounded-xl bg-[#070B14]/70 border border-red-500/30 space-y-1"
                      >
                        <div className="text-[11px] font-bold text-red-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><JenkinsLogo className="w-3.5 h-3.5" /> Jenkins CI/CD</span>
                          <span className="font-mono text-[10px] text-slate-400">Port 8080</span>
                        </div>
                        <div className="text-sm font-black text-white font-mono">
                          {jenkinsRunningCount} Running / {jenkinsInstalledCount} Inst
                        </div>
                      </div>

                      <div
                        data-module-id="sonarqube"
                        className="p-3 rounded-xl bg-[#070B14]/70 border border-cyan-500/30 space-y-1"
                      >
                        <div className="text-[11px] font-bold text-cyan-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><SonarQubeLogo className="w-3.5 h-3.5" /> SonarQube</span>
                          <span className="font-mono text-[10px] text-slate-400">Port 9000</span>
                        </div>
                        <div className="text-sm font-black text-white font-mono">
                          {sonarRunningCount} Running / {sonarInstalledCount} Inst
                        </div>
                      </div>

                      <div
                        data-module-id="trivy"
                        className="p-3 rounded-xl bg-[#070B14]/70 border border-teal-500/30 space-y-1"
                      >
                        <div className="text-[11px] font-bold text-teal-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><TrivyLogo className="w-3.5 h-3.5" /> Trivy Shield</span>
                          <span className="font-mono text-[10px] text-slate-400">CVE Engine</span>
                        </div>
                        <div className="text-sm font-black text-white font-mono">
                          {trivyInstalledCount} Installed Nodes
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Target Server Selector & SSH Bento Tile (4 cols) */}
                  <div className="lg:col-span-4 bg-[#0D1526]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                          Active Target Server Node
                        </span>
                        {(() => {
                          const curS = servers.find((s) => s.id === tabTargetServer.integrated);
                          if (!curS) return null;
                          const isSt = (curS.status || '').toLowerCase().includes('stop');
                          return (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isSt
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isSt ? 'STOPPED' : 'RUNNING'}
                            </span>
                          );
                        })()}
                      </div>

                      <select
                        value={tabTargetServer.integrated || ''}
                        onChange={(e) =>
                          setTabTargetServer((prev) => ({ ...prev, integrated: e.target.value }))
                        }
                        className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                      >
                        {servers.map((s) => {
                          const st = (s.status || '').toLowerCase();
                          const state = st.includes('stop') ? ' [STOPPED]' : ' [RUNNING]';
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.publicIp || s.host}){state}
                            </option>
                          );
                        })}
                      </select>

                      {(() => {
                        const curS = servers.find((s) => s.id === tabTargetServer.integrated);
                        if (!curS) return null;
                        return (
                          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1">
                            <span>Host: <strong className="text-cyan-300">{curS.publicIp || curS.host}</strong></span>
                            <span className="uppercase">{curS.cloudProvider} • {curS.region}</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const curS = servers.find((s) => s.id === tabTargetServer.integrated);
                          if (curS) openTerminal(curS);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-600/20 cursor-pointer"
                      >
                        <TerminalIcon className="w-3.5 h-3.5" />
                        <span>Open Remote SSH Terminal</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Quick Tool Command Hub Bento Tiles (12 cols, 4-4-4) */}
                  <div
                    data-module-id="jenkins"
                    className="lg:col-span-4 bg-[#0D1526]/85 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <JenkinsLogo className="w-5 h-5" />
                        <span className="text-xs font-bold text-white">Jenkins CI/CD Automation</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                        Port 8080
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Manage CI/CD build scripts, automated execution & pipeline nodes.
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const curId = tabTargetServer.integrated || servers[0]?.id;
                          if (curId) setJenkinsInstallServer(curId);
                          setJenkinsInstallOpen(true);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition text-center cursor-pointer"
                      >
                        Install / Setup
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCommands('jenkins')}
                        className="py-1.5 px-3 rounded-lg text-xs font-bold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700 transition cursor-pointer"
                      >
                        Commands
                      </button>
                    </div>
                  </div>

                  <div
                    data-module-id="sonarqube"
                    className="lg:col-span-4 bg-[#0D1526]/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SonarQubeLogo className="w-5 h-5" />
                        <span className="text-xs font-bold text-white">SonarQube Analysis Hub</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Port 9000
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Enforce code quality standards, detect security hotspots & smells.
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const curId = tabTargetServer.integrated || servers[0]?.id;
                          if (curId) setSonarInstallServer(curId);
                          setSonarInstallOpen(true);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition text-center cursor-pointer"
                      >
                        Install / Setup
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCommands('sonarqube')}
                        className="py-1.5 px-3 rounded-lg text-xs font-bold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700 transition cursor-pointer"
                      >
                        Commands
                      </button>
                    </div>
                  </div>

                  <div
                    data-module-id="trivy"
                    className="lg:col-span-4 bg-[#0D1526]/85 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-4 shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrivyLogo className="w-5 h-5" />
                        <span className="text-xs font-bold text-white">Trivy Vulnerability Scanner</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Host Images
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Scan Docker container images & filesystems for known CVE vulnerabilities.
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const curId = tabTargetServer.integrated || servers[0]?.id;
                          if (curId) setTrivyScanServer(curId);
                          setTrivyScanOpen(true);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 transition text-center cursor-pointer"
                      >
                        Scan Image
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCommands('trivy')}
                        className="py-1.5 px-3 rounded-lg text-xs font-bold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700 transition cursor-pointer"
                      >
                        Commands
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* MODEL 6: RADIAL DEVOPS SECURITY WHEEL                   */}
              {/* ======================================================= */}
              {selectedModel === 6 && (
                <div className="bg-[#0B1120] border-2 border-teal-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 font-black text-sm flex items-center justify-center border border-teal-500/30">
                        06
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>Model 6: Radial DevOps Security Wheel</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            Orbital Pillars
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400">
                          Central cloud fleet core with three 120-degree orbital operational pillars for CI/CD, Quality, and Security.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070C18] border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center relative min-h-[380px]">
                    <div className="relative w-80 h-80 flex items-center justify-center">
                      {/* Central Fleet Core */}
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#0E172E] to-[#070C18] border-2 border-cyan-400 flex flex-col items-center justify-center text-center shadow-2xl z-20">
                        <span className="text-[10px] text-slate-400 font-mono">HOST CORE</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {servers.find((s) => s.id === tabTargetServer.integrated)?.name || 'azure'}
                        </span>
                        <span className="text-[9px] text-emerald-400 font-bold uppercase">100% ONLINE</span>
                      </div>

                      {/* Orbit 1: Jenkins Sector (Top) */}
                      <div className="absolute -top-3 w-48 text-center bg-[#0D1526]/90 border border-red-500/40 p-2.5 rounded-xl shadow-xl z-10">
                        <div className="text-[11px] font-bold text-red-400 flex items-center justify-center gap-1.5">
                          <JenkinsLogo className="w-3 h-3" />
                          <span>JENKINS CI/CD</span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono">Port 8080 • {jenkinsRunningCount} Running</div>
                      </div>

                      {/* Orbit 2: SonarQube Sector (Bottom Right) */}
                      <div className="absolute -bottom-3 right-0 w-48 text-center bg-[#0D1526]/90 border border-cyan-500/40 p-2.5 rounded-xl shadow-xl z-10">
                        <div className="text-[11px] font-bold text-cyan-400 flex items-center justify-center gap-1.5">
                          <SonarQubeLogo className="w-3 h-3" />
                          <span>SONARQUBE GATE</span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono">Port 9000 • Grade A</div>
                      </div>

                      {/* Orbit 3: Trivy Sector (Bottom Left) */}
                      <div className="absolute -bottom-3 left-0 w-48 text-center bg-[#0D1526]/90 border border-teal-500/40 p-2.5 rounded-xl shadow-xl z-10">
                        <div className="text-[11px] font-bold text-teal-400 flex items-center justify-center gap-1.5">
                          <TrivyLogo className="w-3 h-3" />
                          <span>TRIVY SCANNER</span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono">0 Critical • Clean</div>
                      </div>

                      {/* Rotating Orbit Rings */}
                      <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/20 animate-spin" style={{ animationDuration: '40s' }} />
                      <div className="absolute inset-4 rounded-full border border-dashed border-purple-500/20 animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tool Control & Custom Command Action Hub (Single Tool Views) */}
          {activeTab !== 'integrated' && toolConfigs[activeTab] && (
            <div
              data-module-id={activeTab}
              className="bg-[#0D1526] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-all relative z-10"
            >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 module-header">
              {/* Tool Identity & Commands Summary */}
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-md module-icon ${
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
                    <h3 className="text-sm font-bold text-white tracking-wide module-heading">
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
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap relative z-30">
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

                {/* 4. Customize Design, Layer & 3D Anime */}
                <button
                  type="button"
                  onClick={() =>
                    openModuleCustomizer(
                      activeTab,
                      activeTab === 'jenkins'
                        ? 'Jenkins CI/CD Module'
                        : activeTab === 'sonarqube'
                        ? 'SonarQube Quality Module'
                        : 'Trivy Security Module'
                    )
                  }
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-[#111A2E] hover:bg-[#18233C] text-purple-300 hover:text-purple-200 border border-purple-500/30 hover:border-purple-500/60 rounded-xl transition-all cursor-pointer shadow-sm"
                  title={`Customize ${activeTab.toUpperCase()} (3D Animations, Layer Stacks & Design)`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Design & Layer</span>
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
        )}

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
                // 0. INTEGRATED DEVOPS SUITE (MODEL 5 BENTO VIEW)
                // ==========================================
                if (activeTab === 'integrated') {
                  const sStatusLower = (server.status || '').toLowerCase();
                  const isServerRunning = sStatusLower === 'online' || sStatusLower === 'running';
                  const isServerStopped = sStatusLower.includes('stop');

                  const j = server.jenkins;
                  const isJenkinsInstalled = j.detected;
                  const isJenkinsRunning = j.status === 'running';
                  const jenkinsPort = j.port || 8080;
                  const jenkinsUrl = j.url || `http://${hostIp}:${jenkinsPort}`;

                  const sq = server.sonarqube;
                  const isSonarInstalled = sq.detected;
                  const isSonarRunning = sq.status === 'running';
                  const sonarPort = sq.port || 9000;
                  const sonarUrl = sq.url || `http://${hostIp}:${sonarPort}`;

                  const tr = server.trivy;
                  const isTrivyInstalled = tr.detected;
                  const images = serverImages[server.id] || [];

                  return (
                    <div
                      key={server.id}
                      className={`bg-[#0D1526]/90 backdrop-blur-xl border rounded-2xl p-5 shadow-xl transition-all space-y-4 ${
                        isServerStopped
                          ? 'border-rose-900/40 bg-gradient-to-b from-[#0D1526] to-rose-950/10'
                          : isServerRunning
                          ? 'border-cyan-500/30 hover:border-cyan-500/60'
                          : 'border-amber-900/40'
                      }`}
                    >
                      {/* Server Node Header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
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
                                {hostIp}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60 px-2 py-0.5 rounded">
                                {server.cloudProvider?.toUpperCase()} • {server.region}
                              </span>
                              {isServerRunning ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Running
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Stopped
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Platform OS: <span className="text-slate-300 font-medium">{server.osName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openTerminal(server)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-xl transition cursor-pointer"
                          >
                            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Terminal</span>
                          </button>
                        </div>
                      </div>

                      {/* 3-Column Glassmorphic Bento Grid on this Server */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {/* 1. Jenkins Bento Tile */}
                        <div
                          data-module-id="jenkins"
                          className="bg-[#070C18]/80 border border-red-500/30 rounded-xl p-3.5 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <JenkinsLogo className="w-4 h-4" />
                                <span className="text-xs font-bold text-white">Jenkins CI/CD</span>
                              </div>
                              {isJenkinsRunning ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  RUNNING
                                </span>
                              ) : isJenkinsInstalled ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  STOPPED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                                  NOT INSTALLED
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 text-[11px] font-mono text-slate-400 bg-[#0B1120] p-2.5 rounded-lg border border-slate-800/80">
                              <div className="flex justify-between">
                                <span>Port:</span>
                                <span className="text-cyan-300 font-bold">{jenkinsPort}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Version:</span>
                                <span className="text-slate-200">{j.version ? `v${j.version}` : '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Service:</span>
                                <span className="text-slate-300">{j.serviceName || 'jenkins'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                            {isJenkinsInstalled ? (
                              <>
                                <a
                                  href={jenkinsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-center transition flex items-center justify-center gap-1.5"
                                >
                                  <span>Web UI</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  disabled={Boolean(actionLoading) || isServerStopped}
                                  onClick={() => setUninstallTarget({ server, tool: 'jenkins' })}
                                  className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                                  title="Uninstall Jenkins"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={Boolean(actionLoading) || isServerStopped}
                                onClick={() => {
                                  setJenkinsInstallServer(server.id);
                                  setJenkinsInstallOpen(true);
                                }}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition text-center shadow-sm cursor-pointer"
                              >
                                {isServerStopped ? 'Server Stopped' : 'Install Jenkins'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2. SonarQube Bento Tile */}
                        <div
                          data-module-id="sonarqube"
                          className="bg-[#070C18]/80 border border-cyan-500/30 rounded-xl p-3.5 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <SonarQubeLogo className="w-4 h-4" />
                                <span className="text-xs font-bold text-white">SonarQube Gate</span>
                              </div>
                              {isSonarRunning ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  RUNNING
                                </span>
                              ) : isSonarInstalled ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  STOPPED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                                  NOT INSTALLED
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 text-[11px] font-mono text-slate-400 bg-[#0B1120] p-2.5 rounded-lg border border-slate-800/80">
                              <div className="flex justify-between">
                                <span>Port:</span>
                                <span className="text-cyan-300 font-bold">{sonarPort}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Version:</span>
                                <span className="text-slate-200">{sq.version ? `v${sq.version}` : 'Community'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Mode:</span>
                                <span className="text-slate-300">{sq.mode || 'docker'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                            {isSonarInstalled ? (
                              <>
                                <a
                                  href={sonarUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-center transition flex items-center justify-center gap-1.5"
                                >
                                  <span>Web UI</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  disabled={Boolean(actionLoading) || isServerStopped}
                                  onClick={() => setUninstallTarget({ server, tool: 'sonarqube' })}
                                  className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                                  title="Uninstall SonarQube"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={Boolean(actionLoading) || isServerStopped}
                                onClick={() => {
                                  setSonarInstallServer(server.id);
                                  setSonarInstallOpen(true);
                                }}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition text-center shadow-sm cursor-pointer"
                              >
                                {isServerStopped ? 'Server Stopped' : 'Install SonarQube'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 3. Trivy Bento Tile */}
                        <div
                          data-module-id="trivy"
                          className="bg-[#070C18]/80 border border-teal-500/30 rounded-xl p-3.5 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TrivyLogo className="w-4 h-4" />
                                <span className="text-xs font-bold text-white">Aqua Trivy Shield</span>
                              </div>
                              {isTrivyInstalled ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                  INSTALLED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                                  NOT INSTALLED
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 text-[11px] font-mono text-slate-400 bg-[#0B1120] p-2.5 rounded-lg border border-slate-800/80">
                              <div className="flex justify-between">
                                <span>Version:</span>
                                <span className="text-slate-200">{tr.version ? `v${tr.version}` : 'v0.58.2'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Host Images:</span>
                                <span className="text-teal-300 font-bold">{images.length > 0 ? `${images.length} Local` : 'Probing...'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Last Scan:</span>
                                <span className="text-slate-300">{tr.lastScanAt ? 'Recent' : 'Ready'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                            {isTrivyInstalled ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrivyScanServer(server.id);
                                    setTrivyScanOpen(true);
                                  }}
                                  className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition text-center shadow-sm cursor-pointer"
                                >
                                  Scan Images
                                </button>
                                <button
                                  type="button"
                                  disabled={Boolean(actionLoading) || isServerStopped}
                                  onClick={() => setUninstallTarget({ server, tool: 'trivy' })}
                                  className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                                  title="Uninstall Trivy"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={Boolean(actionLoading) || isServerStopped}
                                onClick={() => handleAction('trivy', server.id, 'install')}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition text-center shadow-sm cursor-pointer"
                              >
                                {isServerStopped ? 'Server Stopped' : 'Install Trivy'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

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
                      data-module-id="jenkins"
                      className={`bg-[#0D1526] border rounded-2xl p-5 shadow-lg transition-all space-y-4 ${isServerStopped
                        ? 'border-rose-900/40 bg-gradient-to-b from-[#0D1526] to-rose-950/10'
                        : isServerRunning
                          ? 'border-[#1E293B] hover:border-slate-700'
                          : 'border-amber-900/40 bg-gradient-to-b from-[#0D1526] to-amber-950/10'
                        }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 module-header">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="relative shrink-0 module-icon">
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
                              <span className="text-sm font-bold text-white font-mono module-heading">{server.name}</span>
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
                      data-module-id="sonarqube"
                      className={`bg-[#0D1526] border rounded-2xl p-5 shadow-lg transition-all space-y-4 ${isServerStopped
                        ? 'border-rose-900/40 bg-gradient-to-b from-[#0D1526] to-rose-950/10'
                        : isServerRunning
                          ? 'border-[#1E293B] hover:border-slate-700'
                          : 'border-amber-900/40 bg-gradient-to-b from-[#0D1526] to-amber-950/10'
                        }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 module-header">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="relative shrink-0 module-icon">
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
                              <span className="text-sm font-bold text-white font-mono module-heading">{server.name}</span>
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
                    data-module-id="trivy"
                    className={`bg-[#0D1526] border rounded-2xl p-5 shadow-lg transition-all space-y-4 ${isServerStopped
                      ? 'border-rose-900/40 bg-gradient-to-b from-[#0D1526] to-rose-950/10'
                      : isServerRunning
                        ? 'border-[#1E293B] hover:border-slate-700'
                        : 'border-amber-900/40 bg-gradient-to-b from-[#0D1526] to-amber-950/10'
                      }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 module-header">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="relative shrink-0 module-icon">
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
                            <span className="text-sm font-bold text-white font-mono module-heading">{server.name}</span>
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
                            {serverImages[server.id] && serverImages[server.id].length > 0 && (
                              <span className="text-slate-400 flex items-center gap-1 font-mono text-[10px]">
                                • <Box className="w-3 h-3 text-teal-400 shrink-0" />
                                <span className="text-teal-300 font-semibold">{serverImages[server.id].length} Local Image{serverImages[server.id].length === 1 ? '' : 's'}:</span>
                                <span className="text-slate-300">
                                  {serverImages[server.id].map((i) => i.fullTag).slice(0, 2).join(', ')}
                                  {serverImages[server.id].length > 2 ? ` +${serverImages[server.id].length - 2} more` : ''}
                                </span>
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
                                fetchServerImages(server.id);
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
                      const imgs = serverImages[trivyScanServer] || [];
                      if (imgs.length > 0) setTrivyTarget(imgs[0].fullTag);
                      else setTrivyTarget('nginx:alpine');
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

              {/* Images Found Inside Target Server */}
              {trivyScanType === 'image' && (
                <div className="space-y-2.5 p-3 rounded-xl bg-[#070D1F] border border-teal-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Box className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-xs font-bold text-teal-300">Images Found Inside Target Server</span>
                      {loadingImagesServer === trivyScanServer ? (
                        <Loader2 className="w-3 h-3 text-teal-400 animate-spin" />
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          {(serverImages[trivyScanServer] || []).length} Detected
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={loadingImagesServer === trivyScanServer}
                      onClick={() => fetchServerImages(trivyScanServer)}
                      className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer disabled:opacity-50"
                      title="Query Docker images inside target server via SSH"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingImagesServer === trivyScanServer ? 'animate-spin' : ''}`} />
                      <span>Fetch Server Images</span>
                    </button>
                  </div>

                  {loadingImagesServer === trivyScanServer ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                      <span>Connecting via SSH and querying local Docker images...</span>
                    </div>
                  ) : (serverImages[trivyScanServer] || []).length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-slate-400">
                        Select an image from this server to scan its packages and layers:
                      </p>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pt-1">
                        {(serverImages[trivyScanServer] || []).map((img) => {
                          const isSelected = trivyTarget === img.fullTag;
                          return (
                            <button
                              key={img.fullTag + img.id}
                              type="button"
                              onClick={() => setTrivyTarget(img.fullTag)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-teal-500/30 border-teal-400 text-teal-200 shadow-sm shadow-teal-500/20'
                                  : 'bg-[#111A2E] hover:bg-[#18233C] border-slate-700 text-slate-300 hover:text-white'
                              }`}
                            >
                              <Box className="w-3 h-3 text-teal-400 shrink-0" />
                              <span className="font-semibold text-white">{img.fullTag}</span>
                              {img.size && (
                                <span className="text-[10px] font-normal text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded">
                                  {img.size}
                                </span>
                              )}
                              {isSelected && <span className="text-teal-400 text-[11px] font-bold">✓ Selected</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span>No container images detected inside this server yet.</span>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span>Presets:</span>
                        {['nginx:alpine', 'alpine:latest', 'redis:alpine'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setTrivyTarget(preset)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {trivyScanType === 'image' ? 'Image Name & Tag (Custom or Selected)' : 'Path'}
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
                  const validTool = editTool === 'integrated' ? 'jenkins' : editTool;
                  const defaults = DEFAULT_DEVOPS_COMMANDS[validTool];
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

            {/* Save Success Notice */}
            {saveSuccessNotice && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveSuccessNotice}</span>
              </div>
            )}

            {/* Modal Bottom Actions: Save, Cancel */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setEditCommandsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 rounded-xl transition cursor-pointer"
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

      {/* DevSecOps 6-Model & 3D Layer Studio Modal */}
      {showModelPickerModal && (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-cyan-500/10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#080D1A]/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white">
                      DevSecOps Architecture Models & 3D Layer Studio
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      6 MODELS
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Switch architecture layout, inspect 3D multi-layer depths, and synchronize Jenkins, SonarQube & Trivy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowModelPickerModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-Header Tabs */}
            <div className="px-5 pt-3 border-b border-slate-800 flex items-center justify-between bg-[#070B16] shrink-0 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModelPickerTab('models')}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs transition cursor-pointer ${
                    modelPickerTab === 'models'
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t-lg'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>🏛️ 6 Architecture Models</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModelPickerTab('layers')}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs transition cursor-pointer ${
                    modelPickerTab === 'layers'
                      ? 'border-purple-400 text-purple-300 bg-purple-500/10 rounded-t-lg'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>✨ 3D Layers & Visual Styling</span>
                </button>
              </div>

              {modelPickerToast && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>{modelPickerToast}</span>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {modelPickerTab === 'models' ? (
                <div>
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs text-slate-300">
                      Click any model below to instantly activate that layout for your unified DevSecOps suite:
                    </p>
                    <span className="text-[11px] font-mono text-cyan-400">
                      Current: <strong>M0{selectedModel}: {DEVOPS_MODELS[selectedModel]?.name}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {([1, 2, 3, 4, 5, 6] as DevopsModelId[]).map((mId) => {
                      const m = DEVOPS_MODELS[mId];
                      const isCur = selectedModel === mId;
                      return (
                        <div
                          key={mId}
                          onClick={() => {
                            setSelectedModel(mId);
                            setModelPickerToast(`Activated Model 0${mId}: ${m.name}`);
                            setTimeout(() => setModelPickerToast(null), 2500);
                          }}
                          className={`rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                            isCur
                              ? 'bg-[#0E1A33] border-cyan-400 shadow-xl shadow-cyan-500/20 ring-2 ring-cyan-400/40'
                              : 'bg-[#090F1E] border-slate-800 hover:border-slate-600 hover:bg-[#0D1528]'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span
                                className="px-2 py-0.5 rounded-md font-mono text-[10px] font-black border"
                                style={{
                                  backgroundColor: `${m.accentColor}20`,
                                  borderColor: `${m.accentColor}50`,
                                  color: m.accentColor,
                                }}
                              >
                                {m.badge}
                              </span>

                              {isCur ? (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  <Check className="w-3 h-3" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono group-hover:text-cyan-300">
                                  Click to Select
                                </span>
                              )}
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-white group-hover:text-cyan-200">
                                {m.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                                {m.tagline}
                              </p>
                            </div>

                            {/* 3-Layer Breakdown */}
                            <div className="bg-[#060A14] p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-[10px] font-mono">
                              <div className="text-slate-500 font-bold uppercase text-[9px] mb-1">Architecture Layers:</div>
                              {m.layers.map((l, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-slate-300">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.accentColor }} />
                                  <span className="truncate">{l}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-500">
                              {m.archetype}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedModel(mId);
                                setModelPickerToast(`Activated Model 0${mId}: ${m.name}`);
                                setTimeout(() => setModelPickerToast(null), 2500);
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                isCur
                                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                                  : 'bg-[#142038] hover:bg-cyan-600 hover:text-white text-slate-300'
                              }`}
                            >
                              {isCur ? 'Selected ✓' : 'Select Model'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Tab 2: 3D Layers & Visual Styling */
                <div className="space-y-6">
                  <div className="bg-[#070C18] border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>3D Layer Physics & Depth Elevation</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configure spatial isometric elevation, tilting perspective, and laser border lighting for the DevSecops CI/CD Pipeline.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                      {/* Depth Elevation */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-300 font-semibold">Layer Elevation (Z-Depth):</span>
                          <span className="text-cyan-400 font-bold">+{previewDepth}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="60"
                          step="5"
                          value={previewDepth}
                          onChange={(e) => setPreviewDepth(parseInt(e.target.value, 10))}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>Flat (0px)</span>
                          <span>Isometric (+25px)</span>
                          <span>Exploded (+60px)</span>
                        </div>
                      </div>

                      {/* Perspective Tilt */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-300 font-semibold">Perspective Tilt Angle:</span>
                          <span className="text-purple-400 font-bold">{previewTilt}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="25"
                          step="1"
                          value={previewTilt}
                          onChange={(e) => setPreviewTilt(parseInt(e.target.value, 10))}
                          className="w-full accent-purple-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>0° (2D Flat)</span>
                          <span>10° (Subtle)</span>
                          <span>25° (Deep 3D)</span>
                        </div>
                      </div>
                    </div>

                    {/* Border Glow Lighting */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-xs font-semibold text-slate-300 block">Neon Border Glow & Accent:</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { name: 'Cyan Laser', color: '#06B6D4' },
                          { name: 'Purple Void', color: '#A855F7' },
                          { name: 'Emerald Matrix', color: '#10B981' },
                          { name: 'Rose Neon', color: '#F43F5E' },
                          { name: 'Solar Amber', color: '#F59E0B' },
                        ].map((glow) => (
                          <button
                            key={glow.color}
                            type="button"
                            onClick={() => setPreviewGlow(glow.color)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                              previewGlow === glow.color
                                ? 'bg-white/10 text-white border-white shadow-md'
                                : 'bg-[#111A2E] text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: glow.color }} />
                            <span>{glow.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tri-Tool Sync Actions */}
                  <div className="bg-gradient-to-r from-purple-950/40 via-blue-950/30 to-cyan-950/40 border border-purple-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-purple-200">
                          Synchronize to All 3 Modules
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Apply these 3D layer settings simultaneously across Jenkins CI/CD, SonarQube, and Aqua Trivy.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const styleUpdate = {
                          borderColor: previewGlow,
                          accentColor: previewGlow,
                          shadow: `0 10px 30px -10px ${previewGlow}40`,
                        };
                        updateModuleStyle('integrated', styleUpdate);
                        updateModuleStyle('jenkins', styleUpdate);
                        updateModuleStyle('sonarqube', styleUpdate);
                        updateModuleStyle('trivy', styleUpdate);
                        setModelPickerToast('Synchronized to Jenkins, SonarQube & Trivy ✓');
                        setTimeout(() => setModelPickerToast(null), 3000);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center gap-2 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sync All 3 Modules</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#080D1A]/95 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Selected Model:</span>
                <span className="font-mono font-bold text-cyan-300">
                  Model 0{selectedModel} ({DEVOPS_MODELS[selectedModel]?.name})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModelPickerModal(false);
                    openModuleCustomizer('integrated', 'DevSecops CI/CD Pipeline', 'animation');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-purple-300 border border-purple-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open Full Anime & Layer Studio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowModelPickerModal(false)}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shadow-cyan-600/30"
                >
                  Apply & Close
                </button>
              </div>
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
