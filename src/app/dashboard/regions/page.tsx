'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Globe, MapPin, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { RegionChart } from '@/components/dashboard/RegionChart';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

export default function RegionsPage() {
  const { cloudProvider, regions, toggleRegion } = useMonitoring();
  const [searchQuery, setSearchQuery] = useState('');

  const displayedRegions = regions
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
      // Regions with active virtual machines / instances come first
      if (b.resourceCount !== a.resourceCount) {
        return b.resourceCount - a.resourceCount;
      }
      return a.displayName.localeCompare(b.displayName);
    });

  const monitoredCount = displayedRegions.filter((r) => r.enabled).length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
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
                <span>Geographic Region Management</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <RegionChart />

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-white">
                    Discovered Cloud Regions
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#18233C] text-slate-300 border border-[#1E293B]">
                    {monitoredCount} of {displayedRegions.length} Monitored
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Toggle monitoring on or off for individual AWS and Azure regions.
                </p>

                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search regions by name or code (e.g. us-east, westeurope)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0D1526] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-72">
                {displayedRegions.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0D1526] border border-[#1E293B] text-xs"
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

                    <div className="flex items-center gap-2">
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
        </main>
      </div>
    </div>
  );
}
