'use client';

import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldAlert,
  Terminal,
  Search,
  Check,
  Copy,
} from 'lucide-react';

interface TerraformPlanTabProps {
  activeProject: any;
  onExecutePlan: () => Promise<any>;
  onSwitchTab: (tab: any) => void;
  lastPlanResult?: any;
}

export function TerraformPlanTab({
  activeProject,
  onExecutePlan,
  onSwitchTab,
  lastPlanResult,
}: TerraformPlanTabProps) {
  const [planning, setPlanning] = useState(false);
  const [result, setResult] = useState<any>(lastPlanResult || null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'create' | 'update' | 'delete'>('all');
  const [copied, setCopied] = useState(false);

  const handleRunPlan = async () => {
    setPlanning(true);
    try {
      const res = await onExecutePlan();
      setResult(res);
    } catch (e: any) {
      setResult({ success: false, error: e.message, logs: e.message });
    } finally {
      setPlanning(false);
    }
  };

  const handleCopyLogs = () => {
    if (result?.logs) {
      navigator.clipboard.writeText(result.logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resourceChanges: any[] = result?.resourceChanges || [];
  const filteredChanges = resourceChanges.filter((r) => {
    if (actionFilter !== 'all' && r.action !== actionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.address?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controller Banner */}
      <div className="bg-[#0D1526]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-300 font-mono">
              terraform plan
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Target: {activeProject?.name} ({activeProject?.currentWorkspace || 'default'} / {activeProject?.environment || 'dev'})
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Infrastructure Execution Plan</h2>
          <p className="text-xs text-gray-400 mt-0.5 max-w-2xl">
            Performs a speculative execution against current state and cloud provider APIs. Displays planned additions, updates, and destructions without modifying actual infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRunPlan}
            disabled={planning}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25"
          >
            <RotateCw className={`w-4 h-4 ${planning ? 'animate-spin' : ''}`} />
            <span>{planning ? 'Generating Plan...' : 'Execute Terraform Plan'}</span>
          </button>
        </div>
      </div>

      {/* Plan Results Summary Strip */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#0D1526]/85 border border-emerald-500/25 rounded-2xl shadow-lg">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
              + To Add
            </span>
            <div className="text-2xl font-black font-mono text-emerald-300 mt-1">
              {result.planSummary?.toAdd ?? 0}
            </div>
            <span className="text-[10px] text-gray-400">Resources to create</span>
          </div>

          <div className="p-4 bg-[#0D1526]/85 border border-amber-500/25 rounded-2xl shadow-lg">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
              ~ To Change
            </span>
            <div className="text-2xl font-black font-mono text-amber-300 mt-1">
              {result.planSummary?.toChange ?? 0}
            </div>
            <span className="text-[10px] text-gray-400">Resources to update in-place</span>
          </div>

          <div className="p-4 bg-[#0D1526]/85 border border-rose-500/25 rounded-2xl shadow-lg">
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
              - To Destroy
            </span>
            <div className="text-2xl font-black font-mono text-rose-300 mt-1">
              {result.planSummary?.toDestroy ?? 0}
            </div>
            <span className="text-[10px] text-gray-400">Resources to terminate</span>
          </div>

          <div className="p-4 bg-[#0D1526]/85 border border-blue-500/25 rounded-2xl shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                Execution Status
              </span>
              <div className="text-sm font-bold font-mono text-white mt-1">
                {result.success ? '✓ Plan Successful' : '✗ Plan Failed'}
              </div>
            </div>
            {result.success && (
              <button
                type="button"
                onClick={() => onSwitchTab('apply')}
                className="mt-2 py-1 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer"
              >
                <span>Proceed to Apply</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resource Changes Table if parsed */}
      {resourceChanges.length > 0 && (
        <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/15 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Proposed Resource Diff ({filteredChanges.length} Resources)
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter diff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#080D1A] border border-[#1E293B] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-[#1E293B]/70 max-h-64 overflow-y-auto font-mono text-xs">
            {filteredChanges.map((rc, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      rc.action === 'create'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : rc.action === 'delete'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {rc.action}
                  </span>
                  <span className="text-white font-bold">{rc.address}</span>
                </div>
                <span className="text-gray-500 text-[11px]">{rc.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Output Terminal Viewer */}
      <div className="bg-[#080D1A] border border-cyan-500/25 rounded-2xl p-4 shadow-xl space-y-2">
        <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Terraform Plan Console Output
            </span>
          </div>

          {result?.logs && (
            <button
              type="button"
              onClick={handleCopyLogs}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>
          )}
        </div>

        <pre className="p-3 text-cyan-300 font-mono text-xs max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap">
          {result?.logs || (planning ? 'Executing terraform plan in isolated project directory...' : 'No plan executed yet. Click "Execute Terraform Plan" above.')}
        </pre>
      </div>
    </div>
  );
}
