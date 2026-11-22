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
  Layers,
  Cpu,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

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
  kubernetes?: {
    detected?: boolean;
    status?: string;
    version?: string;
    nodeRole?: string;
  };
}

interface InstallK8sModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InstallK8sModal({ isOpen, onClose, onSuccess }: InstallK8sModalProps) {
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
      console.warn('Failed to fetch servers for Kubernetes install modal:', err);
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
      const res = await fetch(`/api/kubernetes/servers/${server._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setActionSuccess(
          data.message ||
            (action === 'install'
              ? `Kubernetes & cloud tools successfully installed on ${server.name}!`
              : `Kubernetes tools removed from ${server.name}.`)
        );
        setActionOutput(data.output || '');
        await fetchServers();
        onSuccess();
      } else {
        setActionError(data.error || data.message || `Failed to ${action} Kubernetes tools.`);
        setActionOutput(data.output || '');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error connecting to management API');
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.host || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.publicIp || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.privateIp || '').toLowerCase().includes(search.toLowerCase());

    const prov = (s.cloudProvider || 'azure').toLowerCase();
    const matchesProvider =
      filterProvider === 'all' ||
      (filterProvider === 'aws' && prov === 'aws') ||
      (filterProvider === 'azure' && prov === 'azure') ||
      (filterProvider === 'other' && prov !== 'aws' && prov !== 'azure');

    return matchesSearch && matchesProvider;
  });

  const getToolsInfo = (server: RegisteredServerItem) => {
    const prov = (server.cloudProvider || 'azure').toLowerCase();
    if (prov === 'aws') {
      return {
        providerLabel: 'AWS',
        badgeTitle: 'AWS EKS Tools Bundle',
        tools: ['AWS CLI v2 (aws)', 'kubectl v1.31', 'eksctl (EKS CLI)'],
        desc: 'Automates AWS CLI authentication, kubectl cluster interaction, and eksctl cluster management.',
      };
    }
    if (prov === 'azure' || server.name.toLowerCase().includes('azure') || server.host?.startsWith('4.') || server.host?.startsWith('20.')) {
      return {
        providerLabel: 'Azure',
        badgeTitle: 'Azure AKS Tools Bundle',
        tools: ['Azure CLI (az)', 'kubectl v1.31', 'kubelogin (AKS Auth)'],
        desc: 'Automates Azure CLI login, kubectl cluster interaction, and kubelogin MS Entra authentication.',
      };
    }
    return {
      providerLabel: 'On-Premise',
      badgeTitle: 'Kubernetes CLI',
      tools: ['kubectl v1.31'],
      desc: 'Standard Kubernetes client for cluster orchestration and pod telemetry.',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0B1120] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#0E1628]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Kubernetes &amp; Cloud Tools Management</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold uppercase tracking-wider">
                  Automated SSH Setup
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Install or uninstall Kubernetes and native cloud CLI tools tailored by provider (Azure: <span className="text-sky-300 font-mono">az + kubectl + kubelogin</span>, AWS: <span className="text-amber-300 font-mono">aws + kubectl + eksctl</span>).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Provider Filter Bar */}
        <div className="p-4 border-b border-[#1E293B] bg-[#0B1120]/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search servers by name or IP address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0E1628] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#0E1628] p-1 rounded-lg border border-[#1E293B]">
            {[
              { id: 'all', label: 'All Providers' },
              { id: 'azure', label: 'Azure' },
              { id: 'aws', label: 'AWS' },
              { id: 'other', label: 'On-Premise' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterProvider(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  filterProvider === tab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchServers}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[#0E1628] border border-[#1E293B] text-slate-300 hover:text-white hover:bg-[#1E293B] transition cursor-pointer shrink-0"
            title="Refresh Server List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>

        {/* Active Confirmation / Action Modal Banner */}
        {pendingAction && (
          <div className="p-4 bg-sky-950/40 border-b border-sky-500/30 animate-in fade-in duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    pendingAction.action === 'install'
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}
                >
                  {pendingAction.action === 'install' ? (
                    <Zap className="w-5 h-5" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </div>
                <div className="text-xs">
                  <div className="font-bold text-white text-sm mb-1">
                    {pendingAction.action === 'install'
                      ? `Install Kubernetes & Cloud CLI Tools on ${pendingAction.server.name}?`
                      : `Uninstall Kubernetes & Cloud CLI Tools from ${pendingAction.server.name}?`}
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    {pendingAction.action === 'install' ? (
                      <>
                        The automated runner will connect via SSH to{' '}
                        <span className="font-mono text-sky-300 font-semibold">
                          {pendingAction.server.host || pendingAction.server.publicIp}
                        </span>{' '}
                        and install:{' '}
                        <span className="font-semibold text-white">
                          {getToolsInfo(pendingAction.server).tools.join(', ')}
                        </span>
                        . Once installed, this server will automatically appear in your active Kubernetes Cluster Host Registry.
                      </>
                    ) : (
                      <>
                        This will remove Kubernetes binaries, cloud CLIs, and cluster config files from{' '}
                        <span className="font-mono text-rose-300 font-semibold">
                          {pendingAction.server.name}
                        </span>
                        . The server will be removed from the Kubernetes inventory.
                      </>
                    )}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={handleExecuteAction}
                      className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg ${
                        pendingAction.action === 'install'
                          ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      } ${isExecuting ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Executing via SSH...</span>
                        </>
                      ) : (
                        <>
                          {pendingAction.action === 'install' ? (
                            <Zap className="w-4 h-4" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>
                            {pendingAction.action === 'install'
                              ? 'Confirm & Install Tools Now'
                              : 'Confirm & Uninstall Now'}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={() => setPendingAction(null)}
                      className="px-3 py-2 rounded-lg bg-[#0E1628] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 hover:text-white font-medium text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isExecuting}
                onClick={() => setPendingAction(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Execution Output / Status Box */}
        {(actionSuccess || actionError || actionOutput) && (
          <div className="p-4 border-b border-[#1E293B] bg-[#070C16] text-xs">
            {actionSuccess && (
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{actionError}</span>
              </div>
            )}
            {actionOutput && (
              <div className="mt-2 bg-black/60 rounded-lg p-3 border border-[#1E293B] font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                <div className="flex items-center gap-1.5 text-slate-400 pb-1 mb-1 border-b border-slate-800">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Remote Host Execution Log:</span>
                </div>
                {actionOutput}
              </div>
            )}
          </div>
        )}

        {/* Server List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && servers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400 mb-2" />
              <span>Scanning registered fleet servers...</span>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No registered servers found matching your search.
            </div>
          ) : (
            filteredServers.map((server) => {
              const prov = (server.cloudProvider || 'azure').toLowerCase();
              const isK8sInstalled =
                server.kubernetes?.detected === true ||
                (server.kubernetes?.version &&
                  !server.kubernetes.version.includes('NOT_INSTALLED') &&
                  server.kubernetes.version.trim() !== '') ||
                server.name.toLowerCase().includes('k8s') ||
                server.name.toLowerCase().includes('cluster');

              const toolInfo = getToolsInfo(server);

              return (
                <div
                  key={server._id}
                  className="bg-[#0E1628] border border-[#1E293B] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-sky-500/40 transition-colors"
                >
                  {/* Left: Server details & Cloud Bundle */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#111A2E] border border-[#1E293B] flex items-center justify-center shrink-0">
                      {prov === 'aws' ? (
                        <AwsLogo className="w-5 h-5 text-[#FF9900]" />
                      ) : prov === 'azure' ? (
                        <AzureLogo className="w-5 h-5 text-[#0089D6]" />
                      ) : (
                        <Server className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-white text-sm">{server.name}</span>
                        <span className="text-[11px] font-mono text-sky-400">
                          {server.host || server.publicIp || server.privateIp}
                        </span>
                        {server.region && (
                          <span className="text-[10px] text-slate-400 bg-[#162238] px-2 py-0.5 rounded">
                            {server.region}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isK8sInstalled
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {isK8sInstalled ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Kubernetes Active ({server.kubernetes?.version || 'v1.31.0'})</span>
                            </>
                          ) : (
                            <span>Not Installed</span>
                          )}
                        </span>
                      </div>

                      {/* Tooling Package description */}
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {toolInfo.badgeTitle}:
                        </span>
                        {toolInfo.tools.map((tool) => (
                          <span
                            key={tool}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{toolInfo.desc}</p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!isK8sInstalled ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            server,
                            action: 'install',
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-sky-600/20"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Install Kubernetes &amp; Tools</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAction({
                              server,
                              action: 'install',
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-[#162238] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition cursor-pointer"
                          title="Reinstall or update Kubernetes tools"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAction({
                              server,
                              action: 'uninstall',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Uninstall</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1E293B] bg-[#0E1628]/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted SSH automated execution. Safe package management.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#162238] hover:bg-[#1E293B] text-slate-200 font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
