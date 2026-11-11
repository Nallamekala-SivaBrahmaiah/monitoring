'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  RotateCw,
  Loader2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IScheduleExecutionHistory } from '@/models/ScheduleExecutionHistory';

interface ExecutionHistoryTableProps {
  initialServerFilter?: string;
  onHistoryCleared?: () => void;
}

export function ScheduleExecutionHistoryTable({
  initialServerFilter = '',
  onHistoryCleared,
}: ExecutionHistoryTableProps) {
  const [history, setHistory] = useState<IScheduleExecutionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Filters
  const [providerFilter, setProviderFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchServer, setSearchServer] = useState(initialServerFilter);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (providerFilter !== 'all') params.set('provider', providerFilter);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchServer.trim()) params.set('server', searchServer.trim());

      const res = await fetch(`/api/schedules/history?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.history) {
        setHistory(data.history);
      } else {
        throw new Error(data.error || 'Failed to load history');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [providerFilter, actionFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/schedules/history?resetFailures=true', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory([]);
        setClearModalOpen(false);
        setFeedback({
          type: 'success',
          message: data.message || 'Execution history and audit logs cleared successfully.',
        });
        if (onHistoryCleared) {
          onHistoryCleared();
        }
      } else {
        throw new Error(data.error || 'Failed to clear execution logs');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to clear execution history',
      });
      setClearModalOpen(false);
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (d: string | Date) => {
    try {
      const date = new Date(d);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return '--';
    }
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Feedback Notification Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#111A2E] border border-[#1E293B] rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchServer}
              onChange={(e) => setSearchServer(e.target.value)}
              placeholder="Search by server name or resource ID..."
              className="w-full bg-[#0D1526] border border-[#1E293B] focus:border-blue-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0D1526] border border-[#1E293B] text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">All Providers</option>
            <option value="aws">AWS EC2</option>
            <option value="azure">Azure VM</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0D1526] border border-[#1E293B] text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">All Actions</option>
            <option value="START">START Only</option>
            <option value="STOP">STOP Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0D1526] border border-[#1E293B] text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchHistory}
            className="p-1.5 rounded-xl bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-400 hover:text-white transition-colors"
            title="Refresh history"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Clear Logs Button */}
          <button
            onClick={() => setClearModalOpen(true)}
            disabled={loading || history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
            title="Clear all execution history and audit logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#0E1628]/90 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                <th className="py-3 px-4">Server</th>
                <th className="py-3 px-3">Provider</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Trigger</th>
                <th className="py-3 px-3">State Transition</th>
                <th className="py-3 px-3">Actual Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">Details / Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span>Loading execution history...</span>
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <History className="w-7 h-7 text-slate-600 mb-1" />
                      <p className="font-semibold text-slate-300">No Execution Logs Recorded Yet</p>
                      <p className="text-[11px] text-slate-500">
                        When scheduled start or stop operations run, their full audit logs appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((h, idx) => {
                  const isSuccess = h.status === 'SUCCESS';
                  const isStart = h.action === 'START';

                  return (
                    <tr key={idx} className="hover:bg-[#141F36]/60 transition-colors">
                      {/* Server & Resource */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-100">{h.serverName}</span>
                          <span className="font-mono text-[10px] text-slate-400">{h.resourceId}</span>
                        </div>
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          {h.provider === 'aws' ? (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FF9900]/10 border border-[#FF9900]/25 text-[#FF9900] font-semibold text-[10px]">
                              <AwsLogo className="w-3 h-3" />
                              <span>AWS</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0089D6]/10 border border-[#0089D6]/25 text-[#0089D6] font-semibold text-[10px]">
                              <AzureLogo className="w-2.5 h-2.5" />
                              <span>Azure</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            isStart
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {h.action}
                        </span>
                      </td>

                      {/* Trigger Type */}
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {h.triggerType}
                        </span>
                      </td>

                      {/* State Transition */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">{h.previousState}</span>
                          <span className="text-slate-600">&rarr;</span>
                          <span className={isSuccess ? 'text-slate-200 font-semibold' : 'text-slate-400'}>
                            {h.newState}
                          </span>
                        </div>
                      </td>

                      {/* Actual Execution Time */}
                      <td className="py-3 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(h.actualExecutionTime)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {isSuccess ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>SUCCESS</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[10px]">
                            <XCircle className="w-3 h-3" />
                            <span>FAILED</span>
                          </div>
                        )}
                      </td>

                      {/* Error or Latency */}
                      <td className="py-3 px-4">
                        {h.errorDetails ? (
                          <span className="text-rose-400 font-mono text-[10px] block max-w-xs truncate" title={h.errorDetails}>
                            {h.errorDetails}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[10px]">
                            Latency: {h.durationMs}ms
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear History Confirmation Modal */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#111A2E] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Clear Execution History &amp; Audit Logs?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  This will permanently delete all {history.length} recorded schedule execution audit log entries from the database. Active server schedules will not be modified or stopped.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                onClick={() => setClearModalOpen(false)}
                disabled={clearing}
                className="px-4 py-2 rounded-xl bg-[#18233C] text-slate-300 font-semibold text-xs hover:bg-[#202E4E] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-600/30 disabled:opacity-50 active:scale-[0.98]"
              >
                {clearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear All Logs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

