'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Download,
  Filter,
  Search,
  Radio,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Shield,
  Trash2,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IAnsibleHostData } from '@/models/AnsibleHost';
import { IAnsibleControllerData } from '@/models/AnsibleController';
import {
  IAnsibleAdHocExecutionData,
  IAdHocWorkerResult,
} from '@/models/AnsibleAdHocExecution';

interface AnsibleAdHocTabProps {
  activeController: IAnsibleControllerData | null;
  hosts: IAnsibleHostData[];
  onRefreshHosts?: () => void;
}

const MODULE_OPTIONS = [
  { id: 'command', label: 'command', desc: 'Execute standard non-shell command', defaultArg: 'uptime' },
  { id: 'shell', label: 'shell', desc: 'Execute command through remote shell (supports pipes | and redirects >)', defaultArg: 'free -m | grep Mem' },
  { id: 'ping', label: 'ping', desc: 'Test SSH connectivity & Python interpreter on workers', defaultArg: '' },
  { id: 'service', label: 'service', desc: 'Manage system services (start, stop, status)', defaultArg: 'name=nginx state=started' },
  { id: 'apt', label: 'apt', desc: 'Debian/Ubuntu package manager', defaultArg: 'name=curl state=present update_cache=yes' },
  { id: 'yum', label: 'yum', desc: 'RHEL/CentOS/Amazon Linux package manager', defaultArg: 'name=htop state=present' },
  { id: 'package', label: 'package', desc: 'Generic cross-platform package manager', defaultArg: 'name=git state=present' },
  { id: 'setup', label: 'setup', desc: 'Gather facts and hardware specifications', defaultArg: 'filter=ansible_distribution*' },
  { id: 'file', label: 'file', desc: 'Manage file attributes, permissions, and directories', defaultArg: 'path=/tmp/test_ansible state=touch mode=0644' },
  { id: 'copy', label: 'copy', desc: 'Copy files or inline text to remote node', defaultArg: 'content="Ansible ad-hoc test\n" dest=/tmp/ansible.txt' },
  { id: 'user', label: 'user', desc: 'Manage user accounts', defaultArg: 'name=ansibleuser state=present' },
  { id: 'uri', label: 'uri', desc: 'Interact with HTTP and REST web services', defaultArg: 'url=http://localhost:80 return_content=yes' },
];

const PRESET_COMMANDS = [
  { label: 'uptime', module: 'command', cmd: 'uptime', desc: 'System uptime & load' },
  { label: 'free -h', module: 'command', cmd: 'free -h', desc: 'RAM memory utilization' },
  { label: 'df -h', module: 'command', cmd: 'df -h', desc: 'Disk space capacity' },
  { label: 'hostname', module: 'command', cmd: 'hostname -f', desc: 'Full system hostname' },
  { label: 'whoami', module: 'command', cmd: 'whoami', desc: 'Current executing user' },
  { label: 'uname -a', module: 'command', cmd: 'uname -srm', desc: 'Kernel & Architecture' },
  { label: 'systemctl status nginx', module: 'command', cmd: 'systemctl status nginx --no-pager', desc: 'Nginx service status' },
  { label: 'docker ps -a', module: 'command', cmd: 'docker ps -a', desc: 'Docker containers fleet' },
  { label: 'java -version', module: 'shell', cmd: 'java -version 2>&1 | head -n 2', desc: 'Java runtime version' },
  { label: 'nginx -v', module: 'shell', cmd: 'nginx -v 2>&1', desc: 'Nginx version' },
  { label: 'ansible ping', module: 'ping', cmd: '', desc: 'Ping all worker nodes' },
];

