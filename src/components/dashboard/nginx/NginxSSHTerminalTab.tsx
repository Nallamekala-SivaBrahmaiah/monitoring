'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import '@xterm/xterm/css/xterm.css';
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  Cpu,
  Wifi,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';

interface NginxSSHTerminalTabProps {
  activeServer: INginxServerData | null;
}

export function NginxSSHTerminalTab({ activeServer }: NginxSSHTerminalTabProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);

  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeSessionIdRef = useRef<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Quick Linux commands
  const QUICK_COMMANDS = [
    'whoami',
    'hostname',
    'uptime',
    'free -h',
    'df -h',
    'systemctl status nginx',
    'nginx -t',
    'pm2 list',
    'pm2 logs --lines 20',
  ];

  // Send keystrokes to terminal
  const sendInput = useCallback((data: string) => {
    if (activeSessionIdRef.current) {
      fetch('/api/terminal/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionIdRef.current,
          data,
        }),
      }).catch((e) => console.warn('Input error:', e));
    }
  }, []);

  // Send resize
  const sendResize = useCallback((cols: number, rows: number) => {
    if (activeSessionIdRef.current) {
      fetch('/api/terminal/resize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionIdRef.current,
          cols,
          rows,
        }),
      }).catch((e) => console.warn('Resize error:', e));
    }
  }, []);

  // Disconnect session
  const disconnectSession = useCallback(async () => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

    if (activeSessionIdRef.current) {
      try {
        await fetch('/api/terminal/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSessionIdRef.current }),
        });
      } catch {}
      activeSessionIdRef.current = null;
    }

    setStatus('disconnected');
  }, []);

  // Connect to terminal session
  const connectSession = useCallback(async () => {
    if (!activeServer) return;
    await disconnectSession();

    setStatus('connecting');
    setErrorMessage(null);

    try {
      const termEl = terminalRef.current;
      const cols = 100;
      const rows = 28;

      const res = await fetch('/api/terminal/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sshServerId: activeServer._id,
          host: activeServer.host,
          name: activeServer.name,
          cols,
          rows,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.sessionId) {
        throw new Error(data.error || 'Failed to start SSH session.');
      }

      const sessionId = data.sessionId;
      activeSessionIdRef.current = sessionId;
      setStatus('connected');

      // Initialize xterm if not yet created
      if (!xtermRef.current && terminalRef.current) {
        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        const term = new Terminal({
          cursorBlink: true,
          cursorStyle: 'block',
          fontSize: 13,
          fontFamily: "'Cascadia Code', 'Fira Code', 'Courier New', monospace",
          theme: {
            background: '#070B14',
            foreground: '#D1D5DB',
            cursor: '#10B981',
            selectionBackground: '#2563EB44',
            black: '#1E293B',
            red: '#EF4444',
            green: '#10B981',
            yellow: '#F59E0B',
            blue: '#3B82F6',
            magenta: '#8B5CF6',
            cyan: '#06B6D4',
            white: '#F8FAFC',
          },
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(terminalRef.current);
        fit.fit();

        term.onData((inputData) => {
          sendInput(inputData);
        });

        xtermRef.current = term;
        fitAddonRef.current = fit;
      } else if (xtermRef.current) {
        xtermRef.current.clear();
      }

      xtermRef.current?.writeln(`\x1b[32m[PuTTY SSH] Connected to ${activeServer.name} (${activeServer.host})\x1b[0m\r\n`);

      // Stream stdout/stderr
      const abortCtrl = new AbortController();
      streamAbortRef.current = abortCtrl;

      fetch(`/api/terminal/stream?sessionId=${encodeURIComponent(sessionId)}`, {
        signal: abortCtrl.signal,
      })
        .then(async (streamRes) => {
          if (!streamRes.body) return;
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            xtermRef.current?.write(chunk);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('Stream closed:', err);
          }
        });
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'SSH connection failed.');
    }
  }, [activeServer, disconnectSession, sendInput]);

  useEffect(() => {
    if (activeServer) {
      connectSession();
    }
    return () => {
      disconnectSession();
    };
  }, [activeServer?._id]);

  const handleQuickCommand = (cmd: string) => {
    if (status === 'connected') {
      sendInput(`${cmd}\n`);
    }
  };

  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server to open the interactive SSH terminal.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${isFullscreen ? 'fixed inset-4 z-50 bg-[#0B1120] p-4 rounded-2xl border border-blue-500/50 shadow-2xl flex flex-col' : ''}`}>
      {/* Terminal Title Bar */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">
                PuTTY SSH Terminal &mdash; {activeServer.name}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  status === 'connected'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : status === 'connecting'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {status.toUpperCase()}
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              {activeServer.username}@{activeServer.host}:{activeServer.port || 22}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'connected' ? (
            <button
              onClick={disconnectSession}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectSession}
              disabled={status === 'connecting'}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reconnect</span>
            </button>
          )}

          <button
            onClick={() => xtermRef.current?.clear()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            title="Clear Terminal Screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => fitAddonRef.current?.fit(), 100);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        className={`bg-[#070B14] border border-slate-800 rounded-xl p-3 shadow-inner overflow-hidden font-mono ${
          isFullscreen ? 'flex-1 min-h-0' : 'h-[520px]'
        }`}
      >
        {status === 'error' ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">SSH Connection Failed</h4>
            <p className="text-xs text-rose-300 max-w-md font-mono bg-rose-950/40 border border-rose-900/50 p-3 rounded-lg">
              {errorMessage || 'Failed to authenticate or connect over port 22.'}
            </p>
            <button
              onClick={connectSession}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div ref={terminalRef} className="w-full h-full" />
        )}
      </div>

      {/* Quick Command Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
          Quick Commands:
        </span>
        {QUICK_COMMANDS.map((cmd, i) => (
          <button
            key={i}
            onClick={() => handleQuickCommand(cmd)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 font-mono text-[11px] whitespace-nowrap transition"
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
}

