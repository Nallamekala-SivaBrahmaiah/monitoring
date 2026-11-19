'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Server } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { OnPremisesServersTable } from '@/components/dashboard/OnPremisesServersTable';
import { AddServerModal } from '@/components/dashboard/AddServerModal';
import { useMonitoring } from '@/context/MonitoringContext';

export default function OnPremisesServersPage() {
  const { customServers, triggerRefresh, isRefreshing } = useMonitoring();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute Online & Offline counts from customServers
  const onPremServers = (customServers || []).filter((s: any) => {
    const prov = (s.cloudProvider || '').toLowerCase();
    return prov === 'on-premise' || prov === 'other' || prov === 'datacenter' || !s.cloudResourceId;
  });

  const activeList = onPremServers.length > 0 ? onPremServers : customServers || [];

  const onlineCount = activeList.filter((s: any) => {
    const st = (s.status || '').toLowerCase();
    return st === 'online' || st === 'running' || Boolean(s.isSSHConnected && st !== 'offline');
  }).length;

  const offlineCount = activeList.length - onlineCount;

  const handleServerAdded = (name: string) => {
    setToastMessage(`Server "${name}" successfully registered! Telemetry collection active.`);
    triggerRefresh();
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
          {/* Top Header & Breadcrumbs matching EC2 & Azure VMs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link
                  href="/"
                  className="hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
                <span>/</span>
                <span className="text-white font-medium">On-Premises Servers</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <Server className="w-6 h-6 text-emerald-400" />
                <span>On-Premises Servers (Datacenter Infrastructure)</span>
              </h2>
            </div>

            {/* Counter Badges & Sync Button matching EC2 & Azure VMs */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs bg-[#111A2E] border border-[#1E293B] px-3 py-1.5 rounded-lg">
                <span className="text-emerald-400 font-bold">{onlineCount}</span>
                <span className="text-slate-400">Online</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 font-bold">{offlineCount}</span>
                <span className="text-slate-400">Offline</span>
              </div>

              <button
                onClick={triggerRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-fade-in">
              <span>{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="text-emerald-400 hover:text-emerald-200 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {/* On-Premises Servers Inventory Table */}
          <OnPremisesServersTable
            showViewAllButton={false}
            limit={25}
            isLoading={isRefreshing}
            onRefresh={triggerRefresh}
            onAddClick={() => setShowAddModal(true)}
          />
        </main>
      </div>

      {/* Add On-Premises Server Modal */}
      <AddServerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleServerAdded}
      />
    </div>
  );
}
