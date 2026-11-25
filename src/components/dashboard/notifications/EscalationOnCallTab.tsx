'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  RotateCcw,
  Sparkles,
  Edit3,
  Save,
  Trash2,
  Plus,
  X,
} from 'lucide-react';

interface EscalationTier {
  id: string;
  level: number;
  title: string;
  delayMins: number;
  responder: string;
  description: string;
  colorBorder: string;
}

interface OnCallMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  shift: string;
  phone: string;
  email: string;
  status: 'duty' | 'backup';
}

interface EscalationOnCallTabProps {
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export function EscalationOnCallTab({ onShowToast }: EscalationOnCallTabProps) {
  // Escalation Tiers State
  const [tiers, setTiers] = useState<EscalationTier[]>([
    {
      id: 'tier-1',
      level: 1,
      title: 'SRE Primary Responder',
      delayMins: 0,
      responder: 'Siva Brahmaiah (Lead SRE)',
      description: 'Immediately sounds In-App Audio Siren, browser push, and sends Slack P1 broadcast.',
      colorBorder: 'border-cyan-500/40',
    },
    {
      id: 'tier-2',
      level: 2,
      title: 'DevOps Lead & Secondary',
      delayMins: 5,
      responder: 'Anand Kumar (DevOps Lead)',
      description: 'Fires Emergency SMS to mobile phones and high-priority email alerts to engineering leads.',
      colorBorder: 'border-amber-500/40',
    },
    {
      id: 'tier-3',
      level: 3,
      title: 'VP of Eng & CTO Desk',
      delayMins: 15,
      responder: 'Executive Incident Commander',
      description: 'Automatic executive incident page, critical PagerDuty trigger, and emergency bridge creation.',
      colorBorder: 'border-rose-500/40',
    },
  ]);

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editTierTitle, setEditTierTitle] = useState('');
  const [editTierDelay, setEditTierDelay] = useState<number>(5);
  const [editTierResponder, setEditTierResponder] = useState('');
  const [editTierDesc, setEditTierDesc] = useState('');

