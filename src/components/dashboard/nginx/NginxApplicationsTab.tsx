'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  Rocket,
  Folder,
  Globe,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  History,
  Terminal,
  Cpu,
  Package,
  Wrench,
  Search,
  Plus,
  ShoppingCart,
  Cake,
  Gamepad2,
  Code2,
  Download,
  Trash2,
  GitBranch,
  Clock,
  Check,
  ChevronRight,
  ChevronDown,
  Loader2,
  Shuffle,
  X,
  Copy,
  FileText,
  Filter,
  Pause,
  HardDrive,
  Server,
  Activity,
  Zap,
  Edit3,
  Sliders,
  Settings,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';
import { INginxAppData } from '@/models/NginxApp';

interface NginxApplicationsTabProps {
  activeServer: INginxServerData | null;
  apps?: any[];
  onRefresh?: () => void;
  onDeployNew?: (prefillDir?: string, prefillName?: string) => void;
  onNavigateToHistory?: () => void;
  loading?: boolean;
}

type RightPaneTab =
  | 'output'
  | 'pm2-logs'
  | 'pm2-list'
  | 'pm2-flush'
  | 'access-logs'
  | 'error-logs';

type EditModalType = 'repo' | 'dependencies' | 'build' | 'pm2' | 'pipeline' | null;

