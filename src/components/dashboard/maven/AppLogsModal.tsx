'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  X,
  RotateCw,
  Copy,
  Check,
  ExternalLink,
  Square,
  Play,
  Server,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { IMavenAppData } from '@/models/MavenApp';

interface AppLogsModalProps {
  app: IMavenAppData | null;
  isOpen: boolean;
  onClose: () => void;
  onStopApp?: (appId: string) => void;
  onRestartApp?: (app: IMavenAppData) => void;
}

export function AppLogsModal({
  app,
  isOpen,
  onClose,
  onStopApp,
  onRestartApp,
}: AppLogsModalProps) {
  const [logs, setLogs] = useState<string>('');
  const [status, setStatus] = useState<string>('STARTING');
  const [pid, setPid] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !app) return;

    setStatus(app.status);
    setPid(app.pid || null);
    setLogs(app.logs || '');

    let interval: NodeJS.Timeout;

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/maven/apps/${app._id}/logs`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setLogs(data.logs || '');
            setStatus(data.status);
            setPid(data.pid);
          }
        }
      } catch (err) {
        console.warn('Error fetching app logs:', err);
      }
    };

    fetchLogs();
    interval = setInterval(fetchLogs, 2000);

    return () => clearInterval(interval);
  }, [isOpen, app]);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  if (!isOpen || !app) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = status === 'RUNNING';
  const isStarting = status === 'STARTING';
  const isStopped = status === 'STOPPED';
  const isFailed = status === 'FAILED';

  const directUrl = app.appUrl || `http://localhost:${app.port}`;
  const proxyUrl = `/api/maven/apps/${app._id}/proxy/`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[#0D1526] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#111A2E] border-b border-[#1E293B] gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isRunning
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isStarting
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : isFailed
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Terminal className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {app.projectName}
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isRunning
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                      : isStarting
                      ? 'bg-amber-950/80 text-amber-400 border border-amber-800 animate-pulse'
                      : isFailed
                      ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRunning
                        ? 'bg-emerald-400'
                        : isStarting
                        ? 'bg-amber-400'
                        : isFailed
                        ? 'bg-rose-400'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span>{status}</span>
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Server className="w-3 h-3 text-blue-400" />
                  Port {app.port}
                </span>
                {pid && (
                  <span className="font-mono text-slate-400">PID: {pid}</span>
                )}
                <span className="text-slate-500 truncate max-w-[200px]">
                  {app.artifactName}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2">
            {isRunning && (
              <>
                <a
                  href={directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/30"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Localhost</span>
                </a>

                <a
                  href={proxyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-md shadow-blue-600/30"
                  title="Open application via secure authenticated reverse proxy"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open via Proxy</span>
                </a>

                {onStopApp && (
                  <button
                    onClick={() => onStopApp(app._id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold transition-colors"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                )}
              </>
            )}

            {isStopped && onRestartApp && (
              <button
                onClick={() => onRestartApp(app)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/30"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-[#18233C] hover:bg-[#223256] text-slate-300 border border-[#1E293B] transition-colors"
              title="Copy all logs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Log Viewer Content */}
        <div className="flex-1 bg-[#070C18] p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 selection:bg-blue-600/40">
          {logs ? (
            <pre className="whitespace-pre-wrap break-all font-mono">
              {logs}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Activity className="w-6 h-6 animate-pulse text-blue-400" />
              <span>Waiting for application logs...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 bg-[#111A2E] border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>Live Process Output</span>
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-[#1E293B] text-blue-500"
              />
              <span>Auto-scroll</span>
            </label>
          </div>
          <span className="font-mono text-slate-500">
            {app.runCommand}
          </span>
        </div>
      </div>
    </div>
  );
}

