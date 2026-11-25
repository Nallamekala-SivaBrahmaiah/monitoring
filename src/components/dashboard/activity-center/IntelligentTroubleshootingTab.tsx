'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Play,
  Terminal,
  Server,
  X,
  FileCode,
  ShieldCheck,
  Zap,
  HardDrive,
  Layers,
  Cpu,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Eye,
  Check,
  Wrench,
} from 'lucide-react';

interface RecommendedFix {
  id: string;
  title: string;
  description: string;
  commands: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedOutcome: string;
}

interface IncidentItem {
  _id: string;
  incidentId: string;
  serverName: string;
  serverId?: string;
  host: string;
  provider: 'aws' | 'azure' | 'onprem';
  resourceType: 'disk' | 'memory' | 'cpu' | 'service' | 'deployment' | 'network';
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'investigating' | 'fix_approved' | 'fixing' | 'recovery_verified' | 'resolved';
  title: string;
  description: string;
  mountPoint?: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  evidence: string[];
  diagnosticsOutput?: string;
  possibleCauses: string[];
  confirmedCause?: string;
  recommendedFixes: RecommendedFix[];
  approvedBy?: string;
  executedFixTitle?: string;
  executedCommands?: string;
  executionOutput?: string;
  postFixValue?: number;
  recoveryVerifiedAt?: string;
  recoveryMessage?: string;
  startedAt: string;
  resolvedAt?: string;
  durationMinutes?: number;
  timeline?: Array<{ timestamp: string; event: string; actor: string; details?: string }>;
}

