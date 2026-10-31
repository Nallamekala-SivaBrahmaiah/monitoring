'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Server } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { EC2InstancesTable } from '@/components/dashboard/EC2InstancesTable';
import { AzureVMsTable } from '@/components/dashboard/AzureVMsTable';
import { ServerStatusChart } from '@/components/dashboard/ServerStatusChart';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

export default function ServersPage() {
  const { cloudProvider, filteredEC2Instances, filteredAzureVMs } = useMonitoring();
  const [activeTab, setActiveTab] = useState<'all' | 'aws' | 'azure'>('all');

  const totalServers = filteredEC2Instances.length + filteredAzureVMs.length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/" className="hover:text-blue-400 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-white">Servers</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            <span>
              {cloudProvider === 'aws'
                ? `AWS EC2 Servers (${totalServers} Instances)`
                : cloudProvider === 'azure'
                ? `Azure Virtual Machines (${totalServers} VMs)`
                : `Server Monitoring (${totalServers} Total Compute Nodes)`}
            </span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-1">
              <ServerStatusChart />
            </div>

            <div className="lg:col-span-2 space-y-4">
              {cloudProvider === 'all' && (
                <div className="flex items-center gap-2 p-1 bg-[#111A2E] border border-[#1E293B] rounded-lg w-fit">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeTab === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Servers ({totalServers})
                  </button>
                  <button
                    onClick={() => setActiveTab('aws')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeTab === 'aws'
                        ? 'bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AwsLogo className="w-4 h-3" />
                    <span>AWS EC2 ({filteredEC2Instances.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('azure')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeTab === 'azure'
                        ? 'bg-[#0089D6]/20 text-[#5EA0EF] border border-[#0089D6]/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AzureLogo className="w-3.5 h-3.5" />
                    <span>Azure VMs ({filteredAzureVMs.length})</span>
                  </button>
                </div>
              )}

              {/* AWS EC2 Table: Only when AWS is selected or when All Clouds with AWS tab */}
              {((cloudProvider === 'aws') || (cloudProvider === 'all' && (activeTab === 'all' || activeTab === 'aws'))) && (
                <EC2InstancesTable
                  instances={filteredEC2Instances}
                  showViewAllButton={true}
                  limit={5}
                />
              )}

              {/* Azure VMs Table: Only when Azure is selected or when All Clouds with Azure tab */}
              {((cloudProvider === 'azure') || (cloudProvider === 'all' && (activeTab === 'all' || activeTab === 'azure'))) && (
                <AzureVMsTable
                  vms={filteredAzureVMs}
                  showViewAllButton={true}
                  limit={5}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
