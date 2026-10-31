'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AppWindow } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { AzureVMsTable } from '@/components/dashboard/AzureVMsTable';
import { useMonitoring } from '@/context/MonitoringContext';

export default function AzureVMsPage() {
  const { cloudProvider, setCloudProvider, filteredAzureVMs, triggerRefresh, isRefreshing } = useMonitoring();

  const runningCount = filteredAzureVMs.filter((v) => v.powerState === 'Running').length;
  const stoppedCount = filteredAzureVMs.filter((v) => v.powerState !== 'Running').length;

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
                <span className="text-white">Azure Virtual Machines</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <AppWindow className="w-6 h-6 text-[#0089D6]" />
                <span>Azure Virtual Machines (Compute VMs)</span>
              </h2>
            </div>

            {cloudProvider !== 'aws' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs bg-[#111A2E] border border-[#1E293B] px-3 py-1.5 rounded-lg">
                  <span className="text-emerald-400 font-bold">{runningCount}</span>
                  <span className="text-slate-400">Running</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400 font-bold">{stoppedCount}</span>
                  <span className="text-slate-400">Deallocated</span>
                </div>

                <button
                  onClick={triggerRefresh}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              </div>
            )}
          </div>

          {cloudProvider === 'aws' ? (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-8 text-center space-y-3">
              <AppWindow className="w-10 h-10 mx-auto text-slate-500" />
              <h3 className="text-base font-bold text-white">
                AWS Cloud View Active
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Azure Virtual Machines belong to Microsoft Azure. When AWS is selected, Azure resources are isolated and hidden. Switch to Azure or All Clouds to view your Azure VMs.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setCloudProvider('azure')}
                  className="px-3 py-1.5 bg-[#0089D6]/20 text-[#5EA0EF] border border-[#0089D6]/30 rounded-lg text-xs font-semibold hover:bg-[#0089D6]/30 transition-colors"
                >
                  Switch to Azure View
                </button>
                <button
                  onClick={() => setCloudProvider('all')}
                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-600/30 transition-colors"
                >
                  View All Clouds
                </button>
              </div>
            </div>
          ) : (
            <AzureVMsTable
              vms={filteredAzureVMs}
              showViewAllButton={false}
              limit={10}
            />
          )}
        </main>
      </div>
    </div>
  );
}
