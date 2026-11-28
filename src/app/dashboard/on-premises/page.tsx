'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Server,
  Shield,
  Key,
  Plus,
  CheckCircle2,
  Filter,
  Check,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { OnPremisesServersTable } from '@/components/dashboard/OnPremisesServersTable';
import { OnPremisesAccountModal } from '@/components/dashboard/OnPremisesAccountModal';
import { useMonitoring } from '@/context/MonitoringContext';

export default function OnPremisesPage() {
  const { customServers, triggerRefresh, isRefreshing } = useMonitoring();
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [directServers, setDirectServers] = useState<any[]>([]);

  // Multi-server selection state ("only select chesinavi a chupiyali")
  const [selectedServerIds, setSelectedServerIds] = useState<Set<string>>(new Set());
  const [isInitializedSelection, setIsInitializedSelection] = useState<boolean>(false);

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
  for (const s of customServers || []) {
    const key = (s._id || s.id || s.host || '').toString();
    if (key) mergedMap.set(key, s);
  }
  for (const s of directServers) {
    const key = (s._id || s.id || s.host || '').toString();
    if (key) mergedMap.set(key, s);
  }
  const allAvailable = mergedMap.size > 0 ? Array.from(mergedMap.values()) : directServers;

  // STRICT FILTER: Display dedicated on-premises & custom integrated servers
  const onPremServers = useMemo(() => {
    return allAvailable.filter((s: any) => {
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
      if (
        resId.startsWith('i-') ||
        resId.includes('/subscriptions/') ||
        resId.includes('/resourcegroups/')
      )
        return false;

      return prov === 'other' || !prov;
    });
  }, [allAvailable]);

  // Initialize selection with all available servers once loaded
  useEffect(() => {
    if (!isInitializedSelection && onPremServers.length > 0) {
      setSelectedServerIds(
        new Set(onPremServers.map((s) => (s._id || s.id || s.host).toString()))
      );
      setIsInitializedSelection(true);
    }
  }, [onPremServers, isInitializedSelection]);

  // Filtered displayed servers based on user selection
  const displayedServers = useMemo(() => {
    if (selectedServerIds.size === 0) return [];
    return onPremServers.filter((s: any) =>
      selectedServerIds.has((s._id || s.id || s.host).toString())
    );
  }, [onPremServers, selectedServerIds]);

  const onlineCount = displayedServers.filter((s: any) => {
    const st = (s.status || '').toLowerCase();
    return st === 'online' || st === 'running' || Boolean(s.isSSHConnected && st !== 'offline');
  }).length;

  const offlineCount = displayedServers.length - onlineCount;

  const handleServerAdded = async (name: string) => {
    setToastMessage(`On-Premises Server "${name}" successfully integrated! Telemetry and power control active.`);
    await fetchOnPremDirect();
    triggerRefresh();
    // Also add to active selection
    setIsInitializedSelection(false);
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
                <RefreshCw
                  className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* On-Premises Account & Credential Integration Card (matching Cloud Accounts experience) */}
          <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">
                      On-Premises Infrastructure &amp; Account Integration
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Integration
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect datacenter hosts with SSH credentials, port management, and power controls
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect On-Premises Host</span>
                </button>
              </div>
            </div>

            {/* Server Multi-Selection Filter Bar ("only select chesinavi a chupiyali remaing maniki vadhu") */}
            {onPremServers.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mr-1">
                    <Filter className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Monitored Server Selection:</span>
                  </span>

                  {/* Select All Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedServerIds.size === onPremServers.length) {
                        setSelectedServerIds(new Set());
                      } else {
                        setSelectedServerIds(
                          new Set(onPremServers.map((s) => (s._id || s.id || s.host).toString()))
                        );
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      selectedServerIds.size === onPremServers.length
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#111A2E] text-slate-400 hover:text-white border border-[#1E293B]'
                    }`}
                  >
                    All ({onPremServers.length})
                  </button>

                  {/* Individual Server Filter Pills */}
                  {onPremServers.map((srv) => {
                    const sId = (srv._id || srv.id || srv.host).toString();
                    const isChecked = selectedServerIds.has(sId);
                    return (
                      <button
                        key={sId}
                        type="button"
                        onClick={() => {
                          const next = new Set(selectedServerIds);
                          if (isChecked) {
                            next.delete(sId);
                          } else {
                            next.add(sId);
                          }
                          setSelectedServerIds(next);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-all border cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold shadow-sm'
                            : 'bg-[#111A2E]/60 border-[#1E293B] text-slate-500 hover:text-slate-300 opacity-60'
                        }`}
                        title={isChecked ? 'Server visible in table (Click to hide)' : 'Server hidden (Click to display)'}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isChecked ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                        />
                        <span>{srv.name || srv.host}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ({srv.host})
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-400 font-mono shrink-0">
                  Showing <span className="text-emerald-400 font-bold">{displayedServers.length}</span> of {onPremServers.length} servers
                </div>
              </div>
            )}
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
          {displayedServers.length === 0 && onPremServers.length > 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3 bg-[#0D1526] border border-[#1E293B] rounded-2xl">
              <Server className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No Servers Selected</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All servers are currently unselected. Click &quot;All&quot; or check any server pill above to display it in the monitoring table.
              </p>
              <button
                type="button"
                onClick={() =>
                  setSelectedServerIds(
                    new Set(onPremServers.map((s) => (s._id || s.id || s.host).toString()))
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
              >
                <span>Select All ({onPremServers.length}) Servers</span>
              </button>
            </div>
          ) : (
            <OnPremisesServersTable
              servers={displayedServers}
              showViewAllButton={false}
              limit={25}
              isLoading={isRefreshing}
              onRefresh={async () => {
                await fetchOnPremDirect();
                triggerRefresh();
              }}
              onAddClick={() => setShowAccountModal(true)}
            />
          )}
        </main>
      </div>

      {/* On-Premises Account & Server Credential Integration Modal */}
      <OnPremisesAccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSuccess={handleServerAdded}
      />
    </div>
  );
}
