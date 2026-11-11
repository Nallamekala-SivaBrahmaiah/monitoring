'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileCode,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Zap,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';
import { ReverseProxySite } from '@/lib/nginx/nginxEngine';

interface NginxServiceTabProps {
  activeServer: INginxServerData | null;
  serverDetails: any;
  sites: ReverseProxySite[];
  onExecuteNginxAction: (action: 'install' | 'start' | 'stop' | 'restart' | 'reload' | 'test') => void;
  onRefresh: () => void;
  onRefreshSites: () => void;
  onCreateNewProxy: () => void;
  onDeleteSite: (fileName: string) => void;
  isActionLoading?: boolean;
  lastActionResult?: { success: boolean; output: string } | null;
}

export function NginxServiceTab({
  activeServer,
  serverDetails,
  sites,
  onExecuteNginxAction,
  onRefresh,
  onRefreshSites,
  onCreateNewProxy,
  onDeleteSite,
  isActionLoading,
  lastActionResult,
}: NginxServiceTabProps) {
  const [selectedConfig, setSelectedConfig] = useState<ReverseProxySite | null>(null);

  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server to manage Nginx.
      </div>
    );
  }

  const isInstalled = activeServer.nginxInstalled || serverDetails?.nginxInstalled;
  const status = serverDetails?.nginxStatus || activeServer.nginxStatus || 'UNKNOWN';
  const isRunning = status === 'RUNNING';
  const isStopped = status === 'STOPPED';

  const version = serverDetails?.nginxVersion || activeServer.nginxVersion || 'Unknown';
  const ports = serverDetails?.nginxPorts || activeServer.nginxPorts || [];
  const workers = serverDetails?.nginxWorkerCount || activeServer.nginxWorkerCount || 0;

  return (
    <div className="space-y-6">
      {/* 1. Service Header Card */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Nginx Web Server Daemon</h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    isRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : isStopped
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Installed on <strong className="text-slate-200">{activeServer.name}</strong> ({activeServer.host}) &bull; {version ? `v${version}` : 'Version check pending'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>

            {!isInstalled && (
              <button
                onClick={() => onExecuteNginxAction('install')}
                disabled={isActionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Install Nginx</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1E293B]">
          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Installed</span>
            <span className="font-semibold text-white text-sm">
              {isInstalled ? 'Yes (System Daemon)' : 'Not Installed'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Version</span>
            <span className="font-mono font-semibold text-emerald-400 text-sm">
              {version || 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Worker Processes</span>
            <span className="font-mono font-semibold text-white text-sm">
              {workers} worker(s) active
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Listening Ports</span>
            <span className="font-mono font-semibold text-blue-400 text-sm truncate block">
              {ports.length > 0 ? ports.join(', ') : 'Port 80 (HTTP)'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Service Control Panel */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
        <h4 className="text-sm font-bold text-white tracking-wide">Lifecycle & Control Operations</h4>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => onExecuteNginxAction('start')}
            disabled={isActionLoading || isRunning}
            className="p-3.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold flex flex-col items-center justify-center gap-2 shadow-sm transition disabled:opacity-40"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Nginx</span>
          </button>

          <button
            onClick={() => onExecuteNginxAction('stop')}
            disabled={isActionLoading || isStopped}
            className="p-3.5 rounded-xl bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex flex-col items-center justify-center gap-2 transition disabled:opacity-40"
          >
            <Square className="w-5 h-5 fill-current" />
            <span>Stop Nginx</span>
          </button>

          <button
            onClick={() => onExecuteNginxAction('restart')}
            disabled={isActionLoading}
            className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex flex-col items-center justify-center gap-2 transition disabled:opacity-40"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Restart Service</span>
          </button>

          <button
            onClick={() => onExecuteNginxAction('reload')}
            disabled={isActionLoading}
            className="p-3.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold flex flex-col items-center justify-center gap-2 shadow-sm transition disabled:opacity-40"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Reload Config</span>
          </button>

          <button
            onClick={() => onExecuteNginxAction('test')}
            disabled={isActionLoading}
            className="p-3.5 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 flex flex-col items-center justify-center gap-2 transition disabled:opacity-40"
          >
            <FileCode className="w-5 h-5 text-blue-400" />
            <span>Test Config</span>
          </button>
        </div>
      </div>

      {/* 3. Output Console for Actions / Configuration Check */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Diagnostic & Action Output
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {isActionLoading ? 'Executing command on remote server...' : 'Ready'}
          </span>
        </div>

        <div className="bg-[#070B14] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto min-h-[140px] max-h-[300px] whitespace-pre-wrap select-text">
          {isActionLoading ? (
            <div className="flex items-center gap-2 text-amber-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Running remote SSH command on {activeServer.host}...</span>
            </div>
          ) : lastActionResult ? (
            <div>
              <div className="text-[11px] text-slate-500 mb-2">
                Exit status: {lastActionResult.success ? 'SUCCESS (0)' : 'FAILED'}
              </div>
              {lastActionResult.output || 'Command completed with no output.'}
            </div>
          ) : serverDetails?.nginxTestOutput ? (
            serverDetails.nginxTestOutput
          ) : (
            'Click "Test Config" or any lifecycle operation above to verify output on the remote server.'
          )}
        </div>
      </div>

      {/* 4. Configured Reverse Proxy Sites & Virtual Hosts */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Reverse Proxy & Virtual Host Configurations</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Active site configs in `/etc/nginx/sites-available` on {activeServer.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshSites}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Sites</span>
            </button>

            <button
              onClick={onCreateNewProxy}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Reverse Proxy</span>
            </button>
          </div>
        </div>

        {/* Sites Table */}
        <div className="border border-[#1E293B] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0D1527] text-slate-400 border-b border-[#1E293B] text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Config File</th>
                  <th className="py-3 px-4">Domain / Server Name</th>
                  <th className="py-3 px-4">Port</th>
                  <th className="py-3 px-4">Target (Proxy Pass / Root)</th>
                  <th className="py-3 px-4">SSL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60 font-sans">
                {sites.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      No reverse proxy configurations found on this server. Click &quot;Create Reverse Proxy&quot; to configure one.
                    </td>
                  </tr>
                ) : (
                  sites.map((site, i) => (
                    <tr key={i} className="hover:bg-[#142038]/60 transition group">
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {site.fileName}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-200 block">{site.serverName}</span>
                        {site.serverName !== '_' && (
                          <a
                            href={`http://${site.serverName}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Visit site</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {site.listenPort}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-300 max-w-xs truncate">
                        {site.proxyPass ? (
                          <span className="text-emerald-400">{site.proxyPass}</span>
                        ) : site.rootPath ? (
                          <span className="text-purple-400">{site.rootPath}</span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            site.ssl
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          {site.ssl ? 'SSL ON' : 'HTTP'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            site.enabled
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {site.enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedConfig(site)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition"
                          >
                            View Config
                          </button>

                          <button
                            onClick={() => onDeleteSite(site.fileName)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                            title="Delete Configuration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Config Viewer Modal */}
      {selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111A2E] border border-slate-700 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-white text-sm">
                  {selectedConfig.fileName} &mdash; Nginx Configuration
                </h4>
              </div>
              <button
                onClick={() => setSelectedConfig(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="bg-[#070B14] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed max-h-[420px] overflow-y-auto whitespace-pre-wrap select-text">
              {selectedConfig.rawConfig}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedConfig(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
