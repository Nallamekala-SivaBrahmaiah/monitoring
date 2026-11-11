'use client';

import React, { useState } from 'react';
import { Terminal, Copy, CheckCheck, Trash2, Download, RefreshCw } from 'lucide-react';
import { IAnsibleExecutionData } from '@/models/AnsibleExecution';

interface AnsibleLogsTabProps {
  executions: IAnsibleExecutionData[];
  selectedExecution: IAnsibleExecutionData | null;
  onSelectExecution: (exec: IAnsibleExecutionData) => void;
  onRefresh: () => void;
}

export function AnsibleLogsTab({
  executions,
  selectedExecution,
  onSelectExecution,
  onRefresh,
}: AnsibleLogsTabProps) {
  const [copied, setCopied] = useState(false);

  const active = selectedExecution || executions[0] || null;

  const handleCopy = () => {
    if (!active?.logs) return;
    navigator.clipboard.writeText(active.logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!active?.logs) return;
    const blob = new Blob([active.logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ansible-${active.jobId || 'log'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 shadow-lg shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Live Execution Logs</h3>
            <p className="text-xs text-slate-400">
              {active ? `Viewing Job: ${active.jobId} (${active.playbookName})` : 'No execution selected'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Execution Selector */}
          <select
            value={active?._id || ''}
            onChange={(e) => {
              const found = executions.find((ex) => ex._id === e.target.value);
              if (found) onSelectExecution(found);
            }}
            className="px-3 py-1.5 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 max-w-xs truncate"
          >
            {executions.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.jobId} - {ex.playbookName} on {ex.hostName} ({ex.status})
              </option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            title="Refresh Logs"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            disabled={!active?.logs}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!active?.logs}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-2xl min-h-[480px] max-h-[650px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
        {active ? (
          active.logs || 'Waiting for log output...'
        ) : (
          <div className="py-24 text-center text-slate-500 font-sans">
            No execution jobs found. Run a playbook from the Overview tab to view live streaming logs.
          </div>
        )}
      </div>
    </div>
  );
}

