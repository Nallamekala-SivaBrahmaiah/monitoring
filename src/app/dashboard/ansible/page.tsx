'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Play,
  FileCode,
  Layers,
  Settings,
  Terminal,
  History,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  Radio,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { AnsibleLogo } from '@/components/icons/CloudIcons';
import { AnsibleStatsCards } from '@/components/dashboard/ansible/AnsibleStatsCards';
import { AnsibleOverviewTab } from '@/components/dashboard/ansible/AnsibleOverviewTab';
import { AnsibleInventoryTab } from '@/components/dashboard/ansible/AnsibleInventoryTab';
import { AnsibleControllersTab } from '@/components/dashboard/ansible/AnsibleControllersTab';
import { AnsibleControllerSelectorBar } from '@/components/dashboard/ansible/AnsibleControllerSelectorBar';
import { SelectControllerNodeModal } from '@/components/dashboard/ansible/SelectControllerNodeModal';
import { AnsibleAdHocTab } from '@/components/dashboard/ansible/AnsibleAdHocTab';
import { AnsiblePlaybooksTab } from '@/components/dashboard/ansible/AnsiblePlaybooksTab';
import { AnsibleRolesTab } from '@/components/dashboard/ansible/AnsibleRolesTab';
import { AnsibleConfigTab } from '@/components/dashboard/ansible/AnsibleConfigTab';
import { AnsibleLogsTab } from '@/components/dashboard/ansible/AnsibleLogsTab';
import { AnsibleHistoryTab } from '@/components/dashboard/ansible/AnsibleHistoryTab';
import { AnsibleSettingsTab } from '@/components/dashboard/ansible/AnsibleSettingsTab';
import { AddHostModal } from '@/components/dashboard/ansible/AddHostModal';
import { ImportCloudServerModal } from '@/components/dashboard/ansible/ImportCloudServerModal';
import { PlaybookEditorModal } from '@/components/dashboard/ansible/PlaybookEditorModal';
import { ExecutionDetailModal } from '@/components/dashboard/ansible/ExecutionDetailModal';
import { IAnsibleHostData } from '@/models/AnsibleHost';
import { IAnsiblePlaybookData } from '@/models/AnsiblePlaybook';
import { IAnsibleExecutionData } from '@/models/AnsibleExecution';
import { IAnsibleControllerData } from '@/models/AnsibleController';

type TabType =
  | 'overview'
  | 'inventory'
  | 'controllers'
  | 'adhoc'
  | 'playbooks'
  | 'roles'
  | 'configuration'
  | 'logs'
  | 'history'
  | 'settings';

