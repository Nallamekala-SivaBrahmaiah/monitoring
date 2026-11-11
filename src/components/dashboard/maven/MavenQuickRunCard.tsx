'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Globe,
  GitBranch,
  Folder,
  Play,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Copy,
  Check,
  RotateCw,
  Loader2,
  AlertTriangle,
  StopCircle,
  FileBox,
  ExternalLink,
  Square,
  Server,
  Activity,
  Layers,
  Sparkles,
  FolderGit2,
} from 'lucide-react';
import { MavenLogo } from '@/components/icons/CloudIcons';
import { IMavenBuildData } from '@/models/MavenBuild';
import { IMavenAppData } from '@/models/MavenApp';
import { IMavenProjectData } from '@/models/MavenProject';
import { RunAppConfigModal } from './RunAppConfigModal';
import { AppLogsModal } from './AppLogsModal';

const DEFAULT_REPO = 'https://github.com/spring-projects/spring-petclinic.git';

interface MavenQuickRunCardProps {
  projects?: IMavenProjectData[];
  onBuildCompleted?: () => void;
  onAppStarted?: (app: IMavenAppData) => void;
  selectedProject?: IMavenProjectData | null;
  activeBuildId?: string | null;
  onResetToDefault?: () => void;
}

export function MavenQuickRunCard({
  projects = [],
  onBuildCompleted,
  onAppStarted,
  selectedProject,
  activeBuildId,
  onResetToDefault,
}: MavenQuickRunCardProps) {
  // Selected project dropdown value: '__default__' | '__custom__' | projectId
  const [selectedProjectId, setSelectedProjectId] = useState<string>('__default__');

  // Build Configuration State (Default: Spring PetClinic)
  const [repositoryUrl, setRepositoryUrl] = useState(DEFAULT_REPO);
  const [branch, setBranch] = useState('main');
  const [projectFolder, setProjectFolder] = useState('.');
  const [mavenCommand, setMavenCommand] = useState('mvn clean package');
  const [projectName, setProjectName] = useState('spring-petclinic');

  // Active Build State
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null);
  const [buildData, setBuildData] = useState<IMavenBuildData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Runtime Application State
  const [activeApp, setActiveApp] = useState<IMavenAppData | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isStoppingApp, setIsStoppingApp] = useState(false);
  const [detectionInfo, setDetectionInfo] = useState<any>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Helper to load latest build for a project ID
  const loadLatestBuildForProject = async (projectId: string, repoUrl?: string) => {
    try {
      const res = await fetch(`/api/maven/builds?projectId=${projectId}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.builds && data.builds.length > 0) {
          const fullRes = await fetch(`/api/maven/builds/${data.builds[0]._id}`);
          if (fullRes.ok) {
            const fullJson = await fullRes.json();
            if (fullJson.build) {
              setBuildData(fullJson.build);
              setCurrentBuildId(fullJson.build._id);
              if (fullJson.build.status === 'RUNNING') {
                setIsRunning(true);
              } else {
                setIsRunning(false);
              }
              if (fullJson.build.status === 'SUCCESS') {
                detectArtifact(fullJson.build._id);
              }
              return;
            }
          }
        }
      }
      setBuildData(null);
      setCurrentBuildId(null);
      setIsRunning(false);
      setDetectionInfo(null);
    } catch (err) {
      console.warn('Error loading build for project:', err);
    }
  };

  // Helper to load latest build for Spring PetClinic default
  const loadDefaultPetClinicBuild = async () => {
    try {
      const res = await fetch('/api/maven/builds?limit=10');
      if (res.ok) {
        const data = await res.json();
        if (data.builds && data.builds.length > 0) {
          const petclinicBuild =
            data.builds.find(
              (b: any) =>
                b.repositoryUrl?.includes('spring-petclinic') ||
                b.projectName?.toLowerCase().includes('petclinic')
            ) || data.builds[0];

          if (petclinicBuild) {
            const fullRes = await fetch(`/api/maven/builds/${petclinicBuild._id}`);
            if (fullRes.ok) {
              const fullJson = await fullRes.json();
              if (fullJson.build) {
                setBuildData(fullJson.build);
                setCurrentBuildId(fullJson.build._id);
                if (fullJson.build.status === 'RUNNING') {
                  setIsRunning(true);
                } else {
                  setIsRunning(false);
                }
                if (fullJson.build.status === 'SUCCESS') {
                  detectArtifact(fullJson.build._id);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error loading initial petclinic build:', err);
    }
  };

  // Sync inputs when selectedProject or activeBuildId is passed via props
  useEffect(() => {
    if (activeBuildId) {
      setCurrentBuildId(activeBuildId);
      setIsRunning(true);
      if (selectedProject) {
        setSelectedProjectId(selectedProject._id);
        setRepositoryUrl(selectedProject.repositoryUrl);
        setBranch(selectedProject.branch || 'main');
        setProjectFolder(selectedProject.projectFolder || '.');
        setMavenCommand(selectedProject.mavenCommand || 'mvn clean package');
        setProjectName(selectedProject.name);
      }
      return;
    }

    if (selectedProject) {
      setSelectedProjectId(selectedProject._id);
      setRepositoryUrl(selectedProject.repositoryUrl);
      setBranch(selectedProject.branch || 'main');
      setProjectFolder(selectedProject.projectFolder || '.');
      setMavenCommand(selectedProject.mavenCommand || 'mvn clean package');
      setProjectName(selectedProject.name);
      loadLatestBuildForProject(selectedProject._id, selectedProject.repositoryUrl);
      return;
    }

    // Default configuration: Spring PetClinic
    setSelectedProjectId('__default__');
    setRepositoryUrl(DEFAULT_REPO);
    setBranch('main');
    setProjectFolder('.');
    setMavenCommand('mvn clean package');
    setProjectName('spring-petclinic');
    loadDefaultPetClinicBuild();
  }, [activeBuildId, selectedProject]);

  // Handler for user selecting project from dropdown
  const handleSelectProject = (val: string) => {
    setSelectedProjectId(val);
    setError(null);

    if (val === '__default__') {
      setRepositoryUrl(DEFAULT_REPO);
      setBranch('main');
      setProjectFolder('.');
      setMavenCommand('mvn clean package');
      setProjectName('spring-petclinic');
      loadDefaultPetClinicBuild();
      if (onResetToDefault) onResetToDefault();
    } else if (val === '__custom__') {
      setProjectName('');
      setRepositoryUrl('');
      setBranch('main');
      setProjectFolder('.');
      setMavenCommand('mvn clean package');
      setBuildData(null);
      setCurrentBuildId(null);
      setDetectionInfo(null);
    } else {
      const proj = projects.find((p) => p._id === val);
      if (proj) {
        setProjectName(proj.name);
        setRepositoryUrl(proj.repositoryUrl);
        setBranch(proj.branch || 'main');
        setProjectFolder(proj.projectFolder || '.');
        setMavenCommand(proj.mavenCommand || 'mvn clean package');
        loadLatestBuildForProject(proj._id, proj.repositoryUrl);
      }
    }
  };

  // Check for any currently running app corresponding to this build/workspace
  const checkRunningApps = async () => {
    try {
      const res = await fetch('/api/maven/apps');
      if (res.ok) {
        const data = await res.json();
        if (data.apps && Array.isArray(data.apps)) {
          const match = data.apps.find(
            (a: IMavenAppData) =>
              (currentBuildId && a.buildId === currentBuildId) ||
              (a.projectName === projectName && (a.status === 'RUNNING' || a.status === 'STARTING'))
          );
          if (match) {
            setActiveApp(match);
          } else if (activeApp && activeApp.status === 'RUNNING') {
            const fresh = data.apps.find((a: IMavenAppData) => a._id === activeApp._id);
            if (fresh) setActiveApp(fresh);
          }
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    checkRunningApps();
    const appInterval = setInterval(checkRunningApps, 3000);
    return () => clearInterval(appInterval);
  }, [currentBuildId, projectName]);

  // Poll active build logs
  useEffect(() => {
    if (!currentBuildId) return;

    let pollInterval: NodeJS.Timeout;

    const fetchBuildStatus = async () => {
      try {
        const res = await fetch(`/api/maven/builds/${currentBuildId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.build) {
            setBuildData(data.build);

            if (data.build.status === 'RUNNING' || data.build.status === 'QUEUED') {
              setIsRunning(true);
            } else {
              setIsRunning(false);
              clearInterval(pollInterval);
              if (onBuildCompleted) {
                onBuildCompleted();
              }
              if (data.build.status === 'SUCCESS') {
                detectArtifact(data.build._id);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error polling build logs:', err);
      }
    };

    fetchBuildStatus();
    pollInterval = setInterval(fetchBuildStatus, 1500);

    return () => clearInterval(pollInterval);
  }, [currentBuildId]);

  // Auto-detect artifact capabilities
  const detectArtifact = async (buildId: string) => {
    try {
      const res = await fetch('/api/maven/apps/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDetectionInfo(data);
        }
      }
    } catch (err) {
      console.warn('Detection error:', err);
    }
  };

  // Auto-scroll logs to bottom during active build
  useEffect(() => {
    if (isRunning && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [buildData?.logs, isRunning]);

  const handleStartBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repositoryUrl.trim()) {
      setError('Please provide a valid GitHub repository URL.');
      return;
    }

    setError(null);
    setIsStarting(true);
    try {
      const res = await fetch('/api/maven/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryUrl: repositoryUrl.trim(),
          branch: branch.trim() || 'main',
          projectFolder: projectFolder.trim() || '.',
          mavenCommand: mavenCommand.trim(),
          projectName: projectName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start build');
      }

      setCurrentBuildId(data.buildId);
      setIsRunning(true);
    } catch (err: any) {
      setError(err.message || 'Error triggering build');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelBuild = async () => {
    if (!currentBuildId) return;
    try {
      await fetch(`/api/maven/builds/${currentBuildId}/cancel`, { method: 'POST' });
      setIsRunning(false);
    } catch (err) {
      console.warn('Error cancelling build:', err);
    }
  };

  const handleCopyLogs = () => {
    if (buildData?.logs) {
      navigator.clipboard.writeText(buildData.logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadArtifact = (artifactName?: string) => {
    if (!currentBuildId) return;
    const url = `/api/maven/builds/${currentBuildId}/download${
      artifactName ? `?artifact=${encodeURIComponent(artifactName)}` : ''
    }`;
    window.open(url, '_blank');
  };

  const handleStopApp = async () => {
    if (!activeApp) return;
    setIsStoppingApp(true);
    try {
      const res = await fetch(`/api/maven/apps/${activeApp._id}/stop`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActiveApp(data.app);
      }
    } catch (err: any) {
      console.warn('Failed to stop app:', err);
    } finally {
      setIsStoppingApp(false);
    }
  };

  const isSuccess = buildData?.status === 'SUCCESS';
  const isFailed = buildData?.status === 'FAILED';
  const isCancelled = buildData?.status === 'CANCELLED';

  const isAppRunning = activeApp?.status === 'RUNNING';
  const isAppStarting = activeApp?.status === 'STARTING';

  return (
    <div className="space-y-4 text-xs select-none">
      {/* 1. Build Configuration Card */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
            <Settings className="w-4 h-4 text-blue-400" />
            <span>Build Configuration</span>
          </div>

          <button
            type="button"
            onClick={() => handleSelectProject('__default__')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              selectedProjectId === '__default__'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                : 'bg-[#18233C] hover:bg-[#223356] border-[#1E293B] text-slate-300 hover:text-white'
            }`}
            title="Reset repository to Spring PetClinic default"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Default: Spring PetClinic</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStartBuild} className="space-y-4">
          {/* Project Selector Box */}
          <div className="p-3.5 rounded-xl bg-[#0D1526] border border-[#1E293B] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-slate-200 font-bold flex items-center gap-1.5">
                <FolderGit2 className="w-4 h-4 text-blue-400" />
                <span>Select Maven Project</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Choose a configured project (e.g.{' '}
                {projects && projects.length > 0
                  ? projects.map((p) => p.name).join(', ')
                  : 'dog, java'}
                ) or the default demo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 outline-none cursor-pointer font-medium text-xs shadow-inner"
                >
                  <option value="__default__">✨ Spring PetClinic (Default Demo)</option>
                  {projects && projects.length > 0 && (
                    <optgroup label="Configured Projects">
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>
                          📁 {p.name} — {p.repositoryUrl.replace('https://github.com/', '')}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__custom__">➕ Custom Git Repository URL...</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project Name"
                  className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GitHub Repository URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold flex items-center gap-1">
                  <span>GitHub Repository URL</span>
                  <span className="text-rose-400">*</span>
                </label>
                {repositoryUrl === DEFAULT_REPO && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Default Project
                  </span>
                )}
              </div>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  placeholder="https://github.com/username/project.git"
                  className="w-full bg-[#0D1526] border border-[#1E293B] focus:border-blue-500 rounded-xl pl-10 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <span>Branch</span>
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-[#0D1526] border border-[#1E293B] focus:border-blue-500 rounded-xl pl-10 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Project Folder */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <span>Project Folder</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Folder className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={projectFolder}
                  onChange={(e) => setProjectFolder(e.target.value)}
                  placeholder="e.g. src, backend or . (repository root)"
                  className="w-full bg-[#0D1526] border border-[#1E293B] focus:border-blue-500 rounded-xl pl-10 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Maven Command */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <span>Maven Command</span>
              </label>
              <div className="relative">
                <Play className="w-3.5 h-3.5 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={mavenCommand}
                  onChange={(e) => setMavenCommand(e.target.value)}
                  className="w-full bg-[#0D1526] border border-[#1E293B] focus:border-blue-500 rounded-xl pl-10 pr-3 py-2 text-slate-100 outline-none cursor-pointer font-mono text-[11px]"
                >
                  <option value="mvn clean package">mvn clean package (Package Application)</option>
                  <option value="mvn clean install">mvn clean install (Local Repository Install)</option>
                  <option value="mvn test">mvn test (Run Unit &amp; Integration Tests)</option>
                  <option value="mvn package -DskipTests">mvn package -DskipTests (Fast Build)</option>
                  <option value="mvn clean verify">mvn clean verify (Full Verification)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isRunning || isStarting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing Isolated Workspace...</span>
                </>
              ) : isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Building Project #{buildData?.buildNumber || 1}...</span>
                </>
              ) : (
                <>
                  <MavenLogo className="w-4 h-4" />
                  <span>Run Maven Build ({projectName})</span>
                </>
              )}
            </button>

            {isRunning && (
              <button
                type="button"
                onClick={handleCancelBuild}
                className="py-2.5 px-4 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 2. Lower Split: Live Build Logs & Build Status with Application Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns: Live Build Logs Terminal */}
        <div className="lg:col-span-2 bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-xl flex flex-col justify-between h-[480px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Build Logs</span>
              {isRunning ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live Logs
                </span>
              ) : buildData ? (
                <span className="text-[11px] text-slate-400 font-mono">
                  Build #{buildData.buildNumber} ({buildData.projectName})
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                disabled={!buildData?.logs}
                className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] transition-colors disabled:opacity-40"
                title="Copy Logs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Terminal Console View */}
          <div className="flex-1 my-3 bg-[#070C18] rounded-xl p-3.5 font-mono text-[11px] text-slate-300 overflow-y-auto leading-relaxed border border-[#1E293B]/60 selection:bg-blue-600/30">
            {buildData?.logs ? (
              <pre className="whitespace-pre-wrap break-all font-mono">
                {buildData.logs}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-1">
                <Terminal className="w-8 h-8 opacity-40" />
                <p className="font-semibold text-slate-400">Loading Build Output...</p>
                <p className="text-[10px] text-slate-600">
                  Retrieving build logs for {projectName}...
                </p>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>

          <div className="pt-1 text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>Workspace: .maven-workspaces/</span>
            <span>
              Status: {buildData?.status || 'READY'} (Code:{' '}
              {buildData?.status === 'SUCCESS' ? '0' : buildData?.status === 'FAILED' ? '1' : '--'})
            </span>
          </div>
        </div>

        {/* Right Column: Build Status & Application Runtime Controls */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-xl flex flex-col justify-between h-[480px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Build &amp; App Runtime</span>
              </div>
              {detectionInfo?.detection?.framework && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {detectionInfo.detection.framework}
                </span>
              )}
            </div>

            {/* Status Hero */}
            <div className="py-4 flex flex-col items-center justify-center text-center">
              {isRunning ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <h3 className="text-sm font-bold text-blue-400">Building Project...</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-[220px]">
                    Compiling Java source code and packaging executable JAR...
                  </p>
                </>
              ) : isSuccess ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-400">Build Successful!</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {detectionInfo?.detection?.isExecutable
                      ? 'Executable artifact generated & ready to run'
                      : 'Project compiled and packaged successfully'}
                  </p>
                </>
              ) : isFailed ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2 shadow-lg shadow-rose-500/20">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-rose-400">Build Failed</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {buildData?.errorMessage || 'Check build logs on the left.'}
                  </p>
                </>
              ) : isCancelled ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-slate-700/20 border border-slate-600/30 flex items-center justify-center text-slate-400 mb-2">
                    <StopCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-300">Build Cancelled</h3>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-slate-800/40 border border-slate-700/40 flex items-center justify-center text-slate-500 mb-2">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-300">Ready to Build &amp; Run</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Trigger a build to generate executable artifact.
                  </p>
                </>
              )}
            </div>

            {/* Application Runtime Live Indicator */}
            {activeApp && (
              <div className="mb-3 p-3 bg-[#0D1526] rounded-xl border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Application Status</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isAppRunning
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : isAppStarting
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-800 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isAppRunning ? 'bg-emerald-400' : isAppStarting ? 'bg-amber-400' : 'bg-slate-500'
                      }`}
                    />
                    <span>{activeApp.status}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Endpoint:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    :{activeApp.port}
                  </span>
                </div>

                {activeApp.pid && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Process ID:</span>
                    <span className="font-mono text-slate-300">PID {activeApp.pid}</span>
                  </div>
                )}
              </div>
            )}

            {/* Metrics Breakdown */}
            {buildData && (
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#0D1526] rounded-xl border border-[#1E293B]">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Build Time</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200 mt-0.5">
                    {buildData.durationSeconds > 0 ? `${buildData.durationSeconds}s` : '--'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                    <FileBox className="w-3 h-3 text-slate-400" />
                    <span>Artifacts</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200 mt-0.5">
                    {buildData.artifacts?.length || 0} file(s)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Runtime Action Controls (Run App, Open App, Stop App, Download) */}
          <div className="pt-3 space-y-2">
            {/* If application is currently RUNNING */}
            {isAppRunning && activeApp ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Open Application Button (Localhost) */}
                  <a
                    href={activeApp.appUrl || `http://localhost:${activeApp.port}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open App</span>
                  </a>

                  {/* Stop Application Button */}
                  <button
                    onClick={handleStopApp}
                    disabled={isStoppingApp}
                    className="py-2.5 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    {isStoppingApp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Square className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>Stop App</span>
                  </button>
                </div>

                {/* Live App Logs Button */}
                <button
                  onClick={() => setIsLogsModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>View Live Application Logs</span>
                </button>
              </div>
            ) : isAppStarting && activeApp ? (
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-wait"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Starting on Port {activeApp.port}...</span>
                </button>
                <button
                  onClick={() => setIsLogsModalOpen(true)}
                  className="w-full py-1.5 px-3 rounded-xl bg-[#18233C] hover:bg-[#202E4E] text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>View Startup Logs</span>
                </button>
              </div>
            ) : isSuccess ? (
              /* If build is successful and app is not running -> Run Application */
              <div className="space-y-2">
                <button
                  onClick={() => setIsRunModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Application</span>
                </button>
              </div>
            ) : null}

            {/* Download Artifact Button */}
            {buildData?.artifacts && buildData.artifacts.length > 0 && (
              <button
                onClick={() => handleDownloadArtifact(buildData.artifacts[0].name)}
                className="w-full py-2 px-3 rounded-xl bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download {buildData.artifacts[0].name} ({buildData.artifacts[0].sizeFormatted})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Run Application Configuration Modal */}
      <RunAppConfigModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        onAppStarted={(app) => {
          setActiveApp(app);
          if (onAppStarted) onAppStarted(app);
        }}
        defaultProjectId={buildData?.projectId}
        defaultProjectName={projectName || buildData?.projectName}
        defaultBuildId={currentBuildId || undefined}
        defaultArtifactName={detectionInfo?.artifactName || buildData?.artifacts?.[0]?.name}
      />

      {/* Application Logs Modal */}
      <AppLogsModal
        app={activeApp}
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        onStopApp={handleStopApp}
      />
    </div>
  );
}
