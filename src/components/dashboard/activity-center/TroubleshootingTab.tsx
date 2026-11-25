'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  FileText,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

export function TroubleshootingTab() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<'aws' | 'azure' | 'onprem' | 'application'>('onprem');
  const [serverOrResource, setServerOrResource] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [investigationSteps, setInvestigationSteps] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [resolutionSteps, setResolutionSteps] = useState('');
  const [verification, setVerification] = useState('');
  const [status, setStatus] = useState<'Open' | 'In Progress' | 'Resolved' | 'Unresolved'>('Resolved');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [saving, setSaving] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/activity-center/troubleshooting?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error('Fetch troubleshooting records error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter]);

  const handleSaveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/activity-center/troubleshooting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          platform,
          serverOrResource,
          errorMessage,
          investigationSteps,
          rootCause,
          resolutionSteps,
          verification,
          status,
          durationMinutes: Number(durationMinutes) || 0,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setTitle('');
        setServerOrResource('');
        setErrorMessage('');
        setRootCause('');
        setResolutionSteps('');
        fetchRecords();
      }
    } catch (err) {
      alert(`Error saving troubleshooting task: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Toolbar */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>DevOps Troubleshooting & Incident Resolution Log</span>
          </h2>
          <p className="text-xs text-slate-400">
            Documented problem titles, actual errors, investigation steps, root causes, and verified fixes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Log Troubleshooting Task</span>
          </button>
          <button
            type="button"
            onClick={fetchRecords}
            className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700/80 transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cards & Table Grid */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#111A2E] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Logged Time (IST)</th>
                <th className="py-3 px-4">Problem Title</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Server / Resource</th>
                <th className="py-3 px-4">Error Message</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Loading troubleshooting history...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((rec) => (
                  <tr key={rec._id || rec.issueId} className="hover:bg-[#111A2E]/60 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-300 whitespace-nowrap">
                      {new Date(rec.startedAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-white max-w-[200px] truncate">{rec.title}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {rec.platform}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 max-w-[150px] truncate">{rec.serverOrResource}</td>
                    <td className="py-3 px-4 font-mono text-rose-300 max-w-[220px] truncate">{rec.errorMessage}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{rec.durationMinutes}m</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          rec.status === 'Resolved'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40'
                            : rec.status === 'Unresolved'
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-500/40'
                            : 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {rec.status === 'Resolved' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : rec.status === 'Unresolved' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{rec.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(rec)}
                        className="px-2.5 py-1 rounded-lg bg-[#111A2E] hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                      >
                        Full Fix
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No troubleshooting tasks logged yet. Documented errors and fixes will be tracked here and included in manager reports.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-amber-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">{selectedRecord.title}</h3>
                <span className="text-[11px] text-amber-400 font-mono">Resource: {selectedRecord.serverOrResource}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Observed Error Message:</span>
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 font-mono">
                  {selectedRecord.errorMessage}
                </div>
              </div>

              {selectedRecord.rootCause && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Identified Root Cause:</span>
                  <div className="p-3 rounded-xl bg-[#090F1D] border border-slate-800 text-slate-200">
                    {selectedRecord.rootCause}
                  </div>
                </div>
              )}

              {selectedRecord.resolutionSteps && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Resolution & Corrective Actions:</span>
                  <div className="p-3 rounded-xl bg-[#090F1D] border border-slate-800 text-emerald-300">
                    {selectedRecord.resolutionSteps}
                  </div>
                </div>
              )}

              {selectedRecord.investigationSteps && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Investigation & Commands Executed:</span>
                  <pre className="p-3 rounded-xl bg-[#050914] border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                    {selectedRecord.investigationSteps}
                  </pre>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-800 bg-[#090F1C] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-[#111A2E] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Issue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#0C1425] border border-amber-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Log Troubleshooting Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIssue} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Problem Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Docker container crashing with Out of Memory (OOMKilled)"
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="onprem">On-Premises / Linux</option>
                    <option value="aws">AWS Cloud</option>
                    <option value="azure">Azure Cloud</option>
                    <option value="application">Application Module</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Server / Resource *</label>
                  <input
                    type="text"
                    required
                    value={serverOrResource}
                    onChange={(e) => setServerOrResource(e.target.value)}
                    placeholder="e.g. vm01siva-mon / Redis Cluster"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Error Message / Log Snippet *</label>
                <textarea
                  required
                  rows={2}
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  placeholder="Exact error message observed..."
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Root Cause</label>
                <input
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Underlying reason identified..."
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Resolution Steps / Fix Applied</label>
                <textarea
                  rows={2}
                  value={resolutionSteps}
                  onChange={(e) => setResolutionSteps(e.target.value)}
                  placeholder="Actions taken to permanently resolve the issue..."
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-emerald-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="Resolved">Resolved</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Open">Open</option>
                    <option value="Unresolved">Unresolved</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#111A2E] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Troubleshooting Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
