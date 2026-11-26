'use client';

import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Wrench,
  Search,
  Filter,
  Check,
  Edit2,
  Save,
  Trash2,
  Server,
  Cpu,
  HardDrive,
  Activity,
  ArrowRight,
  ShieldAlert,
  Play,
  RotateCw,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import { AlertItem } from '@/types/monitoring';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface ActiveIncidentsTabProps {
  alerts: AlertItem[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onRemove: (id: string) => void;
  onAutoRemediate: (alert: AlertItem) => void;
  onUpdateNote: (id: string, note: string) => void;
  onSimulateAlert: () => void;
}

export function ActiveIncidentsTab({
  alerts,
  onAcknowledge,
  onResolve,
  onRemove,
  onAutoRemediate,
  onUpdateNote,
  onSimulateAlert,
}: ActiveIncidentsTabProps) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  
  // Inline editing state for notes
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');
  const [remediatingId, setRemediatingId] = useState<string | null>(null);

  // Filter alerts
  const activeAlerts = alerts.filter((a) => {
    const status = (a.status || 'active').toLowerCase();
    const isUnresolved = status !== 'resolved';
    if (!isUnresolved) return false;

    if (severityFilter !== 'all') {
      const sev = (a.severity || 'warning').toLowerCase();
      if (sev !== severityFilter) return false;
    }

    if (providerFilter !== 'all') {
      const prov = (a.provider || '').toLowerCase();
      if (!prov.includes(providerFilter.toLowerCase())) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (a.resourceName || '').toLowerCase().includes(q);
      const matchTitle = (a.title || '').toLowerCase().includes(q);
      const matchMsg = (a.message || '').toLowerCase().includes(q);
      const matchRegion = (a.region || '').toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchMsg && !matchRegion) return false;
    }

    return true;
  });

  const criticalCount = alerts.filter(
    (a) => (a.status || 'active').toLowerCase() !== 'resolved' && (a.severity || '').toLowerCase() === 'critical'
  ).length;

  const warningCount = alerts.filter(
    (a) => (a.status || 'active').toLowerCase() !== 'resolved' && (a.severity || '').toLowerCase() === 'warning'
  ).length;

  const infoCount = alerts.filter(
    (a) => (a.status || 'active').toLowerCase() !== 'resolved' && (a.severity || '').toLowerCase() === 'info'
  ).length;

  const handleStartEditNote = (alert: AlertItem) => {
    setEditingNoteId(alert.id);
    setTempNoteText((alert as any).engineerNotes || alert.message || '');
  };

  const handleSaveNote = (id: string) => {
    onUpdateNote(id, tempNoteText);
    setEditingNoteId(null);
  };

  const handleTriggerRemediate = async (alert: AlertItem) => {
    setRemediatingId(alert.id);
    await new Promise((r) => setTimeout(r, 1200));
    onAutoRemediate(alert);
    setRemediatingId(null);
  };

  return (
    <div className="space-y-6">
      {/* KPI Severity Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#090F1E] border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-rose-950/20">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">P1 Critical Alerts</span>
            <div className="text-2xl font-bold text-white mt-1 font-mono flex items-center gap-2">
              {criticalCount}
              {criticalCount > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Requires immediate SRE on-call intervention</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#090F1E] border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-amber-950/20">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">P2 Warning Alerts</span>
            <div className="text-2xl font-bold text-white mt-1 font-mono">{warningCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Threshold crossed: approaching saturation</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-cyan-950/20">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">P3 Informational</span>
            <div className="text-2xl font-bold text-white mt-1 font-mono">{infoCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Deployment notices & health flutters</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Info className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#090F1E] border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-emerald-950/20">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Self-Healing Automation</span>
            <div className="text-2xl font-bold text-emerald-300 mt-1 font-mono">100% Ready</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Auto-runbooks enabled for 1-click triage</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Simulation Button */}
      <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[240px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search host, error, region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#070C18] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-[#070C18] border border-slate-800 rounded-xl p-1 text-xs">
            {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                  severityFilter === sev
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-[#070C18] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
          >
            <option value="all">All Cloud Environments</option>
            <option value="aws">AWS EC2</option>
            <option value="azure">Azure VMs</option>
            <option value="k8s">Kubernetes</option>
            <option value="docker">Docker Containers</option>
            <option value="custom">On-Premises / Custom</option>
          </select>
        </div>

        {/* Right side simulation & batch buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSimulateAlert}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Simulate Metric Breach Alert</span>
          </button>
        </div>
      </div>

      {/* Incidents Queue List */}
      {activeAlerts.length === 0 ? (
        <div className="bg-[#090F1E] border border-slate-800/80 rounded-2xl p-12 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">All Systems Operational & Healthy</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            There are no active firing P1, P2, or P3 incidents currently detected across your multi-cloud server fleet.
          </p>
          <button
            onClick={onSimulateAlert}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-all shadow-md"
          >
            <Flame className="w-4 h-4" />
            <span>Generate Simulated CPU/Memory Alert to Test</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing <strong className="text-white font-mono">{activeAlerts.length}</strong> active firing incidents
            </span>
            <span className="text-slate-500">Auto-evaluating live via SSE telemetry stream</span>
          </div>

          {activeAlerts.map((alert) => {
            const isCritical = (alert.severity || '').toLowerCase() === 'critical';
            const isWarning = (alert.severity || '').toLowerCase() === 'warning';
            const isAcked = (alert.status || '').toLowerCase() === 'acknowledged';
            const isRemediating = remediatingId === alert.id;
            const isEditing = editingNoteId === alert.id;

            return (
              <div
                key={alert.id}
                className={`bg-[#090F1E] rounded-2xl border transition-all duration-200 shadow-xl overflow-hidden ${
                  isCritical
                    ? 'border-rose-500/40 shadow-rose-950/20 hover:border-rose-500/60'
                    : isWarning
                    ? 'border-amber-500/40 shadow-amber-950/20 hover:border-amber-500/60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/60">
                  <div className="flex items-start gap-3.5">
                    {/* Severity Badge */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                        isCritical
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                          : isWarning
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                      }`}
                    >
                      {isCritical ? (
                        <Flame className="w-5 h-5 animate-pulse" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Info className="w-5 h-5" />
                      )}
                    </div>

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
                          {alert.severity || 'Warning'}
                        </span>

                        {isAcked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 border border-blue-500/40 text-blue-300 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            ACKNOWLEDGED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-1 font-mono animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            ACTIVE FIRING
                          </span>
                        )}

                        {/* Provider tag */}
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                          {alert.provider?.toLowerCase().includes('aws') ? (
                            <AwsLogo className="w-3.5 h-3.5" />
                          ) : alert.provider?.toLowerCase().includes('azure') ? (
                            <AzureLogo className="w-3.5 h-3.5" />
                          ) : (
                            <Server className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span className="capitalize">{alert.provider || 'Host'}</span>
                        </span>

                        {alert.region && (
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {alert.region}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{alert.title || 'System Metric Breach'}</span>
                        <span className="text-xs font-mono font-normal text-slate-400">
                          ({alert.resourceName || 'Unknown Resource'})
                        </span>
                      </h4>
                    </div>
                  </div>

                  {/* Breach Metric Snapshot */}
                  <div className="flex items-center gap-3 bg-[#070C18] border border-slate-800 rounded-xl px-4 py-2.5">
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-400">Breach Level</div>
                      <div className="text-sm font-bold text-rose-400 font-mono">
                        {alert.value ? `${alert.value.toFixed(1)}%` : 'Active Spike'}
                      </div>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-400">Threshold</div>
                      <div className="text-sm font-bold text-slate-200 font-mono">
                        {alert.threshold ? `>${alert.threshold}%` : '>80%'}
                      </div>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-400">First Fired</div>
                      <div className="text-xs font-mono text-slate-300">
                        {alert.timeAgo || 'Just now'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body: Root Cause Analysis & Description */}
                <div className="p-4 sm:p-5 space-y-4 bg-slate-950/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Root Cause Card */}
                    <div className="bg-[#070C18] border border-slate-800/90 rounded-xl p-3.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Root Cause Telemetry Diagnosis</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {alert.message ||
                          `Sustained utilization exceeding threshold on host ${alert.resourceName}. Linux kernel reporting thread saturation and high I/O wait times.`}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Resource ID: {alert.resourceId || 'i-prod-082419'}</span>
                        <span className="text-rose-400">Peak Recorded: {alert.peakValue ? `${alert.peakValue}%` : '96.4%'}</span>
                      </div>
                    </div>

                    {/* SRE Notes & Triage Comments */}
                    <div className="bg-[#070C18] border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Engineer Triage Notes</span>
                          </span>
                          {!isEditing && (
                            <button
                              onClick={() => handleStartEditNote(alert)}
                              className="text-slate-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit Note</span>
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2 mt-1">
                            <textarea
                              rows={2}
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              placeholder="Type engineer diagnosis or hand-off notes..."
                              className="w-full bg-[#090F1E] border border-cyan-500/40 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveNote(alert.id)}
                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                              >
                                <Save className="w-3 h-3" />
                                <span>Save Note</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-300 italic">
                            {(alert as any).engineerNotes || 'No custom triage notes attached yet. Click "Edit Note" to add hand-off details.'}
                          </p>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
                        Incident Ticket: #INC-{alert.id.slice(-6).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Action Bar with Edit, Save, Remove, Acknowledge, Auto-Remediate */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 1-Click Auto Remediate */}
                      <button
                        disabled={isRemediating}
                        onClick={() => handleTriggerRemediate(alert)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all disabled:opacity-50"
                      >
                        {isRemediating ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Executing Runbook...</span>
                          </>
                        ) : (
                          <>
                            <Wrench className="w-3.5 h-3.5" />
                            <span>⚡ 1-Click Auto-Remediate</span>
                          </>
                        )}
                      </button>

                      {/* Acknowledge */}
                      {!isAcked && (
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      {/* Mark Resolved */}
                      <button
                        onClick={() => onResolve(alert.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mark Resolved</span>
                      </button>
                    </div>

                    {/* Secondary Actions: Edit Note & Remove */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEditNote(alert)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition-all"
                      >
                        <Edit2 className="w-3 h-3 text-cyan-400" />
                        <span>Edit Note</span>
                      </button>

                      <button
                        onClick={() => onRemove(alert.id)}
                        title="Dismiss and remove incident"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Alert</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
