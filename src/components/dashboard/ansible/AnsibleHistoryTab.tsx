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
} from 'lucide-react';
import { IAnsibleExecutionData } from '@/models/AnsibleExecution';

interface AnsibleHistoryTabProps {
  executions: IAnsibleExecutionData[];
  onSelectExecution: (execution: IAnsibleExecutionData) => void;
  onRefresh: () => void;
  onRerun: (execution: IAnsibleExecutionData) => void;
}

export function AnsibleHistoryTab({
  executions,
  onSelectExecution,
  onRefresh,
  onRerun,
}: AnsibleHistoryTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = executions.filter((ex) => {
    const matchesSearch =
      ex.jobId.toLowerCase().includes(search.toLowerCase()) ||
      ex.playbookName.toLowerCase().includes(search.toLowerCase()) ||
      ex.hostName.toLowerCase().includes(search.toLowerCase()) ||
      ex.hostIp.includes(search);

    const matchesStatus = statusFilter === 'all' || ex.status === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

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

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
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
                          >
                            <Eye className="w-3 h-3 text-blue-400" />
                            <span>Details</span>
                          </button>

                          <button
                            onClick={() => onRerun(ex)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-semibold shadow-sm transition"
                          >
                            Re-run
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
    </div>
  );
}

