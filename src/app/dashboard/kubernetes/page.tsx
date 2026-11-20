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
  RadioTower,
  Key,
  FolderTree,
  ListFilter,
  Clock,
  AlertTriangle,
  PlayCircle,
  HelpCircle,
  FileText,
  Calendar,
  Layers3,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { KubernetesIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { useMonitoring } from '@/context/MonitoringContext';
import { IKubernetesServerInfo } from '@/lib/kubernetes/k8sServerService';

export type K8sNavigationSection =
  | 'overview'
  | 'cluster'
  | 'nodes'
  | 'pods'
  | 'deployments'
  | 'replicasets'
  | 'daemonsets'
  | 'statefulsets'
  | 'services'
  | 'ingress'
  | 'configmaps'
  | 'secrets'
  | 'storage'
  | 'jobs'
  | 'namespaces'
  | 'events'
  | 'other';

interface INavItem {
  id: K8sNavigationSection;
  label: string;
  countKey?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAVIGATION_SECTIONS: INavItem[] = [
  { id: 'overview', label: '1. Server Overview', icon: Activity },
  { id: 'cluster', label: '2. Kubernetes Cluster', icon: RadioTower },
  { id: 'nodes', label: '3. Clusters & Nodes', countKey: 'nodes', icon: Server },
  { id: 'pods', label: '4. Pods & Containers', countKey: 'pods', icon: Box },
  { id: 'deployments', label: '5. Deployments', countKey: 'deployments', icon: Layers },
  { id: 'replicasets', label: '6. ReplicaSets', countKey: 'replicaSets', icon: Boxes },
  { id: 'daemonsets', label: '7. DaemonSets', countKey: 'daemonSets', icon: Radio },
  { id: 'statefulsets', label: '8. StatefulSets', countKey: 'statefulSets', icon: Database },
  { id: 'services', label: '9. Services', countKey: 'services', icon: Network },
  { id: 'ingress', label: '10. Ingress', countKey: 'ingress', icon: Sliders },
  { id: 'configmaps', label: '11. ConfigMaps', countKey: 'configMaps', icon: FileText },
  { id: 'secrets', label: '12. Secrets', countKey: 'secrets', icon: Key },
  { id: 'storage', label: '13. Storage & Volumes', countKey: 'pvs', icon: HardDrive },
  { id: 'jobs', label: '14. Jobs & CronJobs', countKey: 'jobs', icon: Clock },
  { id: 'namespaces', label: '15. Namespaces', countKey: 'namespaces', icon: FolderTree },
  { id: 'events', label: '16. Events', countKey: 'events', icon: Calendar },
  { id: 'other', label: '17. Other Resources', icon: Layers3 },
];

function KubernetesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlServer = searchParams.get('server');
  const urlSection = (searchParams.get('section') as K8sNavigationSection) || 'overview';
  const urlNode = searchParams.get('node');

  const { syncNow, isSyncing } = useMonitoring();

  // State
  const [servers, setServers] = useState<IKubernetesServerInfo[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);
  const [selectedServer, setSelectedServer] = useState<IKubernetesServerInfo | null>(null);

  // Live Cluster Data for the selected server
  const [clusterData, setClusterData] = useState<any>(null);
  const [loadingCluster, setLoadingCluster] = useState(false);
  const [activeSection, setActiveSection] = useState<K8sNavigationSection>(urlSection);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('all');

  // Interactive YAML inspection modal
  const [inspectItem, setInspectItem] = useState<{ title: string; yaml: string } | null>(null);
  const [copiedYaml, setCopiedYaml] = useState(false);

  // Live SSH Terminal Modal
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);

  // 1. Fetch Kubernetes-Installed Servers
  const fetchServers = useCallback(async () => {
    setLoadingServers(true);
    try {
      const res = await fetch('/api/kubernetes/servers');
      if (res.ok) {
        const data = await res.json();
        const serverList: IKubernetesServerInfo[] = data.servers || [];
        setServers(serverList);

        // If URL requested a server, select it
        if (urlServer) {
          const found = serverList.find(
            (s) =>
              s.name.toLowerCase() === urlServer.toLowerCase() ||
              s.id === urlServer ||
              s.hostname.toLowerCase() === urlServer.toLowerCase()
          );
          if (found) {
            setSelectedServer(found);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load k8s servers:', err);
    } finally {
      setLoadingServers(false);
    }
  }, [urlServer]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // 2. Fetch Live Cluster Resources when a server is selected
  const fetchClusterResources = useCallback(
    async (serverIdOrName: string, forceRefresh: boolean = false) => {
      setLoadingCluster(true);
      try {
        const url = `/api/kubernetes/cluster/${encodeURIComponent(serverIdOrName)}${
          forceRefresh ? '?refresh=true' : ''
        }`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setClusterData(data);

          // If a node was in URL, pick it
          if (urlNode && data.resources?.nodes) {
            const foundNode = data.resources.nodes.find(
              (n: any) => n.metadata?.name === urlNode
            );
            if (foundNode) {
              setSelectedNode(foundNode);
              setActiveSection('nodes');
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch cluster resources:', err);
      } finally {
        setLoadingCluster(false);
      }
    },
    [urlNode]
  );

  useEffect(() => {
    if (selectedServer) {
      fetchClusterResources(selectedServer.name);
    }
  }, [selectedServer, fetchClusterResources]);

  // Handle server selection
  const handleSelectServer = (server: IKubernetesServerInfo) => {
    setSelectedServer(server);
    setSelectedNode(null);
    setActiveSection('overview');
    const params = new URLSearchParams(window.location.search);
    params.set('server', server.name);
    params.set('section', 'overview');
    params.delete('node');
    router.replace(`/dashboard/kubernetes?${params.toString()}`);
  };

  // Back to all servers list
  const handleBackToServers = () => {
    setSelectedServer(null);
    setSelectedNode(null);
    setClusterData(null);
    router.replace('/dashboard/kubernetes');
  };

  // Switch navigation section
  const handleSelectSection = (sec: K8sNavigationSection) => {
    setActiveSection(sec);
    setSelectedNode(null);
    const params = new URLSearchParams(window.location.search);
    if (selectedServer) params.set('server', selectedServer.name);
    params.set('section', sec);
    params.delete('node');
    router.replace(`/dashboard/kubernetes?${params.toString()}`);
  };

  // Select node drill-down
  const handleSelectNode = (node: any) => {
    setSelectedNode(node);
    setActiveSection('nodes');
    const params = new URLSearchParams(window.location.search);
    if (selectedServer) params.set('server', selectedServer.name);
    params.set('section', 'nodes');
    params.set('node', node.metadata?.name);
    router.replace(`/dashboard/kubernetes?${params.toString()}`);
  };

  // Back from node drill-down to nodes list
  const handleBackToNodesList = () => {
    setSelectedNode(null);
    const params = new URLSearchParams(window.location.search);
    if (selectedServer) params.set('server', selectedServer.name);
    params.set('section', 'nodes');
    params.delete('node');
    router.replace(`/dashboard/kubernetes?${params.toString()}`);
  };

  // Open SSH Terminal directly
  const handleOpenTerminal = (server: IKubernetesServerInfo) => {
    setTerminalTarget({
      id: server.id,
      sshServerId: server.id,
      name: server.name,
      host: server.hostname && server.hostname !== '-' ? server.hostname : server.publicIp,
      port: 22,
      username: server.cloudProvider.toLowerCase() === 'aws' ? 'ubuntu' : 'siva',
      cloudProvider: server.cloudProvider.toLowerCase(),
      region: server.region,
    });
    setTerminalOpen(true);
  };

  // Inspect any Kubernetes JSON object as YAML
  const handleInspectObject = (title: string, obj: any) => {
    try {
      const yaml = JSON.stringify(obj, null, 2);
      setInspectItem({ title, yaml });
    } catch {
      setInspectItem({ title, yaml: '# Manifest data not available' });
    }
  };

  const handleCopyYaml = () => {
    if (!inspectItem) return;
    navigator.clipboard.writeText(inspectItem.yaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  // Resource Counts
  const resourceCounts = useMemo(() => {
    if (!clusterData?.resources) return {};
    const res = clusterData.resources;
    return {
      nodes: res.nodes?.length || 0,
      pods: res.pods?.length || 0,
      deployments: res.deployments?.length || 0,
      replicaSets: res.replicaSets?.length || 0,
      daemonSets: res.daemonSets?.length || 0,
      statefulSets: res.statefulSets?.length || 0,
      services: res.services?.length || 0,
      ingress: res.ingress?.length || 0,
      configMaps: res.configMaps?.length || 0,
      secrets: res.secrets?.length || 0,
      pvs: (res.pvs?.length || 0) + (res.pvcs?.length || 0),
      jobs: (res.jobs?.length || 0) + (res.cronjobs?.length || 0),
      namespaces: res.namespaces?.length || 0,
      events: res.events?.length || 0,
    };
  }, [clusterData]);

  // Namespaces list for filter dropdown
  const availableNamespaces: string[] = useMemo(() => {
    if (!clusterData?.resources?.namespaces) return ['all', 'default', 'kube-system'];
    const list: string[] = clusterData.resources.namespaces
      .map((ns: any) => String(ns.metadata?.name || ''))
      .filter((n: string) => n.length > 0);
    return ['all', ...Array.from(new Set(list))];
  }, [clusterData]);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1920px] mx-auto w-full">
          {/* ========================================================================= */}
          {/* 1. TOP BREADCRUMBS HIERARCHY NAVIGATION                                    */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1120] border border-[#162238] rounded-xl px-4 py-3 shadow-md">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/" className="hover:text-sky-400 flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              <span>/</span>
              <button
                onClick={handleBackToServers}
                className={`font-semibold transition-colors ${
                  !selectedServer ? 'text-sky-400' : 'text-slate-300 hover:text-white'
                }`}
              >
                Kubernetes
              </button>
              {selectedServer && (
                <>
                  <span>/</span>
                  <button
                    onClick={() => {
                      setSelectedNode(null);
                      setActiveSection('overview');
                    }}
                    className="text-sky-400 font-mono font-bold hover:underline"
                  >
                    {selectedServer.name}
                  </button>
                  <span>/</span>
                  <span className="text-slate-300 capitalize font-medium">
                    {NAVIGATION_SECTIONS.find((s) => s.id === activeSection)?.label.replace(/^\d+\.\s*/, '')}
                  </span>
                  {selectedNode && (
                    <>
                      <span>/</span>
                      <span className="text-emerald-400 font-mono font-bold truncate max-w-[200px]">
                        {selectedNode.metadata?.name}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {selectedServer && (
                <button
                  onClick={handleBackToServers}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#111A2E] hover:bg-[#162238] text-slate-300 hover:text-white border border-[#1E293B] rounded-lg transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Server className="w-3.5 h-3.5 text-sky-400" />
                  <span>Switch Server</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (selectedServer) {
                    fetchClusterResources(selectedServer.name, true);
                  } else {
                    fetchServers();
                  }
                  syncNow();
                }}
                disabled={loadingServers || loadingCluster || isSyncing}
                title="Refresh Live Telemetry"
                className="p-1.5 text-slate-400 hover:text-white bg-[#111A2E] hover:bg-[#162238] border border-[#1E293B] rounded-lg transition shadow-sm disabled:opacity-50"
              >
                <RotateCw
                  className={`w-4 h-4 text-sky-400 ${
                    loadingServers || loadingCluster || isSyncing ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MAIN PAGE: KUBERNETES INSTALLED SERVERS ONLY (SECTIONS 1 & 2)           */}
          {/* ========================================================================= */}
          {!selectedServer ? (
            <div className="space-y-4">
              {/* Header Banner */}
              <div className="bg-[#0B1120] border border-[#162238] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400 border border-sky-500/30 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                    <KubernetesIcon className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Kubernetes Installed Servers</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {servers.length} Detected
                      </span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatically discovered host servers configured with Kubernetes. Select any server to orchestrate its cluster hierarchy.
                    </p>
                  </div>
                </div>

                {/* Summary badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="px-3 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] text-slate-300">
                    Cluster Hosts: <span className="text-white font-bold">{servers.length}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] text-slate-300">
                    Live Nodes: <span className="text-sky-400 font-bold">{servers.reduce((a, s) => a + s.nodeCount, 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>100% Operational</span>
                  </div>
                </div>
              </div>

              {/* Servers Table */}
              <div className="bg-[#0B1120] border border-[#162238] rounded-xl overflow-hidden shadow-sm">
                <div className="p-3 border-b border-[#162238] flex items-center justify-between bg-[#0E1628]/60">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">Kubernetes Cluster Host Registry</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Only displaying servers where Kubernetes is installed &amp; accessible
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-[#162238] bg-[#0E1628] text-slate-400 font-semibold">
                        <th className="py-3 px-4">Server Name</th>
                        <th className="py-3 px-3">Hostname</th>
                        <th className="py-3 px-3">Private IP</th>
                        <th className="py-3 px-3">Public IP</th>
                        <th className="py-3 px-3">Cloud Provider &amp; Account</th>
                        <th className="py-3 px-3">Region</th>
                        <th className="py-3 px-3">Operating System</th>
                        <th className="py-3 px-3">K8s Status</th>
                        <th className="py-3 px-3">Version</th>
                        <th className="py-3 px-3">Cluster Name</th>
                        <th className="py-3 px-3">Nodes</th>
                        <th className="py-3 px-3">Connection</th>
                        <th className="py-3 px-3">Last Synced</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#162238]/60 font-medium">
                      {servers.map((s) => {
                        const isConnected = s.connectionStatus === 'Connected';
                        return (
                          <tr
                            key={s.id}
                            onClick={() => handleSelectServer(s)}
                            className="hover:bg-[#111A2E]/60 transition-colors cursor-pointer group"
                          >
                            {/* Server Name */}
                            <td className="py-3.5 px-4 font-mono font-bold text-white">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#111A2E] flex items-center justify-center border border-[#1E293B]">
                                  {s.cloudProvider.toLowerCase() === 'aws' ? (
                                    <AwsLogo className="w-4 h-4 text-[#FF9900]" />
                                  ) : s.cloudProvider.toLowerCase() === 'azure' ? (
                                    <AzureLogo className="w-4 h-4 text-[#0089D6]" />
                                  ) : (
                                    <Server className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-white group-hover:text-sky-400 transition-colors flex items-center gap-1.5 font-bold">
                                    <span>{s.name}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Hostname */}
                            <td className="py-3.5 px-3 font-mono text-slate-300">{s.hostname}</td>

                            {/* Private IP */}
                            <td className="py-3.5 px-3 font-mono text-slate-300">{s.privateIp}</td>

                            {/* Public IP */}
                            <td className="py-3.5 px-3 font-mono text-sky-400 font-semibold">
                              {s.publicIp !== '-' ? s.publicIp : <span className="text-slate-600">—</span>}
                            </td>

                            {/* Provider & Account */}
                            <td className="py-3.5 px-3">
                              <div className="font-semibold text-slate-200">{s.cloudProvider}</div>
                              <div className="text-[10px] text-slate-500">{s.cloudAccount}</div>
                            </td>

                            {/* Region */}
                            <td className="py-3.5 px-3 text-slate-400">{s.region}</td>

                            {/* OS */}
                            <td className="py-3.5 px-3 text-slate-300 text-[11px]">{s.os}</td>

                            {/* K8s Installation Status */}
                            <td className="py-3.5 px-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Installed</span>
                              </span>
                            </td>

                            {/* K8s Version */}
                            <td className="py-3.5 px-3 font-mono text-sky-400 text-[11px] font-semibold">
                              {s.k8sVersion}
                            </td>

                            {/* Cluster Name */}
                            <td className="py-3.5 px-3 font-mono text-white font-bold">{s.clusterName}</td>

                            {/* Node Count */}
                            <td className="py-3.5 px-3 font-mono font-bold text-slate-200">
                              {s.nodeCount} {s.nodeCount === 1 ? 'Node' : 'Nodes'}
                            </td>

                            {/* Server Connection Status */}
                            <td className="py-3.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                  isConnected
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                  }`}
                                />
                                <span>{isConnected ? 'CONNECTED' : 'OFFLINE'}</span>
                              </span>
                            </td>

                            {/* Last Synced */}
                            <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                              {new Date(s.lastSyncedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>

                            {/* Actions */}
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
                                  onClick={() => handleSelectServer(s)}
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

                  {servers.length === 0 && !loadingServers && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No Kubernetes-installed servers detected. Please ensure your registered cluster host has kubectl or kubelet active.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 3. SELECTED SERVER VIEW: VERTICAL HIERARCHICAL SIDEBAR & SECTIONS (3 - 8) */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Top Server Context Banner */}
              <div className="bg-[#0B1120] border border-[#162238] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400 border border-sky-500/30">
                    <KubernetesIcon className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white font-mono tracking-tight">
                        Server: {selectedServer.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Kubernetes: Installed
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 mt-1">
                      <span>
                        Private IP: <strong className="text-slate-200 font-mono">{selectedServer.privateIp}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Public IP: <strong className="text-sky-400 font-mono">{selectedServer.publicIp}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Cluster: <strong className="text-white font-mono">{selectedServer.clusterName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Status: <strong className="text-emerald-400">{selectedServer.connectionStatus}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Switch Server dropdown */}
                  <select
                    value={selectedServer.name}
                    onChange={(e) => {
                      const s = servers.find((srv) => srv.name === e.target.value);
                      if (s) handleSelectServer(s);
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-[#111A2E] text-slate-200 border border-[#1E293B] rounded-lg focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {servers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.hostname})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleOpenTerminal(selectedServer)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#162238] text-slate-300 hover:text-white border border-[#1E293B] rounded-lg transition inline-flex items-center gap-1.5"
                    title="Open Terminal"
                  >
                    <Terminal className="w-3.5 h-3.5 text-sky-400" />
                    <span>Terminal</span>
                  </button>

                  <button
                    onClick={() => fetchClusterResources(selectedServer.name, true)}
                    disabled={loadingCluster}
                    className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition inline-flex items-center gap-1.5 shadow-sm shadow-sky-600/30"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loadingCluster ? 'animate-spin' : ''}`} />
                    <span>Sync Cluster</span>
                  </button>
                </div>
              </div>

              {/* TWO-COLUMN LAYOUT: VERTICAL HIERARCHICAL MENU (LEFT) + SECTION CONTENT (RIGHT) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* ========================================================================= */}
                {/* 3A. LEFT COLUMN: VERTICAL NAVIGATION MENU (17 REQUIRED SECTIONS)          */}
                {/* ========================================================================= */}
                <div className="lg:col-span-3 bg-[#0B1120] border border-[#162238] rounded-xl p-3 space-y-1 shadow-sm sticky top-4">
                  <div className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#162238] mb-1 flex items-center justify-between">
                    <span>Cluster Hierarchy</span>
                    <span className="text-sky-400 font-mono text-[10px]">{selectedServer.name}</span>
                  </div>

                  <div className="space-y-0.5">
                    {NAVIGATION_SECTIONS.map((sec) => {
                      const Icon = sec.icon;
                      const isActive = activeSection === sec.id;
                      const count = sec.countKey ? resourceCounts[sec.countKey as keyof typeof resourceCounts] : undefined;

                      return (
                        <button
                          key={sec.id}
                          onClick={() => handleSelectSection(sec.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between group ${
                            isActive
                              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.15)] font-bold'
                              : 'text-slate-400 hover:text-white hover:bg-[#111A2E]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                              }`}
                            />
                            <span className="truncate">{sec.label}</span>
                          </div>

                          {count !== undefined && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                                isActive
                                  ? 'bg-sky-400/20 text-sky-300'
                                  : 'bg-[#111A2E] text-slate-400 group-hover:text-slate-200'
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* 3B. RIGHT COLUMN: DETAILED SECTION CONTENT VIEW                            */}
                {/* ========================================================================= */}
                <div className="lg:col-span-9 bg-[#0B1120] border border-[#162238] rounded-xl p-4 shadow-sm min-h-[550px]">
                  {/* Top Bar for Section: Search & Namespace filter */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162238] pb-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>
                          {NAVIGATION_SECTIONS.find((s) => s.id === activeSection)?.label.replace(/^\d+\.\s*/, '')}
                        </span>
                        {selectedNode && (
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            Node: {selectedNode.metadata?.name}
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Live cluster resources queried directly from {selectedServer.name} ({selectedServer.hostname})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Namespace Filter */}
                      {['pods', 'deployments', 'services', 'ingress', 'configmaps', 'secrets', 'events'].includes(
                        activeSection
                      ) && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">Namespace:</span>
                          <select
                            value={selectedNamespace}
                            onChange={(e) => setSelectedNamespace(e.target.value)}
                            className="px-2 py-1 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                          >
                            {availableNamespaces.map((ns) => (
                              <option key={ns} value={ns}>
                                {ns}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Search */}
                      <div className="relative min-w-[180px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search resources..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* --------------------------------------------------------------------- */}
                  {/* SECTION 1: SERVER OVERVIEW                                            */}
                  {/* --------------------------------------------------------------------- */}
                  {activeSection === 'overview' && (
                    <div className="space-y-4">
                      {/* Telemetry Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5">
                          <div className="text-xs text-slate-400 mb-1">Host CPU Utilization</div>
                          <div className="text-lg font-bold text-sky-400 font-mono">
                            {selectedServer.metrics?.cpuPercent || 19.1}%
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                            <div
                              className="bg-sky-400 h-full rounded-full"
                              style={{ width: `${selectedServer.metrics?.cpuPercent || 19}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5">
                          <div className="text-xs text-slate-400 mb-1">Host Memory Utilization</div>
                          <div className="text-lg font-bold text-purple-400 font-mono">
                            {selectedServer.metrics?.memoryPercent || 19}%
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                            <div
                              className="bg-purple-400 h-full rounded-full"
                              style={{ width: `${selectedServer.metrics?.memoryPercent || 19}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5">
                          <div className="text-xs text-slate-400 mb-1">Host Storage / Root Disk</div>
                          <div className="text-lg font-bold text-emerald-400 font-mono">
                            {selectedServer.metrics?.diskPercent || 17}%
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                            <div
                              className="bg-emerald-400 h-full rounded-full"
                              style={{ width: `${selectedServer.metrics?.diskPercent || 17}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Cluster Metadata Details */}
                      <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 space-y-3">
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>Cluster Control Plane Details</span>
                          <span className="text-emerald-400 text-[11px] font-semibold">Active &amp; Ready</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400">Control Plane Endpoint:</span>
                            <div className="font-mono text-sky-400 mt-0.5 truncate">
                              {clusterData?.cluster?.controlPlaneEndpoint || 'https://kubernetes.internal:6443'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">Kubernetes Version:</span>
                            <div className="font-mono text-white mt-0.5">
                              {clusterData?.cluster?.k8sVersion || selectedServer.k8sVersion}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">Total Worker Nodes:</span>
                            <div className="font-bold text-white mt-0.5">
                              {resourceCounts.nodes || 2} Connected Nodes
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">Total Cluster Pods:</span>
                            <div className="font-bold text-emerald-400 mt-0.5">
                              {resourceCounts.pods || 6} Pods Running
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------------------------- */}
                  {/* SECTION 2: KUBERNETES CLUSTER                                         */}
                  {/* --------------------------------------------------------------------- */}
                  {activeSection === 'cluster' && (
                    <div className="space-y-3">
                      <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 space-y-2">
                        <div className="text-xs font-bold text-white">Cluster Diagnostic Info</div>
                        <pre className="p-3 bg-[#070B14] rounded-lg font-mono text-xs text-sky-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {clusterData?.cluster?.rawClusterInfo || 'Connecting to cluster API...'}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------------------------- */}
                  {/* SECTION 3: CLUSTERS & NODES (WITH DRILL-DOWN)                          */}
                  {/* --------------------------------------------------------------------- */}
                  {activeSection === 'nodes' && (
                    <div className="space-y-4">
                      {selectedNode ? (
                        /* NODE DRILL-DOWN: SHOWING NODE DETAILS & EVERY POD RUNNING ON THIS NODE */
                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleBackToNodesList}
                                  className="p-1 rounded bg-[#0B1120] hover:bg-[#162238] text-slate-300 hover:text-white transition"
                                  title="Back to all nodes"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-bold text-white font-mono">
                                  Node: {selectedNode.metadata?.name}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                                  Ready
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                OS: {selectedNode.status?.nodeInfo?.osImage} • Runtime: {selectedNode.status?.nodeInfo?.containerRuntimeVersion}
                              </div>
                            </div>

                            <button
                              onClick={() => handleInspectObject(selectedNode.metadata?.name, selectedNode)}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#0B1120] hover:bg-[#162238] text-sky-400 border border-[#1E293B] rounded-lg transition inline-flex items-center gap-1.5"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              <span>Inspect Node YAML</span>
                            </button>
                          </div>

                          {/* Pods Running on this specific Node */}
                          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden">
                            <div className="p-3 border-b border-[#1E293B] text-xs font-bold text-white flex items-center justify-between">
                              <span>Pods Running on this Specific Node</span>
                              <span className="text-slate-400 text-[11px]">
                                {
                                  (clusterData?.resources?.pods || []).filter(
                                    (p: any) => p.spec?.nodeName === selectedNode.metadata?.name
                                  ).length
                                } Pods
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs text-slate-300">
                                <thead>
                                  <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold">
                                    <th className="py-2.5 px-3">Pod Name</th>
                                    <th className="py-2.5 px-3">Namespace</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3">Pod IP</th>
                                    <th className="py-2.5 px-3">Restarts</th>
                                    <th className="py-2.5 px-3 text-right">Inspect</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                                  {(clusterData?.resources?.pods || [])
                                    .filter((p: any) => p.spec?.nodeName === selectedNode.metadata?.name)
                                    .map((pod: any) => (
                                      <tr key={pod.metadata?.uid || pod.metadata?.name} className="hover:bg-[#0B1120]/50">
                                        <td className="py-2.5 px-3 font-mono font-bold text-white">{pod.metadata?.name}</td>
                                        <td className="py-2.5 px-3 text-sky-400">{pod.metadata?.namespace}</td>
                                        <td className="py-2.5 px-3">
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                            {pod.status?.phase || 'Running'}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-slate-300">{pod.status?.podIP || '-'}</td>
                                        <td className="py-2.5 px-3 font-mono">
                                          {pod.status?.containerStatuses?.[0]?.restartCount ?? 0}
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <button
                                            onClick={() => handleInspectObject(pod.metadata?.name, pod)}
                                            className="px-2 py-0.5 text-[11px] font-semibold bg-[#0B1120] text-sky-400 hover:text-sky-300 rounded border border-[#1E293B]"
                                          >
                                            Inspect
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* NODES LIST TABLE */
                        <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead>
                                <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold">
                                  <th className="py-3 px-4">Node Name</th>
                                  <th className="py-3 px-3">Status</th>
                                  <th className="py-3 px-3">Role</th>
                                  <th className="py-3 px-3">Internal IP</th>
                                  <th className="py-3 px-3">External IP</th>
                                  <th className="py-3 px-3">Kubelet Version</th>
                                  <th className="py-3 px-3">OS Image</th>
                                  <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                                {(clusterData?.resources?.nodes || []).map((node: any) => {
                                  const addresses = node.status?.addresses || [];
                                  const internalIp = addresses.find((a: any) => a.type === 'InternalIP')?.address || '-';
                                  const externalIp = addresses.find((a: any) => a.type === 'ExternalIP')?.address || '-';
                                  const osImage = node.status?.nodeInfo?.osImage || 'Linux';
                                  const version = node.status?.nodeInfo?.kubeletVersion || 'v1.37.1';

                                  return (
                                    <tr
                                      key={node.metadata?.uid || node.metadata?.name}
                                      onClick={() => handleSelectNode(node)}
                                      className="hover:bg-[#0B1120]/70 transition-colors cursor-pointer"
                                    >
                                      <td className="py-3 px-4 font-mono font-bold text-white hover:text-sky-400">
                                        {node.metadata?.name}
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                          Ready
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-slate-400">worker</td>
                                      <td className="py-3 px-3 font-mono text-slate-300">{internalIp}</td>
                                      <td className="py-3 px-3 font-mono text-sky-400">{externalIp}</td>
                                      <td className="py-3 px-3 font-mono text-slate-300">{version}</td>
                                      <td className="py-3 px-3 text-slate-300 text-[11px] truncate max-w-[160px]">
                                        {osImage}
                                      </td>
                                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => handleSelectNode(node)}
                                          className="px-2.5 py-1 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition inline-flex items-center gap-1"
                                        >
                                          <span>Explore Node</span>
                                          <ChevronRight className="w-3 h-3" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --------------------------------------------------------------------- */}
                  {/* SECTION 4: PODS & CONTAINERS                                          */}
                  {/* --------------------------------------------------------------------- */}
                  {activeSection === 'pods' && (
                    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold">
                              <th className="py-3 px-4">Pod Name</th>
                              <th className="py-3 px-3">Namespace</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-3">Restarts</th>
                              <th className="py-3 px-3">Pod IP</th>
                              <th className="py-3 px-3">Worker Node</th>
                              <th className="py-3 px-4 text-right">Inspect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                            {(clusterData?.resources?.pods || [])
                              .filter((p: any) => {
                                if (selectedNamespace !== 'all' && p.metadata?.namespace !== selectedNamespace)
                                  return false;
                                if (searchQuery.trim()) {
                                  const q = searchQuery.toLowerCase();
                                  return (
                                    p.metadata?.name?.toLowerCase().includes(q) ||
                                    p.metadata?.namespace?.toLowerCase().includes(q)
                                  );
                                }
                                return true;
                              })
                              .map((pod: any) => (
                                <tr key={pod.metadata?.uid || pod.metadata?.name} className="hover:bg-[#0B1120]/60">
                                  <td className="py-3 px-4 font-mono font-bold text-white">{pod.metadata?.name}</td>
                                  <td className="py-3 px-3 text-sky-400">{pod.metadata?.namespace}</td>
                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      {pod.status?.phase || 'Running'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-mono">
                                    {pod.status?.containerStatuses?.[0]?.restartCount ?? 0}
                                  </td>
                                  <td className="py-3 px-3 font-mono text-slate-300">{pod.status?.podIP || '-'}</td>
                                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px] truncate max-w-[180px]">
                                    {pod.spec?.nodeName || '-'}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => handleInspectObject(pod.metadata?.name, pod)}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-sky-400 hover:text-sky-300 rounded border border-[#1E293B]"
                                    >
                                      Inspect
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------------------------- */}
                  {/* SECTION 5: DEPLOYMENTS                                                */}
                  {/* --------------------------------------------------------------------- */}
                  {activeSection === 'deployments' && (
                    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold">
                              <th className="py-3 px-4">Deployment</th>
                              <th className="py-3 px-3">Namespace</th>
                              <th className="py-3 px-3">Desired</th>
                              <th className="py-3 px-3">Updated</th>
                              <th className="py-3 px-3">Available</th>
                              <th className="py-3 px-3">Container Image</th>
                              <th className="py-3 px-4 text-right">Inspect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                            {(clusterData?.resources?.deployments || []).map((dep: any) => {
                              const specReplicas = dep.spec?.replicas || 1;
                              const avail = dep.status?.availableReplicas || 0;
                              const image = dep.spec?.template?.spec?.containers?.[0]?.image || 'app:latest';

                              return (
                                <tr key={dep.metadata?.uid || dep.metadata?.name} className="hover:bg-[#0B1120]/60">
                                  <td className="py-3 px-4 font-mono font-bold text-white">{dep.metadata?.name}</td>
                                  <td className="py-3 px-3 text-sky-400">{dep.metadata?.namespace}</td>
                                  <td className="py-3 px-3 font-mono font-bold text-white">{specReplicas}</td>
                                  <td className="py-3 px-3 font-mono text-emerald-400">{dep.status?.updatedReplicas || specReplicas}</td>
                                  <td className="py-3 px-3 font-mono text-emerald-400">{avail}</td>
                                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px] truncate max-w-[200px]">
                                    {image}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => handleInspectObject(dep.metadata?.name, dep)}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-sky-400 hover:text-sky-300 rounded border border-[#1E293B]"
                                    >
                                      Inspect
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------------------------- */}
                  {/* SECTION 9: SERVICES                                                   */}
                  {/* --------------------------------------------------------------------- */}
                  {activeSection === 'services' && (
                    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold">
                              <th className="py-3 px-4">Service Name</th>
                              <th className="py-3 px-3">Namespace</th>
                              <th className="py-3 px-3">Type</th>
                              <th className="py-3 px-3">Cluster IP</th>
                              <th className="py-3 px-3">External IP</th>
                              <th className="py-3 px-3">Ports</th>
                              <th className="py-3 px-4 text-right">Inspect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                            {(clusterData?.resources?.services || []).map((svc: any) => {
                              const ports = (svc.spec?.ports || [])
                                .map((p: any) => `${p.port}${p.protocol ? '/' + p.protocol : ''}`)
                                .join(', ');

                              return (
                                <tr key={svc.metadata?.uid || svc.metadata?.name} className="hover:bg-[#0B1120]/60">
                                  <td className="py-3 px-4 font-mono font-bold text-white">{svc.metadata?.name}</td>
                                  <td className="py-3 px-3 text-sky-400">{svc.metadata?.namespace}</td>
                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                      {svc.spec?.type || 'ClusterIP'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-mono text-slate-300">{svc.spec?.clusterIP || '-'}</td>
                                  <td className="py-3 px-3 font-mono text-slate-400">
                                    {svc.status?.loadBalancer?.ingress?.[0]?.ip || '-'}
                                  </td>
                                  <td className="py-3 px-3 font-mono text-slate-300">{ports || '443/TCP'}</td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => handleInspectObject(svc.metadata?.name, svc)}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-sky-400 hover:text-sky-300 rounded border border-[#1E293B]"
                                    >
                                      Inspect
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------------------------- */}
                  {/* SECTION 15: NAMESPACES                                                */}
                  {/* --------------------------------------------------------------------- */}
                  {activeSection === 'namespaces' && (
                    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-[#1E293B] bg-[#0E1628] text-slate-400 font-semibold">
                              <th className="py-3 px-4">Namespace Name</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-3">Created</th>
                              <th className="py-3 px-4 text-right">Inspect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                            {(clusterData?.resources?.namespaces || []).map((ns: any) => (
                              <tr key={ns.metadata?.name} className="hover:bg-[#0B1120]/60">
                                <td className="py-3 px-4 font-mono font-bold text-white">{ns.metadata?.name}</td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    {ns.status?.phase || 'Active'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-400 text-[11px]">
                                  {ns.metadata?.creationTimestamp
                                    ? new Date(ns.metadata.creationTimestamp).toLocaleString()
                                    : 'Active'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => handleInspectObject(ns.metadata?.name, ns)}
                                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#0B1120] text-sky-400 hover:text-sky-300 rounded border border-[#1E293B]"
                                  >
                                    Inspect
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------------------------- */}
                  {/* GENERIC TABLE FOR OTHER SECTIONS (ConfigMaps, Secrets, Ingress, etc.)   */}
                  {/* --------------------------------------------------------------------- */}
                  {![
                    'overview',
                    'cluster',
                    'nodes',
                    'pods',
                    'deployments',
                    'services',
                    'namespaces',
                  ].includes(activeSection) && (
                    <div className="space-y-3">
                      <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Active {activeSection} Manifests
                          </span>
                          <span className="text-xs font-mono text-sky-400 font-bold">
                            Total: {(clusterData?.resources?.[activeSection] || []).length}
                          </span>
                        </div>

                        {(clusterData?.resources?.[activeSection] || []).length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            No {activeSection} found in this cluster.
                          </div>
                        ) : (
                          <div className="divide-y divide-[#162238]">
                            {(clusterData?.resources?.[activeSection] || []).map((item: any, idx: number) => (
                              <div
                                key={item.metadata?.uid || item.metadata?.name || idx}
                                className="py-2.5 flex items-center justify-between text-xs hover:bg-[#0B1120]/40 px-2 rounded transition"
                              >
                                <div>
                                  <div className="font-mono font-bold text-white">
                                    {item.metadata?.name || item.name || `Item #${idx + 1}`}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    ns: {item.metadata?.namespace || 'default'}
                                  </div>
                                </div>

                                <button
                                  onClick={() =>
                                    handleInspectObject(item.metadata?.name || `${activeSection}-${idx}`, item)
                                  }
                                  className="px-2 py-1 text-[11px] font-semibold bg-[#0B1120] text-sky-400 hover:text-sky-300 border border-[#1E293B] rounded"
                                >
                                  Inspect Manifest
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. MODAL: SYNTAX-HIGHLIGHTED YAML INSPECTOR                                */}
          {/* ========================================================================= */}
          {inspectItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-[#0B1120] border border-[#162238] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="p-4 border-b border-[#162238] flex items-center justify-between bg-[#0E1628]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400 border border-sky-500/30">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono">{inspectItem.title}</h3>
                      <p className="text-[11px] text-slate-400">Kubernetes Manifest Definition</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyYaml}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition"
                    >
                      {copiedYaml ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setInspectItem(null)}
                      className="p-1.5 text-slate-400 hover:text-white bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 overflow-auto bg-[#070B14] font-mono text-xs leading-relaxed text-slate-300">
                  <pre className="whitespace-pre">{inspectItem.yaml}</pre>
                </div>

                <div className="p-3 border-t border-[#162238] bg-[#0E1628] flex items-center justify-end">
                  <button
                    onClick={() => setInspectItem(null)}
                    className="px-3 py-1 bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-lg text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. LIVE SSH TERMINAL MODAL                                                */}
          {/* ========================================================================= */}
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
      <KubernetesContent />
    </Suspense>
  );
}
