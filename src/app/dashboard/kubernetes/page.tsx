'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  Search,
  RotateCw,
  Server,
  Box,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { KubernetesIcon, EksIcon, AksIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';
import {
  mockK8sNodes,
  mockK8sNamespaces,
  mockK8sDeployments,
} from '@/mock/monitoringData';

export default function KubernetesPage() {
  const {
    cloudProvider,
    filteredK8sClusters,
    filteredK8sPods,
    triggerRefresh,
    isRefreshing,
  } = useMonitoring();

  const [activeTab, setActiveTab] = useState<
    'Clusters' | 'Nodes' | 'Namespaces' | 'Pods' | 'Deployments'
  >('Clusters');

  const [podStatusFilter, setPodStatusFilter] = useState('all');
  const [podSearch, setPodSearch] = useState('');

  // Filtered Pods
  const displayPods = useMemo(() => {
    return filteredK8sPods.filter((p) => {
      const matchStatus =
        podStatusFilter === 'all' ||
        p.status.toLowerCase() === podStatusFilter.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(podSearch.toLowerCase()) ||
        p.namespace.toLowerCase().includes(podSearch.toLowerCase()) ||
        p.cluster.toLowerCase().includes(podSearch.toLowerCase()) ||
        p.node.toLowerCase().includes(podSearch.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [filteredK8sPods, podStatusFilter, podSearch]);

  const displayNodes = useMemo(() => {
    return mockK8sNodes.filter((n) => {
      if (cloudProvider === 'aws' && n.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && n.cloudProvider !== 'azure') return false;
      return true;
    });
  }, [cloudProvider]);

  const displayNamespaces = useMemo(() => {
    return mockK8sNamespaces.filter((ns) => {
      if (cloudProvider === 'aws' && !ns.cluster.includes('eks')) return false;
      if (cloudProvider === 'azure' && !ns.cluster.includes('aks')) return false;
      return true;
    });
  }, [cloudProvider]);

  const displayDeployments = useMemo(() => {
    return mockK8sDeployments.filter((d) => {
      if (cloudProvider === 'aws' && !d.cluster.includes('eks')) return false;
      if (cloudProvider === 'azure' && !d.cluster.includes('aks')) return false;
      return true;
    });
  }, [cloudProvider]);

  const getPodStatusBadge = (status: string) => {
    switch (status) {
      case 'Running':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Running
          </span>
        );
      case 'Pending':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Pending
          </span>
        );
      case 'CrashLoopBackOff':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            CrashLoopBackOff
          </span>
        );
      case 'Failed':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
          {/* Header */}
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
                <KubernetesIcon className="w-6 h-6 text-sky-400" />
                <span>Kubernetes Observability (EKS & AKS Telemetry)</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={triggerRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync Metrics</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-[#1E293B] flex items-center gap-2 overflow-x-auto">
            {(['Clusters', 'Nodes', 'Namespaces', 'Pods', 'Deployments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab 1: Clusters */}
          {activeTab === 'Clusters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredK8sClusters.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {c.type === 'EKS' ? (
                        <EksIcon className="w-6 h-6" />
                      ) : (
                        <AksIcon className="w-6 h-6" />
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-white font-mono">
                          {c.name}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {c.cloudProvider.toUpperCase()} ({c.type}) • {c.region}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {c.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#1E293B] text-xs">
                    <div>
                      <span className="text-slate-500 block">K8s Version</span>
                      <span className="font-mono text-white font-semibold">
                        {c.version}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nodes</span>
                      <span className="text-white font-bold">{c.nodeCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Namespaces</span>
                      <span className="text-white font-bold">{c.namespaceCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pods</span>
                      <span className="text-white font-bold">{c.podCount}</span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-400 font-mono truncate">
                    API Endpoint: <span className="text-blue-400">{c.endpoint}</span>
                  </div>
                </div>
              ))}

              {filteredK8sClusters.length === 0 && (
                <div className="col-span-2 p-8 text-center bg-[#111A2E] border border-[#1E293B] rounded-xl text-slate-400 text-xs">
                  No Kubernetes clusters found matching current cloud provider.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Nodes */}
          {activeTab === 'Nodes' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400">
                      <th className="py-3 px-4">Node Name</th>
                      <th className="py-3 px-4">Cluster</th>
                      <th className="py-3 px-4">Provider</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">CPU Usage %</th>
                      <th className="py-3 px-4">Memory %</th>
                      <th className="py-3 px-4">Pods</th>
                      <th className="py-3 px-4">Kubelet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                    {displayNodes.map((n) => (
                      <tr key={n.id} className="hover:bg-[#162238]/60">
                        <td className="py-3 px-4 font-mono text-white font-semibold">
                          {n.name}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{n.cluster}</td>
                        <td className="py-3 px-4 uppercase font-semibold text-slate-300">
                          {n.cloudProvider}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                            {n.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{n.role}</td>
                        <td className="py-3 px-4">{n.cpuUsage}%</td>
                        <td className="py-3 px-4">{n.memoryUsage}%</td>
                        <td className="py-3 px-4 font-bold text-white">{n.podsCount}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{n.kubeletVersion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Namespaces */}
          {activeTab === 'Namespaces' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400">
                    <th className="py-3 px-4">Namespace</th>
                    <th className="py-3 px-4">Cluster</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Pods Count</th>
                    <th className="py-3 px-4">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                  {displayNamespaces.map((ns) => (
                    <tr key={ns.name} className="hover:bg-[#162238]/60">
                      <td className="py-3 px-4 font-mono font-bold text-white">{ns.name}</td>
                      <td className="py-3 px-4 text-slate-400">{ns.cluster}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/15 text-emerald-400 font-semibold">
                          {ns.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{ns.podCount}</td>
                      <td className="py-3 px-4 text-slate-400">{ns.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 4: Pods */}
          {activeTab === 'Pods' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm space-y-3">
              <div className="p-4 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Showing {displayPods.length} pods (status filtered)
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search pod name, namespace..."
                      value={podSearch}
                      onChange={(e) => setPodSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56"
                    />
                  </div>

                  <select
                    value={podStatusFilter}
                    onChange={(e) => setPodStatusFilter(e.target.value)}
                    aria-label="Filter pods by status"
                    className="px-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="running">Running</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="crashloopbackoff">CrashLoopBackOff</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400">
                      <th className="py-3 px-4">Pod Name</th>
                      <th className="py-3 px-4">Namespace</th>
                      <th className="py-3 px-4">Cluster</th>
                      <th className="py-3 px-4">Node</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">CPU %</th>
                      <th className="py-3 px-4">Memory %</th>
                      <th className="py-3 px-4">Restarts</th>
                      <th className="py-3 px-4">Age</th>
                      <th className="py-3 px-4">Pod IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                    {displayPods.map((p) => (
                      <tr key={p.id} className="hover:bg-[#162238]/60">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {p.name}
                        </td>
                        <td className="py-3 px-4 text-cyan-400 font-mono">
                          {p.namespace}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{p.cluster}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{p.node}</td>
                        <td className="py-3 px-4">{getPodStatusBadge(p.status)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{p.cpuUsage}%</td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{p.memoryUsage}%</td>
                        <td className="py-3 px-4 text-slate-300">{p.restartCount}</td>
                        <td className="py-3 px-4 text-slate-400">{p.age}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{p.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Deployments */}
          {activeTab === 'Deployments' && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400">
                    <th className="py-3 px-4">Deployment</th>
                    <th className="py-3 px-4">Namespace</th>
                    <th className="py-3 px-4">Cluster</th>
                    <th className="py-3 px-4">Replicas (Ready / Desired)</th>
                    <th className="py-3 px-4">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                  {displayDeployments.map((d) => (
                    <tr key={d.name} className="hover:bg-[#162238]/60">
                      <td className="py-3 px-4 font-mono font-bold text-white">{d.name}</td>
                      <td className="py-3 px-4 text-cyan-400 font-mono">{d.namespace}</td>
                      <td className="py-3 px-4 text-slate-400">{d.cluster}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-emerald-400">{d.readyReplicas}</span>
                        <span className="text-slate-500"> / </span>
                        <span className="font-semibold text-slate-200">{d.desiredReplicas}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{d.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
