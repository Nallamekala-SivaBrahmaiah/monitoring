'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RotateCw,
  ExternalLink,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Download,
  Terminal as TerminalIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Server,
  Layers,
  ShieldAlert,
  Loader2,
  X,
  Plus,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { JenkinsLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';

interface IJenkinsServer {
  id: string;
  name: string;
  host: string;
  publicIp?: string;
  privateIp?: string;
  cloudProvider: string;
  region: string;
  osName: string;
  status: string;
  jenkins: {
    detected: boolean;
    status: 'running' | 'stopped' | 'not_installed' | 'unreachable';
    version: string;
    port: number;
    url: string;
    installDate?: string;
    serviceName?: string;
    lastSyncedAt?: string;
    lastError?: string | null;
  };
}

export default function JenkinsPage() {
  const [servers, setServers] = useState<IJenkinsServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'azure' | 'aws'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'installed' | 'running' | 'stopped'>('all');

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalLog, setModalLog] = useState<{ title: string; output: string } | null>(null);

  // Uninstall confirm modal
  const [uninstallTarget, setUninstallTarget] = useState<IJenkinsServer | null>(null);
  const [preserveData, setPreserveData] = useState(true);

  // Install modal
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [selectedServerIdForInstall, setSelectedServerIdForInstall] = useState<string>('');
  const [installPort, setInstallPort] = useState<number>(8080);

  // Terminal modal
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);

  const fetchServers = useCallback(async (sync = false) => {
    if (sync) setIsSyncing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/jenkins/servers?sync=${sync ? 'true' : 'false'}`);
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (err) {
      console.error('Failed to fetch Jenkins servers:', err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchServers(false);
  }, [fetchServers]);

  const handleAction = async (serverId: string, action: string, options: any = {}) => {
    setActionLoading(`${serverId}-${action}`);
    try {
      const res = await fetch(`/api/jenkins/servers/${serverId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...options }),
      });
      const data = await res.json();
      if (data.output) {
        setModalLog({
          title: `Jenkins ${action.toUpperCase()} - ${data.success ? 'Success' : 'Encountered Notice'}`,
          output: data.output || data.message,
        });
      }
      await fetchServers(false);
    } catch (err: any) {
      setModalLog({
        title: `Action Error`,
        output: err.message || 'Execution error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleInstall = async () => {
    if (!selectedServerIdForInstall) return;
    setInstallModalOpen(false);
    await handleAction(selectedServerIdForInstall, 'install', { port: installPort });
  };

  const handleConfirmUninstall = async () => {
    if (!uninstallTarget) return;
    const targetId = uninstallTarget.id;
    setUninstallTarget(null);
    await handleAction(targetId, 'uninstall', { preserveData });
  };

  const openTerminal = (server: IJenkinsServer) => {
    setTerminalTarget({
      id: server.id,
      name: server.name,
      host: server.publicIp || server.host,
      username: server.cloudProvider === 'azure' ? 'azureuser' : 'ubuntu',
      cloudProvider: server.cloudProvider,
      region: server.region,
    });
    setTerminalOpen(true);
  };

  // Metrics summary
  const totalServers = servers.length;
  const installedCount = useMemo(() => servers.filter((s) => s.jenkins.detected).length, [servers]);
  const runningCount = useMemo(() => servers.filter((s) => s.jenkins.status === 'running').length, [servers]);
  const stoppedCount = useMemo(() => servers.filter((s) => s.jenkins.detected && s.jenkins.status === 'stopped').length, [servers]);

  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      if (providerFilter !== 'all' && s.cloudProvider?.toLowerCase() !== providerFilter) return false;
      if (statusFilter === 'installed' && !s.jenkins.detected) return false;
      if (statusFilter === 'running' && s.jenkins.status !== 'running') return false;
      if (statusFilter === 'stopped' && (s.jenkins.status !== 'stopped' || !s.jenkins.detected)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchHost = (s.host || '').toLowerCase().includes(q);
        const matchPort = String(s.jenkins.port).includes(q);
        const matchVer = (s.jenkins.version || '').toLowerCase().includes(q);
        return matchName || matchHost || matchPort || matchVer;
      }
      return true;
    });
  }, [servers, providerFilter, statusFilter, searchQuery]);

  return (
    <div className="flex h-screen bg-[#070C18] text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-[1600px] w-full mx-auto space-y-6">
          {/* Top Banner & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D1526] border border-[#1E293B] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 shadow-inner">
                <JenkinsLogo className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-white tracking-tight">Jenkins CI/CD Automation</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider">
                    Infrastructure Tool
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Automatic discovery, real-time service control, port detection, and live SSH deployment across registered servers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchServers(true)}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] hover:border-slate-700 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Probing Servers...' : 'Sync & Detect'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const available = servers.find((s) => !s.jenkins.detected);
                  if (available) setSelectedServerIdForInstall(available.id);
                  setInstallModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Install Jenkins on Server</span>
              </button>
            </div>
          </div>

          {/* KPI Statistics HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Servers</div>
              <div className="text-2xl font-black text-white mt-1">{totalServers}</div>
              <div className="text-[10px] text-slate-500 mt-1">Monitored infrastructure nodes</div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Jenkins Installed</div>
              <div className="text-2xl font-black text-sky-300 mt-1">{installedCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">Actively verified instances</div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Service Running</div>
              <div className="text-2xl font-black text-emerald-300 mt-1">{runningCount}</div>
              <div className="text-[10px] text-emerald-500/80 mt-1">Operational & listening on port</div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Service Stopped</div>
              <div className="text-2xl font-black text-amber-300 mt-1">{stoppedCount}</div>
              <div className="text-[10px] text-amber-500/80 mt-1">Installed but daemon inactive</div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0D1526] border border-[#1E293B] rounded-xl p-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search server, IP, port, or version..."
                className="w-full bg-[#111A2E] border border-[#1E293B] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as any)}
                className="bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">All Clouds</option>
                <option value="azure">Azure VMs</option>
                <option value="aws">AWS EC2</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="installed">Installed Only</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
              </select>
            </div>
          </div>

          {/* Server List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#0D1526] border border-[#1E293B] rounded-2xl">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-300">Checking Jenkins installation status on servers...</p>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-16 bg-[#0D1526] border border-dashed border-[#1E293B] rounded-2xl p-6">
              <JenkinsLogo className="w-12 h-12 mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-white">No Matching Servers</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No servers matched your filter criteria or no servers currently have Jenkins detected. You can install Jenkins on any registered server above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServers.map((server) => {
                const j = server.jenkins;
                const isInstalled = j.detected;
                const isRunning = j.status === 'running';
                const isStopped = j.status === 'stopped';
                const port = j.port || 8080;
                const hostIp = server.publicIp || server.host;
                const jenkinsUrl = j.url || `http://${hostIp}:${port}`;

                return (
                  <div
                    key={server.id}
                    className="bg-[#0D1526] border border-[#1E293B] hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Server & Cloud Badge */}
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#111A2E] border border-[#1E293B] flex items-center justify-center shrink-0">
                          {server.cloudProvider?.toLowerCase() === 'azure' ? (
                            <AzureLogo className="w-5 h-5" />
                          ) : server.cloudProvider?.toLowerCase() === 'aws' ? (
                            <AwsLogo className="w-5 h-5" />
                          ) : (
                            <Server className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white font-mono">{server.name}</span>
                            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                              {server.publicIp || server.host}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60 px-2 py-0.5 rounded">
                              {server.cloudProvider?.toUpperCase()} • {server.region}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Platform OS: <span className="text-slate-300 font-medium">{server.osName}</span>
                            {j.installDate && (
                              <span className="ml-2 text-slate-500">• Installed: {j.installDate}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Jenkins Status & Port Indicator */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {isInstalled ? (
                          <>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
                              <span className="text-slate-400">Port:</span>
                              <span className="font-mono font-bold text-white">{port}</span>
                            </div>

                            {isRunning ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Running ({j.version ? `v${j.version}` : 'Active'})
                              </span>
                            ) : isStopped ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                Stopped
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-xs font-bold">
                                Unknown Status
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-semibold">
                            Not Installed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Bar */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#1E293B] flex-wrap">
                      <div className="flex items-center gap-2">
                        {isInstalled && (
                          <a
                            href={jenkinsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
                              isRunning
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                                : 'bg-[#111A2E] text-slate-500 border border-[#1E293B] pointer-events-none opacity-60'
                            }`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Jenkins</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => openTerminal(server)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                        >
                          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Terminal</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isInstalled ? (
                          <>
                            {isRunning ? (
                              <button
                                type="button"
                                disabled={actionLoading === `${server.id}-stop`}
                                onClick={() => handleAction(server.id, 'stop')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
                              >
                                {actionLoading === `${server.id}-stop` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Square className="w-3.5 h-3.5" />
                                )}
                                <span>Stop</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actionLoading === `${server.id}-start`}
                                onClick={() => handleAction(server.id, 'start')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl transition-all cursor-pointer"
                              >
                                {actionLoading === `${server.id}-start` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                                <span>Start</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={actionLoading === `${server.id}-restart`}
                              onClick={() => handleAction(server.id, 'restart')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                            >
                              {actionLoading === `${server.id}-restart` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              <span>Restart</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setUninstallTarget(server)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Uninstall</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading === `${server.id}-install`}
                            onClick={() => handleAction(server.id, 'install')}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                          >
                            {actionLoading === `${server.id}-install` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Install Jenkins</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Install Jenkins Modal */}
      {installModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setInstallModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
                <JenkinsLogo className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install Jenkins</h3>
                <p className="text-xs text-slate-400">Automated installation on remote Linux server</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Target Server</label>
                <select
                  value={selectedServerIdForInstall}
                  onChange={(e) => setSelectedServerIdForInstall(e.target.value)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500/50"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.publicIp || s.host}) {s.jenkins.detected ? '• Already Installed' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">HTTP Port</label>
                <input
                  type="number"
                  value={installPort}
                  onChange={(e) => setInstallPort(parseInt(e.target.value, 10) || 8080)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500/50"
                  placeholder="8080"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Default Jenkins port is 8080.</span>
              </div>

              <div className="p-3 rounded-xl bg-[#111A2E] border border-slate-800 text-xs space-y-1">
                <div className="font-semibold text-slate-300">Automated Installation Steps:</div>
                <ul className="text-slate-400 text-[11px] list-disc list-inside space-y-0.5">
                  <li>Installs OpenJDK 17 and runtime dependencies</li>
                  <li>Adds official Jenkins Debian repository & GPG key</li>
                  <li>Configures systemd service and enables autostart</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setInstallModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInstall}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white rounded-xl shadow-lg shadow-red-500/20"
              >
                Start Installation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uninstall Confirmation Modal */}
      {uninstallTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Jenkins Removal</h3>
                <p className="text-xs text-rose-300">Server: {uninstallTarget.name} ({uninstallTarget.host})</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to uninstall Jenkins from this server? The Jenkins service will be safely stopped and the package removed.
            </p>

            <div className="p-3 rounded-xl bg-[#111A2E] border border-slate-800 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={preserveData}
                  onChange={(e) => setPreserveData(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <span className="font-semibold">Preserve Jobs and Configurations</span>
              </label>
              <p className="text-[11px] text-slate-400 pl-6">
                When checked, your pipelines, workspace, and `/var/lib/jenkins` data are preserved. If unchecked, all data is permanently purged.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUninstallTarget(null)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUninstall}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/30"
              >
                Confirm & Uninstall
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Log Modal */}
      {modalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setModalLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>{modalLog.title}</span>
            </h3>

            <div className="bg-[#070C18] border border-[#1E293B] rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap">
              {modalLog.output || 'No output stream returned.'}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setModalLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live SSH Terminal Modal */}
      {terminalOpen && terminalTarget && (
        <SSHTerminalModal
          isOpen={terminalOpen}
          target={terminalTarget}
          onClose={() => {
            setTerminalOpen(false);
            setTerminalTarget(null);
          }}
        />
      )}
    </div>
  );
}
