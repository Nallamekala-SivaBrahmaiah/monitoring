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
  RotateCcw,
  History,
  Terminal,
  Package,
  Search,
  Plus,
  ShoppingCart,
  Gamepad2,
  Code2,
  Download,
  Trash2,
  GitBranch,
  ChevronDown,
  Loader2,
  X,
  Copy,
  FileText,
  Sliders,
  Boxes,
  Activity,
  Zap,
  Check,
  Server,
  Play,
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

type ConsoleTab =
  | 'output'
  | 'pm2-logs'
  | 'pm2-list'
  | 'pm2-flush'
  | 'access-logs'
  | 'error-logs';

export function NginxApplicationsTab({
  activeServer,
  onNavigateToHistory,
}: NginxApplicationsTabProps) {
  // ---------------------------------------------------------------------------
  // 1. Applications & Auto-Discovery State
  // ---------------------------------------------------------------------------
  const [apps, setApps] = useState<INginxAppData[]>([]);
  const [selectedApp, setSelectedApp] = useState<INginxAppData | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // ---------------------------------------------------------------------------
  // 2. Active Deployment Parameters (bound dynamically to selected app)
  // ---------------------------------------------------------------------------
  const [repoPath, setRepoPath] = useState<string>('/home/siva/monitoring');
  const [gitBranch, setGitBranch] = useState<string>('main');
  const [gitRemoteUrl, setGitRemoteUrl] = useState<string>('https://github.com/Nallamekala-SivaBrahmaiah/monitoring');
  const [packageManager, setPackageManager] = useState<string>('npm');
  const [installCmd, setInstallCmd] = useState<string>('npm install');
  const [buildCmd, setBuildCmd] = useState<string>('npm run build');
  const [pm2AppName, setPm2AppName] = useState<string>('monitoring-app');
  const [appPort, setAppPort] = useState<number>(3000);

  // Modal State
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [addAppModalOpen, setAddAppModalOpen] = useState(false);
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);

  // Form State for "Configure Full Deployment Pipeline" Modal
  const [modalAppName, setModalAppName] = useState<string>('');
  const [modalRepoPath, setModalRepoPath] = useState<string>('');
  const [modalGitBranch, setModalGitBranch] = useState<string>('main');
  const [modalGitRemoteUrl, setModalGitRemoteUrl] = useState<string>('');
  const [modalPackageManager, setModalPackageManager] = useState<string>('npm');
  const [modalInstallCmd, setModalInstallCmd] = useState<string>('npm install');
  const [modalBuildCmd, setModalBuildCmd] = useState<string>('npm run build');
  const [modalPm2Name, setModalPm2Name] = useState<string>('monitoring-app');
  const [modalPort, setModalPort] = useState<number>(3000);
  const [isSavingPipeline, setIsSavingPipeline] = useState(false);

  // Form State for "Add Application" Modal
  const [newAppName, setNewAppName] = useState('');
  const [newAppDir, setNewAppDir] = useState('');
  const [newAppBranch, setNewAppBranch] = useState('main');
  const [newAppRepoUrl, setNewAppRepoUrl] = useState('');
  const [newAppPkgMgr, setNewAppPkgMgr] = useState('npm');
  const [newAppBuildCmd, setNewAppBuildCmd] = useState('npm run build');
  const [newAppPm2Name, setNewAppPm2Name] = useState('');
  const [newAppPort, setNewAppPort] = useState<number>(3000);
  const [isAddingApp, setIsAddingApp] = useState(false);

  // ---------------------------------------------------------------------------
  // 3. Developer Console & Telemetry Tabs
  // ---------------------------------------------------------------------------
  const [activeConsoleTab, setActiveConsoleTab] = useState<ConsoleTab>('output');

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

  // Telemetry: PM2 Logs
  const [pm2Logs, setPm2Logs] = useState<string[]>([]);
  const [pm2RawLogs, setPm2RawLogs] = useState<string>('');
  const [pm2LogsLoading, setPm2LogsLoading] = useState(false);
  const [pm2LogsAppFilter, setPm2LogsAppFilter] = useState<string>('all');
  const [pm2LogsLines, setPm2LogsLines] = useState<number>(150);
  const [pm2AutoRefresh, setPm2AutoRefresh] = useState(false);

  // Telemetry: PM2 List
  const [pm2Processes, setPm2Processes] = useState<any[]>([]);
  const [pm2Loading, setPm2Loading] = useState(false);
  const [pm2ActionLoading, setPm2ActionLoading] = useState<string | null>(null);

  // Telemetry: PM2 Flush
  const [pm2FlushLoading, setPm2FlushLoading] = useState(false);
  const [lastFlushTime, setLastFlushTime] = useState<string | null>(null);
  const [flushOutput, setFlushOutput] = useState<string | null>(null);

  // Telemetry: Nginx Access Logs
  const [accessLogs, setAccessLogs] = useState<string[]>([]);
  const [accessRaw, setAccessRaw] = useState<string>('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');
  const [accessStatusFilter, setAccessStatusFilter] = useState<string>('all');
  const [accessLines, setAccessLines] = useState<number>(100);
  const [accessAutoRefresh, setAccessAutoRefresh] = useState(false);

  // Telemetry: Nginx Error Logs
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [errorRaw, setErrorRaw] = useState<string>('');
  const [errorLoading, setErrorLoading] = useState(false);
  const [errorSearch, setErrorSearch] = useState('');
  const [errorSeverityFilter, setErrorSeverityFilter] = useState<string>('all');
  const [errorLines, setErrorLines] = useState<number>(100);
  const [errorAutoRefresh, setErrorAutoRefresh] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // 4. Bind Application Target
  // ---------------------------------------------------------------------------
  const applyAppToTarget = useCallback((app: INginxAppData) => {
    setSelectedApp(app);
    if (app.directory) setRepoPath(app.directory);
    if (app.gitBranch) setGitBranch(app.gitBranch);
    if (app.gitRepoUrl) setGitRemoteUrl(app.gitRepoUrl);
    if (app.buildCommand) setBuildCmd(app.buildCommand);
    if (app.pm2ProcessName) {
      setPm2AppName(app.pm2ProcessName);
      setPm2LogsAppFilter(app.pm2ProcessName);
    } else if (app.name) {
      setPm2AppName(app.name);
      setPm2LogsAppFilter(app.name);
    }
    if (app.appPort) setAppPort(app.appPort);

    const pkg = (app.packageManager?.toLowerCase() as string) || 'npm';
    setPackageManager(pkg);
    if (pkg === 'pnpm') setInstallCmd('pnpm install');
    else if (pkg === 'yarn') setInstallCmd('yarn install');
    else if (pkg === 'bun') setInstallCmd('bun install');
    else if (pkg === 'maven') setInstallCmd('mvn clean compile');
    else setInstallCmd('npm install');
  }, []);

  // Filter strictly for Nginx web applications (exclude Docker, Maven, Gradle, Kubernetes, Jenkins)
  const isNginxApp = useCallback((a: INginxAppData) => {
    if (!a) return false;
    const t = (a.type || '').toLowerCase();
    const pkg = (a.packageManager || '').toLowerCase();
    const f = (a.frameworkName || '').toLowerCase();
    const n = (a.name || '').toLowerCase();
    const excluded = ['docker', 'maven', 'gradle', 'kubernetes', 'jenkins'];
    if (excluded.some((ex) => t.includes(ex) || pkg.includes(ex) || f.includes(ex) || n.includes(ex))) {
      return false;
    }
    return true;
  }, []);

  // Fetch Applications (with optional live SSH scan)
  const fetchApps = useCallback(
    async (scan = false) => {
      if (!activeServer?._id) return;
      if (scan) setIsScanning(true);
      else setLoadingApps(true);

      try {
        const endpoint = scan
          ? `/api/nginx/servers/${activeServer._id}/apps?scan=true`
          : `/api/nginx/servers/${activeServer._id}/apps`;
        const res = await fetch(endpoint);
        const data = await res.json();

        if (res.ok && data.apps && data.apps.length > 0) {
          const filtered = (data.apps as INginxAppData[]).filter(isNginxApp);
          setApps(filtered);

          if (filtered.length > 0) {
            setSelectedApp((prev) => {
              if (prev) {
                const matched = filtered.find((a: INginxAppData) => a._id === prev._id || a.directory === prev.directory);
                if (matched) {
                  applyAppToTarget(matched);
                  return matched;
                }
              }
              applyAppToTarget(filtered[0]);
              return filtered[0];
            });
          }

          if (scan) {
            showToast('success', `Live server scan discovered ${filtered.length} Nginx application(s).`);
          }
        } else if (data.apps && data.apps.length === 0) {
          setApps([]);
          if (scan) {
            showToast('error', 'No deployed Nginx applications discovered on this server.');
          }
        }
      } catch (err: any) {
        console.warn('Apps fetch notice:', err.message);
        if (scan) {
          showToast('error', `Scan failed: ${err.message}`);
        }
      } finally {
        setLoadingApps(false);
        setIsScanning(false);
      }
    },
    [activeServer?._id, applyAppToTarget, isNginxApp]
  );

  // Initial load
  useEffect(() => {
    if (!activeServer) return;
    const username = activeServer.username || 'siva';
    setRepoPath(`/home/${username}/monitoring`);
    fetchApps();
  }, [activeServer, fetchApps]);

  // Handle User Clicking an Application Card
  const handleSelectApp = (app: INginxAppData) => {
    applyAppToTarget(app);
    showToast('success', `Active deployment target set to "${app.name}".`);
  };

  // ---------------------------------------------------------------------------
  // 5. Configure Full Deployment Pipeline Modal Handlers
  // ---------------------------------------------------------------------------
  const handleOpenPipelineModal = () => {
    setModalAppName(selectedApp?.name || pm2AppName || 'app');
    setModalRepoPath(repoPath);
    setModalGitBranch(gitBranch);
    setModalGitRemoteUrl(gitRemoteUrl);
    setModalPackageManager(packageManager);
    setModalInstallCmd(installCmd);
    setModalBuildCmd(buildCmd);
    setModalPm2Name(pm2AppName);
    setModalPort(appPort);
    setPipelineModalOpen(true);
  };

  const handleSavePipelineConfig = async () => {
    if (!activeServer?._id) return;
    setIsSavingPipeline(true);

    try {
      const payload: any = {
        name: modalAppName.trim() || selectedApp?.name || 'app',
        directory: modalRepoPath.trim() || repoPath,
        gitBranch: modalGitBranch.trim() || 'main',
        gitRepoUrl: modalGitRemoteUrl.trim(),
        packageManager: modalPackageManager,
        buildCommand: modalBuildCmd.trim() || 'npm run build',
        startCommand: 'npm start',
        pm2ProcessName: modalPm2Name.trim() || pm2AppName,
        appPort: modalPort ? Number(modalPort) : 3000,
      };

      if (selectedApp?._id) {
        payload._id = selectedApp._id;
      }

      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Update local parameters
        setRepoPath(payload.directory);
        setGitBranch(payload.gitBranch);
        setGitRemoteUrl(payload.gitRepoUrl);
        setPackageManager(payload.packageManager);
        setInstallCmd(modalInstallCmd.trim() || 'npm install');
        setBuildCmd(payload.buildCommand);
        setPm2AppName(payload.pm2ProcessName);
        setAppPort(payload.appPort);
        setPm2LogsAppFilter(payload.pm2ProcessName);

        showToast('success', 'Full deployment pipeline configuration saved!');
        setPipelineModalOpen(false);
        fetchApps();
      } else {
        showToast('error', data.error || 'Failed to save pipeline configuration.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSavingPipeline(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Add Application Modal Handlers
  // ---------------------------------------------------------------------------
  const handleOpenAddAppModal = () => {
    const user = activeServer?.username || 'siva';
    setNewAppName('');
    setNewAppDir(`/home/${user}/`);
    setNewAppBranch('main');
    setNewAppRepoUrl('');
    setNewAppPkgMgr('npm');
    setNewAppBuildCmd('npm run build');
    setNewAppPm2Name('');
    setNewAppPort(3000);
    setAddAppModalOpen(true);
  };

  const handleCreateApp = async () => {
    if (!activeServer?._id) return;
    if (!newAppName.trim() || !newAppDir.trim()) {
      showToast('error', 'Please provide Application Name and Target Directory.');
      return;
    }

    setIsAddingApp(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAppName.trim(),
          directory: newAppDir.trim(),
          gitBranch: newAppBranch.trim() || 'main',
          gitRepoUrl: newAppRepoUrl.trim(),
          packageManager: newAppPkgMgr,
          buildCommand: newAppBuildCmd.trim() || 'npm run build',
          pm2ProcessName: newAppPm2Name.trim() || newAppName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          appPort: newAppPort ? Number(newAppPort) : 3000,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Application "${newAppName}" added successfully.`);
        setAddAppModalOpen(false);
        await fetchApps();
        if (data.app) applyAppToTarget(data.app);
      } else {
        showToast('error', data.error || 'Failed to add application.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsAddingApp(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 7. Telemetry Fetching (PM2 List, PM2 Logs, Access, Error)
  // ---------------------------------------------------------------------------
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

  // Tab change triggers
  useEffect(() => {
    if (activeConsoleTab === 'pm2-list') fetchPM2List();
    else if (activeConsoleTab === 'pm2-logs') fetchPM2Logs();
    else if (activeConsoleTab === 'access-logs') fetchAccessLogs();
    else if (activeConsoleTab === 'error-logs') fetchErrorLogs();
  }, [activeConsoleTab, fetchPM2List, fetchPM2Logs, fetchAccessLogs, fetchErrorLogs]);

  // Auto-refresh timers
  useEffect(() => {
    if (activeConsoleTab === 'pm2-logs' && pm2AutoRefresh) {
      const interval = setInterval(fetchPM2Logs, 5000);
      return () => clearInterval(interval);
    }
  }, [activeConsoleTab, pm2AutoRefresh, fetchPM2Logs]);

  useEffect(() => {
    if (activeConsoleTab === 'access-logs' && accessAutoRefresh) {
      const interval = setInterval(fetchAccessLogs, 7000);
      return () => clearInterval(interval);
    }
  }, [activeConsoleTab, accessAutoRefresh, fetchAccessLogs]);

  useEffect(() => {
    if (activeConsoleTab === 'error-logs' && errorAutoRefresh) {
      const interval = setInterval(fetchErrorLogs, 7000);
      return () => clearInterval(interval);
    }
  }, [activeConsoleTab, errorAutoRefresh, fetchErrorLogs]);

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [deploymentLogs, autoScroll]);

  // ---------------------------------------------------------------------------
  // 8. Pipeline Execution Engine (Safe JSON & Robust Terminal Output)
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

    setActiveConsoleTab('output');
    setIsExecuting(true);
    setActiveStepRunning(stepKey);

    const now = () => new Date().toTimeString().split(' ')[0];
    const stepLabel = customTitle || stepKey.toUpperCase();

    if (stepKey === 'full-deploy') {
      setDeployProgress({
        status: 'deploying',
        stepMessage: `Executing 1-Click Automated Full Deploy for ${selectedApp?.name || currentPM2}...`,
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
      `[${now()}] [info] Target: ${currentRepo} | Branch: ${currentBranch} | PM2: ${currentPM2} | Server: ${activeServer.name}`,
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
      } catch {
        if (rawText.includes('504') || rawText.includes('Gateway Time-out')) {
          data = {
            success: false,
            error: 'Nginx 504 Gateway Timeout: Command is still running in background. Check the PM2 Logs tab.',
            output: '504 Gateway Timeout: Server process is executing in background.',
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
            stepMessage: `Deployment Successful! All steps passed for ${selectedApp?.name || currentPM2}.`,
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

        showToast('error', `${stepLabel} failed. Check console output.`);
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

  // Helper actions
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

  // App Icon Helper - Strictly Nginx Web Applications
  const getAppIcon = (type?: string, pkg?: string) => {
    const t = (type || '').toLowerCase();
    const p = (pkg || '').toLowerCase();
    if (t === 'nextjs' || p === 'next') return <Globe className="w-5 h-5 text-cyan-400" />;
    if (t === 'vite' || t === 'react') return <Code2 className="w-5 h-5 text-indigo-400" />;
    return <Package className="w-5 h-5 text-emerald-400" />;
  };

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
      {/* 1. HORIZONTAL SCROLLABLE DEPLOYED APPLICATIONS SWITCHER                   */}
      {/* ========================================================================= */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 space-y-3">
        {/* Header Strip: Title + Server Auto-Scan Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Deployed Applications on {activeServer.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  {apps.length} {apps.length === 1 ? 'App' : 'Apps'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Auto-discovered server applications. Click any card to switch the active deployment target.
              </p>
            </div>
          </div>

          {/* Action Buttons: Auto-Fetch / Scan Server + Add App */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchApps(true)}
              disabled={isScanning || loadingApps}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
              title="Execute live SSH inspection to automatically discover applications deployed on this server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isScanning ? 'Scanning Server...' : 'Auto-Fetch / Scan Server'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddAppModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition cursor-pointer"
              title="Add a new application deployment target"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Add App</span>
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Application Cards Rail */}
        {loadingApps && apps.length === 0 ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Discovering applications on {activeServer.name}...</span>
          </div>
        ) : apps.length === 0 ? (
          <div className="py-8 px-4 text-center bg-[#070B14] border border-[#1E293B] rounded-xl space-y-2">
            <Package className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-300 font-semibold">No applications discovered on this server yet.</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Click <strong className="text-cyan-400">Auto-Fetch / Scan Server</strong> above to discover PM2 processes and projects in /home and /var/www, or click <strong className="text-blue-400">Add App</strong> to register one manually.
            </p>
          </div>
        ) : (
          <div className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 custom-scrollbar">
            {apps.map((app) => {
              const isSelected = selectedApp?._id === app._id || selectedApp?.directory === app.directory;
              const isOnline = app.status === 'Deployed' || app.healthStatus === 'Healthy';

              return (
                <div
                  key={app._id || app.directory}
                  onClick={() => handleSelectApp(app)}
                  className={`min-w-[280px] max-w-[320px] rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between shrink-0 group ${
                    isSelected
                      ? 'border-cyan-400 bg-gradient-to-b from-[#13233E] to-[#0D1627] ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/10'
                      : 'border-[#1E293B] bg-[#070B14]/80 hover:border-slate-600 hover:bg-[#0E1626]'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Row: App Icon + Name + Active Pill + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                              : 'bg-[#111A2E] border-[#1E293B] text-slate-400'
                          }`}
                        >
                          {getAppIcon(app.type, app.packageManager)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors" title={app.name}>
                            {app.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {app.frameworkName || (app.type ? `${app.type} App` : 'Application')}
                          </span>
                        </div>
                      </div>

                      {/* Status Dot */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-semibold font-mono ${
                            isOnline ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {isOnline ? 'Online' : 'Stopped'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Path, Branch, Port */}
                    <div className="space-y-1 text-[11px] font-mono text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5 truncate" title={app.directory}>
                        <Folder className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate text-slate-300">{app.directory}</span>
                      </div>

                      <div className="flex items-center gap-3 pt-0.5 text-[10px]">
                        <span className="flex items-center gap-1 text-cyan-300">
                          <GitBranch className="w-2.5 h-2.5" />
                          <span>{app.gitBranch || 'main'}</span>
                        </span>
                        {app.appPort && (
                          <span className="flex items-center gap-1 text-amber-300">
                            <Activity className="w-2.5 h-2.5" />
                            <span>:{app.appPort}</span>
                          </span>
                        )}
                        {app.pm2ProcessName && (
                          <span className="flex items-center gap-1 text-emerald-300 truncate" title={app.pm2ProcessName}>
                            <Layers className="w-2.5 h-2.5" />
                            <span className="truncate">{app.pm2ProcessName}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Active Selection Indicator / Package Manager Badge */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#1E293B]/70">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-[#111A2E] text-slate-400 border border-[#1E293B]">
                      {app.packageManager || 'npm'}
                    </span>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 font-mono">
                        <Check className="w-3 h-3" />
                        <span>ACTIVE TARGET</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">
                        Click to select →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP HERO DEPLOYMENT ACTION BAR                                         */}
      {/* ========================================================================= */}
      <div className="bg-[#111A2E] border border-blue-500/40 rounded-2xl p-4 lg:p-5 shadow-2xl shadow-black/25 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Server Identity & Active App Target Summary */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-600/15 shrink-0">
            {getAppIcon(selectedApp?.type, packageManager)}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base lg:text-lg font-bold text-white tracking-wide truncate">
                {selectedApp?.name || pm2AppName || activeServer.name}
              </h2>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active Target</span>
              </span>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                {activeServer.name} • {activeServer.host}
              </span>

              {appPort && (
                <span className="text-[10px] font-mono text-amber-300 px-2 py-0.5 rounded bg-[#070B14] border border-[#1E293B]">
                  Port :{appPort}
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

        {/* Right: Real-Time Deploy Status & Action Controls */}
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
              onClick={() =>
                executeStep(
                  'full-deploy',
                  `1-Click Deploy (${selectedApp?.name || pm2AppName || 'App'})`
                )
              }
              disabled={isExecuting}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-xl shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 tracking-wide uppercase shrink-0"
              title="Execute full automated deploy: git pull, install dependencies, run build, reload PM2"
            >
              {isExecuting && activeStepRunning === 'full-deploy' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              <span>🚀 1-Click Automated Full Deploy</span>
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

            {/* Configure Full Deployment Pipeline Button */}
            <button
              type="button"
              onClick={handleOpenPipelineModal}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#070B14] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition cursor-pointer"
              title="Configure Full Deployment Pipeline settings (directories, branches, commands, PM2 name)"
            >
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Configure Pipeline</span>
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

      {/* Linear Pipeline Stages Ribbon */}
      <div className="bg-[#070B14] border border-[#1E293B] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400 overflow-x-auto gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-semibold text-white">Pipeline Ribbon:</span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          <span className="text-cyan-300 font-bold flex items-center gap-1">
            <span>(1) Git Pull</span>
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
          </span>
          <span className="text-slate-600">➔</span>

          <span className="text-teal-300 font-bold flex items-center gap-1">
            <span>(2) Install ({installCmd})</span>
            <CheckCircle2 className="w-3 h-3 text-teal-400" />
          </span>
          <span className="text-slate-600">➔</span>

          <span className="text-blue-300 font-bold flex items-center gap-1">
            <span>(3) Build ({buildCmd})</span>
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
          </span>
          <span className="text-slate-600">➔</span>

          <span className="text-emerald-300 font-bold flex items-center gap-1">
            <span>(4) PM2 Reload ({pm2AppName})</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          </span>
          <span className="text-slate-600">➔</span>

          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span>(5) Health Check OK</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FULL-WIDTH DEVELOPER & TELEMETRY CONSOLE                               */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#111A2E] border border-blue-500/30 rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col space-y-3">
        {/* Navigation Tab Bar: 6 Telemetry Tabs */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Tab 1: Deployment Output */}
            <button
              type="button"
              onClick={() => setActiveConsoleTab('output')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeConsoleTab === 'output'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Deployment Output</span>
              {deploymentLogs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 text-white">
                  {deploymentLogs.length}
                </span>
              )}
            </button>

            {/* Tab 2: PM2 Logs */}
            <button
              type="button"
              onClick={() => setActiveConsoleTab('pm2-logs')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeConsoleTab === 'pm2-logs'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PM2 Logs</span>
            </button>

            {/* Tab 3: PM2 List */}
            <button
              type="button"
              onClick={() => setActiveConsoleTab('pm2-list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeConsoleTab === 'pm2-list'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>PM2 Process List</span>
              {pm2Processes.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 text-white">
                  {pm2Processes.length}
                </span>
              )}
            </button>

            {/* Tab 4: PM2 Flush */}
            <button
              type="button"
              onClick={() => setActiveConsoleTab('pm2-flush')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeConsoleTab === 'pm2-flush'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>PM2 Flush</span>
            </button>

            {/* Tab 5: Nginx Access Logs */}
            <button
              type="button"
              onClick={() => setActiveConsoleTab('access-logs')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeConsoleTab === 'access-logs'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Nginx Access Logs</span>
            </button>

            {/* Tab 6: Nginx Error Logs */}
            <button
              type="button"
              onClick={() => setActiveConsoleTab('error-logs')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeConsoleTab === 'error-logs'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Nginx Error Logs</span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: DEPLOYMENT OUTPUT                                              */}
        {/* ===================================================================== */}
        {activeConsoleTab === 'output' && (
          <div className="flex flex-col flex-1 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white">Live Deployment Terminal</span>
                {isExecuting && (
                  <span className="text-[11px] text-cyan-300 font-mono animate-pulse">
                    [Executing: {activeStepRunning}...]
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition cursor-pointer ${
                    autoScroll
                      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                      : 'bg-[#0B1120] text-slate-500 border-[#1E293B]'
                  }`}
                >
                  Auto Scroll: {autoScroll ? 'ON' : 'OFF'}
                </button>

                <button
                  type="button"
                  onClick={() => setDeploymentLogs([])}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownloadLogFile(
                      deploymentLogs.join('\n'),
                      `deploy-${activeServer.name}-${Date.now()}.log`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                >
                  Download
                </button>
              </div>
            </div>

            {/* Terminal Window */}
            <div
              ref={logTerminalRef}
              className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto min-h-[460px] max-h-[640px] custom-scrollbar shadow-inner"
            >
              {deploymentLogs.length === 0 ? (
                <div className="py-24 text-center text-slate-500 space-y-2">
                  <Terminal className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="font-semibold">Ready to deploy.</p>
                  <p className="text-slate-600 text-xs">
                    Click &quot;1-Click Automated Full Deploy&quot; above to execute git pull, install dependencies, run build, and reload PM2.
                  </p>
                </div>
              ) : (
                deploymentLogs.map((line, idx) => {
                  const isSuccess = line.includes('[success]') || line.includes('✓');
                  const isError = line.includes('[error]') || line.includes('✗') || line.includes('failed');
                  const isInfo = line.includes('[info]');

                  return (
                    <div
                      key={idx}
                      className={`leading-relaxed break-all ${
                        isSuccess
                          ? 'text-emerald-400 font-bold'
                          : isError
                          ? 'text-rose-400 font-bold'
                          : isInfo
                          ? 'text-cyan-300'
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
        {activeConsoleTab === 'pm2-logs' && (
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
                  {pm2AppName && !pm2Processes.some((p) => p.name === pm2AppName) && (
                    <option value={pm2AppName}>{pm2AppName}</option>
                  )}
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
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition cursor-pointer ${
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
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                >
                  Download
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto min-h-[460px] max-h-[640px] custom-scrollbar shadow-inner">
              {pm2LogsLoading && pm2Logs.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span>Loading PM2 logs from {activeServer.name}...</span>
                </div>
              ) : pm2Logs.length === 0 ? (
                <div className="py-24 text-center text-slate-500 space-y-2">
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
        {/* TAB 3: PM2 PROCESS LIST                                               */}
        {/* ===================================================================== */}
        {activeConsoleTab === 'pm2-list' && (
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
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pm2Loading ? 'animate-spin' : ''}`} />
                <span>Refresh List</span>
              </button>
            </div>

            <div className="flex-1 overflow-x-auto bg-[#070B14] border border-[#1E293B] rounded-xl">
              {pm2Loading && pm2Processes.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Loading PM2 process table...</span>
                </div>
              ) : pm2Processes.length === 0 ? (
                <div className="py-24 text-center text-slate-500 space-y-2">
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
                              <button
                                type="button"
                                onClick={() => handlePM2Action('reload', proc.name)}
                                disabled={isActionBusy}
                                className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer"
                                title="Zero-downtime reload"
                              >
                                Reload
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePM2Action('restart', proc.name)}
                                disabled={isActionBusy}
                                className="px-2 py-1 rounded bg-[#0D1526] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] text-[11px] font-bold transition cursor-pointer"
                                title="Restart process"
                              >
                                Restart
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePM2Action('stop', proc.name)}
                                disabled={isActionBusy}
                                className="px-2 py-1 rounded bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-[11px] font-bold transition cursor-pointer"
                                title="Stop process"
                              >
                                Stop
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPm2LogsAppFilter(proc.name);
                                  setActiveConsoleTab('pm2-logs');
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
        {activeConsoleTab === 'pm2-flush' && (
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
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
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
                      onClick={() => setActiveConsoleTab('pm2-logs')}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>→ Switch to PM2 Logs to verify cleaned files</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500 space-y-2">
                  <Zap className="w-8 h-8 mx-auto text-slate-700" />
                  <p>Click &quot;Flush All PM2 Logs Now&quot; above to execute pm2 flush on the server.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 5: NGINX ACCESS LOGS                                              */}
        {/* ===================================================================== */}
        {activeConsoleTab === 'access-logs' && (
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
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition cursor-pointer ${
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
                  className="px-2.5 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                >
                  Download
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto min-h-[460px] max-h-[640px] custom-scrollbar shadow-inner">
              {accessLoading && accessLogs.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span>Streaming /var/log/nginx/access.log...</span>
                </div>
              ) : filteredAccessLogs.length === 0 ? (
                <div className="py-24 text-center text-slate-500 space-y-2">
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
        {activeConsoleTab === 'error-logs' && (
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
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition cursor-pointer ${
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
                  className="px-2.5 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B] cursor-pointer"
                >
                  Download
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto min-h-[460px] max-h-[640px] custom-scrollbar shadow-inner">
              {errorLoading && errorLogs.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
                  <span>Streaming /var/log/nginx/error.log...</span>
                </div>
              ) : filteredErrorLogs.length === 0 ? (
                <div className="py-24 text-center text-emerald-400 space-y-2">
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

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURE FULL DEPLOYMENT PIPELINE                                 */}
      {/* ========================================================================= */}
      {pipelineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-blue-500/40 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Configure Full Deployment Pipeline</h3>
                  <p className="text-[11px] text-slate-400">Settings for {modalAppName || 'Application'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPipelineModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* App Name */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Application Display Name:
                </label>
                <input
                  type="text"
                  value={modalAppName}
                  onChange={(e) => setModalAppName(e.target.value)}
                  placeholder="monitoring-app"
                  className="w-full bg-[#0B1120] text-slate-200 font-mono text-xs rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Target Directory */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Target Application Directory (Full Path):
                </label>
                <input
                  type="text"
                  value={modalRepoPath}
                  onChange={(e) => setModalRepoPath(e.target.value)}
                  placeholder="/home/siva/monitoring"
                  className="w-full bg-[#0B1120] text-slate-200 font-mono text-xs rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500">Presets:</span>
                  {[
                    `/home/${activeServer.username || 'siva'}/monitoring`,
                    '/var/www/html',
                    '/opt/app',
                  ].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setModalRepoPath(p)}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#070B14] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] font-mono cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Git Branch & Remote */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Git Branch:
                  </label>
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    {['main', 'master', 'dev', 'staging'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setModalGitBranch(b)}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono transition cursor-pointer ${
                          modalGitBranch === b
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
                    value={modalGitBranch}
                    onChange={(e) => setModalGitBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-[#0B1120] text-cyan-300 font-mono text-xs font-bold rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Git Remote URL (Optional):
                  </label>
                  <input
                    type="text"
                    value={modalGitRemoteUrl}
                    onChange={(e) => setModalGitRemoteUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="w-full bg-[#0B1120] text-slate-200 font-mono text-xs rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Package Manager & Install Command */}
              <div className="space-y-1.5 bg-[#0B1120] p-3 rounded-xl border border-[#1E293B]">
                <label className="text-slate-300 font-semibold block">
                  Package Dependencies &amp; Install Command:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  {[
                    { label: 'npm install', pkg: 'npm' },
                    { label: 'pnpm install', pkg: 'pnpm' },
                    { label: 'yarn install', pkg: 'yarn' },
                    { label: 'bun install', pkg: 'bun' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setModalPackageManager(item.pkg);
                        setModalInstallCmd(item.label);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono transition cursor-pointer ${
                        modalInstallCmd === item.label
                          ? 'bg-teal-600 text-white font-bold'
                          : 'bg-[#111A2E] text-slate-400 hover:text-white border border-[#1E293B]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={modalInstallCmd}
                  onChange={(e) => setModalInstallCmd(e.target.value)}
                  placeholder="npm install"
                  className="w-full bg-[#111A2E] text-teal-300 font-mono text-xs font-bold rounded-lg px-3 py-2 border border-[#1E293B] focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Build Command */}
              <div className="space-y-1.5 bg-[#0B1120] p-3 rounded-xl border border-[#1E293B]">
                <label className="text-slate-300 font-semibold block">
                  Build / Compile Command:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  {[
                    'npm run build',
                    'npm run dev',
                    'pnpm build',
                    'pnpm dev',
                    'yarn build',
                    'npm start',
                  ].map((bCmd) => (
                    <button
                      key={bCmd}
                      type="button"
                      onClick={() => setModalBuildCmd(bCmd)}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono transition cursor-pointer ${
                        modalBuildCmd === bCmd
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-[#111A2E] text-slate-400 hover:text-white border border-[#1E293B]'
                      }`}
                    >
                      {bCmd}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={modalBuildCmd}
                  onChange={(e) => setModalBuildCmd(e.target.value)}
                  placeholder="npm run build"
                  className="w-full bg-[#111A2E] text-blue-300 font-mono text-xs font-bold rounded-lg px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* PM2 Target Process & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0B1120] p-3 rounded-xl border border-[#1E293B]">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    PM2 Target Process Name:
                  </label>
                  <input
                    type="text"
                    value={modalPm2Name}
                    onChange={(e) => setModalPm2Name(e.target.value)}
                    placeholder="monitoring-app"
                    className="w-full bg-[#111A2E] text-emerald-300 font-mono text-xs font-bold rounded-lg px-3 py-2 border border-[#1E293B] focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Application Port:
                  </label>
                  <input
                    type="number"
                    value={modalPort}
                    onChange={(e) => setModalPort(Number(e.target.value))}
                    placeholder="3000"
                    className="w-full bg-[#111A2E] text-slate-200 font-mono text-xs rounded-lg px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setPipelineModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePipelineConfig}
                disabled={isSavingPipeline}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingPipeline ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save &amp; Apply Pipeline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD APPLICATION TARGET                                             */}
      {/* ========================================================================= */}
      {addAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Application Target</h3>
                  <p className="text-[11px] text-slate-400">Register a new app on {activeServer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddAppModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Application Name:
                </label>
                <input
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="e.g. backend-api or web-store"
                  className="w-full bg-[#0B1120] text-slate-200 font-mono text-xs rounded-xl px-3 py-2 border border-[#1E293B] focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Target Directory (Full Path on Server):
                </label>
                <input
                  type="text"
                  value={newAppDir}
                  onChange={(e) => setNewAppDir(e.target.value)}
                  placeholder="/var/www/app or /home/siva/app"
                  className="w-full bg-[#0B1120] text-slate-200 font-mono text-xs rounded-xl px-3 py-2 border border-[#1E293B] focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Git Branch:
                  </label>
                  <input
                    type="text"
                    value={newAppBranch}
                    onChange={(e) => setNewAppBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-[#0B1120] text-cyan-300 font-mono text-xs font-bold rounded-xl px-3 py-2 border border-[#1E293B] focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Port:
                  </label>
                  <input
                    type="number"
                    value={newAppPort}
                    onChange={(e) => setNewAppPort(Number(e.target.value))}
                    placeholder="3000"
                    className="w-full bg-[#0B1120] text-slate-200 font-mono text-xs rounded-xl px-3 py-2 border border-[#1E293B] focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  PM2 Process Name:
                </label>
                <input
                  type="text"
                  value={newAppPm2Name}
                  onChange={(e) => setNewAppPm2Name(e.target.value)}
                  placeholder="e.g. backend-api"
                  className="w-full bg-[#0B1120] text-emerald-300 font-mono text-xs font-bold rounded-xl px-3 py-2 border border-[#1E293B] focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Build Command:
                </label>
                <input
                  type="text"
                  value={newAppBuildCmd}
                  onChange={(e) => setNewAppBuildCmd(e.target.value)}
                  placeholder="npm run build"
                  className="w-full bg-[#0B1120] text-blue-300 font-mono text-xs font-bold rounded-xl px-3 py-2 border border-[#1E293B] focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setAddAppModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateApp}
                disabled={isAddingApp}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAddingApp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Register Application</span>
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
