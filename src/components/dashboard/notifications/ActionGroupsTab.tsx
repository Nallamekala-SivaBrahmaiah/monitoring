'use client';

import React, { useState } from 'react';
import {
  Zap,
  Plus,
  ShieldCheck,
  Send,
  Layers,
  Server,
  Cloud,
  CheckCircle2,
  Trash2,
  Edit3,
  Save,
  X,
  ArrowRight,
  Sliders,
  Bell,
  Mail,
  Volume2,
  Webhook,
  Smartphone,
} from 'lucide-react';
import {
  AwsEc2Logo,
  AzureVmLogo,
  KubernetesLogo,
  DockerLogo,
  NginxLogo,
} from '@/components/icons/CloudIcons';

export interface ActionGroup {
  id: string;
  name: string;
  description: string;
  severity: 'P1' | 'P2' | 'P3' | 'ALL';
  channels: Array<'email' | 'audio' | 'push' | 'webhook' | 'sms'>;
  clouds: Array<'aws' | 'azure' | 'k8s' | 'docker' | 'nginx'>;
  enabled: boolean;
}

interface ActionGroupsTabProps {
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export function ActionGroupsTab({ onShowToast }: ActionGroupsTabProps) {
  const [actionGroups, setActionGroups] = useState<ActionGroup[]>([
    {
      id: 'ag-sre-core',
      name: 'Tier-1 SRE Rapid Incident Response',
      description: 'Emergency multi-channel broadcast for host downtime, CPU spikes > 90%, and critical service failures.',
      severity: 'P1',
      channels: ['audio', 'sms', 'webhook', 'push'],
      clouds: ['aws', 'azure', 'k8s', 'docker'],
      enabled: true,
    },
    {
      id: 'ag-infra-devops',
      name: 'Platform Infrastructure & Cloud Ops',
      description: 'Dispatches warnings regarding memory consumption, disk capacity warnings, and cluster node drift.',
      severity: 'P2',
      channels: ['email', 'webhook', 'push'],
      clouds: ['aws', 'azure', 'k8s', 'docker', 'nginx'],
      enabled: true,
    },
    {
      id: 'ag-executive-digest',
      name: 'Executive Daily Briefing & Health Recap',
      description: 'Sends daily uptime digests and resolved incident notices directly to management and team leads.',
      severity: 'P3',
      channels: ['email'],
      clouds: ['aws', 'azure'],
      enabled: true,
    },
  ]);

  // Edit State for an individual group
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editSeverity, setEditSeverity] = useState<'P1' | 'P2' | 'P3' | 'ALL'>('P1');
  const [editChannels, setEditChannels] = useState<Array<'email' | 'audio' | 'push' | 'webhook' | 'sms'>>([]);
  const [editClouds, setEditClouds] = useState<Array<'aws' | 'azure' | 'k8s' | 'docker' | 'nginx'>>([]);

  // Create Form State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState<'P1' | 'P2' | 'P3' | 'ALL'>('P1');
  const [selectedChannels, setSelectedChannels] = useState<Array<'email' | 'audio' | 'push' | 'webhook' | 'sms'>>([
    'email',
    'webhook',
  ]);
  const [selectedClouds, setSelectedClouds] = useState<Array<'aws' | 'azure' | 'k8s' | 'docker' | 'nginx'>>([
    'aws',
    'azure',
    'k8s',
  ]);