export function IntelligentTroubleshootingTab({
  initialServerFilter,
}: {
  initialServerFilter?: string;
}) {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialServerFilter || '');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected incident modal
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [selectedFixId, setSelectedFixId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity-center/incidents');
      const data = await res.json();
      if (data.success) {
        setIncidents(data.incidents || []);
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load incidents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleInvestigate = async (incident: IncidentItem) => {
    setActionLoading('investigate');
    setFeedback(null);
    try {
      const res = await fetch(`/api/activity-center/incidents/${incident.incidentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'investigate' }),
      });
      const data = await res.json();
      if (data.success && data.incident) {
        setSelectedIncident(data.incident);
        setIncidents((prev) =>
          prev.map((i) => (i.incidentId === data.incident.incidentId ? data.incident : i))
        );
        setFeedback('Diagnostic investigation completed. Actual confirmed evidence updated.');
      }
    } catch (e: any) {
      setFeedback(`Investigation error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecuteFix = async (incident: IncidentItem) => {
    setActionLoading('execute-fix');
    setFeedback(null);
    try {
      const res = await fetch(`/api/activity-center/incidents/${incident.incidentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute-fix', fixId: selectedFixId }),
      });
      const data = await res.json();
      if (data.success && data.incident) {
        setSelectedIncident(data.incident);
        setIncidents((prev) =>
          prev.map((i) => (i.incidentId === data.incident.incidentId ? data.incident : i))
        );
        setFeedback('Remediation action executed! You can now verify recovery.');
      }
    } catch (e: any) {
      setFeedback(`Execution error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyRecovery = async (incident: IncidentItem) => {
    setActionLoading('verify-recovery');
    setFeedback(null);
    try {
      const res = await fetch(`/api/activity-center/incidents/${incident.incidentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-recovery' }),
      });
      const data = await res.json();
      if (data.success && data.incident) {
        setSelectedIncident(data.incident);
        setIncidents((prev) =>
          prev.map((i) => (i.incidentId === data.incident.incidentId ? data.incident : i))
        );
        setFeedback(data.message);
      }
    } catch (e: any) {
      setFeedback(`Verification error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredIncidents = incidents.filter((i) => {
    if (resourceFilter !== 'all' && i.resourceType !== resourceFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && i.status === 'resolved') return false;
      if (statusFilter === 'resolved' && i.status !== 'resolved') return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchServer = i.serverName.toLowerCase().includes(q);
      const matchTitle = i.title.toLowerCase().includes(q);
      const matchDesc = i.description.toLowerCase().includes(q);
      const matchId = i.incidentId.toLowerCase().includes(q);
      if (!matchServer && !matchTitle && !matchDesc && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0D1526]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Intelligent Troubleshooting & Incident Action Center
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Evidence-Based Diagnosis & Recovery Verification
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Autonomous detection, server evidence gathering, confirmed root-cause investigation, safe command recommendations, authorized fix execution, and post-fix recovery verification.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchIncidents}
            disabled={loading}
            className="px-4 py-2 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Incidents</span>
          </button>
        </div>

        {/* Counter Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-cyan-500/15">
            <div className="p-3 bg-[#080D1A]/80 rounded-xl border border-rose-500/25">
              <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                Active Critical & Warning
              </span>
              <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                {stats.active}
              </div>
            </div>

            <div className="p-3 bg-[#080D1A]/80 rounded-xl border border-purple-500/20">
              <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider block">
                Disk Space Issues
              </span>
              <div className="text-2xl font-black font-mono text-purple-300 mt-1">
                {stats.diskIssues}
              </div>
            </div>

            <div className="p-3 bg-[#080D1A]/80 rounded-xl border border-sky-500/20">
              <span className="text-[10px] text-sky-400 uppercase font-bold tracking-wider block">
                RAM / Memory Issues
              </span>
              <div className="text-2xl font-black font-mono text-sky-300 mt-1">
                {stats.memoryIssues}
              </div>
            </div>

            <div className="p-3 bg-[#080D1A]/80 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                Verified Recovered
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                {stats.resolved}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0D1526]/80 border border-cyan-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by server, title, incident ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#131D35] border border-cyan-500/20 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="bg-[#131D35] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Resources</option>
              <option value="disk">Disk Issues</option>
              <option value="memory">RAM / Memory Issues</option>
              <option value="cpu">CPU Issues</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#131D35] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Incidents</option>
              <option value="active">Active Issues Only</option>
              <option value="resolved">Resolved & Verified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-[#0D1526]/80 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131D35]/80 text-gray-400 font-semibold border-b border-cyan-500/20">
              <tr>
                <th className="py-3.5 px-4">Incident ID & Severity</th>
                <th className="py-3.5 px-4">Target Server</th>
                <th className="py-3.5 px-4">Resource & Utilization</th>
                <th className="py-3.5 px-4">Confirmed Findings</th>
                <th className="py-3.5 px-4">Status & Action</th>
                <th className="py-3.5 px-4 text-center">Troubleshoot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {loading && incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Synchronizing live server incidents...
                  </td>
                </tr>
              ) : filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
                    Zero server incidents found matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const isResolved = inc.status === 'resolved';
                  const isCritical = inc.severity === 'critical';

                  return (
                    <tr
                      key={inc._id}
                      onClick={() => {
                        setSelectedIncident(inc);
                        setSelectedFixId(inc.recommendedFixes[0]?.id || '');
                        setFeedback(null);
                      }}
                      className="hover:bg-[#131D35]/50 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                              isResolved
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : isCritical
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {inc.severity}
                          </span>
                          <span className="font-mono text-cyan-300 font-bold">{inc.incidentId}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{inc.serverName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">{inc.host}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {inc.resourceType === 'disk' && <HardDrive className="w-3.5 h-3.5 text-purple-400" />}
                          {inc.resourceType === 'memory' && <Layers className="w-3.5 h-3.5 text-sky-400" />}
                          {inc.resourceType === 'cpu' && <Cpu className="w-3.5 h-3.5 text-amber-400" />}
                          <span className="font-bold uppercase text-white">{inc.resourceType}</span>
                        </div>
                        <div className="font-mono text-xs mt-0.5">
                          <span className={isResolved ? 'text-gray-400' : 'text-rose-400 font-bold'}>
                            {inc.currentValue}%
                          </span>
                          <span className="text-gray-500 text-[10px]"> (Threshold: {inc.thresholdValue}%)</span>
                          {inc.postFixValue !== undefined && (
                            <span className="text-emerald-400 font-bold ml-1.5">
                              → {inc.postFixValue}%
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-300 max-w-sm">
                        <p className="line-clamp-2 leading-relaxed text-[11px]">
                          {inc.confirmedCause || inc.title}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase border inline-flex items-center gap-1 ${
                            isResolved
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : inc.status === 'investigating'
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isResolved ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>RESOLVED</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{inc.status.toUpperCase()}</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Action Center</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep-Dive Incident Action Center Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-cyan-500/40 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-cyan-500/20 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full border ${
                      selectedIncident.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {selectedIncident.status.toUpperCase()}
                  </span>
                  <span className="font-mono text-cyan-300 font-bold text-sm">
                    {selectedIncident.incidentId}
                  </span>
                  <span className="text-xs text-gray-400">
                    • Server: <strong className="text-white">{selectedIncident.serverName}</strong> ({selectedIncident.host})
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{selectedIncident.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#131D35] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/40 flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" />
                <span>{feedback}</span>
              </div>
            )}

            {/* Questions 1 & 2: WHAT IS THE PROBLEM & ACTUAL EVIDENCE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#080D1A] rounded-xl border border-cyan-500/20 space-y-2">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  A. What is the Problem?
                </span>
                <p className="text-xs text-white leading-relaxed">{selectedIncident.description}</p>
                <div className="flex items-center gap-4 text-xs font-mono pt-1 text-gray-300">
                  <div>
                    Threshold: <strong className="text-amber-300">{selectedIncident.thresholdValue}%</strong>
                  </div>
                  <div>
                    Measured Usage: <strong className="text-rose-400">{selectedIncident.currentValue}%</strong>
                  </div>
                  {selectedIncident.postFixValue !== undefined && (
                    <div>
                      Post-Fix Usage: <strong className="text-emerald-400">{selectedIncident.postFixValue}%</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-[#080D1A] rounded-xl border border-cyan-500/20 space-y-2">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  B. Actual Confirmed Evidence
                </span>
                <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                  {selectedIncident.evidence && selectedIncident.evidence.length > 0 ? (
                    selectedIncident.evidence.map((ev, i) => <li key={i}>{ev}</li>)
                  ) : (
                    <li>No diagnostic evidence recorded yet. Click "Investigate" to run diagnostics.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Question 3: WHY MIGHT THIS HAVE OCCURRED? (ROOT CAUSE) */}
            <div className="p-4 bg-[#131D35]/70 rounded-xl border border-cyan-500/15 space-y-1.5">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                C. Root Cause Investigation
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedIncident.confirmedCause ||
                  (selectedIncident.possibleCauses && selectedIncident.possibleCauses.join('; ')) ||
                  'Under autonomous investigation.'}
              </p>
            </div>

            {/* Questions 4 & 5: WHAT SHOULD I DO & SAFE COMMANDS WITH RISK LEVEL */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-cyan-400" />
                D. Recommended Solutions & Safe Commands
              </span>

              <div className="space-y-3">
                {selectedIncident.recommendedFixes && selectedIncident.recommendedFixes.length > 0 ? (
                  selectedIncident.recommendedFixes.map((fix) => {
                    const isSelected = selectedFixId === fix.id;
                    return (
                      <div
                        key={fix.id}
                        onClick={() => setSelectedFixId(fix.id)}
                        className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                            : 'bg-[#080D1A] hover:bg-[#131D35] border-cyan-500/15 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{fix.title}</span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                fix.riskLevel === 'low'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : fix.riskLevel === 'medium'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              Risk: {fix.riskLevel}
                            </span>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-gray-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-400">{fix.description}</p>

                        <div className="p-2.5 bg-[#050811] rounded-lg border border-cyan-500/20">
                          <span className="text-[10px] text-gray-500 block mb-1 font-mono uppercase">
                            Safe Shell Command:
                          </span>
                          <pre className="text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                            {fix.commands}
                          </pre>
                        </div>

                        <span className="text-[10px] text-emerald-400 block">
                          Expected Outcome: {fix.expectedOutcome}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-400">No remediation fixes available.</p>
                )}
              </div>
            </div>

            {/* Execution Output (if executed) */}
            {selectedIncident.executionOutput && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Terminal Execution Result:
                </span>
                <pre className="p-3 bg-[#050811] rounded-xl border border-cyan-500/20 text-xs font-mono text-emerald-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {selectedIncident.executionOutput}
                </pre>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-cyan-500/20">
              <div className="flex items-center gap-2">
                {/* 1. Run Diagnostic Investigation */}
                <button
                  type="button"
                  onClick={() => handleInvestigate(selectedIncident)}
                  disabled={actionLoading !== null}
                  className="px-4 py-2 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Search className={`w-3.5 h-3.5 ${actionLoading === 'investigate' ? 'animate-spin' : ''}`} />
                  <span>{actionLoading === 'investigate' ? 'Investigating...' : 'Investigate Server'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* 2. Execute Approved Fix */}
                <button
                  type="button"
                  onClick={() => handleExecuteFix(selectedIncident)}
                  disabled={actionLoading !== null || selectedIncident.status === 'resolved'}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/25 disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 fill-white ${actionLoading === 'execute-fix' ? 'animate-spin' : ''}`} />
                  <span>{actionLoading === 'execute-fix' ? 'Executing Fix...' : 'Execute Approved Fix'}</span>
                </button>

                {/* 3. Verify Recovery */}
                <button
                  type="button"
                  onClick={() => handleVerifyRecovery(selectedIncident)}
                  disabled={actionLoading !== null}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/25"
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${actionLoading === 'verify-recovery' ? 'animate-spin' : ''}`} />
                  <span>{actionLoading === 'verify-recovery' ? 'Probing...' : 'Verify Recovery'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
