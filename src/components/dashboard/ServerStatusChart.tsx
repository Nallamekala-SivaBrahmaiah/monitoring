'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Zap } from 'lucide-react';
import { ServerStatusItem } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';

interface ServerStatusChartProps {
  data?: ServerStatusItem[];
  healthyPercentage?: number;
}

export function ServerStatusChart({}: ServerStatusChartProps) {
  const { cloudProvider, filteredEC2Instances, filteredAzureVMs, customServers } = useMonitoring();

  let healthy = 0;
  let warning = 0;
  let critical = 0;

  if (cloudProvider === 'all' || cloudProvider === 'aws') {
    filteredEC2Instances.forEach((i) => {
      if (i.status !== 'Running') critical++;
      else if (i.cpuUsage > 70 || i.memoryUsage > 70) warning++;
      else healthy++;
    });
  }

  if (cloudProvider === 'all' || cloudProvider === 'azure') {
    filteredAzureVMs.forEach((v) => {
      const isRunning = (v.powerState || '').toLowerCase().includes('run');
      const cpu = v.cpuUsage ?? (v as any).cpuUtilization ?? 0;
      const mem = v.memoryUsage ?? (v as any).memoryUtilization ?? 0;
      if (!isRunning) critical++;
      else if (cpu > 80 || mem > 85) warning++;
      else healthy++;
    });
  }

  // Account for custom servers if not already counted in cloud lists
  if (customServers.length > 0) {
    const cloudCount = (cloudProvider === 'aws' ? filteredEC2Instances.length : cloudProvider === 'azure' ? filteredAzureVMs.length : (filteredEC2Instances.length + filteredAzureVMs.length));
    if (cloudCount === 0) {
      customServers.forEach((s) => {
        if (cloudProvider === 'aws' && s.cloudProvider !== 'aws') return;
        if (cloudProvider === 'azure' && s.cloudProvider && s.cloudProvider !== 'azure') return;
        const isOnline = s.status === 'Online' || (s.status || '').toLowerCase().includes('run');
        const cpu = s.metrics?.cpu?.usagePercent ?? 0;
        const mem = s.metrics?.memory?.usagePercent ?? 0;
        if (!isOnline) critical++;
        else if (cpu > 80 || mem > 85) warning++;
        else healthy++;
      });
    }
  }

  const actualTotal = healthy + warning + critical;
  const total = actualTotal > 0 ? actualTotal : 1;
  const healthyPct = actualTotal > 0 ? Math.round((healthy / total) * 100) : 100;

  const statusData: ServerStatusItem[] = [
    { status: 'Healthy', count: healthy, percentage: healthyPct, color: '#10B981' },
    {
      status: 'Warning',
      count: warning,
      percentage: actualTotal > 0 ? Math.round((warning / total) * 100) : 0,
      color: '#F59E0B',
    },
    {
      status: 'Critical',
      count: critical,
      percentage: actualTotal > 0 ? Math.round((critical / total) * 100) : 0,
      color: '#EF4444',
    },
  ];

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
          <Zap className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-white">Server Status</h3>
      </div>

      <div className="flex-1 flex items-center justify-between gap-3 min-h-[190px]">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as ServerStatusItem;
                    return (
                      <div className="bg-[#0D1526]/95 border border-[#1E293B] backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-lg text-xs">
                        <span className="font-semibold text-white">{item.status}: </span>
                        <span className="text-slate-300">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={52}
                paddingAngle={actualTotal > 0 ? 3 : 0}
                dataKey="count"
                stroke="none"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`server-status-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-white tracking-tight leading-none">
              {healthyPct}%
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">
              Healthy
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-3 min-w-0 pl-2">
          {statusData.map((item) => (
            <div key={item.status} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-300 font-medium whitespace-nowrap">{item.status}</span>
              </div>
              <span className="text-slate-200 font-semibold tabular-nums shrink-0 ml-2">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
