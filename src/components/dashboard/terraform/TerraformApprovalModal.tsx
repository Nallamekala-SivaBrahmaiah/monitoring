'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  Clock,
  User,
  Layers,
  ArrowRight,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { AwsLogo, AzureLogo, TerraformLogo } from '@/components/icons/CloudIcons';

interface TerraformApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvals: any[];
  onDecision: (approvalId: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
  loading?: boolean;
}

export function TerraformApprovalModal({
  isOpen,
  onClose,
  approvals,
  onDecision,
  loading = false,
}: TerraformApprovalModalProps) {
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>(approvals[0]?._id || '');
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen) return null;

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const pastApprovals = approvals.filter((a) => a.status !== 'pending');

  const activeApproval =
    approvals.find((a) => a._id === selectedApprovalId) || pendingApprovals[0] || approvals[0];

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!activeApproval) return;
    setActionLoading(true);
    try {
      await onDecision(activeApproval._id, status, notes);
      setNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#090F1E] border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-amber-950/40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-[#090F1E]/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Production Guardrails & Approvals
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                  {pendingApprovals.length} Pending
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Authorize or reject real Terraform Apply or Destroy operations for critical environments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Pending List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Pending Requests</span>
              <span className="text-[10px] text-gray-500 font-mono">{pendingApprovals.length} total</span>
            </h3>

            {pendingApprovals.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#0D1526]/40 border border-gray-800 text-xs text-gray-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                No approvals currently pending. Production environments are safe.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {pendingApprovals.map((req) => (
                  <button
                    key={req._id}
                    onClick={() => setSelectedApprovalId(req._id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      activeApproval?._id === req._id
                        ? 'border-amber-500/60 bg-amber-500/10 text-white shadow-md'
                        : 'border-gray-800 bg-[#0D1526]/60 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white font-mono">
                        {req.projectName || 'Project'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                          req.operation === 'destroy'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {req.operation}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="capitalize">{req.environment}</span>
                      <span>•</span>
                      <span>ws: {req.workspace}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Past Approvals Summary */}
            {pastApprovals.length > 0 && (
              <div className="pt-3 border-t border-gray-800 space-y-2">
                <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Recent Decisions
                </h4>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 text-xs">
                  {pastApprovals.slice(0, 5).map((p) => (
                    <div
                      key={p._id}
                      className="p-2 rounded-lg bg-[#070C18] border border-gray-800 flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <div className="font-mono text-gray-300 truncate">{p.projectName}</div>
                        <div className="text-[10px] text-gray-500">by {p.decidedBy || 'Admin'}</div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold font-mono ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Active Approval Inspection & Decision */}
          <div className="md:col-span-2 space-y-4">
            {activeApproval ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#0D1526] border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400">Target Project</div>
                      <div className="text-base font-bold text-white font-mono flex items-center gap-2">
                        <TerraformLogo className="w-4 h-4" />
                        <span>{activeApproval.projectName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Environment</div>
                      <span className="text-xs px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-mono font-bold uppercase">
                        {activeApproval.environment}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-800/80 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-black/30 border border-gray-800">
                      <div className="text-[10px] text-gray-500 uppercase">Operation</div>
                      <div className="font-bold text-white uppercase text-amber-400">
                        {activeApproval.operation}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/30 border border-gray-800">
                      <div className="text-[10px] text-gray-500 uppercase">Workspace</div>
                      <div className="font-bold text-white">{activeApproval.workspace}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/30 border border-gray-800">
                      <div className="text-[10px] text-gray-500 uppercase">Requested By</div>
                      <div className="font-bold text-white truncate">
                        {activeApproval.requestedBy || 'Lead Architect'}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/30 border border-gray-800">
                      <div className="text-[10px] text-gray-500 uppercase">Diff Summary</div>
                      <div className="font-bold text-white text-[11px]">
                        +{activeApproval.changes?.add || 0} ~{activeApproval.changes?.change || 0} -{activeApproval.changes?.destroy || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan Summary / Diff */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Plan Diff Details</span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#070C18] border border-gray-800 font-mono text-xs text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {activeApproval.planSummary ||
                      'Terraform will perform the planned actions on real AWS/Azure infrastructure.\nReview changes carefully before authorizing.'}
                  </pre>
                </div>

                {/* Review Notes / Decision Box */}
                {activeApproval.status === 'pending' ? (
                  <div className="space-y-3 pt-2 border-t border-gray-800">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                        Approval Notes / Reasoning
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Approved following architectural review and maintenance window sign-off"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#070C18] border border-gray-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleAction('rejected')}
                        disabled={actionLoading}
                        className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Execution</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction('approved')}
                        disabled={actionLoading}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Authorize</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#0D1526] border border-gray-800 flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      This request was {activeApproval.status} on{' '}
                      {new Date(activeApproval.decidedAt || Date.now()).toLocaleString()}
                    </span>
                    <span
                      className={`font-mono uppercase font-bold px-2 py-0.5 rounded ${
                        activeApproval.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {activeApproval.status}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#0D1526]/40 border border-gray-800 text-gray-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2 opacity-40" />
                <p className="text-sm font-semibold text-gray-400">All Requests Up To Date</p>
                <p className="text-xs text-gray-500 mt-1">
                  Select an approval request to view execution diff details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
