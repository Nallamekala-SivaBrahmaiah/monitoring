'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { MultiCloudBrandLogo } from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';

export function CloudOpsQuickHUD() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);

  const {
    filteredEC2Instances,
    filteredAzureVMs,
    triggerRefresh,
    isRefreshing,
  } = useMonitoring();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hudRef.current && !hudRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Don't render on login page
  if (pathname === '/login') {
    return null;
  }

  const runningEC2 = filteredEC2Instances.filter(
    (i) => i.status?.toLowerCase() === 'running'
  ).length;
  const runningAzure = filteredAzureVMs.filter(
    (v) => v.powerState?.toLowerCase() === 'running'
  ).length;

  return (
    <div
      ref={hudRef}
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end font-sans select-none"
    >
      {/* Floating HUD Modal Card */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-88 rounded-2xl bg-[#081226]/95 border border-cyan-500/40 shadow-[0_12px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* Header */}
          <div className="px-4 py-3 bg-[#0A162E] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#07132B] border border-cyan-500/40 flex items-center justify-center p-0.5">
                <MultiCloudBrandLogo className="w-full h-full" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                  <span>CLOUD OPS HUD</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </h4>
                <p className="text-[10px] text-cyan-400 font-mono">Live Telemetry Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => triggerRefresh()}
                disabled={isRefreshing}
                title="Sync Metrics Now"
                className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Summary Matrix */}
          <div className="p-3.5 space-y-2 border-b border-slate-800/80 bg-[#060E1E]/60 text-xs">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
              <span>Node Connectivity</span>
              <span className="text-emerald-400 font-mono">99.99% Operational</span>
            </div>

            {/* AWS EC2 Status */}
            <Link
              href="/dashboard/ec2"
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between p-2 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF9900] shadow-[0_0_8px_#FF9900]"></span>
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-amber-400 text-xs flex items-center gap-1.5">
                    <span>AWS EC2</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">us-east-1</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {runningEC2} active &bull; ping: 14ms
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </Link>

            {/* Azure VM Status */}
            <Link
              href="/dashboard/azure-vms"
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between p-2 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0089D6] shadow-[0_0_8px_#0089D6]"></span>
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-400 text-xs flex items-center gap-1.5">
                    <span>Azure Virtual Machines</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">eastus</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {runningAzure} active &bull; ping: 19ms
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </Link>
          </div>

          {/* Quick DevOps Actions */}
          <div className="p-3 space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 px-1">
              DevOps Actions
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Link
                href="/dashboard/servers"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 font-medium transition-all group"
              >
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate">Web SSH Fleet</span>
              </Link>

              <Link
                href="/dashboard/nginx"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 font-medium transition-all group"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate">Nginx &amp; PM2</span>
              </Link>

              <Link
                href="/dashboard/ansible"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 font-medium transition-all group"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">Ansible Sync</span>
              </Link>

              <Link
                href="/dashboard/kubernetes"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-200 font-medium transition-all group"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate">K8s Clusters</span>
              </Link>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-3 py-2 bg-[#060D1A] border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>WebSocket: Sub-second</span>
            <span className="text-cyan-400 font-semibold">Dual-Bus Active</span>
          </div>

        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Close Cloud Control HUD" : "Open Cloud Control HUD"}
        aria-label="Cloud Ops Quick HUD"
        className={`relative group w-12 h-12 rounded-full bg-[#07132B] border-2 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-2xl ${
          isOpen
            ? 'border-cyan-400 shadow-[0_0_25px_rgba(0,212,255,0.7)] rotate-90 scale-105'
            : 'border-cyan-500/60 hover:border-cyan-400 hover:scale-110 shadow-[0_0_20px_rgba(0,132,255,0.4)]'
        }`}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-cyan-400 transform -rotate-90 transition-transform" />
        ) : (
          <>
            <div className="w-7 h-7">
              <MultiCloudBrandLogo className="w-full h-full drop-shadow-[0_0_6px_rgba(0,212,255,0.8)]" />
            </div>
            {/* Live pulsing ping indicator */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-[#07132B]"></span>
            </span>
          </>
        )}
      </button>
    </div>
  );
}
