'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Play,
  RotateCw,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Edit2,
  Save,
  Trash2,
  X,
  HardDrive,
  Cpu,
  Activity,
  Layers,
  Sparkles,
  Server,
  Check,
} from 'lucide-react';

export interface RunbookItem {
  id: string;
  name: string;
  category: 'Disk' | 'CPU' | 'Memory' | 'Kubernetes' | 'Network';
  triggerCondition: string;
  scriptSnippet: string;
  timeoutSeconds: number;
  autoTriggerEnabled: boolean;
  successRate: string;
  lastExecuted?: string;
}

const INITIAL_RUNBOOKS: RunbookItem[] = [
  {
    id: 'rb-disk-vacuum',
    name: 'Clean Disk Logs & Docker Temp Prune',
    category: 'Disk',
    triggerCondition: 'Disk Usage >= 85%',
    scriptSnippet: 'journalctl --vacuum-time=2d && rm -rf /var/log/*.gz && docker system prune -f --volumes',
    timeoutSeconds: 45,
    autoTriggerEnabled: true,
    successRate: '98.2%',
    lastExecuted: '18 mins ago',
  },
  {
    id: 'rb-cpu-kill',
    name: 'Kill Runaway High-CPU Zombie Processes',
    category: 'CPU',
    triggerCondition: 'CPU Utilization >= 92% sustained for 3m',
    scriptSnippet: "ps -eo pid,ppid,%cpu,cmd --sort=-%cpu | head -n 6 | awk 'NR>1 {print $1}' | xargs -r kill -15",
    timeoutSeconds: 30,
    autoTriggerEnabled: true,
    successRate: '95.6%',
    lastExecuted: '1 hour ago',
  },
  {
    id: 'rb-mem-flush',
    name: 'Memory Cache Buffer Flush & Safe Reclaim',
    category: 'Memory',
    triggerCondition: 'Memory RAM >= 90% (OOM hazard)',
    scriptSnippet: 'sync && sysctl -w vm.drop_caches=3 && echo "PageCache freed"',
    timeoutSeconds: 20,
    autoTriggerEnabled: false,
    successRate: '99.4%',
    lastExecuted: 'Yesterday',
  },
  {
    id: 'rb-k8s-rollout',
    name: 'Rolling Restart of Crashed Microservice Pods',
    category: 'Kubernetes',
    triggerCondition: 'Pod CrashLoopBackOff restarts > 3',
    scriptSnippet: 'kubectl rollout restart deployment/backend-api -n production --timeout=90s',
    timeoutSeconds: 90,
    autoTriggerEnabled: true,
    successRate: '92.0%',
    lastExecuted: '4 hours ago',
  },
  {
    id: 'rb-nginx-reload',
    name: 'Reverse-Proxy Reload & Cache Purge',
    category: 'Network',
    triggerCondition: 'HTTP 502 Bad Gateway / upstream timeout',
    scriptSnippet: 'nginx -t && systemctl reload nginx && rm -rf /var/cache/nginx/*',
    timeoutSeconds: 25,
    autoTriggerEnabled: false,
    successRate: '97.8%',
    lastExecuted: '3 days ago',
  },
];

