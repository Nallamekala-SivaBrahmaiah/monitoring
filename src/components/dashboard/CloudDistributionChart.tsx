'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { CloudDistributionItem } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';

interface CloudDistributionChartProps {
  data?: CloudDistributionItem[];
  totalServers?: number;
}

export function CloudDistributionChart({
  totalServers: propTotalServers,
}: CloudDistributionChartProps) {
  const { cloudProvider, filteredEC2Instances, filteredAzureVMs, customServers } = useMonitoring();

  const awsCount = Math.max(
    filteredEC2Instances.length,
    customServers.filter((s) => s.cloudProvider === 'aws').length
  );
  const azureCount = Math.max(
    filteredAzureVMs.length,
    customServers.filter((s) => (s.cloudProvider || 'azure') === 'azure').length
  );

  const total =
    cloudProvider === 'aws'
      ? awsCount
      : cloudProvider === 'azure'
      ? azureCount
      : awsCount + azureCount;

  const distributionData: CloudDistributionItem[] = [];

  if (cloudProvider === 'all' || cloudProvider === 'aws') {
    const pct = total > 0 ? Math.round((awsCount / total) * 100) : 0;
    distributionData.push({
      name: 'AWS',
      provider: 'aws',
      value: awsCount,
      percentage: pct,
      color: '#FF9900',
    });
  }

  if (cloudProvider === 'all' || cloudProvider === 'azure') {
    const pct = total > 0 ? Math.round((azureCount / total) * 100) : 0;
    distributionData.push({
      name: 'Azure',
      provider: 'azure',
      value: azureCount,
      percentage: pct,
      color: '#0089D6',
    });
  }

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
          <PieIcon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-white">Cloud Distribution</h3>
      </div>

      <div className="flex-1 flex items-center justify-between gap-3 min-h-[190px]">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as CloudDistributionItem;
                    return (
                      <div className="bg-[#0D1526]/95 border border-[#1E293B] backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-lg text-xs">
                        <span className="font-semibold text-white">{item.name}: </span>
                        <span className="text-slate-300">
                          {item.value} ({item.percentage}%)
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={52}
                paddingAngle={distributionData.length > 1 ? 3 : 0}
                dataKey="value"
                stroke="none"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-white tracking-tight leading-none">
              {total}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">
              Total Servers
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-3 pl-3">
          {distributionData.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-200 font-semibold whitespace-nowrap">{item.name}</span>
              </div>
              <div className="text-slate-300 font-semibold shrink-0 text-right whitespace-nowrap">
                <span>{item.value}</span>{' '}
                <span className="text-slate-400 font-normal text-[11px]">
                  ({item.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
