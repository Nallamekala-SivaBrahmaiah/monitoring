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
import { MapPin } from 'lucide-react';
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
    .slice(0, 6)
    .map((r) => ({
      region: r.region,
      count: r.resourceCount,
      color: r.color,
      cloud: r.cloud,
    }));

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-400">
          <MapPin className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-white">Top Regions</h3>
      </div>

      <div className="w-full h-44 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredRegions}
            margin={{ top: 12, right: 10, left: -25, bottom: 0 }}
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
              domain={[0, 15]}
              ticks={[0, 5, 10, 15]}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as RegionDistributionItem;
                  return (
                    <div className="bg-[#0D1526]/95 border border-[#1E293B] backdrop-blur-md px-3 py-1.5 rounded-lg shadow-xl text-xs">
                      <div className="font-semibold text-white">{item.region}</div>
                      <div className="text-slate-300">
                        {item.count} Resources ({item.cloud.toUpperCase()})
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
      </div>
    </div>
  );
}