  // --- START EDITING A GROUP ---
  const handleStartEdit = (group: ActionGroup) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupDesc(group.description);
    setEditSeverity(group.severity);
    setEditChannels([...group.channels]);
    setEditClouds([...group.clouds]);
  };

  // --- SAVE EDITED GROUP ---
  const handleSaveEdit = (id: string) => {
    if (!editGroupName.trim()) {
      onShowToast('Action group name cannot be empty.', 'warning');
      return;
    }
    setActionGroups(
      actionGroups.map((g) =>
        g.id === id
          ? {
              ...g,
              name: editGroupName.trim(),
              description: editGroupDesc.trim() || 'Custom routing policy.',
              severity: editSeverity,
              channels: editChannels,
              clouds: editClouds,
            }
          : g
      )
    );
    setEditingGroupId(null);
    onShowToast(`Action Group "${editGroupName.trim()}" saved successfully!`, 'success');
  };

  // --- REMOVE / DELETE GROUP ---
  const handleDeleteGroup = (id: string, name: string) => {
    setActionGroups(actionGroups.filter((g) => g.id !== id));
    if (editingGroupId === id) setEditingGroupId(null);
    onShowToast(`Removed action group: ${name}`, 'info');
  };

  // --- CREATE NEW GROUP ---
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      onShowToast('Action group name is required.', 'warning');
      return;
    }
    const newGroup: ActionGroup = {
      id: `ag-${Date.now()}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || 'Custom action group routing policy.',
      severity: newSeverity,
      channels: selectedChannels,
      clouds: selectedClouds,
      enabled: true,
    };
    setActionGroups([...actionGroups, newGroup]);
    setIsCreatingGroup(false);
    setNewGroupName('');
    setNewGroupDesc('');
    onShowToast(`Created & saved action group: ${newGroup.name}`, 'success');
  };

  // Toggles for Edit Mode
  const handleToggleEditChannel = (chan: 'email' | 'audio' | 'push' | 'webhook' | 'sms') => {
    if (editChannels.includes(chan)) {
      if (editChannels.length === 1) {
        onShowToast('At least one channel must be selected.', 'warning');
        return;
      }
      setEditChannels(editChannels.filter((c) => c !== chan));
    } else {
      setEditChannels([...editChannels, chan]);
    }
  };

  const handleToggleEditCloud = (cld: 'aws' | 'azure' | 'k8s' | 'docker' | 'nginx') => {
    if (editClouds.includes(cld)) {
      if (editClouds.length === 1) {
        onShowToast('At least one cloud source must be selected.', 'warning');
        return;
      }
      setEditClouds(editClouds.filter((c) => c !== cld));
    } else {
      setEditClouds([...editClouds, cld]);
    }
  };

  const handleToggleGroup = (id: string) => {
    setActionGroups(
      actionGroups.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Multi-Cloud Signal Matrix Visual Topology */}
      <div className="bg-[#090F1E]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Multi-Cloud Telemetry Signal Matrix</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live wiring diagram routing alarm triggers from infrastructure sources directly into designated Action Groups.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-2 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            5 Sources Connected
          </span>
        </div>

        {/* Matrix Visualization Deck */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
            {/* AWS */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center gap-1.5">
              <AwsEc2Logo className="w-6 h-6" />
              <div className="text-xs font-bold text-white">AWS EC2</div>
              <div className="text-[10px] font-mono text-amber-400">CloudWatch Signals</div>
            </div>

            {/* Azure */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center gap-1.5">
              <AzureVmLogo className="w-6 h-6" />
              <div className="text-xs font-bold text-white">Azure VMs</div>
              <div className="text-[10px] font-mono text-blue-400">Azure Monitor</div>
            </div>

            {/* K8s */}
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col items-center gap-1.5">
              <KubernetesLogo className="w-6 h-6" />
              <div className="text-xs font-bold text-white">Kubernetes</div>
              <div className="text-[10px] font-mono text-cyan-400">Kube-State Metrics</div>
            </div>

            {/* Docker */}
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col items-center gap-1.5">
              <DockerLogo className="w-6 h-6" />
              <div className="text-xs font-bold text-white">Docker Fleet</div>
              <div className="text-[10px] font-mono text-sky-400">Container Telemetry</div>
            </div>

            {/* Nginx */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center gap-1.5">
              <NginxLogo className="w-6 h-6" />
              <div className="text-xs font-bold text-white">Nginx Proxy</div>
              <div className="text-[10px] font-mono text-emerald-400">Ingress & Upstream</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-xs text-slate-400 font-mono py-1">
            <span className="w-16 h-px bg-gradient-to-r from-transparent to-cyan-500"></span>
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span>Real-Time Event Bus & Action Groups Routing</span>
            </span>
            <span className="w-16 h-px bg-gradient-to-l from-transparent to-cyan-500"></span>
          </div>
        </div>
      </div>

      {/* 2. Action Groups Management Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Configured Action Groups ({actionGroups.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Group multiple notification channels and cloud sources into unified 1-click automated response units with Edit, Save & Remove.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingGroup(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-950/40 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Action Group</span>
        </button>
      </div>

      {/* Creation Modal / Form */}
      {isCreatingGroup && (
        <form
          onSubmit={handleCreateGroup}
          className="p-5 rounded-2xl bg-[#090F1E] border border-purple-500/40 shadow-2xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Add New Multi-Cloud Action Group</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsCreatingGroup(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-slate-400">Action Group Name</label>
              <input
                type="text"
                placeholder="e.g. Database Emergency Team"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-slate-400">Minimum Severity Gate</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="P1">P1 — Critical Outages Only</option>
                <option value="P2">P2 — Warnings & High Thresholds</option>
                <option value="P3">P3 — Informational & Routine</option>
                <option value="ALL">ALL — Every Incident Trigger</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-slate-400">Description & Purpose</label>
            <input
              type="text"
              placeholder="e.g. Receives immediate alerts when PostgreSQL replica lag breaches 10s."
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400">Included Delivery Channels</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'audio', label: 'Chime', icon: Volume2 },
                  { id: 'push', label: 'Push', icon: Bell },
                  { id: 'webhook', label: 'Webhook', icon: Webhook },
                  { id: 'sms', label: 'SMS', icon: Smartphone },
                ].map((c) => {
                  const Icon = c.icon;
                  const isChecked = selectedChannels.includes(c.id as any);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        if (selectedChannels.includes(c.id as any)) {
                          if (selectedChannels.length === 1) return;
                          setSelectedChannels(selectedChannels.filter((x) => x !== c.id));
                        } else {
                          setSelectedChannels([...selectedChannels, c.id as any]);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                        isChecked
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400">Source Cloud Telemetry</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'aws', label: 'AWS EC2' },
                  { id: 'azure', label: 'Azure VM' },
                  { id: 'k8s', label: 'Kubernetes' },
                  { id: 'docker', label: 'Docker' },
                  { id: 'nginx', label: 'Nginx' },
                ].map((cl) => {
                  const isChecked = selectedClouds.includes(cl.id as any);
                  return (
                    <button
                      type="button"
                      key={cl.id}
                      onClick={() => {
                        if (selectedClouds.includes(cl.id as any)) {
                          if (selectedClouds.length === 1) return;
                          setSelectedClouds(selectedClouds.filter((x) => x !== cl.id));
                        } else {
                          setSelectedClouds([...selectedClouds, cl.id as any]);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                        isChecked
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {cl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreatingGroup(false)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-950/40 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Action Group</span>
            </button>
          </div>
        </form>
      )}

      {/* Action Groups Cards with Edit, Save, Remove */}
      <div className="grid grid-cols-1 gap-4">
        {actionGroups.map((group) => {
          const isEditing = editingGroupId === group.id;

          return (
            <div
              key={group.id}
              className={`p-5 rounded-2xl bg-[#090F1E]/90 border transition-all ${
                isEditing
                  ? 'border-purple-500 shadow-2xl shadow-purple-950/40'
                  : group.enabled
                  ? 'border-cyan-500/30 shadow-xl'
                  : 'border-slate-800 opacity-60'
              }`}
            >
              {isEditing ? (
                /* ================= EDITING MODE ================= */
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold font-mono text-purple-400 uppercase flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Action Group: {group.name}</span>
                    </span>
                    <button
                      onClick={() => setEditingGroupId(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">Group Name</label>
                      <input
                        type="text"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">Severity Tier</label>
                      <select
                        value={editSeverity}
                        onChange={(e) => setEditSeverity(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white font-mono"
                      >
                        <option value="P1">P1 — Critical Outages Only</option>
                        <option value="P2">P2 — Warnings & High Thresholds</option>
                        <option value="P3">P3 — Informational & Routine</option>
                        <option value="ALL">ALL — Every Incident</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="text-[10px] font-mono uppercase text-slate-400">Description</label>
                    <input
                      type="text"
                      value={editGroupDesc}
                      onChange={(e) => setEditGroupDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>

                  {/* Channels & Clouds Toggles in Edit Mode */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">Toggle Channels</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(['email', 'audio', 'push', 'webhook', 'sms'] as const).map((ch) => (
                          <button
                            type="button"
                            key={ch}
                            onClick={() => handleToggleEditChannel(ch)}
                            className={`px-2 py-1 rounded text-[11px] font-mono border ${
                              editChannels.includes(ch)
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            {ch.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">Toggle Clouds</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(['aws', 'azure', 'k8s', 'docker', 'nginx'] as const).map((cl) => (
                          <button
                            type="button"
                            key={cl}
                            onClick={() => handleToggleEditCloud(cl)}
                            className={`px-2 py-1 rounded text-[11px] font-mono border ${
                              editClouds.includes(cl)
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            {cl.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Save / Cancel Action Bar */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingGroupId(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(group.id)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ================= VIEW MODE ================= */
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">{group.name}</h3>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          group.severity === 'P1'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : group.severity === 'P2'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        {group.severity} Priority
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {group.channels.length} Channels Wired
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{group.description}</p>

                    {/* Cloud & Channel Pills */}
                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-mono text-[10px] text-slate-500 uppercase">Channels:</span>
                        {group.channels.map((chan) => (
                          <span
                            key={chan}
                            className="px-2 py-0.5 rounded bg-slate-800/80 text-[10px] font-mono text-cyan-300 border border-slate-700"
                          >
                            {chan.toUpperCase()}
                          </span>
                        ))}
                      </div>

                      <span className="text-slate-600">|</span>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-mono text-[10px] text-slate-500 uppercase">Sources:</span>
                        {group.clouds.map((cloud) => (
                          <span
                            key={cloud}
                            className="px-2 py-0.5 rounded bg-slate-800/80 text-[10px] font-mono text-purple-300 border border-slate-700 uppercase"
                          >
                            {cloud}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Prominent Action Bar with Edit, Save, Remove */}
                  <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                    {/* Test Group */}
                    <button
                      onClick={() =>
                        onShowToast(`Simulated test dispatch sent through "${group.name}"!`, 'success')
                      }
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      <span>Test</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleStartEdit(group)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
                      title="Edit Action Group"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
                      title="Remove Action Group"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>

                    {/* Power Toggle */}
                    <button
                      onClick={() => handleToggleGroup(group.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                        group.enabled
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {group.enabled ? 'Active' : 'Paused'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
