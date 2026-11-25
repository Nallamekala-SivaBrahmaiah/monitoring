'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Check,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  ArrowRight,
  Database,
  Zap,
  RotateCw,
} from 'lucide-react';

interface TerraformWorkspacesTabProps {
  activeProject: any;
  onSwitchWorkspace: (ws: string) => Promise<void>;
  onCreateWorkspace: (ws: string) => Promise<void>;
  onDeleteWorkspace?: (ws: string) => Promise<void>;
}

export function TerraformWorkspacesTab({
  activeProject,
  onSwitchWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
}: TerraformWorkspacesTabProps) {
  const [newWsName, setNewWsName] = useState('');
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [localCreatedWorkspaces, setLocalCreatedWorkspaces] = useState<string[]>([]);

  // Consolidate project workspaces + locally created workspaces
  const workspaces: string[] = useMemo(() => {
    const list = new Set<string>(['default']);
    if (activeProject?.workspaces && Array.isArray(activeProject.workspaces)) {
      activeProject.workspaces.forEach((w: string) => list.add(w));
    }
    localCreatedWorkspaces.forEach((w) => list.add(w));
    return Array.from(list);
  }, [activeProject?.workspaces, localCreatedWorkspaces]);

  const currentWs: string = activeProject?.currentWorkspace || 'default';

  const handleCreate = async (nameToCreate?: string) => {
    const target = (nameToCreate || newWsName).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!target) return;

    setCreating(true);
    // Optimistically record so it displays immediately no matter what
    setLocalCreatedWorkspaces((prev) => Array.from(new Set([...prev, target])));
    try {
      await onCreateWorkspace(target);
      setNewWsName('');
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleSwitch = async (ws: string) => {
    if (ws === currentWs) return;
    setSwitching(ws);
    try {
      await onSwitchWorkspace(ws);
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(null);
    }
  };

  const handleDelete = async (ws: string) => {
    if (ws === 'default' || ws === currentWs) return;
    if (!confirm(`Are you sure you want to delete workspace '${ws}'?`)) return;

    setDeleting(ws);
    try {
      if (onDeleteWorkspace) {
        await onDeleteWorkspace(ws);
      }
      setLocalCreatedWorkspaces((prev) => prev.filter((w) => w !== ws));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  const quickPresets = ['dev', 'staging', 'production', 'dr-backup', 'qa-testing'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">
              Terraform Workspace Isolation Center
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage isolated Terraform state environments (default, dev, staging, prod). Any workspace created here or in CLI will be displayed and tracked.
          </p>
        </div>

        {/* Add Workspace Form */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="New workspace (e.g. staging)"
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            className="bg-[#080D1A] border border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono min-w-[200px]"
          />
          <button
            type="button"
            onClick={() => handleCreate()}
            disabled={creating || !newWsName.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-purple-950/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{creating ? 'Creating...' : 'Create Workspace'}</span>
          </button>
        </div>
      </div>

      {/* Quick Preset Badges */}
      <div className="flex items-center gap-2 flex-wrap text-xs bg-[#090F1E] p-3 rounded-2xl border border-gray-800">
        <span className="text-gray-400 font-medium flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Create Environment:</span>
        </span>
        {quickPresets.map((preset) => {
          const exists = workspaces.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => !exists && handleCreate(preset)}
              disabled={exists || creating}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition flex items-center gap-1 ${
                exists
                  ? 'bg-[#0D1526] text-gray-500 border border-gray-800 cursor-default'
                  : 'bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 cursor-pointer'
              }`}
            >
              {exists ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3" />}
              <span>{preset}</span>
            </button>
          );
        })}
      </div>

      {/* Workspaces List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((ws) => {
          const isActive = ws === currentWs;
          return (
            <div
              key={ws}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'bg-[#0D1526] border-cyan-500/60 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                  : 'bg-[#0D1526]/75 border-[#1E293B] hover:border-gray-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                    <span className="font-mono font-bold text-sm text-white">{ws}</span>
                  </div>

                  {isActive ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ACTIVE WORKSPACE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono text-gray-500 uppercase bg-[#080D1A] border border-gray-800">
                      INACTIVE
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  {ws === 'default'
                    ? 'Default baseline workspace for standard infrastructure configurations.'
                    : `Isolated workspace for '${ws}' state isolation and separate cloud resource tracking.`}
                </p>

                <div className="p-2.5 rounded-xl bg-[#080D1A] text-[11px] text-gray-400 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>State Storage Path:</span>
                    <span className="text-cyan-300">terraform.tfstate.d/{ws}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Project:</span>
                    <span className="text-white">{activeProject?.name || 'Current'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lock Status:</span>
                    <span className="text-emerald-400">Unlocked &amp; Ready</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between">
                <div>
                  {!isActive && ws !== 'default' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(ws)}
                      disabled={deleting === ws}
                      className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1 cursor-pointer"
                      title="Delete Workspace"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deleting === ws ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  )}
                </div>

                {!isActive ? (
                  <button
                    type="button"
                    onClick={() => handleSwitch(ws)}
                    disabled={switching === ws}
                    className="px-3 py-1 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {switching === ws ? 'Switching...' : 'Switch Workspace'}
                  </button>
                ) : (
                  <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Currently Active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
