'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Boxes,
  Layers,
  HardDrive,
  Activity,
  Server as ServerIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Play,
  Filter,
  Zap,
  Trash2,
  Loader2,
} from 'lucide-react';
import { DockerIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IDockerHostDetails } from '@/lib/docker/dockerEngine';
import { InstallDockerModal } from './InstallDockerModal';
import { ModuleCustomizeButton } from '@/components/dashboard/style-studio/ModuleCustomizeButton';

interface DockerHostInventoryProps {
  hosts: IDockerHostDetails[];
  isLoading: boolean;
  onRefresh: (doSync?: boolean) => void;
  onSelectHost: (host: IDockerHostDetails) => void;
  onOpenTerminal?: (host: IDockerHostDetails) => void;
}

export function DockerHostInventory({
  hosts,
  isLoading,
  onRefresh,
  onSelectHost,
  onOpenTerminal,
}: DockerHostInventoryProps) {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Install & Uninstall modal states
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [hostToUninstall, setHostToUninstall] = useState<IDockerHostDetails | null>(null);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [uninstallError, setUninstallError] = useState<string | null>(null);

  const handleConfirmUninstall = async () => {
    if (!hostToUninstall) return;
    setIsUninstalling(true);
    setUninstallError(null);
    try {
      const res = await fetch(`/api/docker/servers/${hostToUninstall.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uninstall' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHostToUninstall(null);
        onRefresh(true);
      } else {
        setUninstallError(data.error || data.message || 'Failed to uninstall Docker');
      }
    } catch (err: any) {
      setUninstallError(err.message || 'Network error');
    } finally {
      setIsUninstalling(false);
    }
  };

  // Metrics summary
  const totalHosts = hosts.length;
  const runningHosts = hosts.filter((h) => h.dockerStatus === 'running').length;
  const stoppedHosts = hosts.filter((h) => h.dockerStatus !== 'running').length;
  const totalContainers = hosts.reduce((acc, h) => acc + (h.containersCount || 0), 0);
  const runningContainers = hosts.reduce((acc, h) => acc + (h.runningCount || 0), 0);
  const totalImages = hosts.reduce((acc, h) => acc + (h.imagesCount || 0), 0);
  const healthPercent = totalHosts > 0 ? Math.round((runningHosts / totalHosts) * 100) : 0;

  // Filtered hosts
  const filteredHosts = useMemo(() => {
    return hosts.filter((h) => {
      // Provider filter
      if (providerFilter !== 'all') {
        const prov = (h.cloudProvider || '').toLowerCase();
        if (providerFilter === 'azure' && prov !== 'azure') return false;
        if (providerFilter === 'aws' && prov !== 'aws') return false;
        if (providerFilter === 'on-premise' && prov !== 'other' && prov !== 'on-premise' && prov !== 'on-premises') return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'running' && h.dockerStatus !== 'running') return false;
        if (statusFilter === 'stopped' && h.dockerStatus !== 'stopped') return false;
        if (statusFilter === 'unreachable' && h.dockerStatus !== 'unreachable') return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = h.name.toLowerCase().includes(q);
        const matchHost = h.host.toLowerCase().includes(q);
        const matchRegion = (h.region || '').toLowerCase().includes(q);
        const matchOs = (h.osName || '').toLowerCase().includes(q);
        return matchName || matchHost || matchRegion || matchOs;
      }

      return true;
    });
  }, [hosts, search, providerFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Header Strip matching Azure VM style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/" className="hover:text-blue-400 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-white">Docker Containers</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <DockerIcon className="w-6 h-6 text-[#0089D6]" />
            <span>Docker Host Infrastructure</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <ModuleCustomizeButton
            moduleId="docker"
            moduleName="Docker Module"
            variant="pill"
          />
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-emerald-600/30"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Install Docker on Server</span>
          </button>

          <div className="flex items-center gap-2 text-xs bg-[#111A2E] border border-[#1E293B] px-3 py-1.5 rounded-lg">
            <span className="text-emerald-400 font-bold">{runningHosts}</span>
            <span className="text-slate-400">Online</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-bold">{stoppedHosts}</span>
            <span className="text-slate-400">Offline</span>
          </div>

          <button
            onClick={() => onRefresh(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Docker Hosts</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Docker Hosts */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Docker Hosts</span>
            <span className="text-2xl font-bold text-white font-mono mt-1 block">{totalHosts}</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{runningHosts} Engine Active</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ServerIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Running Containers */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Running Containers</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">{runningContainers}</span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Out of <strong className="text-slate-200">{totalContainers}</strong> total containers
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Docker Images */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Cached Docker Images</span>
            <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">{totalImages}</span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Local image repository
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Engine Fleet Health */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Fleet Engine Health</span>
            <span className="text-2xl font-bold text-purple-400 font-mono mt-1 block">{healthPercent}%</span>
            <span className="text-[10px] text-slate-400 block mt-1">
              {runningHosts} of {totalHosts} hosts responding
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar (Azure VM Style) */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search docker hosts by name, IP, region, or OS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Cloud Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-[#070B14] border border-[#1E293B] text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Cloud Providers</option>
            <option value="azure">Azure Virtual Machines</option>
            <option value="aws">AWS EC2 Instances</option>
            <option value="on-premise">On-Premises DataCenter</option>
          </select>

          {/* Docker Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#070B14] border border-[#1E293B] text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Engine Statuses</option>
            <option value="running">Docker Running (Active)</option>
            <option value="stopped">Docker Stopped</option>
            <option value="unreachable">Unreachable / Offline</option>
          </select>

          <span className="text-xs text-slate-400 font-mono pl-2">
            Showing <strong className="text-white">{filteredHosts.length}</strong> hosts
          </span>
        </div>
      </div>

      {/* Main Server Inventory Table (Strict 1:1 Parity with AzureVMsTable) */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#0B1120] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3 px-4">Docker Host Server</th>
                <th className="py-3 px-3">IP Address</th>
                <th className="py-3 px-3">Cloud / Region</th>
                <th className="py-3 px-3">OS Platform</th>
                <th className="py-3 px-3">Docker Version</th>
                <th className="py-3 px-3">Daemon Status</th>
                <th className="py-3 px-3">Containers</th>
                <th className="py-3 px-3">Images</th>
                <th className="py-3 px-3">Last Synced</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60">
              {filteredHosts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500 space-y-3">
                    <ServerIcon className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-sm font-semibold text-slate-400">No Docker-installed servers detected</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Only servers where Docker is installed and configured are displayed here. Click below to automatically install Docker on any registered server.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsInstallModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Install Docker on Server</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHosts.map((host) => {
                  const isRunning = host.dockerStatus === 'running';
                  const isStopped = host.dockerStatus === 'stopped';

                  return (
                    <tr
                      key={host.id}
                      onClick={() => onSelectHost(host)}
                      className="hover:bg-[#18233C]/60 transition-colors cursor-pointer group"
                    >
                      {/* Server Name & Provider Icon */}
                      <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#0B1120] border border-[#1E293B] flex items-center justify-center shrink-0">
                          {host.cloudProvider === 'azure' ? (
                            <AzureLogo className="w-4 h-4" />
                          ) : host.cloudProvider === 'aws' ? (
                            <AwsLogo className="w-4 h-4" />
                          ) : (
                            <ServerIcon className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                            {host.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono capitalize">
                            {host.cloudProvider === 'other' ? 'On-Premises' : host.cloudProvider}
                          </div>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-3 font-mono text-slate-300 font-medium">
                        {host.host || host.publicIp || '-'}
                      </td>

                      {/* Region */}
                      <td className="py-3.5 px-3 text-slate-400 capitalize">
                        {host.region || 'Datacenter'}
                      </td>

                      {/* OS Name */}
                      <td className="py-3.5 px-3 text-slate-300 text-[11px]">
                        {host.osName || 'Linux'}
                      </td>

                      {/* Docker Version */}
                      <td className="py-3.5 px-3 font-mono text-cyan-400 font-semibold text-[11px]">
                        {host.dockerVersion || 'v24.0.7'}
                      </td>

                      {/* Daemon Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            isRunning
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isStopped
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? 'bg-emerald-400 animate-pulse' : isStopped ? 'bg-amber-400' : 'bg-rose-400'
                            }`}
                          />
                          <span>{isRunning ? 'RUNNING' : isStopped ? 'STOPPED' : 'OFFLINE'}</span>
                        </span>
                      </td>

                      {/* Containers */}
                      <td className="py-3.5 px-3 font-mono">
                        <span className="font-bold text-emerald-400">{host.runningCount}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-slate-300">{host.containersCount}</span>
                      </td>

                      {/* Images */}
                      <td className="py-3.5 px-3 font-mono text-slate-300">
                        {host.imagesCount}
                      </td>

                      {/* Last Synced */}
                      <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                        {host.lastSyncedAt
                          ? new Date(host.lastSyncedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : 'Just now'}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTerminal?.(host);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0D1526] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                            title="Open SSH Terminal with saved credentials"
                          >
                            <Terminal className="w-3.5 h-3.5 text-blue-400" />
                            <span>Terminal</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHostToUninstall(host);
                              setUninstallError(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                            title="Uninstall Docker from this server"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Uninstall</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectHost(host);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-600/30"
                          >
                            <span>Manage Docker</span>
                            <ChevronRight className="w-3.5 h-3.5" />
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

      {/* Uninstall Docker Confirmation Modal */}
      {hostToUninstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Docker Uninstallation</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {hostToUninstall.name} ({hostToUninstall.host || hostToUninstall.publicIp})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to uninstall Docker from <strong className="text-white">{hostToUninstall.name}</strong>?
              This will stop all running containers, remove Docker daemon and packages via SSH, and remove this host from the Docker Containers module.
            </p>

            {uninstallError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uninstallError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setHostToUninstall(null)}
                disabled={isUninstalling}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUninstall}
                disabled={isUninstalling}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/30 disabled:opacity-50"
              >
                {isUninstalling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uninstalling Docker...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Uninstall Docker</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Docker Modal */}
      <InstallDockerModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onSuccess={() => onRefresh(true)}
      />
    </div>
  );
}

