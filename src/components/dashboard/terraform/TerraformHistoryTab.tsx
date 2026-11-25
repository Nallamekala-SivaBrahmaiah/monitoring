'use client';

import React, { useState } from 'react';
import {
  History,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  ArrowRight,
  Eye,
  Clock,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface TerraformHistoryTabProps {
  executions: any[];
  onViewExecutionLogs: (execution: any) => void;
}

export function TerraformHistoryTab({
  executions,
  onViewExecutionLogs,
}: TerraformHistoryTabProps) {
  const [search, setSearch] = useState('');
  const [opFilter, setOpFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = executions.filter((ex) => {
    if (opFilter !== 'all' && ex.operation !== opFilter) return false;
    if (statusFilter !== 'all' && ex.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        ex.projectName?.toLowerCase().includes(q) ||
        ex.workspace?.toLowerCase().includes(q) ||
        ex.initiator?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Terraform Execution History &amp; Audit Trail</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Search executions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#080D1A] border border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />

          <select
            value={opFilter}
            onChange={(e) => setOpFilter(e.target.value)}
            className="bg-[#080D1A] border border-[#1E293B] rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="all">All Operations</option>
            <option value="init">init</option>
            <option value="validate">validate</option>
            <option value="fmt">fmt</option>
            <option value="plan">plan</option>
            <option value="apply">apply</option>
            <option value="destroy">destroy</option>
            <option value="import">import</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#080D1A] border border-[#1E293B] rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="all">All Statuses</option>
            <option value="successful">successful</option>
            <option value="failed">failed</option>
            <option value="running">running</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      {filtered.length > 0 ? (
        <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#080D1A] text-gray-400 border-b border-[#1E293B] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Operation</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Workspace</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Initiator</th>
                  <th className="py-3 px-4">Execution Time</th>
                  <th className="py-3 px-4 text-right">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {filtered.map((ex) => {
                  const isSuccess = ex.status === 'successful';
                  return (
                    <tr key={ex._id} className="hover:bg-[#131D35]/50 transition">
                      <td className="py-3 px-4 font-bold text-white uppercase">
                        terraform {ex.operation}
                      </td>
                      <td className="py-3 px-4 text-cyan-300 font-bold">{ex.projectName}</td>
                      <td className="py-3 px-4 text-purple-300">{ex.workspace || 'default'}</td>
                      <td className="py-3 px-4 uppercase text-gray-400">
                        <span className="flex items-center gap-1">
                          {ex.provider === 'aws' ? <AwsLogo className="w-3.5 h-3.5" /> : <AzureLogo className="w-3.5 h-3.5" />}
                          <span>{ex.provider}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isSuccess
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {ex.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{(ex.durationMs / 1000).toFixed(1)}s</td>
                      <td className="py-3 px-4 text-gray-300">{ex.initiator || 'DevOps Architect'}</td>
                      <td className="py-3 px-4 text-gray-500 text-[11px]">
                        {new Date(ex.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onViewExecutionLogs(ex)}
                          className="px-2.5 py-1 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>Logs</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#0D1526]/85 border border-[#1E293B] text-center text-gray-400 text-xs">
          <History className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="font-bold text-gray-300">No execution records found</p>
          <p className="text-gray-500">Executions will be recorded as commands are run.</p>
        </div>
      )}
    </div>
  );
}
