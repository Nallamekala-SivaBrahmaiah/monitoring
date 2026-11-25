'use client';

import React, { useState } from 'react';
import {
  Activity,
  Play,
  Pause,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Cloud,
  Server,
  Zap,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  FileText,
  Mail,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface OverviewProps {
  stats: any;
  settings: any;
  onSelectTab: (tab: string) => void;
  onRefresh: () => void;
  onToggleTracking: (enabled: boolean) => void;
  onToggleAutoReport: (enabled: boolean) => void;
}

export function ActivityCenterOverview({
  stats,
  settings,
  onSelectTab,
  onRefresh,
  onToggleTracking,
  onToggleAutoReport,
}: OverviewProps) {
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [dailyObjectiveInput, setDailyObjectiveInput] = useState(
    stats?.activeSession?.dailyObjective || ''
  );
  const [editingObjective, setEditingObjective] = useState(false);

  const activeSession = stats?.activeSession;
  const isWorking = activeSession?.status === 'active';
  const isPaused = activeSession?.status === 'paused';

  const handleSessionAction = async (action: 'start' | 'pause' | 'resume' | 'end') => {
    setSessionActionLoading(true);
    try {
      const res = await fetch('/api/activity-center/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sessionId: activeSession?._id,
          dailyObjective: dailyObjectiveInput,
          userName: 'DevOps Engineer',
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Session action error:', err);
    } finally {
      setSessionActionLoading(false);
    }
  };

  // Convert minutes into human readable string
  const activeMins = activeSession?.totalActiveMinutes || 0;
  const sessionHours = Math.floor(activeMins / 60);
  const sessionMins = activeMins % 60;
  const activeDurationStr = `${sessionHours.toString().padStart(2, '0')}h ${sessionMins
    .toString()
    .padStart(2, '0')}m`;

  const platformData = stats?.platformDistribution || [
    { name: 'AWS Cloud', value: 0, color: '#F59E0B' },
    { name: 'Azure Cloud', value: 0, color: '#0EA5E9' },
    { name: 'On-Premises', value: 0, color: '#10B981' },
    { name: 'Application Modules', value: 0, color: '#8B5CF6' },
  ];

  const hourlyTimeline = stats?.hourlyTimeline || [];

  return (
    <div className="space-y-6">
      {/* 1. Master Control & Live Work Session Header Bar */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Work Session Status Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Live Work Session Tracker
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isWorking
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                    : isPaused
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-700/30 text-slate-400 border border-slate-700'
                }`}
              >
                {isWorking ? 'Active Working' : isPaused ? 'Session Paused' : 'No Active Session'}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                (Timezone: {settings?.timezone || 'Asia/Kolkata'})
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Automatic activity correlation active. Operations executed across AWS, Azure, Linux servers, and application modules are automatically aggregated into your official daily work history.
            </p>
          </div>

          {/* Master ON / OFF Switches & Session Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Master Tracking Switch */}
            <div className="flex items-center gap-2 bg-[#111A2E] px-3.5 py-2 rounded-xl border border-slate-700/80">
              <span className="text-xs text-slate-300 font-semibold">Activity Tracking:</span>
              <button
                type="button"
                onClick={() => onToggleTracking(!settings?.trackingEnabled)}
                className="cursor-pointer transition"
                title={settings?.trackingEnabled ? 'Click to turn OFF activity tracking' : 'Click to turn ON activity tracking'}
              >
                {settings?.trackingEnabled ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                    <ToggleRight className="w-5 h-5 text-emerald-400" />
                    <span>ON</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-500 font-bold text-xs">
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                    <span>OFF</span>
                  </span>
                )}
              </button>
            </div>

            {/* Master Auto-Report Email Switch */}
            <div className="flex items-center gap-2 bg-[#111A2E] px-3.5 py-2 rounded-xl border border-slate-700/80">
              <span className="text-xs text-slate-300 font-semibold">6:30 PM Report:</span>
              <button
                type="button"
                onClick={() => onToggleAutoReport(!settings?.autoReportEnabled)}
                className="cursor-pointer transition"
                title={settings?.autoReportEnabled ? 'Click to turn OFF auto daily report' : 'Click to turn ON auto daily report'}
              >
                {settings?.autoReportEnabled ? (
                  <span className="flex items-center gap-1 text-cyan-400 font-bold text-xs">
                    <ToggleRight className="w-5 h-5 text-cyan-400" />
                    <span>ON</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-500 font-bold text-xs">
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                    <span>OFF</span>
                  </span>
                )}
              </button>
            </div>

            {/* Work Session Buttons */}
            <div className="flex items-center gap-2">
              {!isWorking && !isPaused && (
                <button
                  type="button"
                  disabled={sessionActionLoading}
                  onClick={() => handleSessionAction('start')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-600/25 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Work</span>
                </button>
              )}

              {isWorking && (
                <>
                  <button
                    type="button"
                    disabled={sessionActionLoading}
                    onClick={() => handleSessionAction('pause')}
                    className="px-3.5 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-amber-300 border border-amber-500/40 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>

                  <button
                    type="button"
                    disabled={sessionActionLoading}
                    onClick={() => handleSessionAction('end')}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-rose-600/25 flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>End Work</span>
                  </button>
                </>
              )}

              {isPaused && (
                <>
                  <button
                    type="button"
                    disabled={sessionActionLoading}
                    onClick={() => handleSessionAction('resume')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Resume</span>
                  </button>

                  <button
                    type="button"
                    disabled={sessionActionLoading}
                    onClick={() => handleSessionAction('end')}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-rose-600/25 flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>End Work</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Live Active Duration & Daily Objective Row */}
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Active Duration Timer Card */}
          <div className="p-3.5 rounded-xl bg-[#111A2E] border border-slate-700/80 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Active Work Duration:</span>
            <span className="text-sm font-mono font-extrabold text-cyan-300">
              {activeDurationStr}
            </span>
          </div>

          {/* Daily Objective */}
          <div className="md:col-span-2 p-3.5 rounded-xl bg-[#111A2E] border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-cyan-400 block">
                Today&apos;s Daily Objective:
              </span>
              {editingObjective ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={dailyObjectiveInput}
                    onChange={(e) => setDailyObjectiveInput(e.target.value)}
                    placeholder="e.g. Configure AWS EC2, deploy monitoring, fix Docker container..."
                    className="w-full px-2.5 py-1 bg-[#090F1D] border border-cyan-500/50 rounded-lg text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditingObjective(false);
                      handleSessionAction('start');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="text-slate-200 mt-0.5 truncate font-medium">
                  {dailyObjectiveInput || 'No specific objective set for today.'}
                </p>
              )}
            </div>
            {!editingObjective && (
              <button
                type="button"
                onClick={() => setEditingObjective(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer shrink-0 underline"
              >
                Edit Objective
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Twelve Database-Backed Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Today's Total Activities */}
        <div
          onClick={() => onSelectTab('live')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Total Activities
            </span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white">
            {stats?.totalActivities ?? 0}
          </div>
          <span className="text-[10px] text-cyan-400 font-semibold mt-1 block">Across Platforms →</span>
        </div>

        {/* Card 2: AWS Activities */}
        <div
          onClick={() => onSelectTab('aws')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              AWS Cloud
            </span>
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-300">
            {stats?.awsActivities ?? 0}
          </div>
          <span className="text-[10px] text-amber-400 font-semibold mt-1 block">EC2, S3, IAM →</span>
        </div>

        {/* Card 3: Azure Activities */}
        <div
          onClick={() => onSelectTab('azure')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Azure Cloud
            </span>
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-blue-300">
            {stats?.azureActivities ?? 0}
          </div>
          <span className="text-[10px] text-blue-400 font-semibold mt-1 block">VMs, VNets, NSGs →</span>
        </div>

        {/* Card 4: On-Premises Activities */}
        <div
          onClick={() => onSelectTab('onprem')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              On-Premises
            </span>
            <Server className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-300">
            {stats?.onPremActivities ?? 0}
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">SSH & Tool Install →</span>
        </div>

        {/* Card 5: Application Activities */}
        <div
          onClick={() => onSelectTab('app')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              App Modules
            </span>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-purple-300">
            {stats?.appActivities ?? 0}
          </div>
          <span className="text-[10px] text-purple-400 font-semibold mt-1 block">Jenkins, Docker, Alerts →</span>
        </div>

        {/* Card 6: Successful Deployments */}
        <div
          onClick={() => onSelectTab('deployments')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-teal-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Deployments
            </span>
            <Zap className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-teal-300">
            {stats?.successfulDeployments ?? 0}
          </div>
          <span className="text-[10px] text-teal-400 font-semibold mt-1 block">Success Runs →</span>
        </div>

        {/* Card 7: Failed Deployments */}
        <div
          onClick={() => onSelectTab('deployments')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Failed Deploys
            </span>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-400">
            {stats?.failedDeployments ?? 0}
          </div>
          <span className="text-[10px] text-rose-400 font-semibold mt-1 block">View Failures →</span>
        </div>

        {/* Card 8: Troubleshooting Tasks */}
        <div
          onClick={() => onSelectTab('troubleshooting')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Troubleshooting
            </span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-300">
            {stats?.troubleshootingTasks ?? 0}
          </div>
          <span className="text-[10px] text-amber-400 font-semibold mt-1 block">Logged Incidents →</span>
        </div>

        {/* Card 9: Resolved Issues */}
        <div
          onClick={() => onSelectTab('troubleshooting')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Resolved Issues
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
            {stats?.resolvedIssues ?? 0}
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">Fixed Today →</span>
        </div>

        {/* Card 10: Pending Tasks */}
        <div
          onClick={() => onSelectTab('troubleshooting')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Pending Tasks
            </span>
            <Clock className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-300">
            {stats?.pendingTasks ?? 0}
          </div>
          <span className="text-[10px] text-rose-400 font-semibold mt-1 block">In Progress →</span>
        </div>

        {/* Card 11: Active Work Session */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Work Session
            </span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-cyan-300 truncate">
            {activeSession ? (isWorking ? 'In Progress' : 'Paused') : 'Inactive'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
            {activeSession ? activeDurationStr : '00h 00m'}
          </span>
        </div>

        {/* Card 12: Last Report Status */}
        <div
          onClick={() => onSelectTab('reports')}
          className="bg-[#0D1526]/90 hover:bg-[#111A2E] border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Last Report
            </span>
            <Mail className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-purple-300 uppercase truncate">
            {stats?.lastReportStatus?.deliveryStatus || 'Draft Ready'}
          </div>
          <span className="text-[10px] text-purple-400 font-semibold mt-1 block">
            {stats?.lastReportStatus ? `${stats.lastReportStatus.recipientsCount} sent` : 'Generate →'}
          </span>
        </div>
      </div>

      {/* 3. Charts Row: Hourly Activity Timeline & Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Activity Chart */}
        <div className="lg:col-span-2 bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Today&apos;s Hourly Activity Timeline (IST)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribution of operations executed across your infrastructure by hour
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold bg-[#111A2E] px-2.5 py-1 rounded-lg border border-slate-700">
              {stats?.totalActivities ?? 0} Events Total
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A1224',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="aws" name="AWS" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="azure" name="Azure" stackId="a" fill="#0EA5E9" radius={[0, 0, 0, 0]} />
                <Bar dataKey="onprem" name="On-Prem" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="app" name="Application" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Distribution Pie Chart */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Platform Share</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of today&apos;s activity coverage
            </p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {platformData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A1224',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
            {platformData.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 truncate text-[11px]">{item.name}:</span>
                <span className="font-mono font-bold text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Recent Real Operations Stream */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Operations & Audit Stream</h3>
            <p className="text-xs text-slate-400">Actual operations logged directly from your cloud and server fleet</p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('live')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Activity Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#111A2E] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Resource / Server</th>
                <th className="py-2.5 px-3">Action Executed</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {(stats?.recentEvents || []).length > 0 ? (
                stats.recentEvents.map((evt: any) => (
                  <tr key={evt._id || evt.eventId} className="hover:bg-[#111A2E]/60 transition">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-cyan-300 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          evt.platform === 'aws'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : evt.platform === 'azure'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : evt.platform === 'onprem'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {evt.platform}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{evt.module}</td>
                    <td className="py-2.5 px-3 font-medium text-white max-w-[180px] truncate">
                      {evt.resourceName}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{evt.action}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          evt.status === 'success'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40'
                            : evt.status === 'failed'
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-500/40'
                            : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/40'
                        }`}
                      >
                        {evt.status === 'success' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : evt.status === 'failed' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{evt.status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {evt.source || 'Application Event'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No activity records logged yet today. Operations executed in AWS, Azure, Linux servers, or app modules will automatically show up here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
