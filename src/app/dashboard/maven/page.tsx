'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  RotateCw,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  AlertTriangle,
  FolderGit2,
  FileBox,
  Layers,
  Radio,
  Server,
  Activity,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { MavenLogo } from '@/components/icons/CloudIcons';
import { MavenQuickRunCard } from '@/components/dashboard/maven/MavenQuickRunCard';
import { MavenProjectsTable } from '@/components/dashboard/maven/MavenProjectsTable';
import { MavenBuildHistoryTable } from '@/components/dashboard/maven/MavenBuildHistoryTable';
import { MavenActiveAppsTable } from '@/components/dashboard/maven/MavenActiveAppsTable';
import { CreateMavenProjectModal } from '@/components/dashboard/maven/CreateMavenProjectModal';
import { RunAppConfigModal } from '@/components/dashboard/maven/RunAppConfigModal';
import { AppLogsModal } from '@/components/dashboard/maven/AppLogsModal';
import { IMavenProjectData } from '@/models/MavenProject';
import { IMavenAppData } from '@/models/MavenApp';

interface MavenSummary {
  totalProjects: number;
  successfulBuilds: number;
  failedBuilds: number;
  runningBuilds: number;
  totalArtifacts: number;
}

export default function MavenPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'runner' | 'apps' | 'projects' | 'history'>('runner');

  const [projects, setProjects] = useState<IMavenProjectData[]>([]);
  const [apps, setApps] = useState<IMavenAppData[]>([]);
  const [summary, setSummary] = useState<MavenSummary>({
    totalProjects: 0,
    successfulBuilds: 0,
    failedBuilds: 0,
    runningBuilds: 0,
    totalArtifacts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<IMavenProjectData | null>(null);
  const [runningProjectId, setRunningProjectId] = useState<string | null>(null);

  // Active Runner State
  const [runnerProject, setRunnerProject] = useState<IMavenProjectData | null>(null);
  const [runnerBuildId, setRunnerBuildId] = useState<string | null>(null);

  // Run App Modal State
  const [runModalTarget, setRunModalTarget] = useState<{
    projectId?: string;
    projectName?: string;
    buildId?: string;
    artifactName?: string;
  } | null>(null);

  // App Logs Modal State
  const [selectedAppForLogs, setSelectedAppForLogs] = useState<IMavenAppData | null>(null);

  // Delete confirm dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Status banner / toast
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchProjectsAndSummary = async () => {
    try {
      const res = await fetch('/api/maven/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Maven projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      setAppsLoading(true);
      const res = await fetch('/api/maven/apps');
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps || []);
      }
    } catch (err) {
      console.warn('Failed to fetch apps:', err);
    } finally {
      setAppsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndSummary();
    fetchApps();
    const interval = setInterval(() => {
      fetchProjectsAndSummary();
      fetchApps();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleEdit = (project: IMavenProjectData) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingProject(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/maven/projects/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: data.message || `Project "${deleteConfirm.name}" deleted.`,
        });
        fetchProjectsAndSummary();
      } else {
        throw new Error(data.error || 'Failed to delete project');
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error deleting project',
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleRunBuildFromTable = async (project: IMavenProjectData) => {
    setRunningProjectId(project._id);
    try {
      const res = await fetch(`/api/maven/projects/${project._id}/build`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          message: `Build #${data.buildNumber} started for "${project.name}". Switched to Active Runner to view live logs.`,
        });
        setRunnerProject(project);
        setRunnerBuildId(data.buildId);
        setActiveTab('runner');
        fetchProjectsAndSummary();
      } else {
        throw new Error(data.error || 'Failed to trigger build');
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error triggering build',
      });
    } finally {
      setRunningProjectId(null);
    }
  };

  const handleStopApp = async (appId: string) => {
    try {
      const res = await fetch(`/api/maven/apps/${appId}/stop`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          message: data.message || 'Application stopped.',
        });
        fetchApps();
      } else {
        throw new Error(data.error || 'Failed to stop application');
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to stop application',
      });
    }
  };

  const handleDeleteApp = async (appId: string) => {
    try {
      const res = await fetch(`/api/maven/apps/${appId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: 'Application record removed.',
        });
        fetchApps();
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to delete app record',
      });
    }
  };

  const runningAppsCount = apps.filter((a) => a.status === 'RUNNING' || a.status === 'STARTING').length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 space-y-6 w-full">
          {/* Page Title & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500/20 via-amber-500/20 to-blue-500/20 border border-slate-700/60 flex items-center justify-center shadow-lg shadow-indigo-950/40">
                <MavenLogo className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Maven</span>
                </h1>
                <p className="text-xs text-slate-400">
                  Build Java projects and autonomously run executable applications with browser access
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchProjectsAndSummary();
                  fetchApps();
                }}
                disabled={loading}
                title="Refresh projects and metrics"
                className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 transition-colors"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              </button>

              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Maven Project</span>
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          {actionFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{actionFeedback.message}</span>
              </div>
              <button
                onClick={() => setActionFeedback(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
          )}

          {/* Summary Cards */}
          <section aria-label="Maven Summary Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {/* Total Maven Projects */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Total Maven Projects
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white font-mono">
                    {summary.totalProjects}
                  </span>
                  <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full">
                    Configured
                  </span>
                </div>
              </div>

              {/* Successful Builds */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Successful Builds
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-emerald-400 font-mono">
                    {summary.successfulBuilds}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Passed
                  </span>
                </div>
              </div>

              {/* Failed Builds */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Failed Builds
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-rose-400 font-mono">
                    {summary.failedBuilds}
                  </span>
                  <span className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full">
                    Errors
                  </span>
                </div>
              </div>

              {/* Running Builds */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Running Builds
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-blue-400 font-mono">
                    {summary.runningBuilds}
                  </span>
                  <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              </div>

              {/* Total Build Artifacts */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Total Build Artifacts
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-cyan-400">
                    {summary.totalArtifacts}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-full">
                    JAR / WAR
                  </span>
                </div>
              </div>

              {/* Running Applications */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Running Applications
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    {runningAppsCount}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${runningAppsCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    Live
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-1 select-none overflow-x-auto">
            <button
              onClick={() => setActiveTab('runner')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-semibold text-xs transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'runner'
                  ? 'border-blue-500 text-white bg-[#111A2E]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Build &amp; Runner</span>
            </button>

            <button
              onClick={() => setActiveTab('apps')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-semibold text-xs transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'apps'
                  ? 'border-blue-500 text-white bg-[#111A2E]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>Active Applications ({runningAppsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-semibold text-xs transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'projects'
                  ? 'border-blue-500 text-white bg-[#111A2E]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Configured Projects ({projects.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-semibold text-xs transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-blue-500 text-white bg-[#111A2E]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Build History &amp; Artifacts</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'runner' && (
            <MavenQuickRunCard
              projects={projects}
              selectedProject={runnerProject}
              activeBuildId={runnerBuildId}
              onResetToDefault={() => {
                setRunnerProject(null);
                setRunnerBuildId(null);
              }}
              onBuildCompleted={() => {
                fetchProjectsAndSummary();
                fetchApps();
              }}
              onAppStarted={(app) => {
                fetchApps();
                setActionFeedback({
                  type: 'success',
                  message: `Application "${app.projectName}" is running on port ${app.port}!`,
                });
              }}
            />
          )}

          {activeTab === 'apps' && (
            <MavenActiveAppsTable
              apps={apps}
              loading={appsLoading}
              onRefresh={fetchApps}
              onStartApp={(app) => {
                setRunModalTarget({
                  projectId: app.projectId,
                  projectName: app.projectName,
                  buildId: app.buildId,
                  artifactName: app.artifactName,
                });
              }}
              onStopApp={handleStopApp}
              onDeleteApp={handleDeleteApp}
              onViewLogs={(app) => setSelectedAppForLogs(app)}
            />
          )}

          {activeTab === 'projects' && (
            <MavenProjectsTable
              projects={projects}
              loading={loading}
              onRefresh={fetchProjectsAndSummary}
              onEdit={handleEdit}
              onDelete={(id, name) => setDeleteConfirm({ id, name })}
              onRunBuild={handleRunBuildFromTable}
              onRunApp={(project) => {
                setRunModalTarget({
                  projectId: project._id,
                  projectName: project.name,
                });
              }}
              runningProjectId={runningProjectId}
            />
          )}

          {activeTab === 'history' && (
            <MavenBuildHistoryTable onRefreshSummary={fetchProjectsAndSummary} />
          )}
        </main>
      </div>

      {/* Create / Edit Project Modal */}
      <CreateMavenProjectModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        onSaved={fetchProjectsAndSummary}
        editProject={editingProject}
      />

      {/* Run Application Modal */}
      {runModalTarget && (
        <RunAppConfigModal
          isOpen={Boolean(runModalTarget)}
          onClose={() => setRunModalTarget(null)}
          onAppStarted={(app) => {
            fetchApps();
            setActionFeedback({
              type: 'success',
              message: `Application "${app.projectName}" launched on port ${app.port}. Click Open App to access.`,
            });
          }}
          defaultProjectId={runModalTarget.projectId}
          defaultProjectName={runModalTarget.projectName}
          defaultBuildId={runModalTarget.buildId}
          defaultArtifactName={runModalTarget.artifactName}
        />
      )}

      {/* Application Logs Modal */}
      {selectedAppForLogs && (
        <AppLogsModal
          app={selectedAppForLogs}
          isOpen={Boolean(selectedAppForLogs)}
          onClose={() => setSelectedAppForLogs(null)}
          onStopApp={handleStopApp}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#111A2E] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Maven Project?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  This will permanently delete &quot;{deleteConfirm.name}&quot;, its configuration, and its local build workspace. Remote Git repositories will remain untouched.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-[#18233C] text-slate-300 font-semibold text-xs hover:bg-[#202E4E] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-600/30"
              >
                Yes, Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
