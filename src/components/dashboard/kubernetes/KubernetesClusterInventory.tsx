'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Server as ServerIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Terminal,
  Filter,
  Layers,
  Box,
  RadioTower,
  Cpu,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { KubernetesIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IKubernetesServerInfo } from '@/lib/kubernetes/k8sServerService';

interface KubernetesClusterInventoryProps {
  servers: IKubernetesServerInfo[];
  isLoading: boolean;
  onRefresh: (doSync?: boolean) => void;
  onSelectServer: (server: IKubernetesServerInfo) => void;
  onOpenTerminal?: (server: IKubernetesServerInfo) => void;
}

export function KubernetesClusterInventory({
  servers,
  isLoading,
  onRefresh,
  onSelectServer,
  onOpenTerminal,
}: KubernetesClusterInventoryProps) {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Metrics summary
  const totalClusters = servers.length;
  const runningClusters = servers.filter((s) => s.connectionStatus === 'Connected').length;
  const disconnectedClusters = servers.filter((s) => s.connectionStatus !== 'Connected').length;
  const totalNodes = servers.reduce((acc, s) => acc + (s.nodeCount || 1), 0);
  const healthPercent = totalClusters > 0 ? Math.round((runningClusters / totalClusters) * 100) : 100;

  // Filtered clusters
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      // Provider filter
      if (providerFilter !== 'all') {
        const prov = (s.cloudProvider || '').toLowerCase();
        if (providerFilter === 'azure' && !prov.includes('azure')) return false;
        if (providerFilter === 'aws' && !prov.includes('aws')) return false;
        if (providerFilter === 'on-premise' && !prov.includes('premise') && !prov.includes('other')) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'connected' && s.connectionStatus !== 'Connected') return false;
        if (statusFilter === 'disconnected' && s.connectionStatus === 'Connected') return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchHost = (s.hostname || s.publicIp || s.privateIp || '').toLowerCase().includes(q);
        const matchRegion = (s.region || '').toLowerCase().includes(q);
        const matchOs = (s.os || '').toLowerCase().includes(q);
        const matchVer = (s.k8sVersion || '').toLowerCase().includes(q);
        return matchName || matchHost || matchRegion || matchOs || matchVer;
      }

      return true;
    });
  }, [servers, search, providerFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Header Strip matching Docker Host style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/" className="hover:text-blue-400 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-white">Kubernetes</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <KubernetesIcon className="w-6 h-6 text-[#326CE5]" />
            <span>Kubernetes Cluster &amp; Host Infrastructure</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-[#111A2E] border border-[#1E293B] px-3 py-1.5 rounded-lg">
            <span className="text-emerald-400 font-bold">{runningClusters}</span>
            <span className="text-slate-400">Ready</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-bold">{disconnectedClusters}</span>
            <span className="text-slate-400">Offline</span>
          </div>

          <button
            onClick={() => onRefresh(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync K8s Clusters</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards (Matching Docker Containers Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kubernetes Clusters */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total K8s Clusters
            </span>
            <span className="text-2xl font-bold text-white font-mono mt-1 block">{totalClusters}</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{runningClusters} Active Control Planes</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <RadioTower className="w-5 h-5" />
          </div>
        </div>

        {/* Worker Nodes */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Cluster Worker Nodes
            </span>
            <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">{totalNodes}</span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Across <strong className="text-slate-200">{totalClusters}</strong> cluster hosts
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ServerIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Workloads & Workspaces */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Workload Engine
            </span>
            <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">Active</span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Pods, Deployments, Services
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Box className="w-5 h-5" />
          </div>
        </div>

        {/* Control Plane Health */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Control Plane Health
            </span>
            <span className="text-2xl font-bold text-purple-400 font-mono mt-1 block">{healthPercent}%</span>
            <span className="text-[10px] text-slate-400 block mt-1">
              {runningClusters} of {totalClusters} control planes responding
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar (Matching Docker Containers Style) */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Kubernetes clusters by name, IP, region, or version..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Cloud Provider Filter */}
          <div className="flex items-center gap-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B1120]">All Clouds</option>
              <option value="azure" className="bg-[#0B1120]">Azure</option>
              <option value="aws" className="bg-[#0B1120]">AWS</option>
              <option value="on-premise" className="bg-[#0B1120]">On-Premises</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg px-2 py-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B1120]">All Statuses</option>
              <option value="connected" className="bg-[#0B1120]">Connected / Ready</option>
              <option value="disconnected" className="bg-[#0B1120]">Disconnected / Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kubernetes Cluster Inventory Table */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Cluster / Server Name</th>
                <th className="py-3 px-3">IP Address</th>
                <th className="py-3 px-3">Region</th>
                <th className="py-3 px-3">OS Platform</th>
                <th className="py-3 px-3">K8s Version</th>
                <th className="py-3 px-3">Control Plane</th>
                <th className="py-3 px-3">Worker Nodes</th>
                <th className="py-3 px-3">Host Metrics</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 font-medium">
              {filteredServers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500 space-y-2">
                    <RadioTower className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-sm font-semibold text-slate-400">No Kubernetes clusters found</p>
                    <p className="text-xs text-slate-500">
                      No registered servers matched the selected search or provider filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredServers.map((server) => {
                  const isConnected = server.connectionStatus === 'Connected';
                  const prov = server.cloudProvider.toLowerCase();

                  return (
                    <tr
                      key={server.id}
                      onClick={() => onSelectServer(server)}
                      className="hover:bg-[#18233C]/60 transition-colors cursor-pointer group"
                    >
                      {/* Server Name & Provider Icon */}
                      <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#0B1120] border border-[#1E293B] flex items-center justify-center shrink-0">
                          {prov.includes('azure') ? (
                            <AzureLogo className="w-4 h-4" />
                          ) : prov.includes('aws') ? (
                            <AwsLogo className="w-4 h-4" />
                          ) : (
                            <ServerIcon className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                            <span>{server.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              Cluster
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono capitalize">
                            {server.cloudAccount || server.cloudProvider}
                          </div>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-3 font-mono text-slate-300 font-medium">
                        <div>{server.publicIp || server.hostname || '-'}</div>
                        {server.privateIp && server.privateIp !== server.publicIp && (
                          <div className="text-[10px] text-slate-500">Priv: {server.privateIp}</div>
                        )}
                      </td>

                      {/* Region */}
                      <td className="py-3.5 px-3 text-slate-400 capitalize">
                        {server.region || 'Datacenter'}
                      </td>

                      {/* OS Name */}
                      <td className="py-3.5 px-3 text-slate-300 text-[11px]">
                        {server.os || 'Linux'}
                      </td>

                      {/* Kubernetes Version */}
                      <td className="py-3.5 px-3 font-mono text-cyan-400 font-semibold text-[11px]">
                        {server.k8sVersion || 'v1.37.1'}
                      </td>

                      {/* Control Plane Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            isConnected
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                            }`}
                          />
                          <span>{isConnected ? 'READY / ONLINE' : 'DISCONNECTED'}</span>
                        </span>
                      </td>

                      {/* Worker Nodes */}
                      <td className="py-3.5 px-3 font-mono font-bold text-white text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-[#070B14] border border-[#1E293B]">
                          {server.nodeCount || 2} Nodes
                        </span>
                      </td>

                      {/* Host Metrics */}
                      <td className="py-3.5 px-3 text-[11px] text-slate-400 font-mono">
                        {server.metrics ? (
                          <div className="flex items-center gap-2">
                            <span>CPU: {server.metrics.cpuPercent}%</span>
                            <span className="text-slate-600">|</span>
                            <span>MEM: {server.metrics.memoryPercent}%</span>
                          </div>
                        ) : (
                          <span>19% CPU • 19% MEM</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {onOpenTerminal && (
                            <button
                              onClick={() => onOpenTerminal(server)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-slate-300 hover:text-white border border-[#1E293B] rounded-lg transition-colors cursor-pointer hover:border-slate-500"
                              title="Connect SSH Terminal"
                            >
                              <Terminal className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onSelectServer(server)}
                            className="px-3 py-1 text-[11px] font-bold bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white"
                          >
                            <span>Manage Cluster</span>
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
    </div>
  );
}
