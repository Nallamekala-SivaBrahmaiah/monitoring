'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { mockRecentAlerts } from '@/mock/monitoringData';
import { useMonitoring } from '@/context/MonitoringContext';
import { AlertItem } from '@/types/monitoring';

export default function AlertsPage() {
  const { cloudProvider } = useMonitoring();
  const [alerts, setAlerts] = useState<AlertItem[]>(mockRecentAlerts);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const filteredAlerts = alerts.filter((a) => {
    if (cloudProvider === 'aws' && a.provider !== 'aws') return false;
    if (cloudProvider === 'azure' && a.provider !== 'azure') return false;

    const matchSeverity =
      severityFilter === 'all' ||
      a.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.resourceName.toLowerCase().includes(search.toLowerCase());
    return matchSeverity && matchSearch;
  });

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' } : a))
    );
  };

  const handleResolve = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a))
    );
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        activeAlertsCount={alerts.filter((a) => a.status === 'active').length}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />


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
                <span className="text-white font-medium">Alerts & Incidents</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Active & Historical Alerts
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search alert or resource..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52"
                />
              </div>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                aria-label="Filter alerts by severity"
                className="px-3 py-1.5 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-[#1E293B]">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#162238]/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {alert.severity === 'Critical' && (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      )}
                      {alert.severity === 'Warning' && (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                      {alert.severity === 'Info' && (
                        <Info className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white">
                          {alert.title}
                        </h4>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            alert.severity === 'Critical'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : alert.severity === 'Warning'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            alert.status === 'active'
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                              : alert.status === 'acknowledged'
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                          }`}
                        >
                          {alert.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Resource: <span className="text-slate-200">{alert.resourceName}</span> ({alert.resourceType}) • Triggered: {alert.timestamp} ({alert.timeAgo})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {alert.status === 'active' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-300 rounded border border-[#1E293B]"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status !== 'resolved' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded border border-emerald-500/30"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {filteredAlerts.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No alerts match your current search/filter.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
