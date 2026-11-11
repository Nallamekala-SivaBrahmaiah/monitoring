'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Download,
  Trash2,
  RotateCw,
  Loader2,
  FileBox,
  GitBranch,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { IMavenBuildData } from '@/models/MavenBuild';

interface MavenBuildHistoryTableProps {
  onRefreshSummary?: () => void;
}

export function MavenBuildHistoryTable({ onRefreshSummary }: MavenBuildHistoryTableProps) {
  const [builds, setBuilds] = useState<IMavenBuildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Log viewer modal
  const [viewingBuild, setViewingBuild] = useState<IMavenBuildData | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchBuilds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/maven/builds?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBuilds(data.builds || []);
      }
    } catch (err) {
      console.warn('Failed to fetch Maven builds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilds();
  }, [statusFilter]);

  const handleOpenLogModal = async (buildId: string) => {
    try {
      const res = await fetch(`/api/maven/builds/${buildId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingBuild(data.build);
      }
    } catch (err) {
      console.warn('Error fetching build details for log modal:', err);
    }
  };

  const handleDownload = (buildId: string, artifactName: string) => {
    const url = `/api/maven/builds/${buildId}/download?artifact=${encodeURIComponent(artifactName)}`;
    window.open(url, '_blank');
  };

  const handleDeleteBuild = async (buildId: string) => {
    if (!confirm('Are you sure you want to delete this build record?')) return;
    try {
      const res = await fetch(`/api/maven/builds/${buildId}`, { method: 'DELETE' });
      if (res.ok) {
        setBuilds(builds.filter((b) => b._id !== buildId));
        if (onRefreshSummary) onRefreshSummary();
      }
    } catch (err) {
      console.warn('Error deleting build:', err);
    }
  };

  const formatDate = (d: string | Date) => {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return '--';
    }
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#111A2E] border border-[#1E293B] rounded-2xl">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <History className="w-4 h-4 text-indigo-400" />
          <span>Maven Build Runs &amp; Audit Logs</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0D1526] border border-[#1E293B] text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="RUNNING">Running</option>
          </select>

          <button
            onClick={fetchBuilds}
            className="p-1.5 rounded-xl bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-400 hover:text-white transition-colors"
            title="Refresh history"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#0E1628]/90 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                <th className="py-3.5 px-4">Build</th>
                <th className="py-3.5 px-3">Branch &amp; Command</th>
                <th className="py-3.5 px-3">Execution Time</th>
                <th className="py-3.5 px-3">Duration</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Artifacts</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span>Loading Maven build history...</span>
                    </div>
                  </td>
                </tr>
              ) : builds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <History className="w-8 h-8 text-slate-600 mb-1" />
                      <p className="font-semibold text-slate-300">No Build History Recorded Yet</p>
                      <p className="text-[11px] text-slate-500">
                        When Maven builds execute, their full audit logs and downloadable artifacts will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                builds.map((b: any) => {
                  const statusNorm = (b.status || '').toUpperCase();
                  const isSuccess = statusNorm === 'SUCCESS';
                  const isFailed = statusNorm === 'FAILED';
                  const isRunning = ['RUNNING', 'QUEUED'].includes(statusNorm);
                  const effectiveProjectName =
                    b.projectName || b.repoUrl?.split('/').pop()?.replace('.git', '') || 'Maven Project';
                  const executionTimestamp = b.startTime || b.startedAt || b.createdAt;

                  return (
                    <tr key={b._id} className="hover:bg-[#141F36]/60 transition-colors">
                      {/* Build Number & Project */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span className="font-mono text-blue-400">#{b.buildNumber}</span>
                            <span>{effectiveProjectName}</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{b._id}</span>
                        </div>
                      </td>

                      {/* Branch & Command */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col max-w-xs">
                          <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                            <GitBranch className="w-2.5 h-2.5" />
                            {b.branch}
                          </span>
                          <span className="font-mono text-[11px] text-slate-300 truncate" title={b.command}>
                            {b.command}
                          </span>
                        </div>
                      </td>

                      {/* Execution Time */}
                      <td className="py-3.5 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(executionTimestamp)}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-3 font-mono font-semibold text-slate-200">
                        {b.durationSeconds > 0 ? `${b.durationSeconds}s` : isRunning ? 'running...' : '--'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {isRunning ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold text-[10px]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>RUNNING</span>
                          </div>
                        ) : isSuccess ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>SUCCESS</span>
                          </div>
                        ) : isFailed ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[10px]">
                            <XCircle className="w-3 h-3" />
                            <span>FAILED</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">{b.status}</span>
                        )}
                      </td>

                      {/* Artifacts */}
                      <td className="py-3.5 px-3">
                        {b.artifacts && b.artifacts.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {b.artifacts.map((art: any, aIdx: number) => (
                              <button
                                key={aIdx}
                                onClick={() => handleDownload(b._id, art.name)}
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline font-mono text-left"
                                title={`Download ${art.name} (${art.sizeFormatted || art.size})`}
                              >
                                <Download className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[130px]">{art.name}</span>
                                <span className="text-slate-500 text-[9px] shrink-0">({art.sizeFormatted || art.size})</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">No Artifacts</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenLogModal(b._id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-300 hover:text-white font-semibold text-[11px] transition-colors"
                            title="View Full Build Output"
                          >
                            <Terminal className="w-3 h-3 text-indigo-400" />
                            <span>Logs</span>
                          </button>

                          <button
                            onClick={() => handleDeleteBuild(b._id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                            title="Delete Build Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Build Log Modal */}
      {viewingBuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1E293B] bg-[#0E1628]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Build #{viewingBuild.buildNumber}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span>{viewingBuild.projectName}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {viewingBuild.command} &bull; Duration: {viewingBuild.durationSeconds}s &bull; Status: {viewingBuild.status}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(viewingBuild.logs || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] text-slate-300 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Logs'}</span>
                </button>

                <button
                  onClick={() => setViewingBuild(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-4 bg-[#000000] overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 select-text">
              <pre className="whitespace-pre-wrap break-all">
                {(viewingBuild.logs || 'No log output recorded.').split('\n').map((line, idx) => {
                  let lineClass = 'text-slate-300';
                  if (line.includes('BUILD SUCCESS')) lineClass = 'text-emerald-400 font-bold';
                  if (line.includes('[ERROR]') || line.includes('FAILED')) lineClass = 'text-rose-400 font-bold';
                  if (line.includes('[WARNING]')) lineClass = 'text-amber-400';
                  if (line.startsWith('[+]')) lineClass = 'text-cyan-300';

                  return (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                      <span className={lineClass}>{line}</span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
