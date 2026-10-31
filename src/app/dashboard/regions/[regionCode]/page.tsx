'use client';

import React, { use, useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Globe,
  MapPin,
  Server,
  RotateCw,
  Search,
  Filter,
  Terminal,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { AwsLogo, AzureLogo, AzureVmIcon } from '@/components/icons/CloudIcons';
import { DynamicRegionSummary, DynamicRegionResource } from '@/types/monitoring';

function RegionDetailContent({ params }: { params: Promise<{ regionCode: string }> }) {
  const resolvedParams = use(params);
  const regionCode = decodeURIComponent(resolvedParams.regionCode);
  const router = useRouter();

  const [regionData, setRegionData] = useState<DynamicRegionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');

  const fetchRegionDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/regions/dynamic?region=${encodeURIComponent(regionCode)}`);
      if (res.ok) {
        const data = await res.json();
        setRegionData(data);
      }
    } catch (e) {
      console.warn('Region detail fetch note:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegionDetails();
  }, [regionCode]);

  const filteredResources = useMemo(() => {
    if (!regionData?.resources) return [];
    return regionData.resources
      .filter((r) => {
        const matchSearch =
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.resourceId.toLowerCase().includes(search.toLowerCase()) ||
          r.size.toLowerCase().includes(search.toLowerCase()) ||
          (r.publicIp && r.publicIp.includes(search));

        const matchStatus =
          statusFilter === 'all' ||
          r.status.toLowerCase() === statusFilter.toLowerCase();

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'status') return a.status.localeCompare(b.status);
        return 0;
      });
  }, [regionData, search, statusFilter, sortBy]);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
          {/* Breadcrumbs & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link href="/" className="hover:text-blue-400 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
                <span>/</span>
                <Link href="/dashboard/regions" className="hover:text-blue-400">
                  Regions
                </Link>
                <span>/</span>
                <span className="text-white font-mono">{regionCode}</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-sky-400" />
                <span>
                  {regionData?.displayName || regionCode} ({regionCode})
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase font-mono font-semibold">
                  {regionData?.cloud || 'azure'}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchRegionDetails}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Region Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Discovered Compute</span>
              <div className="text-2xl font-bold text-white tracking-tight">
                {regionData?.resourceCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Active instances in this region</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Running vs Stopped</span>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                {regionData?.runningCount || 0}{' '}
                <span className="text-xs font-normal text-slate-400">
                  / {regionData?.stoppedCount || 0} stopped
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Compute operational status</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Provider Infrastructure</span>
              <div className="text-2xl font-bold text-sky-400 tracking-tight uppercase">
                {regionData?.cloud || 'Cloud'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Live cloud platform</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Telemetry Status</span>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                Active
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Real-time sync enabled</span>
            </div>
          </div>

          {/* Resources in this Region Table */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Resources in {regionData?.displayName || regionCode}
                </h3>
                <span className="text-xs text-slate-400">
                  Showing {filteredResources.length} cloud resources
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, ID, size or IP..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52 sm:w-60"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter resources by status"
                  className="px-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="running">Running</option>
                  <option value="stopped">Stopped</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sort resources"
                  className="px-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400 font-medium">
                    <th className="py-3 px-4">Resource Name</th>
                    <th className="py-3 px-4">Cloud Provider</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Size / Type</th>
                    <th className="py-3 px-4">Private IP</th>
                    <th className="py-3 px-4">Public IP</th>
                    <th className="py-3 px-4">Operating System</th>
                    <th className="py-3 px-4">Running Duration</th>
                    <th className="py-3 px-4">Tags</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                  {filteredResources.map((r) => {
                    const isRunning = r.status.toLowerCase().includes('run');

                    return (
                      <tr key={r.id} className="hover:bg-[#162238]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-blue-500/15 flex items-center justify-center text-blue-400 flex-shrink-0">
                              <AzureVmIcon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-white block">{r.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{r.resourceId}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {r.cloudProvider === 'aws' ? <AwsLogo className="w-4 h-3" /> : <AzureLogo className="w-3.5 h-3.5" />}
                            <span className="uppercase text-[11px] font-semibold text-slate-300">
                              {r.cloudProvider}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isRunning
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-300">{r.size}</td>
                        <td className="py-3 px-4 font-mono text-blue-400">{r.privateIp || '-'}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{r.publicIp || '-'}</td>
                        <td className="py-3 px-4 text-slate-300">{r.os || 'Linux'}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{r.runningDuration}</td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[140px]">
                            {Object.entries(r.tags || {}).length > 0 ? (
                              Object.entries(r.tags || {}).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-[#18233C] text-slate-300 border border-[#1E293B]"
                                >
                                  {k}: {v}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500">-</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/dashboard/azure-vms/${r.resourceId}`}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 rounded-lg border border-[#1E293B] transition-colors"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredResources.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        {loading
                          ? 'Loading resources in this region...'
                          : 'No resources found in this region matching current filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function RegionDetailPage({
  params,
}: {
  params: Promise<{ regionCode: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] text-slate-400 flex items-center justify-center text-xs">
          Loading regional resource telemetry...
        </div>
      }
    >
      <RegionDetailContent params={params} />
    </Suspense>
  );
}
