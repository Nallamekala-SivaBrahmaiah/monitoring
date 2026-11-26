'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Bell,
  Cpu,
  Activity,
  HardDrive,
  Radio,
  Edit2,
  Save,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: 'CPU' | 'Memory' | 'Disk' | 'Latency' | 'ContainerRestarts' | 'ErrorRate';
  operator: '>' | '>=' | '<' | '<=';
  threshold: number;
  durationMinutes: number;
  severity: 'Critical' | 'Warning' | 'Info';
  channels: string[];
  scope: string;
  enabled: boolean;
}

const INITIAL_RULES: AlertRule[] = [
  {
    id: 'rule-cpu-critical',
    name: 'High CPU Saturation Alert',
    description: 'Fires when server CPU utilization remains over threshold for sustained workloads.',
    metric: 'CPU',
    operator: '>=',
    threshold: 85,
    durationMinutes: 3,
    severity: 'Critical',
    channels: ['Slack #devops-alerts', 'Email SRE', 'PagerDuty'],
    scope: 'All Multi-Cloud Compute Nodes',
    enabled: true,
  },
  {
    id: 'rule-mem-oom',
    name: 'System RAM Memory Exhaustion / OOM Hazard',
    description: 'Triggers when available system memory drops below safe operating buffer.',
    metric: 'Memory',
    operator: '>=',
    threshold: 90,
    durationMinutes: 5,
    severity: 'Critical',
    channels: ['Slack #sre-critical', 'Email Team', 'Webhook'],
    scope: 'Production DB & API Clusters',
    enabled: true,
  },
  {
    id: 'rule-disk-warning',
    name: 'Root Storage Volume Approaching Capacity',
    description: 'Detects log accumulation or persistent disk utilization reaching high levels.',
    metric: 'Disk',
    operator: '>=',
    threshold: 80,
    durationMinutes: 10,
    severity: 'Warning',
    channels: ['Email sysadmin@company.com', 'Discord #alerts'],
    scope: 'All Mounted Block Storage',
    enabled: true,
  },
  {
    id: 'rule-k8s-crashloop',
    name: 'Kubernetes Pod CrashLoopBackOff Detection',
    description: 'Triggers alert when container restarts exceed threshold in rolling window.',
    metric: 'ContainerRestarts',
    operator: '>=',
    threshold: 3,
    durationMinutes: 5,
    severity: 'Critical',
    channels: ['Slack #k8s-incidents', 'PagerDuty OnCall'],
    scope: 'Kubernetes Default & Prod Namespaces',
    enabled: true,
  },
  {
    id: 'rule-ping-unreachable',
    name: 'Server Heartbeat Lost / Ping Timeout',
    description: 'Alerts SRE team immediately if instance stops responding to ICMP telemetry pings.',
    metric: 'Latency',
    operator: '>=',
    threshold: 1500,
    durationMinutes: 1,
    severity: 'Critical',
    channels: ['SMS Urgent', 'OpsGenie', 'Slack #infra'],
    scope: 'All Connected Gateways & Hosts',
    enabled: true,
  },
];

