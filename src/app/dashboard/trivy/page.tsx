'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RotateCw,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  RefreshCw,
  Trash2,
  Download,
  Terminal as TerminalIcon,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Loader2,
  X,
  Plus,
  FileCode,
  Box,
  History,
  Info,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { TrivyLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';

interface ITrivyServer {
  id: string;
  name: string;
  host: string;
  publicIp?: string;
  privateIp?: string;
  cloudProvider: string;
  region: string;
  osName: string;
  status: string;
  trivy: {
    detected: boolean;
    status: 'installed' | 'not_installed' | 'unreachable';
    version: string;
    installMethod?: string;
    lastScanAt?: string;
    lastScanTarget?: string;
    lastScanSummary?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      unknown: number;
    };
    lastSyncedAt?: string;
    lastError?: string | null;
  };
}

interface ITrivyVulnerability {
  vulnerabilityId: string;
  pkgName: string;
  installedVersion: string;
  fixedVersion?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  title?: string;
  description?: string;
  primaryUrl?: string;
}

interface ITrivyScanRecord {
  _id: string;
  serverId: string;
  serverName: string;
  serverHost: string;
  scanType: 'image' | 'fs' | 'repo';
  target: string;
  status: 'SUCCESS' | 'FAILED';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    total: number;
  };
  vulnerabilities: ITrivyVulnerability[];
  scannedAt: string;
}

