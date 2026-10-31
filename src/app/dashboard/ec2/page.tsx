'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Cpu } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { EC2InstancesTable } from '@/components/dashboard/EC2InstancesTable';
import { useMonitoring } from '@/context/MonitoringContext';

export default function EC2InstancesPage() {
  const { cloudProvider, setCloudProvider, filteredEC2Instances, triggerRefresh, isRefreshing } = useMonitoring();

  const runningCount = filteredEC2Instances.filter((i) => i.status === 'Running').length;
  const stoppedCount = filteredEC2Instances.filter((i) => i.status === 'Stopped').length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
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
                <span className="text-white font-medium">EC2 Instances</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <Cpu className="w-6 h-6 text-[#FF9900]" />
                <span>AWS EC2 Elastic Compute Cloud</span>
              </h2>
            </div>

            {cloudProvider !== 'azure' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs bg-[#111A2E] border border-[#1E293B] px-3 py-1.5 rounded-lg">
                  <span className="text-emerald-400 font-bold">{runningCount}</span>
                  <span className="text-slate-400">Running</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400 font-bold">{stoppedCount}</span>
                  <span className="text-slate-400">Stopped</span>
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

          {cloudProvider === 'azure' ? (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-8 text-center space-y-3">
              <Cpu className="w-10 h-10 mx-auto text-slate-500" />
              <h3 className="text-base font-bold text-white">
                Azure Cloud View Active
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                EC2 Instances belong to AWS. When Azure is selected, AWS resources are isolated and hidden. Switch to AWS or All Clouds to view your EC2 instances.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setCloudProvider('aws')}
                  className="px-3 py-1.5 bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30 rounded-lg text-xs font-semibold hover:bg-[#FF9900]/30 transition-colors"
                >
                  Switch to AWS View
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
            <EC2InstancesTable
              instances={filteredEC2Instances}
              showViewAllButton={false}
              limit={10}
            />
          )}
        </main>
      </div>
    </div>
  );
}
