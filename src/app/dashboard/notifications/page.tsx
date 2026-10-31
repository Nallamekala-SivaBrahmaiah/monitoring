'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BellRing, Plus, CheckCircle2 } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

export default function NotificationsPage() {
  const channels = [
    {
      name: 'Slack #cloud-alerts-prod',
      type: 'Slack Webhook',
      status: 'Active',
      events: 'Critical & Warning',
    },
    {
      name: 'PagerDuty On-Call Escalation',
      type: 'PagerDuty Integration',
      status: 'Active',
      events: 'Critical Only',
    },
    {
      name: 'DevOps Email Group (alerts@company.com)',
      type: 'Amazon SES Email',
      status: 'Active',
      events: 'All Severities',
    },
  ];

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
            <span className="text-white">Notification Channels</span>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BellRing className="w-5 h-5 text-purple-400" />
              <span>Notification & Pager Channels</span>
            </h2>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Channel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {channels.map((ch) => (
              <div
                key={ch.name}
                className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{ch.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {ch.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>Type: <span className="text-slate-300 font-medium">{ch.type}</span></div>
                  <div>Triggers: <span className="text-slate-300 font-medium">{ch.events}</span></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
