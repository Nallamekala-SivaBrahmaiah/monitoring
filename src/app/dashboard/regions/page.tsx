'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Globe,
  MapPin,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Server,
  RotateCw,
  Layers,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { RegionChart } from '@/components/dashboard/RegionChart';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { DynamicRegionSummary } from '@/types/monitoring';

export default function RegionsPage() {
  const router = useRouter();
  const { cloudProvider, regions, toggleRegion, triggerRefresh, isRefreshing } = useMonitoring();

  const [activeTab, setActiveTab] = useState<'dynamic' | 'all'>('dynamic');
  const [dynamicRegions, setDynamicRegions] = useState<DynamicRegionSummary[]>([]);
  const [loadingDynamic, setLoadingDynamic] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDynamicRegions = async () => {
    try {
      setLoadingDynamic(true);
      const res = await fetch('/api/regions/dynamic');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDynamicRegions(data);
      }
    } catch (e) {
      console.warn('Failed to load dynamic regions:', e);
    } finally {
      setLoadingDynamic(false);
    }
  };

  useEffect(() => {
    fetchDynamicRegions();
  }, [isRefreshing]);

  // Filtered Dynamic Regions with Actual Resources
  const filteredDynamicRegions = useMemo(() => {
    return dynamicRegions.filter((r) => {
      if (cloudProvider === 'aws' && r.cloud !== 'aws') return false;
      if (cloudProvider === 'azure' && r.cloud !== 'azure') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.displayName.toLowerCase().includes(q) || r.region.toLowerCase().includes(q);
      }
      return true;
    });
  }, [dynamicRegions, cloudProvider, searchQuery]);

  // Catalog regions
  const displayedCatalogRegions = useMemo(() => {
    return regions
      .filter((r) => {
        if (cloudProvider === 'aws' && r.cloud !== 'aws') return false;
        if (cloudProvider === 'azure' && r.cloud !== 'azure') return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return r.displayName.toLowerCase().includes(q) || r.region.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (b.resourceCount !== a.resourceCount) {
          return b.resourceCount - a.resourceCount;
        }
        return a.displayName.localeCompare(b.displayName);
      });
  }, [regions, cloudProvider, searchQuery]);

  const monitoredCount = displayedCatalogRegions.filter((r) => r.enabled).length;

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
                <span className="text-white">Regions</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-400" />
                <span>Geographic Region Management & Discovery</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  triggerRefresh();
                  fetchDynamicRegions();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync Discovery</span>
              </button>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3">
            <button
              onClick={() => setActiveTab('dynamic')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dynamic'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-[#111A2E] text-slate-400 hover:text-slate-200 border border-[#1E293B]'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Active Resource Regions (Dynamic)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'dynamic' ? 'bg-blue-500/40 text-white' : 'bg-[#18233C] text-slate-400'
              }`}>
                {filteredDynamicRegions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-[#111A2E] text-slate-400 hover:text-slate-200 border border-[#1E293B]'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>All Cloud Regions Catalog</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'all' ? 'bg-blue-500/40 text-white' : 'bg-[#18233C] text-slate-400'
              }`}>
                {displayedCatalogRegions.length}
              </span>
            </button>
          </div>

          {/* Dynamic Active Regions View */}
          {activeTab === 'dynamic' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <RegionChart />

                <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Dynamic Discovery Summary
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Only regions that contain actual active virtual machines and instances are shown here.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {filteredDynamicRegions.map((reg) => (
                      <div
                        key={reg.region}
                        onClick={() => router.push(`/dashboard/regions/${encodeURIComponent(reg.region)}`)}
                        className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B] hover:border-blue-500/50 cursor-pointer transition-all group space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#111A2E] flex items-center justify-center">
                              {reg.cloud === 'aws' ? (
                                <AwsLogo className="w-5 h-4" />
                              ) : reg.cloud === 'azure' ? (
                                <AzureLogo className="w-4 h-4" />
                              ) : (
                                <Server className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                                  {reg.displayName}
                                </span>
                                <span className="font-mono text-xs text-slate-400">({reg.region})</span>
                              </div>
                              <span className="text-xs text-slate-400">
                                {reg.cloud === 'aws'
                                  ? 'Amazon Web Services'
                                  : reg.cloud === 'azure'
                                  ? 'Microsoft Azure Cloud'
                                  : 'Registered Server Fleet'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-sky-400 block font-mono">
                              {reg.resourceCount} compute nodes
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {reg.runningCount} online
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#1E293B]/70 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {reg.resourceCount} {reg.cloud === 'aws' ? 'EC2 Instances' : reg.cloud === 'azure' ? 'Virtual Machines' : 'Server Nodes'}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {reg.runningCount} Running
                            </span>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Link
                              href={`/dashboard/regions/${encodeURIComponent(reg.region)}`}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-blue-600 hover:text-white text-slate-300 rounded-lg border border-[#1E293B] transition-colors flex items-center gap-1"
                            >
                              <span>View Resources</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredDynamicRegions.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        {loadingDynamic
                          ? 'Discovering regions with active compute resources...'
                          : 'No regions with active compute resources found for this provider.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* All Catalog Regions View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <RegionChart />

              <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white">
                      Discovered Cloud Regions
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#18233C] text-slate-300 border border-[#1E293B]">
                      {monitoredCount} of {displayedCatalogRegions.length} Monitored
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    Toggle monitoring on or off for individual AWS and Azure regions.
                  </p>

                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search regions by name or code (e.g. us-east, centralindia)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0D1526] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-72">
                  {displayedCatalogRegions.map((reg) => (
                    <div
                      key={reg.id}
                      onClick={() => router.push(`/dashboard/regions/${encodeURIComponent(reg.region)}`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#0D1526] border border-[#1E293B] hover:border-slate-600 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-[#111A2E]">
                          {reg.cloud === 'aws' ? (
                            <AwsLogo className="w-4 h-3" />
                          ) : (
                            <AzureLogo className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white font-mono">
                              {reg.region}
                            </span>
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: reg.color }}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-400">{reg.displayName}</span>
                            <span className="text-slate-600">•</span>
                            {reg.resourceCount > 0 ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {reg.resourceCount} Active {reg.resourceCount === 1 ? 'Instance' : 'Instances'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">0 Active Resources</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span
                          className={`text-[11px] font-semibold ${
                            reg.enabled ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {reg.enabled ? 'Monitored' : 'Disabled'}
                        </span>
                        <button
                          onClick={() => toggleRegion(reg.id)}
                          className={`w-9 h-5 rounded-full transition-colors relative ${
                            reg.enabled ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                              reg.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
