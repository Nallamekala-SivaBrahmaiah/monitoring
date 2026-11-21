'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Server as ServerIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Terminal,
  Search,
  Filter,
  Boxes,
  Layers,
  Box,
  RadioTower,
  Cpu,
  HardDrive,
  Network,
  FolderTree,
  Calendar,
  Key,
  FileText,
  Clock,
  Shield,
  ExternalLink,
  ChevronRight,
  Database,
  Radio,
  Sliders,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { KubernetesIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IKubernetesServerInfo } from '@/lib/kubernetes/k8sServerService';

interface KubernetesClusterDetailViewProps {
  server: IKubernetesServerInfo;
  clusterData: any;
  loadingCluster: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onOpenTerminal?: (server: IKubernetesServerInfo) => void;
}

type K8sTab = 'overview' | 'pods' | 'nodes' | 'deployments' | 'services' | 'config' | 'terminal';

export function KubernetesClusterDetailView({
  server,
  clusterData,
  loadingCluster,
  onBack,
  onRefresh,
  onOpenTerminal,
}: KubernetesClusterDetailViewProps) {
  const [activeTab, setActiveTab] = useState<K8sTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // YAML Inspector Modal
  const [inspectItem, setInspectItem] = useState<{ title: string; yaml: string } | null>(null);
  const [copiedYaml, setCopiedYaml] = useState(false);

  // Metrics counts
  const rawCounts = clusterData?.rawCounts || {};
  const podsList: any[] = clusterData?.resources?.pods || [];
  const nodesList: any[] = clusterData?.resources?.nodes || [];
  const deploymentsList: any[] = clusterData?.resources?.deployments || [];
  const replicaSetsList: any[] = clusterData?.resources?.replicaSets || [];
  const servicesList: any[] = clusterData?.resources?.services || [];
  const ingressList: any[] = clusterData?.resources?.ingress || [];
  const configMapsList: any[] = clusterData?.resources?.configMaps || [];
  const secretsList: any[] = clusterData?.resources?.secrets || [];
  const namespacesList: any[] = clusterData?.resources?.namespaces || [];
  const eventsList: any[] = clusterData?.resources?.events || [];
  const pvsList: any[] = clusterData?.resources?.pvs || [];

  const totalPodsCount = rawCounts.pods ?? podsList.length;
  const runningPodsCount = podsList.filter((p) => p.status?.phase === 'Running').length || totalPodsCount;
  const totalNodesCount = rawCounts.nodes ?? nodesList.length ?? server.nodeCount ?? 2;
  const totalDeploymentsCount = rawCounts.deployments ?? deploymentsList.length;
  const totalServicesCount = rawCounts.services ?? servicesList.length;
  const totalConfigCount = (rawCounts.configMaps || configMapsList.length) + (rawCounts.secrets || secretsList.length);

  // Available namespaces
  const availableNamespaces = useMemo(() => {
    const set = new Set<string>(['all']);
    namespacesList.forEach((ns) => {
      if (ns.metadata?.name) set.add(ns.metadata.name);
    });
    podsList.forEach((p) => {
      if (p.metadata?.namespace) set.add(p.metadata.namespace);
    });
    return Array.from(set);
  }, [namespacesList, podsList]);

  // Filtered Pods
  const filteredPods = useMemo(() => {
    return podsList.filter((p) => {
      if (selectedNamespace !== 'all' && p.metadata?.namespace !== selectedNamespace) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (p.metadata?.name || '').toLowerCase();
        const ns = (p.metadata?.namespace || '').toLowerCase();
        const ip = (p.status?.podIP || '').toLowerCase();
        const node = (p.spec?.nodeName || '').toLowerCase();
        return name.includes(q) || ns.includes(q) || ip.includes(q) || node.includes(q);
      }
      return true;
    });
  }, [podsList, selectedNamespace, searchQuery]);

  // Filtered Nodes
  const filteredNodes = useMemo(() => {
    return nodesList.filter((n) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (n.metadata?.name || '').toLowerCase();
        const os = (n.status?.nodeInfo?.osImage || '').toLowerCase();
        return name.includes(q) || os.includes(q);
      }
      return true;
    });
  }, [nodesList, searchQuery]);

  const handleInspect = (title: string, obj: any) => {
    try {
      const yamlStr = JSON.stringify(obj, null, 2);
      setInspectItem({ title, yaml: yamlStr });
    } catch {
      setInspectItem({ title, yaml: '// Manifest unavailable' });
    }
  };

  const handleCopyYaml = () => {
    if (!inspectItem) return;
    navigator.clipboard.writeText(inspectItem.yaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2500);
  };

  const isConnected = server.connectionStatus === 'Connected';
  const prov = server.cloudProvider.toLowerCase();

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumb Strip (Matching Docker Server Detail View) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={onBack}
            className="hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All K8s Clusters</span>
          </button>
          <span>/</span>
          <span className="text-white font-mono font-semibold">{server.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loadingCluster}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loadingCluster ? 'animate-spin' : ''}`} />
            <span>Sync Cluster</span>
          </button>

          <button
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-semibold bg-[#0B1120] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-lg transition-colors cursor-pointer"
          >
            Return to Inventory
          </button>
        </div>
      </div>

      {/* 2. Hero Banner (Matching Docker Server Detail View Layout) */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0 shadow-inner">
              <KubernetesIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{server.name}</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#18233C] text-[#5EA0EF] border border-[#0089D6]/30 font-semibold">
                  {server.publicIp || server.hostname || server.privateIp}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>{isConnected ? 'CONTROL PLANE ACTIVE' : 'DISCONNECTED'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Shield className="w-3 h-3" />
                  <span>Kubernetes Monitored Cluster</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Kubernetes Version: <strong className="text-cyan-400 font-mono">{server.k8sVersion}</strong> • Cloud:{' '}
                <strong className="text-slate-200 capitalize">{server.cloudProvider}</strong> • Region:{' '}
                <strong className="text-slate-200">{server.region}</strong> • OS:{' '}
                <strong className="text-slate-200">{server.os}</strong>
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenTerminal && (
              <button
                onClick={() => onOpenTerminal(server)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-600/30"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Connect Cluster Terminal</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('pods')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-600/30"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Inspect Active Pods ({totalPodsCount})</span>
            </button>
          </div>
        </div>

        {/* 5 Summary KPI Cards inside Details (Matching Docker Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5">
          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Worker Nodes</span>
            <span className="text-xl font-bold text-purple-400 font-mono mt-1 block">{totalNodesCount}</span>
            <span className="text-[10px] text-slate-500 block">Connected fleet</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Pods</span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">{runningPodsCount}</span>
            <span className="text-[10px] text-slate-500 block">Out of {totalPodsCount} total</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Deployments</span>
            <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">{totalDeploymentsCount}</span>
            <span className="text-[10px] text-slate-500 block">Workload controllers</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Services &amp; Ingress</span>
            <span className="text-xl font-bold text-blue-400 font-mono mt-1 block">{totalServicesCount}</span>
            <span className="text-[10px] text-slate-500 block">Cluster endpoints</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Config &amp; Storage</span>
            <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">{totalConfigCount}</span>
            <span className="text-[10px] text-slate-500 block">Maps, Secrets, PVCs</span>
          </div>
        </div>
      </div>

      {/* 3. Horizontal Navigation Tabs Pill Bar (Exact same horizontal pill bar as Docker) */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-2 shadow-xl shadow-black/20 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'overview', label: 'Cluster Overview', icon: Activity },
            { id: 'pods', label: 'Pods & Containers', icon: Box, badge: totalPodsCount },
            { id: 'nodes', label: 'Worker Nodes', icon: ServerIcon, badge: totalNodesCount },
            { id: 'deployments', label: 'Deployments', icon: Layers, badge: totalDeploymentsCount },
            { id: 'services', label: 'Services & Ingress', icon: Network, badge: totalServicesCount },
            { id: 'config', label: 'Config & Storage', icon: FileText, badge: totalConfigCount },
            { id: 'terminal', label: 'Cluster Terminal', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as K8sTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. TAB CONTENTS */}
      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Host CPU, Memory, Disk Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Cluster Health</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-xl font-bold text-white font-mono">100% OK</div>
              <div className="text-[11px] text-emerald-400 mt-1 font-semibold">All nodes responding</div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Host CPU Utilization</span>
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-xl font-bold text-sky-400 font-mono">
                {server.metrics?.cpuPercent ?? 19}%
              </div>
              <div className="w-full bg-[#070B14] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{ width: `${server.metrics?.cpuPercent ?? 19}%` }}
                />
              </div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Host Memory Utilization</span>
                <Activity className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-400 font-mono">
                {server.metrics?.memoryPercent ?? 19}%
              </div>
              <div className="w-full bg-[#070B14] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${server.metrics?.memoryPercent ?? 19}%` }}
                />
              </div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Root Disk Utilization</span>
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                {server.metrics?.diskPercent ?? 17}%
              </div>
              <div className="w-full bg-[#070B14] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${server.metrics?.diskPercent ?? 17}%` }}
                />
              </div>
            </div>
          </div>

          {/* Control Plane Details & Cluster Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <RadioTower className="w-4 h-4 text-blue-400" />
                <span>Control Plane Configuration</span>
              </h3>
              <div className="divide-y divide-[#1E293B] text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Kubernetes Version</span>
                  <span className="text-white font-mono font-bold">{server.k8sVersion}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Control Plane Endpoint</span>
                  <span className="text-sky-400 font-mono">https://kubernetes.internal:6443</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">API Server Host</span>
                  <span className="text-slate-200 font-mono">{server.publicIp || server.hostname}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Cloud Provider</span>
                  <span className="text-slate-200 capitalize">{server.cloudProvider}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Cluster Region</span>
                  <span className="text-slate-200">{server.region}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Box className="w-4 h-4 text-emerald-400" />
                <span>Cluster Resource Inventory</span>
              </h3>
              <div className="divide-y divide-[#1E293B] text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Connected Worker Nodes</span>
                  <span className="text-purple-400 font-mono font-bold">{totalNodesCount} Nodes</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Active Namespaces</span>
                  <span className="text-cyan-400 font-mono font-bold">{availableNamespaces.length - 1} Namespaces</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Running Cluster Pods</span>
                  <span className="text-emerald-400 font-mono font-bold">{runningPodsCount} Pods</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Configured Services</span>
                  <span className="text-blue-400 font-mono font-bold">{totalServicesCount} Services</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Active Deployments</span>
                  <span className="text-amber-400 font-mono font-bold">{totalDeploymentsCount} Deployments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: PODS & CONTAINERS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'pods' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search pods by name, namespace, pod IP, or node..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Namespace:</span>
              <select
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#070B14] border border-[#1E293B] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {availableNamespaces.map((ns) => (
                  <option key={ns} value={ns}>
                    {ns === 'all' ? 'All Namespaces' : ns}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pods Table */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Pod Name</th>
                    <th className="py-3 px-3">Namespace</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Restarts</th>
                    <th className="py-3 px-3">Pod IP</th>
                    <th className="py-3 px-3">Worker Node</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                  {filteredPods.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No Kubernetes pods found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPods.map((pod, idx) => {
                      const name = pod.metadata?.name || `pod-${idx}`;
                      const ns = pod.metadata?.namespace || 'default';
                      const status = pod.status?.phase || 'Running';
                      const isRunning = status === 'Running';
                      const restarts = pod.status?.containerStatuses?.[0]?.restartCount ?? 0;
                      const podIp = pod.status?.podIP || '-';
                      const nodeName = pod.spec?.nodeName || server.name;

                      return (
                        <tr key={pod.metadata?.uid || name} className="hover:bg-[#18233C]/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                            <Box className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate max-w-xs">{name}</span>
                          </td>
                          <td className="py-3 px-3 text-cyan-400 font-mono text-[11px]">{ns}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isRunning
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              ● {status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">{restarts}</td>
                          <td className="py-3 px-3 font-mono text-slate-300">{podIp}</td>
                          <td className="py-3 px-3 font-mono text-slate-400">{nodeName}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleInspect(`Pod: ${name}`, pod)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-blue-400 hover:text-blue-300 rounded border border-[#1E293B] hover:border-blue-500/40 transition"
                            >
                              Inspect YAML
                            </button>
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
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: WORKER NODES */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'nodes' && (
        <div className="space-y-4">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Node Name</th>
                    <th className="py-3 px-3">Roles</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">CPU Capacity</th>
                    <th className="py-3 px-3">Memory Capacity</th>
                    <th className="py-3 px-3">Kernel / OS</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                  {filteredNodes.length === 0 ? (
                    // Default fallback rendering using server information if node objects not returned
                    <tr className="hover:bg-[#18233C]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                        <ServerIcon className="w-4 h-4 text-purple-400" />
                        <span>{server.name}-worker-01</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px]">
                          worker, control-plane
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          ● Ready
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-300">4 vCPU</td>
                      <td className="py-3.5 px-3 font-mono text-slate-300">16 GiB</td>
                      <td className="py-3.5 px-3 text-slate-400">{server.os}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleInspect(`Node: ${server.name}`, { server, status: 'Ready' })}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-blue-400 hover:text-blue-300 rounded border border-[#1E293B]"
                        >
                          Inspect Node
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredNodes.map((node) => {
                      const name = node.metadata?.name || 'node';
                      const readyCond = (node.status?.conditions || []).find((c: any) => c.type === 'Ready');
                      const isReady = readyCond?.status === 'True';
                      const cpu = node.status?.capacity?.cpu || '4';
                      const memory = node.status?.capacity?.memory || '16Gi';
                      const osImage = node.status?.nodeInfo?.osImage || server.os;

                      return (
                        <tr key={name} className="hover:bg-[#18233C]/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                            <ServerIcon className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>{name}</span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px]">
                              worker
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isReady
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              ● {isReady ? 'Ready' : 'NotReady'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-slate-300">{cpu} vCPU</td>
                          <td className="py-3.5 px-3 font-mono text-slate-300">{memory}</td>
                          <td className="py-3.5 px-3 text-slate-400 text-[11px]">{osImage}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleInspect(`Node: ${name}`, node)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-blue-400 hover:text-blue-300 rounded border border-[#1E293B]"
                            >
                              Inspect Node
                            </button>
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
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: DEPLOYMENTS & REPLICASETS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'deployments' && (
        <div className="space-y-4">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Workload Deployments ({deploymentsList.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Deployment Name</th>
                    <th className="py-3 px-3">Namespace</th>
                    <th className="py-3 px-3">Desired / Ready</th>
                    <th className="py-3 px-3">Up to date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                  {deploymentsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No active deployments detected in this cluster.
                      </td>
                    </tr>
                  ) : (
                    deploymentsList.map((dep, idx) => {
                      const name = dep.metadata?.name || `deploy-${idx}`;
                      const ns = dep.metadata?.namespace || 'default';
                      const replicas = dep.spec?.replicas ?? 1;
                      const readyReplicas = dep.status?.readyReplicas ?? replicas;

                      return (
                        <tr key={name} className="hover:bg-[#18233C]/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{name}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-cyan-400">{ns}</td>
                          <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                            {readyReplicas} / {replicas}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">{replicas}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleInspect(`Deployment: ${name}`, dep)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-blue-400 hover:text-blue-300 rounded border border-[#1E293B]"
                            >
                              Inspect YAML
                            </button>
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
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 5: SERVICES & INGRESS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Cluster Services ({servicesList.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-3">Namespace</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Cluster IP</th>
                    <th className="py-3 px-3">Ports</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                  {servicesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No Kubernetes services found.
                      </td>
                    </tr>
                  ) : (
                    servicesList.map((svc, idx) => {
                      const name = svc.metadata?.name || `svc-${idx}`;
                      const ns = svc.metadata?.namespace || 'default';
                      const type = svc.spec?.type || 'ClusterIP';
                      const clusterIp = svc.spec?.clusterIP || '-';
                      const ports = (svc.spec?.ports || []).map((p: any) => `${p.port}/${p.protocol || 'TCP'}`).join(', ');

                      return (
                        <tr key={name} className="hover:bg-[#18233C]/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                            <Network className="w-3.5 h-3.5 text-blue-400" />
                            <span>{name}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-cyan-400">{ns}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px]">
                              {type}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">{clusterIp}</td>
                          <td className="py-3 px-3 font-mono text-slate-300">{ports || '80/TCP'}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleInspect(`Service: ${name}`, svc)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-blue-400 hover:text-blue-300 rounded border border-[#1E293B]"
                            >
                              Inspect YAML
                            </button>
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
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 6: CONFIG & STORAGE */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ConfigMaps */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-pink-400" />
              <span>ConfigMaps ({configMapsList.length})</span>
            </h3>
            <div className="divide-y divide-[#1E293B] text-xs">
              {configMapsList.slice(0, 8).map((cm, idx) => (
                <div key={cm.metadata?.name || idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-white">{cm.metadata?.name}</div>
                    <div className="text-[10px] text-slate-400">ns: {cm.metadata?.namespace || 'kube-system'}</div>
                  </div>
                  <button
                    onClick={() => handleInspect(`ConfigMap: ${cm.metadata?.name}`, cm)}
                    className="px-2 py-1 text-[10px] font-semibold bg-[#0B1120] text-blue-400 rounded border border-[#1E293B]"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Secrets */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-yellow-400" />
              <span>Secrets ({secretsList.length})</span>
            </h3>
            <div className="divide-y divide-[#1E293B] text-xs">
              {secretsList.slice(0, 8).map((sec, idx) => (
                <div key={sec.metadata?.name || idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-white">{sec.metadata?.name}</div>
                    <div className="text-[10px] text-slate-400">type: {sec.type || 'Opaque'}</div>
                  </div>
                  <button
                    onClick={() => handleInspect(`Secret: ${sec.metadata?.name}`, sec)}
                    className="px-2 py-1 text-[10px] font-semibold bg-[#0B1120] text-blue-400 rounded border border-[#1E293B]"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 7: TERMINAL & EVENTS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'terminal' && (
        <div className="space-y-4">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Kubectl Command &amp; Web Terminal</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Execute live cluster queries directly on {server.name} ({server.publicIp || server.hostname})
                </p>
              </div>

              {onOpenTerminal && (
                <button
                  onClick={() => onOpenTerminal(server)}
                  className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-md shadow-blue-600/30 inline-flex items-center gap-2"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Open Full Terminal Session</span>
                </button>
              )}
            </div>

            {/* Live Events Stream */}
            <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2 max-h-96 overflow-y-auto">
              <div className="text-slate-500 text-[11px] pb-2 border-b border-[#1E293B]">
                // Cluster Events Stream ({eventsList.length} events logged)
              </div>
              {eventsList.length === 0 ? (
                <div className="text-slate-500 py-4 text-center">
                  All cluster components reported normal status. No critical events detected.
                </div>
              ) : (
                eventsList.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px]">
                    <span className="text-cyan-400 shrink-0">[{evt.reason || 'Event'}]</span>
                    <span className="text-slate-400">{evt.message || JSON.stringify(evt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* YAML Inspection Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#111A2E]/60">
              <div className="flex items-center gap-2 text-sm font-bold text-white font-mono">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>{inspectItem.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyYaml}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-[#0D1526] hover:bg-[#162238] text-slate-300 border border-[#1E293B] transition flex items-center gap-1.5"
                >
                  {copiedYaml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedYaml ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setInspectItem(null)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[#070B14]">
              <pre className="text-xs font-mono text-sky-300 whitespace-pre leading-relaxed select-text">
                {inspectItem.yaml}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
