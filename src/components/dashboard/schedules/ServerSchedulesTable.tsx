'use client';

import React, { useState } from 'react';
import {
  Play,
  Square,
  Pause,
  Edit2,
  Trash2,
  Clock,
  History,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IServerScheduleData } from '@/models/ServerSchedule';

interface ServerSchedulesTableProps {
  schedules: IServerScheduleData[];
  loading: boolean;
  onRefresh: () => void;
  onEdit: (schedule: IServerScheduleData) => void;
  onDelete: (id: string, name: string) => void;
  onToggle: (id: string, field: 'enabled' | 'isPaused') => void;
  onExecuteNow: (id: string, action: 'START' | 'STOP') => Promise<void>;
  onViewHistory: (serverName: string) => void;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function formatTime12h(time24: string): string {
  if (!time24) return '--:--';
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const mStr = m < 10 ? `0${m}` : String(m);
  return `${h12}:${mStr} ${suffix}`;
}

function cleanResourceSubtitle(resourceId: string, provider: string, region: string): { display: string; full: string } {
  if (!resourceId) return { display: region || 'global', full: '' };
  if (provider === 'azure' && resourceId.includes('/')) {
    const rgMatch = resourceId.match(/\/resourcegroups\/([^\/]+)/i);
    const vmMatch = resourceId.match(/\/virtualmachines\/([^\/]+)/i);
    const rg = rgMatch ? rgMatch[1] : '';
    const vm = vmMatch ? vmMatch[1] : '';
    if (rg) {
      return {
        display: `${rg} • ${region || 'centralindia'} • vm/${vm || 'resource'}`,
        full: resourceId,
      };
    }
  }
  return {
    display: `${resourceId} • ${region || 'ap-southeast-2'}`,
    full: resourceId,
  };
}

export function ServerSchedulesTable({
  schedules,
  loading,
  onRefresh,
  onEdit,
  onDelete,
  onToggle,
  onExecuteNow,
  onViewHistory,
}: ServerSchedulesTableProps) {
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executingAction, setExecutingAction] = useState<'START' | 'STOP' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'START' | 'STOP') => {
    setExecutingId(id);
    setExecutingAction(action);
    try {
      await onExecuteNow(id, action);
    } finally {
      setExecutingId(null);
      setExecutingAction(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="bg-[#0B1324] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl text-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse select-none whitespace-nowrap">
          <thead>
            <tr className="border-b border-[#1E293B] bg-[#070D1A]/95 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              <th className="py-3.5 px-4">Server &amp; Provider</th>
              <th className="py-3.5 px-3">State</th>
              <th className="py-3.5 px-3">Start Time</th>
              <th className="py-3.5 px-3">Stop Time</th>
              <th className="py-3.5 px-3">Active Days</th>
              <th className="py-3.5 px-3">Next Action</th>
              <th className="py-3.5 px-3">Schedule</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/70 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Loading schedules and live cloud states...</span>
                  </div>
                </td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Clock className="w-8 h-8 text-slate-600 mb-1" />
                    <p className="font-semibold text-slate-300">No Server Schedules Configured</p>
                    <p className="text-[11px] text-slate-500 max-w-sm">
                      Create an automated schedule to automatically start and stop your AWS EC2 instances and Azure VMs on specific days.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              schedules.map((s) => {
                const isRunning = s.currentState === 'Running';
                const isActionBusy = executingId === s._id;
                const isAzure = s.provider === 'azure';
                const subtitle = cleanResourceSubtitle(s.resourceId, s.provider, s.region);

                return (
                  <tr
                    key={s._id}
                    className="hover:bg-[#111A2E]/80 transition-colors group"
                  >
                    {/* 1. Server & Provider */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold text-white text-sm tracking-tight"
                            title={s.serverName}
                          >
                            {s.serverName}
                          </span>
                          {isAzure ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0089D6]/15 border border-[#0089D6]/35 text-[#0089D6] font-bold text-[10px]">
                              <AzureLogo className="w-2.5 h-2.5" />
                              <span>AZURE</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF9900]/15 border border-[#FF9900]/35 text-[#FF9900] font-bold text-[10px]">
                              <AwsLogo className="w-3 h-3" />
                              <span>AWS</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-slate-400">
                          <span className="truncate max-w-[220px]" title={subtitle.full || s.resourceId}>
                            {subtitle.display}
                          </span>
                          {subtitle.full && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(subtitle.full, s._id)}
                              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                              title="Copy full resource ID"
                            >
                              {copiedId === s._id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Current State */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isRunning
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                          }`}
                        />
                        <span>{s.currentState}</span>
                      </span>
                    </td>

                    {/* 3. Dedicated Start Time */}
                    <td className="py-3.5 px-3">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono text-xs font-bold shadow-sm">
                        <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                        <span>Start: {formatTime12h(s.startTime)}</span>
                      </div>
                    </td>

                    {/* 4. Dedicated Stop Time */}
                    <td className="py-3.5 px-3">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 font-mono text-xs font-bold shadow-sm">
                        <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                        <span>Stop: {formatTime12h(s.stopTime)}</span>
                      </div>
                    </td>

                    {/* 5. 7-Day Letter Matrix (M T W T F S S) */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        {ALL_DAYS.map((day, idx) => {
                          const isActive = (s.daysOfWeek || []).includes(day);
                          const letter = DAY_LETTERS[idx];
                          return (
                            <span
                              key={day}
                              title={`${day}: ${isActive ? 'Active' : 'Disabled'}`}
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-all ${
                                isActive
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/40'
                                  : 'bg-slate-800/60 text-slate-600 border border-slate-800/80'
                              }`}
                            >
                              {letter}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* 6. Next Action */}
                    <td className="py-3.5 px-3">
                      {s.nextAction && s.nextAction !== 'NONE' ? (
                        <div className="flex flex-col">
                          <span
                            className={`font-mono text-xs font-extrabold tracking-wide ${
                              s.nextAction === 'START' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {s.nextAction} ·{' '}
                            {s.nextActionAt
                              ? new Date(s.nextActionAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })
                              : '--'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-mono">--</span>
                      )}
                    </td>

                    {/* 7. Schedule Enabled / Paused status */}
                    <td className="py-3.5 px-3">
                      {s.isPaused ? (
                        <button
                          type="button"
                          onClick={() => onToggle(s._id, 'isPaused')}
                          title="Click to resume schedule"
                          className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-400 font-bold text-[10px] hover:bg-amber-500/25 transition-all cursor-pointer"
                        >
                          ⏸ Paused
                        </button>
                      ) : s.enabled ? (
                        <button
                          type="button"
                          onClick={() => onToggle(s._id, 'enabled')}
                          title="Click to disable schedule"
                          className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-bold text-[10px] hover:bg-emerald-500/25 transition-all cursor-pointer"
                        >
                          ✓ Enabled
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggle(s._id, 'enabled')}
                          title="Click to enable schedule"
                          className="px-2.5 py-1 rounded-full bg-slate-700/30 border border-slate-700 text-slate-400 font-bold text-[10px] hover:bg-slate-700/50 transition-all cursor-pointer"
                        >
                          Disabled
                        </button>
                      )}
                    </td>

                    {/* 8. Quick Controls: BOTH Start and Stop + secondary icons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Start Action */}
                        <button
                          type="button"
                          onClick={() => handleAction(s._id, 'START')}
                          disabled={isActionBusy || isRunning}
                          title={isRunning ? 'Already running' : 'Start instance now in cloud'}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                            isRunning
                              ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          }`}
                        >
                          {isActionBusy && executingAction === 'START' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span>Start</span>
                        </button>

                        {/* Stop Action */}
                        <button
                          type="button"
                          onClick={() => handleAction(s._id, 'STOP')}
                          disabled={isActionBusy || !isRunning}
                          title={!isRunning ? 'Already stopped' : 'Stop/deallocate instance now in cloud'}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                            !isRunning
                              ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700'
                              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                          }`}
                        >
                          {isActionBusy && executingAction === 'STOP' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Square className="w-3 h-3 fill-current" />
                          )}
                          <span>Stop</span>
                        </button>

                        {/* Pause / Resume */}
                        <button
                          type="button"
                          onClick={() => onToggle(s._id, 'isPaused')}
                          title={s.isPaused ? 'Resume schedule' : 'Pause schedule'}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            s.isPaused
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                              : 'bg-[#18233C] hover:bg-[#223152] border-[#1E293B] text-slate-300 hover:text-white'
                          }`}
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>

                        {/* View History */}
                        <button
                          type="button"
                          onClick={() => onViewHistory(s.serverName)}
                          title="View Execution History"
                          className="p-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-300 hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => onEdit(s)}
                          title="Edit Schedule"
                          className="p-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => onDelete(s._id, s.name)}
                          title="Delete Schedule"
                          className="p-1.5 rounded-lg bg-[#18233C] hover:bg-rose-500/20 border border-[#1E293B] hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
  );
}
