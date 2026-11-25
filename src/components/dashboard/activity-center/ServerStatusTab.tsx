'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  RotateCw,
  Search,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  Clock,
  ShieldAlert,
  ArrowRight,
  Filter,
  Wrench,
  Cpu,
  Layers,
  HardDrive,
} from 'lucide-react';
import { ServerStatusItem } from '@/app/api/activity-center/server-status/route';

interface ServerStatusTabProps {
  onSelectRemediate?: (serverId: string) => void;
}

export function ServerStatusTab({ onSelectRemediate }: ServerStatusTabProps) {
  const [servers, setServers] = useState<ServerStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [checkingServerId, setCheckingServerId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity-center/server-status');
      const data = await res.json();
      if (data.success && Array.isArray(data.servers)) {
        setServers(data.servers);
      }
    } catch (e) {
      console.error('Failed to load server statuses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handlePingServer = async (serverId: string) => {
    setCheckingServerId(serverId);
    setLastCheckMessage(null);
    try {
      const res = await fetch('/api/activity-center/server-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      });
      const data = await res.json();
      if (data.success) {
        setServers((prev) =>
          prev.map((s) =>
            s.id === serverId
              ? {
                  ...s,
                  status: data.status,
                  latencyMs: data.latencyMs,
                  uptime: data.uptime || s.uptime,
                  lastChecked: new Date().toISOString(),
                }
              : s
          )
        );
        setLastCheckMessage(
          `Ping successful: ${data.name} is ${data.status.toUpperCase()} (${data.latencyMs}ms)`
        );
      } else {
        setLastCheckMessage(`Check failed: ${data.error || 'Connection error'}`);
      }
    } catch (e: any) {
      setLastCheckMessage(`Ping failed: ${e.message}`);
    } finally {
      setCheckingServerId(null);
    }
  };

  const handleCheckAll = async () => {
    setCheckingAll(true);
    setLastCheckMessage(null);
    try {
      const res = await fetch('/api/activity-center/server-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkAll: true }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setServers((prev) =>
          prev.map((s) => {
            const found = data.results.find((r: any) => r.serverId === s.id);
            if (found) {
              return {
                ...s,
                status: found.status,
                latencyMs: found.latencyMs,
                uptime: found.uptime || s.uptime,
                lastChecked: new Date().toISOString(),
              };
            }
            return s;
          })
        );
        setLastCheckMessage(`All ${data.results.length} registered servers checked.`);
      }
    } catch (e: any) {
      setLastCheckMessage(`Bulk check error: ${e.message}`);
    } finally {
      setCheckingAll(false);
    }
  };

  const filteredServers = servers.filter((s) => {
    if (providerFilter !== 'all' && s.provider !== providerFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchHost = s.host.toLowerCase().includes(q);
      const matchOs = s.os.toLowerCase().includes(q);
      if (!matchName && !matchHost && !matchOs) return false;
    }
    return true;
  });

  const runningCount = servers.filter((s) => s.status === 'running').length;
  const failedCount = servers.filter((s) => s.status === 'failed' || s.status === 'stopped').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0D1526]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Server Status & Live Health Verification
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Running vs Failed
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Autonomous health checks across your AWS, Azure, and On-Premises Linux server fleet. Verify live SSH connectivity, response latency, and operational statuses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCheckAll}
              disabled={checkingAll || loading}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25"
            >
              <RotateCw className={`w-3.5 h-3.5 ${checkingAll ? 'animate-spin' : ''}`} />
              <span>{checkingAll ? 'Pinging All Servers...' : 'Check All Servers Status'}</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-cyan-500/15">
          <div className="p-3 bg-[#080D1A]/80 rounded-xl border border-cyan-500/15">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
              Total Servers
            </span>
            <div className="text-2xl font-black font-mono text-white mt-1">{servers.length}</div>
          </div>

          <div className="p-3 bg-[#080D1A]/80 rounded-xl border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Running Servers
            </span>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{runningCount}</div>
          </div>

          <div className="p-3 bg-[#080D1A]/80 rounded-xl border border-rose-500/20">
            <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Failed / Stopped
            </span>
            <div className="text-2xl font-black font-mono text-rose-400 mt-1">{failedCount}</div>
          </div>

          <div className="p-3 bg-[#080D1A]/80 rounded-xl border border-cyan-500/15">
            <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider block">
              Health Ratio
            </span>
            <div className="text-2xl font-black font-mono text-cyan-300 mt-1">
              {servers.length > 0 ? `${Math.round((runningCount / servers.length) * 100)}%` : '0%'}
            </div>
          </div>
        </div>

        {lastCheckMessage && (
          <div className="mt-4 p-3 rounded-xl text-xs font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 flex items-center gap-2 animate-in fade-in">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>{lastCheckMessage}</span>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0D1526]/80 border border-cyan-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by server name, host IP, OS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#131D35] border border-cyan-500/20 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="bg-[#131D35] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="all">All Cloud & On-Prem</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="onprem">On-Premises</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#131D35] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="running">RUNNING</option>
              <option value="failed">FAILED / OFFLINE</option>
              <option value="stopped">STOPPED</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchServers}
          disabled={loading}
          className="px-3.5 py-2 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/20 rounded-xl text-xs font-medium flex items-center gap-2 transition cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Servers Table */}
      <div className="bg-[#0D1526]/80 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131D35]/80 text-gray-400 font-semibold border-b border-cyan-500/20">
              <tr>
                <th className="py-3.5 px-4">Server Name</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Host IP / Port</th>
                <th className="py-3.5 px-4">Operational Status</th>
                <th className="py-3.5 px-4">Resource Utilization</th>
                <th className="py-3.5 px-4">Latency & Uptime</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {loading && servers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Checking server network statuses...
                  </td>
                </tr>
              ) : filteredServers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Server className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
                    No servers match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredServers.map((srv) => {
                  const isRunning = srv.status === 'running';
                  const isFailed = srv.status === 'failed' || srv.status === 'stopped';
                  const isPinging = checkingServerId === srv.id;

                  return (
                    <tr key={srv.id} className="hover:bg-[#131D35]/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              isRunning ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse' : 'bg-rose-400'
                            }`}
                          />
                          <div>
                            <span className="font-bold text-white block">{srv.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{srv.os}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-[#131D35] border border-cyan-500/20 text-cyan-300">
                          {srv.provider}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-300 whitespace-nowrap">
                        <span>{srv.host}</span>
                        <span className="text-gray-500 text-[10px]">:{srv.port}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isRunning ? (
                          <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1.5 shadow-sm shadow-emerald-500/10">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            RUNNING
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/40 inline-flex items-center gap-1.5 shadow-sm shadow-rose-500/10">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            {srv.status === 'stopped' ? 'STOPPED' : 'FAILED / OFFLINE'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-[11px] font-mono">
                          <span className="flex items-center gap-1 text-slate-300" title="CPU Usage">
                            <Cpu className="w-3 h-3 text-amber-400" />
                            {srv.metrics?.cpu !== undefined ? `${srv.metrics.cpu}%` : '—'}
                          </span>
                          <span className="flex items-center gap-1 text-slate-300" title="Memory Usage">
                            <Layers className="w-3 h-3 text-sky-400" />
                            {srv.metrics?.memory !== undefined ? `${srv.metrics.memory}%` : '—'}
                          </span>
                          <span className="flex items-center gap-1 text-slate-300" title="Disk Usage">
                            <HardDrive className="w-3 h-3 text-purple-400" />
                            {srv.metrics?.disk !== undefined ? `${srv.metrics.disk}%` : '—'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap font-mono text-[11px]">
                        <div>
                          {srv.latencyMs !== undefined ? (
                            <span className="text-cyan-300">{srv.latencyMs}ms</span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[120px]">
                          {srv.uptime ? `up ${srv.uptime}` : 'No uptime report'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePingServer(srv.id)}
                            disabled={isPinging}
                            className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Ping SSH Port & Check Status"
                          >
                            <Zap className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                            <span>{isPinging ? 'Pinging...' : 'Ping Status'}</span>
                          </button>

                          {onSelectRemediate && (
                            <button
                              type="button"
                              onClick={() => onSelectRemediate(srv.id)}
                              className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Remediate Disk, CPU, or Memory Issues"
                            >
                              <Wrench className="w-3 h-3 text-purple-400" />
                              <span>Fix Issues</span>
                            </button>
                          )}
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
    </div>
  );
}
