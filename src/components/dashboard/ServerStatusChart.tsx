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
  const { cloudProvider, filteredEC2Instances, filteredAzureVMs } = useMonitoring();

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

  const actualTotal = healthy + warning + critical;
  const total = actualTotal > 0 ? actualTotal : 1;
  const healthyPct = actualTotal > 0 ? Math.round((healthy / total) * 100) : 0;

  const statusData: ServerStatusItem[] = [
    { status: 'Healthy', count: healthy, percentage: healthyPct, color: '#10B981' },
    { status: 'Warning', count: warning, percentage: actualTotal > 0 ? Math.round((warning / total) * 100) : 0, color: '#F59E0B' },
    { status: 'Critical', count: critical, percentage: actualTotal > 0 ? Math.round((critical / total) * 100) : 0, color: '#EF4444' },
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
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
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
                innerRadius={42}
                outerRadius={58}
                paddingAngle={3}
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

        <div className="flex-1 flex flex-col justify-center space-y-3.5 min-w-0 pr-1">
          {statusData.map((item) => (
            <div key={item.status} className="flex items-center justify-between gap-2 text-xs whitespace-nowrap">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-300 font-medium truncate">{item.status}</span>
              </div>
              <span className="text-slate-200 font-semibold tabular-nums shrink-0">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
