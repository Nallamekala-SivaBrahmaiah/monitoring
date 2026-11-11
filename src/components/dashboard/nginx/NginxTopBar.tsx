'use client';

import React from 'react';
import {
  Server,
  Terminal,
  Plus,
  RefreshCw,
  ChevronDown,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  Wifi,
} from 'lucide-react';
import { NginxLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { INginxServerData } from '@/models/NginxServer';

interface NginxTopBarProps {
  servers: INginxServerData[];
  activeServer: INginxServerData | null;
  onSelectServer: (server: INginxServerData) => void;
  onAddServer: () => void;
  onTestSSH: () => void;
  onOpenTerminal: () => void;
  onRefreshAll: () => void;
  isTestingSSH?: boolean;
  isRefreshing?: boolean;
}

export function NginxTopBar({
  servers,
  activeServer,
  onSelectServer,
  onAddServer,
  onTestSSH,
  onOpenTerminal,
  onRefreshAll,
  isTestingSSH,
  isRefreshing,
}: NginxTopBarProps) {
  const isOnline = activeServer?.connectionStatus === 'Online';
  const isFailed = activeServer?.connectionStatus === 'Failed';

  return (
    <div className="bg-[#111A2E]/95 border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/20 backdrop-blur-md space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Module Title & Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-2 shadow-inner">
            <NginxLogo className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">
                Nginx & Application Deployment
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                PROD READY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Production server operations, PM2 processes, Git repositories, reverse proxy & zero-downtime deployments
            </p>
          </div>
        </div>

        {/* Server Selector & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Active Server Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-[260px]">
            <select
              value={activeServer?._id || ''}
              onChange={(e) => {
                const found = servers.find((s) => s._id === e.target.value);
                if (found) onSelectServer(found);
              }}
              className="w-full appearance-none pl-10 pr-9 py-2 rounded-xl bg-[#0B1120] border border-slate-700/80 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 shadow-inner transition cursor-pointer"
            >
              {servers.length === 0 ? (
                <option value="">No Servers Registered</option>
              ) : (
                servers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.host}) - {s.cloudProvider?.toUpperCase()}
                  </option>
                ))
              )}
            </select>

            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
              {activeServer?.cloudProvider === 'azure' ? (
                <AzureLogo className="w-4 h-4" />
              ) : (
                <AwsLogo className="w-4 h-4" />
              )}
            </div>

            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick Connect PuTTY Terminal */}
          <button
            onClick={onOpenTerminal}
            disabled={!activeServer}
            className="px-3.5 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/25 transition disabled:opacity-40"
            title="Launch interactive PuTTY SSH terminal"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>PuTTY Terminal</span>
          </button>

          {/* Test SSH */}
          <button
            onClick={onTestSSH}
            disabled={!activeServer || isTestingSSH}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-40"
            title="Verify SSH credentials & reachability"
          >
            <Wifi className={`w-3.5 h-3.5 ${isTestingSSH ? 'animate-pulse text-amber-400' : 'text-blue-400'}`} />
            <span>{isTestingSSH ? 'Testing...' : 'Test SSH'}</span>
          </button>

          {/* Add Server */}
          <button
            onClick={onAddServer}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Server</span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh All"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selected Server Info strip */}
      {activeServer && (
        <div className="pt-3 border-t border-[#1E293B]/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Target Node:</span>
              <span className="font-semibold text-white">{activeServer.name}</span>
              <span className="font-mono text-slate-400 text-[11px] bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                {activeServer.host}:{activeServer.port || 22}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Connection:</span>
              <span
                className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : isFailed
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isOnline ? <CheckCircle2 className="w-3 h-3" /> : isFailed ? <XCircle className="w-3 h-3" /> : null}
                {activeServer.connectionStatus}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Nginx:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  activeServer.nginxStatus === 'RUNNING'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : activeServer.nginxStatus === 'STOPPED'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {activeServer.nginxStatus || 'UNKNOWN'}
                {activeServer.nginxVersion ? ` (v${activeServer.nginxVersion})` : ''}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">PM2 Apps:</span>
              <span className="font-semibold text-purple-400">
                {activeServer.pm2Count ?? 0} active
              </span>
            </div>
          </div>

          <div className="text-slate-500 text-[11px]">
            {activeServer.lastConnectedAt
              ? `Last connected: ${new Date(activeServer.lastConnectedAt).toLocaleTimeString()}`
              : 'Not connected recently'}
          </div>
        </div>
      )}
    </div>
  );
}