export default function TrivyPage() {
  const [servers, setServers] = useState<ITrivyServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'azure' | 'aws'>('all');

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalLog, setModalLog] = useState<{ title: string; output: string } | null>(null);

  // Scan modal
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [selectedServerForScan, setSelectedServerForScan] = useState<string>('');
  const [scanType, setScanType] = useState<'image' | 'fs'>('image');
  const [scanTarget, setScanTarget] = useState<string>('nginx:alpine');

  // Active Scan Results Drawer / Modal
  const [activeScanResult, setActiveScanResult] = useState<ITrivyScanRecord | null>(null);
  const [recentScans, setRecentScans] = useState<ITrivyScanRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Uninstall confirm modal
  const [uninstallTarget, setUninstallTarget] = useState<ITrivyServer | null>(null);

  // Terminal modal
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);

  const fetchServers = useCallback(async (sync = false) => {
    if (sync) setIsSyncing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/trivy/servers?sync=${sync ? 'true' : 'false'}`);
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (err) {
      console.error('Failed to fetch Trivy servers:', err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  const fetchRecentScans = useCallback(async () => {
    try {
      const res = await fetch('/api/trivy/scans?limit=20');
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.scans || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchServers(false);
    fetchRecentScans();
  }, [fetchServers, fetchRecentScans]);

  const handleAction = async (serverId: string, action: string, options: any = {}) => {
    setActionLoading(`${serverId}-${action}`);
    try {
      const res = await fetch(`/api/trivy/servers/${serverId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...options }),
      });
      const data = await res.json();

      if (data.scanResult) {
        setActiveScanResult(data.scanResult);
        await fetchRecentScans();
      } else if (data.output) {
        setModalLog({
          title: `Trivy ${action.toUpperCase()} - ${data.success ? 'Success' : 'Notice'}`,
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

  const handleRunScan = async () => {
    if (!selectedServerForScan || !scanTarget.trim()) return;
    setScanModalOpen(false);
    const action = scanType === 'image' ? 'scan_image' : 'scan_fs';
    await handleAction(selectedServerForScan, action, { target: scanTarget.trim() });
  };

  const handleConfirmUninstall = async () => {
    if (!uninstallTarget) return;
    const targetId = uninstallTarget.id;
    setUninstallTarget(null);
    await handleAction(targetId, 'uninstall');
  };

  const openTerminal = (server: ITrivyServer) => {
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

  const totalServers = servers.length;
  const installedCount = useMemo(() => servers.filter((s) => s.trivy.detected).length, [servers]);

  const totalVulnerabilities = useMemo(() => {
    let crit = 0, high = 0;
    for (const s of servers) {
      if (s.trivy.lastScanSummary) {
        crit += s.trivy.lastScanSummary.critical || 0;
        high += s.trivy.lastScanSummary.high || 0;
      }
    }
    return { crit, high };
  }, [servers]);

  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      if (providerFilter !== 'all' && s.cloudProvider?.toLowerCase() !== providerFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchHost = (s.host || '').toLowerCase().includes(q);
        const matchVer = (s.trivy.version || '').toLowerCase().includes(q);
        const matchMethod = (s.trivy.installMethod || '').toLowerCase().includes(q);
        return matchName || matchHost || matchVer || matchMethod;
      }
      return true;
    });
  }, [servers, providerFilter, searchQuery]);

  return (
    <div className="flex h-screen bg-[#070C18] text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-[1600px] w-full mx-auto space-y-6">
          {/* Top Banner & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D1526] border border-[#1E293B] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 shadow-inner">
                <TrivyLogo className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-white tracking-tight">Trivy Vulnerability Scanner</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                    Container & Filesystem Security
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Automated security scanner detection, live CVE vulnerability scanning for container images & server filesystems.
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
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-xl transition-all cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-teal-400" />
                <span>Scan History ({recentScans.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const installed = servers.find((s) => s.trivy.detected) || servers[0];
                  if (installed) setSelectedServerForScan(installed.id);
                  setScanModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Run Vulnerability Scan</span>
              </button>
            </div>
          </div>

          {/* KPI Statistics HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Servers</div>
              <div className="text-2xl font-black text-white mt-1">{totalServers}</div>
              <div className="text-[10px] text-slate-500 mt-1">Infrastructure inventory</div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">Trivy Installed</div>
              <div className="text-2xl font-black text-teal-300 mt-1">{installedCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">Ready for live scans</div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Critical CVEs Found</div>
              <div className="text-2xl font-black text-rose-400 mt-1">{totalVulnerabilities.crit}</div>
              <div className="text-[10px] text-rose-500/80 mt-1">Immediate remediation needed</div>
            </div>

            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">High CVEs Found</div>
              <div className="text-2xl font-black text-amber-300 mt-1">{totalVulnerabilities.high}</div>
              <div className="text-[10px] text-amber-500/80 mt-1">Priority vulnerability queue</div>
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
                placeholder="Search server, IP, version, or method..."
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
            </div>
          </div>

          {/* Server List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#0D1526] border border-[#1E293B] rounded-2xl">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-300">Checking Trivy installations across servers...</p>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-16 bg-[#0D1526] border border-dashed border-[#1E293B] rounded-2xl p-6">
              <TrivyLogo className="w-12 h-12 mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-white">No Matching Servers</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No servers matched your filter criteria or no servers currently have Trivy detected.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServers.map((server) => {
                const t = server.trivy;
                const isInstalled = t.detected;
                const summary = t.lastScanSummary;

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
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>OS: {server.osName}</span>
                            {isInstalled && (
                              <span className="text-slate-500">
                                • Method: <span className="text-teal-400 uppercase font-semibold">{t.installMethod}</span>
                              </span>
                            )}
                            {t.lastScanTarget && (
                              <span className="text-slate-500">
                                • Last Target: <span className="text-slate-300 font-mono">{t.lastScanTarget}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Trivy Status, Version & Last Vulnerability Pill Bar */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {isInstalled ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-400 text-xs font-bold font-mono">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Trivy v{t.version || 'installed'}
                            </span>

                            {summary && (
                              <div className="flex items-center gap-1 text-[11px] font-bold font-mono">
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  {summary.critical} Crit
                                </span>
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {summary.high} High
                                </span>
                                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {summary.medium} Med
                                </span>
                              </div>
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
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedServerForScan(server.id);
                                setScanType('image');
                                setScanTarget('nginx:alpine');
                                setScanModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>Scan Image</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedServerForScan(server.id);
                                setScanType('fs');
                                setScanTarget('/var/www');
                                setScanModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                            >
                              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Scan Path</span>
                            </button>
                          </>
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
                            <button
                              type="button"
                              disabled={actionLoading === `${server.id}-version`}
                              onClick={() => handleAction(server.id, 'version')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-xl transition-all cursor-pointer"
                            >
                              {actionLoading === `${server.id}-version` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              <span>Check Version</span>
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
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                          >
                            {actionLoading === `${server.id}-install` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Install Trivy CLI</span>
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

      {/* Vulnerability Scan Launcher Modal */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setScanModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
                <TrivyLogo className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Execute Trivy Security Scan</h3>
                <p className="text-xs text-slate-400">Deep vulnerability analysis via SSH</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Monitored Server</label>
                <select
                  value={selectedServerForScan}
                  onChange={(e) => setSelectedServerForScan(e.target.value)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/50"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.publicIp || s.host}) {s.trivy.detected ? '• Trivy Ready' : '(Will prompt install)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Scan Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScanType('image');
                      setScanTarget('nginx:alpine');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      scanType === 'image'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm'
                        : 'bg-[#111A2E] border-[#1E293B] text-slate-400'
                    }`}
                  >
                    Container Image
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScanType('fs');
                      setScanTarget('/var/www');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      scanType === 'fs'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm'
                        : 'bg-[#111A2E] border-[#1E293B] text-slate-400'
                    }`}
                  >
                    Filesystem Path
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {scanType === 'image' ? 'Image Name & Tag' : 'Directory Path'}
                </label>
                <input
                  type="text"
                  value={scanTarget}
                  onChange={(e) => setScanTarget(e.target.value)}
                  className="w-full bg-[#111A2E] border border-[#1E293B] text-slate-200 text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/50"
                  placeholder={scanType === 'image' ? 'e.g. nginx:latest, python:3.9-slim' : 'e.g. /var/www, /home'}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setScanModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunScan}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 text-white rounded-xl shadow-lg shadow-teal-500/20"
              >
                Start Security Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vulnerability Report Viewer Modal */}
      {activeScanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-4xl p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setActiveScanResult(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Vulnerability Scan Findings</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Target: <span className="text-teal-300">{activeScanResult.target}</span> • Server: {activeScanResult.serverName} ({activeScanResult.serverHost})
                  </p>
                </div>
              </div>

              {/* Vulnerabilities Breakdown */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="bg-[#111A2E] border border-rose-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-rose-400 uppercase">Critical</span>
                  <div className="text-xl font-black text-rose-300">{activeScanResult.summary?.critical || 0}</div>
                </div>
                <div className="bg-[#111A2E] border border-amber-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">High</span>
                  <div className="text-xl font-black text-amber-300">{activeScanResult.summary?.high || 0}</div>
                </div>
                <div className="bg-[#111A2E] border border-blue-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-blue-400 uppercase">Medium</span>
                  <div className="text-xl font-black text-blue-300">{activeScanResult.summary?.medium || 0}</div>
                </div>
                <div className="bg-[#111A2E] border border-slate-700 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Low</span>
                  <div className="text-xl font-black text-slate-300">{activeScanResult.summary?.low || 0}</div>
                </div>
              </div>
            </div>

            {/* Findings Table */}
            <div className="flex-1 overflow-y-auto border border-[#1E293B] rounded-xl bg-[#070C18]">
              {activeScanResult.vulnerabilities.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  No vulnerabilities detected in this target! It is completely clean.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111A2E] text-slate-400 font-semibold sticky top-0 border-b border-[#1E293B]">
                    <tr>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Vulnerability ID</th>
                      <th className="p-3">Package</th>
                      <th className="p-3">Installed Version</th>
                      <th className="p-3">Fixed In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {activeScanResult.vulnerabilities.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : v.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : v.severity === 'MEDIUM'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-slate-700/40 text-slate-300'
                            }`}
                          >
                            {v.severity}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-cyan-300">
                          {v.primaryUrl ? (
                            <a
                              href={v.primaryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>{v.vulnerabilityId}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>
                          ) : (
                            v.vulnerabilityId
                          )}
                        </td>
                        <td className="p-3 text-slate-200">{v.pkgName}</td>
                        <td className="p-3 text-slate-400">{v.installedVersion}</td>
                        <td className="p-3 text-emerald-400 font-semibold">{v.fixedVersion || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveScanResult(null)}
                className="px-4 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 rounded-xl"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Scans Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-3xl p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-teal-400" />
              <span>Historical Trivy Vulnerability Scans</span>
            </h3>

            <div className="flex-1 overflow-y-auto border border-[#1E293B] rounded-xl bg-[#070C18]">
              {recentScans.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No scan records available yet.</div>
              ) : (
                <div className="divide-y divide-[#1E293B]">
                  {recentScans.map((scan) => (
                    <div
                      key={scan._id}
                      onClick={() => {
                        setActiveScanResult(scan);
                        setShowHistoryModal(false);
                      }}
                      className="p-3.5 hover:bg-slate-900/50 cursor-pointer flex items-center justify-between gap-3 text-xs transition"
                    >
                      <div>
                        <div className="font-mono font-bold text-white flex items-center gap-2">
                          <span className="text-teal-300">{scan.target}</span>
                          <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.2 bg-slate-800 rounded">
                            {scan.scanType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Server: {scan.serverName} ({scan.serverHost}) • {new Date(scan.scannedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          {scan.summary.critical} Crit
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          {scan.summary.high} High
                        </span>
                        <span className="text-slate-400 text-[10px] ml-1">View Details &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uninstall Confirmation Modal */}
      {uninstallTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1526] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Trivy Removal</h3>
                <p className="text-xs text-rose-300">Server: {uninstallTarget.name} ({uninstallTarget.host})</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove the Trivy CLI scanner from this server?
            </p>

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
                Confirm & Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Log Modal */}
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
