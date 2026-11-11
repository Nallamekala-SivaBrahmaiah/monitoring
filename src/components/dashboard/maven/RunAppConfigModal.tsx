'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  X,
  Server,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Layers,
  Cpu,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { IMavenAppData } from '@/models/MavenApp';

interface RunAppConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppStarted: (app: IMavenAppData) => void;
  defaultProjectId?: string;
  defaultProjectName?: string;
  defaultBuildId?: string;
  defaultArtifactName?: string;
}

export function RunAppConfigModal({
  isOpen,
  onClose,
  onAppStarted,
  defaultProjectId,
  defaultProjectName,
  defaultBuildId,
  defaultArtifactName,
}: RunAppConfigModalProps) {
  const [port, setPort] = useState<number>(8080);
  const [jvmArgs, setJvmArgs] = useState<string>('-Xmx512m');
  const [appArgs, setAppArgs] = useState<string>('');
  const [detecting, setDetecting] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionInfo, setDetectionInfo] = useState<any>(null);

  // Auto-detect artifact capabilities when opened
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setDetecting(true);

    const runDetect = async () => {
      try {
        const res = await fetch('/api/maven/apps/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: defaultProjectId,
            buildId: defaultBuildId,
            artifactName: defaultArtifactName,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setDetectionInfo(data);
          if (data.suggestedPort) {
            setPort(data.suggestedPort);
          }
        } else {
          setError(data.error || 'Failed to detect executable artifact.');
        }
      } catch (err: any) {
        setError(err.message || 'Detection failed');
      } finally {
        setDetecting(false);
      }
    };

    runDetect();
  }, [isOpen, defaultProjectId, defaultBuildId, defaultArtifactName]);

  if (!isOpen) return null;

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    setError(null);

    try {
      const res = await fetch('/api/maven/apps/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: defaultProjectId,
          projectName: defaultProjectName || 'Maven Application',
          buildId: defaultBuildId,
          artifactName: defaultArtifactName || detectionInfo?.artifactName,
          customPort: port,
          jvmArgs,
          appArgs,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onAppStarted(data.app);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to start application');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start application');
    } finally {
      setStarting(false);
    }
  };

  const isExecutable = detectionInfo?.detection?.isExecutable ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B] bg-[#0E1626]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Run Application</span>
                {detectionInfo?.detection?.framework && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                    {detectionInfo.detection.framework}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Start executable JAR using Java runtime with HTTP port binding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleStart} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Detection Info Card */}
          <div className="p-3.5 rounded-xl bg-[#0D1526] border border-[#1E293B] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Target Artifact:</span>
              <span className="font-mono text-slate-200 font-semibold truncate max-w-[260px]">
                {defaultArtifactName || detectionInfo?.artifactName || 'Auto-detecting...'}
              </span>
            </div>

            {detecting ? (
              <div className="flex items-center gap-2 text-blue-400 pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Inspecting JAR manifest and configuration...</span>
              </div>
            ) : detectionInfo?.detection ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Framework:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{detectionInfo.detection.framework}</span>
                  </span>
                </div>
                {detectionInfo.detection.mainClass && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Main Class:</span>
                    <span className="font-mono text-slate-300 text-[11px] truncate max-w-[260px]">
                      {detectionInfo.detection.mainClass}
                    </span>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {!isExecutable && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                This artifact does not declare an executable Main-Class or servlet runner. You may need to provide custom run arguments.
              </span>
            </div>
          )}

          {/* Port Configuration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Application HTTP Port</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Suggested: {detectionInfo?.suggestedPort || 8080}
              </span>
            </label>
            <input
              type="number"
              min={1024}
              max={65535}
              required
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value, 10) || 8080)}
              className="w-full bg-[#0D1526] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs outline-none"
            />
            <p className="text-[11px] text-slate-400">
              The application will listen on <code className="text-blue-400">http://localhost:{port}</code> and will also be accessible through the authenticated reverse proxy.
            </p>
          </div>

          {/* JVM Arguments */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>JVM Memory &amp; Arguments</span>
            </label>
            <input
              type="text"
              value={jvmArgs}
              onChange={(e) => setJvmArgs(e.target.value)}
              placeholder="-Xmx512m -Dspring.profiles.active=dev"
              className="w-full bg-[#0D1526] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs outline-none"
            />
          </div>

          {/* Custom App Arguments */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>Application Arguments (Optional)</span>
            </label>
            <input
              type="text"
              value={appArgs}
              onChange={(e) => setAppArgs(e.target.value)}
              placeholder="--spring.main.banner-mode=console"
              className="w-full bg-[#0D1526] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#18233C] text-slate-300 font-semibold text-xs hover:bg-[#202E4E] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={starting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 active:scale-[0.98]"
            >
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting Application...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

