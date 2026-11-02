'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  PowerOff,
  Trash2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

export interface SSHTerminalTarget {
  id?: string;
  vmId?: string;
  name: string;
  host: string;
  port?: number;
  username?: string;
  sshServerId?: string;
  cloudProvider?: string;
  isSSHConnected?: boolean;
}

interface SSHTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: SSHTerminalTarget | null;
  onConfigureSSH?: (target: SSHTerminalTarget) => void;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function SSHTerminalModal({
  isOpen,
  onClose,
  target,
  onConfigureSSH,
}: SSHTerminalModalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstanceRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing secure SSH terminal...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnconfigured, setIsUnconfigured] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const activeSessionIdRef = useRef<string | null>(null);
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const isClosingRef = useRef<boolean>(false);

  // Send keystrokes / user command input to backend
  const sendInput = useCallback((data: string) => {
    if (activeSessionIdRef.current) {
      fetch('/api/terminal/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionIdRef.current,
          data,
        }),
      }).catch((e) => console.warn('Terminal input send error:', e));
    }
  }, []);

  // Send terminal viewport resize
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
      }).catch(() => {});
    }
  }, []);

  // Disconnect active session
  const disconnectSession = useCallback(() => {
    setStatus('disconnected');
    setStatusMessage('Terminal disconnected by user.');

    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
      streamAbortControllerRef.current = null;
    }

    if (activeSessionIdRef.current) {
      fetch('/api/terminal/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionIdRef.current }),
      }).catch(() => {});
      activeSessionIdRef.current = null;
    }

    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.write('\r\n\x1b[33m[Session disconnected]\x1b[0m\r\n');
    }
  }, []);

  // Connect via Direct HTTP Streaming on port 3000
  const connectHttpStreaming = useCallback(
    async (term: any, targetVm: SSHTerminalTarget, cols: number, rows: number) => {
      try {
        setStatus('connecting');
        setStatusMessage('Connecting via SSH...');
        setErrorMessage(null);
        setIsUnconfigured(false);

        const res = await fetch('/api/terminal/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sshServerId: targetVm.sshServerId,
            vmId: targetVm.vmId || targetVm.id,
            name: targetVm.name,
            host: targetVm.host && targetVm.host !== '-' ? targetVm.host : '',
            cols,
            rows,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.unconfigured) {
            setIsUnconfigured(true);
          }
          throw new Error(data.error || 'Failed to establish SSH connection.');
        }

        const sessionId = data.sessionId;
        activeSessionIdRef.current = sessionId;

        setStatus('connected');
        setStatusMessage(`Connected: ${data.username || 'user'}@${data.host || targetVm.host}`);
        term.write('\x1b[32m✔ Authenticated successfully. Establishing interactive session...\x1b[0m\r\n\r\n');

        // Open live streaming reader
        const abortController = new AbortController();
        streamAbortControllerRef.current = abortController;

        const streamRes = await fetch(`/api/terminal/stream?sessionId=${encodeURIComponent(sessionId)}`, {
          credentials: 'include',
          signal: abortController.signal,
        });

        if (!streamRes.ok || !streamRes.body) {
          throw new Error(`Terminal stream connection failed (${streamRes.status})`);
        }

        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                if (!isClosingRef.current) {
                  setStatus('disconnected');
                  setStatusMessage('Session closed by remote server');
                  term.write('\r\n\x1b[33m[Connection closed by remote host]\x1b[0m\r\n');
                }
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              const packets = buffer.split('\n\n');
              buffer = packets.pop() || '';

              for (const packet of packets) {
                if (!packet.trim()) continue;
                if (packet.includes('event: close')) {
                  setStatus('disconnected');
                  term.write('\r\n\x1b[33m[Session disconnected]\x1b[0m\r\n');
                  return;
                }
                const match = packet.match(/^data:\s*(.*)$/m);
                if (match) {
                  try {
                    const parsed = JSON.parse(match[1]);
                    if (parsed.data) {
                      term.write(parsed.data);
                    }
                  } catch {
                    term.write(match[1]);
                  }
                }
              }
            }
          } catch (e: any) {
            if (!isClosingRef.current && e.name !== 'AbortError') {
              console.warn('Terminal stream read note:', e);
            }
          }
        })();
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'SSH connection failed.');
        setStatusMessage('SSH Connection Failed');
        term.write(`\r\n\x1b[31;1mError: ${err.message || 'SSH Connection failed'}\x1b[0m\r\n`);
      }
    },
    []
  );

  // Initialize terminal and attempt connection
  const initTerminal = useCallback(async () => {
    if (!terminalRef.current || !target) return;

    // Dynamically import xterm and addon-fit
    const { Terminal } = await import('@xterm/xterm');
    const { FitAddon } = await import('@xterm/addon-fit');

    // Clean up previous terminal instance if any
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.dispose();
      xtermInstanceRef.current = null;
    }

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace, Consolas',
      fontSize: 13,
      lineHeight: 1.25,
      theme: {
        background: '#080D1A',
        foreground: '#E2E8F0',
        cursor: '#00C5FF',
        selectionBackground: 'rgba(0, 197, 255, 0.35)',
        black: '#1E293B',
        red: '#EF4444',
        green: '#10B981',
        yellow: '#F59E0B',
        blue: '#0089D6',
        magenta: '#8B5CF6',
        cyan: '#06B6D4',
        white: '#F8FAFC',
        brightBlack: '#64748B',
        brightRed: '#F87171',
        brightGreen: '#34D399',
        brightYellow: '#FBBF24',
        brightBlue: '#38BDF8',
        brightMagenta: '#A78BFA',
        brightCyan: '#22D3EE',
        brightWhite: '#FFFFFF',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    terminalRef.current.innerHTML = '';
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Listen for keystrokes
    term.onData((data) => {
      sendInput(data);
    });

    // Write welcome banner
    term.write('\x1b[36mMulti-Cloud Monitoring Platform — Direct SSH Terminal\x1b[0m\r\n');
    term.write(`\x1b[90mTarget: ${target.name} (${target.host || 'host'}:22)\x1b[0m\r\n`);
    term.write('\x1b[90mAuthenticating with saved SSH credentials...\x1b[0m\r\n\r\n');

    const cols = term.cols || 80;
    const rows = term.rows || 24;

    // Connect via HTTP streaming directly on port 3000
    connectHttpStreaming(term, target, cols, rows);
  }, [target, sendInput, connectHttpStreaming]);

  // Handle open/close lifecycle
  useEffect(() => {
    isClosingRef.current = false;
    if (isOpen && target) {
      initTerminal();
    }

    return () => {
      isClosingRef.current = true;
      if (streamAbortControllerRef.current) {
        streamAbortControllerRef.current.abort();
        streamAbortControllerRef.current = null;
      }
      if (activeSessionIdRef.current) {
        fetch('/api/terminal/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSessionIdRef.current }),
        }).catch(() => {});
        activeSessionIdRef.current = null;
      }
      if (xtermInstanceRef.current) {
        xtermInstanceRef.current.dispose();
        xtermInstanceRef.current = null;
      }
    };
  }, [isOpen, target, initTerminal]);

  // Handle container resize
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (fitAddonRef.current && xtermInstanceRef.current) {
        try {
          fitAddonRef.current.fit();
          const { cols, rows } = xtermInstanceRef.current;
          sendResize(cols, rows);
        } catch {}
      }
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [isOpen, isMaximized, sendResize]);

  if (!isOpen || !target) return null;

  const handleClearTerminal = () => {
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.clear();
    }
  };

  const handleReconnect = () => {
    initTerminal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-[#0D1526] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'w-full h-full m-0 rounded-none'
            : 'w-full max-w-4xl h-[620px] max-h-[92vh]'
        }`}
      >
        {/* ================= TERMINAL HEADER ================= */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#111A2E] border-b border-[#1E293B] select-none shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TerminalIcon className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide truncate">
                  SSH Terminal: {target.name}
                </h3>
                <span className="text-[11px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25">
                  {target.host && target.host !== '-' ? target.host : 'Internal IP'}:22
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    status === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse'
                      : status === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="capitalize font-medium">{status}:</span>
                <span className="text-slate-300 truncate">{statusMessage}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {status === 'connected' ? (
              <button
                type="button"
                onClick={disconnectSession}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
                title="Disconnect SSH Session"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReconnect}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors cursor-pointer"
                title="Reconnect SSH"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reconnect</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearTerminal}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#18233C] rounded-lg transition-colors cursor-pointer"
              title="Clear Terminal Screen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#18233C] rounded-lg transition-colors cursor-pointer"
              title={isMaximized ? 'Restore size' : 'Maximize terminal'}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="Close Terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= UNCONFIGURED NOTIFICATION BANNER ================= */}
        {isUnconfigured && (
          <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                No saved SSH credentials found for <strong>{target.name}</strong>. Please enter the
                SSH private key or password once to enable automatic one-click login.
              </span>
            </div>
            {onConfigureSSH && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConfigureSSH(target);
                }}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold shrink-0 cursor-pointer transition-colors"
              >
                Configure SSH Credentials
              </button>
            )}
          </div>
        )}

        {/* ================= ERROR NOTIFICATION BANNER ================= */}
        {errorMessage && !isUnconfigured && (
          <div className="bg-rose-500/10 border-b border-rose-500/25 px-4 py-2 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2 truncate">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleReconnect}
              className="text-rose-200 hover:underline font-semibold ml-2 shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ================= TERMINAL SCREEN ================= */}
        <div className="flex-1 bg-[#080D1A] p-2 sm:p-3 overflow-hidden relative">
          <div
            ref={terminalRef}
            className="w-full h-full select-text"
            style={{ minHeight: '340px' }}
          />
        </div>

        {/* ================= TERMINAL FOOTER BAR ================= */}
        <div className="px-4 py-2 bg-[#0E1628] border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 font-mono">
          <div className="flex items-center gap-3">
            <span>Terminal: xterm-256color</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline">Port: 22 (SSH)</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="text-emerald-400 font-semibold">AES-256 Encrypted</span>
          </div>
          <div>
            <span>Press Ctrl+C to interrupt • type &apos;exit&apos; to disconnect</span>
          </div>
        </div>
      </div>
    </div>
  );
}
