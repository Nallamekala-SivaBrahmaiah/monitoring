'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, Server, FileCode, Terminal, Copy, CheckCheck, RefreshCw } from 'lucide-react';
import { IAnsibleExecutionData } from '@/models/AnsibleExecution';

interface ExecutionDetailModalProps {
  execution: IAnsibleExecutionData | null;
  onClose: () => void;
  onRerun?: (execution: IAnsibleExecutionData) => void;
}

export function ExecutionDetailModal({
  execution,
  onClose,
  onRerun,
}: ExecutionDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!execution) return null;

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(execution.logs || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = execution.status === 'SUCCESS';
  const isRunning = execution.status === 'RUNNING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-2xl p-6 text-slate-100 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isSuccess
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : isRunning
                  ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isRunning ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Job {execution.jobId}</h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    isSuccess
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : isRunning
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {execution.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Playbook: <span className="text-slate-200">{execution.playbookName}</span> on{' '}
                <span className="text-slate-200">{execution.hostName}</span> ({execution.hostIp})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 shrink-0">
          <div className="p-3 bg-[#111A2E] rounded-xl border border-[#1E293B]">
            <p className="text-[11px] text-slate-400">Execution Time</p>
            <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{execution.durationSeconds}s</span>
            </p>
          </div>

          <div className="p-3 bg-[#111A2E] rounded-xl border border-[#1E293B]">
            <p className="text-[11px] text-slate-400">Target Server</p>
            <p className="text-sm font-bold text-white mt-0.5 truncate flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>{execution.hostName}</span>
            </p>
          </div>

          <div className="p-3 bg-[#111A2E] rounded-xl border border-[#1E293B]">
            <p className="text-[11px] text-slate-400">Tasks Succeeded</p>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">
              ok={execution.recap?.ok || 0} / changed={execution.recap?.changed || 0}
            </p>
          </div>

          <div className="p-3 bg-[#111A2E] rounded-xl border border-[#1E293B]">
            <p className="text-[11px] text-slate-400">Tasks Failed</p>
            <p className={`text-sm font-bold mt-0.5 ${(execution.recap?.failed || 0) > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              failed={execution.recap?.failed || 0}
            </p>
          </div>
        </div>

        {/* Tasks Breakdown */}
        {execution.tasks && execution.tasks.length > 0 && (
          <div className="mb-4 shrink-0">
            <p className="text-xs font-semibold text-slate-300 mb-2">Executed Tasks ({execution.tasks.length})</p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {execution.tasks.map((t, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] text-xs flex items-center justify-between"
                >
                  <span className="font-mono text-slate-200 truncate">{t.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.durationMs !== undefined && (
                      <span className="text-[10px] text-slate-400">{t.durationMs}ms</span>
                    )}
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        t.status === 'ok'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : t.status === 'changed'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs Console */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Full Output Logs</span>
            </span>
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Logs'}</span>
            </button>
          </div>
          <div className="flex-1 bg-[#0A0F1D] border border-slate-800 rounded-xl p-3.5 overflow-y-auto font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
            {execution.logs || 'No log output captured.'}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B] mt-4 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
          >
            Close
          </button>
          {onRerun && (
            <button
              onClick={() => {
                onClose();
                onRerun(execution);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Job</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

