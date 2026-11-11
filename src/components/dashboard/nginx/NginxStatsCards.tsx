'use client';

import React from 'react';
import {
  Server,
  PlayCircle,
  StopCircle,
  Layers,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from 'lucide-react';

interface NginxStatsCardsProps {
  stats: {
    totalServers: number;
    nginxInstalled: number;
    nginxRunning: number;
    nginxStopped: number;
    totalPM2Apps: number;
    runningPM2Apps: number;
    failedPM2Apps: number;
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    lastDeploymentDisplay: string;
  };
  loading?: boolean;
}

export function NginxStatsCards({ stats, loading }: NginxStatsCardsProps) {
  const cards = [
    {
      title: 'Registered Servers',
      value: stats.totalServers,
      subtext: `${stats.totalServers} Cloud Nodes`,
      icon: Server,
      color: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      title: 'Nginx Daemon',
      value: stats.nginxRunning > 0 ? 'Running' : stats.nginxStopped > 0 ? 'Stopped' : stats.nginxInstalled > 0 ? 'Ready' : 'Not Installed',
      subtext: stats.nginxRunning > 0 ? `${stats.nginxRunning} Active Service(s)` : stats.nginxInstalled > 0 ? 'Service Inactive' : 'Install Required',
      icon: stats.nginxRunning > 0 ? PlayCircle : StopCircle,
      color: stats.nginxRunning > 0 ? 'from-emerald-500 to-green-600' : 'from-amber-500 to-orange-600',
      iconBg: stats.nginxRunning > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      title: 'PM2 Applications',
      value: stats.totalPM2Apps,
      subtext: `${stats.runningPM2Apps} Online Processes`,
      icon: Layers,
      color: 'from-purple-500 to-pink-600',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    {
      title: 'Deployments',
      value: stats.totalDeployments,
      subtext: `${stats.successfulDeployments} Successful`,
      icon: Rocket,
      color: 'from-cyan-500 to-blue-600',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
    {
      title: 'Health Status',
      value: stats.failedPM2Apps === 0 ? 'Healthy' : `${stats.failedPM2Apps} Errored`,
      subtext: stats.lastDeploymentDisplay ? `Last Deploy: ${stats.lastDeploymentDisplay}` : 'No Failures',
      icon: stats.failedPM2Apps === 0 ? CheckCircle2 : AlertTriangle,
      color: stats.failedPM2Apps === 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600',
      iconBg: stats.failedPM2Apps === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card, i) => {
        const Icon = card.icon;

        return (
          <div
            key={i}
            className="relative bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-slate-700 transition overflow-hidden group"
          >
            {/* Ambient subtle glow */}
            <div
              className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.color} opacity-5 blur-2xl group-hover:opacity-10 transition`}
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400 truncate block">
                {card.title}
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${card.iconBg}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2.5">
              <span className="text-xl font-bold text-white tracking-tight block">
                {loading ? '...' : card.value}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate font-medium">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
