'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Shield, Sliders } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

export default function SettingsPage() {
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
            <span className="text-white">Settings</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            <span>Platform Configuration & Preferences</span>
          </h2>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-6 max-w-2xl space-y-5 text-xs">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Data Collection Interval
              </h3>
              <p className="text-slate-400 mb-3">
                Frequency at which telemetry metrics are sampled from AWS CloudWatch and Azure Monitor.
              </p>
              <select aria-label="Metrics sampling interval" className="px-3 py-1.5 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200">
                <option>Every 60 seconds (High Resolution)</option>
                <option>Every 5 minutes</option>
                <option>Every 15 minutes</option>
              </select>
            </div>

            <div className="pt-4 border-t border-[#1E293B]">
              <h3 className="text-sm font-semibold text-white mb-1">
                API Base URL
              </h3>
              <p className="text-slate-400 mb-3">
                Node.js Backend endpoint URL for live telemetry ingestion.
              </p>
              <input
                type="text"
                defaultValue="http://localhost:5000"
                className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