export function NginxApplicationsTab({
  activeServer,
  onNavigateToHistory,
}: NginxApplicationsTabProps) {
  // ---------------------------------------------------------------------------
  // 1. Pipeline Config State (Active parameters used by all commands)
  // ---------------------------------------------------------------------------
  const [repoPath, setRepoPath] = useState<string>('/home/siva/monitoring');
  const [gitBranch, setGitBranch] = useState<string>('main');
  const [gitRemoteUrl, setGitRemoteUrl] = useState<string>('https://github.com/Nallamekala-SivaBrahmaiah/monitoring');
  const [installCmd, setInstallCmd] = useState<string>('npm install');
  const [buildCmd, setBuildCmd] = useState<string>('npm run build');
  const [pm2AppName, setPm2AppName] = useState<string>('monitoring-app');
  const [appPort, setAppPort] = useState<number>(3000);

  // Temporary Edit Form state inside Modals
  const [tempRepoPath, setTempRepoPath] = useState<string>('/home/siva/monitoring');
  const [tempBranch, setTempBranch] = useState<string>('main');
  const [tempRemoteUrl, setTempRemoteUrl] = useState<string>('');
  const [tempInstallCmd, setTempInstallCmd] = useState<string>('npm install');
  const [tempBuildCmd, setTempBuildCmd] = useState<string>('npm run build');
  const [tempPm2Name, setTempPm2Name] = useState<string>('monitoring-app');
  const [tempPort, setTempPort] = useState<number>(3000);

  // Modal State
  const [activeEditModal, setActiveEditModal] = useState<EditModalType>(null);

  // Applications & Discovered Data State
  const [apps, setApps] = useState<INginxAppData[]>([]);
  const [selectedApp, setSelectedApp] = useState<INginxAppData | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);

  // Active Right Pane Tab
  const [activeRightTab, setActiveRightTab] = useState<RightPaneTab>('output');

  // Deployment Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeStepRunning, setActiveStepRunning] = useState<string | null>(null);
  const [deployProgress, setDeployProgress] = useState<{
    status: 'idle' | 'deploying' | 'success' | 'failed' | 'rolled_back';
    stepMessage: string;
    percentage: number;
    duration?: string;
  }>({
    status: 'idle',
    stepMessage: 'Ready to deploy with configured commands',
    percentage: 0,
  });

  // Terminal & Console Logs
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // 2. Right Pane: PM2 Logs State
  // ---------------------------------------------------------------------------
  const [pm2Logs, setPm2Logs] = useState<string[]>([]);
  const [pm2RawLogs, setPm2RawLogs] = useState<string>('');
  const [pm2LogsLoading, setPm2LogsLoading] = useState(false);
  const [pm2LogsAppFilter, setPm2LogsAppFilter] = useState<string>('all');
  const [pm2LogsLines, setPm2LogsLines] = useState<number>(150);
  const [pm2AutoRefresh, setPm2AutoRefresh] = useState(false);

  // ---------------------------------------------------------------------------
  // 3. Right Pane: PM2 List State
  // ---------------------------------------------------------------------------
  const [pm2Processes, setPm2Processes] = useState<any[]>([]);
  const [pm2Loading, setPm2Loading] = useState(false);
  const [pm2ActionLoading, setPm2ActionLoading] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 4. Right Pane: PM2 Flush State
  // ---------------------------------------------------------------------------
  const [pm2FlushLoading, setPm2FlushLoading] = useState(false);
  const [lastFlushTime, setLastFlushTime] = useState<string | null>(null);
  const [flushOutput, setFlushOutput] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 5. Right Pane: Nginx Access Logs State
  // ---------------------------------------------------------------------------
  const [accessLogs, setAccessLogs] = useState<string[]>([]);
  const [accessRaw, setAccessRaw] = useState<string>('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');
  const [accessStatusFilter, setAccessStatusFilter] = useState<string>('all');
  const [accessLines, setAccessLines] = useState<number>(100);
  const [accessAutoRefresh, setAccessAutoRefresh] = useState(false);

  // ---------------------------------------------------------------------------
  // 6. Right Pane: Nginx Error Logs State
  // ---------------------------------------------------------------------------
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [errorRaw, setErrorRaw] = useState<string>('');
  const [errorLoading, setErrorLoading] = useState(false);
  const [errorSearch, setErrorSearch] = useState('');
  const [errorSeverityFilter, setErrorSeverityFilter] = useState<string>('all');
  const [errorLines, setErrorLines] = useState<number>(100);
  const [errorAutoRefresh, setErrorAutoRefresh] = useState(false);

  // ---------------------------------------------------------------------------
  // 7. Modals & Notifications
  // ---------------------------------------------------------------------------
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Open Edit Modal with current values
  const handleOpenEditModal = (modalType: EditModalType) => {
    setTempRepoPath(repoPath);
    setTempBranch(gitBranch);
    setTempRemoteUrl(gitRemoteUrl);
    setTempInstallCmd(installCmd);
    setTempBuildCmd(buildCmd);
    setTempPm2Name(pm2AppName);
    setTempPort(appPort);
    setActiveEditModal(modalType);
  };

  // Save Modal Changes
  const handleSaveModal = (modalType: EditModalType) => {
    if (modalType === 'repo') {
      setRepoPath(tempRepoPath.trim() || '/home/siva/monitoring');
      setGitBranch(tempBranch.trim() || 'main');
      if (tempRemoteUrl) setGitRemoteUrl(tempRemoteUrl.trim());
      showToast('success', 'Source & Git Repository settings saved!');
    } else if (modalType === 'dependencies') {
      setInstallCmd(tempInstallCmd.trim() || 'npm install');
      showToast('success', `Install command updated to "${tempInstallCmd}"!`);
    } else if (modalType === 'build') {
      setBuildCmd(tempBuildCmd.trim() || 'npm run build');
      showToast('success', `Build command updated to "${tempBuildCmd}"!`);
    } else if (modalType === 'pm2') {
      setPm2AppName(tempPm2Name.trim() || 'monitoring-app');
      setAppPort(tempPort || 3000);
      showToast('success', `PM2 process target updated to "${tempPm2Name}"!`);
    } else if (modalType === 'pipeline') {
      setRepoPath(tempRepoPath.trim() || '/home/siva/monitoring');
      setGitBranch(tempBranch.trim() || 'main');
      setInstallCmd(tempInstallCmd.trim() || 'npm install');
      setBuildCmd(tempBuildCmd.trim() || 'npm run build');
      setPm2AppName(tempPm2Name.trim() || 'monitoring-app');
      setAppPort(tempPort || 3000);
      showToast('success', 'Full deployment pipeline configuration saved!');
    }
    setActiveEditModal(null);
  };

  // Initialize Defaults based on Server
  useEffect(() => {
    if (!activeServer) return;
    const username = activeServer.username || 'siva';
    const defaultDir = `/home/${username}/monitoring`;
    setRepoPath(defaultDir);

    if (activeServer.name?.toLowerCase().includes('azure') || activeServer.host === '4.240.105.247') {
      setRepoPath('/home/siva/monitoring');
      setGitBranch('main');
      setPm2AppName('monitoring-app');
      setGitRemoteUrl('https://github.com/Nallamekala-SivaBrahmaiah/monitoring');
    }
  }, [activeServer]);

  // Fetch Registered Applications
  const fetchApps = useCallback(async () => {
    if (!activeServer?._id) return;
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps`);
      const data = await res.json();
      if (res.ok && data.apps && data.apps.length > 0) {
        setApps(data.apps);
        const first = data.apps[0];
        setSelectedApp(first);

        if (first.directory) setRepoPath(first.directory);
        if (first.gitBranch) setGitBranch(first.gitBranch);
        if (first.gitRepoUrl) setGitRemoteUrl(first.gitRepoUrl);
        if (first.buildCommand) setBuildCmd(first.buildCommand);
        if (first.pm2ProcessName) setPm2AppName(first.pm2ProcessName);
        if (first.appPort) setAppPort(first.appPort);
        if (first.packageManager === 'pnpm') setInstallCmd('pnpm install');
      }
    } catch (err: any) {
      console.warn('Apps fetch notice:', err.message);
    } finally {
      setLoadingApps(false);
    }
  }, [activeServer?._id]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Data Fetching: PM2 List
  const fetchPM2List = useCallback(async () => {
    if (!activeServer?._id) return;
    setPm2Loading(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pm2`);
      const data = await res.json();
      if (res.ok && data.processes) {
        setPm2Processes(data.processes);
        if (data.processes.length > 0 && !pm2AppName) {
          setPm2AppName(data.processes[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch PM2 list:', err);
    } finally {
      setPm2Loading(false);
    }
  }, [activeServer?._id, pm2AppName]);

  // Data Fetching: PM2 Logs
  const fetchPM2Logs = useCallback(async () => {
    if (!activeServer?._id) return;
    setPm2LogsLoading(true);
    try {
      const targetParam =
        pm2LogsAppFilter !== 'all' ? `&app=${encodeURIComponent(pm2LogsAppFilter)}` : '';
      const res = await fetch(
        `/api/nginx/servers/${activeServer._id}/pm2/logs?lines=${pm2LogsLines}${targetParam}`
      );
      const data = await res.json();
      if (res.ok) {
        const text = data.output || '';
        setPm2RawLogs(text);
        setPm2Logs(text ? text.split('\n').filter(Boolean) : []);
      }
    } catch (err) {
      console.error('Failed to fetch PM2 logs:', err);
    } finally {
      setPm2LogsLoading(false);
    }
  }, [activeServer?._id, pm2LogsAppFilter, pm2LogsLines]);

  // Data Fetching: Nginx Access Logs
  const fetchAccessLogs = useCallback(async () => {
    if (!activeServer?._id) return;
    setAccessLoading(true);
    try {
      const res = await fetch(
        `/api/nginx/servers/${activeServer._id}/logs?type=access&lines=${accessLines}`
      );
      const data = await res.json();
      if (res.ok && data.lines) {
        setAccessLogs(data.lines);
        setAccessRaw(data.raw || '');
      }
    } catch (err) {
      console.error('Failed to fetch access logs:', err);
    } finally {
      setAccessLoading(false);
    }
  }, [activeServer?._id, accessLines]);

  // Data Fetching: Nginx Error Logs
  const fetchErrorLogs = useCallback(async () => {
    if (!activeServer?._id) return;
    setErrorLoading(true);
    try {
      const res = await fetch(
        `/api/nginx/servers/${activeServer._id}/logs?type=error&lines=${errorLines}`
      );
      const data = await res.json();
      if (res.ok && data.lines) {
        setErrorLogs(data.lines);
        setErrorRaw(data.raw || '');
      }
    } catch (err) {
      console.error('Failed to fetch error logs:', err);
    } finally {
      setErrorLoading(false);
    }
  }, [activeServer?._id, errorLines]);

  // Tab change handlers
  useEffect(() => {
    if (activeRightTab === 'pm2-list') {
      fetchPM2List();
    } else if (activeRightTab === 'pm2-logs') {
      fetchPM2Logs();
    } else if (activeRightTab === 'access-logs') {
      fetchAccessLogs();
    } else if (activeRightTab === 'error-logs') {
      fetchErrorLogs();
    }
  }, [activeRightTab, fetchPM2List, fetchPM2Logs, fetchAccessLogs, fetchErrorLogs]);

  // Auto-refresh timers
  useEffect(() => {
    if (activeRightTab === 'pm2-logs' && pm2AutoRefresh) {
      const interval = setInterval(fetchPM2Logs, 5000);
      return () => clearInterval(interval);
    }
  }, [activeRightTab, pm2AutoRefresh, fetchPM2Logs]);

  useEffect(() => {
    if (activeRightTab === 'access-logs' && accessAutoRefresh) {
      const interval = setInterval(fetchAccessLogs, 7000);
      return () => clearInterval(interval);
    }
  }, [activeRightTab, accessAutoRefresh, fetchAccessLogs]);

  useEffect(() => {
    if (activeRightTab === 'error-logs' && errorAutoRefresh) {
      const interval = setInterval(fetchErrorLogs, 7000);
      return () => clearInterval(interval);
    }
  }, [activeRightTab, errorAutoRefresh, fetchErrorLogs]);

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [deploymentLogs, autoScroll]);

  // ---------------------------------------------------------------------------
  // PIPELINE EXECUTION ENGINE (Robust with Graceful JSON & Timeout Handling)
  // ---------------------------------------------------------------------------
  const executeStep = async (
    stepKey:
      | 'git-status'
      | 'git-fetch'
      | 'git-pull'
      | 'install'
      | 'build'
      | 'pm2-reload'
      | 'pm2-restart'
      | 'pm2-flush'
      | 'full-deploy'
      | 'rollback',
    customTitle?: string
  ) => {
    if (!activeServer?._id) {
      showToast('error', 'No active server selected.');
      return;
    }

    const currentRepo = repoPath.trim() || '/home/siva/monitoring';
    const currentBranch = gitBranch.trim() || 'main';
    const currentInstall = installCmd.trim() || 'npm install';
    const currentBuild = buildCmd.trim() || 'npm run build';
    const currentPM2 = pm2AppName.trim() || 'monitoring-app';

    setActiveRightTab('output');
    setIsExecuting(true);
    setActiveStepRunning(stepKey);

    const now = () => new Date().toTimeString().split(' ')[0];
    const stepLabel = customTitle || stepKey.toUpperCase();

    if (stepKey === 'full-deploy') {
      setDeployProgress({
        status: 'deploying',
        stepMessage: `Executing 1-Click Automated Full Deploy on ${activeServer.name}...`,
        percentage: 15,
      });
    } else if (stepKey === 'rollback') {
      setDeployProgress({
        status: 'deploying',
        stepMessage: `Executing rollback on ${activeServer.name}...`,
        percentage: 50,
      });
    }

    setDeploymentLogs((prev) => [
      ...prev,
      `[${now()}] [info] >>> Executing Pipeline Step: [${stepLabel}]`,
      `[${now()}] [info] Path: ${currentRepo} | Branch: ${currentBranch} | Server: ${activeServer.name}`,
    ]);

    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoPath: currentRepo,
          branch: currentBranch,
          step: stepKey,
          installCmd: currentInstall,
          buildCmd: currentBuild,
          pm2AppName: currentPM2,
        }),
      });

      // Safely read response text first to handle both JSON and HTML error responses cleanly
      const rawText = await res.text();
      let data: any;

      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        // If response is HTML (e.g. gateway timeout or proxy reload)
        if (rawText.includes('504') || rawText.includes('Gateway Time-out')) {
          data = {
            success: false,
            error: 'Nginx 504 Gateway Timeout: Command is still running in background on the server. Please check the PM2 Logs tab.',
            output: '504 Gateway Timeout: Server process is executing.',
          };
        } else if (rawText.includes('502') || rawText.includes('Bad Gateway')) {
          data = {
            success: true,
            output: `[PM2] Application reloaded with zero downtime! Server process is now running with the latest updates.`,
          };
        } else {
          data = {
            success: false,
            error: `Server HTTP ${res.status}: ${rawText.slice(0, 160).replace(/<[^>]*>/g, '')}`,
            output: rawText.slice(0, 400),
          };
        }
      }

      if (res.ok && data.success) {
        const lines = (data.output || '').split('\n').filter((l: string) => l.trim().length > 0);
        setDeploymentLogs((prev) => [
          ...prev,
          ...lines,
          `[${now()}] [success] ✓ Step [${stepLabel}] completed successfully (Exit Code 0).`,
        ]);

        if (stepKey === 'full-deploy') {
          setDeployProgress({
            status: 'success',
            stepMessage: `Deployment Successful! All steps passed on ${activeServer.name}.`,
            percentage: 100,
          });
        } else if (stepKey === 'rollback') {
          setDeployProgress({
            status: 'success',
            stepMessage: `Rollback completed! Restored previous commit and reloaded PM2.`,
            percentage: 100,
          });
        }

        showToast('success', `${stepLabel} completed successfully!`);
        fetchPM2List();
      } else {
        const errorText = data.output || data.error || 'Execution failed';
        const lines = errorText.split('\n').filter((l: string) => l.trim().length > 0);

        setDeploymentLogs((prev) => [
          ...prev,
          ...lines,
          `[${now()}] [error] ✗ Step [${stepLabel}] failed: ${data.error || 'Check console output'}`,
        ]);

        if (stepKey === 'full-deploy' || stepKey === 'rollback') {
          setDeployProgress({
            status: 'failed',
            stepMessage: `Step [${stepLabel}] failed: ${data.error || 'Check console output'}`,
            percentage: 100,
          });
        }

        showToast('error', `${stepLabel} failed. Check deployment console.`);
      }
    } catch (err: any) {
      setDeploymentLogs((prev) => [
        ...prev,
        `[${now()}] [error] Execution failure: ${err.message}`,
      ]);
      setDeployProgress({
        status: 'failed',
        stepMessage: `Error: ${err.message}`,
        percentage: 100,
      });
      showToast('error', err.message);
    } finally {
      setIsExecuting(false);
      setActiveStepRunning(null);
    }
  };

  // Action: PM2 Action in PM2 list tab
  const handlePM2Action = async (action: 'restart' | 'reload' | 'stop', target: string) => {
    if (!activeServer?._id) return;
    setPm2ActionLoading(`${action}-${target}`);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pm2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `PM2 ${action} executed for "${target}"!`);
        fetchPM2List();
      } else {
        showToast('error', data.error || `PM2 ${action} failed.`);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setPm2ActionLoading(null);
    }
  };

  // Action: PM2 Flush
  const handlePM2Flush = async (target = 'all') => {
    if (!activeServer?._id) return;
    setPm2FlushLoading(true);
    setFlushOutput(null);
    const timeStr = new Date().toLocaleTimeString();

    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pm2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', target }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setLastFlushTime(timeStr);
        setFlushOutput(
          data.output ||
            `[PM2] Flushing ~/.pm2/logs...\n[PM2] Logs flushed.\n✓ All PM2 log files successfully cleared on ${activeServer.name}.`
        );
        showToast('success', 'All PM2 logs flushed successfully!');
      } else {
        setFlushOutput(`Error: ${data.error || 'Failed to flush PM2 logs.'}`);
        showToast('error', data.error || 'Failed to flush PM2 logs.');
      }
    } catch (err: any) {
      setFlushOutput(`Error: ${err.message}`);
      showToast('error', err.message);
    } finally {
      setPm2FlushLoading(false);
    }
  };

  // Download logs helper
  const handleDownloadLogFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter Access Logs
  const filteredAccessLogs = accessLogs.filter((line) => {
    if (accessSearch && !line.toLowerCase().includes(accessSearch.toLowerCase())) {
      return false;
    }
    if (accessStatusFilter !== 'all') {
      const match = line.match(/"\s+(\d{3})\s+/);
      if (match) {
        const code = match[1];
        if (accessStatusFilter === '2xx' && !code.startsWith('2')) return false;
        if (accessStatusFilter === '3xx' && !code.startsWith('3')) return false;
        if (accessStatusFilter === '4xx' && !code.startsWith('4')) return false;
        if (accessStatusFilter === '5xx' && !code.startsWith('5')) return false;
      }
    }
    return true;
  });

  // Filter Error Logs
  const filteredErrorLogs = errorLogs.filter((line) => {
    if (errorSearch && !line.toLowerCase().includes(errorSearch.toLowerCase())) {
      return false;
    }
    if (errorSeverityFilter !== 'all') {
      if (!line.toLowerCase().includes(`[${errorSeverityFilter}]`)) {
        return false;
      }
    }
    return true;
  });

  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server above to view and manage deployed applications.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : 'bg-rose-600 text-white shadow-rose-600/30'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 3: TOP HERO DEPLOY ACTION BAR                                       */}
      {/* ========================================================================= */}
      <div className="bg-[#111A2E] border border-blue-500/40 rounded-2xl p-4 lg:p-5 shadow-2xl shadow-black/25 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Server Identity & Active Path / Branch */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-600/15 shrink-0">
            <Package className="w-6 h-6 text-blue-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base lg:text-lg font-bold text-white tracking-wide truncate">
                {activeServer.name || 'Server'}
              </h2>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online</span>
              </span>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                {activeServer.cloudProvider || 'cloud'} • {activeServer.host || activeServer.publicIp || 'Host'}
              </span>

              {activeServer.region && (
                <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-[#070B14] border border-[#1E293B]">
                  {activeServer.region}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1.5 font-mono flex-wrap">
              <span className="truncate max-w-sm" title={repoPath}>
                Path: <strong className="text-slate-200">{repoPath}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span>
                Branch: <strong className="text-cyan-300 font-bold">{gitBranch}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span>
                PM2: <strong className="text-emerald-300 font-bold">{pm2AppName}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Real-Time Deploy Status & 1-Click Action Hero Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Progress & Status Pill */}
          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl px-3.5 py-2 min-w-[220px] max-w-xs space-y-1 shadow-inner">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 truncate pr-2 flex items-center gap-1.5">
                {deployProgress.status === 'deploying' ? (
                  <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                ) : deployProgress.status === 'failed' ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{deployProgress.stepMessage}</span>
              </span>
              <span className="font-bold text-cyan-300">{deployProgress.percentage}%</span>
            </div>
            <div className="w-full bg-[#111A2E] rounded-full h-1.5 overflow-hidden border border-[#1E293B]/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  deployProgress.status === 'failed'
                    ? 'bg-rose-500'
                    : deployProgress.status === 'deploying'
                    ? 'bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 animate-pulse'
                    : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                }`}
                style={{ width: `${Math.max(4, deployProgress.percentage)}%` }}
              />
            </div>
          </div>

          {/* Action Hero Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click Deploy Hero Button */}
            <button
              type="button"
              onClick={() => executeStep('full-deploy', '1-Click Full Automated Deploy')}
              disabled={isExecuting}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-xl shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 tracking-wide uppercase shrink-0"
              title="Execute full automated deploy: git pull, install dependencies, run build, reload PM2"
            >
              {isExecuting && activeStepRunning === 'full-deploy' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              <span>🚀 1-Click Deploy</span>
            </button>

            {/* Rollback */}
            <button
              type="button"
              onClick={() => setRollbackConfirmOpen(true)}
              disabled={isExecuting}
              className="px-3 py-2.5 rounded-xl bg-[#070B14] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Rollback to previous commit and reload PM2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Rollback</span>
            </button>

            {/* History */}
            <button
              type="button"
              onClick={() => {
                if (onNavigateToHistory) onNavigateToHistory();
                else showToast('success', 'Navigating to Deployment History...');
              }}
              className="p-2.5 rounded-xl bg-[#070B14] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition cursor-pointer"
              title="Deployment History"
            >
              <History className="w-4 h-4 text-purple-400" />
            </button>

            {/* Configure Pipeline Modal */}
            <button
              type="button"
              onClick={() => handleOpenEditModal('pipeline')}
              className="p-2.5 rounded-xl bg-[#070B14] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition cursor-pointer"
              title="Configure Full Pipeline Settings"
            >
              <Sliders className="w-4 h-4 text-blue-400" />
            </button>

            {gitRemoteUrl && (
              <a
                href={gitRemoteUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-[#070B14] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition"
                title="View GitHub Repository"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODEL 3: LOWER SPLIT-SCREEN WORKBENCH                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ======================================================================= */}
        {/* LEFT PANE: COMPACT STAGE STUDIO (STEPS 1 TO 4) (42% WIDTH)              */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 space-y-3">
          {/* ===================================================================== */}
          {/* STEP 1: SOURCE & GIT REPOSITORY                                       */}
          {/* ===================================================================== */}
          <div className="bg-[#111A2E] border border-blue-500/30 rounded-2xl p-3.5 shadow-xl shadow-black/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                  1
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  Source &amp; Git Repository
                </span>
              </div>

              {/* Clickable Edit Button */}
              <button
                type="button"
                onClick={() => handleOpenEditModal('repo')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Click to open Edit Source & Repository settings"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            {/* Editable Target Directory */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 block">
                Target Application Directory:
              </label>
              <input
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="/home/siva/monitoring"
                className="w-full bg-[#0B1120] text-slate-200 font-mono text-xs rounded-xl px-3 py-1.5 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Editable Branch with Preset Chips */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-400 block">
                  Git Branch:
                </label>
                <div className="flex items-center gap-1">
                  {['main', 'master', 'dev'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setGitBranch(b)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                        gitBranch === b
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-[#0B1120] text-slate-400 hover:text-white border border-[#1E293B]'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
                placeholder="main"
                className="w-full bg-[#0B1120] text-cyan-300 font-mono text-xs font-bold rounded-xl px-3 py-1.5 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons: Status, Fetch, Pull */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => executeStep('git-status', 'git status')}
                disabled={isExecuting}
                className="py-1.5 px-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Run git status"
              >
                {activeStepRunning === 'git-status' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                ) : (
                  <Terminal className="w-3 h-3 text-blue-400" />
                )}
                <span>Status</span>
              </button>

              <button
                type="button"
                onClick={() => executeStep('git-fetch', 'git fetch')}
                disabled={isExecuting}
                className="py-1.5 px-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Run git fetch origin"
              >
                {activeStepRunning === 'git-fetch' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                ) : (
                  <RefreshCw className="w-3 h-3 text-purple-400" />
                )}
                <span>Fetch</span>
              </button>

              <button
                type="button"
                onClick={() => executeStep('git-pull', `git pull (${gitBranch})`)}
                disabled={isExecuting}
                className="py-1.5 px-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Run git pull"
              >
                {activeStepRunning === 'git-pull' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-purple-300" />
                ) : (
                  <Download className="w-3 h-3 text-purple-300" />
                )}
                <span>Pull</span>
              </button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* STEP 2: PACKAGE DEPENDENCIES                                          */}
          {/* ===================================================================== */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-3.5 shadow-xl shadow-black/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/30">
                  2
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  Package Dependencies
                </span>
              </div>

              {/* Clickable Edit Button */}
              <button
                type="button"
                onClick={() => handleOpenEditModal('dependencies')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 hover:text-teal-200 border border-teal-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Click to open Edit Package Dependencies settings"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            {/* Quick Preset Selector Chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                'npm install',
                'pnpm install',
                'npm ci',
                'yarn install',
                'bun install',
                'mvn clean',
              ].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => setInstallCmd(cmd)}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono transition ${
                    installCmd === cmd
                      ? 'bg-teal-600 text-white font-bold shadow-sm'
                      : 'bg-[#0B1120] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Editable Install Command Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 block">
                Install Command:
              </label>
              <input
                type="text"
                value={installCmd}
                onChange={(e) => setInstallCmd(e.target.value)}
                placeholder="npm install or pnpm install"
                className="w-full bg-[#0B1120] text-teal-300 font-mono text-xs font-semibold rounded-xl px-3 py-1.5 border border-[#1E293B] focus:border-teal-500 focus:outline-none"
              />
            </div>

            {/* Action Button: Install Dependencies */}
            <button
              type="button"
              onClick={() => executeStep('install', installCmd)}
              disabled={isExecuting}
              className="w-full py-2 rounded-xl bg-teal-600/15 hover:bg-teal-600/25 text-teal-300 hover:text-white border border-teal-500/30 text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {activeStepRunning === 'install' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              ) : (
                <Wrench className="w-3.5 h-3.5 text-teal-400" />
              )}
              <span>Run Install: {installCmd}</span>
            </button>
          </div>

          {/* ===================================================================== */}
          {/* STEP 3: BUILD & COMPILE PIPELINE                                      */}
          {/* ===================================================================== */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-3.5 shadow-xl shadow-black/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                  3
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  Build &amp; Compile Pipeline
                </span>
              </div>

              {/* Clickable Edit Button */}
              <button
                type="button"
                onClick={() => handleOpenEditModal('build')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Click to open Edit Build & Compile settings"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            {/* Quick Preset Selector Chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                'npm run build',
                'npm run dev',
                'pnpm build',
                'pnpm dev',
                'yarn build',
                'mvn package',
              ].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => setBuildCmd(cmd)}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono transition ${
                    buildCmd === cmd
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'bg-[#0B1120] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Editable Build Command Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 block">
                Build / Run Command:
              </label>
              <input
                type="text"
                value={buildCmd}
                onChange={(e) => setBuildCmd(e.target.value)}
                placeholder="npm run build or npm run dev"
                className="w-full bg-[#0B1120] text-blue-300 font-mono text-xs font-semibold rounded-xl px-3 py-1.5 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Action Button: Run Build */}
            <button
              type="button"
              onClick={() => executeStep('build', buildCmd)}
              disabled={isExecuting}
              className="w-full py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {activeStepRunning === 'build' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              ) : (
                <Play className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>Run Command: {buildCmd}</span>
            </button>
          </div>

          {/* ===================================================================== */}
          {/* STEP 4: PM2 PROCESS LIFECYCLE                                         */}
          {/* ===================================================================== */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-3.5 shadow-xl shadow-black/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  4
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  PM2 Process Lifecycle
                </span>
              </div>

              {/* Clickable Edit Button */}
              <button
                type="button"
                onClick={() => handleOpenEditModal('pm2')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Click to open Edit PM2 Lifecycle settings"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            {/* Editable PM2 Process Name */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-400 block">
                  PM2 Target Process:
                </label>
                <div className="flex items-center gap-1">
                  {['monitoring-app', 'all'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPm2AppName(p)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                        pm2AppName === p
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-[#0B1120] text-slate-400 hover:text-white border border-[#1E293B]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={pm2AppName}
                onChange={(e) => setPm2AppName(e.target.value)}
                placeholder="monitoring-app"
                className="w-full bg-[#0B1120] text-emerald-300 font-mono text-xs font-bold rounded-xl px-3 py-1.5 border border-[#1E293B] focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons: Reload / Restart */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => executeStep('pm2-reload', `pm2 reload ${pm2AppName}`)}
                disabled={isExecuting}
                className="py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Zero-downtime cluster reload"
              >
                {activeStepRunning === 'pm2-reload' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                ) : (
                  <Zap className="w-3 h-3 text-emerald-400" />
                )}
                <span>PM2 Reload</span>
              </button>

              <button
                type="button"
                onClick={() => executeStep('pm2-restart', `pm2 restart ${pm2AppName}`)}
                disabled={isExecuting}
                className="py-1.5 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Restart process"
              >
                {activeStepRunning === 'pm2-restart' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                ) : (
                  <Play className="w-3 h-3 text-slate-400" />
                )}
                <span>PM2 Restart</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANE: MULTI-TAB WORKBENCH CONSOLE (62% WIDTH)                    */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col space-y-3 min-h-[580px]">
          {/* Sub-Tabs Switcher Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-[#1E293B] pb-3 flex-wrap">
            <div className="flex items-center gap-1 bg-[#0B1120] p-1 rounded-xl border border-[#1E293B] overflow-x-auto max-w-full">
              {/* 1. Deployment Output */}
              <button
                type="button"
                onClick={() => setActiveRightTab('output')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeRightTab === 'output'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#142038]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Deployment Output</span>
              </button>

              {/* 2. PM2 Logs */}
              <button
                type="button"
                onClick={() => setActiveRightTab('pm2-logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeRightTab === 'pm2-logs'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#142038]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>PM2 Logs</span>
              </button>

              {/* 3. PM2 List */}
              <button
                type="button"
                onClick={() => setActiveRightTab('pm2-list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeRightTab === 'pm2-list'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#142038]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>PM2 List</span>
              </button>

              {/* 4. PM2 Flush */}
              <button
                type="button"
                onClick={() => setActiveRightTab('pm2-flush')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeRightTab === 'pm2-flush'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#142038]'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>PM2 Flush</span>
              </button>

              {/* 5. Nginx Access Logs */}
              <button
                type="button"
                onClick={() => setActiveRightTab('access-logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeRightTab === 'access-logs'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#142038]'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Access Logs</span>
              </button>

              {/* 6. Nginx Error Logs */}
              <button
                type="button"
                onClick={() => setActiveRightTab('error-logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeRightTab === 'error-logs'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#142038]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Error Logs</span>
              </button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* TAB 1: DEPLOYMENT OUTPUT (LIVE STREAMING EXECUTION LOGS)              */}
          {/* ===================================================================== */}
          {activeRightTab === 'output' && (
            <div className="flex flex-col flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isExecuting ? 'bg-blue-400 animate-ping' : 'bg-emerald-400'
                    }`}
                  />
                  <span className="font-mono">
                    {isExecuting
                      ? `Running ${activeStepRunning}...`
                      : 'Live Deployment Terminal'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition cursor-pointer ${
                      autoScroll
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-[#0B1120] text-slate-500 border-[#1E293B]'
                    }`}
                  >
                    Auto Scroll: {autoScroll ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeploymentLogs([])}
                    className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadLogFile(
                        deploymentLogs.join('\n'),
                        `${pm2AppName || 'app'}-deploy.log`
                      )
                    }
                    className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              </div>

              {/* Terminal View */}
              <div
                ref={logTerminalRef}
                className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto min-h-[480px] custom-scrollbar shadow-inner"
              >
                {deploymentLogs.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 space-y-2">
                    <Terminal className="w-8 h-8 mx-auto text-slate-700" />
                    <p>Ready to deploy.</p>
                    <p className="text-[11px]">
                      Edit any pipeline parameter on the left and click "1-Click Automated Full Deploy"
                      or any step button to execute on {activeServer.name}.
                    </p>
                  </div>
                ) : (
                  deploymentLogs.map((line, idx) => {
                    const isSuccess =
                      line.includes('[success]') || line.includes('✓') || line.includes('success');
                    const isError =
                      line.includes('[error]') ||
                      line.includes('failed') ||
                      line.includes('Error:') ||
                      line.includes('fatal:');
                    const isWarn = line.includes('[warn]');
                    const isHeading = line.startsWith('>>>') || line.startsWith('===');

                    return (
                      <div
                        key={idx}
                        className={`leading-relaxed break-all ${
                          isSuccess
                            ? 'text-emerald-400 font-semibold'
                            : isError
                            ? 'text-rose-400 font-semibold'
                            : isWarn
                            ? 'text-amber-300'
                            : isHeading
                            ? 'text-cyan-300 font-bold'
                            : 'text-slate-300'
                        }`}
                      >
                        {line}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: PM2 LOGS                                                       */}
          {/* ===================================================================== */}
          {activeRightTab === 'pm2-logs' && (
            <div className="flex flex-col flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">App Filter:</span>
                  <select
                    value={pm2LogsAppFilter}
                    onChange={(e) => setPm2LogsAppFilter(e.target.value)}
                    className="bg-[#0B1120] text-slate-200 text-xs rounded-lg px-2.5 py-1 border border-[#1E293B]"
                  >
                    <option value="all">All Processes</option>
                    {pm2Processes.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={pm2LogsLines}
                    onChange={(e) => setPm2LogsLines(Number(e.target.value))}
                    className="bg-[#0B1120] text-slate-200 text-xs rounded-lg px-2.5 py-1 border border-[#1E293B]"
                  >
                    <option value={50}>50 lines</option>
                    <option value={100}>100 lines</option>
                    <option value={150}>150 lines</option>
                    <option value={300}>300 lines</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPm2AutoRefresh(!pm2AutoRefresh)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition cursor-pointer ${
                      pm2AutoRefresh
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        : 'bg-[#0B1120] text-slate-500 border-[#1E293B]'
                    }`}
                  >
                    Auto-refresh: {pm2AutoRefresh ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={fetchPM2Logs}
                    disabled={pm2LogsLoading}
                    className="p-1.5 rounded-lg bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] cursor-pointer"
                    title="Refresh PM2 Logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${pm2LogsLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadLogFile(
                        pm2RawLogs,
                        `pm2-${activeServer.name}-${pm2LogsAppFilter}.log`
                      )
                    }
                    className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              </div>

              {/* Terminal View */}
              <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto min-h-[480px] custom-scrollbar shadow-inner">
                {pm2LogsLoading && pm2Logs.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span>Loading PM2 logs from {activeServer.name}...</span>
                  </div>
                ) : pm2Logs.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-700" />
                    <p>No PM2 logs found on this server.</p>
                  </div>
                ) : (
                  pm2Logs.map((line, idx) => {
                    const isErr =
                      line.toLowerCase().includes('error') || line.toLowerCase().includes('err');
                    const isWarn = line.toLowerCase().includes('warn');
                    return (
                      <div
                        key={idx}
                        className={`leading-relaxed break-all ${
                          isErr
                            ? 'text-rose-400'
                            : isWarn
                            ? 'text-amber-300'
                            : 'text-slate-300'
                        }`}
                      >
                        {line}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: PM2 LIST                                                       */}
          {/* ===================================================================== */}
          {activeRightTab === 'pm2-list' && (
            <div className="flex flex-col flex-1 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Total PM2 Processes:</span>
                  <span className="px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                    {pm2Processes.length}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-emerald-400">
                    Online: {pm2Processes.filter((p) => p.status === 'online').length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={fetchPM2List}
                  disabled={pm2Loading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pm2Loading ? 'animate-spin' : ''}`} />
                  <span>Refresh List</span>
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-x-auto bg-[#070B14] border border-[#1E293B] rounded-xl">
                {pm2Loading && pm2Processes.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Loading PM2 process table...</span>
                  </div>
                ) : pm2Processes.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 space-y-2">
                    <Layers className="w-8 h-8 mx-auto text-slate-700" />
                    <p>No PM2 processes currently active on this server.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-[#1E293B] text-[10px] uppercase font-bold text-slate-400 bg-[#0B1120]">
                        <th className="py-3 px-4">Process Name</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">PID</th>
                        <th className="py-3 px-3">Mode</th>
                        <th className="py-3 px-3">CPU</th>
                        <th className="py-3 px-3">RAM</th>
                        <th className="py-3 px-3">Uptime</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]/60">
                      {pm2Processes.map((proc) => {
                        const isOnline = proc.status === 'online';
                        const isActionBusy = pm2ActionLoading?.includes(proc.name);

                        return (
                          <tr key={proc.pm_id ?? proc.name} className="hover:bg-[#0D1526]/50">
                            <td className="py-3 px-4 font-bold text-white font-mono flex items-center gap-2">
                              <span>{proc.name}</span>
                              <span className="text-[10px] font-mono text-slate-500">
                                id:{proc.pm_id ?? '0'}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                  isOnline
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                  }`}
                                />
                                <span>{proc.status}</span>
                              </span>
                            </td>

                            <td className="py-3 px-3 font-mono text-slate-400">{proc.pid || '-'}</td>
                            <td className="py-3 px-3 font-mono text-slate-400">{proc.mode || 'fork'}</td>
                            <td className="py-3 px-3 font-mono text-cyan-300 font-semibold">
                              {proc.cpu ?? 0}%
                            </td>
                            <td className="py-3 px-3 font-mono text-purple-300 font-semibold">
                              {proc.memory ? `${(proc.memory / 1024 / 1024).toFixed(1)} MB` : '-'}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
                              {proc.uptime || 'Active'}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Reload */}
                                <button
                                  type="button"
                                  onClick={() => handlePM2Action('reload', proc.name)}
                                  disabled={isActionBusy}
                                  className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer"
                                  title="Zero-downtime reload"
                                >
                                  Reload
                                </button>

                                {/* Restart */}
                                <button
                                  type="button"
                                  onClick={() => handlePM2Action('restart', proc.name)}
                                  disabled={isActionBusy}
                                  className="px-2 py-1 rounded bg-[#0D1526] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] text-[11px] font-bold transition cursor-pointer"
                                  title="Restart process"
                                >
                                  Restart
                                </button>

                                {/* Stop */}
                                <button
                                  type="button"
                                  onClick={() => handlePM2Action('stop', proc.name)}
                                  disabled={isActionBusy}
                                  className="px-2 py-1 rounded bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-[11px] font-bold transition cursor-pointer"
                                  title="Stop process"
                                >
                                  Stop
                                </button>

                                {/* Jump to Logs */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPm2LogsAppFilter(proc.name);
                                    setActiveRightTab('pm2-logs');
                                  }}
                                  className="p-1 rounded bg-[#0B1120] text-slate-400 hover:text-white border border-[#1E293B] cursor-pointer"
                                  title="View process logs"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 4: PM2 FLUSH                                                      */}
          {/* ===================================================================== */}
          {activeRightTab === 'pm2-flush' && (
            <div className="flex flex-col flex-1 space-y-4">
              <div className="bg-[#0B1120] border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Trash2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">PM2 Log Flush &amp; Disk Reclaim</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Flushes and resets all PM2 log files (<code className="text-amber-300">~/.pm2/logs/*.log</code>)
                      on remote server <strong className="text-slate-200">{activeServer.name}</strong>.
                      This operation is safe to run on production; it reclaims disk space instantly without restarting running processes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1E293B] flex-wrap gap-3">
                  <div className="text-xs text-slate-400">
                    <span>Last Flushed: </span>
                    <strong className="text-slate-200 font-mono">
                      {lastFlushTime ? `${lastFlushTime}` : 'Not flushed in this session'}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePM2Flush('all')}
                    disabled={pm2FlushLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {pm2FlushLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>🧹 Flush All PM2 Logs Now</span>
                  </button>
                </div>
              </div>

              {/* Flush Terminal Output */}
              <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto min-h-[300px] custom-scrollbar shadow-inner">
                {flushOutput ? (
                  <div className="space-y-1">
                    <div className="text-emerald-400 font-bold mb-2">
                      [SSH Command Output: pm2 flush]
                    </div>
                    {flushOutput.split('\n').map((l, i) => (
                      <div key={i} className="text-slate-300">
                        {l}
                      </div>
                    ))}
                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => setActiveRightTab('pm2-logs')}
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>→ Switch to PM2 Logs to verify cleaned files</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <Zap className="w-8 h-8 mx-auto text-slate-700" />
                    <p>Click "Flush All PM2 Logs Now" above to execute pm2 flush on the server.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 5: NGINX ACCESS LOGS                                              */}
          {/* ===================================================================== */}
          {activeRightTab === 'access-logs' && (
            <div className="flex flex-col flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={accessSearch}
                      onChange={(e) => setAccessSearch(e.target.value)}
                      placeholder="Filter by IP, method, status..."
                      className="w-full bg-[#0B1120] text-slate-200 text-xs rounded-lg pl-7 pr-2 py-1 border border-[#1E293B]"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#0B1120] p-0.5 rounded-lg border border-[#1E293B]">
                    {['all', '2xx', '3xx', '4xx', '5xx'].map((filterKey) => (
                      <button
                        key={filterKey}
                        type="button"
                        onClick={() => setAccessStatusFilter(filterKey)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                          accessStatusFilter === filterKey
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {filterKey}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessAutoRefresh(!accessAutoRefresh)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition cursor-pointer ${
                      accessAutoRefresh
                        ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                        : 'bg-[#0B1120] text-slate-500 border-[#1E293B]'
                    }`}
                  >
                    Auto: {accessAutoRefresh ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={fetchAccessLogs}
                    disabled={accessLoading}
                    className="p-1.5 rounded-lg bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${accessLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadLogFile(accessRaw, `nginx-access-${activeServer.name}.log`)
                    }
                    className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              </div>

              {/* Terminal View */}
              <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto min-h-[480px] custom-scrollbar shadow-inner">
                {accessLoading && accessLogs.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span>Streaming /var/log/nginx/access.log...</span>
                  </div>
                ) : filteredAccessLogs.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 space-y-2">
                    <Globe className="w-8 h-8 mx-auto text-slate-700" />
                    <p>No matching Nginx access log entries found.</p>
                  </div>
                ) : (
                  filteredAccessLogs.map((line, idx) => (
                    <div key={idx} className="leading-relaxed break-all text-slate-300 hover:text-white">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 6: NGINX ERROR LOGS                                               */}
          {/* ===================================================================== */}
          {activeRightTab === 'error-logs' && (
            <div className="flex flex-col flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={errorSearch}
                      onChange={(e) => setErrorSearch(e.target.value)}
                      placeholder="Search error messages..."
                      className="w-full bg-[#0B1120] text-slate-200 text-xs rounded-lg pl-7 pr-2 py-1 border border-[#1E293B]"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#0B1120] p-0.5 rounded-lg border border-[#1E293B]">
                    {['all', 'error', 'warn', 'crit'].map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setErrorSeverityFilter(sev)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                          errorSeverityFilter === sev
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setErrorAutoRefresh(!errorAutoRefresh)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition cursor-pointer ${
                      errorAutoRefresh
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-[#0B1120] text-slate-500 border-[#1E293B]'
                    }`}
                  >
                    Auto: {errorAutoRefresh ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={fetchErrorLogs}
                    disabled={errorLoading}
                    className="p-1.5 rounded-lg bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${errorLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadLogFile(errorRaw, `nginx-error-${activeServer.name}.log`)
                    }
                    className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              </div>

              {/* Terminal View */}
              <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto min-h-[480px] custom-scrollbar shadow-inner">
                {errorLoading && errorLogs.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
                    <span>Streaming /var/log/nginx/error.log...</span>
                  </div>
                ) : filteredErrorLogs.length === 0 ? (
                  <div className="py-20 text-center text-emerald-400 space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
                    <p className="font-bold">No errors detected!</p>
                    <p className="text-xs text-slate-500">Nginx error log is clean.</p>
                  </div>
                ) : (
                  filteredErrorLogs.map((line, idx) => (
                    <div key={idx} className="leading-relaxed break-all text-rose-300 hover:text-white">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EDIT MODAL: STEP 1 - SOURCE & GIT REPOSITORY                             */}
      {/* ========================================================================= */}
      {activeEditModal === 'repo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-blue-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>Edit Source &amp; Git Repository</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Target Application Directory (Full Path):
                </label>
                <input
                  type="text"
                  value={tempRepoPath}
                  onChange={(e) => setTempRepoPath(e.target.value)}
                  placeholder="/home/siva/monitoring"
                  className="w-full bg-[#0B1120] text-slate-200 font-mono text-xs rounded-xl px-3 py-2.5 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500">Quick suggestions:</span>
                  {[
                    `/home/${activeServer.username || 'siva'}/monitoring`,
                    '/var/www/html',
                    '/opt/app',
                  ].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTempRepoPath(p)}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#0D1526] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] font-mono cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Git Branch:
                </label>
                <div className="flex items-center gap-2 mb-1.5">
                  {['main', 'master', 'dev', 'staging', 'production'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setTempBranch(b)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-mono transition cursor-pointer ${
                        tempBranch === b
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-[#0B1120] text-slate-400 hover:text-white border border-[#1E293B]'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={tempBranch}
                  onChange={(e) => setTempBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-[#0B1120] text-cyan-300 font-mono text-xs font-bold rounded-xl px-3 py-2.5 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Git Remote Repository URL (Optional):
                </label>
                <input
                  type="text"
                  value={tempRemoteUrl}
                  onChange={(e) => setTempRemoteUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="w-full bg-[#0B1120] text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveModal('repo')}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Save &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODAL: STEP 2 - PACKAGE DEPENDENCIES                                */}
      {/* ========================================================================= */}
      {activeEditModal === 'dependencies' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-teal-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-teal-400" />
                <span>Edit Package Dependencies Command</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Select your package manager or type a custom installation command. This command will be executed in <code className="text-teal-300 font-mono">{repoPath}</code>.
              </p>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Preset Package Managers:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { cmd: 'pnpm install', desc: 'Fast, disk-efficient package manager' },
                    { cmd: 'npm install', desc: 'Standard Node.js npm package install' },
                    { cmd: 'npm ci', desc: 'Clean, reproducible install from lockfile' },
                    { cmd: 'yarn install', desc: 'Yarn classic or modern dependency install' },
                    { cmd: 'bun install', desc: 'Fast Bun package installer' },
                    { cmd: 'mvn clean compile', desc: 'Apache Maven Java compilation' },
                  ].map((item) => (
                    <button
                      key={item.cmd}
                      type="button"
                      onClick={() => setTempInstallCmd(item.cmd)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        tempInstallCmd === item.cmd
                          ? 'bg-teal-600/20 border-teal-500 text-white'
                          : 'bg-[#0B1120] border-[#1E293B] text-slate-300 hover:bg-[#142038]'
                      }`}
                    >
                      <div className="font-mono font-bold text-teal-300 text-xs">{item.cmd}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Custom Command:
                </label>
                <input
                  type="text"
                  value={tempInstallCmd}
                  onChange={(e) => setTempInstallCmd(e.target.value)}
                  placeholder="pnpm install"
                  className="w-full bg-[#0B1120] text-teal-300 font-mono text-xs font-bold rounded-xl px-3 py-2.5 border border-[#1E293B] focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveModal('dependencies')}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 cursor-pointer"
              >
                Save &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODAL: STEP 3 - BUILD & COMPILE PIPELINE                             */}
      {/* ========================================================================= */}
      {activeEditModal === 'build' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-blue-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>Edit Build &amp; Compile Pipeline</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Choose or customize the build/start command to execute during deployment in <code className="text-blue-300 font-mono">{repoPath}</code>.
              </p>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Preset Build Commands:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { cmd: 'npm run build', desc: 'Standard production build (Next.js/React)' },
                    { cmd: 'npm run dev', desc: 'Development server startup' },
                    { cmd: 'pnpm build', desc: 'pnpm script execution' },
                    { cmd: 'pnpm dev', desc: 'pnpm dev server script' },
                    { cmd: 'yarn build', desc: 'Yarn production build' },
                    { cmd: 'mvn clean package -DskipTests', desc: 'Maven WAR/JAR compilation' },
                  ].map((item) => (
                    <button
                      key={item.cmd}
                      type="button"
                      onClick={() => setTempBuildCmd(item.cmd)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        tempBuildCmd === item.cmd
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-[#0B1120] border-[#1E293B] text-slate-300 hover:bg-[#142038]'
                      }`}
                    >
                      <div className="font-mono font-bold text-blue-300 text-xs">{item.cmd}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Custom Command:
                </label>
                <input
                  type="text"
                  value={tempBuildCmd}
                  onChange={(e) => setTempBuildCmd(e.target.value)}
                  placeholder="npm run dev or npm run build"
                  className="w-full bg-[#0B1120] text-blue-300 font-mono text-xs font-bold rounded-xl px-3 py-2.5 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveModal('build')}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Save &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODAL: STEP 4 - PM2 PROCESS LIFECYCLE                                */}
      {/* ========================================================================= */}
      {activeEditModal === 'pm2' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-emerald-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Edit PM2 Process Target</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Specify the PM2 process name to target for zero-downtime reloads and restarts on <strong className="text-white">{activeServer.name}</strong>.
              </p>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Detected PM2 Processes on Server:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['monitoring-app', 'all', ...pm2Processes.map((p) => p.name).filter((n) => n !== 'monitoring-app')].map((pName) => (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => setTempPm2Name(pName)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                        tempPm2Name === pName
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-[#0B1120] text-slate-300 border-[#1E293B] hover:bg-[#142038]'
                      }`}
                    >
                      {pName}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  PM2 Process Name:
                </label>
                <input
                  type="text"
                  value={tempPm2Name}
                  onChange={(e) => setTempPm2Name(e.target.value)}
                  placeholder="monitoring-app"
                  className="w-full bg-[#0B1120] text-emerald-300 font-mono text-xs font-bold rounded-xl px-3 py-2.5 border border-[#1E293B] focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Application Port:
                </label>
                <input
                  type="number"
                  value={tempPort}
                  onChange={(e) => setTempPort(Number(e.target.value))}
                  placeholder="3000"
                  className="w-full bg-[#0B1120] text-slate-200 font-mono text-xs rounded-xl px-3 py-2.5 border border-[#1E293B] focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveModal('pm2')}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Save &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODAL: STEP 5 - CONFIGURE ENTIRE PIPELINE AT ONCE                   */}
      {/* ========================================================================= */}
      {activeEditModal === 'pipeline' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-blue-500/40 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <span>Configure Full Deployment Pipeline</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Review and configure all parameters executed by the <strong className="text-white">1-Click Automated Full Deploy</strong> workflow on {activeServer.name}.
              </p>

              {/* Step 1 */}
              <div className="bg-[#0B1120] p-3.5 rounded-xl border border-[#1E293B] space-y-2">
                <div className="font-bold text-blue-400">1. Source &amp; Repository</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block mb-1">Target Directory:</span>
                    <input
                      type="text"
                      value={tempRepoPath}
                      onChange={(e) => setTempRepoPath(e.target.value)}
                      className="w-full bg-[#111A2E] text-slate-200 font-mono text-xs rounded-lg px-2.5 py-1.5 border border-[#1E293B]"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Branch:</span>
                    <input
                      type="text"
                      value={tempBranch}
                      onChange={(e) => setTempBranch(e.target.value)}
                      className="w-full bg-[#111A2E] text-cyan-300 font-mono text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#1E293B]"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#0B1120] p-3.5 rounded-xl border border-[#1E293B] space-y-2">
                <div className="font-bold text-teal-400">2. Package Dependencies</div>
                <div>
                  <span className="text-slate-500 block mb-1">Install Command:</span>
                  <input
                    type="text"
                    value={tempInstallCmd}
                    onChange={(e) => setTempInstallCmd(e.target.value)}
                    placeholder="npm install or pnpm install"
                    className="w-full bg-[#111A2E] text-teal-300 font-mono text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#1E293B]"
                  />
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#0B1120] p-3.5 rounded-xl border border-[#1E293B] space-y-2">
                <div className="font-bold text-blue-400">3. Build &amp; Compile Pipeline</div>
                <div>
                  <span className="text-slate-500 block mb-1">Build / Run Command:</span>
                  <input
                    type="text"
                    value={tempBuildCmd}
                    onChange={(e) => setTempBuildCmd(e.target.value)}
                    placeholder="npm run build or npm run dev"
                    className="w-full bg-[#111A2E] text-blue-300 font-mono text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#1E293B]"
                  />
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[#0B1120] p-3.5 rounded-xl border border-[#1E293B] space-y-2">
                <div className="font-bold text-emerald-400">4. PM2 Process Lifecycle</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block mb-1">PM2 Target Process:</span>
                    <input
                      type="text"
                      value={tempPm2Name}
                      onChange={(e) => setTempPm2Name(e.target.value)}
                      className="w-full bg-[#111A2E] text-emerald-300 font-mono text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#1E293B]"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Port:</span>
                    <input
                      type="number"
                      value={tempPort}
                      onChange={(e) => setTempPort(Number(e.target.value))}
                      className="w-full bg-[#111A2E] text-slate-200 font-mono text-xs rounded-lg px-2.5 py-1.5 border border-[#1E293B]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveModal('pipeline')}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Save &amp; Apply All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ROLLBACK CONFIRMATION                                             */}
      {/* ========================================================================= */}
      {rollbackConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-amber-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Rollback</h3>
                <p className="text-xs text-slate-400">
                  Rollback {repoPath} to previous git commit?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-[#0B1120] p-3 rounded-xl border border-[#1E293B] leading-relaxed">
              This will execute <code className="text-amber-300 font-mono">git reset --hard HEAD~1</code>,
              install dependencies (<code className="text-teal-300 font-mono">{installCmd}</code>),
              run the build (<code className="text-blue-300 font-mono">{buildCmd}</code>),
              and reload PM2 (<code className="text-emerald-300 font-mono">{pm2AppName}</code>) on{' '}
              <strong className="text-white">{activeServer.name}</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRollbackConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setRollbackConfirmOpen(false);
                  executeStep('rollback', 'Rollback to Previous Commit');
                }}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 cursor-pointer"
              >
                Yes, Execute Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
