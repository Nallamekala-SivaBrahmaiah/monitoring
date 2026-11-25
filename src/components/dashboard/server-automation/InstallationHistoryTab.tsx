'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Terminal,
  RefreshCw,
  Search,
  Filter,
  Play,
  RotateCw,
  Copy,
  Check,
} from 'lucide-react';

interface HistoryProps {
  onReRun?: (execution: any) => void;
  onOpenLiveTerminal?: (executionId: string) => void;
}

export function InstallationHistoryTab({
  onReRun,
  onOpenLiveTerminal,
}: HistoryProps) {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected execution for full log modal
  const [viewingExecution, setViewingExecution] = useState<any | null>(null);
  const [fullLogs, setFullLogs] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const url = statusFilter !== 'all'
        ? `/api/server-automation/history?status=${statusFilter}`
        : '/api/server-automation/history';
      const res = await fetch(url);
      const data = await res.json();
      if (data.executions) {
        setExecutions(data.executions);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter]);

  const openLogViewer = async (execution: any) => {
    setViewingExecution(execution);
    setLoadingLogs(true);
    setFullLogs('');
    try {
      const res = await fetch(`/api/server-automation/history/${execution._id}`);
      const data = await res.json();
      if (data.execution) {
        setFullLogs(data.execution.logOutput || 'No output recorded for this run.');
      }
    } catch (err) {
      setFullLogs('Failed to load execution logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(fullLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredExecutions = executions.filter((ex) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const sName = (ex.serverName || '').toLowerCase();
    const sHost = (ex.serverHost || '').toLowerCase();
    const scName = (ex.scriptName || '').toLowerCase();
    const toolIds = (ex.selectedTools || []).map((t: any) => t.toolId.toLowerCase()).join(' ');
    return sName.includes(q) || sHost.includes(q) || scName.includes(q) || toolIds.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history by server name, IP, tools, script..."
              className="w-full pl-9 pr-3 py-2 bg-[#111A2E] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#111A2E] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
            <option value="cancelled">Cancelled</option>
            <option value="running">Running</option>
          </select>

          <button
            type="button"
            onClick={fetchHistory}
            className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700/80 transition cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#090F1C] border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Target Server</th>
                <th className="py-3.5 px-4">Type / Workflow</th>
                <th className="py-3.5 px-4">Tools / Script</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Executed At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading execution history...
                  </td>
                </tr>
              ) : filteredExecutions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No execution history matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredExecutions.map((ex) => {
                  const isSuccess = ex.status === 'success';
                  const isRunning = ex.status === 'running';
                  const isFailed = ex.status === 'failed';
                  const isPartial = ex.status === 'partial';
                  const isCancelled = ex.status === 'cancelled';

                  return (
                    <tr key={ex._id} className="hover:bg-[#111A2E]/60 transition">
                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isSuccess
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isRunning
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                              : isPartial
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isCancelled
                              ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          {isFailed && <XCircle className="w-3 h-3 text-rose-400" />}
                          {isRunning && <RotateCw className="w-3 h-3 text-cyan-400 animate-spin" />}
                          <span>{ex.status}</span>
                        </span>
                      </td>

                      {/* Target Server */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{ex.serverName}</div>
                        <div className="font-mono text-[11px] text-slate-400">{ex.serverHost}</div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 border border-slate-800">
                          {ex.executionType === 'tool-installation' ? 'Tool Install' : 'Custom Script'}
                        </span>
                      </td>

                      {/* Tools / Script Name */}
                      <td className="py-3 px-4">
                        {ex.executionType === 'tool-installation' ? (
                          <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                            {(ex.selectedTools || []).map((t: any) => (
                              <span
                                key={t.toolId}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  t.status === 'success'
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                    : t.status === 'failed'
                                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                    : 'bg-[#111A2E] text-slate-300 border border-slate-800'
                                }`}
                              >
                                {t.toolName?.split(' ')[0] || t.toolId}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono text-cyan-300">{ex.scriptName || 'Custom Script'}</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {ex.durationSeconds ? `${ex.durationSeconds}s` : isRunning ? 'In progress' : '-'}
                      </td>

                      {/* Executed At */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {ex.startedAt ? new Date(ex.startedAt).toLocaleString() : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live stream button if running */}
                          {isRunning && onOpenLiveTerminal && (
                            <button
                              type="button"
                              onClick={() => onOpenLiveTerminal(ex._id)}
                              className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] transition cursor-pointer"
                              title="Attach to live terminal"
                            >
                              Live
                            </button>
                          )}

                          {/* View Logs Button */}
                          <button
                            type="button"
                            onClick={() => openLogViewer(ex)}
                            className="px-2.5 py-1 rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                            title="View Terminal Logs"
                          >
                            <Terminal className="w-3 h-3" />
                            <span>Logs</span>
                          </button>

                          {/* Download Button */}
                          <a
                            href={`/api/server-automation/history/${ex._id}?download=true`}
                            download
                            className="p-1 rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-400 hover:text-white border border-slate-800 transition"
                            title="Download .log file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
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

      {/* Log Viewer Modal */}
      {viewingExecution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-cyan-500/40 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Execution Log: {viewingExecution.serverName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {viewingExecution._id} • Status: {viewingExecution.status} • Duration: {viewingExecution.durationSeconds || 0}s
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="px-3 py-1.5 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 text-xs font-semibold border border-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <a
                  href={`/api/server-automation/history/${viewingExecution._id}?download=true`}
                  download
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .log</span>
                </a>

                <button
                  type="button"
                  onClick={() => setViewingExecution(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto bg-[#060A14] flex-1 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
              {loadingLogs ? 'Loading full execution output...' : fullLogs}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#090F1C] flex items-center justify-between text-xs text-slate-400">
              <span>Target: {viewingExecution.serverHost}</span>
              <button
                type="button"
                onClick={() => setViewingExecution(null)}
                className="px-4 py-1.5 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