export default function AnsiblePage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Controllers state
  const [controllers, setControllers] = useState<IAnsibleControllerData[]>([]);
  const [activeController, setActiveController] = useState<IAnsibleControllerData | null>(null);
  const [selectControllerModalOpen, setSelectControllerModalOpen] = useState(false);

  // Main data states
  const [hosts, setHosts] = useState<IAnsibleHostData[]>([]);
  const [playbooks, setPlaybooks] = useState<IAnsiblePlaybookData[]>([]);
  const [executions, setExecutions] = useState<IAnsibleExecutionData[]>([]);
  const [stats, setStats] = useState({
    totalServers: 0,
    totalPlaybooks: 0,
    successfulRuns: 0,
    failedRuns: 0,
    runningJobs: 0,
    successRatePercent: 100,
    failureRatePercent: 0,
    lastRunDisplay: 'Never',
  });

  const [loading, setLoading] = useState(true);
  const [testingHostId, setTestingHostId] = useState<string | null>(null);

  // Modals state
  const [addHostModalOpen, setAddHostModalOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<IAnsibleHostData | null>(null);
  const [importCloudModalOpen, setImportCloudModalOpen] = useState(false);
  const [targetWorkerController, setTargetWorkerController] = useState<IAnsibleControllerData | null>(null);

  const openAddWorkerModal = (ctrl?: IAnsibleControllerData | null) => {
    const target = ctrl || activeController || (controllers.length > 0 ? controllers[0] : null);
    setTargetWorkerController(target);
    setImportCloudModalOpen(true);
  };

  const [playbookModalOpen, setPlaybookModalOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<IAnsiblePlaybookData | null>(null);

  const [detailModalExecution, setDetailModalExecution] = useState<IAnsibleExecutionData | null>(null);
  const [selectedLogExecution, setSelectedLogExecution] = useState<IAnsibleExecutionData | null>(null);

  // Status feedback toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Fetch Controllers
  const fetchControllers = useCallback(async () => {
    try {
      const res = await fetch('/api/ansible/controllers');
      const data = await res.json();
      if (res.ok && data.controllers) {
        setControllers(data.controllers);
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('selectedAnsibleControllerId') : null;
        let active = null;
        if (savedId) {
          active = data.controllers.find((c: any) => c._id === savedId || String(c._id) === savedId);
        }
        if (!active) {
          active =
            data.controllers.find((c: IAnsibleControllerData) => c.isActive) ||
            data.controllers[0] ||
            null;
        }
        setActiveController(active);
        return { controllers: data.controllers, activeController: active };
      }
    } catch (err) {
      console.error('Failed to fetch controllers:', err);
    }
    return { controllers: [], activeController: null };
  }, []);

  // 2. Fetch Stats (scoped by controller)
  const fetchStats = useCallback(async (controllerId?: string) => {
    try {
      const url = controllerId
        ? `/api/ansible/stats?controllerId=${encodeURIComponent(controllerId)}`
        : '/api/ansible/stats';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // 3. Fetch Hosts (scoped strictly by controller)
  const fetchHosts = useCallback(async (controllerId?: string) => {
    try {
      const activeId = controllerId || activeController?._id;
      if (!activeId) {
        setHosts([]);
        return;
      }
      const url = `/api/ansible/hosts?controllerId=${encodeURIComponent(activeId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.hosts) {
        setHosts(data.hosts);
        setActiveController((prev) =>
          prev ? { ...prev, workerCount: data.hosts.length } : null
        );
      }
    } catch (err) {
      console.error('Failed to fetch hosts:', err);
    }
  }, [activeController?._id]);

  // 3. Fetch Playbooks
  const fetchPlaybooks = useCallback(async () => {
    try {
      const res = await fetch('/api/ansible/playbooks');
      const data = await res.json();
      if (res.ok && data.playbooks) {
        setPlaybooks(data.playbooks);
      }
    } catch (err) {
      console.error('Failed to fetch playbooks:', err);
    }
  }, []);

  // 4. Fetch Executions
  const fetchExecutions = useCallback(async () => {
    try {
      const res = await fetch('/api/ansible/executions?limit=30');
      const data = await res.json();
      if (res.ok && data.executions) {
        setExecutions(data.executions);
        if (data.executions.length > 0 && !selectedLogExecution) {
          setSelectedLogExecution(data.executions[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    }
  }, [selectedLogExecution]);

  // Switch Active Controller
  const handleSwitchController = async (controllerId: string) => {
    try {
      // Clear stale hosts immediately so previous controller's workers are not displayed
      setHosts([]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedAnsibleControllerId', controllerId);
      }
      const res = await fetch(`/api/ansible/controllers/${controllerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setActive: true }),
      });
      const data = await res.json();
      if (res.ok && data.controller) {
        setActiveController(data.controller);
        showToast('success', `Switched active controller to "${data.controller.name}".`);
        await Promise.all([
          fetchControllers(),
          fetchHosts(data.controller._id),
          fetchStats(data.controller._id),
        ]);
      } else {
        throw new Error(data.error || 'Failed to switch controller');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Initial Load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const { activeController: active } = await fetchControllers();
      const activeId = active?._id;
      await Promise.all([
        fetchStats(activeId),
        fetchHosts(activeId),
        fetchPlaybooks(),
        fetchExecutions(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, [fetchControllers, fetchStats, fetchHosts, fetchPlaybooks, fetchExecutions]);

  // Clean all execution logs and history
  const handleClearHistory = async () => {
    try {
      const res = await fetch('/api/ansible/executions?all=true', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message || 'Execution logs cleaned successfully.');
        setExecutions([]);
        setSelectedLogExecution(null);
        await Promise.all([
          fetchExecutions(),
          fetchStats(activeController?._id),
        ]);
      } else {
        throw new Error(data.error || 'Failed to clean execution logs');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Delete single execution record
  const handleDeleteExecution = async (ex: IAnsibleExecutionData) => {
    try {
      const targetId = ex._id || ex.jobId;
      const res = await fetch(`/api/ansible/executions?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Execution record "${ex.jobId}" deleted.`);
        if (selectedLogExecution?._id === ex._id || selectedLogExecution?.jobId === ex.jobId) {
          setSelectedLogExecution(null);
        }
        await Promise.all([
          fetchExecutions(),
          fetchStats(activeController?._id),
        ]);
      } else {
        throw new Error(data.error || 'Failed to delete execution record');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Polling for live jobs
  useEffect(() => {
    const hasRunning = executions.some((e) => e.status === 'RUNNING');
    if (!hasRunning) return;

    const interval = setInterval(() => {
      fetchExecutions();
      fetchStats(activeController?._id);
    }, 2000);

    return () => clearInterval(interval);
  }, [executions, fetchExecutions, fetchStats, activeController?._id]);

  // Test SSH
  const handleTestSSH = async (hostId: string) => {
    setTestingHostId(hostId);
    try {
      const res = await fetch(`/api/ansible/hosts/${hostId}/test`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.success ? 'success' : 'error', data.message);
        fetchHosts(activeController?._id);
      } else {
        throw new Error(data.error || 'SSH test failed');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setTestingHostId(null);
    }
  };

  // Delete Host
  const handleDeleteHost = async (host: IAnsibleHostData) => {
    if (!confirm(`Are you sure you want to remove host "${host.name}" (${host.ip}) from Ansible inventory?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/ansible/hosts/${host._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Host removed.');
        fetchHosts(activeController?._id);
        fetchStats(activeController?._id);
        fetchControllers();
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Delete Playbook
  const handleDeletePlaybook = async (playbook: IAnsiblePlaybookData) => {
    if (!confirm(`Are you sure you want to delete playbook "${playbook.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/ansible/playbooks/${playbook._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Playbook deleted.');
        fetchPlaybooks();
        fetchStats(activeController?._id);
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Quick Run Playbook
  const handleQuickRun = async (hostId: string, playbookId: string, extraVars: string) => {
    try {
      const res = await fetch('/api/ansible/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controllerId: activeController?._id,
          hostId,
          playbookId,
          extraVars,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Playbook job started.');
        fetchExecutions();
        fetchStats(activeController?._id);
        if (data.execution) {
          setSelectedLogExecution(data.execution);
        }
      } else {
        throw new Error(data.error || 'Failed to trigger playbook execution');
      }
    } catch (err: any) {
      showToast('error', err.message);
      throw err;
    }
  };

  const runningJob = executions.some((e) => e.status === 'RUNNING');
  const latestExecution = executions[0] || null;

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: Server },
    { id: 'inventory', label: 'Inventory', icon: Server },
    { id: 'controllers', label: 'Controllers', icon: Radio },
    { id: 'adhoc', label: 'Ad-hoc Commands', icon: Terminal },
    { id: 'playbooks', label: 'Playbooks', icon: FileCode },
    { id: 'roles', label: 'Roles', icon: Layers },
    { id: 'configuration', label: 'Configuration', icon: Settings },
    { id: 'logs', label: 'Execution Logs', icon: Terminal },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 space-y-5 w-full">
          {/* Toast Feedback */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg transition animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <span>{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white ml-2">
                ✕
              </button>
            </div>
          )}

          {/* Top Page Title & Documentation Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 font-bold text-2xl tracking-tighter">
                A
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Ansible</span>
                </h1>
                <p className="text-xs text-slate-400">
                  Automate deployment and configuration on your cloud servers using Ansible
                </p>
              </div>
            </div>

            <a
              href="https://docs.ansible.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 hover:from-blue-600/50 hover:to-purple-600/50 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold shadow-lg shadow-indigo-950/40 flex items-center gap-1.5 self-start sm:self-center transition"
            >
              <span>Ansible Documentation</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Status Alert Banner */}
          <div className="p-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs font-semibold text-emerald-400 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Ansible is ready! Managing controllers, independent worker nodes, and playbooks.</span>
          </div>

          {/* Dedicated Controller Switcher Bar */}
          <AnsibleControllerSelectorBar
            controllers={controllers}
            activeController={activeController}
            workerCount={hosts.length}
            onSelectController={handleSwitchController}
            onAddControllerClick={() => setSelectControllerModalOpen(true)}
            onManageControllersClick={() => setActiveTab('controllers')}
          />

          {/* Statistics Cards */}
          <AnsibleStatsCards stats={stats} />

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-[#1E293B] overflow-x-auto pb-1 text-xs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold transition shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#18233C]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Views */}
          {activeTab === 'overview' && (
            <AnsibleOverviewTab
              hosts={hosts}
              playbooks={playbooks}
              latestExecution={latestExecution}
              onAddHostClick={() => openAddWorkerModal(activeController)}
              onEditHostClick={(h) => {
                setEditingHost(h);
                setAddHostModalOpen(true);
              }}
              onDeleteHostClick={handleDeleteHost}
              onManagePlaybooksClick={() => setActiveTab('playbooks')}
              onRunPlaybookClick={(p) => {
                if (hosts.length > 0) {
                  handleQuickRun(hosts[0]._id || '', p._id || '', '');
                } else {
                  showToast('error', 'Please add a server to inventory first.');
                }
              }}
              onQuickRun={handleQuickRun}
              onViewAllLogsClick={() => setActiveTab('logs')}
              runningJob={runningJob}
            />
          )}

          {activeTab === 'inventory' && (
            <AnsibleInventoryTab
              hosts={hosts}
              activeController={activeController}
              onAddHostClick={() => openAddWorkerModal(activeController)}
              onImportCloudClick={() => openAddWorkerModal(activeController)}
              onEditHostClick={(h) => {
                setEditingHost(h);
                setAddHostModalOpen(true);
              }}
              onDeleteHostClick={handleDeleteHost}
              onTestSSH={handleTestSSH}
              testingHostId={testingHostId}
              onRefresh={() => {
                fetchHosts(activeController?._id);
                fetchStats(activeController?._id);
                fetchControllers();
              }}
            />
          )}

          {activeTab === 'controllers' && (
            <AnsibleControllersTab
              controllers={controllers}
              activeController={activeController}
              onSelectController={handleSwitchController}
              onAddControllerClick={() => setSelectControllerModalOpen(true)}
              onRefresh={fetchControllers}
              onAddWorkerClick={(ctrl) => openAddWorkerModal(ctrl)}
            />
          )}

          {activeTab === 'adhoc' && (
            <AnsibleAdHocTab
              activeController={activeController}
              hosts={hosts}
              onRefreshHosts={() => fetchHosts(activeController?._id)}
            />
          )}

          {activeTab === 'playbooks' && (
            <AnsiblePlaybooksTab
              playbooks={playbooks}
              onCreateClick={() => {
                setEditingPlaybook(null);
                setPlaybookModalOpen(true);
              }}
              onEditClick={(p) => {
                setEditingPlaybook(p);
                setPlaybookModalOpen(true);
              }}
              onDeleteClick={handleDeletePlaybook}
              onRunClick={(p) => {
                if (hosts.length > 0) {
                  handleQuickRun(hosts[0]._id || '', p._id || '', '');
                } else {
                  showToast('error', 'Please add a server to inventory first.');
                }
              }}
            />
          )}

          {activeTab === 'roles' && <AnsibleRolesTab />}

          {activeTab === 'configuration' && <AnsibleConfigTab />}

          {activeTab === 'logs' && (
            <AnsibleLogsTab
              executions={executions}
              selectedExecution={selectedLogExecution}
              onSelectExecution={setSelectedLogExecution}
              onRefresh={fetchExecutions}
              onClearLogs={handleClearHistory}
            />
          )}

          {activeTab === 'history' && (
            <AnsibleHistoryTab
              executions={executions}
              onSelectExecution={setDetailModalExecution}
              onRefresh={fetchExecutions}
              onRerun={(ex) => {
                if (ex.hostId && ex.playbookId) {
                  handleQuickRun(String(ex.hostId), String(ex.playbookId), ex.extraVars || '');
                }
              }}
              onClearHistory={handleClearHistory}
              onDeleteExecution={handleDeleteExecution}
            />
          )}

          {activeTab === 'settings' && <AnsibleSettingsTab />}
        </main>
      </div>

      {/* Modals */}
      <AddHostModal
        isOpen={addHostModalOpen}
        onClose={() => setAddHostModalOpen(false)}
        onSaved={() => {
          fetchHosts(activeController?._id);
          fetchStats(activeController?._id);
          fetchControllers();
        }}
        editingHost={editingHost}
        controllerId={activeController?._id}
        controllerName={activeController?.name}
      />

      <ImportCloudServerModal
        isOpen={importCloudModalOpen}
        onClose={() => setImportCloudModalOpen(false)}
        onImported={() => {
          const cId = targetWorkerController?._id || activeController?._id;
          if (cId) {
            fetchHosts(cId);
            fetchStats(cId);
          }
          fetchControllers();
        }}
        controller={targetWorkerController || activeController}
        controllerId={targetWorkerController?._id || activeController?._id}
        controllerName={targetWorkerController?.name || activeController?.name}
      />

      <SelectControllerNodeModal
        isOpen={selectControllerModalOpen}
        onClose={() => setSelectControllerModalOpen(false)}
        onControllerUpdated={() => {
          fetchControllers().then((res) => {
            if (res.activeController) {
              fetchHosts(res.activeController._id);
              fetchStats(res.activeController._id);
            }
          });
        }}
        currentControllerName={activeController?.name}
        currentControllerIp={activeController?.ipAddress}
        currentType={activeController?.type}
      />

      <PlaybookEditorModal
        isOpen={playbookModalOpen}
        onClose={() => setPlaybookModalOpen(false)}
        onSaved={() => {
          fetchPlaybooks();
          fetchStats(activeController?._id);
        }}
        editingPlaybook={editingPlaybook}
      />

      <ExecutionDetailModal
        execution={detailModalExecution}
        onClose={() => setDetailModalExecution(null)}
        onRerun={(ex) => {
          if (ex.hostId && ex.playbookId) {
            handleQuickRun(String(ex.hostId), String(ex.playbookId), ex.extraVars || '');
          }
        }}
      />
    </div>
  );
}

