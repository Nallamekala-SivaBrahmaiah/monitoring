'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Loader2, AlertCircle, Upload } from 'lucide-react';
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
  region?: string;
  isSSHConnected?: boolean;
}

interface SSHTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: SSHTerminalTarget | null;
  onConfigureSSH?: (target: SSHTerminalTarget) => void;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Authentic PuTTY Monitor Icon SVG
 */
function PuttyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer CRT monitor bezel */}
      <rect x="1" y="1" width="14" height="10" rx="0.5" fill="#C0C0C0" stroke="#707070" strokeWidth="0.8" />
      {/* Inner Screen */}
      <rect x="2.5" y="2.5" width="11" height="7" fill="#000080" />
      {/* Green prompt line */}
      <rect x="3.5" y="4" width="3.5" height="1" fill="#00FF00" />
      {/* White text line */}
      <rect x="3.5" y="6" width="5.5" height="1" fill="#FFFFFF" />
      {/* Blinking cursor */}
      <rect x="9.5" y="6" width="1.5" height="1" fill="#00FF00" />
      {/* Stand neck */}
      <rect x="6.5" y="11" width="3" height="2" fill="#808080" />
      {/* Stand base */}
      <rect x="4" y="13" width="8" height="1.5" rx="0.3" fill="#C0C0C0" stroke="#707070" strokeWidth="0.6" />
    </svg>
  );
}

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnconfigured, setIsUnconfigured] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Quick SSH Authentication Form State
  const defaultUsername =
    target?.username ||
    (target?.cloudProvider === 'azure' ||
    target?.host?.startsWith('4.') ||
    target?.host?.startsWith('20.') ||
    target?.name?.toLowerCase().includes('ansible') ||
    target?.name?.toLowerCase().includes('azure')
      ? 'siva'
      : 'ubuntu');

  const [quickUsername, setQuickUsername] = useState<string>(defaultUsername);
  const [quickAuthMethod, setQuickAuthMethod] = useState<'password' | 'privateKey'>('password');
  const [quickPassword, setQuickPassword] = useState<string>('');
  const [quickPrivateKey, setQuickPrivateKey] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isQuickSubmitting, setIsQuickSubmitting] = useState<boolean>(false);
  const [quickLoginError, setQuickLoginError] = useState<string | null>(null);
  const [quickKeyFileName, setQuickKeyFileName] = useState<string | null>(null);

  // Reset/sync quick form when modal opens or target changes
  useEffect(() => {
    if (isOpen && target) {
      const u =
        target.username ||
        (target.cloudProvider === 'azure' ||
        target.host?.startsWith('4.') ||
        target.host?.startsWith('20.') ||
        target.name?.toLowerCase().includes('ansible') ||
        target.name?.toLowerCase().includes('azure')
          ? 'siva'
          : 'ubuntu');
      setQuickUsername(u);
      setQuickAuthMethod('password');
      setQuickPassword('');
      setQuickPrivateKey('');
      setQuickLoginError(null);
      setQuickKeyFileName(null);
    }
  }, [isOpen, target]);

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
      xtermInstanceRef.current.write('\r\n\x1b[33m[Connection closed by remote host]\x1b[0m\r\n');
    }
  }, []);

  // Connect via Direct HTTP Streaming on port 3000
  const connectHttpStreaming = useCallback(
    async (term: any, targetVm: SSHTerminalTarget, cols: number, rows: number) => {
      try {
        setStatus('connecting');
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
          const errText = data.error || 'Failed to establish SSH connection.';
          const isCredRelated =
            Boolean(data.unconfigured) ||
            res.status === 404 ||
            /secret|credential|key|password|unconfigured|no encrypted/i.test(errText);

          if (isCredRelated) {
            setIsUnconfigured(true);
            setErrorMessage(null);
            setStatus('disconnected');
            term.write(`\r\n\x1b[33m[PuTTY: Authentication required for ${targetVm.name}]\x1b[0m\r\n`);
            return;
          }

          throw new Error(errText);
        }

        const sessionId = data.sessionId;
        activeSessionIdRef.current = sessionId;
        setStatus('connected');

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
                  term.write('\r\n\x1b[33m[Connection closed by remote host]\x1b[0m\r\n');
                  return;
                }
                const match = packet.match(/^data:\s*(.*)$/m);
                if (match) {
                  try {
                    const parsed = JSON.parse(match[1]);
                    if (parsed && typeof parsed.data === 'string') {
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
        const msg = err.message || 'SSH connection failed.';
        const isCredError = /secret|credential|key|password|unconfigured|no encrypted/i.test(msg);
        if (isCredError) {
          setIsUnconfigured(true);
          setErrorMessage(null);
          setStatus('disconnected');
          term.write(`\r\n\x1b[33m[PuTTY: Authentication required for ${targetVm.name}]\x1b[0m\r\n`);
        } else {
          setStatus('error');
          setErrorMessage(msg);
          term.write(`\r\n\x1b[31mNetwork error: ${msg}\x1b[0m\r\n`);
        }
      }
    },
    []
  );

  // Quick Inline SSH Authentication Submission
  const handleQuickLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!target) return;

    if (quickAuthMethod === 'password' && !quickPassword.trim()) {
      setQuickLoginError('Please enter the SSH password for ' + (quickUsername || 'this server') + '.');
      return;
    }
    if (quickAuthMethod === 'privateKey' && !quickPrivateKey.trim()) {
      setQuickLoginError('Please enter or upload an SSH private key (.pem / .ppk).');
      return;
    }

    try {
      setIsQuickSubmitting(true);
      setQuickLoginError(null);

      const secret = quickAuthMethod === 'password' ? quickPassword.trim() : quickPrivateKey.trim();
      const resolvedUser = quickUsername.trim() || defaultUsername;
      const targetHost = target.host && target.host !== '-' ? target.host : '';
      const resolvedProvider =
        target.cloudProvider ||
        (target.name?.toLowerCase().includes('azure') || target.host?.startsWith('4.') ? 'azure' : 'aws');

      const payload = {
        id: target.id || target.sshServerId || target.vmId,
        instanceId: target.vmId || target.id,
        name: target.name,
        host: targetHost,
        port: target.port || 22,
        username: resolvedUser,
        authMethod: quickAuthMethod,
        authSecret: secret,
        cloudProvider: resolvedProvider,
        region: target.region || 'global',
        tags: ['ssh-connected'],
        allowOfflineSave: false,
      };

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error + (data.hint ? ` (Hint: ${data.hint})` : ''));
      }

      // Credentials successfully verified and saved in MongoDB!
      target.isSSHConnected = true;
      target.username = resolvedUser;
      if (data._id) {
        target.sshServerId = data._id;
        target.id = data._id;
      }

      setIsUnconfigured(false);
      setErrorMessage(null);
      setQuickLoginError(null);

      // Immediately connect terminal to live session
      if (xtermInstanceRef.current) {
        const cols = xtermInstanceRef.current.cols || 80;
        const rows = xtermInstanceRef.current.rows || 24;
        xtermInstanceRef.current.clear();
        xtermInstanceRef.current.write(`\r\n\x1b[32m[Credentials verified & saved. Connecting to ${target.name}...]\x1b[0m\r\n`);
        connectHttpStreaming(xtermInstanceRef.current, target, cols, rows);
      }
    } catch (err: any) {
      setQuickLoginError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsQuickSubmitting(false);
    }
  };

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

    // PuTTY Classic Configuration:
    // Pure black background (#000000), Consolas font 14px, white text,
    // classic PuTTY 16-color ANSI palette, block cursor.
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      cursorWidth: 1,
      fontFamily: 'Consolas, "Cascadia Mono", "Lucida Console", "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0,
      convertEol: true,
      scrollback: 10000,
      theme: {
        background: '#000000',
        foreground: '#BBBBBB',
        cursor: '#FFFFFF',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(255, 255, 255, 0.35)',
        selectionForeground: '#FFFFFF',
        black: '#000000',
        red: '#BB0000',
        green: '#00BB00',
        yellow: '#BBBB00',
        blue: '#0000BB',
        magenta: '#BB00BB',
        cyan: '#00BBBB',
        white: '#BBBBBB',
        brightBlack: '#555555',
        brightRed: '#FF5555',
        brightGreen: '#55FF55',
        brightYellow: '#FFFF55',
        brightBlue: '#5555FF',
        brightMagenta: '#FF55FF',
        brightCyan: '#55FFFF',
        brightWhite: '#FFFFFF',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    terminalRef.current.innerHTML = '';
    term.open(terminalRef.current);
    fitAddon.fit();
    term.focus();

    xtermInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Listen for keystrokes
    term.onData((data) => {
      sendInput(data);
    });

    // PuTTY select-to-copy behavior: text selection automatically copies to clipboard
    term.onSelectionChange(() => {
      const selection = term.getSelection();
      if (selection && selection.length > 0) {
        navigator.clipboard.writeText(selection).catch(() => {});
      }
    });

    // PuTTY keyboard shortcuts (Shift+Insert paste, Ctrl+Shift+C/V)
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.type === 'keydown') {
        if (e.shiftKey && e.key === 'Insert') {
          navigator.clipboard.readText().then((text) => {
            if (text) sendInput(text);
          }).catch(() => {});
          return false;
        }
        if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
          const sel = term.getSelection();
          if (sel) navigator.clipboard.writeText(sel).catch(() => {});
          return false;
        }
        if (e.ctrlKey && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
          navigator.clipboard.readText().then((text) => {
            if (text) sendInput(text);
          }).catch(() => {});
          return false;
        }
      }
      return true;
    });

    const cols = term.cols || 80;
    const rows = term.rows || 24;

    // Connect via HTTP streaming directly on port 3000
    connectHttpStreaming(term, target, cols, rows);
  }, [target, sendInput, connectHttpStreaming]);

  // Handle open/close lifecycle
  useEffect(() => {
    isClosingRef.current = false;
    if (isOpen && target) {
      setIsMinimized(false);
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

  // Handle container resize & session persistence
  useEffect(() => {
    if (!isOpen || isMinimized) return;

    let resizeTimer: any = null;

    const doFit = () => {
      if (fitAddonRef.current && xtermInstanceRef.current && terminalRef.current) {
        try {
          fitAddonRef.current.fit();
          const { cols, rows } = xtermInstanceRef.current;
          sendResize(cols, rows);
        } catch {}
      }
    };

    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doFit, 50);
    };

    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    if (terminalRef.current) {
      observer.observe(terminalRef.current);
    }

    const timer = setTimeout(doFit, 80);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      clearTimeout(timer);
    };
  }, [isOpen, isFullscreen, isMinimized, sendResize]);

  if (!isOpen || !target) return null;

  // PuTTY Right-click paste
  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          sendInput(text);
        }
      }
    } catch {
      // Ignore if user denied clipboard permissions
    }
  };

  // Focus terminal when user clicks anywhere in the window
  const handleWindowClick = () => {
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.focus();
    }
  };

  const handleReconnect = () => {
    initTerminal();
  };

  const handleClose = () => {
    disconnectSession();
    onClose();
  };

  // Title bar text: purely "PuTTY" or "PuTTY (inactive)"
  const titleText = status === 'disconnected' ? 'PuTTY (inactive)' : 'PuTTY';

  return (
    <>
      {/* Minimized Taskbar Pill */}
      {isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 bg-[#1F1F1F] border border-[#3A3A3A] shadow-2xl text-slate-200 text-xs font-sans hover:bg-[#2A2A2A] cursor-pointer select-none transition-all"
          title="Restore PuTTY Terminal"
        >
          <PuttyIcon className="w-4 h-4" />
          <span className="font-medium text-[#D4D4D4]">{titleText}</span>
        </div>
      )}

      {/* Main PuTTY Window Container */}
      {!isMinimized && (
        <div
          className={`fixed z-50 flex flex-col bg-[#000000] select-none transition-all ${
            isFullscreen
              ? 'inset-0 w-screen h-screen rounded-none'
              : 'inset-3 sm:inset-6 md:inset-8 shadow-2xl border border-[#3A3A3A] rounded-none'
          }`}
          onClick={handleWindowClick}
          onContextMenu={handleContextMenu}
        >
          {/* ================= PUTTY TITLE BAR ================= */}
          <div
            className="h-8 bg-[#181818] border-b border-[#2C2C2C] flex items-center justify-between select-none shrink-0 font-sans text-xs"
            onDoubleClick={() => setIsFullscreen(!isFullscreen)}
          >
            {/* Left: PuTTY Icon & Title */}
            <div className="flex items-center gap-2 px-2.5 min-w-0">
              <PuttyIcon className="w-4 h-4 shrink-0" />
              <span className="text-[#D4D4D4] font-medium tracking-wide truncate">
                {titleText}
              </span>
            </div>

            {/* Right: Windows-style Minimize, Maximize/Restore, Close controls */}
            <div className="flex items-center h-full">
              {/* Minimize */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(true);
                }}
                className="w-11 h-full flex items-center justify-center text-[#CCCCCC] hover:bg-[#333333] transition-colors cursor-pointer"
                title="Minimize"
              >
                <svg width="10" height="1" viewBox="0 0 10 1">
                  <rect width="10" height="1" fill="currentColor" />
                </svg>
              </button>

              {/* Maximize / Restore */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreen(!isFullscreen);
                }}
                className="w-11 h-full flex items-center justify-center text-[#CCCCCC] hover:bg-[#333333] transition-colors cursor-pointer"
                title={isFullscreen ? 'Restore' : 'Maximize'}
              >
                {isFullscreen ? (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      d="M2 0h8v8H8v2H0V2h2V0zm1 2h5v5H3V2zm-2 1h1v5h5v1H1V3z"
                    />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      d="M0 0v10h10V0H0zm9 9H1V1h8v8z"
                    />
                  </svg>
                )}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="w-11 h-full flex items-center justify-center text-[#CCCCCC] hover:bg-[#E81123] hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path
                    fill="currentColor"
                    d="M10 .9L9.1 0 5 4.1.9 0 0 .9 4.1 5 0 9.1l.9.9L5 5.9 9.1 10l.9-.9-4.1-4.1z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* ================= PURE PUTTY TERMINAL AREA ================= */}
          <div className="flex-1 bg-[#000000] p-1 w-full h-full overflow-hidden relative cursor-text putty-terminal">
            <div
              ref={terminalRef}
              className="w-full h-full select-text"
              style={{ minHeight: '100%', height: '100%' }}
            />

            {/* PuTTY Fatal Error Dialog */}
            {errorMessage && !isUnconfigured && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/60 z-30 select-none p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#2D2D2D] border border-[#555555] shadow-2xl w-[420px] max-w-[95vw] text-slate-200 font-sans text-xs">
                  <div className="bg-[#1F1F1F] px-3 py-1.5 border-b border-[#3A3A3A] flex items-center justify-between font-semibold text-slate-200">
                    <span>PuTTY Fatal Error</span>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-slate-400 hover:text-white px-1.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                      ✕
                    </div>
                    <div className="text-slate-200 leading-relaxed pt-0.5">
                      <p className="font-semibold text-sm text-white mb-1">Network Error</p>
                      <p className="text-slate-300 font-mono text-[11px] break-all">{errorMessage}</p>
                    </div>
                  </div>
                  <div className="bg-[#252525] px-4 py-2 border-t border-[#3A3A3A] flex items-center justify-end gap-2">
                    {/secret|credential|auth|password|key|denied|no encrypted/i.test(errorMessage) && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setIsUnconfigured(true);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 text-xs font-medium cursor-pointer transition-colors"
                      >
                        Enter Credentials
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleReconnect}
                      className="px-4 py-1 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-white border border-[#555555] text-xs font-medium cursor-pointer transition-colors"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="px-4 py-1 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-white border border-[#555555] text-xs font-medium cursor-pointer transition-colors"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PuTTY SSH Authentication Dialog */}
            {isUnconfigured && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/75 z-40 select-none p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#1F1F1F] border border-[#444444] shadow-2xl w-[460px] max-w-[95vw] text-slate-200 font-sans text-xs rounded-none">
                  {/* Dialog Title Bar */}
                  <div className="bg-[#141414] px-3 py-2 border-b border-[#333333] flex items-center justify-between font-semibold text-slate-200 select-none">
                    <div className="flex items-center gap-2">
                      <PuttyIcon className="w-4 h-4 shrink-0" />
                      <span className="font-mono text-xs text-white">PuTTY - SSH Authentication</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-slate-400 hover:text-white px-1.5 cursor-pointer font-bold"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Target Host Details Banner */}
                  <div className="px-4 pt-3.5 pb-2.5 border-b border-[#2C2C2C] bg-[#171717] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white font-mono">{target.name}</span>
                      <span className="text-[#888888]">({target.host && target.host !== '-' ? target.host : 'Dynamic IP'})</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60 font-mono text-[10px] uppercase font-bold tracking-wider">
                      {target.cloudProvider || 'SSH Port 22'}
                    </span>
                  </div>

                  {/* Auth Form */}
                  <form onSubmit={handleQuickLogin} className="p-4 space-y-3.5">
                    {/* Username */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        SSH Username <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={quickUsername}
                        onChange={(e) => setQuickUsername(e.target.value)}
                        placeholder="e.g. siva, ubuntu, root"
                        className="w-full bg-[#121212] border border-[#3A3A3A] focus:border-blue-500 focus:outline-none px-2.5 py-1.5 text-xs text-white font-mono rounded-none"
                      />
                    </div>

                    {/* Auth Method Selector */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                        Authentication Method
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAuthMethod('password');
                            setQuickLoginError(null);
                          }}
                          className={`py-1.5 px-3 text-xs font-medium border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                            quickAuthMethod === 'password'
                              ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                              : 'bg-[#181818] border-[#333333] text-slate-400 hover:text-white'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Password</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAuthMethod('privateKey');
                            setQuickLoginError(null);
                          }}
                          className={`py-1.5 px-3 text-xs font-medium border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                            quickAuthMethod === 'privateKey'
                              ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                              : 'bg-[#181818] border-[#333333] text-slate-400 hover:text-white'
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Private Key (.pem / .ppk)</span>
                        </button>
                      </div>
                    </div>

                    {/* Password Input */}
                    {quickAuthMethod === 'password' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-300">
                            SSH Password <span className="text-rose-400">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{showPassword ? 'Hide' : 'Show'}</span>
                          </button>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={quickPassword}
                          onChange={(e) => {
                            setQuickPassword(e.target.value);
                            setQuickLoginError(null);
                          }}
                          autoFocus
                          placeholder="Enter server password..."
                          className="w-full bg-[#121212] border border-[#3A3A3A] focus:border-blue-500 focus:outline-none px-2.5 py-1.5 text-xs text-white font-mono rounded-none"
                        />
                      </div>
                    )}

                    {/* Private Key Input */}
                    {quickAuthMethod === 'privateKey' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-medium text-slate-300">
                            SSH Private Key (.pem or PuTTY .ppk) <span className="text-rose-400">*</span>
                          </label>
                          <label className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            <span>{quickKeyFileName || 'Upload File'}</span>
                            <input
                              type="file"
                              accept=".pem,.ppk,.id_rsa,.key,text/plain"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setQuickKeyFileName(file.name);
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const text = ev.target?.result as string;
                                    if (text) setQuickPrivateKey(text);
                                  };
                                  reader.readAsText(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <textarea
                          rows={4}
                          value={quickPrivateKey}
                          onChange={(e) => {
                            setQuickPrivateKey(e.target.value);
                            setQuickLoginError(null);
                          }}
                          placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...or paste PuTTY-User-Key-File-2..."
                          className="w-full bg-[#121212] border border-[#3A3A3A] focus:border-blue-500 focus:outline-none p-2 text-[11px] text-white font-mono resize-none rounded-none"
                        />
                      </div>
                    )}

                    {/* Error Banner */}
                    {quickLoginError && (
                      <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        <span className="leading-snug break-words">{quickLoginError}</span>
                      </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div className="pt-2.5 border-t border-[#333333] flex items-center justify-between gap-2">
                      <div>
                        {onConfigureSSH && (
                          <button
                            type="button"
                            onClick={() => {
                              handleClose();
                              onConfigureSSH(target);
                            }}
                            className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                          >
                            SSH Settings →
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleClose}
                          disabled={isQuickSubmitting}
                          className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#383838] text-slate-300 hover:text-white border border-[#444444] text-xs font-medium cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isQuickSubmitting}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white border border-blue-400 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-lg"
                        >
                          {isQuickSubmitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Authenticating...</span>
                            </>
                          ) : (
                            <span>Login to Server</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global CSS for PuTTY scrollbar & terminal viewport styling */}
      <style jsx global>{`
        .putty-terminal .xterm {
          height: 100% !important;
          padding: 2px 4px !important;
        }
        .putty-terminal .xterm-viewport {
          background-color: #000000 !important;
        }
        .putty-terminal .xterm-viewport::-webkit-scrollbar {
          width: 14px;
          background-color: #000000;
        }
        .putty-terminal .xterm-viewport::-webkit-scrollbar-thumb {
          background-color: #555555;
          border: 3px solid #000000;
        }
        .putty-terminal .xterm-viewport::-webkit-scrollbar-thumb:hover {
          background-color: #777777;
        }
        .putty-terminal .xterm-viewport::-webkit-scrollbar-track {
          background-color: #000000;
        }
      `}</style>
    </>
  );
}