export function SelfHealingRemediationTab() {
  const [runbooks, setRunbooks] = useState<RunbookItem[]>(INITIAL_RUNBOOKS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Execution modal state
  const [executingRunbook, setExecutingRunbook] = useState<RunbookItem | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [executionDone, setExecutionDone] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RunbookItem>>({});

  // Add runbook modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRunbook, setNewRunbook] = useState<Partial<RunbookItem>>({
    name: '',
    category: 'Disk',
    triggerCondition: '',
    scriptSnippet: '',
    timeoutSeconds: 30,
    autoTriggerEnabled: true,
  });

  const filteredRunbooks = runbooks.filter((rb) => {
    if (categoryFilter !== 'all' && rb.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = rb.name.toLowerCase().includes(q);
      const matchTrigger = rb.triggerCondition.toLowerCase().includes(q);
      const matchScript = rb.scriptSnippet.toLowerCase().includes(q);
      if (!matchName && !matchTrigger && !matchScript) return false;
    }
    return true;
  });

  const handleStartExecution = async (rb: RunbookItem) => {
    setExecutingRunbook(rb);
    setExecutionDone(false);
    setConsoleLogs([
      `[SRE-ORCHESTRATOR] Initializing runbook target environment...`,
      `[HOST-AUTH] Handshake verified via SSH/Agent telemetry.`,
      `[TRIGGER] Trigger condition matched: "${rb.triggerCondition}"`,
      `[EXEC] $ ${rb.scriptSnippet}`,
    ]);

    await new Promise((r) => setTimeout(r, 800));
    setConsoleLogs((prev) => [
      ...prev,
      `[STDOUT] Scanning active file descriptors and memory allocations...`,
      `[STDOUT] Target resources identified. Reclaiming locks...`,
    ]);

    await new Promise((r) => setTimeout(r, 900));
    setConsoleLogs((prev) => [
      ...prev,
      `[STDOUT] Purge successful: Freed 24.8 GB capacity.`,
      `[TELEMETRY] CPU/RAM dropped below threshold (healthy state restored).`,
      `[EXIT CODE] 0 (Operation Completed Successfully)`,
    ]);
    setExecutionDone(true);
  };

  const handleToggleAutoTrigger = (id: string) => {
    setRunbooks((prev) =>
      prev.map((rb) => (rb.id === id ? { ...rb, autoTriggerEnabled: !rb.autoTriggerEnabled } : rb))
    );
  };

  const handleRemove = (id: string) => {
    setRunbooks((prev) => prev.filter((rb) => rb.id !== id));
  };

  const handleStartEdit = (rb: RunbookItem) => {
    setEditingId(rb.id);
    setEditForm({ ...rb });
  };

  const handleSaveEdit = (id: string) => {
    setRunbooks((prev) =>
      prev.map((rb) => (rb.id === id ? ({ ...rb, ...editForm } as RunbookItem) : rb))
    );
    setEditingId(null);
  };

  const handleCreateRunbook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRunbook.name) return;
    const item: RunbookItem = {
      id: `rb-${Date.now()}`,
      name: newRunbook.name,
      category: newRunbook.category as any || 'Disk',
      triggerCondition: newRunbook.triggerCondition || 'Manual Trigger',
      scriptSnippet: newRunbook.scriptSnippet || 'echo "Self healing executed"',
      timeoutSeconds: Number(newRunbook.timeoutSeconds) || 30,
      autoTriggerEnabled: !!newRunbook.autoTriggerEnabled,
      successRate: '100%',
      lastExecuted: 'Just now',
    };
    setRunbooks([item, ...runbooks]);
    setShowAddModal(false);
    setNewRunbook({
      name: '',
      category: 'Disk',
      triggerCondition: '',
      scriptSnippet: '',
      timeoutSeconds: 30,
      autoTriggerEnabled: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <span>Self-Healing & Auto-Remediation Playbooks</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic recovery playbooks that automatically resolve threshold breaches with zero human intervention.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Runbook</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[240px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter playbooks by name, trigger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#070C18] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-[#070C18] border border-slate-800 rounded-xl p-1 text-xs">
            {(['all', 'Disk', 'CPU', 'Memory', 'Kubernetes', 'Network'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  categoryFilter === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filteredRunbooks.length} Active Runbooks
        </div>
      </div>

      {/* Runbooks List */}
      <div className="space-y-4">
        {filteredRunbooks.map((rb) => {
          const isEditing = editingId === rb.id;

          return (
            <div
              key={rb.id}
              className="bg-[#090F1E] rounded-2xl border border-slate-800 hover:border-slate-700 transition-all duration-200 p-4 sm:p-5 shadow-xl"
            >
              {isEditing ? (
                /* Edit Form Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Remediation Playbook: {rb.name}</span>
                    </span>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Playbook Title</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Category</label>
                      <select
                        value={editForm.category || 'Disk'}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                        className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="Disk">Disk Storage</option>
                        <option value="CPU">CPU Utilization</option>
                        <option value="Memory">RAM Memory</option>
                        <option value="Kubernetes">Kubernetes Pods</option>
                        <option value="Network">Network / Gateway</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Trigger Condition</label>
                      <input
                        type="text"
                        value={editForm.triggerCondition || ''}
                        onChange={(e) => setEditForm({ ...editForm, triggerCondition: e.target.value })}
                        className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 text-xs">Automation Script / Command Snippet</label>
                    <textarea
                      rows={2}
                      value={editForm.scriptSnippet || ''}
                      onChange={(e) => setEditForm({ ...editForm, scriptSnippet: e.target.value })}
                      className="w-full bg-[#070C18] border border-slate-700 rounded-xl p-3 text-xs text-emerald-400 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(rb.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Playbook</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                        {rb.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Trigger: <strong className="text-amber-300 font-semibold">{rb.triggerCondition}</strong>
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        Success Rate: {rb.successRate}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white">{rb.name}</h4>

                    {/* Script Snippet Box */}
                    <div className="bg-[#070C18] border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-emerald-400 flex items-center justify-between overflow-x-auto">
                      <code>$ {rb.scriptSnippet}</code>
                      <span className="text-[10px] text-slate-500 uppercase shrink-0 ml-3">
                        Timeout: {rb.timeoutSeconds}s
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <button
                      onClick={() => handleStartExecution(rb)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/30 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Now</span>
                    </button>

                    <button
                      onClick={() => handleStartEdit(rb)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleRemove(rb.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Terminal Execution Modal */}
      {executingRunbook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#070C18] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  Autonomous Triage Console: {executingRunbook.name}
                </h3>
              </div>
              {executionDone && (
                <button
                  onClick={() => setExecutingRunbook(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Simulated Live Terminal */}
            <div className="bg-black/90 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-2 min-h-[220px] max-h-[340px] overflow-y-auto">
              {consoleLogs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.includes('EXIT CODE')
                      ? 'text-emerald-400 font-bold'
                      : log.includes('EXEC')
                      ? 'text-cyan-300'
                      : log.includes('TRIGGER')
                      ? 'text-amber-300'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))}
              {!executionDone && (
                <div className="flex items-center gap-2 text-slate-500 italic">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Executing autonomous pipeline...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                {executionDone ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Target host recovered to healthy baseline!
                  </span>
                ) : (
                  <span>Autonomous SRE agent in progress...</span>
                )}
              </span>

              {executionDone && (
                <button
                  onClick={() => setExecutingRunbook(null)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md"
                >
                  Close Console
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Runbook Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#090F1E] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Create New Self-Healing Playbook</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRunbook} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Playbook Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flush Redis Inactive Keys"
                  value={newRunbook.name || ''}
                  onChange={(e) => setNewRunbook({ ...newRunbook, name: e.target.value })}
                  className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Category</label>
                  <select
                    value={newRunbook.category || 'Disk'}
                    onChange={(e) => setNewRunbook({ ...newRunbook, category: e.target.value as any })}
                    className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Disk">Disk Storage</option>
                    <option value="CPU">CPU Utilization</option>
                    <option value="Memory">RAM Memory</option>
                    <option value="Kubernetes">Kubernetes Pods</option>
                    <option value="Network">Network / Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Timeout (Seconds)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={newRunbook.timeoutSeconds || 30}
                    onChange={(e) => setNewRunbook({ ...newRunbook, timeoutSeconds: Number(e.target.value) })}
                    className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Trigger Condition</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memory RAM >= 88%"
                  value={newRunbook.triggerCondition || ''}
                  onChange={(e) => setNewRunbook({ ...newRunbook, triggerCondition: e.target.value })}
                  className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Script / Shell Command</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. redis-cli -a $AUTH_KEY memory purge"
                  value={newRunbook.scriptSnippet || ''}
                  onChange={(e) => setNewRunbook({ ...newRunbook, scriptSnippet: e.target.value })}
                  className="w-full bg-[#070C18] border border-slate-700 rounded-xl p-3 text-xs text-emerald-400 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Playbook</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
