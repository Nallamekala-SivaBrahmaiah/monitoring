'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Search,
  RefreshCw,
  Zap,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { DockerIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface RegisteredServerItem {
  _id: string;
  name: string;
  host: string;
  publicIp?: string;
  privateIp?: string;
  cloudProvider: string;
  region?: string;
  osName?: string;
  status?: string;
  docker?: {
    detected?: boolean;
    status?: string;
    version?: string;
  };
}

interface InstallDockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InstallDockerModal({ isOpen, onClose, onSuccess }: InstallDockerModalProps) {
  const [servers, setServers] = useState<RegisteredServerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');

  // Confirmation state
  const [pendingAction, setPendingAction] = useState<{
    server: RegisteredServerItem;
    action: 'install' | 'uninstall';
  } | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionOutput, setActionOutput] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/servers');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.servers || [];
        setServers(list);
      }
    } catch (err) {
      console.warn('Failed to fetch servers for Docker install modal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServers();
      setPendingAction(null);
      setActionOutput(null);
      setActionError(null);
      setActionSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecuteAction = async () => {
    if (!pendingAction) return;
    const { server, action } = pendingAction;
    setIsExecuting(true);
    setActionOutput(null);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/docker/servers/${server._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(data.message || `Docker ${action} completed successfully on ${server.name}!`);
        setActionOutput(data.output || '');
        // Refresh server list in modal
        await fetchServers();
        // Notify parent to refresh main Docker inventory
        onSuccess();
      } else {
        setActionError(data.error || data.message || `Failed to ${action} Docker.`);
        setActionOutput(data.output || '');
      }
    } catch (err: any) {
      setActionError(err.message || `Network error during Docker ${action}.`);
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredServers = servers.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.host || '').toLowerCase().includes(q) ||
      (s.publicIp || '').toLowerCase().includes(q) ||
      (s.region || '').toLowerCase().includes(q);

    const matchesProvider =
      filterProvider === 'all' || s.cloudProvider?.toLowerCase() === filterProvider.toLowerCase();

    return matchesSearch && matchesProvider;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#111A2E]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0089D6]/15 border border-[#0089D6]/30 flex items-center justify-center text-[#0089D6]">
              <DockerIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Manage Docker Host Setup</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-normal">
                  Auto-Provisioning
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select a server to automatically install or uninstall Docker Engine via secure SSH.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation or Execution Alert Box */}
        {pendingAction && (
          <div className="px-6 py-4 bg-[#142038] border-b border-[#1E293B] space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${pendingAction.action === 'install' ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <span className="text-sm font-bold text-white">
                    {pendingAction.action === 'install'
                      ? `Confirm Docker Installation on "${pendingAction.server.name}"`
                      : `Confirm Docker Uninstallation from "${pendingAction.server.name}"`}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {pendingAction.action === 'install'
                    ? `This will connect via SSH to ${pendingAction.server.host || pendingAction.server.publicIp}, install docker.io and docker-compose-plugin, enable the systemd service, and add the server to Docker Containers module.`
                    : `This will connect via SSH to ${pendingAction.server.host || pendingAction.server.publicIp}, purge Docker packages, stop all containers, and remove this host from the Docker Containers module.`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPendingAction(null);
                    setActionOutput(null);
                    setActionError(null);
                    setActionSuccess(null);
                  }}
                  disabled={isExecuting}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  disabled={isExecuting}
                  className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50 ${
                    pendingAction.action === 'install'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{pendingAction.action === 'install' ? 'Installing Docker...' : 'Uninstalling Docker...'}</span>
                    </>
                  ) : (
                    <>
                      {pendingAction.action === 'install' ? <Zap className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>{pendingAction.action === 'install' ? 'Confirm & Install Docker' : 'Confirm & Uninstall Docker'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Success / Error Message */}
            {actionSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Real-time Output Log */}
            {actionOutput && (
              <div className="bg-[#070B14] border border-[#1E293B] rounded-lg p-3 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {actionOutput}
              </div>
            )}
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B1120]">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter servers by name, IP, region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="px-3 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Cloud Providers</option>
              <option value="azure">Azure VMs</option>
              <option value="aws">AWS EC2</option>
              <option value="other">On-Premises</option>
            </select>

            <button
              onClick={fetchServers}
              disabled={isLoading}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Server List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading && servers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              <span>Loading registered fleet servers...</span>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No servers match your filter.
            </div>
          ) : (
            filteredServers.map((s) => {
              const isDockerInstalled = s.docker?.detected === true && s.docker?.status !== 'not_installed';

              return (
                <div
                  key={s._id}
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDockerInstalled
                      ? 'bg-[#111A2E]/80 border-emerald-500/20 hover:border-emerald-500/40'
                      : 'bg-[#0F172A]/80 border-[#1E293B] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#070B14] border border-[#1E293B] flex items-center justify-center shrink-0">
                      {s.cloudProvider?.toLowerCase() === 'azure' ? (
                        <AzureLogo className="w-4 h-4" />
                      ) : s.cloudProvider?.toLowerCase() === 'aws' ? (
                        <AwsLogo className="w-4 h-4" />
                      ) : (
                        <Server className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{s.name}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          ({s.host || s.publicIp || s.privateIp})
                        </span>
                        {isDockerInstalled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Docker Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <span>Not Installed</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Provider: <strong className="text-slate-300 capitalize">{s.cloudProvider}</strong> &bull; Region: <strong className="text-slate-300">{s.region || 'global'}</strong> &bull; OS: <strong className="text-slate-300">{s.osName || 'Linux'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this server */}
                  <div className="flex items-center gap-2 justify-end">
                    {!isDockerInstalled ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction({ server: s, action: 'install' });
                          setActionOutput(null);
                          setActionError(null);
                          setActionSuccess(null);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Install Docker</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction({ server: s, action: 'uninstall' });
                          setActionOutput(null);
                          setActionError(null);
                          setActionSuccess(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Uninstall Docker</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1E293B] bg-[#111A2E]/50 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{filteredServers.length}</strong> registered servers
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
