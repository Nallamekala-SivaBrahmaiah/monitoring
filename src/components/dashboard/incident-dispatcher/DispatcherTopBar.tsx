'use client';

import React from 'react';
import Link from 'next/link';
import {
  Radio,
  Power,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  BellRing,
  Users,
  Clock,
  BellOff,
  Activity,
  LayoutGrid,
  Sliders,
  Wrench,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export type DispatcherTabKey =
  | 'incidents'
  | 'channels'
  | 'actionGroups'
  | 'escalation'
  | 'silence'
  | 'logs'
  | 'heatmap'
  | 'rules'
  | 'remediation';

interface DispatcherTopBarProps {
  activeTab: DispatcherTabKey;
  onTabChange: (tab: DispatcherTabKey) => void;
  connected: boolean;
  onToggleConnection: () => Promise<void>;
  loadingConnection: boolean;
  onRefresh?: () => void;
}

export function DispatcherTopBar({
  activeTab,
  onTabChange,
  connected,
  onToggleConnection,
  loadingConnection,
  onRefresh,
}: DispatcherTopBarProps) {
  const tabs: { key: DispatcherTabKey; label: string; icon: any; count?: number }[] = [
    { key: 'incidents', label: 'Active Incidents', icon: AlertCircle },
    { key: 'channels', label: 'Delivery Channels', icon: Radio },
    { key: 'actionGroups', label: 'Action Groups', icon: Users },
    { key: 'escalation', label: 'Escalation & On-Call', icon: ShieldCheck },
    { key: 'silence', label: 'Maintenance Silence', icon: BellOff },
    { key: 'logs', label: 'Dispatch Logs', icon: Activity },
    { key: 'heatmap', label: 'Fleet Heatmap', icon: LayoutGrid },
    { key: 'rules', label: 'Alert Rules', icon: Sliders },
    { key: 'remediation', label: 'Self-Healing', icon: Wrench },
  ];

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Navigation Links */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Link href="/" className="hover:text-cyan-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-white font-medium">Incident Dispatcher &amp; Alert Hub</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/alerts"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors text-[11px]"
          >
            <span>Normal Alerts</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/dashboard/notifications"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors text-[11px]"
          >
            <span>Notification Channels</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Hero Header Card with Master Integration Toggle */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${
          connected
            ? 'bg-gradient-to-r from-[#0F1A2E] via-[#0E2A38] to-[#0A1F30] border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
            : 'bg-gradient-to-r from-[#171420] via-[#1C1622] to-[#14121B] border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
        }`}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Title & Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-inner ${
                  connected
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-cyan-500/20'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <Radio className={`w-6 h-6 ${connected ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Incident Dispatcher &amp; Alert Hub
                  </h1>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                      connected
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        connected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                      }`}
                    />
                    {connected ? 'CONNECTED & ACTIVE' : 'DISCONNECTED / STANDALONE'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Unified enterprise module for incident dispatching, action groups, maintenance silence windows,
                  escalation tiers, and multi-channel telemetry delivery.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Master ON / OFF Connect Toggle Button */}
          <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh module state"
                className="p-2.5 rounded-xl bg-[#090D16] hover:bg-[#131B2E] border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onToggleConnection}
              disabled={loadingConnection}
              className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all duration-200 border shadow-lg disabled:opacity-60 ${
                connected
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/50 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-amber-400/50 shadow-amber-500/20'
              }`}
            >
              <Power className={`w-4 h-4 ${loadingConnection ? 'animate-spin' : ''}`} />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider opacity-80 leading-none">
                  {connected ? 'Module Linked' : 'Module Unlinked'}
                </div>
                <div className="text-xs font-extrabold mt-0.5">
                  {connected ? 'CONNECTED (ON)' : 'CONNECT NOW (OFF)'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Status Callout Strip */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-200">
                  <strong>Integrated with Monitoring:</strong> Live CPU, memory, and disk alert streams route
                  through this dispatcher. Action groups, silence windows, and escalation matrices are active.
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-amber-200">
                  <strong>Disconnected:</strong> Normal alerts and notifications operate in standard basic mode.
                  This module is isolated and will NOT intercept or dispatch alerts until Connected.
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? 'bg-[#131D33] text-cyan-400 border-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0D1526] border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
