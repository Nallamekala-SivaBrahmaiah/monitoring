'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Server } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { OnPremisesServersTable } from '@/components/dashboard/OnPremisesServersTable';
import { AddServerModal } from '@/components/dashboard/AddServerModal';
import { useMonitoring } from '@/context/MonitoringContext';

export default function OnPremisesPage() {
  const { customServers, triggerRefresh, isRefreshing } = useMonitoring();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [directServers, setDirectServers] = useState<any[]>([]);

  const fetchOnPremDirect = async () => {
    try {
      const res = await fetch(`/api/servers?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDirectServers(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchOnPremDirect();
  }, [isRefreshing]);

  // Combine direct and context servers with deduplication by ID and host
  const mergedMap = new Map<string, any>();
  for (const s of (customServers || [])) {
    const key = (s._id || s.id || s.host || '').toString();
    if (key) mergedMap.set(key, s);
  }
  for (const s of directServers) {
    const key = (s._id || s.id || s.host || '').toString();
    if (key) mergedMap.set(key, s);
  }
  const allAvailable = mergedMap.size > 0 ? Array.from(mergedMap.values()) : directServers;

  // STRICT FILTER: Display dedicated on-premises & custom integrated servers
  const onPremServers = allAvailable.filter((s: any) => {
    const prov = (s.cloudProvider || '').toLowerCase();
    const resId = (s.cloudResourceId || s.instanceId || '').toLowerCase();

    // Dedicated on-premise, datacenter, bare-metal or custom registered servers
    if (
      prov === 'on-premise' ||
      prov === 'on-premises' ||
      prov === 'onprem' ||
      prov === 'datacenter' ||
      prov === 'bare-metal' ||
      prov === 'custom'
    ) {
      return true;
    }

    // Exclude cloud resources automatically discovered via cloud account fleet sync
    if (prov === 'aws' || prov === 'azure' || prov === 'gcp') return false;
    if (resId.startsWith('i-') || resId.includes('/subscriptions/') || resId.includes('/resourcegroups/')) return false;

    return prov === 'other' || !prov;
  });

  const onlineCount = onPremServers.filter((s: any) => {
    const st = (s.status || '').toLowerCase();
    return st === 'online' || st === 'running' || Boolean(s.isSSHConnected && st !== 'offline');
  }).length;

  const offlineCount = onPremServers.length - onlineCount;

  const handleServerAdded = async (name: string) => {
    setToastMessage(`Server "${name}" successfully registered! Telemetry collection active.`);
    await fetchOnPremDirect();
    triggerRefresh();
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
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
                <span className="text-white font-medium">On-Premises</span>
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
                onClick={async () => {
                  await fetchOnPremDirect();
                  triggerRefresh();
                }}
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
            servers={onPremServers}
            showViewAllButton={false}
            limit={25}
            isLoading={isRefreshing}
            onRefresh={async () => {
              await fetchOnPremDirect();
              triggerRefresh();
            }}
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
