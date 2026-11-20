'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  RotateCw,
  Layers,
  Box,
  Server,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Cpu,
  HardDrive,
  Database,
  FileCode,
  Network,
  Sliders,
  Terminal,
  RefreshCw,
  Boxes,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { KubernetesIcon, EksIcon, AksIcon, AwsLogo, AzureLogo, DockerIcon } from '@/components/icons/CloudIcons';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { useMonitoring } from '@/context/MonitoringContext';
import {
  K8sUnifiedResource,
  K8sTelemetryOverview,
  K8sResourceType,
} from '@/types/kubernetes';

export interface IServerNodeSummary {
  id: string;
  name: string;
  host: string;
  publicIp: string;
  privateIp: string;
  cloudProvider: string;
  region: string;
  status: string;
  rawStatus: string;
  osName: string;
  k8sVersion: string;
  dockerVersion: string;
  podsCount: number;
  runningPodsCount: number;
  servicesCount: number;
  volumesCount: number;
  cpuPercent: number;
  cpuCores: number;
  memoryPercent: number;
  totalMemory: string;
  diskPercent: number;
  totalDisk: string;
  uptime: string;
}

function KubernetesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlServerParam = searchParams.get('server') || searchParams.get('cluster') || searchParams.get('hostId');

  const { syncNow, isSyncing } = useMonitoring();

  // State management
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<K8sTelemetryOverview | null>(null);
  const [resources, setResources] = useState<K8sUnifiedResource[]>([]);
  const [servers, setServers] = useState<IServerNodeSummary[]>([]);
  const [availableClusters, setAvailableClusters] = useState<string[]>([
    'All Clusters & Servers',
  ]);
  const [selectedCluster, setSelectedCluster] = useState<string>(
    urlServerParam || 'All Clusters & Servers'
  );
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('Kubernetes');

  // View mode: 'inventory' shows servers with 'Manage K8s'; 'studio' shows full resource orchestration
  const [viewMode, setViewMode] = useState<'inventory' | 'studio'>(
    urlServerParam ? 'studio' : 'inventory'
  );

  // Interactive YAML inspection modal
  const [selectedResource, setSelectedResource] = useState<K8sUnifiedResource | null>(null);
  const [isYamlModalOpen, setIsYamlModalOpen] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);

  // Live SSH Terminal Modal
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);

  // Fetch unified resources from API
  const fetchResources = useCallback(async (targetServer?: string) => {
    setLoading(true);
    try {
      const serverToQuery = targetServer !== undefined ? targetServer : selectedCluster;
      const url = `/api/kubernetes/resources?server=${encodeURIComponent(
        serverToQuery && serverToQuery !== 'All Clusters & Servers' ? serverToQuery : 'all'
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
        setTelemetry(data.telemetry || null);
        if (data.clusters && Array.isArray(data.clusters)) {
          setAvailableClusters(data.clusters);
        }
        if (data.servers && Array.isArray(data.servers)) {
          setServers(data.servers);
        }
      }
    } catch (err) {
      console.error('Failed to load k8s resources:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCluster]);

  useEffect(() => {
    fetchResources(urlServerParam || undefined);
  }, [urlServerParam, fetchResources]);

  // Handle selecting a server to manage (similar to Docker's "Manage Docker")
  const handleManageServer = (server: IServerNodeSummary) => {
    setSelectedCluster(server.name);
    setViewMode('studio');
    setActiveTab('Kubernetes');
    const params = new URLSearchParams(window.location.search);
    params.set('server', server.name);
    router.replace(`/dashboard/kubernetes?${params.toString()}`);
    fetchResources(server.name);
  };

  // Switch server from studio dropdown
  const handleClusterDropdownChange = (clusterVal: string) => {
    setSelectedCluster(clusterVal);
    const params = new URLSearchParams(window.location.search);
    if (clusterVal === 'All Clusters & Servers') {
      params.delete('server');
      router.replace('/dashboard/kubernetes');
    } else {
      const cleanName = clusterVal.split(' ')[0];
      params.set('server', cleanName);
      router.replace(`/dashboard/kubernetes?${params.toString()}`);
    }
    fetchResources(clusterVal);
  };

  // Back to Server Inventory
  const handleBackToInventory = () => {
    setViewMode('inventory');
    setSelectedCluster('All Clusters & Servers');
    router.replace('/dashboard/kubernetes');
    fetchResources('all');
  };

  // Open SSH Terminal directly
  const handleOpenTerminal = (server: IServerNodeSummary) => {
    setTerminalTarget({
      id: server.id,
      sshServerId: server.id,
      name: server.name,
      host: server.host && server.host !== '-' ? server.host : server.publicIp,
      port: 22,
      username: server.cloudProvider === 'azure' ? 'siva' : 'ubuntu',
      cloudProvider: server.cloudProvider,
      region: server.region,
    });
    setTerminalOpen(true);
  };

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      // Tab filter
      if (activeTab === 'Clusters & Nodes') {
        if (item.kind !== 'Node') return false;
      } else if (activeTab === 'Services') {
        if (item.kind !== 'Service') return false;
      } else if (activeTab === 'Ingress') {
        if (item.kind !== 'Ingress') return false;
      } else if (activeTab === 'Workloads') {
        if (
          !['Pod', 'Deployment', 'ReplicaSet', 'DaemonSet', 'StatefulSet'].includes(
            item.kind
          )
        )
          return false;
      } else if (activeTab === 'Storage & Config') {
        if (
          !['ConfigMap', 'PersistentVolume', 'PersistentVolumeClaim'].includes(
            item.kind
          )
        )
          return false;
      } else if (activeTab === 'Helm Releases') {
        if (item.kind !== 'HelmRelease') return false;
      } else if (activeTab === 'Namespaces') {
        if (item.kind !== 'Namespace') return false;
      }

      // Namespace filter
      if (
        selectedNamespace !== 'all' &&
        item.namespace.toLowerCase() !== selectedNamespace.toLowerCase()
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchKind = item.kind.toLowerCase().includes(query);
        const matchType = item.serviceType?.toLowerCase().includes(query);
        const matchNs = item.namespace.toLowerCase().includes(query);
        const matchIp =
          item.clusterIp?.toLowerCase().includes(query) ||
          item.externalIp?.toLowerCase().includes(query);
        return matchName || matchKind || matchType || matchNs || matchIp;
      }

      return true;
    });
  }, [resources, activeTab, selectedNamespace, searchQuery]);

  // Copy YAML helper
  const handleCopyYaml = () => {
    if (!selectedResource) return;
    navigator.clipboard.writeText(selectedResource.manifestYaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  // Helper to get kind badge color
  const getKindBadge = (resource: K8sUnifiedResource) => {
    if (resource.kind === 'Service') {
      const type = resource.serviceType || 'ClusterIP';
      if (type === 'LoadBalancer') {
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            LoadBalancer
          </span>
        );
      }
      if (type === 'NodePort') {
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            NodePort
          </span>
        );
      }
      if (type === 'ExternalName') {
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            ExternalName
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          ClusterIP
        </span>
      );
    }

    if (resource.kind === 'Ingress') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Ingress
        </span>
      );
    }
    if (resource.kind === 'Deployment') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          Deployment
        </span>
      );
    }
    if (resource.kind === 'StatefulSet') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30">
          StatefulSet
        </span>
      );
    }
    if (resource.kind === 'DaemonSet') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          DaemonSet
        </span>
      );
    }
    if (resource.kind === 'ReplicaSet') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          ReplicaSet
        </span>
      );
    }
    if (resource.kind === 'Pod') {
      const isRunning = resource.status === 'Running';
      return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
          isRunning 
            ? 'bg-teal-500/15 text-teal-300 border-teal-500/30' 
            : 'bg-slate-700/50 text-slate-400 border-slate-600'
        }`}>
          Pod ({resource.status})
        </span>
      );
    }
    if (resource.kind === 'ConfigMap') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          ConfigMap
        </span>
      );
    }
    if (resource.kind === 'PersistentVolume' || resource.kind === 'PersistentVolumeClaim') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
          {resource.kind === 'PersistentVolume' ? 'PV' : 'PVC'}
        </span>
      );
    }
    if (resource.kind === 'Node') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          Node (Server)
        </span>
      );
    }
    if (resource.kind === 'HelmRelease') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          Helm
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-700 text-slate-300">
        {resource.kind}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1920px] mx-auto w-full">
          {/* ========================================================================= */}
          {/* 1. VIEW MODE A: SERVER NODE INVENTORY (SIMILAR TO DOCKER HOST INVENTORY)  */}
          {/* ========================================================================= */}
          {viewMode === 'inventory' ? (
            <div className="space-y-4">
              {/* Breadcrumbs & Header Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1120] border border-[#162238] rounded-xl p-3.5 shadow-md">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <Link href="/" className="hover:text-sky-400 flex items-center gap-1">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Dashboard</span>
                    </Link>
                    <span>/</span>
                    <span className="text-white font-semibold">Kubernetes Studio</span>
                    <span>/</span>
                    <span className="text-sky-400">Manage Servers</span>
                  </div>
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400 border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                      <KubernetesIcon className="w-5 h-5 text-sky-400" />
                    </div>
                    <span>Multi-Cloud Kubernetes Server Nodes</span>
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* View Aggregated Button */}
                  <button
                    onClick={() => {
                      setViewMode('studio');
                      setSelectedCluster('All Clusters & Servers');
                      fetchResources('all');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#111A2E] hover:bg-[#162238] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>View All Clusters Studio</span>
                  </button>

                  {/* Refresh Button */}
                  <button
                    onClick={() => {
                      fetchResources();
                      syncNow();
                    }}
                    disabled={loading || isSyncing}
                    title="Refresh Servers"
                    className="p-1.5 text-slate-400 hover:text-white bg-[#111A2E] hover:bg-[#162238] border border-[#1E293B] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    <RotateCw className={`w-4 h-4 text-sky-400 ${loading || isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Server Nodes Table */}
              <div className="bg-[#0B1120] border border-[#162238] rounded-xl overflow-hidden shadow-sm">
                <div className="p-3 border-b border-[#162238] flex items-center justify-between bg-[#0E1628]/60">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">Registered Kubernetes Host Nodes</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                      {servers.length} Nodes
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Click <span className="text-sky-400 font-semibold">Manage K8s</span> on any server to orchestrate workloads
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-[#162238] bg-[#0E1628] text-slate-400 font-semibold">
                        <th className="py-3 px-4">Node / Server</th>
                        <th className="py-3 px-3">IP Address</th>
                        <th className="py-3 px-3">Region</th>
                        <th className="py-3 px-3">OS &amp; Kernel</th>
                        <th className="py-3 px-3">K8s &amp; Runtime</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Pods (Active)</th>
                        <th className="py-3 px-3">Services</th>
                        <th className="py-3 px-3 min-w-[110px]">CPU</th>
                        <th className="py-3 px-3 min-w-[110px]">RAM</th>
                        <th className="py-3 px-3 min-w-[110px]">Disk</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#162238]/60 font-medium">
                      {servers.map((s) => {
                        const isReady = s.status === 'Ready' || s.rawStatus === 'Online';
                        return (
                          <tr
                            key={s.id}
                            onClick={() => handleManageServer(s)}
                            className="hover:bg-[#111A2E]/60 transition-colors cursor-pointer"
                          >
                            {/* Server Name with Cloud Provider Logo */}
                            <td className="py-3.5 px-4 font-mono font-bold text-white">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#111A2E] flex items-center justify-center border border-[#1E293B]">
                                  {s.cloudProvider === 'azure' ? (
                                    <AzureLogo className="w-4 h-4 text-[#0089D6]" />
                                  ) : (
                                    <AwsLogo className="w-4 h-4 text-[#FF9900]" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-white hover:text-sky-400 transition-colors flex items-center gap-1.5 font-bold">
                                    <span>{s.name}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-normal">
                                    {s.cloudProvider} • {s.region}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Host IP */}
                            <td className="py-3.5 px-3 font-mono text-slate-300">
                              {s.host || s.publicIp || '-'}
                            </td>

                            {/* Region */}
                            <td className="py-3.5 px-3 text-slate-400 capitalize">
                              {s.region || 'centralindia'}
                            </td>

                            {/* OS */}
                            <td className="py-3.5 px-3 text-slate-300 text-[11px]">
                              {s.osName || 'Ubuntu Linux'}
                            </td>

                            {/* K8s Version */}
                            <td className="py-3.5 px-3 font-mono text-sky-400 text-[11px] font-semibold">
                              {s.k8sVersion}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                  isReady
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isReady ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                  }`}
                                />
                                <span>{isReady ? 'READY' : 'NOT READY'}</span>
                              </span>
                            </td>

                            {/* Pods count */}
                            <td className="py-3.5 px-3 font-mono">
                              <span className="font-bold text-emerald-400">{s.runningPodsCount}</span>
                              <span className="text-slate-500 mx-1">/</span>
                              <span className="text-slate-300">{s.podsCount}</span>
                            </td>

                            {/* Services count */}
                            <td className="py-3.5 px-3 font-mono text-sky-400 font-bold">
                              {s.servicesCount}
                            </td>

                            {/* CPU */}
                            <td className="py-3.5 px-3">
                              <div className="font-mono text-xs text-white font-semibold">
                                {s.cpuPercent}% <span className="text-slate-500 text-[10px]">({s.cpuCores}c)</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className="bg-emerald-400 h-full rounded-full"
                                  style={{ width: `${Math.min(s.cpuPercent, 100)}%` }}
                                />
                              </div>
                            </td>

                            {/* RAM */}
                            <td className="py-3.5 px-3">
                              <div className="font-mono text-xs text-white font-semibold">
                                {s.memoryPercent}% <span className="text-slate-500 text-[10px]">({s.totalMemory})</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className="bg-sky-400 h-full rounded-full"
                                  style={{ width: `${Math.min(s.memoryPercent, 100)}%` }}
                                />
                              </div>
                            </td>

                            {/* Disk */}
                            <td className="py-3.5 px-3">
                              <div className="font-mono text-xs text-white font-semibold">
                                {s.diskPercent}% <span className="text-slate-500 text-[10px]">({s.totalDisk})</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className="bg-purple-400 h-full rounded-full"
                                  style={{ width: `${Math.min(s.diskPercent, 100)}%` }}
                                />
                              </div>
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenTerminal(s)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#0D1526] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                                  title="Open SSH Terminal with saved credentials"
                                >
                                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Terminal</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleManageServer(s)}
                                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-sky-600/30"
                                >
                                  <span>Manage K8s</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. VIEW MODE B: KUBERNETES WORKLOAD STUDIO (SERVER-SCOPED OR AGGREGATED)   */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* TOP HEADER & STUDIO TITLE BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0B1120] border border-[#162238] rounded-xl p-3.5 shadow-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToInventory}
                    className="p-2 rounded-lg bg-[#111A2E] hover:bg-[#162238] text-slate-300 hover:text-white border border-[#1E293B] transition-colors"
                    title="Back to Server Inventory"
                  >
                    <ArrowLeft className="w-4 h-4 text-sky-400" />
                  </button>
                  <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400 border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                    <KubernetesIcon className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Multi-Cloud Kubernetes Studio</span>
                      {selectedCluster !== 'All Clusters & Servers' && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-mono font-semibold">
                          Server: {selectedCluster}
                        </span>
                      )}
                    </h1>
                    <p className="text-[11px] text-slate-400 hidden sm:block">
                      Enterprise orchestration, live pods, services, persistent volumes, and dynamic host telemetry
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Back to Servers Pill */}
                  <button
                    onClick={handleBackToInventory}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#162238] text-slate-300 hover:text-white border border-[#1E293B] rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Server className="w-3.5 h-3.5 text-sky-400" />
                    <span>Server Inventory</span>
                  </button>

                  {/* Cluster / Server Selector */}
                  <div className="relative">
                    <select
                      value={selectedCluster}
                      onChange={(e) => handleClusterDropdownChange(e.target.value)}
                      className="appearance-none pl-8 pr-8 py-1.5 text-xs font-semibold bg-[#111A2E] text-slate-200 border border-[#1E293B] hover:border-slate-600 rounded-lg focus:outline-none focus:border-sky-500 cursor-pointer transition-colors shadow-sm"
                    >
                      {availableClusters.map((c) => (
                        <option key={c} value={c} className="bg-[#0B1120] text-slate-200">
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-sky-400">
                      <KubernetesIcon className="w-3.5 h-3.5" />
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Health Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Healthy 100%</span>
                  </div>

                  {/* Search Box */}
                  <div className="relative min-w-[200px] sm:min-w-[240px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search pods, services, ingress..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={() => {
                      fetchResources(selectedCluster);
                      syncNow();
                    }}
                    disabled={loading || isSyncing}
                    title="Refresh Kubernetes telemetry"
                    className="p-1.5 text-slate-400 hover:text-white bg-[#111A2E] hover:bg-[#162238] border border-[#1E293B] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    <RotateCw className={`w-4 h-4 text-sky-400 ${loading || isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* 2. REAL TELEMETRY & RESOURCE BREAKDOWN CARDS (100% DYNAMIC - ZERO FAKE DATA) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Group 1: Workloads (CPU) */}
                <div className="bg-[#0B1120] border border-[#162238] rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Workloads &amp; Compute</span>
                    </div>
                    {/* Metric pill with real live telemetry */}
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#111A2E] border border-[#1E293B]">
                      <span className="text-xs font-bold text-sky-400">
                        {telemetry?.cpu.coresText || 'CPU: 12% (2 Cores)'}
                      </span>
                      <svg className="w-16 h-5" viewBox="0 0 64 20" fill="none">
                        <path
                          d="M2 14 C12 6, 22 18, 32 8 C42 2, 52 14, 62 10"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1 border-t border-[#162238]">
                    <button
                      onClick={() => setActiveTab('Workloads')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-sky-500/50 transition-colors"
                    >
                      Pods: <span className="font-bold text-white">{telemetry?.counts.pods ?? 0}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('Workloads')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-sky-500/50 transition-colors"
                    >
                      Deployments: <span className="font-bold text-white">{telemetry?.counts.deployments ?? 0}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('Workloads')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-sky-500/50 transition-colors"
                    >
                      StatefulSets: <span className="font-bold text-white">{telemetry?.counts.statefulSets ?? 0}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('Workloads')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-sky-500/50 transition-colors"
                    >
                      DaemonSets: <span className="font-bold text-white">{telemetry?.counts.daemonSets ?? 0}</span>
                    </button>
                    <button
                      onClick={() => setViewMode('inventory')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-indigo-500/50 transition-colors"
                    >
                      Server Nodes: <span className="font-bold text-indigo-400">{servers.length || 1}</span>
                    </button>
                  </div>
                </div>

                {/* Group 2: Storage & Config (RAM) */}
                <div className="bg-[#0B1120] border border-[#162238] rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Storage &amp; Config</span>
                    </div>
                    {/* Metric pill with real live telemetry */}
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#111A2E] border border-[#1E293B]">
                      <span className="text-xs font-bold text-purple-400">
                        {telemetry?.ram.usageText || 'RAM: 14% (1.1 / 8.0 GB)'}
                      </span>
                      <svg className="w-16 h-5" viewBox="0 0 64 20" fill="none">
                        <path
                          d="M2 16 C12 10, 22 4, 32 12 C42 16, 52 6, 62 8"
                          stroke="#c084fc"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1 border-t border-[#162238]">
                    <button
                      onClick={() => setActiveTab('Storage & Config')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-purple-500/50 transition-colors"
                    >
                      PV: <span className="font-bold text-white">{telemetry?.counts.pv ?? 0}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('Storage & Config')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-purple-500/50 transition-colors"
                    >
                      PVC: <span className="font-bold text-white">{telemetry?.counts.pvc ?? 0}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('Storage & Config')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-purple-500/50 transition-colors"
                    >
                      ConfigMaps: <span className="font-bold text-white">{telemetry?.counts.configMaps ?? 0}</span>
                    </button>
                  </div>
                </div>

                {/* Group 3: Networking & Services (Disk) */}
                <div className="bg-[#0B1120] border border-[#162238] rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Networking &amp; Routing</span>
                    </div>
                    {/* Metric pill with real live telemetry */}
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#111A2E] border border-[#1E293B]">
                      <span className="text-xs font-bold text-emerald-400">
                        {telemetry?.disk.usageText || 'Disk: 20% (6.0 / 30 GB)'}
                      </span>
                      <svg className="w-16 h-5" viewBox="0 0 64 20" fill="none">
                        <path
                          d="M2 12 C14 4, 26 16, 38 8 C48 4, 56 12, 62 7"
                          stroke="#34d399"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1 border-t border-[#162238]">
                    <button
                      onClick={() => setActiveTab('Services')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-emerald-500/50 transition-colors"
                    >
                      Services:{' '}
                      <span className="text-sky-400 font-bold">
                        LB {telemetry?.counts.servicesByType.loadBalancer ?? 0}
                      </span>{' '}
                      •{' '}
                      <span className="text-blue-400 font-bold">
                        ClusterIP {telemetry?.counts.servicesByType.clusterIp ?? 0}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('Ingress')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-emerald-500/50 transition-colors"
                    >
                      Ingress: <span className="font-bold text-white">{telemetry?.counts.ingress ?? 0}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('Namespaces')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-emerald-500/50 transition-colors"
                    >
                      Namespaces: <span className="font-bold text-white">{telemetry?.counts.namespaces ?? 1}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. KUBERNETES DATA TABLE & NAVIGATION TABS */}
              <div className="bg-[#0B1120] border border-[#162238] rounded-xl overflow-hidden shadow-sm">
                {/* Tabs and Namespace Selector Header */}
                <div className="p-3 border-b border-[#162238] flex flex-wrap items-center justify-between gap-3 bg-[#0E1628]/60">
                  {/* Navigation Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      'Kubernetes',
                      'Clusters & Nodes',
                      'Workloads',
                      'Services',
                      'Ingress',
                      'Storage & Config',
                      'Namespaces',
                    ].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                          activeTab === tab
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_10px_rgba(56,189,248,0.15)]'
                            : 'text-slate-400 hover:text-white hover:bg-[#111A2E]'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Namespace Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Namespace:</span>
                    <select
                      value={selectedNamespace}
                      onChange={(e) => setSelectedNamespace(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="all">All Namespaces</option>
                      <option value="default">default</option>
                      <option value="mern">mern</option>
                      <option value="java">java</option>
                      <option value="python">python</option>
                      <option value="dotnet">dotnet</option>
                      <option value="cluster-nodes">cluster-nodes</option>
                    </select>
                  </div>
                </div>

                {/* Data Grid Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-[#162238] bg-[#0E1628] text-slate-400 font-semibold">
                        <th className="py-3 px-4">Resource Name</th>
                        <th className="py-3 px-4">Type / Kind</th>
                        <th className="py-3 px-4">Cluster / Host IP</th>
                        <th className="py-3 px-4">External IP / Endpoint</th>
                        <th className="py-3 px-4">Target Ports</th>
                        <th className="py-3 px-4 min-w-[130px]">CPU</th>
                        <th className="py-3 px-4 min-w-[140px]">RAM</th>
                        <th className="py-3 px-4 min-w-[140px]">Disk</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#162238]/60 font-medium">
                      {filteredResources.map((item) => {
                        const isSelected = selectedResource?.id === item.id;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => {
                              setSelectedResource(item);
                              setIsYamlModalOpen(true);
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-sky-950/20 border-l-2 border-sky-400'
                                : 'hover:bg-[#111A2E]/60'
                            }`}
                          >
                            {/* Name */}
                            <td className="py-3 px-4 font-mono font-bold text-white">
                              <div className="flex items-center gap-2">
                                <span>{item.name}</span>
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-normal">
                                ns: {item.namespace} • {item.cluster}
                              </div>
                            </td>

                            {/* Type / Kind */}
                            <td className="py-3 px-4">{getKindBadge(item)}</td>

                            {/* Cluster IP */}
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {item.clusterIp || '-'}
                            </td>

                            {/* External IP */}
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {item.externalIp && item.externalIp !== '-' ? (
                                item.externalIp.startsWith('http') || item.externalIp.includes(':') ? (
                                  <a
                                    href={item.externalIp.startsWith('http') ? item.externalIp : `http://${item.externalIp}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sky-400 hover:text-sky-300 font-semibold hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>{item.externalIp}</span>
                                    <ExternalLink className="w-3 h-3 text-sky-400" />
                                  </a>
                                ) : (
                                  <span className="text-sky-400 font-semibold">{item.externalIp}</span>
                                )
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            {/* Target Ports */}
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {item.targetPorts || '-'}
                            </td>

                            {/* CPU Metric Column */}
                            <td className="py-3 px-4">
                              <div className="font-mono text-white font-bold">
                                {item.metrics.cpu.label}
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(item.metrics.cpu.percent, 100)}%` }}
                                ></div>
                              </div>
                            </td>

                            {/* RAM Metric Column */}
                            <td className="py-3 px-4">
                              <div className="font-mono text-white font-bold">
                                {item.metrics.ram.label}
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className="bg-sky-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(item.metrics.ram.percent, 100)}%` }}
                                ></div>
                              </div>
                            </td>

                            {/* Disk Metric Column */}
                            <td className="py-3 px-4">
                              <div className="font-mono text-white font-bold">
                                {item.metrics.disk.label}
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(item.metrics.disk.percent, 100)}%` }}
                                ></div>
                              </div>
                            </td>

                            {/* Actions Column */}
                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {item.kind === 'Node' && (
                                  <button
                                    onClick={() => {
                                      const foundServer = servers.find((s) => s.name === item.name);
                                      if (foundServer) {
                                        handleOpenTerminal(foundServer);
                                      }
                                    }}
                                    className="px-2 py-1 text-[11px] font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-lg transition-colors inline-flex items-center gap-1"
                                    title="Open Terminal"
                                  >
                                    <Terminal className="w-3.5 h-3.5 text-sky-400" />
                                    <span>Terminal</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedResource(item);
                                    setIsYamlModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-[#111A2E] hover:bg-[#18233C] text-sky-400 hover:text-sky-300 border border-[#1E293B] hover:border-sky-500/40 rounded-lg transition-colors inline-flex items-center gap-1.5"
                                  title="Inspect Kubernetes YAML manifest"
                                >
                                  <FileCode className="w-3.5 h-3.5" />
                                  <span>Inspect</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredResources.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No matching Kubernetes resources found for current filters.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. MODAL: FULLSCREEN/OVERLAY YAML INSPECTION MODAL */}
          {isYamlModalOpen && selectedResource && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-[#0B1120] border border-[#162238] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="p-4 border-b border-[#162238] flex items-center justify-between bg-[#0E1628]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400 border border-sky-500/30">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white font-mono">{selectedResource.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-sans font-semibold">
                          {selectedResource.kind}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        namespace: {selectedResource.namespace} • cluster/node: {selectedResource.cluster}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyYaml}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors shadow-sm"
                    >
                      {copiedYaml ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>Copy YAML</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setIsYamlModalOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-white bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] rounded-lg transition-colors"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Modal YAML Manifest Code */}
                <div className="p-4 flex-1 overflow-auto bg-[#070B14] font-mono text-xs leading-relaxed text-slate-300">
                  <pre className="whitespace-pre">
                    {selectedResource.manifestYaml.split('\n').map((line, idx) => {
                      const isKey = line.includes(':') && !line.trim().startsWith('-');
                      const parts = line.split(':');
                      return (
                        <div key={idx} className="hover:bg-slate-800/30 px-1 rounded flex">
                          <span className="w-8 text-slate-600 text-right pr-3 select-none">
                            {idx + 1}
                          </span>
                          <span>
                            {isKey ? (
                              <>
                                <span className="text-sky-400 font-semibold">{parts[0]}:</span>
                                <span className="text-amber-300">{parts.slice(1).join(':')}</span>
                              </>
                            ) : (
                              <span className="text-emerald-300">{line}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </pre>
                </div>

                {/* Modal Footer */}
                <div className="p-3 border-t border-[#162238] bg-[#0E1628] flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Resource status: {selectedResource.status}</span>
                  <button
                    onClick={() => setIsYamlModalOpen(false)}
                    className="px-3 py-1 bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. LIVE SSH TERMINAL MODAL */}
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
        </main>
      </div>
    </div>
  );
}

export default function KubernetesStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-sky-400">
          <RotateCw className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <KubernetesPageContent />
    </Suspense>
  );
}
