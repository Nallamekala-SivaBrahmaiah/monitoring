'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCw,
  Plus,
  Radio,
  ShieldCheck,
  Bell,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Zap,
  Users,
  ShieldAlert,
  Moon,
  ClipboardList,
} from 'lucide-react';
import { NotificationChannelsIcon } from '@/components/icons/CloudIcons';
import { ModuleCustomizeButton } from '@/components/dashboard/style-studio/ModuleCustomizeButton';

export type NotificationTabKey = 'channels' | 'action-groups' | 'escalation' | 'maintenance' | 'logs';

interface NotificationTopBarProps {
  activeTab: NotificationTabKey;
  onTabChange: (tab: NotificationTabKey) => void;
  maintenanceMode: boolean;
  onToggleMaintenance: () => void;
  onRefresh: () => void;
  onOpenCreateChannel: () => void;
  isRefreshing?: boolean;
}

export function NotificationTopBar({
  activeTab,
  onTabChange,
  maintenanceMode,
  onToggleMaintenance,
  onRefresh,
  onOpenCreateChannel,
  isRefreshing = false,
}: NotificationTopBarProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

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
    id: NotificationTabKey;
    label: string;
    icon: any;
    countBadge?: string;
  }> = [
    { id: 'channels', label: 'Delivery Channels', icon: Radio, countBadge: '5' },
    { id: 'action-groups', label: 'Action Groups & Signal Matrix', icon: Zap, countBadge: '3' },
    { id: 'escalation', label: 'Escalation & On-Call', icon: Users, countBadge: 'L1-L3' },
    { id: 'maintenance', label: 'Maintenance & Silence Windows', icon: Moon },
    { id: 'logs', label: 'Dispatch Logs & Test Center', icon: ClipboardList, countBadge: 'Live' },
  ];

  return (
    <div className="space-y-4">
      {/* Master Control Bar Box (Styled to match the 9 Module Headers + Terraform Master Box) */}
      <div className="bg-[#090F1E]/95 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Breadcrumbs & Identity */}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-mono">
              <Link
                href="/"
                className="hover:text-cyan-400 flex items-center gap-1 transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Dashboard</span>
              </Link>
              <span>/</span>
              <span className="text-cyan-400 font-medium">Notification Channels</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/25 via-blue-600/25 to-purple-600/25 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40 shrink-0">
                <NotificationChannelsIcon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Notification Channels & Incident Dispatcher
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    SSE Stream: Connected
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    99.98% Delivered
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Automated event-driven dispatch engine for live multi-cloud infrastructure alerts, audible sirens, and team escalation policies.
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Cluster matching the 9 module screenshots */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            {/* Style Studio Customize Button */}
            <ModuleCustomizeButton
              moduleId="notifications"
              moduleName="Notification Channels"
              variant="dropdown"
              size="sm"
            />

            {/* Maintenance Mode Toggle */}
            <button
              onClick={onToggleMaintenance}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                maintenanceMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-lg shadow-amber-950/30'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750 hover:text-white'
              }`}
              title="Mute or unmute non-critical notifications"
            >
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span>Maintenance Mode:</span>
              <span className={`font-mono uppercase text-[10px] px-1.5 py-0.5 rounded ${
                maintenanceMode ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-700 text-slate-300'
              }`}>
                {maintenanceMode ? 'Active (Muted)' : 'OFF'}
              </span>
            </button>

            {/* + Create Channel */}
            <button
              onClick={onOpenCreateChannel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-950/40 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Channel</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Channels & Logs"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

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
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.countBadge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-cyan-500/30 text-cyan-200'
                          : 'bg-slate-800 text-slate-400'
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
