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
} from 'lucide-react';
import { MavenLogo } from '@/components/icons/CloudIcons';
import { IMavenBuildData } from '@/models/MavenBuild';

interface MavenQuickRunCardProps {
  onBuildCompleted?: () => void;
}

export function MavenQuickRunCard({ onBuildCompleted }: MavenQuickRunCardProps) {
  // Build Configuration State
  const [repositoryUrl, setRepositoryUrl] = useState('https://github.com/spring-projects/spring-petclinic.git');
  const [branch, setBranch] = useState('main');
  const [projectFolder, setProjectFolder] = useState('.');
  const [mavenCommand, setMavenCommand] = useState('mvn clean package');
  const [projectName, setProjectName] = useState('');

  // Active Build State
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null);
  const [buildData, setBuildData] = useState<IMavenBuildData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

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

  const isSuccess = buildData?.status === 'SUCCESS';
  const isFailed = buildData?.status === 'FAILED';
  const isCancelled = buildData?.status === 'CANCELLED';

  return (
    <div className="space-y-4 text-xs select-none">
      {/* 1. Build Configuration Card */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
          <Settings className="w-4 h-4 text-blue-400" />
          <span>Build Configuration</span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStartBuild} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GitHub Repository URL */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <span>GitHub Repository URL</span>
                <span className="text-rose-400">*</span>
              </label>
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

          {/* Action Trigger Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isStarting || isRunning}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Build Workspace...</span>
                </>
              ) : isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Maven Build Running In Isolated Workspace...</span>
                </>
              ) : (
                <>
                  <MavenLogo className="w-4 h-4" />
                  <span>Run Maven Build</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Lower Grid: Build Logs + Build Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Build Logs (Span 2) */}
        <div className="lg:col-span-2 bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl flex flex-col h-[420px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Build Logs</span>
            </div>

            <div className="flex items-center gap-2">
              {isRunning && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Logs</span>
                </div>
              )}

              {isRunning && (
                <button
                  onClick={handleCancelBuild}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors text-[10px] font-semibold"
                  title="Cancel active build"
                >
                  <StopCircle className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              )}

              <button
                onClick={handleCopyLogs}
                disabled={!buildData?.logs}
                className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-[#18233C] text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                title="Copy build logs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Terminal Console View */}
          <div className="flex-1 mt-3 p-3.5 rounded-xl bg-[#000000] border border-[#1E293B]/80 font-mono text-[11px] leading-relaxed overflow-y-auto text-slate-300">
            {buildData?.logs ? (
              <pre className="whitespace-pre-wrap break-all font-mono">
                {buildData.logs.split('\n').map((line, idx) => {
                  let lineClass = 'text-slate-300';
                  if (line.includes('[INFO] BUILD SUCCESS') || line.includes('SUCCESS')) {
                    lineClass = 'text-emerald-400 font-bold';
                  } else if (line.includes('[ERROR]') || line.includes('FAILED') || line.includes('FATAL')) {
                    lineClass = 'text-rose-400 font-bold';
                  } else if (line.includes('[WARNING]')) {
                    lineClass = 'text-amber-400';
                  } else if (line.startsWith('[+]') || line.startsWith('[INFO]')) {
                    lineClass = 'text-cyan-300';
                  }

                  return (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-600 select-none w-8 text-right shrink-0">
                        {idx + 1}
                      </span>
                      <span className={lineClass}>{line}</span>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-1.5 py-12">
                <Terminal className="w-8 h-8 text-slate-700" />
                <p className="font-semibold text-slate-400">No Build Active</p>
                <p className="text-[10px] text-slate-600">
                  Configure repository URL and click &quot;Run Maven Build&quot; to see real-time output.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Build Status Card */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-xl flex flex-col justify-between h-[420px]">
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-200 pb-3 border-b border-[#1E293B]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Build Status</span>
            </div>

            {/* Status Hero */}
            <div className="py-6 flex flex-col items-center justify-center text-center">
              {isRunning ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                    <Loader2 className="w-7 h-7 animate-spin" />
                  </div>
                  <h3 className="text-sm font-bold text-blue-400">Building Project...</h3>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                    Compiling Java source code and running Maven lifecycle goals...
                  </p>
                </>
              ) : isSuccess ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-400">Build Successful!</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Your project has been compiled and packaged successfully.
                  </p>
                </>
              ) : isFailed ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/20">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-rose-400">Build Failed</h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {buildData?.errorMessage || 'Check build logs on the left for dependency or compilation errors.'}
                  </p>
                </>
              ) : isCancelled ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-slate-700/20 border border-slate-600/30 flex items-center justify-center text-slate-400 mb-3">
                    <StopCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-300">Build Cancelled</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Build execution was halted by operator.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-slate-800/40 border border-slate-700/40 flex items-center justify-center text-slate-500 mb-3">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-300">Ready to Build</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Configure your repository and trigger a build.
                  </p>
                </>
              )}
            </div>

            {/* Metrics Breakdown */}
            {buildData && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-[#0D1526] rounded-xl border border-[#1E293B]">
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

          {/* Download Artifact Button */}
          <div className="pt-3">
            {buildData?.artifacts && buildData.artifacts.length > 0 ? (
              <div className="space-y-1.5">
                {buildData.artifacts.map((a, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleDownloadArtifact(a.name)}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {a.name} ({a.sizeFormatted})</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                disabled={!isSuccess}
                className="w-full py-2.5 px-3 rounded-xl bg-[#18233C] text-slate-400 font-semibold text-xs border border-[#1E293B] flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>Download JAR/WAR</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

