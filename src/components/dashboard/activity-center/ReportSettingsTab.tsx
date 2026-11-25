'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  RotateCw,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Mail,
  Shield,
  Layers,
  Send,
} from 'lucide-react';

export function ReportSettingsTab() {
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity-center/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/activity-center/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setToastMsg('Settings saved successfully!');
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmailAddr || !testEmailAddr.includes('@')) {
      alert('Please enter a valid recipient email to test.');
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch('/api/activity-center/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmailAddr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToastMsg(`Test email sent successfully to ${testEmailAddr}!`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert(`SMTP Test Failed: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-12 text-center text-slate-400 font-mono text-xs">
        <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
        <span>Loading report settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-emerald-400">
            &times;
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Master Control Switches Card */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>Master Automation & Ingestion Switches</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Tracking Master Switch */}
            <div className="p-4 rounded-xl bg-[#111A2E] border border-slate-700/80 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-sm text-white block">DevOps Activity Ingestion</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  When enabled, real events from AWS, Azure, SSH routines, and application modules are automatically tracked.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, trackingEnabled: !settings.trackingEnabled })}
                className="cursor-pointer shrink-0"
              >
                {settings.trackingEnabled ? (
                  <ToggleRight className="w-9 h-9 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-slate-600" />
                )}
              </button>
            </div>

            {/* Auto-Report Master Switch */}
            <div className="p-4 rounded-xl bg-[#111A2E] border border-slate-700/80 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-sm text-white block">Automated Evening Email Reports</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatically generates and delivers the comprehensive daily activity report at 6:30 PM IST.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, autoReportEnabled: !settings.autoReportEnabled })}
                className="cursor-pointer shrink-0"
              >
                {settings.autoReportEnabled ? (
                  <ToggleRight className="w-9 h-9 text-cyan-400" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Timing, Schedule & Timezone */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Daily Reporting Schedule & Timezone</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Timezone</label>
              <input
                type="text"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-cyan-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Report Delivery Time</label>
              <input
                type="text"
                value={settings.reportSendTime}
                onChange={(e) => setSettings({ ...settings, reportSendTime: e.target.value })}
                placeholder="18:30"
                className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white"
              />
              <span className="text-[10px] text-slate-400">Default: 18:30 (6:30 PM IST)</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Work Day Start</label>
              <input
                type="text"
                value={settings.workStartTime}
                onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                placeholder="09:30"
                className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Work Day End</label>
              <input
                type="text"
                value={settings.workEndTime}
                onChange={(e) => setSettings({ ...settings, workEndTime: e.target.value })}
                placeholder="18:30"
                className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white"
              />
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-xs font-semibold text-slate-300">Delivery Mode</label>
            <div className="flex items-center gap-6 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deliveryMode"
                  value="automatic"
                  checked={settings.deliveryMode === 'automatic'}
                  onChange={() => setSettings({ ...settings, deliveryMode: 'automatic' })}
                  className="text-cyan-500"
                />
                <span><strong>Mode 1: Automatic Delivery</strong> (Dispatches report at 6:30 PM without manual approval)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deliveryMode"
                  value="manual_approval"
                  checked={settings.deliveryMode === 'manual_approval'}
                  onChange={() => setSettings({ ...settings, deliveryMode: 'manual_approval' })}
                  className="text-cyan-500"
                />
                <span><strong>Mode 2: Manual Approval</strong> (Compiles report and waits for user confirmation)</span>
              </label>
            </div>
          </div>
        </div>

        {/* 3. Report Content Inclusions */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Report Sections to Include</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#111A2E] border border-slate-800">
              <input
                type="checkbox"
                checked={settings.includeAws}
                onChange={(e) => setSettings({ ...settings, includeAws: e.target.checked })}
                className="text-cyan-500 rounded"
              />
              <span>AWS Cloud Activities</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#111A2E] border border-slate-800">
              <input
                type="checkbox"
                checked={settings.includeAzure}
                onChange={(e) => setSettings({ ...settings, includeAzure: e.target.checked })}
                className="text-cyan-500 rounded"
              />
              <span>Azure Cloud Activities</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#111A2E] border border-slate-800">
              <input
                type="checkbox"
                checked={settings.includeOnPrem}
                onChange={(e) => setSettings({ ...settings, includeOnPrem: e.target.checked })}
                className="text-cyan-500 rounded"
              />
              <span>On-Premises / Server</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#111A2E] border border-slate-800">
              <input
                type="checkbox"
                checked={settings.includeApp}
                onChange={(e) => setSettings({ ...settings, includeApp: e.target.checked })}
                className="text-cyan-500 rounded"
              />
              <span>Application Modules</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#111A2E] border border-slate-800">
              <input
                type="checkbox"
                checked={settings.includeDeployments}
                onChange={(e) => setSettings({ ...settings, includeDeployments: e.target.checked })}
                className="text-cyan-500 rounded"
              />
              <span>Deployment History</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#111A2E] border border-slate-800">
              <input
                type="checkbox"
                checked={settings.includeTroubleshooting}
                onChange={(e) => setSettings({ ...settings, includeTroubleshooting: e.target.checked })}
                className="text-cyan-500 rounded"
              />
              <span>Troubleshooting Tasks</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#111A2E] border border-slate-800">
              <input
                type="checkbox"
                checked={settings.includePending}
                onChange={(e) => setSettings({ ...settings, includePending: e.target.checked })}
                className="text-cyan-500 rounded"
              />
              <span>Pending Tasks</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#111A2E] border border-slate-800">
              <input
                type="checkbox"
                checked={settings.attachPdf}
                onChange={(e) => setSettings({ ...settings, attachPdf: e.target.checked })}
                className="text-cyan-500 rounded"
              />
              <span>Include PDF Option</span>
            </label>
          </div>
        </div>

        {/* 4. SMTP / Email Provider Configuration */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Email Service / SMTP Configuration</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              (Leave blank to use project .env.local credentials)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">SMTP Host</label>
              <input
                type="text"
                value={settings.smtpHost || ''}
                onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">SMTP Port</label>
              <input
                type="number"
                value={settings.smtpPort || 587}
                onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Sender Display Name</label>
              <input
                type="text"
                value={settings.senderName || ''}
                onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                placeholder="MultiCloud DevOps Activity Center"
                className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Test SMTP Strip */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="email"
                value={testEmailAddr}
                onChange={(e) => setTestEmailAddr(e.target.value)}
                placeholder="Enter email to test SMTP connectivity..."
                className="w-full px-3 py-1.5 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
              />
              <button
                type="button"
                disabled={sendingTest}
                onClick={handleTestSmtp}
                className="px-3 py-1.5 rounded-xl bg-[#111A2E] hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50"
              >
                {sendingTest ? 'Sending...' : 'Test SMTP'}
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/25 disabled:opacity-50"
          >
            {saving ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
