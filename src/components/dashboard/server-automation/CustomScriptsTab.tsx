'use client';

import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Plus,
  Play,
  Save,
  Trash2,
  Edit2,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Server,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';

interface CustomScriptsTabProps {
  servers: any[];
  selectedServerId: string;
  onSelectServerId: (id: string) => void;
  onExecuteScript: (scriptId: string, serverId: string) => void;
}

export function CustomScriptsTab({
  servers,
  selectedServerId,
  onSelectServerId,
  onExecuteScript,
}: CustomScriptsTabProps) {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<any | null>(null);

  // Editor states
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('custom');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Run modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [runServerId, setRunServerId] = useState(selectedServerId || (servers[0]?._id || ''));

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/server-automation/scripts');
      const data = await res.json();
      if (data.scripts) {
        setScripts(data.scripts);
        if (!selectedScript && data.scripts.length > 0) {
          selectScriptForViewing(data.scripts[0]);
        }
      }
    } catch (err) {
      console.error('Fetch scripts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const selectScriptForViewing = (s: any) => {
    setIsCreatingNew(false);
    setSelectedScript(s);
    setEditName(s.name || '');
    setEditDesc(s.description || '');
    setEditCategory(s.category || 'custom');
    setEditContent(s.content || '');
    setSaveError(null);
    setSaveSuccess(false);
  };

  const startCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedScript(null);
    setEditName('New-DevOps-Automation.sh');
    setEditDesc('Custom automation bash routine');
    setEditCategory('custom');
    setEditContent(`#!/usr/bin/env bash
# ==============================================================================
# Custom DevOps Automation Routine
# ==============================================================================
set -e

echo "Starting automated routine..."

# Add your bash commands here
uname -a
whoami
uptime

echo "Automation routine completed successfully!"
`);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      setSaveError('Script name is required.');
      return;
    }
    if (!editContent.trim()) {
      setSaveError('Script content cannot be empty.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const isUpdate = Boolean(selectedScript && !isCreatingNew);
      const url = isUpdate
        ? `/api/server-automation/scripts/${selectedScript._id}`
        : '/api/server-automation/scripts';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          category: editCategory,
          content: editContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save script');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);

      await fetchScripts();
      if (data.script) {
        selectScriptForViewing(data.script);
      }
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom script?')) return;
    try {
      const res = await fetch(`/api/server-automation/scripts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchScripts();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleExecute = () => {
    if (!selectedScript || !runServerId) return;
    setShowRunModal(false);
    onExecuteScript(selectedScript._id, runServerId);
  };

  return (
    <div className="space-y-6">
      {/* 2-Column Layout: Script Sidebar & Live Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Directory List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Scripts Library</h3>
              <p className="text-xs text-slate-400">Reusable .sh routines</p>
            </div>
            <button
              type="button"
              onClick={startCreateNew}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New .sh</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading scripts...</div>
            ) : scripts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No scripts found.</div>
            ) : (
              scripts.map((s) => {
                const isSelected = selectedScript?._id === s._id && !isCreatingNew;

                return (
                  <div
                    key={s._id}
                    onClick={() => selectScriptForViewing(s)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#121F38] border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-[#0D1526]/90 hover:bg-[#111A2E] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span
                          className={`font-bold text-xs truncate ${
                            isSelected ? 'text-white' : 'text-slate-200'
                          }`}
                        >
                          {s.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{s.description || 'No description'}</p>

                      <div className="flex items-center gap-2 pt-0.5 text-[10px] font-mono">
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 uppercase">
                          {s.category || 'custom'}
                        </span>
                        {s.isBuiltIn && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300">
                            Built-in
                          </span>
                        )}
                        {s.executionCount !== undefined && s.executionCount > 0 && (
                          <span className="text-slate-400">Ran {s.executionCount}x</span>
                        )}
                      </div>
                    </div>

                    {!s.isBuiltIn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s._id);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        title="Delete script"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: In-Browser Script Editor & Execution Bar */}
        <div className="lg:col-span-8 bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Top Editor Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  {isCreatingNew ? 'Create New Script' : 'Script Editor & Remote Dispatcher'}
                </span>
                {saveSuccess && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold font-mono">
                    Saved ✓
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isSaving ? 'Saving...' : 'Save Script'}</span>
                </button>

                {selectedScript && (
                  <button
                    type="button"
                    onClick={() => {
                      setRunServerId(selectedServerId || servers[0]?._id || '');
                      setShowRunModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Execute on Server</span>
                  </button>
                )}
              </div>
            </div>

            {saveError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                {saveError}
              </div>
            )}

            {/* Script Metadata Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Script Name (.sh)</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. system-cleanup.sh"
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="custom">Custom</option>
                  <option value="system">System Maintenance</option>
                  <option value="devops">DevOps & CI/CD</option>
                  <option value="docker">Docker & Containers</option>
                  <option value="security">Security & Hardening</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Brief description of script operations..."
                className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Monospace Code Editor Area */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="font-semibold text-slate-300">Bash Commands & Logic</label>
                <span className="font-mono text-[11px] text-slate-500">
                  {editContent.split('\n').length} lines • {editContent.length} chars
                </span>
              </div>
              <textarea
                rows={16}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="#!/usr/bin/env bash&#10;# Write your Linux shell script commands here..."
                className="w-full p-4 bg-[#060A14] border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Execute Script Modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-cyan-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                <h3 className="font-bold text-sm text-white">Execute Custom Script</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRunModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white transition"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-slate-400">Script to run:</span>
                <p className="font-bold text-sm text-white font-mono mt-0.5">{selectedScript?.name}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Select Target Remote Server</label>
                <select
                  value={runServerId}
                  onChange={(e) => setRunServerId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {servers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.publicIp || s.host}) • {s.environment || 'prod'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-200 text-[11px]">
                Upon confirmation, this script will be executed directly on the remote host over SSH and will stream live terminal output.
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#090F1C] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRunModal(false)}
                className="px-4 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Execute Script</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
