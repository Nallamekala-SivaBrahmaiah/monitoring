'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Save,
  X,
  Server,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  resourceName: string;
  provider: 'aws' | 'azure' | 'k8s' | 'docker' | 'custom';
  severity: 'Critical' | 'Warning' | 'Resolved' | 'Info';
  eventTitle: string;
  actionTaken: string;
  resolutionTimeMinutes: number;
  operator: string;
  postMortemNote?: string;
}

const INITIAL_LOGS: AuditLogEntry[] = [
  {
    id: 'log-101',
    timestamp: 'Today, 14:32 UTC',
    resourceName: 'aws-ec2-prod-db-01',
    provider: 'aws',
    severity: 'Resolved',
    eventTitle: 'High CPU Saturation (94.2% Peak)',
    actionTaken: 'Auto-Remediated via Runbook #rb-cpu-kill',
    resolutionTimeMinutes: 4.2,
    operator: 'Autonomous SRE Agent',
    postMortemNote: 'Zombie thread pool in Node microservice terminated cleanly. CPU restored to 28%.',
  },
  {
    id: 'log-102',
    timestamp: 'Today, 12:15 UTC',
    resourceName: 'azure-vm-app-gateway-01',
    provider: 'azure',
    severity: 'Resolved',
    eventTitle: 'Disk Storage Threshold Crossed (>88%)',
    actionTaken: 'Executed Vacuum & Docker Temp Prune',
    resolutionTimeMinutes: 3.5,
    operator: 'DevOps On-Call (nalla)',
    postMortemNote: 'Rotated legacy log journals. 32GB disk capacity reclaimed.',
  },
  {
    id: 'log-103',
    timestamp: 'Today, 09:40 UTC',
    resourceName: 'k8s-cluster-worker-pool',
    provider: 'k8s',
    severity: 'Resolved',
    eventTitle: 'Kubernetes Pod CrashLoopBackOff (Restart Count: 4)',
    actionTaken: 'Rolling Restart Deployment /backend-api',
    resolutionTimeMinutes: 6.8,
    operator: 'Kubernetes Self-Healer',
    postMortemNote: 'ConfigMap reload fixed bad database credentials secret.',
  },
  {
    id: 'log-104',
    timestamp: 'Yesterday, 22:10 UTC',
    resourceName: 'docker-redis-cache-tier',
    provider: 'docker',
    severity: 'Resolved',
    eventTitle: 'Memory OOM Hazard Warning (91% RAM)',
    actionTaken: 'Memory Buffer Flush & Keys Evicted',
    resolutionTimeMinutes: 2.1,
    operator: 'Autonomous SRE Agent',
    postMortemNote: 'Evicted 450,000 expired session cache tokens.',
  },
  {
    id: 'log-105',
    timestamp: 'Yesterday, 17:05 UTC',
    resourceName: 'aws-ec2-worker-node-03',
    provider: 'aws',
    severity: 'Critical',
    eventTitle: 'Heartbeat Timeout / ICMP Packet Loss',
    actionTaken: 'AWS Auto-Recovery Triggered',
    resolutionTimeMinutes: 8.4,
    operator: 'AWS CloudWatch Bridge',
    postMortemNote: 'Underlying hardware degradation on AWS rack. Instance migrated smoothly.',
  },
];

