'use client';

import React, { useState } from 'react';
import {
  Play,
  Square,
  Pause,
  RotateCw,
  Edit2,
  Trash2,
  Clock,
  History,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MoreVertical,
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

  const formatTime12h = (time24: string) => {
    if (!time24) return '--:--';
    const [h, m] = time24.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const mStr = m < 10 ? `0${m}` : m;
    return `${h12}:${mStr} ${suffix}`;
  };

  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return 'None';
    if (days.length === 7) return 'All Days';
    if (
      days.length === 5 &&
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every((d) => days.includes(d))
    ) {
      return 'Mon–Fri';
    }
    if (days.length === 2 && days.includes('Sat') && days.includes('Sun')) {
      return 'Weekends';
    }
    return days.join(', ');
  };

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

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl text-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse select-none">
          <thead>
            <tr className="border-b border-[#1E293B] bg-[#0E1628]/90 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              <th className="py-3.5 px-4">Server</th>
              <th className="py-3.5 px-3">Provider</th>
              <th className="py-3.5 px-3">Current State</th>
              <th className="py-3.5 px-3">Start Time</th>
              <th className="py-3.5 px-3">Stop Time</th>
              <th className="py-3.5 px-3">Days</th>
              <th className="py-3.5 px-3">Schedule</th>
              <th className="py-3.5 px-3">Next Action</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/60 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Loading schedules and live cloud states...</span>
                  </div>
                </td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
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

                return (
                  <tr
                    key={s._id}
                    className="hover:bg-[#141F36]/60 transition-colors group"
                  >
                    {/* Server Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100 text-xs tracking-tight">
                          {s.serverName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-400">
                            {s.resourceId}
                          </span>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-[10px] text-slate-400">{s.region}</span>
                        </div>
                      </div>
                    </td>

                    {/* Provider */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {s.provider === 'aws' ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FF9900]/10 border border-[#FF9900]/25 text-[#FF9900] font-semibold text-[11px]">
                            <AwsLogo className="w-3.5 h-3.5" />
                            <span>AWS</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0089D6]/10 border border-[#0089D6]/25 text-[#0089D6] font-semibold text-[11px]">
                            <AzureLogo className="w-3 h-3" />
                            <span>Azure</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Current State */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          isRunning
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isRunning ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <span>{s.currentState}</span>
                      </span>
                    </td>

                    {/* Start Time */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
                        {formatTime12h(s.startTime)}
                      </span>
                    </td>

                    {/* Stop Time */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-xs font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/30">
                        {formatTime12h(s.stopTime)}
                      </span>
                    </td>

                    {/* Days */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-200 font-medium bg-[#18233C] px-2 py-0.5 rounded text-[11px]">
                        {formatDays(s.daysOfWeek)}
                      </span>
                    </td>

                    {/* Schedule Status */}
                    <td className="py-3.5 px-3">
                      {s.isPaused ? (
                        <button
                          onClick={() => onToggle(s._id, 'isPaused')}
                          title="Click to resume schedule"
                          className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-[10px] hover:bg-amber-500/20 transition-colors"
                        >
                          ⏸ Paused
                        </button>
                      ) : s.enabled ? (
                        <button
                          onClick={() => onToggle(s._id, 'enabled')}
                          title="Click to disable schedule"
                          className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-[10px] hover:bg-emerald-500/20 transition-colors"
                        >
                          ✓ Enabled
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggle(s._id, 'enabled')}
                          title="Click to enable schedule"
                          className="px-2 py-0.5 rounded-full bg-slate-700/30 border border-slate-700 text-slate-400 font-semibold text-[10px] hover:bg-slate-700/50 transition-colors"
                        >
                          Disabled
                        </button>
                      )}
                    </td>

                    {/* Next Action */}
                    <td className="py-3.5 px-3">
                      {s.nextAction && s.nextAction !== 'NONE' ? (
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold text-[11px] ${
                              s.nextAction === 'START' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {s.nextAction}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
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
                        <span className="text-slate-500 text-[11px]">--</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Start Now */}
                        <button
                          onClick={() => handleAction(s._id, 'START')}
                          disabled={isActionBusy || isRunning}
                          title={isRunning ? 'Already running' : 'Start instance now in cloud'}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isRunning
                              ? 'opacity-30 cursor-not-allowed bg-transparent border-transparent text-slate-500'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {isActionBusy && executingAction === 'START' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                        </button>

                        {/* Stop Now */}
                        <button
                          onClick={() => handleAction(s._id, 'STOP')}
                          disabled={isActionBusy || !isRunning}
                          title={!isRunning ? 'Already stopped' : 'Stop/deallocate instance now in cloud'}
                          className={`p-1.5 rounded-lg border transition-all ${
                            !isRunning
                              ? 'opacity-30 cursor-not-allowed bg-transparent border-transparent text-slate-500'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          {isActionBusy && executingAction === 'STOP' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Square className="w-3.5 h-3.5 fill-current" />
                          )}
                        </button>

                        {/* Pause / Resume */}
                        <button
                          onClick={() => onToggle(s._id, 'isPaused')}
                          title={s.isPaused ? 'Resume schedule' : 'Pause schedule'}
                          className={`p-1.5 rounded-lg border transition-all ${
                            s.isPaused
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                              : 'bg-[#18233C] border-[#1E293B] text-slate-400 hover:text-white'
                          }`}
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>

                        {/* View History */}
                        <button
                          onClick={() => onViewHistory(s.serverName)}
                          title="View Execution History"
                          className="p-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onEdit(s)}
                          title="Edit Schedule"
                          className="p-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDelete(s._id, s.name)}
                          title="Delete Schedule"
                          className="p-1.5 rounded-lg bg-[#18233C] hover:bg-rose-500/20 border border-[#1E293B] hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors"
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