  // On-Call Team Roster State
  const [members, setMembers] = useState<OnCallMember[]>([
    {
      id: 'mem-1',
      name: 'Siva Brahmaiah',
      initials: 'SB',
      role: 'Lead SRE & DevOps Cloud Architect',
      shift: '08:00 - 20:00 IST',
      phone: '+91 98765 43210',
      email: 'nallasiva552@gmail.com',
      status: 'duty',
    },
    {
      id: 'mem-2',
      name: 'Anand Kumar',
      initials: 'AK',
      role: 'Cloud Infrastructure Systems Admin',
      shift: '20:00 - 08:00 IST',
      phone: '+91 98765 12345',
      email: 'anand.k@company.internal',
      status: 'backup',
    },
  ]);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState('');
  const [editMemberShift, setEditMemberShift] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberEmail, setEditMemberEmail] = useState('');

  // Add Member Modal State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberShift, setNewMemberShift] = useState('08:00 - 20:00 IST');

  // Simulated Live Incident State
  const [incidentActive, setIncidentActive] = useState<boolean>(true);
  const [incidentAcknowledged, setIncidentAcknowledged] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(68);

  useEffect(() => {
    if (!incidentActive || incidentAcknowledged) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [incidentActive, incidentAcknowledged]);

  const handleAcknowledge = () => {
    setIncidentAcknowledged(true);
    onShowToast('Incident acknowledged! Escalation timer halted.', 'success');
  };

  const handleResetSimulation = () => {
    setIncidentActive(true);
    setIncidentAcknowledged(false);
    setCountdownSeconds(300);
    onShowToast('Simulated P1 Critical Incident launched for escalation test.', 'info');
  };

  // --- TIER EDIT / SAVE / REMOVE ---
  const handleStartEditTier = (tier: EscalationTier) => {
    setEditingTierId(tier.id);
    setEditTierTitle(tier.title);
    setEditTierDelay(tier.delayMins);
    setEditTierResponder(tier.responder);
    setEditTierDesc(tier.description);
  };

  const handleSaveTier = (id: string) => {
    setTiers(
      tiers.map((t) =>
        t.id === id
          ? {
              ...t,
              title: editTierTitle.trim() || t.title,
              delayMins: editTierDelay,
              responder: editTierResponder.trim() || t.responder,
              description: editTierDesc.trim() || t.description,
            }
          : t
      )
    );
    setEditingTierId(null);
    onShowToast('Escalation tier updated and saved!', 'success');
  };

  const handleRemoveTier = (id: string, title: string) => {
    if (tiers.length <= 1) {
      onShowToast('At least one escalation tier must remain active.', 'warning');
      return;
    }
    setTiers(tiers.filter((t) => t.id !== id));
    onShowToast(`Removed escalation tier: ${title}`, 'info');
  };

  // --- MEMBER EDIT / SAVE / REMOVE ---
  const handleStartEditMember = (mem: OnCallMember) => {
    setEditingMemberId(mem.id);
    setEditMemberName(mem.name);
    setEditMemberRole(mem.role);
    setEditMemberShift(mem.shift);
    setEditMemberPhone(mem.phone);
    setEditMemberEmail(mem.email);
  };

  const handleSaveMember = (id: string) => {
    setMembers(
      members.map((m) =>
        m.id === id
          ? {
              ...m,
              name: editMemberName.trim() || m.name,
              role: editMemberRole.trim() || m.role,
              shift: editMemberShift.trim() || m.shift,
              phone: editMemberPhone.trim() || m.phone,
              email: editMemberEmail.trim() || m.email,
              initials: editMemberName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || m.initials,
            }
          : m
      )
    );
    setEditingMemberId(null);
    onShowToast('Responder profile updated & saved!', 'success');
  };

  const handleRemoveMember = (id: string, name: string) => {
    if (members.length <= 1) {
      onShowToast('At least one on-call responder is required.', 'warning');
      return;
    }
    setMembers(members.filter((m) => m.id !== id));
    onShowToast(`Removed ${name} from on-call rotation.`, 'info');
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) {
      onShowToast('Name and phone number are required.', 'warning');
      return;
    }
    const initials = newMemberName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newMem: OnCallMember = {
      id: `mem-${Date.now()}`,
      name: newMemberName.trim(),
      initials,
      role: newMemberRole.trim() || 'DevOps SRE Engineer',
      shift: newMemberShift,
      phone: newMemberPhone.trim(),
      email: newMemberEmail.trim() || 'oncall@company.internal',
      status: 'backup',
    };
    setMembers([...members, newMem]);
    setIsAddingMember(false);
    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberRole('');
    setNewMemberEmail('');
    onShowToast(`Added ${newMem.name} to on-call team!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* 1. Live Incident Acknowledgment Deck */}
      <div className="bg-[#090F1E]/95 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${incidentAcknowledged ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'}`} />
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Live Escalation Flight Deck</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                incidentAcknowledged
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {incidentAcknowledged ? 'ACKNOWLEDGED — ESCALATION SILENCED' : 'ACTIVE CRITICAL INCIDENT'}
              </span>
            </h2>
          </div>

          <button
            onClick={handleResetSimulation}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-mono border border-slate-700 transition-all self-start sm:self-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Simulate Firing Incident</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-400 font-mono">[CRITICAL P1]</span>
              <span className="text-xs font-semibold text-white">aws-ec2-prod-database-01: High CPU Load &gt; 96.4%</span>
            </div>
            <p className="text-xs text-slate-400">
              Triggered 2m 14s ago • Target SRE: Siva Brahmaiah • Level 1 Immediate Audio & Push Sent.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!incidentAcknowledged ? (
              <>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Escalates to L2 in</div>
                  <div className="text-lg font-mono font-bold text-amber-400">
                    {Math.floor(countdownSeconds / 60)}:
                    {(countdownSeconds % 60).toString().padStart(2, '0')}
                  </div>
                </div>

                <button
                  onClick={handleAcknowledge}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Acknowledge Alert (Halt L2)</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Acknowledged by Siva Brahmaiah (SRE Lead)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. 3-Tier Automated Escalation Policy (With Edit, Save, Remove on each Tier) */}
      <div className="bg-[#090F1E]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>3-Tier Automated Escalation Policy ({tiers.length} Active Tiers)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Defines automatic responder promotion when an emergency P1 outage remains unacknowledged, with Edit, Save & Remove.
            </p>
          </div>

          <span className="text-xs font-mono text-cyan-300 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
            Escalation Chain: L1 ➔ L2 ➔ L3
          </span>
        </div>

        {/* 3 Step Escalation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {tiers.map((tier) => {
            const isEditing = editingTierId === tier.id;

            return (
              <div
                key={tier.id}
                className={`p-4 rounded-xl bg-slate-950/70 border space-y-3 relative transition-all ${
                  isEditing ? 'border-purple-500 shadow-xl' : tier.colorBorder
                }`}
              >
                {isEditing ? (
                  /* Edit Tier Form */
                  <div className="space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <span className="font-mono text-purple-400 font-bold">Edit Tier {tier.level}</span>
                      <button
                        onClick={() => setEditingTierId(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Tier Title</label>
                      <input
                        type="text"
                        value={editTierTitle}
                        onChange={(e) => setEditTierTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Timeout Delay (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={editTierDelay}
                        onChange={(e) => setEditTierDelay(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Assigned Responder</label>
                      <input
                        type="text"
                        value={editTierResponder}
                        onChange={(e) => setEditTierResponder(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => setEditingTierId(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveTier(tier.id)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Tier */
                  <>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                        LEVEL {tier.level}
                      </span>
                      <span className="text-xs font-mono text-emerald-400">
                        {tier.delayMins === 0 ? '0s Immediate' : `+${tier.delayMins} mins`}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white">{tier.title}</div>
                      <p className="text-xs text-slate-400">{tier.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate mr-2">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{tier.responder}</span>
                      </div>

                      {/* Edit & Remove Tier Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEditTier(tier)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white"
                          title="Edit Tier"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveTier(tier.id, tier.title)}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                          title="Remove Tier"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 24/7 On-Call Rotation Matrix (With Edit, Save, Remove & Add Responder) */}
      <div className="bg-[#090F1E]/90 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>24/7 On-Call Responder Roster ({members.length} Members)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage active duty responders, phone numbers, and schedules with Edit, Save, Remove & Add.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsAddingMember(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Responder</span>
            </button>
            <button
              onClick={() => onShowToast('Shift swap request sent to secondary engineer!', 'info')}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all"
            >
              Swap Shift
            </button>
          </div>
        </div>

        {/* Add Member Form */}
        {isAddingMember && (
          <form
            onSubmit={handleAddMember}
            className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/40 space-y-3 animate-in fade-in duration-150 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white font-mono uppercase">Add New On-Call Responder</span>
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Engineer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Varma"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Role Title</label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Operations Lead"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Emergency Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Responder</span>
              </button>
            </div>
          </form>
        )}

        {/* Responders Grid with Edit, Save, Remove */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((mem) => {
            const isEditing = editingMemberId === mem.id;

            return (
              <div
                key={mem.id}
                className={`p-4 rounded-xl bg-slate-950/70 border space-y-3 transition-all ${
                  isEditing ? 'border-purple-500 shadow-xl' : 'border-slate-800'
                }`}
              >
                {isEditing ? (
                  /* Edit Member Mode */
                  <div className="space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <span className="font-mono text-purple-400 font-bold">Edit Responder: {mem.name}</span>
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Name</label>
                        <input
                          type="text"
                          value={editMemberName}
                          onChange={(e) => setEditMemberName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Role</label>
                        <input
                          type="text"
                          value={editMemberRole}
                          onChange={(e) => setEditMemberRole(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Phone</label>
                        <input
                          type="tel"
                          value={editMemberPhone}
                          onChange={(e) => setEditMemberPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Shift Timing</label>
                        <input
                          type="text"
                          value={editMemberShift}
                          onChange={(e) => setEditMemberShift(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveMember(mem.id)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Member Mode */
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-base shrink-0">
                      {mem.initials}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-white truncate">{mem.name}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                            mem.status === 'duty'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {mem.status === 'duty' ? 'On Duty Now' : 'Backup Duty'}
                          </span>

                          {/* Edit & Remove Member Buttons */}
                          <button
                            onClick={() => handleStartEditMember(mem)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white"
                            title="Edit Member"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(mem.id, mem.name)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 truncate">{mem.role}</div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>{mem.shift}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-cyan-400" />
                          <span>{mem.phone}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Weekly schedule pills */}
        <div className="pt-2 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
          {['Mon (SB)', 'Tue (SB)', 'Wed (SB)', 'Thu (AK)', 'Fri (AK)', 'Sat (SB/AK)', 'Sun (SB/AK)'].map(
            (day, idx) => (
              <span
                key={day}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap border ${
                  idx === 0
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800'
                }`}
              >
                {day}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
