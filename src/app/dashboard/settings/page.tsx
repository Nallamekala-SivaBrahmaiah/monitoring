'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  BellRing,
  Cpu,
  Layers,
  HardDrive,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Mail,
  Send,
  Lock,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useMonitoring } from '@/context/MonitoringContext';

interface ThresholdSettings {
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
  defaultSeverity: 'warning' | 'critical' | 'info';
  criticalEscalationThreshold: number;
  reminderIntervalMinutes: number;
  enabled: boolean;
}

export default function SettingsPage() {
  const { triggerRefresh } = useMonitoring();
  const [thresholds, setThresholds] = useState<ThresholdSettings>({
    cpuThreshold: 70,
    memoryThreshold: 70,
    diskThreshold: 70,
    defaultSeverity: 'warning',
    criticalEscalationThreshold: 90,
    reminderIntervalMinutes: 60,
    enabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestEmailStatus(null);
    try {
      const res = await fetch('/api/notifications/test-email', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailStatus('Test alert email sent successfully to nallasiva552@gmail.com!');
      } else {
        setTestEmailStatus(`Delivery error: ${data.error || 'Failed to send'}`);
      }
    } catch (e: any) {
      setTestEmailStatus(`Connection error: ${e.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  // Load current thresholds
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings/thresholds');
        if (res.ok) {
          const data = await res.json();
          setThresholds((prev) => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Save updated thresholds
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch('/api/settings/thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thresholds),
      });

      if (res.ok) {
        const data = await res.json();
        setThresholds(data);
        setSaveSuccess(true);
        triggerRefresh();
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const errData = await res.json();
        setSaveError(errData.error || 'Failed to save thresholds');
      }
    } catch (e: any) {
      setSaveError(e.message || 'Connection error while saving');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default 70% thresholds
  const handleReset = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch('/api/settings/thresholds', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setThresholds(data);
        setSaveSuccess(true);
        triggerRefresh();
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (e: any) {
      setSaveError(e.message || 'Failed to reset defaults');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6 max-w-4xl">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/" className="hover:text-blue-400 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-white">Settings</span>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-400" />
              <span>Platform Configuration & Alert Policies</span>
            </h2>
          </div>

          {/* Alert Thresholds Card */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-6 space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1E293B]">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-400" />
                  <span>Real-Time Alert Thresholds (CPU, Memory, Disk)</span>
                </h3>
                <p className="text-slate-400 mt-0.5">
                  Automatic alerts are generated whenever live collected utilization on AWS, Azure, or Linux servers reaches or exceeds these threshold values.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-2 cursor-pointer">
                  <span>Engine:</span>
                  <input
                    type="checkbox"
                    checked={thresholds.enabled}
                    onChange={(e) => setThresholds({ ...thresholds, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-[#0D1526] border-[#1E293B]"
                  />
                  <span className={thresholds.enabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {thresholds.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            {/* Threshold Sliders & Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CPU Threshold */}
              <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>CPU Threshold</span>
                  </span>
                  <span className="font-mono font-bold text-sm text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    &gt;= {thresholds.cpuThreshold}%
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Trigger alert when guest or host CPU utilization exceeds threshold.
                </p>

                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min="10"
                    max="99"
                    step="1"
                    value={thresholds.cpuThreshold}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, cpuThreshold: parseInt(e.target.value) || 70 })
                    }
                    className="w-full accent-amber-500 bg-[#18233C] h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>10%</span>
                    <span className="text-amber-400 font-semibold">70% (Default)</span>
                    <span>99%</span>
                  </div>
                </div>
              </div>

              {/* Memory Threshold */}
              <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span>Memory Threshold</span>
                  </span>
                  <span className="font-mono font-bold text-sm text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                    &gt;= {thresholds.memoryThreshold}%
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Trigger alert when RAM utilization exceeds configured capacity.
                </p>

                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min="10"
                    max="99"
                    step="1"
                    value={thresholds.memoryThreshold}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, memoryThreshold: parseInt(e.target.value) || 70 })
                    }
                    className="w-full accent-sky-500 bg-[#18233C] h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>10%</span>
                    <span className="text-sky-400 font-semibold">70% (Default)</span>
                    <span>99%</span>
                  </div>
                </div>
              </div>

              {/* Disk Threshold */}
              <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-purple-400" />
                    <span>Disk Threshold</span>
                  </span>
                  <span className="font-mono font-bold text-sm text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                    &gt;= {thresholds.diskThreshold}%
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Evaluated across every mounted partition/filesystem (e.g. /, /var).
                </p>

                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min="10"
                    max="99"
                    step="1"
                    value={thresholds.diskThreshold}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, diskThreshold: parseInt(e.target.value) || 70 })
                    }
                    className="w-full accent-purple-500 bg-[#18233C] h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>10%</span>
                    <span className="text-purple-400 font-semibold">70% (Default)</span>
                    <span>99%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Severity & Policy Preferences */}
            <div className="pt-4 border-t border-[#1E293B] grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Default Threshold Severity
                </label>
                <select
                  value={thresholds.defaultSeverity}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      defaultSeverity: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200"
                >
                  <option value="warning">Warning (Recommended)</option>
                  <option value="critical">Critical</option>
                  <option value="info">Info</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Severity assigned when metric reaches or exceeds 70%.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Critical Escalation Threshold
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="75"
                    max="100"
                    value={thresholds.criticalEscalationThreshold}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        criticalEscalationThreshold: parseInt(e.target.value) || 90,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono"
                  />
                  <span className="text-slate-400 font-mono">%</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Automatically escalate severity to Critical if metric reaches this point.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Notification Reminder Interval
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={thresholds.reminderIntervalMinutes}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        reminderIntervalMinutes: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono"
                  />
                  <span className="text-slate-400">mins</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Prevents duplicate repeated notifications for the same active alert.
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#1E293B] flex items-center justify-between">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0D1526] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset to Defaults (70%)</span>
              </button>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Thresholds saved successfully!</span>
                  </span>
                )}
                {saveError && (
                  <span className="text-xs font-medium text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{saveError}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Alert Thresholds'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gmail Email Alert Configuration Card */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-6 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Gmail SMTP Alert Configuration</h3>
                  <p className="text-slate-400">
                    Automated email delivery whenever CPU, memory, or disk usage exceeds 70%.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-blue-400" />
                <span>{testingEmail ? 'Sending Test...' : 'Send Test Alert Email'}</span>
              </button>
            </div>

            {testEmailStatus && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  testEmailStatus.includes('successfully')
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-800 text-rose-300'
                }`}
              >
                {testEmailStatus.includes('successfully') ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testEmailStatus}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">SMTP Server Host &amp; Port:</span>
                <div className="p-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono">
                  smtp.gmail.com:587 (STARTTLS)
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Authenticated Gmail User:</span>
                <div className="p-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono">
                  nallasiva552@gmail.com
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Primary Alert Recipient:</span>
                <div className="p-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono">
                  nallasiva552@gmail.com
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">App Password Security:</span>
                <div className="p-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-emerald-400 flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Configured securely in environment (GMAIL_APP_PASSWORD)</span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <Link
                href="/dashboard/notifications"
                className="text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Manage Multiple Recipients &amp; Channel Preferences</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>

          {/* General Platform Settings */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-6 space-y-5 text-xs">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Data Collection Interval
              </h3>
              <p className="text-slate-400 mb-3">
                Frequency at which telemetry metrics are sampled from AWS CloudWatch, Azure Monitor, and SSH Servers.
              </p>
              <select
                aria-label="Metrics sampling interval"
                className="px-3 py-1.5 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200"
              >
                <option>Every 30 seconds (High Resolution Real-Time)</option>
                <option>Every 60 seconds</option>
                <option>Every 5 minutes</option>
              </select>
            </div>

            <div className="pt-4 border-t border-[#1E293B]">
              <h3 className="text-sm font-semibold text-white mb-1">
                API Base URL
              </h3>
              <p className="text-slate-400 mb-3">
                Local Next.js API Base URL for live telemetry ingestion and reconciliation.
              </p>
              <input
                type="text"
                defaultValue="http://localhost:3000"
                className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
