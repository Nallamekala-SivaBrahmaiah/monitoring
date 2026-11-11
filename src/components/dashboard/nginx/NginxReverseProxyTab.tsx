'use client';

import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  FileCode,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';
import { ReverseProxySite } from '@/lib/nginx/nginxEngine';

interface NginxReverseProxyTabProps {
  activeServer: INginxServerData | null;
  sites: ReverseProxySite[];
  onRefresh: () => void;
  onCreateNew: () => void;
  onDeleteSite: (fileName: string) => void;
  loading?: boolean;
}

export function NginxReverseProxyTab({
  activeServer,
  sites,
  onRefresh,
  onCreateNew,
  onDeleteSite,
  loading,
}: NginxReverseProxyTabProps) {
  const [selectedConfig, setSelectedConfig] = useState<ReverseProxySite | null>(null);

  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server to manage reverse proxies.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Reverse Proxy Configurations</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Nginx virtual hosts in `/etc/nginx/sites-available` on <strong className="text-slate-200">{activeServer.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/25 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Reverse Proxy</span>
          </button>
        </div>
      </div>

      {/* Sites Table */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0D1527] text-slate-400 border-b border-[#1E293B] text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Config File</th>
                <th className="py-3.5 px-4">Domain / Server Name</th>
                <th className="py-3.5 px-4">Listen Port</th>
                <th className="py-3.5 px-4">Target (Proxy Pass / Root)</th>
                <th className="py-3.5 px-4">SSL</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 font-sans">
              {sites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No reverse proxy site configurations found. Click &quot;Create Reverse Proxy&quot; to configure one.
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
                      Port {site.listenPort}
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

