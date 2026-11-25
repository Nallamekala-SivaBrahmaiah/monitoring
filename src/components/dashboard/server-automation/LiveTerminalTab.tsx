'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal,
  Square,
  Trash2,
  Download,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Server,
  Play,
  ArrowRight,
} from 'lucide-react';

interface ToolStatusItem {
  toolId: string;
  toolName: string;
  version?: string;
  status: 'pending' | 'installing' | 'success' | 'failed' | 'skipped';
  durationSeconds?: number;
  exitCode?: number;
}

interface LiveTerminalTabProps {
  executionId: string | null;
  onNavigateToInstall?: () => void;
  onNavigateToHistory?: () => void;
}

export function LiveTerminalTab({
  executionId,
  onNavigateToInstall,
  onNavigateToHistory,
}: LiveTerminalTabProps) {
  const [logs, setLogs] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<
    'idle' | 'connecting' | 'running' | 'success' | 'failed' | 'cancelled' | 'partial'
  >('idle');
  const [serverInfo, setServerInfo] = useState<{ name: string; host: string } | null>(null);
  const [toolsProgress, setToolsProgress] = useState<ToolStatusItem[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const terminalRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll terminal output
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Timer for elapsed seconds
  useEffect(() => {
    if (sessionStatus === 'running' || sessionStatus === 'connecting') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStatus]);

  // Connect to SSE stream
  useEffect(() => {
    if (!executionId) {
      setSessionStatus('idle');
      return;
    }

    setLogs('');
    setSessionStatus('connecting');
    setElapsedSeconds(0);
    setExitCode(null);

    const es = new EventSource(`/api/server-automation/stream?executionId=${executionId}`);
    eventSourceRef.current = es;

    es.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setServerInfo({ name: data.serverName, host: data.serverHost });
        setSessionStatus(data.status);
        if (data.selectedTools) {
          setToolsProgress(data.selectedTools);
        }
        if (data.startedAt) {
          setStartedAt(data.startedAt);
        }
        if (data.durationSeconds) {
          setElapsedSeconds(data.durationSeconds);
        }
      } catch {}
    });

    es.addEventListener('stdout', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.data) {
          setLogs((prev) => prev + data.data);
        }
      } catch {}
    });

    es.addEventListener('tool_start', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setToolsProgress((prev) =>
          prev.map((t) =>
            t.toolId === data.toolId
              ? { ...t, status: 'installing' }
              : t
          )
        );
      } catch {}
    });

    es.addEventListener('tool_complete', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setToolsProgress((prev) =>
          prev.map((t) =>
            t.toolId === data.toolId
              ? {
                  ...t,
                  status: data.status,
                  exitCode: data.exitCode,
                  durationSeconds: data.durationSeconds,
                }
              : t
          )
        );
      } catch {}
    });

    es.addEventListener('finished', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSessionStatus(data.status);
        setExitCode(data.exitCode);
        if (data.durationSeconds) setElapsedSeconds(data.durationSeconds);
        setCompletedAt(new Date().toISOString());
      } catch {}
      es.close();
    });

    es.addEventListener('cancelled', (e: MessageEvent) => {
      setSessionStatus('cancelled');
      es.close();
    });

    es.addEventListener('error', (e: any) => {
      // In case of SSE error or connection drop
      if (es.readyState === EventSource.CLOSED) {
        // stream ended normally
      }
    });

    return () => {
      es.close();
    };
  }, [executionId]);

  const handleCancelExecution = async () => {
    if (!executionId) return;
    try {
      await fetch('/api/server-automation/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId }),
      });
      setSessionStatus('cancelled');
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const handleClearTerminal = () => {
    setLogs('');
  };

  const handleDownloadLog = () => {
    if (!executionId) return;
    window.open(`/api/server-automation/history/${executionId}?download=true`, '_blank');
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert raw text into styled HTML lines
  const renderFormattedLogs = (raw: string) => {
    if (!raw) return null;
    const lines = raw.split('\n');

    return lines.map((line, idx) => {
      // Clean internal telemetry markers from visible UI
      if (line.includes('###AGY_')) return null;

      let lineClass = 'text-slate-300';
      if (line.includes('[SUCCESS') || line.includes('✓')) {
        lineClass = 'text-emerald-400 font-semibold';
      } else if (line.includes('[ERROR') || line.includes('✗') || line.includes('FATAL')) {
        lineClass = 'text-rose-400 font-semibold';
      } else if (line.includes('[WARNING') || line.includes('⚠')) {
        lineClass = 'text-amber-300';
      } else if (line.includes('[INFO') || line.includes('Starting')) {
        lineClass = 'text-cyan-300';
      } else if (line.startsWith('===') || line.startsWith('---')) {
        lineClass = 'text-blue-400 font-bold';
      }

      return (
        <div key={idx} className={`${lineClass} whitespace-pre-wrap leading-relaxed`}>
          {line || ' '}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Terminal Top Control Bar */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Server and Status */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Terminal className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Live Remote SSH Terminal</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                  sessionStatus === 'running'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                    : sessionStatus === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : sessionStatus === 'failed'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : sessionStatus === 'cancelled'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                }`}
              >
                {sessionStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Target: {serverInfo?.name || 'Remote Host'} ({serverInfo?.host || 'SSH'})
            </p>
          </div>
        </div>

        {/* Right: Timer & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Duration Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111A2E] border border-slate-800 text-xs font-mono text-cyan-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{elapsedSeconds}s</span>
          </div>

          {/* Abort Execution Button */}
          {sessionStatus === 'running' && (
            <button
              type="button"
              onClick={handleCancelExecution}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
              title="Stop and terminate active remote SSH process"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Cancel / Abort</span>
            </button>
          )}

          {/* Copy Logs */}
          <button
            type="button"
            onClick={handleCopyLogs}
            disabled={!logs}
            className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer disabled:opacity-40"
            title="Copy Terminal Logs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Download Logs */}
          <button
            type="button"
            onClick={handleDownloadLog}
            disabled={!logs}
            className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer disabled:opacity-40"
            title="Download Log File (.log)"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Clear Terminal */}
          <button
            type="button"
            onClick={handleClearTerminal}
            className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
            title="Clear Terminal View"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* New Installation Link */}
          {sessionStatus !== 'running' && onNavigateToInstall && (
            <button
              type="button"
              onClick={onNavigateToInstall}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Install More</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Terminal Console Screen */}
      <div className="relative rounded-2xl bg-[#060A14] border border-cyan-500/30 shadow-2xl overflow-hidden font-mono text-xs">
        {/* Terminal Header Bar */}
        <div className="px-4 py-2.5 bg-[#090F1C] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-slate-400 text-[11px]">
              bash (remote-ssh://{serverInfo?.host || 'localhost'})
            </span>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-slate-700 bg-[#111A2E] text-cyan-500"
            />
            <span>Auto-Scroll</span>
          </label>
        </div>

        {/* Terminal Body */}
        <div
          ref={terminalRef}
          className="p-5 h-[460px] overflow-y-auto space-y-0.5 select-text scrollbar-thin scrollbar-thumb-slate-800"
        >
          {sessionStatus === 'idle' && !logs ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
              <Terminal className="w-12 h-12 text-slate-700" />
              <div>
                <p className="text-sm font-semibold text-slate-400">Terminal Idle</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Select software in the "Software Installation" tab to start a remote deployment.
                </p>
              </div>
              {onNavigateToInstall && (
                <button
                  type="button"
                  onClick={onNavigateToInstall}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition cursor-pointer"
                >
                  Go to Software Installation
                </button>
              )}
            </div>
          ) : sessionStatus === 'connecting' && !logs ? (
            <div className="flex items-center gap-2 text-cyan-300 py-4">
              <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Establishing secure SSH connection and initializing bash environment...</span>
            </div>
          ) : (
            renderFormattedLogs(logs)
          )}
        </div>

        {/* Terminal Footer Info */}
        <div className="px-4 py-2 bg-[#090F1C] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Exit Code: {exitCode !== null ? exitCode : sessionStatus === 'running' ? 'Active...' : '-'}</span>
          <span>Elapsed Time: {elapsedSeconds}s</span>
        </div>
      </div>

      {/* 3. Individual Software Status Cards (Post-Installation Summary) */}
      {toolsProgress.length > 0 && (
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-white">Individual Software Installation Status</h4>
              <p className="text-xs text-slate-400">Real-time status tracking for each selected tool</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {toolsProgress.filter((t) => t.status === 'success').length} / {toolsProgress.length} Succeeded
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {toolsProgress.map((tool) => {
              const isSuccess = tool.status === 'success';
              const isInstalling = tool.status === 'installing';
              const isFailed = tool.status === 'failed';
              const isPending = tool.status === 'pending';

              return (
                <div
                  key={tool.toolId}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isSuccess
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : isFailed
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isInstalling
                      ? 'bg-cyan-950/30 border-cyan-500/40 ring-1 ring-cyan-500/20'
                      : 'bg-[#111A2E] border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate">
                      {tool.toolName}
                      {tool.version && <span className="text-cyan-300 font-mono ml-1">({tool.version})</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {isSuccess && `Success in ${tool.durationSeconds ?? 0}s`}
                      {isInstalling && 'Installing remotely...'}
                      {isFailed && `Failed (code ${tool.exitCode ?? 1})`}
                      {isPending && 'Queued in pipeline'}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {isFailed && <XCircle className="w-5 h-5 text-rose-400" />}
                    {isInstalling && <RotateCw className="w-5 h-5 text-cyan-400 animate-spin" />}
                    {isPending && <Clock className="w-5 h-5 text-slate-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
