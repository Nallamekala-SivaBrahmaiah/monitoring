'use client';

import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Terminal,
  Trash2,
  Check,
  Copy,
  Lock,
} from 'lucide-react';

interface TerraformApplyTabProps {
  activeProject: any;
  onExecuteApply: () => Promise<any>;
  onExecuteDestroy: () => Promise<any>;
  onSwitchTab: (tab: any) => void;
  lastPlanResult?: any;
}

export function TerraformApplyTab({
  activeProject,
  onExecuteApply,
  onExecuteDestroy,
  onSwitchTab,
  lastPlanResult,
}: TerraformApplyTabProps) {
  const [applying, setApplying] = useState(false);
  const [destroying, setDestroying] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const [destroyConfirmText, setDestroyConfirmText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const isProduction = activeProject?.environment === 'production';

  const handleApply = async () => {
    if (isProduction) {
      const confirmProd = confirm(
        `WARNING: You are about to apply changes to the PRODUCTION environment (${activeProject?.name}). Do you want to proceed?`
      );
      if (!confirmProd) return;
    }

    setApplying(true);
    try {
      const res = await onExecuteApply();
      setResult(res);
    } catch (e: any) {
      setResult({ success: false, error: e.message, logs: e.message });
    } finally {
      setApplying(false);
    }
  };

  const handleDestroy = async () => {
    if (destroyConfirmText !== activeProject?.name) {
      alert(`Please type '${activeProject?.name}' exactly to confirm destruction.`);
      return;
    }

    setDestroying(true);
    setShowDestroyConfirm(false);
    try {
      const res = await onExecuteDestroy();
      setResult(res);
    } catch (e: any) {
      setResult({ success: false, error: e.message, logs: e.message });
    } finally {
      setDestroying(false);
      setDestroyConfirmText('');
    }
  };

  const handleCopyLogs = () => {
    if (result?.logs) {
      navigator.clipboard.writeText(result.logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0D1526]/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 font-mono">
              terraform apply
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Target: {activeProject?.name} ({activeProject?.currentWorkspace || 'default'} / {activeProject?.environment || 'dev'})
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Infrastructure Provisioning &amp; Release</h2>
          <p className="text-xs text-gray-400 mt-0.5 max-w-2xl">
            Provisions live cloud resources on {activeProject?.provider?.toUpperCase() || 'AWS'} matching your compiled HCL state. Executes non-interactive automated apply with isolated credentials and secret masking.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowDestroyConfirm(true)}
            className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Destroy Infrastructure</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={applying || destroying}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25"
          >
            <Play className={`w-4 h-4 fill-slate-950 ${applying ? 'animate-pulse' : ''}`} />
            <span>{applying ? 'Applying Changes...' : 'Execute Terraform Apply'}</span>
          </button>
        </div>
      </div>

      {/* Production Warning Notice */}
      {isProduction && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <strong className="font-bold uppercase tracking-wider block">Production Guard Active</strong>
            <span>You are targeting a production infrastructure workspace. Ensure all changes have been audited in the Plan tab before triggering apply.</span>
          </div>
        </div>
      )}

      {/* Execution Status Banner */}
      {result && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            result.success
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            )}
            <div>
              <span className="font-bold text-sm block">
                {result.success ? '✓ Apply Completed Successfully' : '✗ Apply Encountered Errors'}
              </span>
              <span className="text-[11px] opacity-80">
                Duration: {(result.durationMs / 1000).toFixed(1)}s • Exit Code: {result.exitCode}
              </span>
            </div>
          </div>

          {result.success && (
            <button
              type="button"
              onClick={() => onSwitchTab('outputs')}
              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold cursor-pointer"
            >
              View Provisioned Outputs &rarr;
            </button>
          )}
        </div>
      )}

      {/* Apply Live Console */}
      <div className="bg-[#080D1A] border border-emerald-500/25 rounded-2xl p-4 shadow-xl space-y-2">
        <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Terraform Apply Live Console
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

        <pre className="p-3 text-emerald-300 font-mono text-xs max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap">
          {result?.logs || (applying ? 'Applying changes to cloud infrastructure... Please do not close this window.' : 'No apply execution currently running. Click "Execute Terraform Apply" to start.')}
        </pre>
      </div>

      {/* Destroy Confirmation Modal */}
      {showDestroyConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-rose-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 border-b border-rose-500/20 pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Confirm Infrastructure Destruction</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              WARNING: This operation will run <strong className="text-rose-400 font-mono">terraform destroy</strong> against project <strong className="text-white font-mono">{activeProject?.name}</strong> in workspace <strong className="text-white font-mono">{activeProject?.currentWorkspace || 'default'}</strong>. All managed cloud resources will be permanently deleted.
            </p>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-gray-300 block">
                Type <strong className="text-rose-400 font-mono">{activeProject?.name}</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder={activeProject?.name}
                value={destroyConfirmText}
                onChange={(e) => setDestroyConfirmText(e.target.value)}
                className="w-full bg-[#080D1A] border border-rose-500/30 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-400 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowDestroyConfirm(false);
                  setDestroyConfirmText('');
                }}
                className="px-4 py-2 bg-slate-800 text-gray-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDestroy}
                disabled={destroyConfirmText !== activeProject?.name}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Confirm Destroy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
