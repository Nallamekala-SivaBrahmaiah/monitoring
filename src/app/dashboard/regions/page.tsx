'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Radio,
  Activity,
  LayoutGrid,
  ChevronDown,
  Check,
  CheckCircle,
  Filter,
  BarChart3,
  Cpu,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { DynamicRegionSummary } from '@/types/monitoring';

type LayoutModelId = 'model1' | 'model2' | 'model3' | 'model4';

interface LayoutModelOption {
  id: LayoutModelId;
  name: string;
  tag: string;
  description: string;
}

const LAYOUT_MODELS: LayoutModelOption[] = [
  {
    id: 'model1',
    name: 'Model 1 – Minimal Professional',
    tag: 'Default',
    description: 'Clean, flat UI with minimal enterprise styling and balanced spacing.',
  },
  {
    id: 'model2',
    name: 'Model 2 – Modern Cloud Grid',
    tag: 'Grid View',
    description: 'Distinct AWS amber & Azure blue card grid with live ratio bars.',
  },
  {
    id: 'model3',
    name: 'Model 3 – Compact Operations View',
    tag: 'High Density',
    description: 'Tabular dense row layout for maximum region visibility per screen.',
  },
  {
    id: 'model4',
    name: 'Model 4 – Executive Overview',
    tag: 'Analytics',
    description: 'Top executive summary with cloud distribution split and health cards.',
  },
];

