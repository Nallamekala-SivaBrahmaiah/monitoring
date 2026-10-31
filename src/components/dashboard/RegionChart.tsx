'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { MapPin, Globe } from 'lucide-react';
import { RegionDistributionItem } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';

interface RegionChartProps {
  data?: RegionDistributionItem[];
}

export function RegionChart({}: RegionChartProps) {
  const { cloudProvider, regions } = useMonitoring();

  const filteredRegions = regions
    .filter((r) => {
      if (cloudProvider === 'aws') return r.cloud === 'aws' && r.resourceCount > 0;
      if (cloudProvider === 'azure') return r.cloud === 'azure' && r.resourceCount > 0;
      return r.resourceCount > 0;
    })
    .sort((a, b) => b.resourceCount - a.resourceCount)
    .slice(0, 6)
    .map((r) => ({
      region: r.region,
      displayName: r.displayName,
      count: r.resourceCount,
      color: r.color || (r.cloud === 'azure' ? '#0089D6' : '#F97316'),
      cloud: r.cloud,
    }));

  const maxVal = Math.max(3, ...filteredRegions.map((r) => r.count));

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Top Regions</h3>
            <span className="text-[11px] text-slate-400">
              Active infrastructure distribution by cloud region
            </span>
          </div>
        </div>

        {filteredRegions.length > 0 && (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            {filteredRegions.reduce((sum, r) => sum + r.count, 0)} Active Instances
          </span>
        )}
      </div>

      <div className="w-full h-44 mt-2">
        {filteredRegions.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredRegions}
              margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1E293B"
                vertical={false}
              />
              <XAxis
                dataKey="region"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1E293B' }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                domain={[0, maxVal]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as any;
                    return (
                      <div className="bg-[#0D1526]/95 border border-[#1E293B] backdrop-blur-md px-3 py-2 rounded-lg shadow-xl text-xs">
                        <div className="font-semibold text-white font-mono">{item.region}</div>
                        <div className="text-slate-400 text-[11px]">{item.displayName}</div>
                        <div className="text-emerald-400 font-semibold mt-1">
                          {item.count} {item.count === 1 ? 'Resource' : 'Resources'} ({item.cloud?.toUpperCase()})
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
                {filteredRegions.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#1E293B] rounded-lg">
            <Globe className="w-8 h-8 text-slate-500 mb-2" />
            <p className="text-xs font-semibold text-slate-300">No active instances in monitored regions</p>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
              When virtual machines or instances are active in any region, they will automatically appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
