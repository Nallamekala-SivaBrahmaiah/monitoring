'use client';

import React, { useState } from 'react';
import {
  Server,
  Plus,
  Settings,
  Play,
  Terminal,
  FileCode,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  List,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IAnsibleHostData } from '@/models/AnsibleHost';
import { IAnsiblePlaybookData } from '@/models/AnsiblePlaybook';
import { IAnsibleExecutionData } from '@/models/AnsibleExecution';

interface AnsibleOverviewTabProps {
  hosts: IAnsibleHostData[];
  playbooks: IAnsiblePlaybookData[];
  latestExecution: IAnsibleExecutionData | null;
  onAddHostClick: () => void;
  onEditHostClick: (host: IAnsibleHostData) => void;
  onDeleteHostClick: (host: IAnsibleHostData) => void;
  onManagePlaybooksClick: () => void;
  onRunPlaybookClick: (playbook: IAnsiblePlaybookData) => void;
  onQuickRun: (hostId: string, playbookId: string, extraVars: string) => Promise<void>;
  onViewAllLogsClick: () => void;
  runningJob: boolean;
}

export function AnsibleOverviewTab({
  hosts,
  playbooks,
  latestExecution,
  onAddHostClick,
  onEditHostClick,
  onDeleteHostClick,
  onManagePlaybooksClick,
  onRunPlaybookClick,
  onQuickRun,
  onViewAllLogsClick,
  runningJob,
}: AnsibleOverviewTabProps) {
  const [selectedHostId, setSelectedHostId] = useState<string>(hosts[0]?._id || '');
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>(playbooks[0]?._id || '');
  const [extraVars, setExtraVars] = useState<string>('');
  const [running, setRunning] = useState<boolean>(false);

  // Sync default selection if hosts or playbooks load asynchronously
  React.useEffect(() => {
    if (!selectedHostId && hosts.length > 0) {
      setSelectedHostId(hosts[0]._id || '');
    }
  }, [hosts, selectedHostId]);

  React.useEffect(() => {
    if (!selectedPlaybookId && playbooks.length > 0) {
      setSelectedPlaybookId(playbooks[0]._id || '');
    }
  }, [playbooks, selectedPlaybookId]);

  const handleRunFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostId || !selectedPlaybookId) return;

    setRunning(true);
    try {
      await onQuickRun(selectedHostId, selectedPlaybookId, extraVars);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* ================= LEFT COLUMN ================= */}
      <div className="space-y-5">
        {/* Card 1: Managed Nodes Fleet */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Managed Nodes Fleet</h3>
                <p className="text-[11px] text-slate-400">Active target cloud instances</p>
              </div>
            </div>
            <button
              onClick={onAddHostClick}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>
          </div>

          {/* Hosts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-[#1E293B] text-[11px] font-semibold">
                  <th className="pb-2.5 font-medium">Node Name</th>
                  <th className="pb-2.5 font-medium">IP Address</th>
                  <th className="pb-2.5 font-medium">Cloud</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/50">
                {hosts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      <div className="max-w-xs mx-auto">
                        <p className="font-semibold text-slate-300">No Managed Nodes Configured</p>
                        <p className="text-[11px] text-slate-500 mt-1 mb-3">
                          Connect your AWS EC2 instances or Azure VMs to execute playbooks.
                        </p>
                        <button
                          onClick={onAddHostClick}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-semibold border border-blue-500/40 inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Managed Node</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  hosts.slice(0, 5).map((host) => {
                    const isConnected = host.status === 'Connected';
                    const isAuthFailed = host.status === 'Authentication Failed';

                    return (
                      <tr key={host._id || host.name} className="hover:bg-[#16233F]/50 transition group">
                        <td className="py-3 font-medium text-white flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isConnected
                                ? 'bg-emerald-400'
                                : isAuthFailed
                                ? 'bg-amber-400'
                                : 'bg-slate-500'
                            }`}
                          ></span>
                          <span className="truncate max-w-[130px]" title={host.name}>
                            {host.name}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300 font-mono text-[11px]">{host.ip}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            {host.provider === 'aws' ? (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#FF9900]">
                                <AwsLogo className="w-3.5 h-3.5" />
                                <span>AWS</span>
                              </span>
                            ) : host.provider === 'azure' ? (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#0089D6]">
                                <AzureLogo className="w-3.5 h-3.5" />
                                <span>Azure</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                                <span>🐧</span>
                                <span>Linux</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              isConnected
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isAuthFailed
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {host.status}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            <button
                              onClick={() => onEditHostClick(host)}
                              title="Edit Node"
                              className="hover:text-blue-400 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteHostClick(host)}
                              title="Delete Node"
                              className="hover:text-rose-400 transition"
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

        {/* Card 2: Available Playbooks */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileCode className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">Available Playbooks</h3>
            </div>
            <button
              onClick={onManagePlaybooksClick}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Manage</span>
            </button>
          </div>

          {/* Playbooks List */}
          <div className="space-y-2.5">
            {playbooks.slice(0, 4).map((playbook) => (
              <div
                key={playbook._id || playbook.name}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0D1527] border border-[#1E293B] hover:border-indigo-500/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/20 transition">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white font-mono">{playbook.name}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-xs">{playbook.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => onRunPlaybookClick(playbook)}
                  className="px-3 py-1 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition"
                >
                  Run
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= RIGHT COLUMN ================= */}
      <div className="space-y-5">
        {/* Card 1: Run Ansible Playbook */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Play className="w-4 h-4 fill-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Run Ansible Playbook</h3>
              <p className="text-[11px] text-slate-400">Deploy from Controller to target managed nodes</p>
            </div>
          </div>

          <form onSubmit={handleRunFormSubmit} className="space-y-3.5">
            {/* Select Server */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300 w-36 shrink-0">Target Node(s):</label>
              {hosts.length === 0 ? (
                <div className="flex-1 px-3 py-2 bg-[#1A253F] border border-slate-700/80 rounded-xl text-xs text-slate-400">
                  No managed nodes available. Please add a node first.
                </div>
              ) : (
                <select
                  value={selectedHostId}
                  onChange={(e) => setSelectedHostId(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 bg-[#1A253F] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="all">🌐 All Managed Nodes ({hosts.length})</option>
                  {hosts.map((h) => (
                    <option key={h._id || h.name} value={h._id}>
                      {h.provider === 'aws' ? '☁️ AWS' : h.provider === 'azure' ? '☁️ Azure' : '🖥️'}{' '}
                      {h.name} ({h.ip})
                      {h.instanceId ? ` · [${h.instanceId}]` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Select Playbook */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300 w-36 shrink-0">Select Playbook:</label>
              <select
                value={selectedPlaybookId}
                onChange={(e) => setSelectedPlaybookId(e.target.value)}
                required
                className="flex-1 px-3 py-2 bg-[#1A253F] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
              >
                {playbooks.map((p) => (
                  <option key={p._id || p.name} value={p._id}>
                    📄 {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Extra Variables */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300 w-36 shrink-0 pt-2">
                Extra Variables (Optional):
              </label>
              <input
                type="text"
                placeholder='e.g. {"app_port": 8080}'
                value={extraVars}
                onChange={(e) => setExtraVars(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#1A253F] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={running || runningJob || !selectedHostId || !selectedPlaybookId || hosts.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {running || runningJob ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Playbook...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Playbook</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onViewAllLogsClick}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              >
                <List className="w-4 h-4" />
                <span>View Logs</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Execution Logs */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Terminal className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">Live Execution Logs</h3>
            </div>
            <button
              onClick={onViewAllLogsClick}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Terminal Box */}
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 min-h-[170px] max-h-[220px] overflow-y-auto space-y-1">
            {latestExecution && latestExecution.logs ? (
              latestExecution.logs.split('\n').filter(Boolean).map((line, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  {line.includes('ok:') || line.includes('completed successfully') ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : line.includes('fatal:') || line.includes('FAILED') ? (
                    <span className="w-3.5 h-3.5 text-rose-400 shrink-0">❌</span>
                  ) : (
                    <span className="w-3.5 h-3.5 text-blue-400 shrink-0">›</span>
                  )}
                  <span
                    className={
                      line.includes('completed successfully')
                        ? 'text-emerald-400 font-semibold'
                        : line.includes('fatal:') || line.includes('FAILED')
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }
                  >
                    {line}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-10 text-center flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Terminal className="w-8 h-8 text-slate-600" />
                <p className="text-xs font-semibold text-slate-300">No Execution Logs Recorded Yet</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Select a managed target node and playbook above, then click &quot;Run Playbook&quot; to execute and view live logs.
                </p>
              </div>
            )}
          </div>

          {/* Banner bottom status */}
          {latestExecution && (
            <div
              className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold ${
                latestExecution.status === 'SUCCESS'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : latestExecution.status === 'RUNNING'
                  ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {latestExecution.status === 'SUCCESS' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : latestExecution.status === 'RUNNING' ? (
                  <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-blue-400" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>
                  Playbook {latestExecution.playbookName}{' '}
                  {latestExecution.status === 'SUCCESS'
                    ? 'completed successfully'
                    : latestExecution.status === 'RUNNING'
                    ? 'is currently running...'
                    : 'failed during execution'}
                  {latestExecution.durationSeconds ? ` in ${latestExecution.durationSeconds}s` : ''}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Target: {latestExecution.hostName || latestExecution.hostIp}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
