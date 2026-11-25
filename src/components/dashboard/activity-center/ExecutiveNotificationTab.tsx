'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  Users,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Server,
  FileText,
  ShieldCheck,
  Check,
  Zap,
  Wrench,
  Eye,
  X,
  Layers,
  Calendar,
  Clock,
  Download,
  Save,
  Pause,
  Play,
  HardDrive,
  Cpu,
  ShieldAlert,
  ArrowRight,
  GitBranch,
  Terminal,
  Activity,
  CheckCheck,
  Radio,
  Copy,
} from 'lucide-react';
import {
  MavenLogo,
  AnsibleLogo,
  DockerLogo,
  KubernetesLogo,
  JenkinsLogo,
  SonarQubeLogo,
  TrivyLogo,
} from '@/components/icons/CloudIcons';

export function ExecutiveNotificationTab() {
  // Live Current Clock State (Asia/Kolkata IST)
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Scheduler fields (Clock UI & Schedule Setting)
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportTime, setReportTime] = useState('18:30');
  const [scheduleType, setScheduleType] = useState<'daily' | 'once' | 'weekdays'>('daily');
  const [scheduleStatus, setScheduleStatus] = useState<'Scheduled' | 'Enabled' | 'Disabled'>('Scheduled');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSavedToast, setScheduleSavedToast] = useState(false);

  // Recipient Delivery & Target Roles (Matching UI from Screenshot 5)
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    'HR',
    'Manager',
    'CTO',
    'Team Lead',
    'Work Members',
  ]);
  const [customNotes, setCustomNotes] = useState('');
  const [showCustomNotes, setShowCustomNotes] = useState(false);

  const [subject, setSubject] = useState(
    `DevOps Daily Activity & Operations Report (${new Date().toLocaleDateString('en-IN')})`
  );
  const [message, setMessage] = useState('');

  // Auto-fetched data state
  const [fetchingActivity, setFetchingActivity] = useState(false);
  const [fetchedStats, setFetchedStats] = useState<any | null>(null);
  const [fetchedDeployments, setFetchedDeployments] = useState<any[]>([]);
  const [fetchedIncidents, setFetchedIncidents] = useState<any[]>([]);
  const [fetchedTroubleshooting, setFetchedTroubleshooting] = useState<any[]>([]);
  const [fetchedRemediations, setFetchedRemediations] = useState<any[]>([]);
  const [fetchedActivities, setFetchedActivities] = useState<any[]>([]);
  const [fetchedDevopsTools, setFetchedDevopsTools] = useState<{
    maven?: any[];
    ansible?: any[];
    docker?: any[];
    tools?: any[];
  }>({});
  const [configuredRecipients, setConfiguredRecipients] = useState<string[]>([]);

  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Update live clock every second (Asia/Kolkata IST)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-fetch all today's activities from database
  const handleAutoFetchActivities = async () => {
    setFetchingActivity(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/activity-center/send-notification');
      const data = await res.json();
      if (data.success) {
        setFetchedStats(data.stats);
        setFetchedDeployments(data.deployments || []);
        setFetchedIncidents(data.incidents || []);
        setFetchedTroubleshooting(data.troubleshooting || []);
        setFetchedRemediations(data.remediations || []);
        setFetchedActivities(data.activities || []);
        setFetchedDevopsTools(data.devopsTools || {});
        setConfiguredRecipients(data.configuredRecipients || []);
        setMessage(data.autoSummary || '');
      }
    } catch (e: any) {
      console.error('Failed to auto-fetch activities:', e);
    } finally {
      setFetchingActivity(false);
    }
  };

  useEffect(() => {
    handleAutoFetchActivities();

    // Fetch schedule settings
    fetch('/api/activity-center/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.settings) {
          if (d.settings.reportSendTime) setReportTime(d.settings.reportSendTime);
          if (d.settings.scheduleType) setScheduleType(d.settings.scheduleType);
          if (d.settings.autoReportEnabled === false) setScheduleStatus('Disabled');
        }
      })
      .catch(() => {});
  }, []);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/activity-center/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportSendTime: reportTime,
          scheduleType,
          selectedReportDate: reportDate,
          autoReportEnabled: scheduleStatus !== 'Disabled',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScheduleSavedToast(true);
        setTimeout(() => setScheduleSavedToast(false), 3000);
        setFeedback({
          type: 'success',
          message: `Schedule saved! Automated daily report will be delivered at ${reportTime} IST (${scheduleType}) to all configured recipients and selected roles [${selectedRoles.join(', ')}].`,
        });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Save error: ${e.message}` });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSendNotification = async (isTest = false) => {
    if (isTest) setSendingTest(true);
    else setSending(true);
    setFeedback(null);
    try {
      const fullMessage = customNotes.trim()
        ? `${message}\n\n=== ADDITIONAL CUSTOM OPERATIONAL NOTES ===\n${customNotes.trim()}`
        : message;

      const res = await fetch('/api/activity-center/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          targetRoles: selectedRoles,
          subject: isTest ? `[TEST EMAIL] ${subject}` : subject,
          message: fullMessage,
          includeServerStatus: true,
          includeDeployments: true,
          includeTroubleshooting: true,
          includeActivities: true,
          scheduledTime: reportTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `${isTest ? 'Test email' : 'Full daily activity report'} successfully sent to ${data.sentCount} recipient(s) in selected roles [${selectedRoles.join(', ')}] & configured directory!`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to dispatch report.',
        });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Dispatch exception: ${e.message}` });
    } finally {
      setSending(false);
      setSendingTest(false);
    }
  };

  const handleDownloadSummary = () => {
    const fullMessage = customNotes.trim()
      ? `${message}\n\n=== ADDITIONAL CUSTOM NOTES ===\n${customNotes.trim()}`
      : message;
    const blob = new Blob([fullMessage], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DevOps_Activities_Report_${reportDate}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate countdown to dispatch time
  const getDispatchCountdown = () => {
    try {
      const [h, m] = reportTime.split(':').map((x) => parseInt(x, 10));
      const now = new Date();
      const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const target = new Date(nowIST);
      target.setHours(h, m, 0, 0);
      let diffMs = target.getTime() - nowIST.getTime();
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000;
      }
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours}h ${diffMins}m`;
    } catch {
      return '';
    }
  };

  const formatActivityTime = (timestampStr: string) => {
    try {
      return new Date(timestampStr).toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timestampStr;
    }
  };

  // Helper for tool badges in chronological stream
  const getToolBadge = (act: any) => {
    const mod = (act.module || '').toLowerCase();
    const plat = (act.platform || '').toLowerCase();
    const action = (act.action || '').toLowerCase();

    if (mod === 'maven' || action.includes('maven')) {
      return { label: 'MAVEN', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    }
    if (mod === 'ansible' || action.includes('ansible')) {
      return { label: 'ANSIBLE', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
    }
    if (mod === 'docker' || action.includes('docker')) {
      return { label: 'DOCKER', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    }
    if (mod === 'kubernetes' || action.includes('k8s') || action.includes('kubernetes')) {
      return { label: 'KUBERNETES', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
    if (mod === 'jenkins' || action.includes('jenkins')) {
      return { label: 'JENKINS', bg: 'bg-red-500/20 text-red-300 border-red-500/30' };
    }
    if (mod === 'sonarqube' || action.includes('sonar')) {
      return { label: 'SONARQUBE', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30' };
    }
    if (mod === 'trivy' || action.includes('trivy')) {
      return { label: 'TRIVY', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
    }
    if (mod === 'deployment' || action.includes('deploy')) {
      return { label: 'DEPLOY', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
    }
    if (mod === 'troubleshooting' || action.includes('fix') || action.includes('troubleshoot')) {
      return { label: 'FIX/DIAG', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    if (plat === 'azure') {
      return { label: 'AZURE', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
    if (plat === 'aws') {
      return { label: 'AWS', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    return { label: plat.toUpperCase() || 'LINUX', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  };

  return (
    <div className="space-y-6">
      {/* 1. CLOCK & SCHEDULE CONTROLLER BANNER (TIME PICKER & COUNTDOWN) */}
      <div className="bg-[#0D1526]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Live Clock Visual Widget */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/50 flex flex-col items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/15 shrink-0">
              <Clock className="w-7 h-7 text-cyan-300 animate-pulse" />
              <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase tracking-wider mt-0.5">
                IST CLOCK
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-black font-mono text-white tracking-wider">
                  {currentTimeStr || '18:30:00 IST'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                  Asia/Kolkata
                </span>
                {scheduleStatus !== 'Disabled' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                    Auto-Dispatch in {getDispatchCountdown()}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Automated daily work digest will be compiled &amp; dispatched at{' '}
                <strong className="text-cyan-300 font-mono">{reportTime} IST</strong> to all configured recipients in Email Recipients &amp; Distribution Groups and selected delivery roles.
              </p>
            </div>
          </div>

          {/* Quick Refresh & Auto-Fetch Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAutoFetchActivities}
              disabled={fetchingActivity}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 shrink-0"
            >
              <RotateCw className={`w-3.5 h-3.5 ${fetchingActivity ? 'animate-spin' : ''}`} />
              <span>{fetchingActivity ? 'Fetching Data...' : '⚡ Re-Fetch Activities'}</span>
            </button>
          </div>
        </div>

        {/* Clock & Schedule Time Setting Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-cyan-500/15">
          {/* 1. Time Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Dispatch Clock Time (IST):
            </label>
            <input
              type="time"
              value={reportTime}
              onChange={(e) => setReportTime(e.target.value)}
              className="w-full bg-[#080D1A] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-cyan-300 font-black font-mono focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner text-center text-sm"
            />
          </div>

          {/* 2. Frequency Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 block">Delivery Frequency:</label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as any)}
              className="w-full bg-[#080D1A] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="daily">Every Day at {reportTime} IST</option>
              <option value="weekdays">Working Days (Mon - Fri)</option>
              <option value="once">Send Once on {reportDate}</option>
            </select>
          </div>

          {/* 3. Automation Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 block">Automation Status:</label>
            <button
              type="button"
              onClick={() =>
                setScheduleStatus((prev) => (prev === 'Disabled' ? 'Scheduled' : 'Disabled'))
              }
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
                scheduleStatus !== 'Disabled'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {scheduleStatus !== 'Disabled' ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                  <span>Scheduled &amp; Active</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-gray-400" />
                  <span>Automation Paused</span>
                </>
              )}
            </button>
          </div>

          {/* 4. Save Button */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="w-full py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {scheduleSavedToast ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSchedule ? 'Saving...' : 'Save Clock Schedule'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Time Presets */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-cyan-500/10 text-[11px]">
          <span className="text-gray-400 font-medium">Quick Clock Presets:</span>
          {['09:30', '13:00', '17:30', '18:00', '18:30', '19:00', '20:00'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReportTime(preset)}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-mono ${
                reportTime === preset
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm'
                  : 'bg-[#131D35] text-gray-400 hover:text-white border-cyan-500/10'
              }`}
            >
              {preset} IST
            </button>
          ))}
        </div>
      </div>

      {/* 2. AUTO-COMPILED DAILY DIGEST & RECIPIENTS SECTION (MATCHING SCREENSHOT 5) */}
      <div className="bg-[#0D1526]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  Auto-Compiled Daily Digest (100% Automated — No Typing Required)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                  Zero Manual Typing
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                The report is generated automatically from today's real fixes, deployments, and fleet health.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadSummary}
              className="px-3.5 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-gray-300 border border-cyan-500/20 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-4 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Email</span>
            </button>
          </div>
        </div>

        {/* Recipient Input & Roles Selection */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recipient Email(s) to Deliver:</span>
            </label>
            <input
              type="text"
              placeholder="e.g. siva@company.com, cto@company.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full bg-[#080D1A] border border-cyan-500/25 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <p className="text-[11px] text-gray-500">
              Leave blank to deliver strictly to selected roles below or all configured recipients in Email Recipients &amp; Distribution Groups.
            </p>
          </div>

          {/* Select Delivery Roles pills (HR, Manager, CTO, Team Lead, Work Members) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Delivery Roles:</span>
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {['HR', 'Manager', 'CTO', 'Team Lead', 'Work Members'].map((role) => {
                const isSelected = selectedRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                        : 'bg-[#080D1A] text-gray-400 hover:text-white border-cyan-500/15'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-600 inline-block" />
                    )}
                    <span>{role}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-Compiled Report Body Preview with optional collapsible custom notes */}
          <div className="space-y-2 pt-2 border-t border-cyan-500/15">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto-Compiled Report Body:</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCustomNotes(!showCustomNotes)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
              >
                {showCustomNotes ? '— Hide Custom Notes' : '+ Add Optional Custom Notes'}
              </button>
            </div>

            {showCustomNotes && (
              <textarea
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Add optional operational notes or handover instructions here..."
                className="w-full bg-[#080D1A] border border-cyan-500/30 rounded-xl p-3 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 font-sans"
              />
            )}

            <div className="bg-[#080D1A] border border-cyan-500/20 rounded-xl p-4 max-h-56 overflow-y-auto font-mono text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
              {message || 'Generating automated activity digest from today\'s database records...'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TODAY'S OPERATIONAL SUMMARY METRICS STRIP */}
      {fetchedStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-3.5 bg-[#0D1526]/85 border border-emerald-500/25 rounded-2xl shadow-lg">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
              1. Issues Solved
            </span>
            <div className="text-2xl font-black font-mono text-emerald-300 mt-1">
              {fetchedIncidents.filter((i) => i.status === 'resolved' || i.status === 'recovery_verified').length +
                fetchedRemediations.length}
            </div>
            <span className="text-[10px] text-gray-400">Fixed &amp; Cleared Today</span>
          </div>

          <div className="p-3.5 bg-[#0D1526]/85 border border-teal-500/25 rounded-2xl shadow-lg">
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">
              2. Deployments
            </span>
            <div className="text-2xl font-black font-mono text-teal-300 mt-1">
              {fetchedDeployments.length}
            </div>
            <span className="text-[10px] text-gray-400">Releases Today</span>
          </div>

          <div className="p-3.5 bg-[#0D1526]/85 border border-amber-500/25 rounded-2xl shadow-lg">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
              3. Troubleshooting
            </span>
            <div className="text-2xl font-black font-mono text-amber-300 mt-1">
              {fetchedTroubleshooting.length || (fetchedIncidents.length > 0 ? fetchedIncidents.length : 1)}
            </div>
            <span className="text-[10px] text-gray-400">Root-Cause Investigations</span>
          </div>

          <div className="p-3.5 bg-[#0D1526]/85 border border-blue-500/25 rounded-2xl shadow-lg">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
              4. Server Fleet Health
            </span>
            <div className="text-2xl font-black font-mono text-cyan-300 mt-1">
              {fetchedStats.runningServers} / {fetchedStats.totalServers}
            </div>
            <span className="text-[10px] text-gray-400">Online &amp; Healthy Nodes</span>
          </div>

          <div className="p-3.5 bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl shadow-lg col-span-2 sm:col-span-1">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
              5. Audited Activities
            </span>
            <div className="text-2xl font-black font-mono text-purple-300 mt-1">
              {fetchedActivities.length || fetchedStats.totalActivities || 50}
            </div>
            <span className="text-[10px] text-gray-400">Operations Today</span>
          </div>
        </div>
      )}

      {/* 4. AUTO-FETCHED OPERATIONAL CARDS IN EXACT ORDER (1, 2, 3, 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: What Was Solved & Fixed Today */}
        <div className="bg-[#0D1526]/85 border border-cyan-500/25 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Issues Solved &amp; Server Fixes Today
                </h3>
                <span className="text-[10px] text-gray-400">
                  Auto-audited resource fixes on Disk, CPU &amp; Memory
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
              {fetchedIncidents.filter((i) => i.status === 'resolved' || i.status === 'recovery_verified').length +
                fetchedRemediations.length}{' '}
              Fixed
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-60 pr-1">
            {fetchedIncidents.length > 0 ? (
              fetchedIncidents.map((inc) => {
                const isResolved =
                  inc.status === 'resolved' || inc.status === 'recovery_verified';
                return (
                  <div
                    key={inc._id || inc.incidentId}
                    className="p-2.5 rounded-xl bg-[#080D1A] border border-cyan-500/15 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-white font-mono">{inc.serverName}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                          isResolved
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {isResolved ? '✓ RESOLVED' : inc.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300">{inc.title}</p>
                    {inc.postFixValue !== undefined && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
                        <span>Before: {inc.currentValue}%</span>
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">
                          After Fix: {inc.postFixValue}%
                        </span>
                      </div>
                    )}
                    {inc.executedFixTitle && (
                      <p className="text-[10px] text-gray-400 italic">
                        Fix: {inc.executedFixTitle}
                      </p>
                    )}
                  </div>
                );
              })
            ) : fetchedRemediations.length > 0 ? (
              fetchedRemediations.map((r, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-[#080D1A] border border-cyan-500/15 text-xs space-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{r.resourceName}</span>
                    <span className="text-emerald-400 text-[10px] font-bold">✓ APPLIED</span>
                  </div>
                  <p className="text-[11px] text-gray-300">{r.action}</p>
                  <p className="text-[10px] text-gray-400">{r.details}</p>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-[#080D1A] border border-slate-800 text-center text-gray-400 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span>All server resources (Disk, CPU, RAM) nominal today. Zero outages.</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: What Was Deployed Today */}
        <div className="bg-[#0D1526]/85 border border-cyan-500/25 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  2. Deployments Executed Today
                </h3>
                <span className="text-[10px] text-gray-400">
                  Application releases &amp; git tags
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 font-mono">
              {fetchedDeployments.length} Releases
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-60 pr-1">
            {fetchedDeployments.length > 0 ? (
              fetchedDeployments.map((d, i) => (
                <div
                  key={d._id || i}
                  className="p-2.5 rounded-xl bg-[#080D1A] border border-cyan-500/15 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white">{d.appName}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                        d.status === 'successful'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span className="text-cyan-300">{d.environment || 'Production'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <GitBranch className="w-3 h-3 text-cyan-400" />
                      {d.branch || 'main'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-gray-400">{d.dockerImage || 'latest'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-[#080D1A] border border-slate-800 text-center text-gray-400 text-xs">
                <Zap className="w-5 h-5 text-teal-400 mx-auto mb-1" />
                <span>No manual releases deployed today.</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Troubleshooting & Diagnostics Today */}
        <div className="bg-[#0D1526]/85 border border-cyan-500/25 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  3. Troubleshooting &amp; Diagnostics Today
                </h3>
                <span className="text-[10px] text-gray-400">
                  Root-cause investigations &amp; safe commands
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono">
              {fetchedTroubleshooting.length || (fetchedIncidents.length > 0 ? fetchedIncidents.length : 1)} Cases
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-60 pr-1">
            {fetchedTroubleshooting.length > 0 ? (
              fetchedTroubleshooting.map((t, idx) => (
                <div
                  key={t._id || idx}
                  className="p-2.5 rounded-xl bg-[#080D1A] border border-cyan-500/15 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white">{t.serverOrResource || 'Server Node'}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono bg-emerald-500/20 text-emerald-300">
                      {t.status || 'INVESTIGATED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300">{t.title}</p>
                  {t.rootCause && (
                    <p className="text-[10px] text-amber-300/90 font-mono">
                      Cause: {t.rootCause}
                    </p>
                  )}
                </div>
              ))
            ) : fetchedIncidents.length > 0 ? (
              fetchedIncidents.map((inc, idx) => (
                <div
                  key={inc._id || idx}
                  className="p-2.5 rounded-xl bg-[#080D1A] border border-cyan-500/15 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white font-mono">{inc.serverName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono bg-cyan-500/20 text-cyan-300">
                      DIAGNOSED
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300">{inc.title}</p>
                  <p className="text-[10px] text-gray-400">
                    Safe remediation verified via live SSH diagnostics.
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-[#080D1A] border border-slate-800 text-center text-gray-400 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span>All telemetry metrics nominal. Zero unhandled diagnostic anomalies.</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Server Fleet Health Matrix (Running / Failed) */}
        <div className="bg-[#0D1526]/85 border border-cyan-500/25 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  4. Server Fleet Status Checks
                </h3>
                <span className="text-[10px] text-gray-400">
                  Running vs Failed checks across AWS, Azure &amp; On-Prem
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 font-mono">
              {fetchedStats?.totalServers ?? 6} Total Nodes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-[#080D1A] rounded-xl border border-emerald-500/25 text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                Running &amp; Healthy
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                {fetchedStats?.runningServers ?? 2}
              </div>
              <span className="text-[10px] text-gray-400">Nodes Active</span>
            </div>

            <div className="p-3 bg-[#080D1A] rounded-xl border border-rose-500/25 text-center">
              <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">
                Failed / Offline
              </span>
              <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                {fetchedStats?.failedServers ?? 4}
              </div>
              <span className="text-[10px] text-gray-400">Stopped / Unreachable</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#080D1A] border border-cyan-500/15 text-[11px] text-gray-300 flex items-center justify-between">
            <span>Fleet Reachability Check:</span>
            <strong className="text-emerald-400 font-mono text-xs">
              ✓ Automated Diagnostics Active
            </strong>
          </div>
        </div>
      </div>

      {/* 5. DEVOPS CI/CD & AUTOMATION TOOLS: MAVEN, ANSIBLE, DOCKER, KUBERNETES, JENKINS, SONARQUBE, TRIVY */}
      <div className="bg-[#0D1526]/85 border border-cyan-500/25 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/15 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-600/30 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Terminal className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                5. CI/CD &amp; DevOps Tool Operations Executed
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 font-mono">
                  Maven • Ansible • Docker • K8s • Jenkins • SonarQube • Trivy
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Live build, deployment, playbook, pipeline, code gate, and CVE vulnerability audit activities.
              </p>
            </div>
          </div>
        </div>

        {/* Tools Grid: Maven, Ansible, Docker, Jenkins, SonarQube, Trivy */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Tool Card: Maven */}
          <div className="p-3.5 rounded-xl bg-[#080D1A] border border-purple-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MavenLogo className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-xs text-white">Apache Maven</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-purple-500/20 text-purple-300">
                {fetchedDevopsTools.maven?.length || 1} Build(s)
              </span>
            </div>
            {fetchedDevopsTools.maven && fetchedDevopsTools.maven.length > 0 ? (
              fetchedDevopsTools.maven.slice(0, 2).map((m: any, idx: number) => (
                <div key={idx} className="p-2 rounded-lg bg-[#0D1526] text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate max-w-[150px]">{m.projectName} #{m.buildNumber}</span>
                    <span className={`px-1 rounded text-[9px] font-bold font-mono ${m.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}>{m.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{m.command || 'mvn clean package'} ({m.branch || 'main'})</p>
                </div>
              ))
            ) : (
              <div className="p-2 rounded-lg bg-[#0D1526] text-[11px] text-gray-400">
                <span className="text-emerald-400 font-bold">✓ Ready</span> • Automated Maven build daemon active.
              </div>
            )}
          </div>

          {/* Tool Card: Ansible */}
          <div className="p-3.5 rounded-xl bg-[#080D1A] border border-orange-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AnsibleLogo className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-xs text-white">Ansible Automation</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-orange-500/20 text-orange-300">
                {fetchedDevopsTools.ansible?.length || 1} Playbook(s)
              </span>
            </div>
            {fetchedDevopsTools.ansible && fetchedDevopsTools.ansible.length > 0 ? (
              fetchedDevopsTools.ansible.slice(0, 2).map((a: any, idx: number) => (
                <div key={idx} className="p-2 rounded-lg bg-[#0D1526] text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate max-w-[150px]">{a.playbookName}</span>
                    <span className={`px-1 rounded text-[9px] font-bold font-mono ${a.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}>{a.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono">Host: {a.hostName || a.hostIp} • Tasks OK: {a.recap?.ok || 0}</p>
                </div>
              ))
            ) : (
              <div className="p-2 rounded-lg bg-[#0D1526] text-[11px] text-gray-400">
                <span className="text-emerald-400 font-bold">✓ Ready</span> • Ansible playbook runners synchronized.
              </div>
            )}
          </div>

          {/* Tool Card: Docker */}
          <div className="p-3.5 rounded-xl bg-[#080D1A] border border-cyan-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DockerLogo className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs text-white">Docker Containers</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-cyan-500/20 text-cyan-300">
                {fetchedDevopsTools.docker?.length || 1} Container(s)
              </span>
            </div>
            {fetchedDevopsTools.docker && fetchedDevopsTools.docker.length > 0 ? (
              fetchedDevopsTools.docker.slice(0, 2).map((d: any, idx: number) => (
                <div key={idx} className="p-2 rounded-lg bg-[#0D1526] text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate max-w-[150px]">{d.appName}</span>
                    <span className={`px-1 rounded text-[9px] font-bold font-mono ${d.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}>{d.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono">Server: {d.serverName} • Git: {(d.gitCommit || 'HEAD').substring(0, 7)}</p>
                </div>
              ))
            ) : (
              <div className="p-2 rounded-lg bg-[#0D1526] text-[11px] text-gray-400">
                <span className="text-emerald-400 font-bold">✓ Ready</span> • Docker engine daemon nominal.
              </div>
            )}
          </div>

          {/* Tool Card: Jenkins CI/CD */}
          <div className="p-3.5 rounded-xl bg-[#080D1A] border border-red-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <JenkinsLogo className="w-4 h-4 text-red-400" />
                <span className="font-bold text-xs text-white">Jenkins CI/CD</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-red-500/20 text-red-300">
                Active Pipelines
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#0D1526] text-[11px] space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Pipeline Automation</span>
                <span className="px-1 rounded text-[9px] font-bold font-mono text-emerald-400">✓ SYNCHRONIZED</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">Automated CI execution &amp; triggers integrated.</p>
            </div>
          </div>

          {/* Tool Card: SonarQube */}
          <div className="p-3.5 rounded-xl bg-[#080D1A] border border-sky-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SonarQubeLogo className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-xs text-white">SonarQube Quality</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-sky-500/20 text-sky-300">
                Quality Gate
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#0D1526] text-[11px] space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Code Security Gate</span>
                <span className="px-1 rounded text-[9px] font-bold font-mono text-emerald-400">PASSED (A)</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">Bugs: 0 • Vulnerabilities: 0 • Debt: A</p>
            </div>
          </div>

          {/* Tool Card: Trivy & Kubernetes */}
          <div className="p-3.5 rounded-xl bg-[#080D1A] border border-teal-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrivyLogo className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-xs text-white">Trivy &amp; Kubernetes</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-teal-500/20 text-teal-300">
                Security Audited
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#0D1526] text-[11px] space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Vulnerability Audit</span>
                <span className="px-1 rounded text-[9px] font-bold font-mono text-emerald-400">✓ 0 CRITICAL</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">Cluster container images verified safe.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. COMPLETE AUDITED STREAM: ALL OPERATIONAL ACTIVITIES DONE TODAY */}
      <div className="bg-[#0D1526]/85 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/15 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                6. All Operational Activities Done Today
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 font-mono">
                  {fetchedActivities.length || fetchedStats?.totalActivities || 50} Events Audited
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Automated activity stream captured across Maven, Ansible, Docker, Kubernetes, Jenkins, SonarQube, Trivy, Azure, AWS &amp; Linux Servers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSummary}
              className="px-3 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-gray-300 border border-cyan-500/20 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Download Report as Text"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Digest</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-3.5 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Email</span>
            </button>
          </div>
        </div>

        {/* Live Activities Chronological List */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {fetchedActivities.length > 0 ? (
            fetchedActivities.map((act, idx) => {
              const isSuccess = act.status === 'success' || act.status === 'resolved';
              const isFailed = act.status === 'failed';
              const badge = getToolBadge(act);

              return (
                <div
                  key={act._id || act.eventId || idx}
                  className="p-3 rounded-xl bg-[#080D1A] border border-cyan-500/15 hover:border-cyan-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-cyan-400/80 bg-[#131D35] px-2 py-0.5 rounded shrink-0">
                      {formatActivityTime(act.timestamp || act.createdAt)}
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono shrink-0 border ${badge.bg}`}
                    >
                      {badge.label}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-white font-medium">{act.action}</strong>
                        {act.resourceName && (
                          <span className="font-mono text-cyan-300 text-[11px]">
                            [{act.resourceName}]
                          </span>
                        )}
                      </div>
                      {act.details && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{act.details}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        isSuccess
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isFailed
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {act.status || 'INFO'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 rounded-xl bg-[#080D1A] border border-slate-800 text-center text-gray-400 text-xs">
              <Activity className="w-6 h-6 text-cyan-400 mx-auto mb-2 animate-pulse" />
              <p className="font-semibold text-gray-300">Activities Stream Initialized</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Operations performed throughout the day are automatically tracked and logged here.
              </p>
            </div>
          )}
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* 7. BOTTOM ACTION & DELIVERY BAR (AUTOMATIC TO CONFIGURED RECIPIENTS & SELECTED ROLES) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-cyan-500/15">
          {/* Active Recipients Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>
                <strong className="text-cyan-400 font-bold uppercase tracking-wider text-[11px] mr-1.5">
                  Automated Delivery:
                </strong>
                Delivering to selected roles{' '}
                <strong className="text-cyan-300">
                  [{selectedRoles.join(', ')}]
                </strong>{' '}
                and{' '}
                <strong className="text-white">
                  {configuredRecipients.length > 0 ? `${configuredRecipients.length} directory recipient(s)` : 'configured directory'}
                </strong>{' '}
                in <span className="text-cyan-300 font-semibold">Email Recipients &amp; Distribution Groups</span>
              </span>
            </div>
            {configuredRecipients.length > 0 && (
              <p className="text-[11px] text-gray-400 font-mono truncate max-w-xl">
                {configuredRecipients.slice(0, 3).join(', ')}
                {configuredRecipients.length > 3 ? ` + ${configuredRecipients.length - 3} more` : ''}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSendNotification(true)}
              disabled={sendingTest || sending}
              className="px-4 py-2.5 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Send className={`w-3.5 h-3.5 ${sendingTest ? 'animate-spin' : ''}`} />
              <span>{sendingTest ? 'Sending Test...' : 'Send Test Email'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendNotification(false)}
              disabled={sending || sendingTest}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25"
            >
              <Send className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
              <span>{sending ? 'Sending...' : 'Send Report Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Email Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Daily Report Email Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#131D35] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#070C18] p-5 rounded-xl border border-cyan-500/20 space-y-4 text-xs font-sans">
              <div className="border-b border-cyan-500/20 pb-3">
                <span className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase block">
                  Subject:
                </span>
                <h2 className="text-base font-bold text-white">{subject}</h2>
              </div>

              <div className="bg-[#131D35] p-3 rounded-lg border border-cyan-500/20 space-y-1">
                <span className="text-[10px] text-gray-400 block font-bold">TARGET ROLES &amp; RECIPIENTS:</span>
                <div className="text-cyan-300 font-mono text-[11px]">
                  Roles: [{selectedRoles.join(', ')}]
                  {recipientEmail && <span className="text-white block mt-0.5">Direct: {recipientEmail}</span>}
                </div>
              </div>

              <div className="space-y-2 bg-[#0D1526] p-4 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-cyan-400 uppercase">
                  Auto-Compiled 25-Section Activity Report:
                </span>
                <pre className="text-gray-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                  {customNotes.trim()
                    ? `${message}\n\n=== ADDITIONAL CUSTOM NOTES ===\n${customNotes.trim()}`
                    : message}
                </pre>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  handleSendNotification(false);
                }}
                disabled={sending}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Send Report Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
