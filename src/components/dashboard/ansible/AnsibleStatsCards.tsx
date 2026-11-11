'use client';

import React from 'react';
import { Server, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    totalServers: number;
    totalPlaybooks: number;
    successfulRuns: number;
    failedRuns: number;
    runningJobs: number;
    successRatePercent: number;
    failureRatePercent: number;
    lastRunDisplay: string;
  };
}

export function AnsibleStatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {/* 1. Managed Nodes */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-blue-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Managed Nodes</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-white tracking-tight">{stats.totalServers}</span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                Active Fleet
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Playbooks */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Play className="w-5 h-5 fill-emerald-400/20" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Playbooks</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-white tracking-tight">{stats.totalPlaybooks}</span>
              <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md">
                Available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Successful Runs */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Successful Runs</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-white tracking-tight">{stats.successfulRuns}</span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                ↑ {stats.successRatePercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Failed Runs */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-rose-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Failed Runs</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-white tracking-tight">{stats.failedRuns}</span>
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md">
                {stats.failedRuns > 0 ? `↓ ${stats.failureRatePercent}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Last Run */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-cyan-500/40 transition-all col-span-2 md:col-span-1 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Last Run</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-bold text-white tracking-tight">{stats.lastRunDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
