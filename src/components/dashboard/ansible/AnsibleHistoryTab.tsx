'use client';

import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  FileCode,
  Search,
  ExternalLink,
  RefreshCw,
  Eye,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { IAnsibleExecutionData } from '@/models/AnsibleExecution';

interface AnsibleHistoryTabProps {
  executions: IAnsibleExecutionData[];
  onSelectExecution: (execution: IAnsibleExecutionData) => void;
  onRefresh: () => void;
  onRerun: (execution: IAnsibleExecutionData) => void;
  onClearHistory?: () => Promise<void> | void;
  onDeleteExecution?: (execution: IAnsibleExecutionData) => Promise<void> | void;
}

export function AnsibleHistoryTab({
  executions,
  onSelectExecution,
  onRefresh,
  onRerun,
  onClearHistory,
  onDeleteExecution,
}: AnsibleHistoryTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = executions.filter((ex) => {
    const matchesSearch =
      ex.jobId.toLowerCase().includes(search.toLowerCase()) ||
      ex.playbookName.toLowerCase().includes(search.toLowerCase()) ||
      ex.hostName.toLowerCase().includes(search.toLowerCase()) ||
      ex.hostIp.includes(search);

    const matchesStatus = statusFilter === 'all' || ex.status === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const handleClearAll = async () => {
    if (!onClearHistory) return;
    setIsClearing(true);
    try {
      await onClearHistory();
      setConfirmModalOpen(false);
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteSingle = async (ex: IAnsibleExecutionData) => {
    if (!onDeleteExecution) return;
    const targetId = ex._id || ex.jobId;
    setDeletingId(targetId);
    try {
      await onDeleteExecution(ex);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by Job ID, Playbook or Server..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="RUNNING">RUNNING</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            title="Refresh execution history"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {onClearHistory && (
            <button
              onClick={() => setConfirmModalOpen(true)}
              disabled={executions.length === 0 || isClearing}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              title="Clean all execution logs and history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clean Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0D1527] text-slate-400 border-b border-[#1E293B] text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4">Playbook</th>
                <th className="py-3 px-4">Target Server</th>
                <th className="py-3 px-4">Start Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No execution records found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((ex) => {
                  const isSuccess = ex.status === 'SUCCESS';
                  const isRunning = ex.status === 'RUNNING';

                  return (
                    <tr key={ex._id || ex.jobId} className="hover:bg-[#142038]/50 transition group">
                      <td className="py-3.5 px-4 font-mono font-semibold text-white">
                        {ex.jobId}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 font-medium">
                        {ex.playbookName}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">{ex.hostName}</span>
                        <div className="text-[10px] text-slate-400 font-mono">{ex.hostIp}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {new Date(ex.startTime).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {ex.durationSeconds ? `${ex.durationSeconds}s` : 'In progress'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isRunning
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {ex.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectExecution(ex)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 flex items-center gap-1 transition"
                            title="View execution logs and details"
                          >
                            <Eye className="w-3 h-3 text-blue-400" />
                            <span>Details</span>
                          </button>

                          <button
                            onClick={() => onRerun(ex)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-semibold shadow-sm transition"
                            title="Re-run this playbook"
                          >
                            Re-run
                          </button>

                          {onDeleteExecution && (
                            <button
                              onClick={() => handleDeleteSingle(ex)}
                              disabled={deletingId === (ex._id || ex.jobId)}
                              className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition disabled:opacity-50"
                              title="Delete this execution record"
                            >
                              {deletingId === (ex._id || ex.jobId) ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
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

      {/* Confirmation Modal for Clean Logs */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111A2E] border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Clean Execution Logs</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to permanently clear all playbook execution logs and history?
                  This will delete <strong className="text-white">{executions.length} execution record(s)</strong> and reset run statistics.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>This action cannot be undone.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Clean All Logs</span>
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

