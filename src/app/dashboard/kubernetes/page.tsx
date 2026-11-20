'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  RotateCw,
  Globe,
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
  Cpu,
  HardDrive,
  Database,
  FileCode,
  Network,
  Sliders,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { KubernetesIcon, EksIcon, AksIcon } from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';
import {
  K8sUnifiedResource,
  K8sTelemetryOverview,
  K8sResourceType,
} from '@/types/kubernetes';

export default function KubernetesStudioPage() {
  const { syncNow, isSyncing } = useMonitoring();

  // State management
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<K8sTelemetryOverview | null>(null);
  const [resources, setResources] = useState<K8sUnifiedResource[]>([]);
  const [availableClusters, setAvailableClusters] = useState<string[]>([
    'AWS EKS (us-east-1) / AKS',
    'aks-production-cluster-01',
    'eks-core-cluster',
  ]);
  const [selectedCluster, setSelectedCluster] = useState<string>(
    'AWS EKS (us-east-1) / AKS'
  );
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('Kubernetes');

  // Interactive YAML inspection drawer
  const [selectedResource, setSelectedResource] =
    useState<K8sUnifiedResource | null>(null);
  const [isYamlDrawerOpen, setIsYamlDrawerOpen] = useState(true);
  const [copiedYaml, setCopiedYaml] = useState(false);

  // Active highlighted topology node
  const [highlightedNode, setHighlightedNode] = useState<string>('loadbalancer');

  // Fetch unified resources from API
  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kubernetes/resources');
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
        setTelemetry(data.telemetry || null);
        if (data.clusters && Array.isArray(data.clusters)) {
          setAvailableClusters(data.clusters);
        }
        // Default selected resource for YAML inspection if none
        if (data.resources && data.resources.length > 0 && !selectedResource) {
          const defaultRes =
            data.resources.find(
              (r: K8sUnifiedResource) => r.name === 'loadbalancer'
            ) || data.resources[0];
          setSelectedResource(defaultRes);
        }
      }
    } catch (err) {
      console.error('Failed to load k8s resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      // Tab filter
      if (activeTab === 'Services') {
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
      } else if (activeTab === 'Namespaces & Nodes') {
        if (!['Namespace'].includes(item.kind)) return false;
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
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/30">
          Pod
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

  // Node selection handler for topology diagram
  const selectTopologyNode = (nodeName: string, kindName?: string) => {
    setHighlightedNode(nodeName);
    setIsYamlDrawerOpen(true);
    const target = resources.find(
      (r) =>
        r.name.toLowerCase().includes(nodeName.toLowerCase()) ||
        (kindName && r.kind.toLowerCase() === kindName.toLowerCase())
    );
    if (target) {
      setSelectedResource(target);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1920px] mx-auto w-full">
          {/* 1. TOP HEADER & STUDIO TITLE BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0B1120] border border-[#162238] rounded-xl p-3.5 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400 border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                <KubernetesIcon className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Multi-Cloud Kubernetes Studio</span>
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Unified enterprise orchestration, ingress topology routing &amp; live resource telemetry
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Cluster Selector */}
              <div className="relative">
                <select
                  value={selectedCluster}
                  onChange={(e) => setSelectedCluster(e.target.value)}
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
                <span>Healthy 99.8%</span>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px] sm:min-w-[260px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search pods, services, ingress, helm charts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => {
                  fetchResources();
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

          {/* 2. TOP TELEMETRY & RESOURCE BREAKDOWN CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Group 1: Workloads (CPU) */}
            <div className="bg-[#0B1120] border border-[#162238] rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Workloads</span>
                </div>
                {/* Metric pill with sparkline wave */}
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#111A2E] border border-[#1E293B]">
                  <span className="text-xs font-bold text-sky-400">CPU: 42% (16 Cores)</span>
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
                  Pods: <span className="font-bold text-white">64</span>
                </button>
                <button
                  onClick={() => setActiveTab('Workloads')}
                  className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-sky-500/50 transition-colors"
                >
                  Deployments: <span className="font-bold text-white">18</span>
                </button>
                <button
                  onClick={() => setActiveTab('Workloads')}
                  className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-sky-500/50 transition-colors"
                >
                  StatefulSets: <span className="font-bold text-white">4</span>
                </button>
                <button
                  onClick={() => setActiveTab('Workloads')}
                  className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-sky-500/50 transition-colors"
                >
                  DaemonSets: <span className="font-bold text-white">4</span>
                </button>
              </div>
            </div>

            {/* Group 2: Storage & Config (RAM) */}
            <div className="bg-[#0B1120] border border-[#162238] rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Storage &amp; Config</span>
                </div>
                {/* Metric pill with sparkline wave */}
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#111A2E] border border-[#1E293B]">
                  <span className="text-xs font-bold text-purple-400">RAM: 68% (32.6 / 48 GB)</span>
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
                  PV: <span className="font-bold text-white">12</span>
                </button>
                <button
                  onClick={() => setActiveTab('Storage & Config')}
                  className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-purple-500/50 transition-colors"
                >
                  PVC: <span className="font-bold text-white">12</span>
                </button>
                <button
                  onClick={() => setActiveTab('Storage & Config')}
                  className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-purple-500/50 transition-colors"
                >
                  ConfigMaps: <span className="font-bold text-white">24</span>
                </button>
              </div>
            </div>

            {/* Group 3: Networking & Helm (Disk) */}
            <div className="bg-[#0B1120] border border-[#162238] rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Networking &amp; Helm</span>
                </div>
                {/* Metric pill with sparkline wave */}
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#111A2E] border border-[#1E293B]">
                  <span className="text-xs font-bold text-emerald-400">Disk: 54% (1.2 / 2.0 TB)</span>
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
                  Services: <span className="text-sky-400 font-bold">LB 4</span> • <span className="text-blue-400 font-bold">ClusterIP 14</span>
                </button>
                <button
                  onClick={() => setActiveTab('Ingress')}
                  className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-emerald-500/50 transition-colors"
                >
                  Ingress: <span className="font-bold text-white">8</span>
                </button>
                <button
                  onClick={() => setActiveTab('Helm Releases')}
                  className="px-2 py-0.5 rounded bg-[#111A2E] text-slate-300 hover:text-white border border-[#1E293B] hover:border-emerald-500/50 transition-colors"
                >
                  Helm Releases: <span className="font-bold text-white">7</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. MIDDLE SECTION: INTERACTIVE INGRESS-TO-WORKLOAD TOPOLOGY & YAML DRAWER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Topology Flow Canvas */}
            <div
              className={`transition-all duration-300 bg-[#0B1120] border border-[#162238] rounded-xl p-4 shadow-sm flex flex-col justify-between ${
                isYamlDrawerOpen ? 'lg:col-span-8' : 'lg:col-span-12'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#162238]">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Ingress &amp; Service Traffic Routing Topology
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                    Live Cluster Route Map
                  </span>
                </div>
                {!isYamlDrawerOpen && (
                  <button
                    onClick={() => setIsYamlDrawerOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#111A2E] hover:bg-[#162238] text-slate-300 border border-[#1E293B] rounded-lg transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>Open YAML Inspector</span>
                  </button>
                )}
              </div>

              {/* Topology Flow Diagram Nodes */}
              <div className="py-6 px-2 overflow-x-auto">
                <div className="min-w-[680px] flex items-center justify-between gap-3 relative">
                  {/* Node 1: Internet Traffic */}
                  <div
                    onClick={() => selectTopologyNode('traffic', 'Ingress')}
                    className={`flex flex-col items-center cursor-pointer transition-transform hover:scale-105 ${
                      highlightedNode === 'traffic' ? 'scale-105' : ''
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-[#111A2E] border-2 border-slate-600 hover:border-sky-400 flex items-center justify-center text-slate-300 shadow-lg relative group">
                      <Globe className="w-6 h-6 text-sky-400 animate-spin" style={{ animationDuration: '24s' }} />
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0B1120]"></div>
                    </div>
                    <span className="mt-2 text-xs font-semibold text-slate-300">Internet Traffic</span>
                    <span className="text-[10px] text-slate-500 font-mono">0.0.0.0/0</span>
                  </div>

                  {/* Flow Arrow 1 */}
                  <div className="flex-1 flex items-center justify-center px-1">
                    <div className="h-0.5 w-full bg-gradient-to-r from-slate-600 via-emerald-500 to-emerald-400 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-emerald-400 rotate-45"></div>
                    </div>
                  </div>

                  {/* Node 2: Nginx Ingress Controller */}
                  <div
                    onClick={() => selectTopologyNode('nginx ingress controller', 'Ingress')}
                    className={`flex flex-col items-center cursor-pointer transition-transform hover:scale-105 ${
                      highlightedNode === 'nginx ingress controller' ? 'scale-105' : ''
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-emerald-950/40 border-2 border-emerald-500 hover:border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] relative">
                      <span className="text-xl font-black font-mono">N</span>
                    </div>
                    <span className="mt-2 text-xs font-semibold text-slate-200 text-center leading-tight">
                      Nginx Ingress<br />Controller
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">TLS 443</span>
                  </div>

                  {/* Flow Arrow 2 */}
                  <div className="flex-1 flex items-center justify-center px-1">
                    <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-sky-500 to-sky-400 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-sky-400 rotate-45"></div>
                    </div>
                  </div>

                  {/* Node 3: LoadBalancer Service (api-gateway) */}
                  <div
                    onClick={() => selectTopologyNode('loadbalancer', 'Service')}
                    className={`flex flex-col items-center cursor-pointer transition-transform hover:scale-105 ${
                      highlightedNode === 'loadbalancer' ? 'scale-105' : ''
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-sky-950/40 border-2 border-sky-500 hover:border-sky-400 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] relative">
                      <Layers className="w-7 h-7 text-sky-400" />
                    </div>
                    <span className="mt-2 text-xs font-semibold text-slate-200 text-center leading-tight">
                      LoadBalancer Service<br />
                      <span className="text-sky-400 font-mono text-[10px]">(api-gateway)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">20.106.88.42:80</span>
                  </div>

                  {/* Flow Arrow 3 */}
                  <div className="flex-1 flex items-center justify-center px-1">
                    <div className="h-0.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-400 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-indigo-400 rotate-45"></div>
                    </div>
                  </div>

                  {/* Node 4: ReplicaSet */}
                  <div
                    onClick={() => selectTopologyNode('api-gateway-7f99cb', 'ReplicaSet')}
                    className={`flex flex-col items-center cursor-pointer transition-transform hover:scale-105 ${
                      highlightedNode === 'api-gateway-7f99cb' ? 'scale-105' : ''
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-indigo-950/40 border-2 border-indigo-500 hover:border-indigo-400 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)] relative">
                      <Box className="w-7 h-7 text-indigo-400" />
                    </div>
                    <span className="mt-2 text-xs font-semibold text-slate-200">ReplicaSet</span>
                    <span className="text-[10px] text-indigo-300 font-mono">3 / 3 Replicas</span>
                  </div>

                  {/* Branching Connecting Line to 3 Pods */}
                  <div className="w-8 flex items-center justify-center relative">
                    <svg className="w-8 h-32" viewBox="0 0 32 128" fill="none">
                      <path
                        d="M2 64 C16 64, 16 16, 30 16"
                        stroke="#6366f1"
                        strokeWidth="2"
                        fill="none"
                      />
                      <path
                        d="M2 64 L30 64"
                        stroke="#6366f1"
                        strokeWidth="2"
                        fill="none"
                      />
                      <path
                        d="M2 64 C16 64, 16 112, 30 112"
                        stroke="#6366f1"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </div>

                  {/* Branching Live Pod Nodes (3 Cards with Custom Metric Bars) */}
                  <div className="flex flex-col gap-2.5">
                    {/* Pod 1 */}
                    <div
                      onClick={() => selectTopologyNode('api-gateway-7f99cb-v9px2', 'Pod')}
                      className="p-2 rounded-lg bg-[#111A2E] border border-emerald-500/40 hover:border-emerald-400 cursor-pointer transition-colors shadow-sm min-w-[170px]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Box className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-white truncate max-w-[120px]">
                          pod-v9px2
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-400 font-mono">
                            <span>CPU</span>
                            <span className="text-emerald-400 font-bold">35.1% 3c</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                            <div className="bg-emerald-400 h-full rounded-full" style={{ width: '35.1%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400 font-mono">
                            <span>RAM</span>
                            <span className="text-sky-400 font-bold">42% 9.1 GB</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                            <div className="bg-sky-400 h-full rounded-full" style={{ width: '42%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pod 2 */}
                    <div
                      onClick={() => selectTopologyNode('api-gateway-7f99cb-k8mq1', 'Pod')}
                      className="p-2 rounded-lg bg-[#111A2E] border border-emerald-500/40 hover:border-emerald-400 cursor-pointer transition-colors shadow-sm min-w-[170px]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Box className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-white truncate max-w-[120px]">
                          pod-k8mq1
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-400 font-mono">
                            <span>CPU</span>
                            <span className="text-emerald-400 font-bold">24.5% 4c</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                            <div className="bg-emerald-400 h-full rounded-full" style={{ width: '24.5%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400 font-mono">
                            <span>RAM</span>
                            <span className="text-sky-400 font-bold">32% 16.2 GB</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                            <div className="bg-sky-400 h-full rounded-full" style={{ width: '32%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pod 3 */}
                    <div
                      onClick={() => selectTopologyNode('api-gateway-7f99cb-zt4x8', 'Pod')}
                      className="p-2 rounded-lg bg-[#111A2E] border border-emerald-500/40 hover:border-emerald-400 cursor-pointer transition-colors shadow-sm min-w-[170px]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Box className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-white truncate max-w-[120px]">
                          pod-zt4x8
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-400 font-mono">
                            <span>CPU</span>
                            <span className="text-emerald-400 font-bold">18.7% 2c</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                            <div className="bg-emerald-400 h-full rounded-full" style={{ width: '18.7%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400 font-mono">
                            <span>RAM</span>
                            <span className="text-sky-400 font-bold">14% 7.7 GB</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                            <div className="bg-sky-400 h-full rounded-full" style={{ width: '14%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Topology Footer Tip */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-[#162238]">
                <span>Click any node above to inspect its real syntax-highlighted Kubernetes manifest.</span>
                <span className="text-slate-500 font-mono">Status: Connected &amp; Synced</span>
              </div>
            </div>

            {/* Right Side: YAML Inspection Drawer */}
            {isYamlDrawerOpen && (
              <div className="lg:col-span-4 bg-[#0B1120] border border-[#162238] rounded-xl flex flex-col shadow-sm max-h-[460px] overflow-hidden">
                <div className="p-3 border-b border-[#162238] flex items-center justify-between bg-[#0E1628]">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-white truncate">
                      YAML Inspection
                    </span>
                    {selectedResource && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 truncate">
                        {selectedResource.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyYaml}
                      className="p-1 text-slate-400 hover:text-white bg-[#111A2E] hover:bg-[#162238] border border-[#1E293B] rounded transition-colors"
                      title="Copy Manifest YAML"
                    >
                      {copiedYaml ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsYamlDrawerOpen(false)}
                      className="p-1 text-slate-400 hover:text-white bg-[#111A2E] hover:bg-[#162238] border border-[#1E293B] rounded transition-colors"
                      title="Close drawer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* YAML Code Area */}
                <div className="p-3 flex-1 overflow-auto bg-[#070B14] font-mono text-[11px] leading-relaxed text-slate-300">
                  {selectedResource ? (
                    <pre className="whitespace-pre">
                      {selectedResource.manifestYaml
                        .split('\n')
                        .map((line, idx) => {
                          const isKey = line.includes(':') && !line.trim().startsWith('-');
                          const parts = line.split(':');
                          return (
                            <div key={idx} className="hover:bg-slate-800/30 px-1 rounded flex">
                              <span className="w-6 text-slate-600 text-right pr-2 select-none">
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
                  ) : (
                    <div className="p-6 text-center text-slate-500">
                      Select a resource to view YAML
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. BOTTOM SECTION: NAVIGATION TABS & DATA TABLE */}
          <div className="bg-[#0B1120] border border-[#162238] rounded-xl overflow-hidden shadow-sm">
            {/* Tabs and Namespace Selector Header */}
            <div className="p-3 border-b border-[#162238] flex flex-wrap items-center justify-between gap-3 bg-[#0E1628]/60">
              {/* Navigation Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  'Kubernetes',
                  'Services',
                  'Ingress',
                  'Workloads',
                  'Storage & Config',
                  'Helm Releases',
                  'Namespaces & Nodes',
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
                  <option value="ingress-nginx">ingress-nginx</option>
                  <option value="production">production</option>
                  <option value="database">database</option>
                  <option value="monitoring">monitoring</option>
                  <option value="kube-system">kube-system</option>
                </select>
              </div>
            </div>

            {/* Data Grid Table (Exact Match to Screenshot) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#162238] bg-[#0E1628] text-slate-400 font-semibold">
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Cluster IP</th>
                    <th className="py-3 px-4">External IP</th>
                    <th className="py-3 px-4">Target Ports</th>
                    <th className="py-3 px-4 min-w-[130px]">CPU</th>
                    <th className="py-3 px-4 min-w-[140px]">RAM</th>
                    <th className="py-3 px-4 min-w-[140px]">Disk</th>
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
                          setIsYamlDrawerOpen(true);
                          setHighlightedNode(item.name);
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
                            ns: {item.namespace}
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
                            <span className="text-sky-400 font-semibold">
                              {item.externalIp}
                            </span>
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
        </main>
      </div>
    </div>
  );
}
