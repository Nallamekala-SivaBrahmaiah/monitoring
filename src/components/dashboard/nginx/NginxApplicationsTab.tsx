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
  Loader2,
  Shuffle,
  X,
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

export function NginxApplicationsTab({
  activeServer,
  onNavigateToHistory,
}: NginxApplicationsTabProps) {
  const [apps, setApps] = useState<INginxAppData[]>([]);
  const [selectedApp, setSelectedApp] = useState<INginxAppData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingApps, setLoadingApps] = useState(false);

  // Deployment & Action states
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState<{
    status: 'idle' | 'deploying' | 'success' | 'failed' | 'rolled_back';
    stepMessage: string;
    percentage: number;
    duration?: string;
  }>({
    status: 'idle',
    stepMessage: '',
    percentage: 0,
  });

  // Live Logs state
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Modals
  const [addAppModalOpen, setAddAppModalOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [targetBranch, setTargetBranch] = useState('main');
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);

  // New App Form State
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

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Registered Applications
  const fetchApps = useCallback(async () => {
    if (!activeServer?._id) return;
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps`);
      const data = await res.json();
      if (res.ok && data.apps) {
        setApps(data.apps);
        // Default to first application or preserve selected app
        setSelectedApp((prev) => {
          if (prev) {
            const updated = data.apps.find((a: INginxAppData) => a._id === prev._id);
            return updated || data.apps[0] || null;
          }
          return data.apps[0] || null;
        });

        // Initialize deployment state for first app based on real data
        if (data.apps.length > 0) {
          const first = data.apps[0];
          if (first.lastDeployedAt) {
            setDeployProgress({
              status: first.status === 'Failed' ? 'failed' : 'success',
              stepMessage: first.status === 'Failed'
                ? `Last deployment failed for ${first.name}`
                : `${first.name} deployed successfully on ${first.gitBranch || 'main'}${first.lastDeploymentDuration ? ` in ${first.lastDeploymentDuration}` : ''}`,
              percentage: 100,
              duration: first.lastDeploymentDuration,
            });
          } else {
            setDeployProgress({
              status: 'idle',
              stepMessage: 'Ready to deploy',
              percentage: 0,
            });
          }
        } else {
          setDeployProgress({
            status: 'idle',
            stepMessage: '',
            percentage: 0,
          });
          setLogs([]);
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

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // When selected app changes, update logs preview based on real status
  const handleSelectApp = (app: INginxAppData) => {
    setSelectedApp(app);
    if (app.lastDeployedAt) {
      setDeployProgress({
        status: app.status === 'Failed' ? 'failed' : 'success',
        stepMessage: app.status === 'Failed'
          ? `Last deployment failed for ${app.name}`
          : `${app.name} deployed successfully on ${app.gitBranch || 'main'}${app.lastDeploymentDuration ? ` in ${app.lastDeploymentDuration}` : ''}`,
        percentage: 100,
        duration: app.lastDeploymentDuration,
      });
    } else {
      setDeployProgress({
        status: 'idle',
        stepMessage: 'Ready to deploy',
        percentage: 0,
      });
    }
  };

  // 2. ONE-CLICK DEPLOY LATEST CODE
  const handleDeployLatest = async (branchOverride?: string) => {
    if (!activeServer?._id || !selectedApp?._id) return;
    const branchToDeploy = branchOverride || selectedApp.gitBranch || 'main';

    setIsDeploying(true);
    setDeployProgress({
      status: 'deploying',
      stepMessage: `Starting deployment for ${selectedApp.name}...`,
      percentage: 15,
    });

    const now = () => new Date().toTimeString().split(' ')[0];
    const initialLogs = [
      `[${now()}] [info] Starting deployment workflow for ${selectedApp.name}...`,
      `[${now()}] [info] Target Server: ${activeServer.name} (${activeServer.host}) | Branch: ${branchToDeploy}`,
      `[${now()}] [info] Establishing secure SSH connection to execute deployment pipeline...`,
    ];
    setLogs(initialLogs);

    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps/${selectedApp._id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: branchToDeploy }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setDeployProgress({
          status: 'success',
          stepMessage: `Deployment Successful! ${selectedApp.name} deployed successfully in ${data.durationFormatted || 'real-time'}`,
          percentage: 100,
          duration: data.durationFormatted,
        });

        // Parse and display real streaming logs from SSH
        if (data.logs) {
          const lines = data.logs.split('\n').filter((l: string) => l.trim().length > 0);
          setLogs(lines);
        } else {
          setLogs((prev) => [
            ...prev,
            `[${now()}] [success] Deployment completed successfully!`,
          ]);
        }

        showToast('success', `${selectedApp.name} deployed successfully!`);
        fetchApps();
      } else {
        const errorMsg = data.error || 'Deployment failed';
        setDeployProgress({
          status: data.rolledBack ? 'rolled_back' : 'failed',
          stepMessage: data.rolledBack
            ? `Deployment Failed! Automatically rolled back to ${data.previousCommit?.slice(0, 7) || 'previous release'}`
            : `Deployment Failed: ${errorMsg}`,
          percentage: 100,
        });

        if (data.logs) {
          setLogs(data.logs.split('\n').filter(Boolean));
        } else {
          setLogs((prev) => [
            ...prev,
            `[${now()}] [error] Deployment failed: ${errorMsg}`,
            data.rolledBack ? `[${now()}] [warn] Automatic rollback completed.` : '',
          ].filter(Boolean));
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
      setLogs((prev) => [...prev, `[error] Network or execution failure: ${err.message}`]);
      showToast('error', err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  // 3. ONE-CLICK QUICK COMMANDS
  const handleQuickCommand = async (commandKey: string) => {
    if (!activeServer?._id || !selectedApp?._id) return;
    const now = () => new Date().toTimeString().split(' ')[0];

    setLogs((prev) => [
      ...prev,
      `[${now()}] [info] Executing quick command: ${commandKey} in ${selectedApp.directory}...`,
    ]);

    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps/${selectedApp._id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandKey }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const outputLines = (data.output || 'Command executed with 0 exit code.').split('\n');
        setLogs((prev) => [
          ...prev,
          ...outputLines,
          `[${now()}] [success] Command "${commandKey}" completed successfully.`,
        ]);
        showToast('success', `Command "${commandKey}" completed!`);
      } else {
        setLogs((prev) => [
          ...prev,
          `[${now()}] [error] Command failed: ${data.output || data.error}`,
        ]);
        showToast('error', `Command "${commandKey}" failed.`);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[${now()}] [error] Execution error: ${err.message}`]);
      showToast('error', err.message);
    }
  };

  // 4. ROLLBACK TO PREVIOUS RELEASE
  const handleRollback = async () => {
    if (!activeServer?._id || !selectedApp?._id) return;
    setRollbackConfirmOpen(false);
    const now = () => new Date().toTimeString().split(' ')[0];

    setDeployProgress({
      status: 'deploying',
      stepMessage: `Rolling back ${selectedApp.name} to previous working release...`,
      percentage: 50,
    });
    setLogs((prev) => [
      ...prev,
      `[${now()}] [warn] Initiating manual rollback for ${selectedApp.name}...`,
    ]);

    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/apps/${selectedApp._id}/rollback`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDeployProgress({
          status: 'success',
          stepMessage: `Rollback Successful! Restored commit ${data.commitRestored?.slice(0, 7) || 'previous release'}`,
          percentage: 100,
        });
        setLogs((prev) => [
          ...prev,
          ...(data.output ? data.output.split('\n') : []),
          `[${now()}] [success] Application restored and restarted with PM2!`,
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

  // 5. ADD APPLICATION
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

  // Helper for App Icon
  const renderAppIcon = (iconType: string, className = 'w-4 h-4') => {
    switch (iconType) {
      case 'cart':
        return <ShoppingCart className={className} />;
      case 'globe':
        return <Globe className={className} />;
      case 'cake':
        return <Cake className={className} />;
      case 'game':
        return <Gamepad2 className={className} />;
      case 'api':
        return <Code2 className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

  // Download Logs
  const handleDownloadLogs = () => {
    const text = logs.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedApp?.name || 'app'}-deployment-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Apps
  const filteredApps = apps.filter((app) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      app.name.toLowerCase().includes(q) ||
      app.directory.toLowerCase().includes(q) ||
      (app.frameworkName && app.frameworkName.toLowerCase().includes(q))
    );
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
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Two-Column Layout (Matching Screenshot Exactly) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================================================= */}
        {/* LEFT PANEL: APPLICATIONS (DEPLOYED APPS) LIST */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 xl:col-span-4 bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col space-y-3.5">
          {/* Header & Add App Button */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              <span>Applications (Deployed Apps)</span>
            </h3>

            <button
              type="button"
              onClick={() => setAddAppModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add App</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applications..."
              className="w-full bg-[#0B1120] text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 border border-[#1E293B] focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Applications Cards List */}
          <div className="space-y-2 overflow-y-auto max-h-[680px] pr-0.5 custom-scrollbar">
            {loadingApps && apps.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span>Loading server applications...</span>
              </div>
            ) : apps.length === 0 ? (
              <div className="py-12 px-3 text-center text-slate-400 text-xs space-y-3">
                <Package className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-300">No applications found on this server.</p>
                <p className="text-[11px] text-slate-500">Add your first application to configure deployment.</p>
                <button
                  type="button"
                  onClick={() => setAddAppModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Application</span>
                </button>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No applications matching "{searchQuery}"
              </div>
            ) : (
              filteredApps.map((app) => {
                const isSelected = selectedApp?._id === app._id;
                const isFailed = app.status === 'Failed';
                const isBuilding = app.status === 'Building';

                return (
                  <div
                    key={app._id || app.name}
                    onClick={() => handleSelectApp(app)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-600/10'
                        : 'bg-[#0D1526]/70 hover:bg-[#142038] border-[#1E293B] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status Dot */}
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isFailed
                            ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                            : isBuilding
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                        }`}
                      />

                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-blue-600/25 text-blue-400 border border-blue-500/30'
                            : 'bg-[#0B1120] text-slate-400 border border-[#1E293B]'
                        }`}
                      >
                        {renderAppIcon(app.iconType, 'w-4 h-4')}
                      </div>

                      {/* Text info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                            }`}
                          >
                            {app.name}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${
                              isFailed
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : isBuilding
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {app.status || 'Deployed'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5" title={app.directory}>
                          {app.directory}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: SELECTED APPLICATION WORKSPACE */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          {selectedApp ? (
            <>
              {/* 1. App Header Card (Matching Screenshot) */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: App Title and Icon */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 shrink-0">
                      {renderAppIcon(selectedApp.iconType, 'w-6 h-6')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-white tracking-wide">{selectedApp.name}</h2>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                            selectedApp.status === 'Failed'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {selectedApp.status || 'Deployed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedApp.frameworkName || `${selectedApp.type?.toUpperCase()} Application`}
                      </p>
                    </div>
                  </div>

                  {/* Right: Deployed On & GitHub link */}
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div className="text-xs">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                        Deployed On
                      </span>
                      <span className="text-slate-200 font-mono text-[11px]">
                        {selectedApp.lastDeployedAt
                          ? new Date(selectedApp.lastDeployedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }) +
                            ' • ' +
                            new Date(selectedApp.lastDeployedAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Not deployed yet'}
                      </span>
                    </div>

                    <div className="text-xs">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                        Branch
                      </span>
                      <span className="text-cyan-400 font-mono font-bold flex items-center gap-1 justify-end">
                        <GitBranch className="w-3 h-3 text-cyan-400" />
                        {selectedApp.gitBranch || 'main'}
                      </span>
                    </div>

                    {selectedApp.gitRepoUrl && (
                      <a
                        href={selectedApp.gitRepoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <span>View on GitHub</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Sub Metadata Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-3 border-t border-[#1E293B] text-xs">
                  {/* GitHub Repo */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-500 shrink-0 font-semibold">GitHub Repository:</span>
                    <span
                      className="font-mono text-[11px] text-slate-300 truncate"
                      title={selectedApp.gitRepoUrl}
                    >
                      {selectedApp.gitRepoUrl
                        ? selectedApp.gitRepoUrl.replace('https://github.com/', '')
                        : 'Not configured'}
                    </span>
                  </div>

                  {/* Branch */}
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-slate-500 font-semibold">Branch:</span>
                    <span className="font-mono text-cyan-300 font-bold">{selectedApp.gitBranch || 'main'}</span>
                  </div>

                  {/* Last Deploy */}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-slate-500 font-semibold">Last Deploy:</span>
                    <span className="text-slate-300 font-medium">
                      {selectedApp.lastDeployedAt
                        ? (selectedApp.lastDeploymentDuration ? `${selectedApp.lastDeploymentDuration} ago` : 'Recently')
                        : 'Never'}
                    </span>
                  </div>

                  {/* Status Healthy */}
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-500 font-semibold">Status:</span>
                    <span
                      className={`font-bold ${
                        selectedApp.healthStatus === 'Down' ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {selectedApp.healthStatus || 'Healthy'}
                    </span>
                  </div>
                </div>

                {/* Deployment Actions Strip (Matching Screenshot) */}
                <div className="pt-2 border-t border-[#1E293B]/70 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    <span>⚡ Deployment Actions</span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* 1. DEPLOY LATEST (PROMINENT BLUE BUTTON) */}
                    <button
                      type="button"
                      onClick={() => handleDeployLatest()}
                      disabled={isDeploying}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isDeploying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-white text-white" />
                      )}
                      <span>Deploy Latest</span>
                    </button>

                    {/* 2. DEPLOY SPECIFIC BRANCH (PURPLE BUTTON) */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetBranch(selectedApp.gitBranch || 'main');
                        setBranchModalOpen(true);
                      }}
                      disabled={isDeploying}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-semibold border border-purple-500/40 shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Deploy Specific Branch</span>
                    </button>

                    {/* 3. ROLLBACK TO PREVIOUS (TEAL/EMERALD BUTTON) */}
                    <button
                      type="button"
                      onClick={() => setRollbackConfirmOpen(true)}
                      disabled={isDeploying}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rollback to Previous</span>
                    </button>

                    {/* 4. VIEW DEPLOY HISTORY (DARK BUTTON) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToHistory) {
                          onNavigateToHistory();
                        } else {
                          showToast('success', 'Navigating to Deployment History...');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition-all cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>View Deploy History</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Middle Row: Deployment Progress & Quick Commands (50/50 Split) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Box: Deployment Progress */}
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Deployment Progress
                      </span>

                      <div className="flex items-center gap-2">
                        {deployProgress.status === 'deploying' ? (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                        ) : deployProgress.status === 'failed' ? (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : deployProgress.status === 'idle' ? (
                          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-white">
                          {deployProgress.status === 'deploying'
                            ? 'Deployment in Progress...'
                            : deployProgress.status === 'failed'
                            ? 'Deployment Failed!'
                            : deployProgress.status === 'rolled_back'
                            ? 'Rolled Back Successfully'
                            : deployProgress.status === 'idle'
                            ? 'No Active Deployment'
                            : 'Deployment Successful!'}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate max-w-sm" title={deployProgress.stepMessage}>
                        {deployProgress.stepMessage || (selectedApp.lastDeployedAt ? 'Ready' : 'Application has not been deployed yet.')}
                      </p>
                    </div>

                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shrink-0">
                      {deployProgress.percentage}%
                    </span>
                  </div>

                  {/* Gradient Progress Bar */}
                  <div className="w-full bg-[#0B1120] rounded-full h-2.5 overflow-hidden border border-[#1E293B]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        deployProgress.status === 'failed'
                          ? 'bg-rose-500'
                          : deployProgress.status === 'deploying'
                          ? 'bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 animate-pulse'
                          : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                      }`}
                      style={{ width: `${Math.max(5, deployProgress.percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Right Box: Quick Commands (Matching Screenshot) */}
                <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col justify-between space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Quick Commands
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* git pull */}
                    <button
                      type="button"
                      onClick={() => handleQuickCommand('git-pull')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm"
                      title="Run git pull origin <branch>"
                    >
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      <span>git pull</span>
                    </button>

                    {/* npm install / mvn clean / pnpm install */}
                    <button
                      type="button"
                      onClick={() => {
                        const cmd =
                          selectedApp.type === 'java-maven'
                            ? 'mvn-package'
                            : selectedApp.packageManager === 'pnpm'
                            ? 'pnpm-install'
                            : 'npm-install';
                        handleQuickCommand(cmd);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm"
                      title="Install dependencies"
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {selectedApp.type === 'java-maven'
                          ? 'mvn clean'
                          : selectedApp.packageManager === 'pnpm'
                          ? 'pnpm install'
                          : 'npm install'}
                      </span>
                    </button>

                    {/* pm2 restart */}
                    <button
                      type="button"
                      onClick={() => handleQuickCommand('pm2-restart')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm"
                      title="Restart application process with PM2"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/30" />
                      <span>pm2 restart</span>
                    </button>

                    {/* pm2 logs */}
                    <button
                      type="button"
                      onClick={() => handleQuickCommand('pm2-logs')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm"
                      title="Fetch latest 50 lines of PM2 logs"
                    >
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>pm2 logs</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Bottom: Live Logs Container (Matching Screenshot) */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 space-y-3">
                {/* Header bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white tracking-wide">
                      Live Logs - {selectedApp.name}
                    </h3>
                  </div>

                  {/* Controls: Auto Scroll, Clear, Download */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAutoScroll(!autoScroll)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        autoScroll
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#0D1526] text-slate-400 border-[#1E293B]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${autoScroll ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span>Auto Scroll</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLogs([])}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-[#18233C] transition-all cursor-pointer"
                      title="Clear log display"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadLogs}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-[#18233C] transition-all cursor-pointer"
                      title="Download complete logs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* Console Window */}
                <div
                  ref={logTerminalRef}
                  className="bg-[#070C18] border border-[#1E293B] rounded-xl p-4 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto custom-scrollbar select-text"
                >
                  {logs.length === 0 ? (
                    <div className="text-slate-600 italic">No logs recorded yet. Click "Deploy Latest" or a quick command to execute.</div>
                  ) : (
                    logs.map((line, idx) => {
                      const isInfo = line.includes('[info]');
                      const isSuccess = line.includes('[success]');
                      const isError = line.includes('[error]') || line.includes('[STDERR]');
                      const isWarn = line.includes('[warn]');

                      return (
                        <div
                          key={idx}
                          className={`${
                            isError
                              ? 'text-rose-400'
                              : isSuccess
                              ? 'text-emerald-400 font-semibold'
                              : isWarn
                              ? 'text-amber-300'
                              : isInfo
                              ? 'text-slate-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-16 text-center text-slate-400 space-y-4">
              <Package className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
              <h4 className="text-base font-bold text-white">
                {apps.length === 0 ? 'No applications found on this server.' : 'No Application Selected'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {apps.length === 0
                  ? 'Add your first application to configure Git repository, build commands, and 1-Click deployment.'
                  : 'Select an application from the left panel or click "+ Add App" to register a new application.'}
              </p>
              {apps.length === 0 && (
                <button
                  type="button"
                  onClick={() => setAddAppModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Your First Application</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD APPLICATION MODAL */}
      {/* ========================================================================= */}
      {addAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Register New Application</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddAppModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#18233C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateApp} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Application Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Production App"
                  value={newAppForm.name}
                  onChange={(e) => setNewAppForm({ ...newAppForm, name: e.target.value })}
                  className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">App Type / Framework</label>
                  <select
                    value={newAppForm.type}
                    onChange={(e) =>
                      setNewAppForm({
                        ...newAppForm,
                        type: e.target.value as any,
                        frameworkName:
                          e.target.value === 'java-maven'
                            ? 'Java Web Application - WAR on Tomcat'
                            : e.target.value === 'nextjs'
                            ? 'Next.js 14 App - SSR on Node.js'
                            : e.target.value === 'vite'
                            ? 'React Vite - SPA'
                            : 'Node.js Application',
                      })
                    }
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:outline-none focus:border-blue-500"
                  >
                    <option value="nodejs">Node.js (Generic)</option>
                    <option value="nextjs">Next.js (SSR / Standalone)</option>
                    <option value="vite">React (Vite SPA)</option>
                    <option value="java-maven">Java (Maven / Tomcat)</option>
                    <option value="docker">Docker Container</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">App Icon</label>
                  <select
                    value={newAppForm.iconType}
                    onChange={(e) => setNewAppForm({ ...newAppForm, iconType: e.target.value as any })}
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:outline-none focus:border-blue-500"
                  >
                    <option value="cart">Shopping Cart (E-Commerce)</option>
                    <option value="globe">Globe (News / Web)</option>
                    <option value="cake">Cake (Bakery / Food)</option>
                    <option value="game">Gamepad (Gaming)</option>
                    <option value="api">API / Backend</option>
                    <option value="layers">Layers (Generic)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Application Directory *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. /home/ubuntu/app or /var/www/app"
                  value={newAppForm.directory}
                  onChange={(e) => setNewAppForm({ ...newAppForm, directory: e.target.value })}
                  className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-300 font-semibold block mb-1">GitHub Repository URL</label>
                  <input
                    type="text"
                    placeholder="https://github.com/owner/repo"
                    value={newAppForm.gitRepoUrl}
                    onChange={(e) => setNewAppForm({ ...newAppForm, gitRepoUrl: e.target.value })}
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Default Branch</label>
                  <input
                    type="text"
                    placeholder="main"
                    value={newAppForm.gitBranch}
                    onChange={(e) => setNewAppForm({ ...newAppForm, gitBranch: e.target.value })}
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Package Manager</label>
                  <select
                    value={newAppForm.packageManager}
                    onChange={(e) => setNewAppForm({ ...newAppForm, packageManager: e.target.value as any })}
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:outline-none focus:border-blue-500"
                  >
                    <option value="auto">Auto-detect lockfile</option>
                    <option value="npm">npm (npm ci / install)</option>
                    <option value="pnpm">pnpm (pnpm install)</option>
                    <option value="yarn">yarn (yarn install)</option>
                    <option value="bun">bun (bun install)</option>
                    <option value="maven">maven (mvn clean package)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">PM2 Process Name</label>
                  <input
                    type="text"
                    placeholder="e.g. my-app"
                    value={newAppForm.pm2ProcessName}
                    onChange={(e) => setNewAppForm({ ...newAppForm, pm2ProcessName: e.target.value })}
                    className="w-full bg-[#0B1120] text-slate-200 rounded-xl px-3 py-2 border border-[#1E293B] focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setAddAppModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
                >
                  Save &amp; Register App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DEPLOY SPECIFIC BRANCH MODAL */}
      {/* ========================================================================= */}
      {branchModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Deploy Specific Branch</h3>
              </div>
              <button
                type="button"
                onClick={() => setBranchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select or enter the Git branch you want to pull and build on{' '}
              <strong className="text-slate-200">{selectedApp.name}</strong>:
            </p>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">Branch Name</label>
              <div className="relative">
                <GitBranch className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  placeholder="e.g. main, develop, release/v1.2"
                  className="w-full bg-[#0B1120] text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2.5 border border-[#1E293B] focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {['main', 'develop', 'staging', 'production'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTargetBranch(b)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setBranchModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setBranchModalOpen(false);
                  handleDeployLatest(targetBranch);
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Deploy {targetBranch}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ROLLBACK CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {rollbackConfirmOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Rollback</h3>
                <p className="text-xs text-slate-400">
                  Restore previous working release for {selectedApp.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#0B1120] p-3 rounded-xl border border-[#1E293B]">
              This will check out the last known good commit (
              <span className="font-mono text-cyan-400">
                {selectedApp.lastSuccessfulCommit?.slice(0, 7) || 'HEAD~1'}
              </span>
              ), re-install locked dependencies, and restart PM2 process{' '}
              <strong className="text-slate-100">{selectedApp.pm2ProcessName || selectedApp.name}</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRollbackConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRollback}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Rollback</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
