'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  TrendingDown,
  RotateCw,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  HardDrive,
  Info,
  Server,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';
import { CostInsightsData, ResourceCostItem } from '@/types/monitoring';
import { AiAssistantDrawer } from '@/components/dashboard/AiAssistantDrawer';

export default function CostsPage() {
  const { cloudProvider, triggerRefresh, isRefreshing } = useMonitoring();

  const [costData, setCostData] = useState<CostInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiContext, setAiContext] = useState<any>(null);

  const fetchCostData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/costs');
      if (res.ok) {
        const data = await res.json();
        setCostData(data);
      }
    } catch (e) {
      console.warn('Cost fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostData();
  }, []);

  const filteredResources = useMemo(() => {
    if (!costData?.byResource) return [];
    return costData.byResource.filter((r) => {
      if (cloudProvider === 'aws' && r.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && r.cloudProvider !== 'azure') return false;
      if (filterProvider !== 'all' && r.cloudProvider !== filterProvider) return false;

      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.resourceId.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      );
    });
  }, [costData, cloudProvider, filterProvider, search]);

  const handleOpenAiForResource = (r: ResourceCostItem) => {
    setAiContext({
      resourceName: r.name,
      resourceId: r.resourceId,
      provider: r.cloudProvider,
      region: r.region,
      status: r.status,
      metrics: {
        costDaily: r.dailyCost,
        costMonthly: r.monthlyCost,
      },
    });
    setAiDrawerOpen(true);
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
                <span className="text-white">Cost Insights</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <DollarSign className="w-6 h-6 text-emerald-400" />
                <span>Cloud Cost Insights & Optimization</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setAiContext({
                    resourceName: 'Infrastructure Cost Optimization',
                    region: 'All Regions',
                    provider: cloudProvider,
                  });
                  setAiDrawerOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg shadow-sm shadow-blue-500/25 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI About Costs</span>
              </button>

              <button
                onClick={() => {
                  triggerRefresh();
                  fetchCostData();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Estimation & Permissions Notice */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block mb-0.5">
                {costData?.isEstimate ? 'Cost Benchmark Estimate' : 'Live Billing Integration'}
              </span>
              <p className="text-slate-300 leading-relaxed">
                {costData?.estimateNotice ||
                  'Costs calculated using published Azure Standard_D2s_v3 rates and AWS EC2 pricing standards. Real-time billing data is fetched from Azure Cost Management API when Cost Management Reader permission is granted.'}
              </p>
            </div>
          </div>

          {/* Cost Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-400 block mb-1">Current Period Spend</span>
              <div className="text-2xl font-bold text-white tracking-tight">
                ${costData?.currentPeriodTotal.toFixed(2) || '0.00'}{' '}
                <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Month-to-date (October 2026)</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-400 block mb-1">Daily Run Rate</span>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                ${costData?.dailyAverage.toFixed(2) || '0.00'}{' '}
                <span className="text-xs font-normal text-slate-400">/day</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Current active compute baseline</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-400 block mb-1">Projected Monthly Total</span>
              <div className="text-2xl font-bold text-sky-400 tracking-tight">
                ${costData?.projectedMonthly.toFixed(2) || '0.00'}{' '}
                <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Projected 30-day billing estimate</span>
            </div>

            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-400 block mb-1">Potential Monthly Savings</span>
              <div className="text-2xl font-bold text-amber-400 tracking-tight">
                ${costData?.potentialSavings.toFixed(2) || '0.00'}{' '}
                <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
              <span className="text-[11px] text-amber-400/80 mt-1 block">From idle right-sizing opportunities</span>
            </div>
          </div>

          {/* Regional Cost Distribution */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Cost by Geographic Region</h3>
                <span className="text-xs text-slate-400">Aggregated spending across active cloud regions</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {costData?.byRegion.map((rc) => (
                <div
                  key={rc.region}
                  className="p-4 rounded-xl bg-[#0D1526] border border-[#1E293B] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {rc.cloud === 'aws' ? <AwsLogo className="w-4 h-3" /> : <AzureLogo className="w-3.5 h-3.5" />}
                      <span className="font-semibold text-white font-mono text-xs">{rc.displayName}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">${rc.amount.toFixed(2)}/mo</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${rc.percentage}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{rc.resourceCount} compute instance</span>
                    <span>{rc.percentage}% of total spend</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost by Resource Table */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Cost Breakdown by Resource</h3>
                <span className="text-xs text-slate-400">
                  Individual running costs, durations, and optimization flags
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by instance, type, or region..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56 sm:w-64"
                  />
                </div>

                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  aria-label="Filter cost by provider"
                  className="px-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Providers</option>
                  <option value="azure">Azure</option>
                  <option value="aws">AWS</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400 font-medium">
                    <th className="py-3 px-4">Resource Name</th>
                    <th className="py-3 px-4">Cloud</th>
                    <th className="py-3 px-4">Region</th>
                    <th className="py-3 px-4">Size / Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Running Duration</th>
                    <th className="py-3 px-4">Daily Cost</th>
                    <th className="py-3 px-4">Monthly Cost</th>
                    <th className="py-3 px-4">Optimization Advice</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                  {filteredResources.map((r) => {
                    const isRunning = r.status.toLowerCase().includes('run');

                    return (
                      <tr key={r.resourceId} className="hover:bg-[#162238]/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-white font-mono">
                          {r.name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {r.cloudProvider === 'aws' ? <AwsLogo className="w-4 h-3" /> : <AzureLogo className="w-3.5 h-3.5" />}
                            <span className="uppercase text-[11px] font-semibold text-slate-300">
                              {r.cloudProvider}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">{r.region}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono">{r.type}</td>
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
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {r.runningDuration}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                          ${r.dailyCost.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          ${r.monthlyCost.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          {r.isIdle ? (
                            <div className="flex items-center gap-1 text-amber-400 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[200px]" title={r.idleReason}>
                                Save ~${r.potentialMonthlySavings?.toFixed(2)}/mo (Right-size)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Optimal Tier</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenAiForResource(r)}
                            className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-blue-600 hover:text-white text-blue-400 rounded-lg border border-[#1E293B] transition-colors flex items-center gap-1.5 ml-auto"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>AI Advice</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredResources.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        {loading ? 'Calculating cost insights...' : 'No cloud resources found matching current filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Floating AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        initialContext={aiContext}
      />
    </div>
  );
}
