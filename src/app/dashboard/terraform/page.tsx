'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  RotateCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  History,
  Terminal,
  Settings,
  Server,
  Database,
  Cloud,
  Code,
  Box,
  Sliders,
  ShieldCheck,
  Sparkles,
  DownloadCloud,
  Cpu,
  FolderGit2,
  LayoutDashboard,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { TerraformLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

// Import Terraform Tabs
import { TerraformProvidersTab } from '@/components/dashboard/terraform/TerraformProvidersTab';
import { TerraformBuilderTab } from '@/components/dashboard/terraform/TerraformBuilderTab';
import { TerraformCodeTab } from '@/components/dashboard/terraform/TerraformCodeTab';
import { TerraformWorkspacesTab } from '@/components/dashboard/terraform/TerraformWorkspacesTab';
import { TerraformModulesTab } from '@/components/dashboard/terraform/TerraformModulesTab';
import { TerraformResourcesTab } from '@/components/dashboard/terraform/TerraformResourcesTab';
import { TerraformImportTab } from '@/components/dashboard/terraform/TerraformImportTab';
import { TerraformSecretsTab } from '@/components/dashboard/terraform/TerraformSecretsTab';
import { TerraformSettingsTab } from '@/components/dashboard/terraform/TerraformSettingsTab';

// Modals
import { CreateProjectModal } from '@/components/dashboard/terraform/CreateProjectModal';
import { TerraformApprovalModal } from '@/components/dashboard/terraform/TerraformApprovalModal';
import { TerraformServerInstallModal } from '@/components/dashboard/terraform/TerraformServerInstallModal';
import { ModuleCustomizeButton } from '@/components/dashboard/style-studio/ModuleCustomizeButton';

export type TerraformTabKey =
  | 'providers'
  | 'resources'
  | 'builder'
  | 'code'
  | 'import'
  | 'workspaces'
  | 'modules'
  | 'secrets'
  | 'settings';

export default function TerraformPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TerraformTabKey>('providers');

  // Core Data
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [stats, setStats] = useState<any>({
    totalProjects: 0,
    awsProjects: 0,
    azureProjects: 0,
    prodProjects: 0,
    successfulRuns: 0,
    failedRuns: 0,
  });
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
  const [allExecutions, setAllExecutions] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({
    defaultTimeoutMinutes: 30,
    enableStateLocking: true,
    requireApprovalForProd: true,
    autoApprovePlanInDev: false,
    parallelismLimit: 10,
    enableDetailedMetrics: true,
    defaultTerraformVersion: '1.14.6',
  });

  // State & Loading
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeLogs, setActiveLogs] = useState<string>('');
  const [lastPlanResult, setLastPlanResult] = useState<any | null>(null);
  const [lastApplyResult, setLastApplyResult] = useState<any | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplateForCreate, setSelectedTemplateForCreate] = useState<string | undefined>(undefined);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [serverInstallModalOpen, setServerInstallModalOpen] = useState(false);

  // Notifications / feedback
  const [bannerFeedback, setBannerFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showBanner = (type: 'success' | 'error' | 'info', message: string) => {
    setBannerFeedback({ type, message });
    setTimeout(() => setBannerFeedback(null), 6000);
  };

  // Switch Tab Helper
  const switchTab = (tab: TerraformTabKey) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  };

  // Load Initial Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Load Projects and Stats
      const projRes = await fetch('/api/terraform/projects');
      const projData = await projRes.json();

      if (projData.success) {
        setProjects(projData.projects || []);
        setStats(projData.stats || {});
        setRecentExecutions(projData.recentExecutions || []);

        // Pick active project if none selected, or keep current
        if (!activeProject && projData.projects?.length > 0) {
          setActiveProject(projData.projects[0]);
        } else if (activeProject) {
          const fresh = projData.projects.find((p: any) => p._id === activeProject._id);
          if (fresh) setActiveProject(fresh);
        }
      }

      // Load Cloud Accounts
      try {
        const caRes = await fetch('/api/cloud-accounts');
        const caData = await caRes.json();
        if (caData.accounts || Array.isArray(caData)) {
          setCloudAccounts(caData.accounts || caData);
        }
      } catch (e) {
        console.warn('Could not load cloud accounts', e);
      }

      // Load Servers
      try {
        const sRes = await fetch('/api/terraform/servers');
        const sData = await sRes.json();
        if (sData.success) {
          setServers(sData.servers || []);
        }
      } catch (e) {
        console.warn('Could not load terraform servers', e);
      }

      // Load Approvals
      try {
        const appRes = await fetch('/api/terraform/approvals');
        const appData = await appRes.json();
        if (appData.success) {
          setApprovals(appData.approvals || []);
        }
      } catch (e) {
        console.warn('Could not load approvals', e);
      }

      // Load Global Settings
      try {
        const setRes = await fetch('/api/terraform/settings');
        const setData = await setRes.json();
        if (setData.success && setData.settings) {
          setGlobalSettings(setData.settings);
        }
      } catch (e) {
        console.warn('Could not load settings', e);
      }
    } catch (err: any) {
      console.error('TerraformPage fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load project-specific variables & executions whenever activeProject changes
  useEffect(() => {
    if (!activeProject?._id) return;

    const loadProjectDetails = async () => {
      try {
        // Variables
        const vRes = await fetch(`/api/terraform/variables?projectId=${activeProject._id}`);
        const vData = await vRes.json();
        if (vData.success) {
          setVariables(vData.variables || []);
        }

        // Executions
        const exRes = await fetch(`/api/terraform/executions?projectId=${activeProject._id}`);
        const exData = await exRes.json();
        if (exData.success) {
          setAllExecutions(exData.executions || []);
        }
      } catch (e) {
        console.error('Error loading project details', e);
      }
    };

    loadProjectDetails();
  }, [activeProject?._id]);

  // ==========================================
  // Terraform Operations Engine
  // ==========================================
  const handleExecute = async (operation: string, extraArgs: string[] = [], targetWorkspace?: string) => {
    if (!activeProject?._id) {
      showBanner('error', 'Please select or create an active Terraform project first');
      return null;
    }

    setIsExecuting(true);
    setActiveLogs(`>>> Initializing terraform ${operation} for ${activeProject.name}...\n`);

    try {
      const res = await fetch(`/api/terraform/projects/${activeProject._id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          workspace: targetWorkspace || activeProject.currentWorkspace || 'default',
          extraArgs,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Execution failed for terraform ${operation}`);
      }

      const logOutput = data.output || data.logs || (data.execution && data.execution.output) || 'Operation completed.';
      setActiveLogs(logOutput);

      if (operation === 'plan') {
        setLastPlanResult(data);
        showBanner('success', `Terraform plan succeeded! ${data.planSummary?.rawText || ''}`);
      } else if (operation === 'apply') {
        setLastApplyResult(data);
        showBanner('success', `Terraform apply succeeded! Real infrastructure changes deployed.`);
      } else if (operation === 'destroy') {
        showBanner('info', `Terraform destroy completed successfully.`);
      } else {
        showBanner('success', `Terraform ${operation} completed successfully.`);
      }

      // Refresh project and executions
      await fetchData();
      return data;
    } catch (err: any) {
      const msg = err.message || 'Execution error';
      setActiveLogs((prev) => `${prev}\n\n[ERROR]: ${msg}`);
      showBanner('error', msg);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  };

  // File Management
  const handleSaveFile = async (filename: string, content: string) => {
    if (!activeProject?._id) return;
    try {
      const updatedFiles = [...(activeProject.files || [])];
      const idx = updatedFiles.findIndex((f) => f.name === filename);
      if (idx >= 0) {
        updatedFiles[idx] = { name: filename, content };
      } else {
        updatedFiles.push({ name: filename, content });
      }

      const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: updatedFiles }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        showBanner('success', `Saved ${filename} successfully`);
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to save file');
    }
  };

  const handleAddFile = async (filename: string) => {
    if (!activeProject?._id) return;
    try {
      const files = [...(activeProject.files || []), { name: filename, content: `# ${filename}\n` }];
      const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        showBanner('success', `Created ${filename}`);
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to create file');
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (!activeProject?._id) return;
    try {
      const files = (activeProject.files || []).filter((f: any) => f.name !== filename);
      const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        showBanner('info', `Removed ${filename}`);
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to delete file');
    }
  };

  // Workspace actions
  const handleSwitchWorkspace = async (ws: string) => {
    if (!activeProject?._id) return;
    try {
      const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentWorkspace: ws }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        showBanner('success', `Switched to workspace '${ws}'`);
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to switch workspace');
    }
  };

  const handleCreateWorkspace = async (ws: string) => {
    if (!activeProject?._id) return;
    try {
      const clean = ws.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const workspaces = Array.from(new Set([...(activeProject.workspaces || ['default']), clean]));
      
      const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaces, currentWorkspace: clean }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        showBanner('success', `Workspace '${clean}' created and activated.`);
      }

      try {
        await handleExecute('workspace_new', [clean], clean);
      } catch (cliErr) {
        console.warn('CLI workspace creation notice:', cliErr);
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to create workspace');
    }
  };

  const handleDeleteWorkspace = async (ws: string) => {
    if (!activeProject?._id || ws === 'default') return;
    try {
      const workspaces = (activeProject.workspaces || ['default']).filter((w: string) => w !== ws);
      const nextWs = activeProject.currentWorkspace === ws ? 'default' : activeProject.currentWorkspace;
      const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaces, currentWorkspace: nextWs }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        showBanner('info', `Workspace '${ws}' removed.`);
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to delete workspace');
    }
  };

  // Variable actions
  const handleAddVariable = async (v: any) => {
    if (!activeProject?._id) return;
    try {
      const res = await fetch('/api/terraform/variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, projectId: activeProject._id }),
      });
      const data = await res.json();
      if (data.success && data.variable) {
        setVariables((prev) => [data.variable, ...prev]);
        showBanner('success', `Variable '${v.key}' added.`);
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to add variable');
    }
  };

  const handleDeleteVariable = async (id: string) => {
    try {
      const res = await fetch(`/api/terraform/variables?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setVariables((prev) => prev.filter((v) => v._id !== id));
        showBanner('info', 'Variable removed.');
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to delete variable');
    }
  };

  // Module & Template Injection
  const handleApplyModule = async (moduleHcl: string) => {
    if (!activeProject?._id) return;
    const currentMain = activeProject.files?.find((f: any) => f.name === 'main.tf')?.content || '';
    const newContent = `${currentMain}\n\n${moduleHcl}`;
    await handleSaveFile('main.tf', newContent);
    showBanner('success', 'Registry module appended to main.tf');
    switchTab('code');
  };

  const handleApplyTemplate = async (template: any) => {
    if (!activeProject?._id) return;
    try {
      const files = template.files || [
        { name: 'main.tf', content: template.mainHcl || '' },
        { name: 'variables.tf', content: template.variablesHcl || '' },
        { name: 'outputs.tf', content: template.outputsHcl || '' },
      ];

      const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        showBanner('success', `Applied template '${template.title}' to ${activeProject.name}`);
        switchTab('code');
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to apply template');
    }
  };

  // Approval decisions
  const handleApprovalDecision = async (
    approvalId: string,
    decisionStatus: 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      const res = await fetch('/api/terraform/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, status: decisionStatus, notes }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovals((prev) =>
          prev.map((a) =>
            a._id === approvalId
              ? { ...a, status: decisionStatus, decidedAt: new Date().toISOString() }
              : a
          )
        );
        showBanner('success', `Request ${decisionStatus} successfully.`);
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to update approval');
    }
  };

  // Delete Project
  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/terraform/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProjects((prev) => prev.filter((p) => p._id !== id));
        if (activeProject?._id === id) {
          const rem = projects.filter((p) => p._id !== id);
          setActiveProject(rem[0] || null);
        }
        showBanner('info', 'Project archived.');
      }
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to delete project');
    }
  };

  // Pending approvals count
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  // Tab definitions (Exact requested order)
  const tabs: { key: TerraformTabKey; label: string; icon: any; badge?: number }[] = [
    { key: 'providers', label: 'Cloud Providers', icon: Cloud },
    { key: 'resources', label: 'Resources', icon: Server },
    { key: 'builder', label: 'Infrastructure Builder', icon: Cpu },
    { key: 'code', label: 'Terraform Code', icon: Code },
    { key: 'import', label: 'Import Resources', icon: DownloadCloud },
    { key: 'workspaces', label: 'Workspaces', icon: Layers },
    { key: 'modules', label: 'Modules', icon: Box },
    { key: 'secrets', label: 'Secrets & Credentials', icon: ShieldCheck },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 space-y-6 w-full max-w-[1600px] mx-auto">
          {/* Top Feedback Banner */}
          {bannerFeedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 shadow-lg ${
                bannerFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20'
                  : bannerFeedback.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300 shadow-red-950/20'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-cyan-950/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {bannerFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : bannerFeedback.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
                <span>{bannerFeedback.message}</span>
              </div>
              <button
                onClick={() => setBannerFeedback(null)}
                className="text-gray-400 hover:text-white text-xs px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Master Control Bar */}
          <div className="bg-[#090F1E]/90 border border-purple-500/30 rounded-2xl p-5 shadow-2xl shadow-purple-950/30 backdrop-blur-md">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              {/* Brand Title */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 via-cyan-500/20 to-blue-500/20 border border-purple-500/40 flex items-center justify-center shadow-lg shadow-purple-950/40">
                  <TerraformLogo className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl font-extrabold text-white tracking-tight">
                      Terraform
                    </h1>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      Automation Center
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      CLI v1.14.6
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Production Infrastructure as Code automation for AWS & Microsoft Azure
                  </p>
                </div>
              </div>

              {/* Quick Actions & Selectors */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Active Project Selector */}
                <div className="flex items-center gap-1.5 bg-[#0D1526] border border-gray-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-gray-400 font-medium">Stack:</span>
                  <select
                    value={activeProject?._id || ''}
                    onChange={(e) => {
                      const p = projects.find((x) => x._id === e.target.value);
                      if (p) setActiveProject(p);
                    }}
                    className="bg-transparent text-xs text-white font-mono font-semibold focus:outline-none cursor-pointer max-w-[140px] truncate"
                  >
                    {projects.length === 0 ? (
                      <option value="">No Projects</option>
                    ) : (
                      projects.map((p) => (
                        <option key={p._id} value={p._id} className="bg-[#090F1E] text-white">
                          {p.name} ({p.provider.toUpperCase()})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Workspace Switcher */}
                {activeProject && (
                  <div className="flex items-center gap-1.5 bg-[#0D1526] border border-gray-800 rounded-xl px-3 py-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <select
                      value={activeProject.currentWorkspace || 'default'}
                      onChange={(e) => handleSwitchWorkspace(e.target.value)}
                      className="bg-transparent text-xs text-purple-300 font-mono font-semibold focus:outline-none cursor-pointer"
                    >
                      {(activeProject.workspaces || ['default']).map((ws: string) => (
                        <option key={ws} value={ws} className="bg-[#090F1E] text-white">
                          ws: {ws}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quick Plan */}
                <button
                  onClick={() => handleExecute('plan')}
                  disabled={isExecuting || !activeProject}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Run terraform plan"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Plan</span>
                </button>

                {/* Quick Apply */}
                <button
                  onClick={() => handleExecute('apply')}
                  disabled={isExecuting || !activeProject}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Deploy infrastructure changes with terraform apply"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply</span>
                </button>

                {/* Approvals */}
                {pendingApprovalsCount > 0 && (
                  <button
                    onClick={() => setApprovalModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 animate-pulse"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Approvals ({pendingApprovalsCount})</span>
                  </button>
                )}

                {/* Server Installation */}
                <button
                  onClick={() => setServerInstallModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium transition-all flex items-center gap-1.5"
                  title="Install Terraform on Linux Servers"
                >
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Server CLI</span>
                </button>

                {/* Create Project Button */}
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Project</span>
                </button>

                {/* Refresh */}
                <button
                  onClick={fetchData}
                  className="p-2 rounded-xl bg-[#0D1526] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white transition-colors"
                  title="Refresh Data"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>

                {/* Style Customizer */}
                <ModuleCustomizeButton moduleId="terraform" moduleName="Terraform" />
              </div>
            </div>

            {/* Sub-bar: Active Stack Details */}
            {activeProject && (
              <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-mono text-gray-300 font-bold">
                    {activeProject.provider === 'aws' ? (
                      <AwsLogo className="w-4 h-4" />
                    ) : (
                      <AzureLogo className="w-4 h-4" />
                    )}
                    <span>{activeProject.name}</span>
                  </div>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 font-mono">Region: {activeProject.region}</span>
                  <span className="text-gray-600">•</span>
                  <span
                    className={`font-mono uppercase font-bold text-[10px] px-2 py-0.5 rounded ${
                      activeProject.environment === 'production'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : activeProject.environment === 'staging'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {activeProject.environment}
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 font-mono">
                    Backend: {activeProject.backend?.type || 'local'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-500 text-[11px] font-mono">
                  <span>Files: {activeProject.files?.length || 0}</span>
                  <span>•</span>
                  <span>
                    Last Exec: {activeProject.lastExecutionAt ? new Date(activeProject.lastExecutionAt).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 19-Tab Horizontal Navigation Scrollable Bar */}
          <div className="bg-[#090F1E]/80 border border-gray-800/90 rounded-2xl p-2 shadow-xl overflow-x-auto no-scrollbar backdrop-blur">
            <div className="flex items-center gap-1.5 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => switchTab(tab.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-950/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-400'
                      }`}
                    />
                    <span>{tab.label}</span>
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive
                            ? 'bg-cyan-500/30 text-cyan-200'
                            : 'bg-gray-800 text-gray-400'
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

          {/* Tab Content Router */}
          <div className="animate-in fade-in duration-200">
            {/* Cloud Providers */}
            {activeTab === 'providers' && (
              <TerraformProvidersTab
                activeProject={activeProject}
                cloudAccounts={cloudAccounts}
                onSelectProvider={async (prov: 'aws' | 'azure') => {
                  if (!activeProject?._id) return;
                  const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider: prov }),
                  });
                  const d = await res.json();
                  if (d.success && d.project) {
                    setActiveProject(d.project);
                    showBanner('success', `Target provider updated to ${prov.toUpperCase()}`);
                  }
                }}
                onSelectAccount={async (accId: string) => {
                  if (!activeProject?._id) return;
                  const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cloudAccountId: accId }),
                  });
                  const d = await res.json();
                  if (d.success && d.project) {
                    setActiveProject(d.project);
                    showBanner('success', 'Connected credentials updated');
                  }
                }}
              />
            )}

            {/* 3. Infrastructure Builder */}
            {activeTab === 'builder' && (
              <TerraformBuilderTab
                activeProject={activeProject}
                onAppendCodeToProject={async (code: string) => {
                  const currentMain =
                    activeProject?.files?.find((f: any) => f.name === 'main.tf')?.content || '';
                  const updated = `${currentMain}\n\n${code}`;
                  await handleSaveFile('main.tf', updated);
                  showBanner('success', 'Generated HCL appended to main.tf');
                  switchTab('code');
                }}
                onSaveFiles={async (files: Array<{ name: string; content: string }>) => {
                  if (!activeProject?._id) return;
                  const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files }),
                  });
                  const d = await res.json();
                  if (d.success && d.project) {
                    setActiveProject(d.project);
                    showBanner('success', 'Infrastructure stack saved to project');
                  }
                }}
                onApplyTemplateToProject={handleApplyTemplate}
                onSwitchTab={switchTab}
                onOpenCreateProject={(templateId) => {
                  setSelectedTemplateForCreate(templateId);
                  setCreateModalOpen(true);
                }}
              />
            )}

            {/* 4. Terraform Code */}
            {activeTab === 'code' && (
              <TerraformCodeTab
                activeProject={activeProject}
                onSaveFiles={async (files: Array<{ name: string; content: string }>) => {
                  if (!activeProject?._id) return;
                  const res = await fetch(`/api/terraform/projects/${activeProject._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files }),
                  });
                  const d = await res.json();
                  if (d.success && d.project) {
                    setActiveProject(d.project);
                    showBanner('success', 'Terraform files saved');
                  }
                }}
                onExecuteAction={handleExecute}
                isExecuting={isExecuting}
                activeLogs={activeLogs}
                onSwitchTab={switchTab}
              />
            )}

            {/* Workspaces */}
            {activeTab === 'workspaces' && (
              <TerraformWorkspacesTab
                activeProject={activeProject}
                onSwitchWorkspace={handleSwitchWorkspace}
                onCreateWorkspace={handleCreateWorkspace}
                onDeleteWorkspace={handleDeleteWorkspace}
              />
            )}

            {/* Modules */}
            {activeTab === 'modules' && (
              <TerraformModulesTab
                onApplyModule={handleApplyModule}
              />
            )}

            {/* Resources */}
            {activeTab === 'resources' && (
              <TerraformResourcesTab
                activeProject={activeProject}
                onSwitchTab={switchTab}
              />
            )}

            {/* Import Resources */}
            {activeTab === 'import' && (
              <TerraformImportTab
                activeProject={activeProject}
                onExecuteImport={(addr, id) => handleExecute('import', [addr, id])}
                onSwitchTab={switchTab}
              />
            )}

            {/* Secrets & Credentials */}
            {activeTab === 'secrets' && (
              <TerraformSecretsTab
                activeProject={activeProject}
                cloudAccounts={cloudAccounts}
                onShowBanner={showBanner}
              />
            )}

            {/* Settings */}
            {activeTab === 'settings' && (
              <TerraformSettingsTab
                settings={globalSettings}
                onSaveSettings={async (newSet) => {
                  try {
                    const res = await fetch('/api/terraform/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newSet),
                    });
                    const d = await res.json();
                    if (d.success && d.settings) {
                      setGlobalSettings(d.settings);
                      showBanner('success', 'Terraform settings updated successfully');
                    }
                  } catch (err: any) {
                    showBanner('error', err.message || 'Failed to update settings');
                  }
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setSelectedTemplateForCreate(undefined);
        }}
        cloudAccounts={cloudAccounts}
        initialTemplateId={selectedTemplateForCreate}
        onProjectCreated={(newProj) => {
          setProjects((prev) => [newProj, ...prev]);
          setActiveProject(newProj);
          showBanner('success', `Project '${newProj.name}' created successfully.`);
          switchTab('code');
        }}
      />

      <TerraformApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        approvals={approvals}
        onDecision={handleApprovalDecision}
      />

      <TerraformServerInstallModal
        isOpen={serverInstallModalOpen}
        onClose={() => setServerInstallModalOpen(false)}
        servers={servers}
      />
    </div>
  );
}
