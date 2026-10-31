'use client';

import React from 'react';
import Link from 'next/link';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { AlertSeverity } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';

interface RecentAlertsProps {
  limit?: number;
}

export function RecentAlerts({ limit = 3 }: RecentAlertsProps) {
  const { filteredAlerts } = useMonitoring();
  const displayAlerts = filteredAlerts.slice(0, limit);

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
            Critical
          </span>
        );
      case 'Warning':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Warning
          </span>
        );
      case 'Info':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Info
          </span>
        );
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'Critical':
        return <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />;
      case 'Warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
      case 'Info':
        return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
  };

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400">
            <Bell className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Recent Alerts</h3>
        </div>

        <Link
          href="/dashboard/alerts"
          className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2.5 my-auto">
        {displayAlerts.map((alert) => (
          <Link
            key={alert.id}
            href="/dashboard/alerts"
            className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#0D1526]/80 border border-[#1E293B] hover:border-slate-700/80 transition-colors group block"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {getSeverityIcon(alert.severity)}
              <span className="text-xs font-medium text-slate-200 truncate group-hover:text-white">
                {alert.title}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                {alert.timeAgo}
              </span>
              {getSeverityBadge(alert.severity)}
            </div>
          </Link>
        ))}

        {displayAlerts.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400">
            No active alerts matching current provider.
          </div>
        )}
      </div>
    </div>
  );
}