export default function RegionsPage() {
  const router = useRouter();
  const { cloudProvider, regions, toggleRegion, triggerRefresh, isRefreshing, awsAccounts = [], azureSubscriptions = [] } = useMonitoring();

  const connectedAwsCount = useMemo(
    () => (awsAccounts || []).filter((a) => a.status === 'Connected').length,
    [awsAccounts]
  );
  const connectedAzureCount = useMemo(
    () => (azureSubscriptions || []).filter((s) => s.status === 'Connected').length,
    [azureSubscriptions]
  );

  // Layout Design Model (persisted to localStorage)
  const [layoutModel, setLayoutModel] = useState<LayoutModelId>('model1');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement>(null);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'dynamic' | 'all'>('dynamic');
  const [dynamicRegions, setDynamicRegions] = useState<DynamicRegionSummary[]>([]);
  const [loadingDynamic, setLoadingDynamic] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'aws' | 'azure'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'monitored'>('all');

  // Load persisted layout model from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('regions_layout_design_model');
      if (saved && (saved === 'model1' || saved === 'model2' || saved === 'model3' || saved === 'model4')) {
        setLayoutModel(saved as LayoutModelId);
      }
    } catch (e) {
      console.warn('Could not read regions layout preference:', e);
    }
  }, []);

  // Close layout menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLayout = (modelId: LayoutModelId) => {
    setLayoutModel(modelId);
    setShowLayoutMenu(false);
    try {
      localStorage.setItem('regions_layout_design_model', modelId);
    } catch (e) {
      console.warn('Could not save regions layout preference:', e);
    }
  };

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

  // Filtered Dynamic Regions
  const filteredDynamicRegions = useMemo(() => {
    return dynamicRegions.filter((r) => {
      // Hide AWS regions if no connected AWS account
      if (r.cloud === 'aws' && connectedAwsCount === 0) return false;
      // Hide Azure regions if no connected Azure account
      if (r.cloud === 'azure' && connectedAzureCount === 0) return false;

      // Global provider override from context or page filter
      const effectiveProvider = providerFilter !== 'all' ? providerFilter : cloudProvider;
      if (effectiveProvider === 'aws' && r.cloud !== 'aws') return false;
      if (effectiveProvider === 'azure' && r.cloud !== 'azure') return false;

      // Status filter
      if (statusFilter === 'active' && r.resourceCount <= 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return r.displayName.toLowerCase().includes(q) || r.region.toLowerCase().includes(q);
      }
      return true;
    });
  }, [dynamicRegions, cloudProvider, providerFilter, statusFilter, searchQuery, connectedAwsCount, connectedAzureCount]);

  // Catalog regions
  const displayedCatalogRegions = useMemo(() => {
    return regions
      .filter((r) => {
        // If AWS is not connected, hide AWS catalog regions when filtering by AWS or active
        if (r.cloud === 'aws' && connectedAwsCount === 0 && (statusFilter === 'active' || providerFilter === 'aws')) return false;
        // If Azure is not connected, hide Azure catalog regions when filtering by Azure or active
        if (r.cloud === 'azure' && connectedAzureCount === 0 && (statusFilter === 'active' || providerFilter === 'azure')) return false;

        const effectiveProvider = providerFilter !== 'all' ? providerFilter : cloudProvider;
        if (effectiveProvider === 'aws' && r.cloud !== 'aws') return false;
        if (effectiveProvider === 'azure' && r.cloud !== 'azure') return false;

        if (statusFilter === 'active' && r.resourceCount <= 0) return false;
        if (statusFilter === 'monitored' && !r.enabled) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
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
  }, [regions, cloudProvider, providerFilter, statusFilter, searchQuery, connectedAwsCount, connectedAzureCount]);

  // Summary Metrics calculations from real application data
  const totalRegionsCount = displayedCatalogRegions.length;
  const activeRegionsCount = useMemo(() => {
    const set = new Set<string>();
    filteredDynamicRegions.forEach((r) => {
      if (r.resourceCount > 0) set.add(r.region);
    });
    return set.size;
  }, [filteredDynamicRegions]);

  const totalComputeInstances = useMemo(() => {
    return filteredDynamicRegions.reduce((sum, r) => sum + (r.resourceCount || 0), 0);
  }, [filteredDynamicRegions]);

  const runningComputeInstances = useMemo(() => {
    return filteredDynamicRegions.reduce((sum, r) => sum + (r.runningCount || 0), 0);
  }, [filteredDynamicRegions]);

  const awsActiveCount = connectedAwsCount === 0 ? 0 : dynamicRegions.filter((r) => r.cloud === 'aws').reduce((a, b) => a + (b.resourceCount || 0), 0);
  const azureActiveCount = connectedAzureCount === 0 ? 0 : dynamicRegions.filter((r) => r.cloud === 'azure').reduce((a, b) => a + (b.resourceCount || 0), 0);
  const monitoredCount = regions.filter((r) => r.enabled).length;

  const currentModelOption = LAYOUT_MODELS.find((m) => m.id === layoutModel) || LAYOUT_MODELS[0];

  return (
    <div className="min-h-screen bg-[#070D1B] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-5">
          {/* Top Breadcrumb & Page Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link href="/" className="hover:text-blue-400 flex items-center gap-1 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Cloud Regions</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0089D6]/15 border border-[#0089D6]/30 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-[#5EA0EF]" />
                </div>
                <span>Cloud Regions</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#111A2E] text-slate-400 border border-[#1E293B]">
                  Geographic Management
                </span>
              </h1>
            </div>

            {/* Header Controls: Layout Selector & Sync Discovery */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Layout / Design Selector */}
              <div className="relative" ref={layoutMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-all shadow-sm cursor-pointer"
                  title="Choose professional layout design for Regions module"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Layout: {currentModelOption.tag}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Layout Dropdown Menu */}
                {showLayoutMenu && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 rounded-xl bg-[#0D1526] border border-[#1E293B] shadow-2xl p-2.5 z-50 animate-fade-in backdrop-blur-md">
                    <div className="px-2.5 py-2 border-b border-[#1E293B] mb-2 flex items-center justify-between">
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Select Region Layout</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Saved to profile</span>
                    </div>

                    <div className="space-y-1.5">
                      {LAYOUT_MODELS.map((model) => {
                        const isSelected = layoutModel === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => handleSelectLayout(model.id)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/10 border-cyan-500/40 text-white shadow-sm'
                                : 'bg-[#111A2E]/60 hover:bg-[#15203A] border-transparent text-slate-300'
                            }`}
                          >
                            {/* Visual Thumbnail Preview */}
                            {model.id === 'model1' && (
                              <svg className="w-9 h-7 rounded border border-slate-700 bg-[#0B132B] p-1 shrink-0 mt-0.5" viewBox="0 0 40 28" fill="none">
                                <rect x="2" y="2" width="36" height="10" rx="1.5" fill="#15203A" stroke="#38BDF8" strokeWidth="0.8" />
                                <rect x="5" y="5" width="12" height="2" rx="1" fill="#38BDF8" />
                                <rect x="5" y="8" width="8" height="1.5" rx="0.75" fill="#64748B" />
                                <rect x="26" y="5" width="10" height="4" rx="1" fill="#0284C7" />
                                <rect x="2" y="15" width="36" height="10" rx="1.5" fill="#15203A" stroke="#334155" strokeWidth="0.8" />
                                <rect x="5" y="18" width="14" height="2" rx="1" fill="#94A3B8" />
                                <rect x="5" y="21" width="7" height="1.5" rx="0.75" fill="#64748B" />
                                <rect x="26" y="18" width="10" height="4" rx="1" fill="#334155" />
                              </svg>
                            )}

                            {model.id === 'model2' && (
                              <svg className="w-9 h-7 rounded border border-slate-700 bg-[#0B132B] p-1 shrink-0 mt-0.5" viewBox="0 0 40 28" fill="none">
                                <rect x="2" y="2" width="16" height="11" rx="1.5" fill="#15203A" stroke="#F59E0B" strokeWidth="0.8" />
                                <rect x="4" y="4" width="8" height="2" rx="1" fill="#F59E0B" />
                                <rect x="4" y="8" width="12" height="2" rx="1" fill="#334155" />
                                <rect x="22" y="2" width="16" height="11" rx="1.5" fill="#15203A" stroke="#0089D6" strokeWidth="0.8" />
                                <rect x="24" y="4" width="8" height="2" rx="1" fill="#0089D6" />
                                <rect x="24" y="8" width="12" height="2" rx="1" fill="#334155" />
                                <rect x="2" y="15" width="16" height="11" rx="1.5" fill="#15203A" stroke="#334155" strokeWidth="0.8" />
                                <rect x="22" y="15" width="16" height="11" rx="1.5" fill="#15203A" stroke="#334155" strokeWidth="0.8" />
                              </svg>
                            )}

                            {model.id === 'model3' && (
                              <svg className="w-9 h-7 rounded border border-slate-700 bg-[#0B132B] p-1 shrink-0 mt-0.5" viewBox="0 0 40 28" fill="none">
                                <rect x="2" y="2" width="36" height="3.5" rx="0.8" fill="#1E293B" />
                                <rect x="2" y="7.5" width="36" height="5" rx="1" fill="#15203A" stroke="#06B6D4" strokeWidth="0.6" />
                                <circle cx="5" cy="10" r="1.5" fill="#10B981" />
                                <rect x="9" y="9" width="12" height="2" rx="1" fill="#E2E8F0" />
                                <rect x="24" y="9" width="6" height="2" rx="1" fill="#38BDF8" />
                                <rect x="32" y="8.5" width="4" height="3" rx="0.5" fill="#0284C7" />
                                <rect x="2" y="14.5" width="36" height="5" rx="1" fill="#15203A" stroke="#334155" strokeWidth="0.6" />
                                <circle cx="5" cy="17" r="1.5" fill="#10B981" />
                                <rect x="9" y="16" width="10" height="2" rx="1" fill="#E2E8F0" />
                                <rect x="24" y="16" width="6" height="2" rx="1" fill="#F59E0B" />
                                <rect x="2" y="21.5" width="36" height="4.5" rx="0.8" fill="#15203A" />
                              </svg>
                            )}

                            {model.id === 'model4' && (
                              <svg className="w-9 h-7 rounded border border-slate-700 bg-[#0B132B] p-1 shrink-0 mt-0.5" viewBox="0 0 40 28" fill="none">
                                <rect x="2" y="2" width="10" height="6" rx="1" fill="#1E293B" />
                                <rect x="15" y="2" width="10" height="6" rx="1" fill="#1E293B" />
                                <rect x="28" y="2" width="10" height="6" rx="1" fill="#1E293B" />
                                <rect x="2" y="10" width="36" height="3" rx="1" fill="#15203A" />
                                <rect x="2" y="10" width="22" height="3" rx="1" fill="#F59E0B" />
                                <rect x="24" y="10" width="14" height="3" rx="1" fill="#0089D6" />
                                <rect x="2" y="15" width="17" height="11" rx="1" fill="#15203A" stroke="#334155" strokeWidth="0.8" />
                                <rect x="21" y="15" width="17" height="11" rx="1" fill="#15203A" stroke="#334155" strokeWidth="0.8" />
                              </svg>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold leading-tight truncate">{model.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                              </div>
                              <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{model.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Sync Discovery Button */}
              <button
                type="button"
                onClick={() => {
                  triggerRefresh();
                  fetchDynamicRegions();
                }}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <RotateCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync Discovery'}</span>
              </button>
            </div>
          </div>

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Total Regions */}
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Total Regions</span>
                <span className="text-lg font-bold text-white font-mono">{totalRegionsCount}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Global Catalog</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#15203A] border border-[#1E293B] flex items-center justify-center text-slate-300">
                <Globe className="w-4 h-4 text-sky-400" />
              </div>
            </div>

            {/* 2. Active Regions */}
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Active Regions</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">{activeRegionsCount}</span>
                <span className="text-[10px] text-emerald-500/80 block mt-0.5">With Resources</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
            </div>

            {/* 3. Total Compute Instances */}
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Total Compute</span>
                <span className="text-lg font-bold text-white font-mono">{totalComputeInstances}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Discovered Nodes</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#15203A] border border-[#1E293B] flex items-center justify-center text-slate-300">
                <Server className="w-4 h-4 text-blue-400" />
              </div>
            </div>

            {/* 4. Running Instances */}
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Running Instances</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">{runningComputeInstances}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {totalComputeInstances > 0
                    ? `${Math.round((runningComputeInstances / totalComputeInstances) * 100)}% online`
                    : 'All standby'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Filtering Toolbar & Tab Switcher */}
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#111A2E] border border-[#1E293B] rounded-lg self-start">
              <button
                type="button"
                onClick={() => setActiveTab('dynamic')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dynamic'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${activeTab === 'dynamic' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                <span>Active Resource Regions</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#0D1526] text-slate-300">
                  {filteredDynamicRegions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>All Cloud Regions Catalog</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#0D1526] text-slate-300">
                  {displayedCatalogRegions.length}
                </span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Search */}
              <div className="relative min-w-[200px] sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search regions by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Provider Filter */}
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer shrink-0"
              >
                <option value="all">All Providers</option>
                <option value="aws">AWS Only</option>
                <option value="azure">Azure Only</option>
              </select>

              {/* Region Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer shrink-0"
              >
                <option value="all">All Regions</option>
                <option value="active">Active Only</option>
                {activeTab === 'all' && <option value="monitored">Monitored Only</option>}
              </select>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ACTIVE RESOURCE REGIONS (DYNAMIC) -> RENDERED VIA SELECTED MODEL  */}
          {/* ========================================================================= */}
          {activeTab === 'dynamic' && (
            <div>
              {loadingDynamic ? (
                <div className="p-12 text-center text-slate-400 space-y-2 bg-[#0D1526] border border-[#1E293B] rounded-xl">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto text-sky-400" />
                  <p className="text-xs">Discovering cloud regions with active compute resources...</p>
                </div>
              ) : filteredDynamicRegions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3 bg-[#0D1526] border border-[#1E293B] rounded-xl">
                  <Globe className="w-9 h-9 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-white">
                    {connectedAwsCount === 0 && connectedAzureCount === 0
                      ? 'No Cloud Accounts Connected'
                      : 'No Active Regions Found'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {connectedAwsCount === 0 && connectedAzureCount === 0
                      ? 'No AWS accounts or Azure subscriptions are currently connected. Connect a cloud account in Cloud Accounts to monitor regional compute instances.'
                      : 'No active compute instances were found matching the selected provider or search criteria.'}
                  </p>
                  {connectedAwsCount === 0 && connectedAzureCount === 0 && (
                    <Link
                      href="/dashboard/cloud-accounts"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm cursor-pointer mt-1"
                    >
                      <span>Connect Cloud Account</span>
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* MODEL 1: MINIMAL PROFESSIONAL (Default) */}
                  {layoutModel === 'model1' && (
                    <div className="space-y-3">
                      {filteredDynamicRegions.map((reg) => {
                        const isAws = reg.cloud === 'aws';
                        const isAzure = reg.cloud === 'azure';
                        return (
                          <div
                            key={reg.region}
                            className="bg-[#0D1526] border border-[#1E293B] hover:border-slate-600/70 rounded-xl p-4 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                                  isAzure
                                    ? 'bg-[#0089D6]/10 border-[#0089D6]/25'
                                    : isAws
                                    ? 'bg-amber-500/10 border-amber-500/25'
                                    : 'bg-purple-500/10 border-purple-500/25'
                                }`}
                              >
                                {isAws ? (
                                  <AwsLogo className="w-4 h-4" />
                                ) : isAzure ? (
                                  <AzureLogo className="w-4 h-4" />
                                ) : (
                                  <Server className="w-4 h-4 text-purple-400" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white text-sm">{reg.displayName}</span>
                                  <span className="font-mono text-xs text-slate-400">({reg.region})</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      isAzure
                                        ? 'bg-[#0089D6]/15 text-[#5EA0EF]'
                                        : isAws
                                        ? 'bg-amber-500/15 text-amber-400'
                                        : 'bg-slate-700/40 text-slate-300'
                                    }`}
                                  >
                                    {isAzure ? 'Microsoft Azure' : isAws ? 'Amazon Web Services' : 'Infrastructure'}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {reg.resourceCount} {isAzure ? 'Virtual Machines' : isAws ? 'EC2 Instances' : 'Servers'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 self-end sm:self-auto">
                              <div className="text-right">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                  <span className="text-xs font-semibold text-emerald-400 font-mono">
                                    {reg.runningCount} Online
                                  </span>
                                </div>
                                {reg.stoppedCount > 0 && (
                                  <span className="text-[10px] text-slate-500 font-mono block">
                                    {reg.stoppedCount} Stopped
                                  </span>
                                )}
                              </div>

                              <Link
                                href={`/dashboard/regions/${encodeURIComponent(reg.region)}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18233C] hover:bg-blue-600 hover:text-white text-slate-200 border border-[#1E293B] transition-all shrink-0 cursor-pointer shadow-sm"
                              >
                                <span>View Resources</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* MODEL 2: MODERN CLOUD GRID */}
                  {layoutModel === 'model2' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredDynamicRegions.map((reg) => {
                        const isAws = reg.cloud === 'aws';
                        const isAzure = reg.cloud === 'azure';
                        const onlineRatio = reg.resourceCount > 0 ? (reg.runningCount / reg.resourceCount) * 100 : 0;
                        return (
                          <div
                            key={reg.region}
                            className={`bg-[#0D1526] border rounded-xl p-4 flex flex-col justify-between transition-all shadow-sm hover:shadow-md ${
                              isAzure
                                ? 'border-[#0089D6]/30 hover:border-[#0089D6]/60'
                                : isAws
                                ? 'border-amber-500/30 hover:border-amber-500/60'
                                : 'border-[#1E293B] hover:border-slate-500'
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Card Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                      isAzure
                                        ? 'bg-[#0089D6]/15 border-[#0089D6]/30'
                                        : isAws
                                        ? 'bg-amber-500/15 border-amber-500/30'
                                        : 'bg-slate-800 border-slate-700'
                                    }`}
                                  >
                                    {isAws ? (
                                      <AwsLogo className="w-4 h-4" />
                                    ) : isAzure ? (
                                      <AzureLogo className="w-4 h-4" />
                                    ) : (
                                      <Server className="w-4 h-4 text-blue-400" />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-white text-sm leading-tight">{reg.displayName}</h3>
                                    <span className="font-mono text-[11px] text-slate-400">({reg.region})</span>
                                  </div>
                                </div>

                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    isAzure
                                      ? 'bg-[#0089D6]/15 text-[#5EA0EF] border-[#0089D6]/30'
                                      : isAws
                                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                      : 'bg-slate-700/30 text-slate-300 border-slate-600/30'
                                  }`}
                                >
                                  {isAzure ? 'Azure' : isAws ? 'AWS' : 'Fleet'}
                                </span>
                              </div>

                              {/* Capacity Ratio Progress Bar */}
                              <div className="space-y-1 bg-[#111A2E] p-2.5 rounded-lg border border-[#1E293B]">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-400">Running Capacity:</span>
                                  <span className="text-emerald-400 font-mono font-semibold">
                                    {reg.runningCount}/{reg.resourceCount} Online
                                  </span>
                                </div>
                                <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      onlineRatio >= 80 ? 'bg-emerald-400' : onlineRatio >= 50 ? 'bg-amber-400' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${onlineRatio}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div className="pt-3 mt-3 border-t border-[#1E293B] flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">
                                {reg.resourceCount} {isAzure ? 'VMs' : isAws ? 'EC2' : 'Servers'}
                              </span>
                              <Link
                                href={`/dashboard/regions/${encodeURIComponent(reg.region)}`}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-all shadow-sm ${
                                  isAzure
                                    ? 'bg-[#0089D6] hover:bg-[#0078D4]'
                                    : isAws
                                    ? 'bg-[#FF9900] hover:bg-[#E68A00] text-black font-bold'
                                    : 'bg-blue-600 hover:bg-blue-500'
                                }`}
                              >
                                <span>View Resources</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* MODEL 3: COMPACT OPERATIONS VIEW */}
                  {layoutModel === 'model3' && (
                    <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#111A2E] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                            <tr>
                              <th className="py-2.5 px-4 font-semibold">Cloud Provider</th>
                              <th className="py-2.5 px-4 font-semibold">Region Name & Code</th>
                              <th className="py-2.5 px-4 font-semibold">Total Nodes</th>
                              <th className="py-2.5 px-4 font-semibold">Status</th>
                              <th className="py-2.5 px-4 font-semibold">Health / Ratio</th>
                              <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1E293B]">
                            {filteredDynamicRegions.map((reg) => {
                              const isAws = reg.cloud === 'aws';
                              const isAzure = reg.cloud === 'azure';
                              const onlineRatio = reg.resourceCount > 0 ? (reg.runningCount / reg.resourceCount) * 100 : 0;
                              return (
                                <tr key={reg.region} className="hover:bg-[#15203A] transition-colors">
                                  {/* Provider */}
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        isAzure
                                          ? 'bg-[#0089D6]/15 text-[#5EA0EF] border-[#0089D6]/30'
                                          : isAws
                                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                          : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                      }`}
                                    >
                                      {isAws ? (
                                        <AwsLogo className="w-3.5 h-3.5" />
                                      ) : isAzure ? (
                                        <AzureLogo className="w-3.5 h-3.5" />
                                      ) : (
                                        <Server className="w-3.5 h-3.5" />
                                      )}
                                      <span>{isAzure ? 'Azure' : isAws ? 'AWS' : reg.cloud}</span>
                                    </span>
                                  </td>

                                  {/* Region Name & Code */}
                                  <td className="py-2.5 px-4">
                                    <div className="font-semibold text-white">{reg.displayName}</div>
                                    <div className="text-[10px] font-mono text-slate-400">{reg.region}</div>
                                  </td>

                                  {/* Total Nodes */}
                                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-200">
                                    {reg.resourceCount} {isAzure ? 'VMs' : isAws ? 'EC2' : 'nodes'}
                                  </td>

                                  {/* Status */}
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                      <span className="font-semibold text-emerald-400">{reg.runningCount} Running</span>
                                      {reg.stoppedCount > 0 && (
                                        <span className="text-slate-500 text-[10px]">({reg.stoppedCount} Stopped)</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Health Ratio Bar */}
                                  <td className="py-2.5 px-4">
                                    <div className="w-28 space-y-1">
                                      <div className="flex justify-between text-[10px]">
                                        <span className="text-slate-400">{Math.round(onlineRatio)}%</span>
                                        <span className="font-mono text-slate-400">{reg.runningCount}/{reg.resourceCount}</span>
                                      </div>
                                      <div className="w-full bg-[#111A2E] rounded-full h-1 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            onlineRatio >= 80 ? 'bg-emerald-400' : 'bg-amber-400'
                                          }`}
                                          style={{ width: `${onlineRatio}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                    <Link
                                      href={`/dashboard/regions/${encodeURIComponent(reg.region)}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#18233C] hover:bg-blue-600 text-slate-200 hover:text-white border border-[#1E293B] transition-colors"
                                    >
                                      <span>View</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* MODEL 4: EXECUTIVE OVERVIEW */}
                  {layoutModel === 'model4' && (
                    <div className="space-y-4">
                      {/* Cloud Distribution Summary Bar */}
                      <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-cyan-400" />
                            <span>Cloud Resource Distribution by Provider</span>
                          </span>
                          <div className="flex items-center gap-3 text-[11px] font-semibold">
                            <span className="flex items-center gap-1 text-amber-400">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              AWS: {awsActiveCount} instances ({totalComputeInstances > 0 ? Math.round((awsActiveCount / totalComputeInstances) * 100) : 0}%)
                            </span>
                            <span className="flex items-center gap-1 text-[#5EA0EF]">
                              <span className="w-2 h-2 rounded-full bg-[#0089D6]" />
                              Azure: {azureActiveCount} VMs ({totalComputeInstances > 0 ? Math.round((azureActiveCount / totalComputeInstances) * 100) : 0}%)
                            </span>
                          </div>
                        </div>

                        {/* Visual distribution split bar */}
                        <div className="w-full bg-[#111A2E] rounded-full h-2.5 overflow-hidden flex">
                          <div
                            className="bg-amber-500 h-full transition-all"
                            style={{
                              width: `${totalComputeInstances > 0 ? (awsActiveCount / totalComputeInstances) * 100 : 50}%`,
                            }}
                            title={`AWS: ${awsActiveCount} nodes`}
                          />
                          <div
                            className="bg-[#0089D6] h-full transition-all"
                            style={{
                              width: `${totalComputeInstances > 0 ? (azureActiveCount / totalComputeInstances) * 100 : 50}%`,
                            }}
                            title={`Azure: ${azureActiveCount} nodes`}
                          />
                        </div>
                      </div>

                      {/* Region Executive Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {filteredDynamicRegions.map((reg) => {
                          const isAws = reg.cloud === 'aws';
                          const isAzure = reg.cloud === 'azure';
                          return (
                            <div
                              key={reg.region}
                              className="bg-[#0D1526] border border-[#1E293B] hover:border-slate-600/60 rounded-xl p-4 transition-all shadow-sm space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                                      isAzure
                                        ? 'bg-[#0089D6]/15 border-[#0089D6]/30'
                                        : isAws
                                        ? 'bg-amber-500/15 border-amber-500/30'
                                        : 'bg-purple-500/15 border-purple-500/30'
                                    }`}
                                  >
                                    {isAws ? (
                                      <AwsLogo className="w-4 h-4" />
                                    ) : isAzure ? (
                                      <AzureLogo className="w-4 h-4" />
                                    ) : (
                                      <Server className="w-4 h-4 text-purple-400" />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-white text-sm">{reg.displayName}</h3>
                                    <span className="font-mono text-xs text-slate-400">({reg.region})</span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-bold text-emerald-400 font-mono block">
                                    {reg.runningCount} Active
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {reg.resourceCount} Total
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2.5 border-t border-[#1E293B] text-xs">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    isAzure
                                      ? 'bg-[#0089D6]/15 text-[#5EA0EF] border border-[#0089D6]/30'
                                      : isAws
                                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                      : 'bg-slate-700/30 text-slate-300'
                                  }`}
                                >
                                  {isAzure ? 'Microsoft Azure' : isAws ? 'AWS Cloud' : 'Fleet'}
                                </span>

                                <Link
                                  href={`/dashboard/regions/${encodeURIComponent(reg.region)}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18233C] hover:bg-blue-600 hover:text-white text-slate-200 border border-[#1E293B] transition-colors"
                                >
                                  <span>View Resources</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ALL CLOUD REGIONS CATALOG -> INTEGRATED WITH MONITORING TOGGLES    */}
          {/* ========================================================================= */}
          {activeTab === 'all' && (
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#111A2E]/50">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>All Cloud Regions Catalog</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toggle monitoring on or off for individual AWS and Azure cloud regions.
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Monitored: <span className="text-emerald-400 font-bold">{monitoredCount}</span> of {displayedCatalogRegions.length}
                </div>
              </div>

              {displayedCatalogRegions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No catalog regions match your search or filter.
                </div>
              ) : (
                <div className="divide-y divide-[#1E293B] max-h-[550px] overflow-y-auto">
                  {displayedCatalogRegions.map((reg) => {
                    const isAws = reg.cloud === 'aws';
                    return (
                      <div
                        key={reg.id}
                        className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#15203A] transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                              isAws ? 'bg-amber-500/10 border-amber-500/25' : 'bg-[#0089D6]/10 border-[#0089D6]/25'
                            }`}
                          >
                            {isAws ? <AwsLogo className="w-3.5 h-3" /> : <AzureLogo className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white truncate">{reg.displayName}</span>
                              <span className="font-mono text-[11px] text-slate-400">({reg.region})</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="capitalize">{reg.cloud}</span>
                              <span>•</span>
                              {reg.resourceCount > 0 ? (
                                <span className="font-bold text-emerald-400">{reg.resourceCount} Active Instances</span>
                              ) : (
                                <span className="text-slate-500">0 Active Instances</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {reg.resourceCount > 0 && (
                            <Link
                              href={`/dashboard/regions/${encodeURIComponent(reg.region)}`}
                              className="px-2 py-1 text-[11px] font-semibold bg-[#18233C] hover:bg-blue-600 hover:text-white text-slate-300 rounded border border-[#1E293B] transition-colors inline-flex items-center gap-1"
                            >
                              <span>Resources</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}

                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-medium hidden sm:inline ${reg.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {reg.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRegion(reg.id)}
                              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                                reg.enabled ? 'bg-blue-600' : 'bg-slate-700'
                              }`}
                              title={reg.enabled ? 'Click to disable monitoring' : 'Click to enable monitoring'}
                            >
                              <span
                                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                  reg.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
