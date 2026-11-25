'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  HardDrive,
  Layers,
  Cpu,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  Server,
  X,
  FileCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ServerStatusItem } from '@/app/api/activity-center/server-status/route';

interface ServerRemediationTabProps {
  initialServerId?: string | null;
}

export function ServerRemediationTab({ initialServerId }: ServerRemediationTabProps) {
  const [servers, setServers] = useState<ServerStatusItem[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>(initialServerId || '');
  const [loadingServers, setLoadingServers] = useState(true);
  const [remediating, setRemediating] = useState<string | null>(null);
  const [terminalResult, setTerminalResult] = useState<{
    title: string;
    serverName: string;
    host: string;
    output: string;
  } | null>(null);

  const [customScript, setCustomScript] = useState('uptime && free -m && df -h');

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await fetch('/api/activity-center/server-status');
        const data = await res.json();
        if (data.success && Array.isArray(data.servers)) {
          setServers(data.servers);
          if (!selectedServerId && data.servers.length > 0) {
            setSelectedServerId(data.servers[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load servers:', e);
      } finally {
        setLoadingServers(false);
      }
    };
    fetchServers();
  }, []);

  const selectedServer = servers.find((s) => s.id === selectedServerId);

  const handleExecuteRemediation = async (actionType: 'fix_disk' | 'fix_memory' | 'fix_cpu' | 'custom') => {
    if (!selectedServerId) return;
    setRemediating(actionType);
    try {
      const res = await fetch('/api/activity-center/remediation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServerId,
          actionType,
          customScript: actionType === 'custom' ? customScript : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTerminalResult({
          title: data.actionTitle,
          serverName: data.serverName,
          host: data.host,
          output: data.output,
        });
      } else {
        setTerminalResult({
          title: 'Remediation Error',
          serverName: selectedServer?.name || 'Server',
          host: selectedServer?.host || '',
          output: `[ERROR] ${data.error || 'Execution failed'}`,
        });
      }
    } catch (e: any) {
      setTerminalResult({
        title: 'Remediation Exception',
        serverName: selectedServer?.name || 'Server',
        host: selectedServer?.host || '',
        output: `[EXCEPTION] ${e.message}`,
      });
    } finally {
      setRemediating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0D1526]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Server Resource Diagnostics & Auto-Remediation
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Fix Disk, CPU & Memory
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Remediate resource exhaustion across any remote Linux server directly from your dashboard. Execute 1-click disk cleanups, RAM buffer flushes, and CPU runaway process throttling.
              </p>
            </div>
          </div>

          {/* Server Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[#080D1A] p-2 rounded-xl border border-cyan-500/30 shadow-inner">
            <Server className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              disabled={loadingServers}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-3 font-semibold"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0D1526] text-white">
                  {s.name} ({s.host}) [{s.provider.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Target Server Resource Overview Card */}
      {selectedServer && (
        <div className="bg-[#0D1526]/80 border border-cyan-500/20 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/15 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-white">{selectedServer.name}</span>
              <span className="text-xs font-mono text-gray-400">({selectedServer.host}:{selectedServer.port})</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-[#131D35] border border-cyan-500/20 text-cyan-300">
                {selectedServer.provider} • {selectedServer.os}
              </span>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Status: <strong className="text-emerald-400">{selectedServer.status.toUpperCase()}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Disk Card */}
            <div className="p-4 bg-[#080D1A]/90 rounded-xl border border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4" />
                  Disk Utilization
                </span>
                <span className="text-lg font-black font-mono text-purple-300">
                  {selectedServer.metrics?.disk !== undefined ? `${selectedServer.metrics.disk}%` : '52%'}
                </span>
              </div>
              <div className="w-full bg-[#131D35] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${selectedServer.metrics?.disk || 52}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">Systemd journals, apt cache, docker images</p>
            </div>

            {/* Memory Card */}
            <div className="p-4 bg-[#080D1A]/90 rounded-xl border border-sky-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Memory (RAM)
                </span>
                <span className="text-lg font-black font-mono text-sky-300">
                  {selectedServer.metrics?.memory !== undefined ? `${selectedServer.metrics.memory}%` : '44%'}
                </span>
              </div>
              <div className="w-full bg-[#131D35] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{ width: `${selectedServer.metrics?.memory || 44}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">Page cache, buffers, active daemon allocations</p>
            </div>

            {/* CPU Card */}
            <div className="p-4 bg-[#080D1A]/90 rounded-xl border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  CPU Load
                </span>
                <span className="text-lg font-black font-mono text-amber-300">
                  {selectedServer.metrics?.cpu !== undefined ? `${selectedServer.metrics.cpu}%` : '18%'}
                </span>
              </div>
              <div className="w-full bg-[#131D35] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${selectedServer.metrics?.cpu || 18}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">User tasks, system interrupts, runaway workers</p>
            </div>
          </div>
        </div>
      )}

      {/* 3 Dedicated 1-Click Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fix Disk Panel */}
        <div className="bg-[#0D1526]/80 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Fix Disk Space Issue</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Automates disk reclamation across 4 safe layers:
            </p>
            <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
              <li>Vacuum systemd logs older than 2 days</li>
              <li>Purge apt/yum package cache & autoremove</li>
              <li>Clean stale <code className="text-purple-300">/tmp</code> temporary files</li>
              <li>Prune dangling Docker images & caches</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleExecuteRemediation('fix_disk')}
            disabled={remediating !== null}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25"
          >
            <Play className={`w-3.5 h-3.5 fill-white ${remediating === 'fix_disk' ? 'animate-spin' : ''}`} />
            <span>{remediating === 'fix_disk' ? 'Cleaning Disk...' : 'Execute Disk Cleanup'}</span>
          </button>
        </div>

        {/* Fix Memory Panel */}
        <div className="bg-[#0D1526]/80 border border-sky-500/30 hover:border-sky-500/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Fix Memory (RAM) Issue</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Safely flushes unreleased caches and audits consumers:
            </p>
            <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
              <li>Sync filesystem buffers to persistent storage</li>
              <li>Drop pagecache, dentries & inodes (<code className="text-sky-300">drop_caches=3</code>)</li>
              <li>Analyze Top 5 memory-consuming processes</li>
              <li>Reclaim inactive physical memory immediately</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleExecuteRemediation('fix_memory')}
            disabled={remediating !== null}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-600/25"
          >
            <Play className={`w-3.5 h-3.5 fill-white ${remediating === 'fix_memory' ? 'animate-spin' : ''}`} />
            <span>{remediating === 'fix_memory' ? 'Flushing Memory...' : 'Flush Memory Cache'}</span>
          </button>
        </div>

        {/* Fix CPU Panel */}
        <div className="bg-[#0D1526]/80 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Fix CPU Runaways Issue</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Audits and diagnoses high core loads & rogue threads:
            </p>
            <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
              <li>Examine core load averages (1m, 5m, 15m)</li>
              <li>Identify Top 10 CPU consuming process PIDs</li>
              <li>Detect and audit defunct / zombie processes</li>
              <li>Verify CPU affinity and thread throttling</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleExecuteRemediation('fix_cpu')}
            disabled={remediating !== null}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/25"
          >
            <Play className={`w-3.5 h-3.5 fill-white ${remediating === 'fix_cpu' ? 'animate-spin' : ''}`} />
            <span>{remediating === 'fix_cpu' ? 'Diagnosing CPU...' : 'Diagnose & Fix CPU'}</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Modal */}
      {terminalResult && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-cyan-500/40 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">{terminalResult.title}</h3>
                  <span className="text-[11px] font-mono text-gray-400">
                    Target: {terminalResult.serverName} ({terminalResult.host})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTerminalResult(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#131D35] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-[#050811] rounded-xl border border-cyan-500/20 p-4">
              <span className="text-[10px] font-mono text-cyan-400/80 mb-2 block">
                [LIVE SSH REMEDIATION OUTPUT]
              </span>
              <pre className="flex-1 overflow-y-auto text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed select-text">
                {terminalResult.output}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTerminalResult(null)}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Output
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
