'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Wrench,
  Server,
  Play,
  Terminal,
  History,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { AutomationOverviewTab } from '@/components/dashboard/server-automation/AutomationOverviewTab';
import { ServerManagementTab } from '@/components/dashboard/server-automation/ServerManagementTab';
import { SoftwareInstallationTab } from '@/components/dashboard/server-automation/SoftwareInstallationTab';
import { CustomScriptsTab } from '@/components/dashboard/server-automation/CustomScriptsTab';
import { LiveTerminalTab } from '@/components/dashboard/server-automation/LiveTerminalTab';
import { InstallationHistoryTab } from '@/components/dashboard/server-automation/InstallationHistoryTab';
import { TOOL_CATALOG } from '@/lib/automation/toolCatalog';

type AutomationTab = 'overview' | 'servers' | 'install' | 'scripts' | 'terminal' | 'history';

function ServerAutomationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') as AutomationTab) || 'install';

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AutomationTab>(tabParam);
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [executions, setExecutions] = useState<any[]>([]);
  const [packagesCount, setPackagesCount] = useState<number>(TOOL_CATALOG.length);
  const [loading, setLoading] = useState(true);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const changeTab = (tab: AutomationTab) => {
    setActiveTab(tab);
    router.push(`/dashboard/server-automation?tab=${tab}`, { scroll: false });
  };

  // Fetch registered servers
  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      if (Array.isArray(data)) {
        setServers(data);
        if (!selectedServerId && data.length > 0) {
          setSelectedServerId(data[0]._id);
        }
      } else if (data.servers) {
        setServers(data.servers);
        if (!selectedServerId && data.servers.length > 0) {
          setSelectedServerId(data.servers[0]._id);
        }
      }
    } catch (err) {
      console.error('Fetch servers error:', err);
    }
  };

  // Fetch recent executions
  const fetchExecutions = async () => {
    try {
      const res = await fetch('/api/server-automation/history?limit=10');
      const data = await res.json();
      if (data.executions) {
        setExecutions(data.executions);
      }
    } catch (err) {
      console.error('Fetch executions error:', err);
    }
  };

  // Fetch package catalog count
  const fetchPackagesCount = async () => {
    try {
      const res = await fetch('/api/server-automation/packages');
      if (res.ok) {
        const data = await res.json();
        if (data.totalTools) {
          setPackagesCount(data.totalTools);
        }
      }
    } catch (err) {
      console.error('Fetch packages count error:', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchServers(), fetchExecutions(), fetchPackagesCount()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // Quick tool install trigger from Overview
  const handleQuickInstall = (toolIds: string[]) => {
    changeTab('install');
    // We navigate to install tab
  };

  // Execute Software Installation
  const handleStartInstallation = async (params: {
    serverId: string;
    selectedTools: { toolId: string; version?: string }[];
    stopOnError: boolean;
  }) => {
    setIsInstalling(true);
    setFeedbackToast(null);

    try {
      const res = await fetch('/api/server-automation/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start installation process.');
      }

      setActiveExecutionId(data.executionId);
      setFeedbackToast({
        type: 'success',
        message: `Deployment started for ${data.totalTools} tool(s) on ${data.serverName}!`,
      });

      // Switch directly to Live Terminal to observe real-time execution
      changeTab('terminal');
      fetchExecutions();
    } catch (err: any) {
      setFeedbackToast({
        type: 'error',
        message: err.message || 'Execution initiation failed.',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  // Execute Custom Script
  const handleExecuteScript = async (scriptId: string, serverId: string) => {
    setIsInstalling(true);
    setFeedbackToast(null);

    try {
      const res = await fetch(`/api/server-automation/scripts/${scriptId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute custom script.');
      }

      setActiveExecutionId(data.executionId);
      setFeedbackToast({
        type: 'success',
        message: `Custom script "${data.scriptName}" started on ${data.serverName}!`,
      });

      // Switch directly to Live Terminal
      changeTab('terminal');
      fetchExecutions();
    } catch (err: any) {
      setFeedbackToast({
        type: 'error',
        message: err.message || 'Script execution failed.',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Module Heading & Global Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
                <Wrench className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-extrabold text-white tracking-tight">
                    Server Setup & Automation
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono uppercase tracking-wider">
                    Remote SSH Provisioning
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automate Linux software installation, DevOps toolchains, and custom bash routines with real-time terminal streaming.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  fetchServers();
                  fetchExecutions();
                  fetchPackagesCount();
                }}
                className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700/80 transition cursor-pointer"
                title="Refresh Status"
              >
                <RotateCw className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Feedback Toast Banner */}
          {feedbackToast && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border animate-in slide-in-from-top-2 ${
                feedbackToast.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
              }`}
            >
              <span>{feedbackToast.message}</span>
              <button
                type="button"
                onClick={() => setFeedbackToast(null)}
                className="hover:opacity-75 transition cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          {/* Tab Navigation Menu */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-none">
            <button
              type="button"
              onClick={() => changeTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/15'
                  : 'bg-[#0D1526] text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => changeTab('servers')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                activeTab === 'servers'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/15'
                  : 'bg-[#0D1526] text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Server Management ({servers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => changeTab('install')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                activeTab === 'install'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/15 ring-1 ring-cyan-400/30'
                  : 'bg-[#0D1526] text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-cyan-400" />
              <span>Software Installation ({packagesCount} Tools)</span>
            </button>

            <button
              type="button"
              onClick={() => changeTab('scripts')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                activeTab === 'scripts'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/15'
                  : 'bg-[#0D1526] text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Custom Scripts</span>
            </button>

            <button
              type="button"
              onClick={() => changeTab('terminal')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                activeTab === 'terminal'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/15'
                  : 'bg-[#0D1526] text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Terminal</span>
              {activeExecutionId && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              )}
            </button>

            <button
              type="button"
              onClick={() => changeTab('history')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                activeTab === 'history'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/15'
                  : 'bg-[#0D1526] text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Installation History</span>
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === 'overview' && (
            <AutomationOverviewTab
              servers={servers}
              executions={executions}
              totalPackages={packagesCount}
              onSelectTab={changeTab}
              onQuickInstall={handleQuickInstall}
            />
          )}

          {activeTab === 'servers' && (
            <ServerManagementTab
              servers={servers}
              onRefresh={fetchServers}
              onSelectForInstallation={(server) => {
                setSelectedServerId(server._id);
                changeTab('install');
              }}
            />
          )}

          {activeTab === 'install' && (
            <SoftwareInstallationTab
              servers={servers}
              selectedServerId={selectedServerId}
              onSelectServerId={setSelectedServerId}
              onStartInstallation={handleStartInstallation}
              isInstalling={isInstalling}
            />
          )}

          {activeTab === 'scripts' && (
            <CustomScriptsTab
              servers={servers}
              selectedServerId={selectedServerId}
              onSelectServerId={setSelectedServerId}
              onExecuteScript={handleExecuteScript}
            />
          )}

          {activeTab === 'terminal' && (
            <LiveTerminalTab
              executionId={activeExecutionId}
              onNavigateToInstall={() => changeTab('install')}
              onNavigateToHistory={() => changeTab('history')}
            />
          )}

          {activeTab === 'history' && (
            <InstallationHistoryTab
              onOpenLiveTerminal={(exId) => {
                setActiveExecutionId(exId);
                changeTab('terminal');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function ServerAutomationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#070B14] text-slate-400 text-xs font-mono">
          Loading Server Setup & Automation Engine...
        </div>
      }
    >
      <ServerAutomationContent />
    </Suspense>
  );
}
