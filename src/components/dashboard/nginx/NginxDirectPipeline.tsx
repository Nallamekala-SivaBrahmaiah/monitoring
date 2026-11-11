'use client';

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Download,
  Terminal,
  Play,
  RotateCcw,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Folder,
  FileCode,
  Zap,
  Info,
  Package,
  Wrench,
  ChevronRight,
  Eye,
  Trash2,
  Rocket,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';
import { GitRepoInfo, DiscoveredApp } from '@/lib/nginx/nginxEngine';

interface NginxDirectPipelineProps {
  activeServer: INginxServerData;
  onRefreshServer?: () => void;
}

export function NginxDirectPipeline({
  activeServer,
  onRefreshServer,
}: NginxDirectPipelineProps) {
  // Discovery State
  const [repos, setRepos] = useState<GitRepoInfo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitRepoInfo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // PM2 Processes on server
  const [pm2Processes, setPm2Processes] = useState<any[]>([]);
  const [selectedPm2App, setSelectedPm2App] = useState<string>('');
  const [loadingPm2, setLoadingPm2] = useState(false);

  // Build & Install commands
  const [installCmd, setInstallCmd] = useState<string>('npm install');
  const [buildCmd, setBuildCmd] = useState<string>('npm run build');

  // Execution & Logs state
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [stepLogs, setStepLogs] = useState<string>('');
  const [lastStepStatus, setLastStepStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  // 1. Fetch Discovered Git Repositories
  const fetchRepos = async () => {
    if (!activeServer?._id) return;
    setLoadingRepos(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/git`);
      const data = await res.json();
      if (res.ok && data.repos) {
        setRepos(data.repos);
        if (data.repos.length > 0) {
          const first = data.repos[0];
          setSelectedRepo(first);
          setSelectedBranch(first.currentBranch || 'main');
          setAvailableBranches(first.localBranches || ['main']);
        }
      }
    } catch (err) {
      console.error('Failed to discover repos:', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  // 2. Fetch Actual PM2 Processes on this server
  const fetchPm2List = async () => {
    if (!activeServer?._id) return;
    setLoadingPm2(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pm2`);
      const data = await res.json();
      if (res.ok && data.processes) {
        setPm2Processes(data.processes);
        if (data.processes.length > 0) {
          setSelectedPm2App(data.processes[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch PM2 list:', err);
    } finally {
      setLoadingPm2(false);
    }
  };

  useEffect(() => {
    if (activeServer?._id) {
      fetchRepos();
      fetchPm2List();
    }
  }, [activeServer?._id]);

  // When selected repo changes, update available branches
  const handleSelectRepo = (repo: GitRepoInfo) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.currentBranch || repo.localBranches?.[0] || 'main');
    setAvailableBranches(repo.localBranches || [repo.currentBranch || 'main']);
  };

  // Execute Git Actions (Status, Fetch, Pull, Branch, Commit)
  const handleGitAction = async (action: 'status' | 'fetch' | 'pull' | 'branch' | 'commit') => {
    if (!activeServer?._id || !selectedRepo) return;
    setRunningStep(`git-${action}`);
    setStepLogs(`Executing git ${action} on ${selectedRepo.name} (${selectedRepo.path})...\n`);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/git`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoPath: selectedRepo.path,
          action,
          param: action === 'pull' ? selectedBranch : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStepLogs(data.output || `Git ${action} executed successfully.`);
        setLastStepStatus('success');
        if (action === 'pull' || action === 'fetch') {
          fetchRepos();
        }
      } else {
        setStepLogs(data.output || data.error || `Git ${action} failed.`);
        setLastStepStatus('failed');
      }
    } catch (err: any) {
      setStepLogs(`Error: ${err.message}`);
      setLastStepStatus('failed');
    } finally {
      setRunningStep(null);
    }
  };

  // Execute Pipeline Steps (Install, Build, PM2 Restart, PM2 Logs, Flush, Full Deploy)
  const handlePipelineStep = async (
    step: 'install' | 'build' | 'pm2-restart' | 'pm2-flush' | 'pm2-logs' | 'full-deploy'
  ) => {
    if (!activeServer?._id || !selectedRepo) return;
    setRunningStep(step);
    setStepLogs(`Executing step [${step}] on ${activeServer.name}...\n`);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoPath: selectedRepo.path,
          branch: selectedBranch,
          step,
          installCmd,
          buildCmd,
          pm2AppName: selectedPm2App,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStepLogs(data.output || `Step ${step} completed successfully.`);
        setLastStepStatus('success');
        if (step === 'pm2-restart' || step === 'full-deploy') {
          fetchPm2List();
          if (onRefreshServer) onRefreshServer();
        }
      } else {
        setStepLogs(data.output || data.error || `Step ${step} failed.`);
        setLastStepStatus('failed');
      }
    } catch (err: any) {
      setStepLogs(`Execution Error: ${err.message}`);
      setLastStepStatus('failed');
    } finally {
      setRunningStep(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111A2E]/95 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Rocket className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Direct Application Deployment</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Git pull, dependency installation, application build, and PM2 process management on{' '}
              <strong className="text-white">{activeServer.name}</strong> ({activeServer.host})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchRepos();
              fetchPm2List();
            }}
            disabled={loadingRepos || loadingPm2}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loadingRepos || loadingPm2 ? 'animate-spin' : ''}`} />
            <span>Rescan Repos &amp; PM2</span>
          </button>

          <button
            type="button"
            onClick={() => handlePipelineStep('full-deploy')}
            disabled={!selectedRepo || runningStep !== null}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>1-Click Full Deploy</span>
          </button>
        </div>
      </div>

      {/* 5-Step Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Steps Controls */}
        <div className="lg:col-span-6 space-y-4">
          {/* STEP 1: Select Repository & Branch */}
          <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-mono">
                  1
                </span>
                <span>Select Repository &amp; Branch</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {repos.length} Discovered
              </span>
            </div>

            {loadingRepos ? (
              <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Scanning server for Git repositories...</span>
              </div>
            ) : repos.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No Git repositories found in /var/www, /opt, /home, /srv.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Repo Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase">Target Repository</label>
                  <select
                    value={selectedRepo?.path || ''}
                    onChange={(e) => {
                      const found = repos.find((r) => r.path === e.target.value);
                      if (found) handleSelectRepo(found);
                    }}
                    className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    {repos.map((r, idx) => (
                      <option key={idx} value={r.path}>
                        {r.name} ({r.path})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remote URL & Branch Picker */}
                {selectedRepo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Remote URL</span>
                      <div className="px-2.5 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg font-mono text-[11px] text-slate-300 truncate" title={selectedRepo.remoteUrl}>
                        {selectedRepo.remoteUrl || 'No remote configured'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Select Branch</span>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0B1120] border border-[#1E293B] rounded-lg text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                      >
                        {availableBranches.map((br, idx) => (
                          <option key={idx} value={br}>
                            {br} {br === selectedRepo.currentBranch ? '(current)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Git Operations */}
          <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-mono">
                  2
                </span>
                <span>Git Operations ({selectedBranch})</span>
              </span>
              <span className="text-[10px] text-purple-300 font-mono">Dynamic Branch</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleGitAction('status')}
                disabled={!selectedRepo || runningStep !== null}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Git Status</span>
              </button>

              <button
                type="button"
                onClick={() => handleGitAction('fetch')}
                disabled={!selectedRepo || runningStep !== null}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Git Fetch</span>
              </button>

              <button
                type="button"
                onClick={() => handleGitAction('pull')}
                disabled={!selectedRepo || runningStep !== null}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Git Pull</span>
              </button>

              <button
                type="button"
                onClick={() => handleGitAction('branch')}
                disabled={!selectedRepo || runningStep !== null}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                <span>Git Branches</span>
              </button>

              <button
                type="button"
                onClick={() => handleGitAction('commit')}
                disabled={!selectedRepo || runningStep !== null}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 sm:col-span-2"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>View Latest Commit</span>
              </button>
            </div>
          </div>

          {/* STEP 3 & 4: Install Dependencies & Build */}
          <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px] font-mono">
                  3 &amp; 4
                </span>
                <span>Install Dependencies &amp; Build</span>
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Install Command */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase">Dependency Install Command</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInstallCmd('npm install')}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${installCmd === 'npm install' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      npm install
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallCmd('npm ci')}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${installCmd === 'npm ci' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      npm ci
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={installCmd}
                    onChange={(e) => setInstallCmd(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[#0B1120] border border-[#1E293B] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => handlePipelineStep('install')}
                    disabled={!selectedRepo || runningStep !== null}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Run Install
                  </button>
                </div>
              </div>

              {/* Build Command */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Application Build Command</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={buildCmd}
                    onChange={(e) => setBuildCmd(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[#0B1120] border border-[#1E293B] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handlePipelineStep('build')}
                    disabled={!selectedRepo || runningStep !== null}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Run Build
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 5: PM2 Process Management */}
          <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-mono">
                  5
                </span>
                <span>PM2 Process Management</span>
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">
                {pm2Processes.length} Detected
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Select Target PM2 Process</label>
                {pm2Processes.length > 0 ? (
                  <select
                    value={selectedPm2App}
                    onChange={(e) => setSelectedPm2App(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    {pm2Processes.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name} (PID: {p.pid || 'N/A'}, Status: {p.status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedPm2App}
                    onChange={(e) => setSelectedPm2App(e.target.value)}
                    placeholder="Enter application name (e.g. app)"
                    className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-xl text-xs text-white font-mono"
                  />
                )}
              </div>

              {/* PM2 Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handlePipelineStep('pm2-restart')}
                  disabled={!selectedPm2App || runningStep !== null}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart App</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePipelineStep('pm2-logs')}
                  disabled={!selectedPm2App || runningStep !== null}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>PM2 Logs</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePipelineStep('pm2-flush')}
                  disabled={runningStep !== null}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Flush Logs</span>
                </button>

                <button
                  type="button"
                  onClick={fetchPm2List}
                  disabled={loadingPm2}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${loadingPm2 ? 'animate-spin' : ''}`} />
                  <span>PM2 List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Output Terminal Box */}
        <div className="lg:col-span-6 bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Execution &amp; Deployment Output</span>
              {runningStep && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>Running {runningStep}...</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {lastStepStatus === 'success' && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Success</span>
                </span>
              )}
              {lastStepStatus === 'failed' && (
                <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  <span>Failed</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => setStepLogs('')}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-200 leading-relaxed min-h-[380px] max-h-[560px] overflow-y-auto whitespace-pre-wrap select-text">
            {stepLogs || (
              <span className="text-slate-600">
                Ready. Click any pipeline action (Git Pull, Install, Build, or PM2 Restart) or click "1-Click Full Deploy" to execute deployment operations on {activeServer.name}.
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-[#1E293B]">
            <span>Target: {activeServer.name} ({activeServer.host})</span>
            <span>Path: {selectedRepo?.path || 'None selected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
