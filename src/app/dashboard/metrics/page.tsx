'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { ResourceOverviewChart } from '@/components/dashboard/ResourceOverviewChart';

import { useMonitoring } from '@/context/MonitoringContext';

export default function MetricsPage() {
  const { cloudProvider } = useMonitoring();

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
            <span className="text-white">Metrics Explorer</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" />
            <span>
              {cloudProvider === 'aws'
                ? 'AWS CloudWatch Metrics Explorer'
                : cloudProvider === 'azure'
                ? 'Azure Monitor Telemetry Explorer'
                : 'Cross-Cloud Metrics Explorer'}
            </span>
          </h2>

          <div className="grid grid-cols-1 gap-6">
            <div className="h-96">
              <ResourceOverviewChart initialMetric="CPU" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