export function IncidentTimelineTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(INITIAL_LOGS);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'Warning' | 'Resolved'>('all');
  
  // Inline edit state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  const filteredLogs = logs.filter((l) => {
    if (severityFilter !== 'all' && l.severity !== severityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchHost = l.resourceName.toLowerCase().includes(q);
      const matchTitle = l.eventTitle.toLowerCase().includes(q);
      const matchAction = l.actionTaken.toLowerCase().includes(q);
      const matchNote = (l.postMortemNote || '').toLowerCase().includes(q);
      if (!matchHost && !matchTitle && !matchAction && !matchNote) return false;
    }
    return true;
  });

  const handleStartEdit = (entry: AuditLogEntry) => {
    setEditingLogId(entry.id);
    setTempNote(entry.postMortemNote || '');
  };

  const handleSaveEdit = (id: string) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, postMortemNote: tempNote } : l))
    );
    setEditingLogId(null);
  };

  const handleRemoveLog = (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Clear all resolved incident audit history?')) {
      setLogs([]);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Resource', 'Provider', 'Severity', 'Event', 'Action Taken', 'MTTR (min)', 'Operator', 'Notes'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.resourceName}"`,
      `"${l.provider}"`,
      `"${l.severity}"`,
      `"${l.eventTitle}"`,
      `"${l.actionTaken}"`,
      l.resolutionTimeMinutes,
      `"${l.operator}"`,
      `"${(l.postMortemNote || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `incident_audit_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* SRE MTTR Performance Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-400">Avg Time to Ack (MTTA)</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1">1.8 mins</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Top 5% industry speed benchmark</p>
        </div>

        <div className="bg-[#090F1E] border border-emerald-500/30 rounded-2xl p-4 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-emerald-400">Avg Time to Resolve (MTTR)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 font-mono mt-1">4.6 mins</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Reduced by 68% via Auto-Remediation</p>
        </div>

        <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl p-4 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-cyan-400">Autonomous Triage Rate</span>
            <Wrench className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono mt-1">94.8%</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Resolved with deterministic runbooks</p>
        </div>

        <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Audited Events</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{logs.length} Events</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Immutable audit compliance stream</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Export, Clear */}
      <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[240px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search timeline by host, event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#070C18] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-[#070C18] border border-slate-800 rounded-xl p-1 text-xs">
            {(['all', 'Critical', 'Warning', 'Resolved'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  severityFilter === sev
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Master Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Chronological Audit Stream */}
      {filteredLogs.length === 0 ? (
        <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm">No historical incident logs matching your search criteria.</p>
        </div>
      ) : (
        <div className="relative pl-6 border-l border-slate-800 space-y-6 ml-2 sm:ml-4">
          {filteredLogs.map((log) => {
            const isEditing = editingLogId === log.id;
            const isResolved = log.severity === 'Resolved';
            const isCritical = log.severity === 'Critical';

            return (
              <div key={log.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full border flex items-center justify-center ${
                    isResolved
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                      : isCritical
                      ? 'bg-rose-950 border-rose-500 text-rose-400'
                      : 'bg-amber-950 border-amber-500 text-amber-400'
                  }`}
                >
                  {isResolved ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCritical ? (
                    <Flame className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Entry Card */}
                <div className="bg-[#090F1E] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xl transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{log.timestamp}</span>
                      <span className="text-slate-600">•</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border font-mono ${
                          isResolved
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : isCritical
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        {log.severity}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs font-mono text-cyan-400">MTTR: {log.resolutionTimeMinutes}m</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <span>Operator:</span>
                      <strong className="text-slate-200">{log.operator}</strong>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{log.eventTitle}</span>
                        <span className="text-xs font-normal text-slate-400 font-mono">({log.resourceName})</span>
                      </h4>
                      <p className="text-xs text-emerald-400 font-mono mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Action: {log.actionTaken}</span>
                      </p>
                    </div>

                    {/* Action buttons: Edit Note & Remove */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(log)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-cyan-400" />
                          <span>Edit Note</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveLog(log.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  {/* Post-Mortem / Engineer Note */}
                  {isEditing ? (
                    <div className="bg-[#070C18] border border-cyan-500/40 rounded-xl p-3 space-y-2 mt-2">
                      <label className="text-[11px] font-bold uppercase text-cyan-400 block">Edit Post-Mortem Analysis</label>
                      <textarea
                        rows={2}
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        className="w-full bg-[#090F1E] border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingLogId(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(log.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    log.postMortemNote && (
                      <div className="bg-[#070C18] border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300">
                        <strong className="text-slate-400 uppercase text-[10px] block mb-0.5 font-mono">
                          Post-Mortem Root Cause & Audit Notes:
                        </strong>
                        {log.postMortemNote}
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