export function AnsibleAdHocTab({
  activeController,
  hosts,
  onRefreshHosts,
}: AnsibleAdHocTabProps) {
  // Command execution form states
  const [selectedModule, setSelectedModule] = useState<string>('command');
  const [commandInput, setCommandInput] = useState<string>('uptime');
  const [targetScope, setTargetScope] = useState<'all' | 'multiple' | 'single'>('all');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());

  // Execution states
  const [executing, setExecuting] = useState<boolean>(false);
  const [currentExecution, setCurrentExecution] = useState<IAnsibleAdHocExecutionData | null>(null);
  const [activePollId, setActivePollId] = useState<string | null>(null);

  // History states
  const [history, setHistory] = useState<IAnsibleAdHocExecutionData[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyFilterModule, setHistoryFilterModule] = useState<string>('all');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState<string>('');

  // UI helpers
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expandedWorkerIds, setExpandedWorkerIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const terminalRef = useRef<HTMLPreElement>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Sync selected workers when hosts change
  useEffect(() => {
    if (hosts.length > 0 && selectedWorkerIds.size === 0) {
      setSelectedWorkerIds(new Set(hosts.map((h) => String(h._id))));
    }
  }, [hosts]);

  // Fetch command history for this controller
  const fetchHistory = async () => {
    if (!activeController?._id) {
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const url = `/api/ansible/adhoc?controllerId=${encodeURIComponent(activeController._id)}&limit=30`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.executions) {
        setHistory(data.executions);
      }
    } catch (err) {
      console.error('Failed to fetch ad-hoc history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    setCurrentExecution(null);
  }, [activeController?._id]);

  // Poll active execution while running
  useEffect(() => {
    if (!activePollId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ansible/adhoc/${activePollId}`);
        const data = await res.json();
        if (isMounted && res.ok && data.execution) {
          setCurrentExecution(data.execution);
          if (data.execution.status !== 'RUNNING') {
            setExecuting(false);
            setActivePollId(null);
            fetchHistory();
            if (data.execution.status === 'SUCCESS') {
              showToast('success', `Ad-hoc command executed successfully on all target workers!`);
            } else if (data.execution.status === 'PARTIAL') {
              showToast('error', `Command completed with partial failures on some workers.`);
            } else {
              showToast('error', `Command execution failed: ${data.execution.errorMessage || 'Check logs'}`);
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activePollId]);

  // Auto-scroll terminal to bottom during execution
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [currentExecution?.logs]);

  // Toggle worker checkbox selection
  const handleToggleWorker = (workerId: string) => {
    setSelectedWorkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  };

  const handleSelectAllWorkers = () => {
    if (selectedWorkerIds.size === hosts.length) {
      setSelectedWorkerIds(new Set());
    } else {
      setSelectedWorkerIds(new Set(hosts.map((h) => String(h._id))));
    }
  };

  // Preset click
  const handleSelectPreset = (preset: typeof PRESET_COMMANDS[0]) => {
    setSelectedModule(preset.module);
    setCommandInput(preset.cmd);
  };

  // Module change
  const handleModuleChange = (modId: string) => {
    setSelectedModule(modId);
    const modObj = MODULE_OPTIONS.find((m) => m.id === modId);
    if (modObj && !commandInput) {
      setCommandInput(modObj.defaultArg);
    }
  };

  // Execute Ad-hoc Command
  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeController?._id) {
      showToast('error', 'No active Ansible Controller selected.');
      return;
    }

    if (hosts.length === 0) {
      showToast('error', 'Selected controller has no registered managed workers.');
      return;
    }

    // Resolve target IDs
    let targetIds: string[] = [];
    if (targetScope === 'all') {
      targetIds = hosts.map((h) => String(h._id));
    } else {
      targetIds = Array.from(selectedWorkerIds);
    }

    if (targetIds.length === 0) {
      showToast('error', 'Please select at least one worker node.');
      return;
    }

    setExecuting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/ansible/adhoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controllerId: activeController._id,
          targetScope,
          targetWorkerIds: targetIds,
          moduleName: selectedModule,
          commandArgs: commandInput,
        }),
      });

      const data = await res.json();
      if (res.ok && data.execution) {
        setCurrentExecution(data.execution);
        setActivePollId(data.execution._id || data.executionId);
        showToast('success', `Ad-hoc command sent to controller "${activeController.name}".`);
      } else {
        throw new Error(data.error || 'Failed to dispatch ad-hoc command');
      }
    } catch (err: any) {
      setExecuting(false);
      showToast('error', err.message || 'Execution request failed');
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadLogs = () => {
    if (!currentExecution?.logs) return;
    const blob = new Blob([currentExecution.logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ansible-adhoc-${currentExecution.jobId}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleWorkerExpand = (id: string) => {
    setExpandedWorkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesMod = historyFilterModule === 'all' || item.moduleName.toLowerCase() === historyFilterModule.toLowerCase();
      const matchesStatus = historyFilterStatus === 'all' || item.status.toLowerCase() === historyFilterStatus.toLowerCase();
      const term = historySearch.toLowerCase();
      const matchesSearch =
        !term ||
        item.jobId.toLowerCase().includes(term) ||
        item.commandArgs.toLowerCase().includes(term) ||
        item.targetWorkerNames.some((n) => n.toLowerCase().includes(term));
      return matchesMod && matchesStatus && matchesSearch;
    });
  }, [history, historyFilterModule, historyFilterStatus, historySearch]);

  const selectedCount = targetScope === 'all' ? hosts.length : selectedWorkerIds.size;
  const currentModObj = MODULE_OPTIONS.find((m) => m.id === selectedModule);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg transition animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Controller Execution Context Banner */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 border border-blue-500/30 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-600/20">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Ansible Ad-hoc Command Center
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300">
                Direct Module Execution
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Executing through controller:</span>
              <span className="font-semibold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1.5">
                {activeController?.provider === 'aws' ? (
                  <AwsLogo className="w-3.5 h-3.5" />
                ) : activeController?.provider === 'azure' ? (
                  <AzureLogo className="w-3.5 h-3.5" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>{activeController?.name || 'No Controller Selected'}</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  ({activeController?.ipAddress || '127.0.0.1'})
                </span>
              </span>
              <span className="text-indigo-400 font-semibold">
                · {hosts.length} Available Worker{hosts.length === 1 ? '' : 's'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={fetchHistory}
            disabled={historyLoading}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Command Builder Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <form
            onSubmit={handleExecute}
            className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-5"
          >
            {/* Step 1: Target Workers Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[11px] font-mono flex items-center justify-center border border-blue-500/40">
                    1
                  </span>
                  <span>Target Workers ({selectedCount} Selected)</span>
                </label>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTargetScope('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      targetScope === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    All Workers ({hosts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetScope('multiple')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      targetScope === 'multiple'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Choose Specific
                  </button>
                </div>
              </div>

              {hosts.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                  No managed workers registered under &quot;{activeController?.name}&quot;.
                  Please add managed worker nodes first.
                </div>
              ) : targetScope === 'all' ? (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span>
                      Command will execute across <strong>all {hosts.length} workers</strong> managed by{' '}
                      {activeController?.name}:
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">
                    {hosts.map((h) => h.name).join(', ')}
                  </span>
                </div>
              ) : (
                /* Multi-select workers checkboxes */
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 max-h-48 overflow-y-auto space-y-1.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedWorkerIds.size === hosts.length}
                        onChange={handleSelectAllWorkers}
                        className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span>Select All Workers</span>
                    </label>
                    <span>{selectedWorkerIds.size} of {hosts.length} selected</span>
                  </div>

                  {hosts.map((h) => {
                    const isChecked = selectedWorkerIds.has(String(h._id));
                    return (
                      <label
                        key={h._id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                          isChecked
                            ? 'bg-blue-600/15 border border-blue-500/30 text-white'
                            : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleWorker(String(h._id))}
                            className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="font-semibold">{h.name}</span>
                          <span className="font-mono text-slate-400 text-[11px]">({h.ip})</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          {h.provider === 'aws' ? (
                            <AwsLogo className="w-3 h-3" />
                          ) : (
                            <AzureLogo className="w-3 h-3" />
                          )}
                          <span>{h.provider}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Module Selection */}
            <div>
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[11px] font-mono flex items-center justify-center border border-blue-500/40">
                  2
                </span>
                <span>Ansible Module</span>
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {MODULE_OPTIONS.map((m) => {
                  const isSelected = selectedModule === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModuleChange(m.id)}
                      className={`p-2 rounded-xl text-xs font-mono font-bold transition flex flex-col items-center justify-center text-center gap-1 ${
                        isSelected
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                          : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                      title={m.desc}
                    >
                      <span>-m {m.id}</span>
                    </button>
                  );
                })}
              </div>

              {currentModObj && (
                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                  <span className="text-blue-400 font-semibold">{currentModObj.label}:</span>
                  <span>{currentModObj.desc}</span>
                </p>
              )}
            </div>

            {/* Step 3: Command & Arguments Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[11px] font-mono flex items-center justify-center border border-blue-500/40">
                    3
                  </span>
                  <span>Command / Module Arguments (-a)</span>
                </label>

                {commandInput && (
                  <button
                    type="button"
                    onClick={() => setCommandInput('')}
                    className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea
                  rows={selectedModule === 'ping' ? 2 : 4}
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder={
                    selectedModule === 'ping'
                      ? 'No arguments required for ping'
                      : selectedModule === 'command'
                      ? 'e.g. uptime, free -h, df -h, systemctl status nginx'
                      : 'Enter module arguments...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090E1A] border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>

              {/* Command Presets */}
              <div className="mt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                  Quick Command Presets:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COMMANDS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-mono border border-slate-800 transition flex items-center gap-1"
                      title={p.desc}
                    >
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Ansible Preview */}
            <div className="p-3 rounded-xl bg-[#070B14] border border-slate-800/80 text-[11px] font-mono text-slate-400">
              <span className="text-slate-500 uppercase text-[10px] block font-sans font-bold mb-1">
                Generated Ad-hoc CLI Invocation:
              </span>
              <div className="text-blue-400 truncate">
                ansible {targetScope === 'all' ? 'all' : selectedCount === 1 ? 'worker' : 'selected_workers'} -i inventory.ini -m {selectedModule}
                {commandInput.trim() ? ` -a "${commandInput.trim()}"` : ''}
              </div>
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1E293B]">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Security filter active · Timeout: 45s</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCommandInput('');
                    setSelectedModule('command');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={executing || hosts.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {executing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Executing on {selectedCount} Worker{selectedCount === 1 ? '' : 's'}...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Execute Ad-hoc Command</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Live Results & Terminal (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Execution Panel */}
          <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Live Execution Results
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentExecution
                      ? `Job: ${currentExecution.jobId}`
                      : 'Execute command or select from history'}
                  </p>
                </div>
              </div>

              {currentExecution && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    currentExecution.status === 'RUNNING'
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      : currentExecution.status === 'SUCCESS'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : currentExecution.status === 'PARTIAL'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentExecution.status === 'RUNNING'
                        ? 'bg-blue-400 animate-pulse'
                        : currentExecution.status === 'SUCCESS'
                        ? 'bg-emerald-400'
                        : currentExecution.status === 'PARTIAL'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span>{currentExecution.status}</span>
                </span>
              )}
            </div>

            {!currentExecution ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <Terminal className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-slate-300">Ready to Execute</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Select target workers, choose an Ansible module, and click &quot;Execute Ad-hoc Command&quot; to inspect live output.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-[#090E1A] border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Duration</span>
                    <span className="font-bold text-white font-mono">{currentExecution.durationFormatted || 'Running...'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#090E1A] border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Targets</span>
                    <span className="font-bold text-blue-400 font-mono">{currentExecution.targetWorkerNames.length} Nodes</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#090E1A] border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Success Rate</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {currentExecution.workerResults.filter((w) => w.status === 'SUCCESS' || w.status === 'CHANGED').length} /{' '}
                      {currentExecution.workerResults.length}
                    </span>
                  </div>
                </div>

                {/* Per-Worker Output Accordions */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Individual Worker Results:
                  </span>

                  {currentExecution.workerResults.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                      Waiting for worker responses...
                    </div>
                  ) : (
                    currentExecution.workerResults.map((wr) => {
                      const isExpanded = expandedWorkerIds.has(wr.workerName);
                      const isSuccess = wr.status === 'SUCCESS' || wr.status === 'CHANGED';

                      return (
                        <div
                          key={wr.workerName}
                          className="rounded-xl border border-slate-800 bg-[#0C1222] overflow-hidden text-xs transition"
                        >
                          <div
                            onClick={() => toggleWorkerExpand(wr.workerName)}
                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isSuccess ? 'bg-emerald-400' : 'bg-rose-400'
                                }`}
                              />
                              <span className="font-bold text-white">{wr.workerName}</span>
                              <span className="font-mono text-[11px] text-slate-400">({wr.workerIp})</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isSuccess
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {wr.status}
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                rc={wr.returnCode}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div className="p-3 border-t border-slate-800/80 bg-[#060A14] space-y-2">
                              {wr.stdout && (
                                <div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-semibold uppercase">
                                    <span>Standard Output (stdout):</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(wr.stdout, wr.workerName + '-out')}
                                      className="text-blue-400 hover:text-white"
                                    >
                                      {copiedText === wr.workerName + '-out' ? 'Copied' : 'Copy'}
                                    </button>
                                  </div>
                                  <pre className="p-2.5 rounded-lg bg-black/60 font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-40">
                                    {wr.stdout}
                                  </pre>
                                </div>
                              )}

                              {wr.stderr && (
                                <div>
                                  <div className="text-[10px] text-rose-400 mb-1 font-semibold uppercase">
                                    Standard Error (stderr):
                                  </div>
                                  <pre className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/30 font-mono text-[11px] text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-32">
                                    {wr.stderr}
                                  </pre>
                                </div>
                              )}

                              {!wr.stdout && !wr.stderr && (
                                <div className="text-slate-500 text-[11px] italic">No output recorded.</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Terminal Console View */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                      Full Execution Logs
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(currentExecution.logs, 'terminal')}
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedText === 'terminal' ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadLogs}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                        title="Download Log File"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  <pre
                    ref={terminalRef}
                    className="p-3.5 rounded-xl bg-[#060A14] border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner"
                  >
                    {currentExecution.logs || 'Initializing console...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ad-hoc Command History Section */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Ad-hoc Command History
              </h3>
              <p className="text-xs text-slate-400">
                Audited past executions for controller{' '}
                <span className="text-blue-400 font-semibold">{activeController?.name || 'Selected'}</span>
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search command / worker..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={historyFilterModule}
              onChange={(e) => setHistoryFilterModule(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Modules</option>
              {MODULE_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  -m {m.id}
                </option>
              ))}
            </select>

            <select
              value={historyFilterStatus}
              onChange={(e) => setHistoryFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        {filteredHistory.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-300">No Ad-hoc Commands Executed Yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Commands executed under &quot;{activeController?.name}&quot; will be permanently logged here.
            </p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0C1222]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090E1A] text-slate-400 text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Command / Arguments</th>
                  <th className="py-2.5 px-3">Target Workers</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Executed At</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredHistory.map((item) => {
                  const isCurrent = currentExecution?._id === item._id;
                  const isSuccess = item.status === 'SUCCESS';
                  const isPartial = item.status === 'PARTIAL';

                  return (
                    <tr
                      key={item._id}
                      onClick={() => setCurrentExecution(item)}
                      className={`cursor-pointer transition ${
                        isCurrent
                          ? 'bg-blue-600/15 border-l-2 border-blue-500'
                          : 'hover:bg-[#142038]'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-300 font-semibold truncate max-w-[120px]">
                        {item.jobId}
                      </td>
                      <td className="py-2.5 px-3 text-blue-400 font-bold">
                        -m {item.moduleName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-normal max-w-xs truncate" title={item.commandArgs}>
                        {item.commandArgs || '<no args>'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans text-[11px]">
                        <span className="truncate max-w-[150px] block" title={item.targetWorkerNames.join(', ')}>
                          {item.targetWorkerNames.join(', ') || 'All Workers'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {item.durationFormatted || `${(item.durationMs / 1000).toFixed(1)}s`}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isPartial
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                        {new Date(item.startTime).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModule(item.moduleName);
                            setCommandInput(item.commandArgs);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-sans font-semibold transition"
                          title="Re-populate command into builder"
                        >
                          Re-run
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

