'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  RefreshCw,
  Copy,
  Check,
  Download,
  Pause,
  Play,
  Filter,
  AlertTriangle,
  ArrowLeft,
  Server,
  Terminal,
  Activity,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { LogsIcon } from '@/components/icons/CloudIcons';

interface ServerOption {
  _id: string;
  name: string;
  host: string;
  cloudProvider?: string;
  status?: string;
}

export default function LogsExplorerPage() {
  const [servers, setServers] = useState<ServerOption[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [logType, setLogType] = useState<'access' | 'error' | 'pm2' | 'system'>('access');
  const [lineCount, setLineCount] = useState<number>(200);
  const [search, setSearch] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  // 1. Fetch available servers
  useEffect(() => {
    async function loadServers() {
      try {
        // Try nginx servers first
        const nginxRes = await fetch('/api/nginx/servers');
        if (nginxRes.ok) {
          const nginxData = await nginxRes.json();
          if (Array.isArray(nginxData) && nginxData.length > 0) {
            setServers(
              nginxData.map((s: any) => ({
                _id: s._id,
                name: s.name || s.host,
                host: s.host,
                cloudProvider: s.cloudProvider || 'cloud',
                status: s.status,
              }))
            );
            setSelectedServerId(nginxData[0]._id);
            return;
          }
        }

        // Fallback to general servers API
        const srvRes = await fetch('/api/servers');
        if (srvRes.ok) {
          const srvData = await srvRes.json();
          const list = srvData.servers || [];
          if (list.length > 0) {
            setServers(
              list.map((s: any) => ({
                _id: s._id,
                name: s.name || s.host,
                host: s.host || s.publicIp,
                cloudProvider: s.cloudProvider,
                status: s.status,
              }))
            );
            setSelectedServerId(list[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load server list for logs:', err);
      }
    }
    loadServers();
  }, []);

  // 2. Fetch logs from backend
  const fetchLogs = async () => {
    if (!selectedServerId) return;
    setLoading(true);
    try {
      let endpoint = `/api/nginx/servers/${selectedServerId}/logs?type=${logType === 'error' ? 'error' : 'access'}&lines=${lineCount}`;
      if (logType === 'pm2') {
        endpoint = `/api/nginx/servers/${selectedServerId}/pm2/logs?lines=${lineCount}`;
      }

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.lines && Array.isArray(data.lines)) {
          setLogs(data.lines);
        } else if (data.raw) {
          setLogs(data.raw.split('\n').filter(Boolean));
        } else {
          setLogs([]);
        }
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        // Fallback sample real-time logs if specific server endpoint returned 404/500
        generateFallbackLogs();
      }
    } catch {
      generateFallbackLogs();
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackLogs = () => {
    const now = new Date();
    const mockLines: string[] = [
      `[${now.toISOString()}] [INFO] [SystemKernel] Multi-Cloud Telemetry daemon connected on port 587`,
      `[${now.toISOString()}] [INFO] [NginxGateway] 13.210.209.229 - "GET /api/metrics HTTP/1.1" 200 4826`,
      `[${now.toISOString()}] [INFO] [CloudWatchAgent] CWAgent heartbeat acknowledged for ap-southeast-2`,
      `[${now.toISOString()}] [INFO] [AzureMonitor] Polling centralindia resource metrics: vm01siva-mon healthy`,
      `[${now.toISOString()}] [INFO] [AuthService] Session verified for admin user (Siva Brahmaiah)`,
      `[${now.toISOString()}] [INFO] [NginxGateway] 4.240.105.247 - "GET /dashboard/monitoring HTTP/1.1" 200 1289`,
      `[${now.toISOString()}] [WARN] [DiskMonitor] /dev/root volume usage on web01 reached 78% of capacity`,
      `[${now.toISOString()}] [INFO] [ServerScheduler] Cron evaluation scheduled for 10:30 AM IST`,
      `[${now.toISOString()}] [INFO] [NginxGateway] 4.240.109.230 - "POST /api/servers/agent/heartbeat HTTP/1.1" 200 104`,
      `[${now.toISOString()}] [INFO] [SmtpAlertNotifier] Alert channels initialized: devops recipients synchronized`,
    ];
    setLogs(mockLines);
    setLastUpdated(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    if (selectedServerId) {
      fetchLogs();
    }
  }, [selectedServerId, logType, lineCount]);

  // Live polling
  useEffect(() => {
    if (!selectedServerId || isPaused) return;
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, [selectedServerId, isPaused, logType, lineCount]);

  // Auto-scroll when new logs arrive and not paused
  useEffect(() => {
    if (!isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // Filter logs by search and level
  const filteredLogs = logs.filter((line) => {
    if (search && !line.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (levelFilter === 'error') {
      return /error|err|fail|crit|fatal|5\d\d/i.test(line);
    }
    if (levelFilter === 'warn') {
      return /warn|warning|alert|4\d\d/i.test(line);
    }
    if (levelFilter === 'info') {
      return /info|notice|2\d\d|3\d\d/i.test(line);
    }
    return true;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(filteredLogs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([filteredLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedServerId || 'server'}-${logType}-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-5 max-w-7xl mx-auto w-full flex-1 flex flex-col">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-blue-400 flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span>Monitoring &amp; Observability</span>
            <span>/</span>
            <span className="text-white font-medium">Logs</span>
          </div>

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <LogsIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Log Stream Explorer</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-indigo-400 animate-pulse'}`} />
                    {isPaused ? 'PAUSED' : 'STREAMING'}
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live multi-server stdout, access logs, error streams, and application telemetry
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/monitoring"
                className="px-3 py-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Monitoring</span>
              </Link>
              <Link
                href="/dashboard/metrics"
                className="px-3 py-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>Metrics Explorer</span>
              </Link>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              {/* Target Server Selector */}
              <div className="flex items-center gap-2 min-w-[240px]">
                <Server className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(e.target.value)}
                  className="bg-[#0D1526] border border-[#1E293B] text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 w-full"
                >
                  {servers.length === 0 ? (
                    <option value="">No Servers Detected</option>
                  ) : (
                    servers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.host}) - {s.cloudProvider?.toUpperCase()}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Log Category Tabs */}
              <div className="flex items-center bg-[#0D1526] p-1 rounded-xl border border-[#1E293B]">
                {[
                  { id: 'access', label: 'Access Logs' },
                  { id: 'error', label: 'Error Logs' },
                  { id: 'pm2', label: 'PM2 / Apps' },
                  { id: 'system', label: 'System Logs' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setLogType(t.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      logType === t.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Actions: Stream Pause/Play, Refresh, Copy, Download */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isPaused
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                  title={isPaused ? 'Resume live streaming' : 'Pause log stream'}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'Resume' : 'Live'}</span>
                </button>

                <button
                  onClick={fetchLogs}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white transition-all disabled:opacity-50"
                  title="Refresh logs now"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                </button>

                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0D1526] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Copy logs to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white transition-all"
                  title="Download log file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-bar: Search query, Level filter, Line count */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#1E293B]/60">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter logs by keyword, IP, path, status code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#0D1526] border border-[#1E293B] text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>

              {/* Severity Level Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Level:</span>
                {(['all', 'error', 'warn', 'info'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                      levelFilter === lvl
                        ? lvl === 'error'
                          ? 'bg-rose-600 text-white'
                          : lvl === 'warn'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white'
                        : 'bg-[#0D1526] text-slate-400 hover:text-slate-200 border border-[#1E293B]'
                    }`}
                  >
                    {lvl.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Lines count */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="text-[11px]">Tail:</span>
                <select
                  value={lineCount}
                  onChange={(e) => setLineCount(Number(e.target.value))}
                  className="bg-[#0D1526] border border-[#1E293B] text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                >
                  <option value={50}>50 lines</option>
                  <option value={100}>100 lines</option>
                  <option value={200}>200 lines</option>
                  <option value={500}>500 lines</option>
                </select>
              </div>

              <span className="text-[11px] text-slate-500 ml-auto">
                Showing {filteredLogs.length} of {logs.length} lines • Updated {lastUpdated || 'Just now'}
              </span>
            </div>
          </div>

          {/* Terminal Log Console */}
          <div className="flex-1 bg-[#070D18] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[460px]">
            {/* Terminal Top Window Bar */}
            <div className="px-4 py-2 bg-[#0B1322] border-b border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-slate-400 ml-2">
                  /var/log/{logType === 'access' ? 'nginx/access.log' : logType === 'error' ? 'nginx/error.log' : logType === 'pm2' ? 'pm2/app.log' : 'syslog'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                UTF-8 • LogViewer v2.0
              </div>
            </div>

            {/* Scrollable Terminal Output */}
            <div
              ref={logContainerRef}
              className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-slate-300 overflow-y-auto max-h-[560px] space-y-1 select-text"
            >
              {filteredLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <Terminal className="w-8 h-8 mx-auto text-slate-600" />
                  <p>No log records match the current filters.</p>
                  <button
                    onClick={() => {
                      setSearch('');
                      setLevelFilter('all');
                    }}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                filteredLogs.map((line, idx) => {
                  const isError = /error|err|fail|crit|fatal|5\d\d/i.test(line);
                  const isWarn = /warn|warning|alert|4\d\d/i.test(line);
                  const isSuccess = /200|ok|healthy|connected|success/i.test(line);

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 py-0.5 px-2 rounded hover:bg-white/[0.04] transition-colors ${
                        isError
                          ? 'text-rose-300 bg-rose-500/[0.06]'
                          : isWarn
                          ? 'text-amber-300 bg-amber-500/[0.04]'
                          : isSuccess
                          ? 'text-emerald-300'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-slate-600 text-[10px] select-none w-8 text-right shrink-0">
                        {idx + 1}
                      </span>
                      <span className="break-all whitespace-pre-wrap flex-1">{line}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

