'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  RefreshCw,
  Terminal,
  Server,
  UserCheck,
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  Save,
  Check,
  Info,
  Cloud,
  ChevronDown,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface ProofRecipient {
  id: string;
  email: string;
  name: string;
  role: string;
  enabled: boolean;
  addedOn: string;
}

interface ProofConfig {
  engineerName: string;
  engineerRole: string;
  autoDispatchOnAction: boolean;
  scheduledDispatchEnabled: boolean;
  scheduledTime: string; // e.g. "18:00"
  timezone: string;
  toolsMonitored: string[];
}

interface ProofLog {
  _id: string;
  auditId: string;
  engineerName: string;
  actionType: string;
  tool: string;
  summary: string;
  serverOrHost: string;
  commandsExecuted: string;
  resultOutcome: string;
  durationMinutes: number;
  recipients: string[];
  clockTimeIST: string;
  status: string;
  createdAt: string;
}

interface CloudAccountOption {
  id: string;
  accountName: string;
  provider: 'aws' | 'azure';
  subscriptionId?: string;
  accountId?: string;
}

const DEVOPS_TOOLS = [
  { id: 'Docker', label: 'Docker', desc: 'Container builds, restarts & OOM fixes' },
  { id: 'Kubernetes', label: 'Kubernetes', desc: 'Pod CrashLoop, rollouts & ingresses' },
  { id: 'Maven', label: 'Maven', desc: 'Build compiles, dependencies & test passes' },
  { id: 'Ansible', label: 'Ansible', desc: 'Playbook executions & host provisioning' },
  { id: 'Terraform', label: 'Terraform', desc: 'IaC plan, state lock release & apply' },
  { id: 'Jenkins', label: 'Jenkins', desc: 'CI/CD pipeline stage troubleshooting' },
  { id: 'SonarQube', label: 'SonarQube', desc: 'Quality Gate fixes & code coverage' },
  { id: 'Trivy', label: 'Trivy', desc: 'CVE vulnerability patches & upgrades' },
  { id: 'Server OS', label: 'Server OS', desc: 'vm01siva-mon CPU, RAM & Disk fixes' },
];

