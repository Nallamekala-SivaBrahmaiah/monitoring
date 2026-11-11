'use client';

import React from 'react';
import {
  Play,
  Edit2,
  Trash2,
  Folder,
  GitBranch,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
} from 'lucide-react';
import { MavenLogo } from '@/components/icons/CloudIcons';
import { IMavenProjectData } from '@/models/MavenProject';

interface MavenProjectsTableProps {
  projects: IMavenProjectData[];
  loading: boolean;
  onRefresh: () => void;
  onEdit: (project: IMavenProjectData) => void;
  onDelete: (id: string, name: string) => void;
  onRunBuild: (project: IMavenProjectData) => void;
  onRunApp?: (project: IMavenProjectData) => void;
  runningProjectId?: string | null;
}

export function MavenProjectsTable({
  projects,
  loading,
  onRefresh,
  onEdit,
  onDelete,
  onRunBuild,
  onRunApp,
  runningProjectId,
}: MavenProjectsTableProps) {
  const formatDate = (d?: string | Date | null) => {
    if (!d) return '--';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '--';
    }
  };

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl text-xs select-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1E293B] bg-[#0E1628]/90 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              <th className="py-3.5 px-4">Project</th>
              <th className="py-3.5 px-3">Repository &amp; Branch</th>
              <th className="py-3.5 px-3">JDK / Maven</th>
              <th className="py-3.5 px-3">Last Build</th>
              <th className="py-3.5 px-3">Total Builds</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/60 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Loading Maven projects...</span>
                  </div>
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="w-8 h-8 text-slate-600 mb-1" />
                    <p className="font-semibold text-slate-300">No Maven Projects Configured</p>
                    <p className="text-[11px] text-slate-500">
                      Click &quot;Add Maven Project&quot; to configure your first Java repository.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              projects.map((p) => {
                const isRunning = runningProjectId === p._id || p.lastBuildStatus === 'RUNNING';
                const isSuccess = p.lastBuildStatus === 'SUCCESS';
                const isFailed = p.lastBuildStatus === 'FAILED';

                return (
                  <tr key={p._id} className="hover:bg-[#141F36]/60 transition-colors">
                    {/* Project Name & Subfolder */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0D1526] border border-[#1E293B] flex items-center justify-center shrink-0">
                          <MavenLogo className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 block">{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Folder className="w-2.5 h-2.5 text-amber-400" />
                            {p.projectFolder || '.'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Repository & Branch */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col max-w-xs">
                        <span
                          className="font-mono text-[11px] text-blue-400 hover:text-blue-300 truncate"
                          title={p.repositoryUrl}
                        >
                          {p.repositoryUrl.replace(/^https:\/\/(www\.)?github\.com\//, '')}
                        </span>
                        <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1 mt-0.5">
                          <GitBranch className="w-2.5 h-2.5" />
                          {p.branch || 'main'}
                        </span>
                      </div>
                    </td>

                    {/* JDK & Maven Versions */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-semibold">{p.jdkVersion || 'Java 21'}</span>
                        <span className="text-slate-500 text-[10px]">Maven {p.mavenVersion || '3.9'}</span>
                      </div>
                    </td>

                    {/* Last Build Status & Time */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
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
                          <span className="text-slate-500 text-[10px]">Not Built Yet</span>
                        )}

                        {p.lastBuildAt && (
                          <span className="text-slate-400 text-[10px]">
                            {p.lastBuildDuration ? `${p.lastBuildDuration}s` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        {formatDate(p.lastBuildAt)}
                      </span>
                    </td>

                    {/* Total Builds */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-slate-200 bg-[#0D1526] px-2 py-1 rounded-md border border-[#1E293B]">
                        {p.totalBuilds || 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isSuccess && onRunApp && (
                          <button
                            onClick={() => onRunApp(p)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border border-teal-500/30 font-semibold text-[11px] transition-colors"
                            title="Run Built Application"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Run App</span>
                          </button>
                        )}

                        <button
                          onClick={() => onRunBuild(p)}
                          disabled={isRunning}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px] transition-colors disabled:opacity-40"
                          title="Run Maven Build"
                        >
                          <Play className="w-3 h-3" />
                          <span>Build</span>
                        </button>

                        <button
                          onClick={() => onEdit(p)}
                          className="p-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-400 hover:text-white transition-colors"
                          title="Edit Configuration"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDelete(p._id, p.name)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                          title="Delete Project"
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
  );
}

