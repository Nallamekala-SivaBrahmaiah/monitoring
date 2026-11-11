'use client';

import React, { useState } from 'react';
import {
  Rocket,
  Clock,
  RotateCcw,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { INginxDeploymentData } from '@/models/NginxDeployment';

interface NginxHistoryTabProps {
  deployments: INginxDeploymentData[];
  onRefresh: () => void;
  onRollback: (deployment: INginxDeploymentData) => void;
  onClearLogs?: () => void;
  onDeleteRecord?: (id: string) => void;
  isRollingBack?: boolean;
}

export function NginxHistoryTab({
  deployments,
  onRefresh,
  onRollback,
  onClearLogs,
  onDeleteRecord,
  isRollingBack,
}: NginxHistoryTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLogs, setSelectedLogs] = useState<INginxDeploymentData | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const filtered = deployments.filter((d) => {
    const matchesSearch =
      d.deploymentId.toLowerCase().includes(search.toLowerCase()) ||
      d.appName.toLowerCase().includes(search.toLowerCase()) ||
      d.serverName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || d.status === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Top Filter & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Deployment ID, app name or server..."
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
            <option value="ROLLED_BACK">ROLLED BACK</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {onClearLogs && (
            <button
              onClick={() => setConfirmClearOpen(true)}
              disabled={deployments.length === 0}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition disabled:opacity-40"
              title="Clean all deployment logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clean Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0D1527] text-slate-400 border-b border-[#1E293B] text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Deployment ID</th>
                <th className="py-3.5 px-4">Application</th>
                <th className="py-3.5 px-4">Target Server</th>
                <th className="py-3.5 px-4">Deploy Directory</th>
                <th className="py-3.5 px-4">Started At</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No deployment records found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((dep) => {
                  const isSuccess = dep.status === 'SUCCESS';
                  const isFailed = dep.status === 'FAILED';
                  const isRolledBack = dep.status === 'ROLLED_BACK';

                  return (
                    <tr key={dep.deploymentId} className="hover:bg-[#142038]/60 transition group">
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {dep.deploymentId}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-white text-xs block">{dep.appName}</span>
                        <span className="text-[10px] font-mono text-blue-400 uppercase">
                          {dep.appType} &bull; {dep.deploymentMode}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200 block">{dep.serverName}</span>
                        <span className="font-mono text-[10px] text-slate-500 block">{dep.serverHost}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {dep.deployDir}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(dep.startTime).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {dep.durationSeconds ? `${dep.durationSeconds}s` : 'Active'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isFailed
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : isRolledBack
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLogs(dep)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition"
                            title="View deployment logs"
                          >
                            <Eye className="w-3 h-3 text-blue-400" />
                            <span>Logs</span>
                          </button>

                          {dep.rollbackAvailable && (
                            <button
                              onClick={() => onRollback(dep)}
                              disabled={isRollingBack}
                              className="px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Restore previous backup release"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Rollback</span>
                            </button>
                          )}

                          {onDeleteRecord && (
                            <button
                              onClick={() => onDeleteRecord(dep.deploymentId)}
                              className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Deployment Log Modal */}
      {selectedLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111A2E] border border-slate-700 rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {selectedLogs.deploymentId} &mdash; {selectedLogs.appName}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Deployed to {selectedLogs.serverName} ({selectedLogs.serverHost})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogs(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="bg-[#070B14] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed max-h-[460px] overflow-y-auto whitespace-pre-wrap select-text">
              {selectedLogs.logs || 'No log details available for this job.'}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Duration: {selectedLogs.durationSeconds}s &bull; Status: {selectedLogs.status}
              </span>
              <button
                onClick={() => setSelectedLogs(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clean Logs */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111A2E] border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Clean Deployment Logs</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to permanently clear all deployment history and execution logs? This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearLogs?.();
                  setConfirmClearOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clean All Logs</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