export function DevOpsProofTab() {
  // Live ticking clock state
  const [currentTime, setCurrentTime] = useState<{ ist: string; utc: string }>({
    ist: '',
    utc: '',
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime({
        ist: now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
        utc: now.toISOString().substring(11, 19) + ' UTC',
      });
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 12-Hour AM / PM Clock State for Scheduling
  const [clockHour, setClockHour] = useState('06');
  const [clockMinute, setClockMinute] = useState('00');
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>('PM');

  // Convert 24h string to 12h states
  const parse24hTo12h = (time24: string) => {
    if (!time24 || !time24.includes(':')) return;
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    setClockHour(String(h).padStart(2, '0'));
    setClockMinute(m);
    setClockPeriod(period);
  };

  // Convert 12h state to 24h string
  const get24hString = (hour: string, minute: string, period: 'AM' | 'PM') => {
    let h = parseInt(hour, 10);
    if (period === 'AM' && h === 12) h = 0;
    else if (period === 'PM' && h < 12) h += 12;
    return `${String(h).padStart(2, '0')}:${minute}`;
  };

  // Recipient state
  const [recipients, setRecipients] = useState<ProofRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('CTO');
  const [addingRecipient, setAddingRecipient] = useState(false);

  // Cloud Account Selection
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<'azure' | 'aws' | 'hybrid'>('azure');
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccountOption[]>([]);
  const [selectedCloudAccount, setSelectedCloudAccount] = useState('Azure Production Subscription (Visual Studio Enterprise)');
  const [targetServer, setTargetServer] = useState('vm01siva-mon (4.240.105.247) • Central India');

  // Config state
  const [config, setConfig] = useState<ProofConfig>({
    engineerName: 'Siva',
    engineerRole: 'Lead DevOps Engineer',
    autoDispatchOnAction: true,
    scheduledDispatchEnabled: true,
    scheduledTime: '18:00',
    timezone: 'Asia/Kolkata',
    toolsMonitored: ['docker', 'kubernetes', 'maven', 'ansible', 'terraform', 'jenkins', 'sonarqube', 'trivy', 'server'],
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Dispatch Action Form state
  const [selectedTool, setSelectedTool] = useState('Server OS');
  const [actionType, setActionType] = useState('Troubleshooting');
  const [summary, setSummary] = useState('Investigated high CPU utilization and Turbopack compiler memory leak on vm01siva-mon. Successfully normalized system load.');
  const [commandsExecuted, setCommandsExecuted] = useState('ps aux --sort=-%cpu | head -10\npm2 restart monitoring-app\ndocker system prune -af');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [resultOutcome, setResultOutcome] = useState('Normalized CPU from 100% to 14.2% within 15 mins with 0 downtime');
  const [sessionSource, setSessionSource] = useState('PuTTY SSH Terminal (siva@4.240.105.247)');
  const [isDispatching, setIsDispatching] = useState(false);
  const [fetchingServerHistory, setFetchingServerHistory] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<ProofLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Feedback toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch cloud accounts
  const fetchCloudAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/cloud-accounts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCloudAccounts(data);
          const first = data[0];
          setSelectedCloudAccount(first.accountName || first.subscriptionId || first.accountId || 'Cloud Account');
        }
      }
    } catch {}
  }, []);

  // Fetch recipients
  const fetchRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/recipients', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRecipients(data.recipients || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/proof-of-work/config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          if (data.config.scheduledTime) {
            parse24hTo12h(data.config.scheduledTime);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/dispatch', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipients();
    fetchConfig();
    fetchLogs();
    fetchCloudAccounts();
  }, [fetchRecipients, fetchConfig, fetchLogs, fetchCloudAccounts]);

  // LIVE SERVER PUTTY / SSH COMMANDS AUTO-FETCHER
  const handleFetchServerHistory = async () => {
    setFetchingServerHistory(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/fetch-server-history?limit=30', {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.commands) {
          setCommandsExecuted(data.commands);
        }
        if (data.detectedTool) {
          setSelectedTool(data.detectedTool);
          setSummary(`Live PuTTY/SSH session executed on ${data.detectedTool} on server ${data.server || 'vm01siva-mon'}.`);
        }
        if (data.sshSessions && data.sshSessions.length > 0) {
          setSessionSource(`PuTTY SSH: ${data.sshSessions[0]}`);
        }
        setResultOutcome('Commands completed and verified via server terminal with status 0.');
        showToast('Successfully fetched live commands from server ~/.bash_history & PuTTY session!', 'success');
      } else {
        showToast(data.error || 'Failed to fetch server bash history', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFetchingServerHistory(false);
    }
  };

  // Handle Add Recipient (Real Company Email)
  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAddingRecipient(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), name: newName.trim(), role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewEmail('');
        setNewName('');
        showToast(`Added ${data.recipient.email} to proof distribution!`, 'success');
        fetchRecipients();
      } else {
        showToast(data.error || 'Failed to add recipient', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setAddingRecipient(false);
    }
  };

  // Handle Clear All Recipients
  const handleClearAllRecipients = async () => {
    if (!confirm('Are you sure you want to clear all existing recipients so you can add fresh company emails?')) return;
    try {
      const res = await fetch('/api/notifications/proof-of-work/recipients?clearAll=true', {
        method: 'DELETE',
      });
      if (res.ok) {
        setRecipients([]);
        showToast('Cleared all recipients. Add your real company emails below.', 'info');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Toggle Recipient
  const handleToggleRecipient = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch('/api/notifications/proof-of-work/recipients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setRecipients((prev) =>
          prev.map((r) => (r.id === id ? { ...r, enabled: !currentEnabled } : r))
        );
        showToast(`Recipient status updated.`, 'info');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Delete Recipient
  const handleDeleteRecipient = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from leadership proof roster?`)) return;
    try {
      const res = await fetch(`/api/notifications/proof-of-work/recipients?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRecipients((prev) => prev.filter((r) => r.id !== id));
        showToast(`Removed ${email}`, 'info');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Save Config (With 12h AM/PM time)
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    const time24 = get24hString(clockHour, clockMinute, clockPeriod);
    const updatedConfig = { ...config, scheduledTime: time24 };
    try {
      const res = await fetch('/api/notifications/proof-of-work/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      if (res.ok) {
        setConfig(updatedConfig);
        showToast(`Clock schedule saved for ${clockHour}:${clockMinute} ${clockPeriod} IST (${time24})!`, 'success');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle Dispatch Proof
  const handleDispatchProof = async () => {
    setIsDispatching(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineerName: config.engineerName,
          engineerRole: config.engineerRole,
          actionType,
          tool: selectedTool,
          cloudProvider: selectedCloudProvider === 'azure' ? 'Microsoft Azure' : selectedCloudProvider === 'aws' ? 'Amazon Web Services (AWS)' : 'Hybrid / On-Premise',
          cloudAccount: selectedCloudAccount,
          serverOrHost: targetServer,
          sessionSource,
          summary,
          commandsExecuted,
          resultOutcome,
          durationMinutes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Proof of work audit email successfully dispatched!', 'success');
        fetchLogs();
      } else {
        showToast(data.error || 'Failed to dispatch proof email', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border backdrop-blur-md transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
              : toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
              : 'bg-cyan-950/90 text-cyan-200 border-cyan-500/50'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HERO WITH MULTI-CLOUD BRANDING & LIVE CLOCK BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A192F] via-[#0F172A] to-[#111A2E] border border-blue-500/30 p-5 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0078D4]/20 border border-[#0078D4]/40 text-[#60A5FA] text-xs font-mono font-bold uppercase">
                <AzureLogo className="w-3.5 h-3.5" />
                <span>Azure</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FF9900]/20 border border-[#FF9900]/40 text-[#F59E0B] text-xs font-mono font-bold uppercase">
                <AwsLogo className="w-3.5 h-3.5" />
                <span>AWS</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Verifiable Work Audit Dispatcher</span>
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Deployment &amp; Troubleshooting Proof Dispatcher
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Every action you perform via <strong>PuTTY</strong>, <strong>SSH terminal</strong>, or our console on <strong>Azure &amp; AWS</strong> is automatically captured with exact terminal commands and dispatched directly to your Company CTO, Management &amp; Personal Archive.
            </p>
          </div>

          {/* Digital Clock Box */}
          <div className="bg-[#090D1A]/95 border border-blue-500/40 rounded-xl p-4 shrink-0 text-right space-y-1 shadow-lg">
            <div className="text-[10px] font-mono uppercase text-blue-400 tracking-wider flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Live IST System Clock</span>
            </div>
            <div className="text-2xl md:text-3xl font-mono font-black text-white tracking-wider">
              {currentTime.ist || '12:00:00 PM'}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              UTC: <span className="text-cyan-400">{currentTime.utc || '00:00:00 UTC'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-COLUMN GRID: CLOCK SCHEDULER (WITH 12H AM/PM) & CTO RECIPIENTS ROSTER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: CLOCK & DISPATCH SCHEDULING (WITH AM / PM) */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Clock &amp; Dispatch Scheduling</h3>
                  <p className="text-[11px] text-slate-400">Configure auto-send triggers with 12-Hour AM / PM clock</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                12h AM/PM Clock
              </span>
            </div>

            <div className="space-y-3.5 pt-4 text-xs">
              {/* Engineer identity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Engineer Name</label>
                  <input
                    type="text"
                    value={config.engineerName}
                    onChange={(e) => setConfig({ ...config, engineerName: e.target.value })}
                    className="w-full bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-blue-500"
                    placeholder="Siva"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Role Title</label>
                  <input
                    type="text"
                    value={config.engineerRole}
                    onChange={(e) => setConfig({ ...config, engineerRole: e.target.value })}
                    className="w-full bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                    placeholder="Lead DevOps Engineer"
                  />
                </div>
              </div>

              {/* Instant Auto-Dispatch on Action Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#090E1A] border border-[#1E293B]">
                <div>
                  <div className="font-semibold text-white">Instant Dispatch on Action</div>
                  <div className="text-[11px] text-slate-400">
                    Immediately send proof email whenever deployment or troubleshooting completes.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, autoDispatchOnAction: !config.autoDispatchOnAction })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    config.autoDispatchOnAction ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      config.autoDispatchOnAction ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Scheduled Clock Dispatch With Full AM / PM Selector */}
              <div className="p-3.5 rounded-xl bg-[#090E1A] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Scheduled Daily Work Digest Clock</div>
                    <div className="text-[11px] text-slate-400">
                      Dispatches aggregated summary of all work done at your set shift time.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, scheduledDispatchEnabled: !config.scheduledDispatchEnabled })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      config.scheduledDispatchEnabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        config.scheduledDispatchEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {config.scheduledDispatchEnabled && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Clock Send Time (12-Hour AM / PM Format):</span>
                    </label>

                    {/* INTERACTIVE 12-HOUR AM / PM PICKER */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Hour */}
                      <select
                        value={clockHour}
                        onChange={(e) => setClockHour(e.target.value)}
                        className="bg-black border border-blue-500/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                          <option key={h} value={h}>{h} Hour</option>
                        ))}
                      </select>

                      <span className="text-white font-bold font-mono">:</span>

                      {/* Minute */}
                      <select
                        value={clockMinute}
                        onChange={(e) => setClockMinute(e.target.value)}
                        className="bg-black border border-blue-500/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                      >
                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                          <option key={m} value={m}>{m} Min</option>
                        ))}
                      </select>

                      {/* AM / PM Toggle Buttons */}
                      <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setClockPeriod('AM')}
                          className={`px-3 py-1.5 text-xs font-mono font-extrabold transition-all ${
                            clockPeriod === 'AM'
                              ? 'bg-blue-600 text-white'
                              : 'bg-black text-slate-400 hover:text-white'
                          }`}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setClockPeriod('PM')}
                          className={`px-3 py-1.5 text-xs font-mono font-extrabold transition-all ${
                            clockPeriod === 'PM'
                              ? 'bg-blue-600 text-white'
                              : 'bg-black text-slate-400 hover:text-white'
                          }`}
                        >
                          PM
                        </button>
                      </div>

                      <span className="text-[11px] font-mono text-cyan-400 ml-auto font-semibold">
                        {clockHour}:{clockMinute} {clockPeriod} IST ({get24hString(clockHour, clockMinute, clockPeriod)} hrs)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Saving Settings...' : 'Save Clock & Schedule Settings'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: REAL COMPANY CTO & LEADERSHIP RECIPIENTS (With Clear All) */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">CTO &amp; Leadership Recipients</h3>
                  <p className="text-[11px] text-slate-400">Add your real company leadership emails</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {recipients.length > 0 && (
                  <button
                    onClick={handleClearAllRecipients}
                    className="text-[10px] text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                    title="Remove all dummy emails and start fresh with real company emails"
                  >
                    Clear All
                  </button>
                )}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {recipients.filter((r) => r.enabled).length} Active
                </span>
              </div>
            </div>

            {/* Recipient List */}
            <div className="space-y-2 pt-3 max-h-[190px] overflow-y-auto pr-1">
              {loadingRecipients ? (
                <div className="text-center py-6 text-xs text-slate-500 font-mono">Loading recipients...</div>
              ) : recipients.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#090E1A] border border-dashed border-slate-700 text-center text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">No company emails configured yet.</div>
                  <div className="text-[11px]">Add your real Company CTO, Manager, or Team emails below.</div>
                </div>
              ) : (
                recipients.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#090E1A] border border-[#1E293B] text-xs hover:border-slate-700 transition-all"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{r.email}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0 font-medium">
                          {r.role}
                        </span>
                      </div>
                      {r.name && <div className="text-[10px] text-slate-400">{r.name}</div>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleRecipient(r.id, r.enabled)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          r.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {r.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => handleDeleteRecipient(r.id, r.email)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Real Company Email Form */}
          <form onSubmit={handleAddRecipient} className="pt-3 border-t border-slate-800 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter company email (e.g. cto@company.com)"
                className="sm:col-span-2 bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="bg-[#090E1A] border border-[#1E293B] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="CTO">CTO (Chief Technology Officer)</option>
                <option value="Engineering Manager">Engineering Manager</option>
                <option value="VP of Engineering">VP of Engineering</option>
                <option value="Lead Architect">Lead Architect</option>
                <option value="Personal Audit Trail">Personal Audit Archive</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contact Name (e.g. John Doe - Head of Engineering)"
                className="flex-1 bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={addingRecipient}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addingRecipient ? 'Adding...' : 'Add Real Recipient'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* CARD 3: CLOUD ACCOUNT & SERVER SELECTION (AWS & AZURE) */}
      <div className="bg-[#111A2E] border border-blue-500/30 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Cloud Account &amp; Server Infrastructure</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  AWS &amp; Azure
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select which cloud provider account and host server this troubleshooting was executed on
              </p>
            </div>
          </div>

          {/* Provider Toggle Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCloudProvider('azure');
                setSelectedCloudAccount('Azure Production Subscription (Visual Studio Enterprise)');
                setTargetServer('vm01siva-mon (4.240.105.247) • Central India');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedCloudProvider === 'azure'
                  ? 'bg-[#0078D4] text-white border-[#0078D4] shadow-md shadow-blue-500/30'
                  : 'bg-[#090E1A] text-slate-400 border-[#1E293B] hover:text-white'
              }`}
            >
              <AzureLogo className="w-3.5 h-3.5" />
              <span>Microsoft Azure</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCloudProvider('aws');
                setSelectedCloudAccount('AWS Production Account (590184029281 - VPC)');
                setTargetServer('i-09ab12cd34ef56789 (prod-api-cluster) • us-east-1');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedCloudProvider === 'aws'
                  ? 'bg-[#FF9900] text-black border-[#FF9900] shadow-md shadow-amber-500/30'
                  : 'bg-[#090E1A] text-slate-400 border-[#1E293B] hover:text-white'
              }`}
            >
              <AwsLogo className="w-3.5 h-3.5" />
              <span>Amazon AWS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCloudProvider('hybrid');
                setSelectedCloudAccount('On-Premise / Hybrid Infrastructure');
                setTargetServer('srv-onprem-dc1 (192.168.1.100)');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedCloudProvider === 'hybrid'
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'bg-[#090E1A] text-slate-400 border-[#1E293B] hover:text-white'
              }`}
            >
              <span>Hybrid / On-Prem</span>
            </button>
          </div>
        </div>

        {/* Cloud Account & Server Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">
              {selectedCloudProvider === 'azure' ? 'Azure Subscription / Tenant Account' : selectedCloudProvider === 'aws' ? 'AWS Account ID & Environment' : 'Infrastructure Account'}
            </label>
            <input
              type="text"
              value={selectedCloudAccount}
              onChange={(e) => setSelectedCloudAccount(e.target.value)}
              className="w-full bg-[#090E1A] border border-[#1E293B] rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              placeholder="e.g. Visual Studio Enterprise (Sub: sub-azure-siva)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">Target Host Server / Node Name &amp; IP</label>
            <input
              type="text"
              value={targetServer}
              onChange={(e) => setTargetServer(e.target.value)}
              className="w-full bg-[#090E1A] border border-[#1E293B] rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              placeholder="e.g. vm01siva-mon (4.240.105.247)"
            />
          </div>
        </div>
      </div>

      {/* CARD 4: LIVE PUTTY/SSH COMMAND AUTO-FETCHER & PROOF DISPATCH */}
      <div className="bg-[#111A2E] border border-indigo-500/30 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Record &amp; Dispatch Live DevOps Work Proof</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Instant Proof
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Auto-fetch real commands executed via PuTTY/SSH or select a DevOps tool below
              </p>
            </div>
          </div>

          {/* Action Type Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Action Type:</span>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="bg-[#090E1A] border border-[#1E293B] rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="Troubleshooting">Troubleshooting &amp; Fix</option>
              <option value="Deployment">Production Deployment</option>
              <option value="Security Patch">Security Patching</option>
              <option value="Configuration">Configuration Update</option>
              <option value="Disaster Recovery">Disaster Recovery</option>
            </select>
          </div>
        </div>

        {/* PROMINENT BUTTON: AUTO-FETCH PUTTY & SSH BASH COMMANDS */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0A1A2F] to-[#090E1A] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live PuTTY / SSH Server Command Auto-Sync</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Did you execute commands inside the server using <strong>PuTTY</strong> or SSH? Click here to auto-fetch your exact shell commands directly from the server!
            </p>
          </div>

          <button
            type="button"
            onClick={handleFetchServerHistory}
            disabled={fetchingServerHistory}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 shrink-0 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingServerHistory ? 'animate-spin' : ''}`} />
            <span>{fetchingServerHistory ? 'Fetching Server Commands...' : 'Auto-Fetch PuTTY & SSH History'}</span>
          </button>
        </div>

        {/* DevOps Tools Quick Selector Grid */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select DevOps Tool / Component:</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {DEVOPS_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedTool(tool.id)}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  selectedTool === tool.id
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-[#090E1A] text-slate-300 border-[#1E293B] hover:border-slate-600 hover:text-white'
                }`}
              >
                <span className="text-[11px] font-bold truncate max-w-full">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Details Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">Incident / Task Summary</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-[#090E1A] border border-[#1E293B] rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">Verification Outcome &amp; Impact</label>
            <textarea
              rows={3}
              value={resultOutcome}
              onChange={(e) => setResultOutcome(e.target.value)}
              className="w-full bg-[#090E1A] border border-[#1E293B] rounded-xl p-3 text-emerald-300 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Executed Commands Terminal Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="uppercase text-[10px]">Step-by-Step Executed Terminal Commands (PuTTY / SSH Proof)</span>
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">{sessionSource}</span>
          </div>
          <textarea
            rows={5}
            value={commandsExecuted}
            onChange={(e) => setCommandsExecuted(e.target.value)}
            className="w-full bg-black border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 leading-relaxed"
          />
        </div>

        {/* Dispatch Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Dispatches with clock stamp: <strong className="text-cyan-300 font-mono">{currentTime.ist}</strong> to{' '}
              <strong className="text-white">{recipients.filter((r) => r.enabled).length} recipients</strong>.
            </span>
          </div>

          <button
            onClick={handleDispatchProof}
            disabled={isDispatching}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isDispatching ? 'Dispatching Proof...' : 'Dispatch Proof of Work to CTO & Leadership'}</span>
          </button>
        </div>
      </div>

      {/* CARD 5: RECENT PROOF OF WORK AUDIT LOGS */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Dispatched Proof of Work Audit Logs</h3>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="space-y-2">
          {loadingLogs ? (
            <div className="text-center py-6 text-xs text-slate-500 font-mono">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#090E1A] border border-slate-800 text-center text-xs text-slate-400">
              No proof of work logs dispatched yet. Click "Dispatch Proof of Work" above to send your first audit report!
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log._id}
                className="p-3.5 rounded-xl bg-[#090E1A] border border-[#1E293B] space-y-1.5 hover:border-slate-700 transition-all text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-400">{log.auditId}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-bold text-[10px]">
                      {log.actionType} &bull; {log.tool}
                    </span>
                    <span className="text-slate-400 text-[11px]">by {log.engineerName}</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400">{log.clockTimeIST}</span>
                </div>
                <div className="text-slate-200">{log.summary}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Outcome: <strong className="text-emerald-400">{log.resultOutcome}</strong></span>
                  <span className="text-slate-500">Recipients: {log.recipients.length} &bull; Status: <strong className="text-emerald-400">{log.status}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
export default DevOpsProofTab;
