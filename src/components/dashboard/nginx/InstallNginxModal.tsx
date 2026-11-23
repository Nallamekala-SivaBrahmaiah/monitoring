'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  PlayCircle,
  StopCircle,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import { AwsLogo, AzureLogo, NginxLogo } from '@/components/icons/CloudIcons';
import { INginxServerData } from '@/models/NginxServer';

interface InstallNginxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAction?: 'install' | 'uninstall';
}

export function InstallNginxModal({
  isOpen,
  onClose,
  onSuccess,
  initialAction = 'install',
}: InstallNginxModalProps) {
  const [servers, setServers] = useState<INginxServerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'azure' | 'aws'>('all');
  const [activeTab, setActiveTab] = useState<'install' | 'uninstall' | 'all'>(initialAction);

  // Confirmation state
  const [pendingAction, setPendingAction] = useState<{
    server: INginxServerData;
    action: 'install' | 'uninstall';
  } | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionOutput, setActionOutput] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/nginx/servers');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.servers || [];
        setServers(list);
      }
    } catch (err) {
      console.warn('Failed to fetch servers for Nginx install modal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServers();
      setActiveTab(initialAction);
      setPendingAction(null);
      setActionOutput(null);
      setActionError(null);
      setActionSuccess(null);
    }
  }, [isOpen, initialAction]);

  const handleCopyOutput = () => {
    if (!actionOutput) return;
    navigator.clipboard.writeText(actionOutput);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleExecuteAction = async () => {
    if (!pendingAction) return;
    const { server, action } = pendingAction;
    setIsExecuting(true);
    setActionOutput(null);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/nginx/servers/${server._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(data.message || `Nginx ${action} completed successfully on ${server.name}!`);
        setActionOutput(data.output || '');
        await fetchServers();
        onSuccess();
      } else {
        setActionError(data.error || data.message || `Failed to ${action} Nginx.`);
        setActionOutput(data.output || '');
      }
    } catch (err: any) {
      setActionError(err.message || `Network error during Nginx ${action}.`);
    } finally {
      setIsExecuting(false);
    }
  };

  const installedCount = useMemo(() => {
    return servers.filter(
      (s) => s.nginxInstalled === true || s.nginxStatus === 'RUNNING' || s.nginxStatus === 'STOPPED'
    ).length;
  }, [servers]);

  const uninstalledCount = useMemo(() => {
    return servers.length - installedCount;
  }, [servers, installedCount]);

  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      const isInstalled =
        s.nginxInstalled === true || s.nginxStatus === 'RUNNING' || s.nginxStatus === 'STOPPED';

      if (activeTab === 'install' && isInstalled) return false;
      if (activeTab === 'uninstall' && !isInstalled) return false;

      if (filterProvider !== 'all' && s.cloudProvider?.toLowerCase() !== filterProvider) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchHost = (s.host || '').toLowerCase().includes(q);
        const matchRegion = (s.region || '').toLowerCase().includes(q);
        return matchName || matchHost || matchRegion;
      }

      return true;
    });
  }, [servers, activeTab, filterProvider, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0B1120] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#0E1628]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <NginxLogo className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Nginx Server Management</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                  1-Click Automation
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Install or uninstall Nginx web server and reverse proxy tools across your fleet via SSH
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Filters */}
        <div className="px-6 py-3 border-b border-[#1E293B] bg-[#070B14] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Action Tabs */}
          <div className="flex items-center p-1 bg-[#111A2E] border border-[#1E293B] rounded-xl gap-1">
            <button
              onClick={() => {
                setActiveTab('install');
                setPendingAction(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'install'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Install Nginx</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {uninstalledCount}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('uninstall');
                setPendingAction(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'uninstall'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Uninstall Nginx</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {installedCount}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('all');
                setPendingAction(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>All Servers</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {servers.length}
              </span>
            </button>
          </div>

          {/* Search & Cloud Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search server..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
              />
            </div>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Clouds</option>
              <option value="azure">Azure</option>
              <option value="aws">AWS</option>
            </select>
            <button
              onClick={fetchServers}
              disabled={isLoading}
              title="Refresh Servers"
              className="p-2 rounded-lg bg-[#111A2E] border border-[#1E293B] text-slate-400 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Modal Body / Server List / Confirmation / Output */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Ongoing Execution Banner */}
          {isExecuting && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">
                  Executing SSH Nginx {pendingAction?.action.toUpperCase()} script on {pendingAction?.server.name}...
                </p>
                <p className="text-[11px] text-slate-400">
                  Communicating with host {pendingAction?.server.host} via secure shell. Please wait.
                </p>
              </div>
            </div>
          )}

          {/* Action Success Alert */}
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-300">{actionSuccess}</span>
              </div>
              <button
                onClick={() => setActionSuccess(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Action Error Alert */}
          {actionError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="text-xs font-bold text-rose-300">{actionError}</span>
              </div>
              <button
                onClick={() => setActionError(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Terminal Output Log if available */}
          {actionOutput && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-mono">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Execution Output Log:</span>
                </span>
                <button
                  onClick={handleCopyOutput}
                  className="flex items-center gap-1 text-[11px] hover:text-white transition"
                >
                  {copiedOutput ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-black/90 border border-slate-800 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {actionOutput}
              </pre>
            </div>
          )}

          {/* Pending Confirmation Box */}
          {pendingAction && !isExecuting && (
            <div className={`p-4 rounded-xl border ${
              pendingAction.action === 'install'
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-rose-950/20 border-rose-500/40'
            } flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    pendingAction.action === 'install'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    Confirm {pendingAction.action}
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {pendingAction.action === 'install' ? 'Install Nginx Web Server' : 'Uninstall & Purge Nginx'}
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Target Server: <strong className="text-white font-mono">{pendingAction.server.name}</strong> ({pendingAction.server.host})
                  {pendingAction.action === 'uninstall' && ' — This will stop Nginx, purge packages, and clean config directories.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPendingAction(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                    pendingAction.action === 'install'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {pendingAction.action === 'install' ? <Zap className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Execute {pendingAction.action === 'install' ? 'Installation' : 'Uninstallation'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Servers Grid */}
          <div className="space-y-2.5">
            {filteredServers.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-white font-bold text-sm mb-1">No servers found</p>
                <p className="text-slate-400 text-xs">
                  {activeTab === 'install'
                    ? 'All detected fleet servers already have Nginx installed.'
                    : activeTab === 'uninstall'
                    ? 'No servers found with Nginx currently installed.'
                    : 'No registered servers match your filter.'}
                </p>
              </div>
            ) : (
              filteredServers.map((s) => {
                const isInstalled =
                  s.nginxInstalled === true || s.nginxStatus === 'RUNNING' || s.nginxStatus === 'STOPPED';

                return (
                  <div
                    key={s._id}
                    className="p-3.5 rounded-xl bg-[#0E1628] border border-[#1E293B] hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    {/* Server Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#111A2E] border border-[#1E293B] flex items-center justify-center shrink-0">
                        {s.cloudProvider?.toLowerCase() === 'azure' ? (
                          <AzureLogo className="w-4 h-4 text-[#0089D6]" />
                        ) : (
                          <AwsLogo className="w-4 h-4 text-[#FF9900]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white font-mono">{s.name}</span>
                          <span className="text-xs text-slate-400 font-mono">({s.host})</span>
                          {isInstalled ? (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Installed {s.nginxVersion ? `v${s.nginxVersion}` : ''}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              Not Installed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{s.cloudProvider?.toUpperCase()}</span>
                          <span>•</span>
                          <span>{s.region || 'global'}</span>
                          <span>•</span>
                          <span>Status: <strong className={s.connectionStatus === 'Online' ? 'text-emerald-400' : 'text-slate-400'}>{s.connectionStatus}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Action Triggers */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isInstalled ? (
                        <button
                          type="button"
                          onClick={() => setPendingAction({ server: s, action: 'install' })}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-emerald-600/30"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Install Nginx</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingAction({ server: s, action: 'uninstall' })}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-rose-600/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Uninstall Nginx</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1E293B] bg-[#0E1628]/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Executes standard automated apt/dnf/yum scripts with systemd service configuration</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
