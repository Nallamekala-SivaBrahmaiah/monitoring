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
  Square,
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

export function NginxApplicationsTab({
  activeServer,
  onNavigateToHistory,
}: NginxApplicationsTabProps) {
  // ---------------------------------------------------------------------------
  // 1. Applications & Discovery State
  // ---------------------------------------------------------------------------
  const [apps, setApps] = useState<INginxAppData[]>([]);
  const [selectedApp, setSelectedApp] = useState<INginxAppData | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<RightPaneTab>('output');

  // Deployment & Pipeline state
  const [isDeploying, setIsDeploying] = useState(false);
  const [runningQuickCommand, setRunningQuickCommand] = useState<string | null>(null);
  const [deployProgress, setDeployProgress] = useState<{
    status: 'idle' | 'deploying' | 'success' | 'failed' | 'rolled_back';
    stepMessage: string;
    percentage: number;
    duration?: string;
  }>({
    status: 'idle',
    stepMessage: 'Ready to deploy',
    percentage: 0,
  });

  // Console / Terminal Output State
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
  const [addAppModalOpen, setAddAppModalOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [targetBranch, setTargetBranch] = useState('main');
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Form State for Adding New App
  const [newAppForm, setNewAppForm] = useState({
    name: '',
    type: 'nodejs' as INginxAppData['type'],
    frameworkName: '',
    directory: '',
    gitRepoUrl: '',
    gitBranch: 'main',
    packageManager: 'auto' as INginxAppData['packageManager'],
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    pm2ProcessName: '',
    appPort: 3000,
    iconType: 'layers' as INginxAppData['iconType'],
  });

  // ---------------------------------------------------------------------------
  // Helper: Copy Text
  // ---------------------------------------------------------------------------
  const handleCopyText = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ---------------------------------------------------------------------------
  // Data Fetching: Applications
  // ---------------------------------------------------------------------------
  const fetchApps = useCallback(async () => {
    if (!activeServer?._id) return;
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps`);
      const data = await res.json();
      if (res.ok && data.apps) {
        setApps(data.apps);
        setSelectedApp((prev) => {
          if (prev) {
            const updated = data.apps.find((a: INginxAppData) => a._id === prev._id);
            return updated || data.apps[0] || null;
          }
          return data.apps[0] || null;
        });

        if (data.apps.length > 0) {
          const first = data.apps[0];
          if (first.lastDeployedAt) {
            setDeployProgress({
              status: first.status === 'Failed' ? 'failed' : 'success',
              stepMessage:
                first.status === 'Failed'
                  ? `Last deployment failed for ${first.name}`
                  : `${first.name} deployed successfully on ${first.gitBranch || 'main'}${
                      first.lastDeploymentDuration ? ` in ${first.lastDeploymentDuration}` : ''
                    }`,
              percentage: 100,
              duration: first.lastDeploymentDuration,
            });
          }
        }
      }
    } catch (err: any) {
      showToast('error', `Failed to load applications: ${err.message}`);
    } finally {
      setLoadingApps(false);
    }
  }, [activeServer?._id]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // ---------------------------------------------------------------------------
  // Data Fetching: PM2 List
  // ---------------------------------------------------------------------------
  const fetchPM2List = useCallback(async () => {
    if (!activeServer?._id) return;
    setPm2Loading(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pm2`);
      const data = await res.json();
      if (res.ok && data.processes) {
        setPm2Processes(data.processes);
      }
    } catch (err) {
      console.error('Failed to fetch PM2 list:', err);
    } finally {
      setPm2Loading(false);
    }
  }, [activeServer?._id]);

  // ---------------------------------------------------------------------------
  // Data Fetching: PM2 Logs
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Data Fetching: Nginx Access Logs
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Data Fetching: Nginx Error Logs
  // ---------------------------------------------------------------------------
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

  // Fetch data when activeRightTab changes
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

  // Auto-refresh timers for PM2 logs, Access logs, and Error logs
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

  // Auto scroll deployment log terminal
  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [deploymentLogs, autoScroll]);

  // ---------------------------------------------------------------------------
  // Action: 1-Click Automated Full Deploy
  // ---------------------------------------------------------------------------
  const handleDeployLatest = async (branchOverride?: string) => {
    if (!activeServer?._id || !selectedApp?._id) return;
    const branchToDeploy = branchOverride || selectedApp.gitBranch || 'main';

    setActiveRightTab('output');
    setIsDeploying(true);
    setDeployProgress({
      status: 'deploying',
      stepMessage: `Initiating automated deployment for ${selectedApp.name}...`,
      percentage: 15,
    });

    const now = () => new Date().toTimeString().split(' ')[0];
    setDeploymentLogs([
      `[${now()}] [info] Starting 1-Click Automated Deployment for ${selectedApp.name}...`,
      `[${now()}] [info] Target Server: ${activeServer.name} (${activeServer.host || activeServer.publicIp})`,
      `[${now()}] [info] Application Directory: ${selectedApp.directory} | Target Branch: ${branchToDeploy}`,
      `[${now()}] [info] Connecting via secure SSH infrastructure...`,
    ]);

    try {
      const res = await fetch(
        `/api/nginx/servers/${activeServer._id}/apps/${selectedApp._id}/deploy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch: branchToDeploy }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setDeployProgress({
          status: 'success',
          stepMessage: `Deployment Successful! ${selectedApp.name} deployed in ${
            data.durationFormatted || 'real-time'
          }`,
          percentage: 100,
          duration: data.durationFormatted,
        });

        if (data.logs) {
          const lines = data.logs.split('\n').filter((l: string) => l.trim().length > 0);
          setDeploymentLogs(lines);
        } else {
          setDeploymentLogs((prev) => [
            ...prev,
            `[${now()}] [success] Deployment completed successfully!`,
          ]);
        }

        showToast('success', `${selectedApp.name} deployed successfully!`);
        fetchApps();
        if (activeRightTab === 'pm2-list') fetchPM2List();
      } else {
        const errorMsg = data.error || 'Deployment failed';
        setDeployProgress({
          status: data.rolledBack ? 'rolled_back' : 'failed',
          stepMessage: data.rolledBack
            ? `Deployment Failed! Automatically rolled back to ${
                data.previousCommit?.slice(0, 7) || 'previous release'
              }`
            : `Deployment Failed: ${errorMsg}`,
          percentage: 100,
        });

        if (data.logs) {
          const lines = data.logs.split('\n').filter((l: string) => l.trim().length > 0);
          setDeploymentLogs(lines);
        } else {
          setDeploymentLogs((prev) => [...prev, `[${now()}] [error] Deployment failed: ${errorMsg}`]);
        }

        showToast('error', `Deployment failed: ${errorMsg}`);
        fetchApps();
      }
    } catch (err: any) {
      setDeployProgress({
        status: 'failed',
        stepMessage: `Deployment error: ${err.message}`,
        percentage: 100,
      });
      setDeploymentLogs((prev) => [...prev, `[error] Network or execution failure: ${err.message}`]);
      showToast('error', err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action: Quick Pipeline Command
  // ---------------------------------------------------------------------------
  const handleQuickCommand = async (commandKey: string, customLabel?: string) => {
    if (!activeServer?._id || !selectedApp?._id) return;
    const now = () => new Date().toTimeString().split(' ')[0];

    setActiveRightTab('output');
    setRunningQuickCommand(commandKey);
    setDeploymentLogs((prev) => [
      ...prev,
      `[${now()}] [info] Executing: ${customLabel || commandKey} in ${selectedApp.directory}...`,
    ]);

    try {
      const res = await fetch(
        `/api/nginx/servers/${activeServer._id}/apps/${selectedApp._id}/command`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: commandKey }),
        }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        const outputLines = (data.output || 'Command executed with exit code 0.').split('\n');
        setDeploymentLogs((prev) => [
          ...prev,
          ...outputLines,
          `[${now()}] [success] ✓ ${customLabel || commandKey} completed successfully.`,
        ]);
        showToast('success', `${customLabel || commandKey} completed!`);
      } else {
        setDeploymentLogs((prev) => [
          ...prev,
          `[${now()}] [error] Command failed: ${data.output || data.error}`,
        ]);
        showToast('error', `${customLabel || commandKey} failed.`);
      }
    } catch (err: any) {
      setDeploymentLogs((prev) => [...prev, `[${now()}] [error] Execution error: ${err.message}`]);
      showToast('error', err.message);
    } finally {
      setRunningQuickCommand(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Action: Rollback
  // ---------------------------------------------------------------------------
  const handleRollback = async () => {
    if (!activeServer?._id || !selectedApp?._id) return;
    setRollbackConfirmOpen(false);
    setActiveRightTab('output');
    const now = () => new Date().toTimeString().split(' ')[0];

    setDeployProgress({
      status: 'deploying',
      stepMessage: `Rolling back ${selectedApp.name} to previous working release...`,
      percentage: 50,
    });
    setDeploymentLogs((prev) => [
      ...prev,
      `[${now()}] [warn] Initiating rollback for ${selectedApp.name}...`,
    ]);

    try {
      const res = await fetch(
        `/api/nginx/servers/${activeServer._id}/apps/${selectedApp._id}/rollback`,
        {
          method: 'POST',
        }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setDeployProgress({
          status: 'success',
          stepMessage: `Rollback Successful! Restored commit ${
            data.commitRestored?.slice(0, 7) || 'previous release'
          }`,
          percentage: 100,
        });
        setDeploymentLogs((prev) => [
          ...prev,
          ...(data.output ? data.output.split('\n') : []),
          `[${now()}] [success] ✓ Application restored and reloaded with PM2!`,
        ]);
        showToast('success', 'Rollback completed successfully!');
        fetchApps();
      } else {
        setDeployProgress({
          status: 'failed',
          stepMessage: `Rollback failed: ${data.error}`,
          percentage: 100,
        });
        showToast('error', data.error || 'Rollback failed.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // Action: PM2 Process Action (Reload / Restart / Stop)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Action: PM2 Flush
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Action: Add Application
  // ---------------------------------------------------------------------------
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServer?._id || !newAppForm.name || !newAppForm.directory) return;

    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Application "${newAppForm.name}" registered!`);
        setAddAppModalOpen(false);
        setNewAppForm({
          name: '',
          type: 'nodejs',
          frameworkName: '',
          directory: '',
          gitRepoUrl: '',
          gitBranch: 'main',
          packageManager: 'auto',
          buildCommand: 'npm run build',
          startCommand: 'npm start',
          pm2ProcessName: '',
          appPort: 3000,
          iconType: 'layers',
        });
        fetchApps();
      } else {
        showToast('error', data.error || 'Failed to create application.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Download Logs Helper
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
      {/* TOP CONTEXT BAR: APPLICATION SELECTOR & REPO HERO */}
      {/* ========================================================================= */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: App Dropdown & Metadata */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-600/10 shrink-0">
            <Package className="w-6 h-6 text-blue-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {apps.length > 1 ? (
                <div className="relative">
                  <select
                    value={selectedApp?._id || ''}
                    onChange={(e) => {
                      const found = apps.find((a) => a._id === e.target.value);
                      if (found) setSelectedApp(found);
                    }}
                    className="bg-[#0B1120] text-white font-bold text-base rounded-xl px-3 py-1 pr-8 border border-blue-500/40 focus:outline-none appearance-none cursor-pointer"
                  >
                    {apps.map((a) => (
                      <option key={a._id} value={a._id} className="bg-[#111A2E] text-white">
                        {a.name} ({a.directory})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <h2 className="text-base lg:text-lg font-bold text-white tracking-wide truncate">
                  {selectedApp ? selectedApp.name : 'Application Deployment Center'}
                </h2>
              )}

              {selectedApp && (
                <>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${
                      selectedApp.status === 'Failed'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : selectedApp.status === 'Building'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {selectedApp.status || 'Deployed'}
                  </span>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Port: {selectedApp.appPort || 3000}
                  </span>
                </>
              )}
            </div>

            {selectedApp ? (
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono flex-wrap">
                <span className="truncate max-w-xs" title={selectedApp.directory}>
                  Directory: <strong className="text-slate-200">{selectedApp.directory}</strong>
                </span>
                <span className="text-slate-600">|</span>
                <span>
                  Branch: <strong className="text-cyan-300 font-bold">{selectedApp.gitBranch || 'main'}</strong>
                </span>
                <span className="text-slate-600">|</span>
                <span>
                  PM2 Process: <strong className="text-emerald-300">{selectedApp.pm2ProcessName || selectedApp.name}</strong>
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">
                Manage, deploy, monitor, and reload applications on this server.
              </p>
            )}
          </div>
        </div>

        {/* Right: GitHub Link & Add App Button */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {selectedApp?.gitRepoUrl && (
            <a
              href={selectedApp.gitRepoUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}

          <button
            type="button"
            onClick={() => setAddAppModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add App</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODEL 3: ENTERPRISE TWO-PANE DEPLOYMENT WORKBENCH */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ======================================================================= */}
        {/* LEFT PANE: DEVOPS PIPELINE ACCORDION & QUICK ACTION TRIGGERS (38% WIDTH) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* 1. Accordion Step 1: Git Source & Repository */}
          <div className="bg-[#111A2E] border border-blue-500/30 rounded-2xl p-4 shadow-xl shadow-black/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                  1
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  Source &amp; Git Repository
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Connected
              </span>
            </div>

            <div className="bg-[#0B1120] rounded-xl p-3 border border-[#1E293B] space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold text-slate-400">Target Path:</span>
                <span className="font-mono text-slate-200 truncate max-w-[200px]" title={selectedApp?.directory}>
                  {selectedApp?.directory || '/home/siva/monitoring'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold text-slate-400">Branch:</span>
                <span className="font-mono text-cyan-300 font-bold flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-cyan-400" />
                  {selectedApp?.gitBranch || 'main'}
                </span>
              </div>
            </div>

            {/* Quick Git Triggers */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickCommand('git-status', 'git status')}
                disabled={runningQuickCommand !== null || isDeploying}
                className="py-2 px-2.5 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Check git status"
              >
                {runningQuickCommand === 'git-status' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                ) : (
                  <Terminal className="w-3 h-3 text-blue-400" />
                )}
                <span>Status</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCommand('git-fetch', 'git fetch')}
                disabled={runningQuickCommand !== null || isDeploying}
                className="py-2 px-2.5 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Fetch latest remote commits"
              >
                {runningQuickCommand === 'git-fetch' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                ) : (
                  <RefreshCw className="w-3 h-3 text-purple-400" />
                )}
                <span>Fetch</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCommand('git-pull', 'git pull')}
                disabled={runningQuickCommand !== null || isDeploying}
                className="py-2 px-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Pull latest code from branch"
              >
                {runningQuickCommand === 'git-pull' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-purple-300" />
                ) : (
                  <Download className="w-3 h-3 text-purple-300" />
                )}
                <span>Pull</span>
              </button>
            </div>
          </div>

          {/* 2. Accordion Step 2: Package Dependencies */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/30">
                  2
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  Package Dependencies
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20">
                {selectedApp?.packageManager === 'pnpm'
                  ? 'pnpm-lock.yaml'
                  : selectedApp?.type === 'java-maven'
                  ? 'pom.xml'
                  : 'package-lock.json'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#0B1120] rounded-xl px-3 py-2 border border-[#1E293B] text-xs">
              <span className="text-slate-400 font-semibold">Command:</span>
              <span className="font-mono text-teal-300">
                {selectedApp?.type === 'java-maven'
                  ? 'mvn clean'
                  : selectedApp?.packageManager === 'pnpm'
                  ? 'pnpm install'
                  : 'npm install'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const cmd =
                  selectedApp?.type === 'java-maven'
                    ? 'mvn-package'
                    : selectedApp?.packageManager === 'pnpm'
                    ? 'pnpm-install'
                    : 'npm-install';
                handleQuickCommand(cmd, 'Dependency Install');
              }}
              disabled={runningQuickCommand !== null || isDeploying}
              className="w-full py-2 rounded-xl bg-teal-600/15 hover:bg-teal-600/25 text-teal-300 hover:text-white border border-teal-500/30 text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {runningQuickCommand === 'npm-install' || runningQuickCommand === 'pnpm-install' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              ) : (
                <Wrench className="w-3.5 h-3.5 text-teal-400" />
              )}
              <span>Install Dependencies</span>
            </button>
          </div>

          {/* 3. Accordion Step 3: Build & Compile */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                  3
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  Build &amp; Compile Pipeline
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {selectedApp?.frameworkName || 'Next.js Turbopack'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#0B1120] rounded-xl px-3 py-2 border border-[#1E293B] text-xs">
              <span className="text-slate-400 font-semibold">Build Command:</span>
              <span className="font-mono text-blue-300">
                {selectedApp?.buildCommand || 'npm run build'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleQuickCommand('build', 'npm run build')}
              disabled={runningQuickCommand !== null || isDeploying}
              className="w-full py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {runningQuickCommand === 'build' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              ) : (
                <Play className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>Run Project Build</span>
            </button>
          </div>

          {/* 4. Accordion Step 4: PM2 Runtime Process */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  4
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  PM2 Process Lifecycle
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online</span>
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#0B1120] rounded-xl px-3 py-2 border border-[#1E293B] text-xs">
              <span className="text-slate-400 font-semibold">Process Target:</span>
              <span className="font-mono text-emerald-300 font-bold">
                {selectedApp?.pm2ProcessName || selectedApp?.name || 'monitoring-app'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickCommand('pm2-reload', 'pm2 reload')}
                disabled={runningQuickCommand !== null || isDeploying}
                className="py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Zero-downtime cluster reload"
              >
                {runningQuickCommand === 'pm2-reload' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                ) : (
                  <Zap className="w-3 h-3 text-emerald-400" />
                )}
                <span>PM2 Reload</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCommand('pm2-restart', 'pm2 restart')}
                disabled={runningQuickCommand !== null || isDeploying}
                className="py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Restart process"
              >
                {runningQuickCommand === 'pm2-restart' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                ) : (
                  <Play className="w-3 h-3 text-slate-400" />
                )}
                <span>PM2 Restart</span>
              </button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* PRIMARY WORKBENCH ACTION: 1-CLICK AUTOMATED DEPLOYMENT & ROLLBACK */}
          {/* ===================================================================== */}
          <div className="bg-[#111A2E] border border-blue-500/40 rounded-2xl p-4 shadow-2xl shadow-black/30 space-y-3">
            {/* Deploy Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  {deployProgress.status === 'deploying' ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  ) : deployProgress.status === 'failed' ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>
                    {deployProgress.status === 'deploying'
                      ? 'Deploying Pipeline...'
                      : deployProgress.status === 'failed'
                      ? 'Deployment Failed'
                      : deployProgress.status === 'rolled_back'
                      ? 'Rolled Back'
                      : 'Deployment Ready'}
                  </span>
                </span>
                <span className="font-mono font-bold text-cyan-300">
                  {deployProgress.percentage}%
                </span>
              </div>

              <div className="w-full bg-[#0B1120] rounded-full h-2 overflow-hidden border border-[#1E293B]">
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

              <p className="text-[11px] text-slate-400 truncate" title={deployProgress.stepMessage}>
                {deployProgress.stepMessage}
              </p>
            </div>

            {/* 1-Click Automated Full Deploy Rocket Button */}
            <button
              type="button"
              onClick={() => handleDeployLatest()}
              disabled={isDeploying || runningQuickCommand !== null}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tracking-wide uppercase"
            >
              {isDeploying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              <span>🚀 1-Click Automated Full Deploy</span>
            </button>

            {/* Rollback & History buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRollbackConfirmOpen(true)}
                disabled={isDeploying || runningQuickCommand !== null}
                className="py-2 px-3 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>⏮ Rollback</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToHistory) onNavigateToHistory();
                  else showToast('success', 'Navigating to Deployment History...');
                }}
                className="py-2 px-3 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-purple-400" />
                <span>History</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANE: MULTI-TAB WORKBENCH CONSOLE (62% WIDTH) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col space-y-3 min-h-[580px]">
          {/* Sub-Tabs Switcher Bar (The 6 Requested Operations Tabs) */}
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
          {/* TAB 1: DEPLOYMENT OUTPUT (LIVE STREAMING EXECUTION LOGS) */}
          {/* ===================================================================== */}
          {activeRightTab === 'output' && (
            <div className="flex flex-col flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isDeploying || runningQuickCommand
                        ? 'bg-blue-400 animate-ping'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span className="font-mono">
                    {isDeploying
                      ? 'Executing Full Pipeline...'
                      : runningQuickCommand
                      ? `Running ${runningQuickCommand}...`
                      : 'Live Output Terminal'}
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
                        `${selectedApp?.name || 'app'}-deploy.log`
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
                className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto max-h-[500px] min-h-[420px] custom-scrollbar shadow-inner"
              >
                {deploymentLogs.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 space-y-2">
                    <Terminal className="w-8 h-8 mx-auto text-slate-700" />
                    <p>Ready to deploy.</p>
                    <p className="text-[11px]">
                      Click "1-Click Automated Full Deploy" or any quick command on the left to
                      execute operations on {activeServer.name}.
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
          {/* TAB 2: PM2 LOGS */}
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
              <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto max-h-[500px] min-h-[420px] custom-scrollbar shadow-inner">
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
          {/* TAB 3: PM2 LIST */}
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
          {/* TAB 4: PM2 FLUSH */}
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
                      Flushes and truncates all active PM2 log files (<code className="text-amber-300">~/.pm2/logs/*.log</code>)
                      on remote server <strong className="text-slate-200">{activeServer.name}</strong>.
                      This operation is safe to run on production; it reclaims disk space instantly without restarting your running applications.
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
              <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto max-h-[350px] min-h-[250px] custom-scrollbar shadow-inner">
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
          {/* TAB 5: NGINX ACCESS LOGS */}
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
              <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto max-h-[500px] min-h-[420px] custom-scrollbar shadow-inner">
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
          {/* TAB 6: NGINX ERROR LOGS */}
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
              <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-y-auto max-h-[500px] min-h-[420px] custom-scrollbar shadow-inner">
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
      {/* MODAL: ADD APPLICATION */}
      {/* ========================================================================= */}
      {addAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>Register Application on {activeServer.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddAppModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApp} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Application Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. monitoring-app"
                  value={newAppForm.name}
                  onChange={(e) =>
                    setNewAppForm({
                      ...newAppForm,
                      name: e.target.value,
                      pm2ProcessName: newAppForm.pm2ProcessName || e.target.value,
                    })
                  }
                  className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Server Directory Path *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. /home/siva/monitoring"
                  value={newAppForm.directory}
                  onChange={(e) => setNewAppForm({ ...newAppForm, directory: e.target.value })}
                  className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Git Repository URL</label>
                  <input
                    type="text"
                    placeholder="https://github.com/org/repo"
                    value={newAppForm.gitRepoUrl}
                    onChange={(e) => setNewAppForm({ ...newAppForm, gitRepoUrl: e.target.value })}
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Default Branch</label>
                  <input
                    type="text"
                    placeholder="main"
                    value={newAppForm.gitBranch}
                    onChange={(e) => setNewAppForm({ ...newAppForm, gitBranch: e.target.value })}
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">PM2 Process Name</label>
                  <input
                    type="text"
                    placeholder="monitoring-app"
                    value={newAppForm.pm2ProcessName}
                    onChange={(e) => setNewAppForm({ ...newAppForm, pm2ProcessName: e.target.value })}
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Port</label>
                  <input
                    type="number"
                    value={newAppForm.appPort}
                    onChange={(e) => setNewAppForm({ ...newAppForm, appPort: Number(e.target.value) })}
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:border-blue-500 focus:outline-none font-mono"
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
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ROLLBACK CONFIRMATION */}
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
                  Rollback {selectedApp?.name} to previous working git commit?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-[#0B1120] p-3 rounded-xl border border-[#1E293B] leading-relaxed">
              This will execute a safe rollback to the previous commit on{' '}
              <strong className="text-white">{activeServer.name}</strong>, rebuild the project,
              and reload the PM2 cluster with zero downtime.
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
                onClick={handleRollback}
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
