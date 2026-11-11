'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Play,
  Square,
  RotateCcw,
  Trash2,
  RefreshCw,
  Zap,
  Terminal,
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Search,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';

interface NginxPM2TabProps {
  activeServer: INginxServerData | null;
}

export function NginxPM2Tab({ activeServer }: NginxPM2TabProps) {
  const [processes, setProcesses] = useState<any[]>([]);
  const [isInstalled, setIsInstalled] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // PM2 Log viewer state
  const [selectedAppLogs, setSelectedAppLogs] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchPM2 = async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pm2`);
      const data = await res.json();
      if (res.ok) {
        setIsInstalled(data.pm2Installed);
        setProcesses(data.processes || []);
      }
    } catch (err) {
      console.error('Failed to fetch PM2:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppLogs = async (appName?: string) => {
    if (!activeServer) return;
    setLogsLoading(true);
    try {
      const q = appName ? `?app=${encodeURIComponent(appName)}&lines=150` : '?lines=150';
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pm2/logs${q}`);
      const data = await res.json();
      if (res.ok && data.output) {
        setLogContent(data.output);
      }
    } catch (err) {
      console.error('Failed to fetch PM2 logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeServer) {
      fetchPM2();
      fetchAppLogs();
    }
  }, [activeServer?._id]);

  const handleAction = async (action: string, target: string = 'all') => {
    if (!activeServer) return;
    setActionLoading(`${action}-${target}`);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/pm2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target }),
      });
      await fetchPM2();
      if (selectedAppLogs) {
        await fetchAppLogs(selectedAppLogs);
      }
    } catch (err) {
      console.error(`PM2 action error:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server to manage PM2 processes.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">PM2 Process Manager</h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isInstalled
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {isInstalled ? `${processes.length} Processes` : 'Not Installed'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Production runtime for Node.js, Next.js, and Express apps on <strong className="text-slate-200">{activeServer.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isInstalled ? (
            <button
              onClick={() => handleAction('install')}
              disabled={actionLoading === 'install-all'}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-600/25 transition disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Install PM2 (Global)</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => handleAction('restart', 'all')}
                disabled={!!actionLoading}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                title="Restart all applications"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart All</span>
              </button>

              <button
                onClick={() => handleAction('clear', 'all')}
                disabled={!!actionLoading}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                title="Flush / Clear logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Flush Logs</span>
              </button>

              <button
                onClick={fetchPM2}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                title="Refresh Process List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Process Table */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0D1527] text-slate-400 border-b border-[#1E293B] text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Application</th>
                <th className="py-3.5 px-4">PM2 ID</th>
                <th className="py-3.5 px-4">PID</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">CPU</th>
                <th className="py-3.5 px-4">Memory</th>
                <th className="py-3.5 px-4">Restarts</th>
                <th className="py-3.5 px-4">Uptime</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 font-sans">
              {processes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No active PM2 processes found on this server. Deploy an application or start one via SSH.
                  </td>
                </tr>
              ) : (
                processes.map((proc) => {
                  const isOnline = proc.status === 'online';
                  const isErrored = proc.status === 'errored';
                  const memMb = Math.round((proc.memoryBytes || 0) / (1024 * 1024));

                  return (
                    <tr key={proc.pmId} className="hover:bg-[#142038]/60 transition group">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{proc.name}</span>
                          {proc.port && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              :{proc.port}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 truncate block max-w-xs">
                          {proc.script}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300 font-semibold">
                        #{proc.pmId}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400">
                        {proc.pid || '-'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isErrored
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {proc.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {proc.cpu}%
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {memMb} MB
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400">
                        {proc.restarts}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {proc.uptimeSeconds ? `${Math.floor(proc.uptimeSeconds / 60)}m` : '0m'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isOnline ? (
                            <button
                              onClick={() => handleAction('stop', proc.name)}
                              disabled={!!actionLoading}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white border border-slate-700 transition"
                              title="Stop Process"
                            >
                              <Square className="w-3 h-3 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction('start', proc.name)}
                              disabled={!!actionLoading}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                              title="Start Process"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                          )}

                          <button
                            onClick={() => handleAction('restart', proc.name)}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Restart Process"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAppLogs(proc.name);
                              fetchAppLogs(proc.name);
                            }}
                            className="p-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white shadow-sm transition"
                            title="View App Logs"
                          >
                            <FileText className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleAction('delete', proc.name)}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                            title="Delete Process from PM2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live PM2 Logs Output Section */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              PM2 Execution Logs {selectedAppLogs ? `(${selectedAppLogs})` : '(All Apps)'}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {selectedAppLogs && (
              <button
                onClick={() => {
                  setSelectedAppLogs(null);
                  fetchAppLogs();
                }}
                className="text-xs text-blue-400 hover:underline"
              >
                View All PM2 Logs
              </button>
            )}

            <button
              onClick={() => fetchAppLogs(selectedAppLogs || undefined)}
              disabled={logsLoading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin text-purple-400' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>
        </div>

        <div className="bg-[#070B14] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto min-h-[180px] max-h-[380px] whitespace-pre-wrap select-text">
          {logsLoading && !logContent ? (
            <div className="py-8 text-center text-slate-500">Loading PM2 logs...</div>
          ) : logContent ? (
            logContent
          ) : (
            'No PM2 log activity recorded yet.'
          )}
        </div>
      </div>
    </div>
  );
}

