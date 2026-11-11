'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Clock,
  Play,
  Square,
  Plus,
  RotateCw,
  Server,
  AlertTriangle,
  History,
  ListFilter,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { ServerSchedulesTable } from '@/components/dashboard/schedules/ServerSchedulesTable';
import { ScheduleExecutionHistoryTable } from '@/components/dashboard/schedules/ScheduleExecutionHistoryTable';
import { CreateScheduleModal } from '@/components/dashboard/schedules/CreateScheduleModal';
import { IServerScheduleData } from '@/models/ServerSchedule';

interface ScheduleSummary {
  totalScheduledServers: number;
  currentlyRunning: number;
  currentlyStopped: number;
  nextScheduledAction: string;
  schedulingFailures: number;
}

export default function ServerSchedulingPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedules' | 'history'>('schedules');
  const [historyFilterServer, setHistoryFilterServer] = useState('');

  const [schedules, setSchedules] = useState<IServerScheduleData[]>([]);
  const [summary, setSummary] = useState<ScheduleSummary>({
    totalScheduledServers: 0,
    currentlyRunning: 0,
    currentlyStopped: 0,
    nextScheduledAction: 'No upcoming action',
    schedulingFailures: 0,
  });

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<IServerScheduleData | null>(null);

  // Delete confirm dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Status banner / toast
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      if (res.ok && data.schedules) {
        setSchedules(data.schedules);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(fetchSchedules, 20000); // 20s auto-sync
    return () => clearInterval(interval);
  }, []);

  const handleEdit = (schedule: IServerScheduleData) => {
    setEditingSchedule(schedule);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSchedule(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/schedules/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          message: `Schedule "${deleteConfirm.name}" removed successfully.`,
        });
        fetchSchedules();
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Deletion failed',
      });
    } finally {
      setDeleteConfirm(null);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleToggle = async (id: string, field: 'enabled' | 'isPaused') => {
    try {
      const res = await fetch(`/api/schedules/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchSchedules();
      }
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  };

  const handleExecuteNow = async (id: string, action: 'START' | 'STOP') => {
    try {
      const res = await fetch(`/api/schedules/${id}/execute-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          message: data.message || `Server ${action} command sent successfully.`,
        });
        fetchSchedules();
      } else {
        throw new Error(data.error || 'Action failed');
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || `Failed to execute ${action}`,
      });
    } finally {
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleViewHistory = (serverName: string) => {
    setHistoryFilterServer(serverName);
    setActiveTab('history');
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 space-y-6 w-full">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Server Scheduling &amp; Automation
                </h1>
                <p className="text-xs text-slate-400">
                  Automate startup and deallocation for AWS EC2 instances &amp; Azure VMs based on working hours.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchSchedules}
                disabled={loading}
                title="Refresh live cloud schedules"
                className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 transition-colors"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              </button>

              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Schedule</span>
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {actionFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{actionFeedback.message}</span>
              </div>
              <button
                onClick={() => setActionFeedback(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <section aria-label="Scheduling Summary Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {/* Total Scheduled Servers */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Total Scheduled Servers
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white font-mono">
                    {summary.totalScheduledServers}
                  </span>
                  <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full">
                    Active Fleet
                  </span>
                </div>
              </div>

              {/* Currently Running */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Currently Running
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-emerald-400 font-mono">
                    {summary.currentlyRunning}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online
                  </span>
                </div>
              </div>

              {/* Currently Stopped */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Currently Stopped
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-rose-400 font-mono">
                    {summary.currentlyStopped}
                  </span>
                  <span className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full">
                    Deallocated
                  </span>
                </div>
              </div>

              {/* Next Scheduled Action */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Next Scheduled Action
                </span>
                <div className="mt-2">
                  <span
                    className="text-xs font-semibold text-slate-200 truncate block"
                    title={summary.nextScheduledAction}
                  >
                    {summary.nextScheduledAction}
                  </span>
                </div>
              </div>

              {/* Scheduling Failures */}
              <div className="p-4 rounded-2xl bg-[#111A2E] border border-[#1E293B] shadow-md flex flex-col justify-between col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  Scheduling Failures
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      summary.schedulingFailures > 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {summary.schedulingFailures}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      summary.schedulingFailures > 0
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {summary.schedulingFailures > 0 ? 'Action Needed' : 'Zero Errors'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-1 select-none">
            <button
              onClick={() => setActiveTab('schedules')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-semibold text-xs transition-colors border-b-2 ${
                activeTab === 'schedules'
                  ? 'border-blue-500 text-white bg-[#111A2E]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarClock className="w-4 h-4 text-blue-400" />
              <span>Configured Schedules ({schedules.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-semibold text-xs transition-colors border-b-2 ${
                activeTab === 'history'
                  ? 'border-blue-500 text-white bg-[#111A2E]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4 text-indigo-400" />
              <span>Execution History &amp; Audit Logs</span>
            </button>
          </div>

          {/* Tab Views */}
          {activeTab === 'schedules' ? (
            <ServerSchedulesTable
              schedules={schedules}
              loading={loading}
              onRefresh={fetchSchedules}
              onEdit={handleEdit}
              onDelete={(id, name) => setDeleteConfirm({ id, name })}
              onToggle={handleToggle}
              onExecuteNow={handleExecuteNow}
              onViewHistory={handleViewHistory}
            />
          ) : (
            <ScheduleExecutionHistoryTable
              initialServerFilter={historyFilterServer}
              onHistoryCleared={fetchSchedules}
            />
          )}
        </main>
      </div>

      {/* Create / Edit Modal */}
      <CreateScheduleModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSchedule(null);
        }}
        onSaved={fetchSchedules}
        editSchedule={editingSchedule}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111A2E] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Server Schedule?</h3>
                <p className="text-xs text-slate-400">
                  This will permanently remove the automated schedule for &quot;{deleteConfirm.name}&quot;. The underlying cloud instance will remain untouched.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-[#18233C] text-slate-300 font-semibold text-xs hover:bg-[#202E4E] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-600/30"
              >
                Yes, Delete Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