export function AlertRulesTab() {
  const [rules, setRules] = useState<AlertRule[]>(INITIAL_RULES);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'Warning' | 'Info'>('all');
  
  // Inline editing state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AlertRule>>({});

  // Add rule modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    description: '',
    metric: 'CPU',
    operator: '>=',
    threshold: 80,
    durationMinutes: 5,
    severity: 'Warning',
    channels: ['Slack #alerts', 'Email oncall@company.com'],
    scope: 'All Multi-Cloud Compute Nodes',
    enabled: true,
  });

  const filteredRules = rules.filter((r) => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchScope = r.scope.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchScope) return false;
    }
    return true;
  });

  const handleToggleEnable = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleStartEdit = (rule: AlertRule) => {
    setEditingRuleId(rule.id);
    setEditForm({ ...rule });
  };

  const handleSaveEdit = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? ({ ...r, ...editForm } as AlertRule) : r))
    );
    setEditingRuleId(null);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name) return;
    const rule: AlertRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name,
      description: newRule.description || 'Custom defined threshold evaluation policy.',
      metric: (newRule.metric as any) || 'CPU',
      operator: newRule.operator || '>=',
      threshold: Number(newRule.threshold) || 80,
      durationMinutes: Number(newRule.durationMinutes) || 5,
      severity: (newRule.severity as any) || 'Warning',
      channels: newRule.channels || ['Email oncall@company.com'],
      scope: newRule.scope || 'All Compute Nodes',
      enabled: true,
    };
    setRules([rule, ...rules]);
    setShowAddModal(false);
    setNewRule({
      name: '',
      description: '',
      metric: 'CPU',
      operator: '>=',
      threshold: 80,
      durationMinutes: 5,
      severity: 'Warning',
      channels: ['Slack #alerts'],
      scope: 'All Multi-Cloud Compute Nodes',
      enabled: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Strip & Add Rule Trigger */}
      <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-rose-400" />
            <span>Alert Rules & Automated Threshold Engine</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Configure telemetry condition triggers with granular Edit, Save, and Remove controls on every rule.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Alert Rule</span>
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
              placeholder="Filter rules by name, metric, scope..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#070C18] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-[#070C18] border border-slate-800 rounded-xl p-1 text-xs">
            {(['all', 'Critical', 'Warning', 'Info'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  severityFilter === sev
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filteredRules.length} of {rules.length} Active Rules
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.map((rule) => {
          const isCritical = rule.severity === 'Critical';
          const isWarning = rule.severity === 'Warning';
          const isEditing = editingRuleId === rule.id;

          return (
            <div
              key={rule.id}
              className={`bg-[#090F1E] rounded-2xl border transition-all duration-200 p-4 sm:p-5 shadow-xl ${
                !rule.enabled
                  ? 'border-slate-800/50 opacity-60'
                  : isCritical
                  ? 'border-rose-500/30 hover:border-rose-500/50'
                  : isWarning
                  ? 'border-amber-500/30 hover:border-amber-500/50'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {isEditing ? (
                /* Edit Form Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Alert Policy: {rule.name}</span>
                    </span>
                    <button
                      onClick={() => setEditingRuleId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Rule Name</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Metric Target</label>
                      <select
                        value={editForm.metric || 'CPU'}
                        onChange={(e) => setEditForm({ ...editForm, metric: e.target.value as any })}
                        className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="CPU">CPU Utilization</option>
                        <option value="Memory">Memory RAM</option>
                        <option value="Disk">Disk Storage</option>
                        <option value="Latency">Ping Latency</option>
                        <option value="ContainerRestarts">Container Restarts</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Threshold Value (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editForm.threshold || 80}
                        onChange={(e) => setEditForm({ ...editForm, threshold: Number(e.target.value) })}
                        className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Severity Tier</label>
                      <select
                        value={editForm.severity || 'Warning'}
                        onChange={(e) => setEditForm({ ...editForm, severity: e.target.value as any })}
                        className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="Critical">Critical (P1)</option>
                        <option value="Warning">Warning (P2)</option>
                        <option value="Info">Info (P3)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 text-xs">Description</label>
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingRuleId(null)}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(rule.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Rule</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <button
                      onClick={() => handleToggleEnable(rule.id)}
                      className="mt-1 text-slate-400 hover:text-white transition-colors"
                      title={rule.enabled ? 'Click to disable' : 'Click to enable'}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-600" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border font-mono ${
                            isCritical
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : isWarning
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                          }`}
                        >
                          {rule.severity}
                        </span>

                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {rule.metric} {rule.operator} {rule.threshold}% (for {rule.durationMinutes}m)
                        </span>

                        <span className="text-[11px] text-slate-400 font-mono">Scope: {rule.scope}</span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-white mb-1">{rule.name}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>

                      {/* Dispatch Notification Channels */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 mr-1 flex items-center gap-1">
                          <Bell className="w-3 h-3" /> Targets:
                        </span>
                        {rule.channels.map((ch, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-[10px] text-slate-300 font-mono"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Controls: Edit, Save, Remove */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <button
                      onClick={() => handleStartEdit(rule)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleRemoveRule(rule.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-all"
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

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#090F1E] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-400" />
                <span>Create New Alert Threshold Rule</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Redis Cache Memory Saturation"
                  value={newRule.name || ''}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description / Triage Guidance</label>
                <input
                  type="text"
                  placeholder="e.g. Eviction rate spiking due to high memory usage."
                  value={newRule.description || ''}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Metric Target</label>
                  <select
                    value={newRule.metric || 'CPU'}
                    onChange={(e) => setNewRule({ ...newRule, metric: e.target.value as any })}
                    className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="CPU">CPU Utilization (%)</option>
                    <option value="Memory">RAM Memory (%)</option>
                    <option value="Disk">Disk Storage (%)</option>
                    <option value="Latency">Network Latency (ms)</option>
                    <option value="ContainerRestarts">Container Restarts</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Threshold Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={newRule.threshold || 80}
                    onChange={(e) => setNewRule({ ...newRule, threshold: Number(e.target.value) })}
                    className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Duration Window (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newRule.durationMinutes || 5}
                    onChange={(e) => setNewRule({ ...newRule, durationMinutes: Number(e.target.value) })}
                    className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Severity Level</label>
                  <select
                    value={newRule.severity || 'Warning'}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as any })}
                    className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Critical">Critical (P1)</option>
                    <option value="Warning">Warning (P2)</option>
                    <option value="Info">Info (P3)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target Server Scope</label>
                <input
                  type="text"
                  placeholder="e.g. All AWS EC2 & Azure VMs"
                  value={newRule.scope || ''}
                  onChange={(e) => setNewRule({ ...newRule, scope: e.target.value })}
                  className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Activate Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
