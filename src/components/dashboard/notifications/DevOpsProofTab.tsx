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
} from 'lucide-react';

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
  scheduledTime: string;
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

const DEVOPS_TOOLS = [
  { id: 'Docker', label: 'Docker', icon: '🐳', desc: 'Container builds, restarts & OOM fixes' },
  { id: 'Kubernetes', label: 'Kubernetes', icon: '☸️', desc: 'Pod CrashLoop, rollouts & ingresses' },
  { id: 'Maven', label: 'Maven', icon: '☕', desc: 'Build compiles, dependencies & test passes' },
  { id: 'Ansible', label: 'Ansible', icon: '⚡', desc: 'Playbook executions & host provisioning' },
  { id: 'Terraform', label: 'Terraform', icon: '🏗️', desc: 'IaC plan, state lock release & apply' },
  { id: 'Jenkins', label: 'Jenkins', icon: '👨‍💼', desc: 'CI/CD pipeline stage troubleshooting' },
  { id: 'SonarQube', label: 'SonarQube', icon: '🔍', desc: 'Quality Gate fixes & code coverage' },
  { id: 'Trivy', label: 'Trivy', icon: '🛡️', desc: 'CVE vulnerability patches & upgrades' },
  { id: 'Server OS', label: 'Server OS', icon: '🖥️', desc: 'vm01siva-mon CPU, RAM & Disk fixes' },
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

  // Recipient state
  const [recipients, setRecipients] = useState<ProofRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('CTO');
  const [addingRecipient, setAddingRecipient] = useState(false);

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
  const [isDispatching, setIsDispatching] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<ProofLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Feedback toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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
        if (data.config) setConfig(data.config);
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
  }, [fetchRecipients, fetchConfig, fetchLogs]);

  // Handle Add Recipient
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

  // Handle Save Config
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showToast('Clock & Schedule preferences saved successfully!', 'success');
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
          summary,
          serverOrHost: 'vm01siva-mon (4.240.105.247)',
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

  // Select tool handler that updates template text
  const handleSelectTool = (tool: string) => {
    setSelectedTool(tool);
    if (tool === 'Docker') {
      setSummary('Docker container memory spike investigated. Reconfigured OOM limits and restarted auth microservice.');
      setCommandsExecuted('docker logs --tail 50 auth-microservice-prod\ndocker restart auth-microservice-prod\ndocker stats --no-stream');
      setResultOutcome('Container memory normalized from 1.0 GB to 240 MB. 100% healthy.');
    } else if (tool === 'Kubernetes') {
      setSummary('Kubernetes Pod CrashLoopBackOff resolved. Updated missing environment secrets and triggered rollout.');
      setCommandsExecuted('kubectl logs payment-gateway-7f89bc9-4k2x1 -n production --previous\nkubectl rollout undo deployment/payment-gateway -n production\nkubectl get pods -n production');
      setResultOutcome('Pod restored to 1/1 Running state. Ingress traffic responding 200 OK.');
    } else if (tool === 'Maven') {
      setSummary('Maven compilation and integration test failures debugged and passed.');
      setCommandsExecuted('mvn clean test -Dtest=TokenAuthTest\nmvn package -DskipTests=false');
      setResultOutcome('Build compiled with SUCCESS status in 42 seconds.');
    } else if (tool === 'Terraform') {
      setSummary('Terraform state lock acquisition failure resolved in Azure resource group.');
      setCommandsExecuted('terraform force-unlock b8c49e71-82d1-4203-9bb5-4f227a192801\nterraform plan\nterraform apply -auto-approve');
      setResultOutcome('State unlocked. Infrastructure apply completed with 0 errors.');
    } else if (tool === 'Ansible') {
      setSummary('Ansible server provisioning playbook executed and verified across nodes.');
      setCommandsExecuted('ansible-playbook -i inventory.ini site.yml --limit vm01siva-mon');
      setResultOutcome('Playbook completed with 12 changed, 0 failed, 0 unreachable.');
    } else if (tool === 'Jenkins') {
      setSummary('Jenkins CI/CD deployment pipeline stage 3 failure recovered.');
      setCommandsExecuted('ssh siva@4.240.105.247 "systemctl status jenkins"\npm2 restart monitoring-app');
      setResultOutcome('Pipeline re-run finished with Green build status.');
    } else if (tool === 'SonarQube') {
      setSummary('SonarQube Quality Gate blockers remediated and code coverage brought above threshold.');
      setCommandsExecuted('npm run test:coverage\nnpm run sonar:scan');
      setResultOutcome('Quality Gate: PASSED (Blocker bugs: 0, Coverage: 84.2%).');
    } else if (tool === 'Trivy') {
      setSummary('Trivy container CVE vulnerability patched in base Ubuntu image.');
      setCommandsExecuted('apt-get update && apt-get install --only-upgrade libssl3 -y\ntrivy image multicloud-monitoring:latest');
      setResultOutcome('Critical CVE-2026-24836 patched. 0 Critical vulnerabilities.');
    } else {
      setSummary('Server CPU utilization spike investigated. Cleared stuck Turbopack processes and cleaned disk cache.');
      setCommandsExecuted('ps aux --sort=-%cpu | head -10\npm2 restart monitoring-app\nrm -rf /home/siva/monitoring/.next/cache');
      setResultOutcome('CPU load dropped to 14.2%. vm01siva-mon stable.');
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

      {/* TOP HERO & LIVE CLOCK BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#0F172A] to-[#0D1526] border border-indigo-500/30 p-5 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Verifiable DevOps Work &amp; Troubleshooting Proof</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Deployment &amp; Troubleshooting Proof Dispatcher
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Never let anyone take credit for your hard work or question your technical skills again. Automatically or on a set clock schedule, dispatch timestamped proof of your deployments and troubleshooting directly to company CTO, Leadership, and your personal audit trail.
            </p>
          </div>

          {/* Digital Clock Box */}
          <div className="bg-[#090D1A]/90 border border-indigo-500/40 rounded-xl p-4 shrink-0 text-right space-y-1 shadow-lg">
            <div className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>Live System Clock (IST)</span>
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

      {/* 2-COLUMN GRID: CLOCK SCHEDULER & LEADERSHIP ROSTER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: CLOCK & AUTOMATED SCHEDULE PREFERENCES */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Clock &amp; Dispatch Scheduling</h3>
                  <p className="text-[11px] text-slate-400">Configure auto-send triggers and daily clock handover</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Clock Engine
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
                    className="w-full bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-indigo-500"
                    placeholder="Siva"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Role Title</label>
                  <input
                    type="text"
                    value={config.engineerRole}
                    onChange={(e) => setConfig({ ...config, engineerRole: e.target.value })}
                    className="w-full bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="Lead DevOps Engineer"
                  />
                </div>
              </div>

              {/* Instant Auto-Dispatch on Action Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#090E1A] border border-[#1E293B]">
                <div>
                  <div className="font-semibold text-white">Instant Dispatch on Action</div>
                  <div className="text-[11px] text-slate-400">
                    Immediately send proof email whenever deployment/troubleshooting completes.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, autoDispatchOnAction: !config.autoDispatchOnAction })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    config.autoDispatchOnAction ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      config.autoDispatchOnAction ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Scheduled Clock Dispatch */}
              <div className="p-3 rounded-xl bg-[#090E1A] border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Scheduled Daily Work Digest Clock</div>
                    <div className="text-[11px] text-slate-400">
                      Dispatches aggregated summary of all work done at the set clock time.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, scheduledDispatchEnabled: !config.scheduledDispatchEnabled })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      config.scheduledDispatchEnabled ? 'bg-indigo-600' : 'bg-slate-700'
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
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] text-slate-300 font-medium">Clock Send Time:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={config.scheduledTime}
                        onChange={(e) => setConfig({ ...config, scheduledTime: e.target.value })}
                        className="bg-black border border-indigo-500/50 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400 font-mono">IST (18:00)</span>
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Saving Settings...' : 'Save Clock & Schedule Settings'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: LEADERSHIP & CTO RECIPIENTS ROSTER */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">CTO &amp; Leadership Recipients</h3>
                  <p className="text-[11px] text-slate-400">Emails that will receive your verifiable proof of work</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {recipients.filter((r) => r.enabled).length} Active
              </span>
            </div>

            {/* Recipient List */}
            <div className="space-y-2 pt-3 max-h-[190px] overflow-y-auto pr-1">
              {loadingRecipients ? (
                <div className="text-center py-6 text-xs text-slate-500 font-mono">Loading recipients...</div>
              ) : recipients.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#090E1A] border border-slate-800 text-center text-xs text-slate-400">
                  No leadership recipients configured. Add CTO or Manager below.
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
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 font-medium">
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

          {/* Add Recipient Form */}
          <form onSubmit={handleAddRecipient} className="pt-3 border-t border-slate-800 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="cto@company.com"
                className="sm:col-span-2 bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="bg-[#090E1A] border border-[#1E293B] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="CTO">CTO</option>
                <option value="Engineering Manager">Engineering Manager</option>
                <option value="VP of Engineering">VP of Engineering</option>
                <option value="Lead Architect">Lead Architect</option>
                <option value="Personal Audit Trail">Personal Audit Copy</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Recipient Name (Optional: John Doe - CTO)"
                className="flex-1 bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={addingRecipient}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addingRecipient ? 'Adding...' : 'Add Recipient'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* CARD 3: INTERACTIVE ACTION — DISPATCH LIVE DEVOPS WORK PROOF */}
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
                Select a tool, view the executed troubleshooting steps, and dispatch verified proof with clock stamp
              </p>
            </div>
          </div>

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
                onClick={() => handleSelectTool(tool.id)}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  selectedTool === tool.id
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30 scale-105'
                    : 'bg-[#090E1A] text-slate-300 border-[#1E293B] hover:border-slate-600 hover:text-white'
                }`}
              >
                <span className="text-lg">{tool.icon}</span>
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
              className="w-full bg-[#090E1A] border border-[#1E293B] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
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
              <span className="uppercase text-[10px]">Step-by-Step Executed Terminal Commands (Proof)</span>
            </span>
            <span className="text-slate-500">Host: vm01siva-mon (4.240.105.247)</span>
          </div>
          <textarea
            rows={4}
            value={commandsExecuted}
            onChange={(e) => setCommandsExecuted(e.target.value)}
            className="w-full bg-black border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 leading-relaxed"
          />
        </div>

        {/* Dispatch Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Dispatches with clock stamp: <strong className="text-cyan-300 font-mono">{currentTime.ist}</strong> to{' '}
              <strong className="text-white">{recipients.filter((r) => r.enabled).length} recipients</strong>.
            </span>
          </div>

          <button
            onClick={handleDispatchProof}
            disabled={isDispatching}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isDispatching ? 'Dispatching Proof...' : 'Dispatch Proof of Work to CTO & Leadership'}</span>
          </button>
        </div>
      </div>

      {/* CARD 4: RECENT PROOF OF WORK AUDIT LOGS */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
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
                    <span className="font-mono font-bold text-indigo-400">{log.auditId}</span>
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
