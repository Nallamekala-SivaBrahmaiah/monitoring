'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCw,
  AlertCircle,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Flame,
  Activity,
  Sliders,
  Wrench,
  Clock,
  ExternalLink,
  Save,
  X,
} from 'lucide-react';
import { ModuleCustomizeButton } from '@/components/dashboard/style-studio/ModuleCustomizeButton';

export type AlertTabKey = 'active' | 'heatmap' | 'rules' | 'self-healing' | 'timeline';

interface AlertsTopBarProps {
  activeTab: AlertTabKey;
  onTabChange: (tab: AlertTabKey) => void;
  onEvaluate: () => void;
  isEvaluating: boolean;
  activeIncidentsCount: number;
  totalServersCount: number;
  showThresholdDrawer: boolean;
  onToggleThresholdDrawer: () => void;
  cpuThreshold: number;
  setCpuThreshold: (v: number) => void;
  memoryThreshold: number;
  setMemoryThreshold: (v: number) => void;
  diskThreshold: number;
  setDiskThreshold: (v: number) => void;
  criticalThreshold: number;
  setCriticalThreshold: (v: number) => void;
  onSaveThresholds: () => void;
  isSavingThresholds: boolean;
  thresholdSavedNotice: boolean;
}

export function AlertsTopBar({
  activeTab,
  onTabChange,
  onEvaluate,
  isEvaluating,
  activeIncidentsCount,
  totalServersCount,
  showThresholdDrawer,
  onToggleThresholdDrawer,
  cpuThreshold,
  setCpuThreshold,
  memoryThreshold,
  setMemoryThreshold,
  diskThreshold,
  setDiskThreshold,
  criticalThreshold,
  setCriticalThreshold,
  onSaveThresholds,
  isSavingThresholds,
  thresholdSavedNotice,
}: AlertsTopBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 240;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const tabs: Array<{
    id: AlertTabKey;
    label: string;
    icon: any;
    countBadge?: string | number;
    badgeColor?: string;
  }> = [
    {
      id: 'active',
      label: 'Active Incidents & Firing Queue',
      icon: Flame,
      countBadge: activeIncidentsCount,
      badgeColor: activeIncidentsCount > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400',
    },
    {
      id: 'heatmap',
      label: 'Fleet Health Heatmap',
      icon: Activity,
      countBadge: `${totalServersCount} Hosts`,
    },
    {
      id: 'rules',
      label: 'Alert Rules & Threshold Engine',
      icon: Sliders,
      countBadge: '5 Rules',
    },
    {
      id: 'self-healing',
      label: 'Self-Healing & Auto-Remediation',
      icon: Wrench,
      countBadge: '4 Runbooks',
    },
    {
      id: 'timeline',
      label: 'Incident Timeline & Audit Ledger',
      icon: Clock,
      countBadge: 'Live Stream',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Master Control Bar Box */}
      <div className="bg-[#090F1E]/95 border border-rose-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-rose-950/30 backdrop-blur-md">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left: Breadcrumbs & Identity */}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-mono">
              <Link
                href="/"
                className="hover:text-rose-400 flex items-center gap-1 transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Dashboard</span>
              </Link>
              <span>/</span>
              <span className="text-rose-400 font-medium">Alerts & Incidents Command Center</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/25 via-amber-500/25 to-purple-600/25 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/40 shrink-0">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Threshold-Based Infrastructure Alerts
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    SSE Stream: Connected
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    {activeIncidentsCount} Firing
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Automated telemetry health evaluation, incident triage, live alert dispatching, and self-healing runbooks.
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Cluster: Customize -> Configure Thresholds -> Evaluate Now (on right side!) */}
          <div className="flex items-center gap-2.5 flex-wrap self-start xl:self-center">
            {/* Style Studio Customize Button */}
            <ModuleCustomizeButton
              moduleId="alerts"
              moduleName="Alerts Center"
              variant="pill"
            />

            {/* Configure Thresholds Button */}
            <button
              onClick={onToggleThresholdDrawer}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                showThresholdDrawer
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-750'
              }`}
              title="Configure infrastructure alert thresholds"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configure Thresholds</span>
            </button>

            {/* Evaluate Now Shifted to the Far Right Side */}
            <button
              onClick={onEvaluate}
              disabled={isEvaluating}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white rounded-xl shadow-lg shadow-rose-950/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Run immediate metric evaluation"
            >
              <RotateCw className={`w-3.5 h-3.5 text-white ${isEvaluating ? 'animate-spin' : ''}`} />
              <span>{isEvaluating ? 'Evaluating...' : 'Evaluate Now'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Quick Threshold Configuration Drawer */}
        {showThresholdDrawer && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white font-mono uppercase">
                  Live Thresholds Configuration
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Global Fleet Gates
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/settings"
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors mr-2"
                >
                  <span>Advanced Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  onClick={onToggleThresholdDrawer}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* CPU */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">CPU Alert Threshold</span>
                  <span className="font-mono text-cyan-300 font-bold">&gt;= {cpuThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="95"
                  value={cpuThreshold}
                  onChange={(e) => setCpuThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Memory */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Memory Threshold</span>
                  <span className="font-mono text-purple-300 font-bold">&gt;= {memoryThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="95"
                  value={memoryThreshold}
                  onChange={(e) => setMemoryThreshold(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Disk */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Disk Threshold</span>
                  <span className="font-mono text-amber-300 font-bold">&gt;= {diskThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="98"
                  value={diskThreshold}
                  onChange={(e) => setDiskThreshold(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Critical Escalation */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Critical Escalation Gate</span>
                  <span className="font-mono text-rose-400 font-bold">&gt;= {criticalThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="99"
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-mono">
                {thresholdSavedNotice
                  ? '✓ Thresholds saved & re-evaluated!'
                  : 'Applies to AWS EC2, Azure VMs, Kubernetes & Linux servers.'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleThresholdDrawer}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={onSaveThresholds}
                  disabled={isSavingThresholds}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingThresholds ? 'Saving...' : 'Save & Apply'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Carousel Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2">
          <button
            onClick={() => scrollTabs('left')}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700/60 transition-all shrink-0"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 border ${
                    isActive
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md shadow-rose-950/30'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.countBadge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        tab.badgeColor || (isActive ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-800 text-slate-400')
                      }`}
                    >
                      {tab.countBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => scrollTabs('right')}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700/60 transition-all shrink-0"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
