'use client';

import React, { useState } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  Wifi,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Layers,
  Radio,
  Clock,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { INginxServerData } from '@/models/NginxServer';

interface NginxServersTabProps {
  servers: INginxServerData[];
  activeServer: INginxServerData | null;
  onSelectServer: (server: INginxServerData) => void;
  onAddServer: () => void;
  onEditServer: (server: INginxServerData) => void;
  onDeleteServer: (server: INginxServerData) => void;
  onTestSSH: (server: INginxServerData) => void;
  onOpenTerminal: (server: INginxServerData) => void;
  onRefresh: () => void;
  testingServerId?: string | null;
}

export function NginxServersTab({
  servers,
  activeServer,
  onSelectServer,
  onAddServer,
  onEditServer,
  onDeleteServer,
  onTestSSH,
  onOpenTerminal,
  onRefresh,
  testingServerId,
}: NginxServersTabProps) {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');

  const filtered = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.host.toLowerCase().includes(search.toLowerCase()) ||
      (s.region || '').toLowerCase().includes(search.toLowerCase());

    const matchesProvider =
      providerFilter === 'all' || s.cloudProvider === providerFilter;

    return matchesSearch && matchesProvider;
  });

  return (
    <div className="space-y-4">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search servers by name, host IP or region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Clouds</option>
            <option value="aws">AWS EC2</option>
            <option value="azure">Azure VMs</option>
            <option value="on-premise">On-Premise</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={onAddServer}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add / Import Server</span>
          </button>
        </div>
      </div>

      {/* Servers Table */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0D1527] text-slate-400 border-b border-[#1E293B] text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Server Name & Host</th>
                <th className="py-3.5 px-4">Cloud Provider</th>
                <th className="py-3.5 px-4">OS & User</th>
                <th className="py-3.5 px-4">SSH Status</th>
                <th className="py-3.5 px-4">Nginx Status</th>
                <th className="py-3.5 px-4">PM2 Apps</th>
                <th className="py-3.5 px-4">Last Connected</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No servers found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((server) => {
                  const isCurrent = activeServer?._id === server._id;
                  const isOnline = server.connectionStatus === 'Online';
                  const isFailed = server.connectionStatus === 'Failed';
                  const isTesting = testingServerId === server._id;

                  return (
                    <tr
                      key={server._id}
                      onClick={() => onSelectServer(server)}
                      className={`cursor-pointer transition group ${
                        isCurrent
                          ? 'bg-blue-600/10 border-l-2 border-blue-500'
                          : 'hover:bg-[#142038]/60'
                      }`}
                    >
                      {/* Name & Host */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 flex-shrink-0">
                            <Server className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">{server.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-slate-400 block">
                              {server.host}:{server.port || 22}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Provider */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {server.cloudProvider === 'azure' ? (
                            <AzureLogo className="w-4 h-4" />
                          ) : (
                            <AwsLogo className="w-4 h-4" />
                          )}
                          <div>
                            <span className="font-semibold text-slate-200 uppercase text-[11px] block">
                              {server.cloudProvider}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {server.region || 'global'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* OS & User */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="font-medium text-slate-200 block truncate max-w-[120px]">
                          {server.osName || 'Ubuntu Linux'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 block">
                          User: {server.username}
                        </span>
                      </td>

                      {/* SSH Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[10px] ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isFailed
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isOnline ? <CheckCircle2 className="w-3 h-3" /> : isFailed ? <XCircle className="w-3 h-3" /> : null}
                          {server.connectionStatus}
                        </span>
                      </td>

                      {/* Nginx Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${
                            server.nginxStatus === 'RUNNING'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : server.nginxStatus === 'STOPPED'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {server.nginxStatus || 'UNKNOWN'}
                          {server.nginxVersion ? ` (${server.nginxVersion})` : ''}
                        </span>
                      </td>

                      {/* PM2 */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-purple-400 text-xs">
                          {server.pm2Count ?? 0} Apps
                        </span>
                        {server.pm2RunningCount !== undefined && (
                          <span className="text-[10px] text-slate-500 block">
                            {server.pm2RunningCount} online
                          </span>
                        )}
                      </td>

                      {/* Last connected */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {server.lastConnectedAt
                          ? new Date(server.lastConnectedAt).toLocaleString()
                          : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Test SSH */}
                          <button
                            type="button"
                            onClick={() => onTestSSH(server)}
                            disabled={isTesting}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Test SSH Connection"
                          >
                            <Wifi className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse text-amber-400' : 'text-blue-400'}`} />
                          </button>

                          {/* PuTTY Terminal */}
                          <button
                            type="button"
                            onClick={() => onOpenTerminal(server)}
                            className="p-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white shadow-sm transition"
                            title="Connect with PuTTY Interactive SSH Terminal"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => onEditServer(server)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Edit Server"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => onDeleteServer(server)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                            title="Remove Registration"
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
    </div>
  );
}

