'use client';

import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  Play,
  Edit2,
  Trash2,
  Search,
  Upload,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { IAnsiblePlaybookData } from '@/models/AnsiblePlaybook';

interface AnsiblePlaybooksTabProps {
  playbooks: IAnsiblePlaybookData[];
  onCreateClick: () => void;
  onEditClick: (playbook: IAnsiblePlaybookData) => void;
  onDeleteClick: (playbook: IAnsiblePlaybookData) => void;
  onRunClick: (playbook: IAnsiblePlaybookData) => void;
}

export function AnsiblePlaybooksTab({
  playbooks,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onRunClick,
}: AnsiblePlaybooksTabProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = Array.from(new Set(playbooks.map((p) => p.category || 'General')));

  const filtered = playbooks.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Top Filter & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search playbooks by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 transition"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onCreateClick}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create / Upload Playbook</span>
        </button>
      </div>

      {/* Grid of Playbooks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const isSuccess = p.lastRunStatus === 'SUCCESS';
          const isFailed = p.lastRunStatus === 'FAILED';

          return (
            <div
              key={p._id || p.name}
              className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20 hover:border-purple-500/40 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono truncate max-w-[180px]">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">{p.category}</p>
                    </div>
                  </div>

                  {p.isTemplate && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      Template
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mb-4 line-clamp-2 min-h-[32px]">
                  {p.description || p.title}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 py-2 border-y border-[#1E293B]/60 mb-4">
                  <span>Total Runs: <strong className="text-white">{p.totalRuns || 0}</strong></span>
                  {p.lastRunStatus ? (
                    <span
                      className={`flex items-center gap-1 font-semibold ${
                        isSuccess ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{p.lastRunStatus}</span>
                    </span>
                  ) : (
                    <span>Not run yet</span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    onClick={() => onEditClick(p)}
                    title="View & Edit YAML"
                    className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteClick(p)}
                    title="Delete Playbook"
                    className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onRunClick(p)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Run Playbook</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

