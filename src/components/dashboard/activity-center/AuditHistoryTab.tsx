'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  User,
  Filter,
  Eye,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
  Layers,
} from 'lucide-react';

interface AuditLogItem {
  _id: string;
  action: string;
  actor: string;
  targetType: string;
  targetId?: string;
  details: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  timestamp: string;
}

export function AuditHistoryTab() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedTarget, setSelectedTarget] = useState<string>('all');
  const [limit, setLimit] = useState<number>(50);
  const [viewLog, setViewLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity-center/audit?limit=${limit}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [limit]);

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'all' && log.action !== selectedAction) return false;
    if (selectedTarget !== 'all' && log.targetType !== selectedTarget) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDetails = log.details?.toLowerCase().includes(q);
      const matchActor = log.actor?.toLowerCase().includes(q);
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchTarget = log.targetType?.toLowerCase().includes(q);
      if (!matchDetails && !matchActor && !matchAction && !matchTarget) return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('START') || act.includes('RESUME')) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (act.includes('PAUSE') || act.includes('END')) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    if (act.includes('SETTINGS') || act.includes('TOGGLE')) {
      return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    }
    if (act.includes('REPORT') || act.includes('SEND')) {
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    }
    if (act.includes('DELETE') || act.includes('FAIL')) {
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  };

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).filter(Boolean);
  const uniqueTargets = Array.from(new Set(logs.map((l) => l.targetType))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0D1526]/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">Governance & Audit Trail</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Immutable Record
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Complete forensic record of all operational configuration changes, work session lifecycles, recipient modifications, manual activity notes, and report dispatches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-4 py-2 bg-[#131D35] hover:bg-[#1A2645] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-medium flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0D1526]/60 border border-cyan-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit records by actor, details, target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#131D35] border border-cyan-500/20 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-[#131D35] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="bg-[#131D35] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Targets</option>
              {uniqueTargets.map((tgt) => (
                <option key={tgt} value={tgt}>
                  {tgt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Show:</span>
          {[25, 50, 100].map((num) => (
            <button
              key={num}
              onClick={() => setLimit(num)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                limit === num
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-[#131D35] text-gray-400 border-cyan-500/10 hover:border-cyan-500/30'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0D1526]/80 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131D35]/80 text-gray-400 font-semibold border-b border-cyan-500/20">
              <tr>
                <th className="py-3.5 px-4">Timestamp (IST)</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target</th>
                <th className="py-3.5 px-4">Audit Details</th>
                <th className="py-3.5 px-4 text-center">Diff / Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Loading audit trail records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
                    No audit records match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  });

                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-[#131D35]/40 transition group cursor-pointer"
                      onClick={() => setViewLog(log)}
                    >
                      <td className="py-3.5 px-4 text-gray-300 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400/70" />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-white font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{log.actor || 'System'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#131D35] border border-cyan-500/10 text-gray-300">
                          {log.targetType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-300 max-w-md">
                        <p className="line-clamp-2 leading-relaxed">{log.details}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {log.previousValue || log.newValue ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewLog(log);
                            }}
                            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-medium flex items-center gap-1 mx-auto transition"
                          >
                            <FileCode className="w-3 h-3" />
                            View Diff
                          </button>
                        ) : (
                          <span className="text-gray-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Diff Modal */}
      {viewLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-cyan-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Audit Event Details</h3>
              </div>
              <button
                onClick={() => setViewLog(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#131D35]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#131D35]/60 rounded-xl border border-cyan-500/10">
                <span className="text-gray-400 block mb-1">Timestamp (IST)</span>
                <span className="text-white font-mono font-medium">
                  {new Date(viewLog.timestamp).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
              <div className="p-3 bg-[#131D35]/60 rounded-xl border border-cyan-500/10">
                <span className="text-gray-400 block mb-1">Actor & IP</span>
                <span className="text-white font-medium">
                  {viewLog.actor} ({viewLog.ipAddress || '127.0.0.1'})
                </span>
              </div>
              <div className="p-3 bg-[#131D35]/60 rounded-xl border border-cyan-500/10">
                <span className="text-gray-400 block mb-1">Action</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getActionBadge(
                    viewLog.action
                  )}`}
                >
                  {viewLog.action}
                </span>
              </div>
              <div className="p-3 bg-[#131D35]/60 rounded-xl border border-cyan-500/10">
                <span className="text-gray-400 block mb-1">Target Entity</span>
                <span className="text-white font-medium">
                  {viewLog.targetType} {viewLog.targetId ? `(${viewLog.targetId})` : ''}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#131D35]/60 rounded-xl border border-cyan-500/10">
              <span className="text-gray-400 block mb-1 text-xs">Details</span>
              <p className="text-xs text-gray-200 leading-relaxed">{viewLog.details}</p>
            </div>

            {/* Previous vs New Values */}
            {(viewLog.previousValue || viewLog.newValue) && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-300 block">Value Comparison</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#080D1A] rounded-xl border border-red-500/20">
                    <span className="text-red-400 font-semibold block mb-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Previous State
                    </span>
                    <pre className="text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                      {viewLog.previousValue
                        ? JSON.stringify(viewLog.previousValue, null, 2)
                        : 'null'}
                    </pre>
                  </div>
                  <div className="p-3 bg-[#080D1A] rounded-xl border border-emerald-500/20">
                    <span className="text-emerald-400 font-semibold block mb-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> New State
                    </span>
                    <pre className="text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                      {viewLog.newValue ? JSON.stringify(viewLog.newValue, null, 2) : 'null'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewLog(null)}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
