'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Download,
  Check,
  Search,
  Filter,
  Layers,
} from 'lucide-react';

interface TerraformLogsTabProps {
  activeProject: any;
  recentExecutions: any[];
  selectedExecution: any;
}

export function TerraformLogsTab({
  activeProject,
  recentExecutions,
  selectedExecution,
}: TerraformLogsTabProps) {
  const [currentExecution, setCurrentExecution] = useState<any>(
    selectedExecution || recentExecutions[0] || null
  );
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const rawLogs = currentExecution?.logs || 'No execution logs selected.';

  const handleCopy = () => {
    navigator.clipboard.writeText(rawLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([rawLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terraform-${currentExecution?.projectName || 'log'}-${currentExecution?.operation || 'run'}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-purple-400" />
            <span>Terraform Execution Logs &amp; Audit Inspector</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Full stdout/stderr output from Terraform Init, Validate, Plan, Apply, and Destroy runs with automated secret masking.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-gray-300 border border-[#1E293B] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-3.5 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Select Execution Dropdown Bar */}
      {recentExecutions.length > 0 && (
        <div className="bg-[#0D1526]/90 border border-[#1E293B] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Select Run:</span>
            <select
              value={currentExecution?._id || ''}
              onChange={(e) => {
                const ex = recentExecutions.find((r) => r._id === e.target.value);
                if (ex) setCurrentExecution(ex);
              }}
              className="bg-[#080D1A] border border-[#1E293B] rounded-lg px-2.5 py-1 text-white font-mono"
            >
              {recentExecutions.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  [{ex.status.toUpperCase()}] {ex.projectName} — terraform {ex.operation} ({new Date(ex.startedAt).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>

          {currentExecution && (
            <div className="flex items-center gap-3 font-mono text-[11px] text-gray-400">
              <span>Status: <strong className={currentExecution.status === 'successful' ? 'text-emerald-400' : 'text-rose-400'}>{currentExecution.status}</strong></span>
              <span>•</span>
              <span>Duration: {(currentExecution.durationMs / 1000).toFixed(1)}s</span>
              <span>•</span>
              <span>Workspace: {currentExecution.workspace || 'default'}</span>
            </div>
          )}
        </div>
      )}

      {/* Terminal Viewport */}
      <div className="bg-[#080D1A] border border-purple-500/25 rounded-2xl p-5 shadow-2xl">
        <pre className="text-cyan-300 font-mono text-xs max-h-[500px] overflow-y-auto leading-relaxed whitespace-pre-wrap selection:bg-purple-600/40">
          {rawLogs}
        </pre>
      </div>
    </div>
  );
}
