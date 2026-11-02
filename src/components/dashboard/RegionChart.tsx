'use client';

import React, { useMemo } from 'react';
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
  const {
    cloudProvider,
    regions,
    filteredAzureVMs,
    filteredEC2Instances,
    customServers,
  } = useMonitoring();

  // Compile real active regional distribution from all live resources
  const filteredRegions = useMemo(() => {
    const regionMap = new Map<
      string,
      { region: string; displayName: string; count: number; color: string; cloud: string }
    >();

    // 1. Pull from regions in context
    for (const r of regions) {
      if (r.resourceCount > 0) {
        if (cloudProvider === 'aws' && r.cloud !== 'aws') continue;
        if (cloudProvider === 'azure' && r.cloud !== 'azure') continue;

        regionMap.set(r.region.toLowerCase(), {
          region: r.region,
          displayName: r.displayName,
          count: r.resourceCount,
          color: r.color || (r.cloud === 'azure' ? '#0089D6' : '#F97316'),
          cloud: r.cloud,
        });
      }
    }

    // 2. Ensure all active Azure VMs are represented
    if (cloudProvider === 'all' || cloudProvider === 'azure') {
      for (const v of filteredAzureVMs) {
        const rawReg = (v.region || (v as any).location || 'austriaeast').toLowerCase().trim();
        const key = rawReg;
        const displayName =
          rawReg === 'austriaeast'
            ? 'Austria East'
            : rawReg === 'eastus'
            ? 'East US'
            : rawReg === 'westeurope'
            ? 'West Europe'
            : rawReg.toUpperCase();

        if (regionMap.has(key)) {
          // Increment or ensure count
          const entry = regionMap.get(key)!;
          if (entry.count < filteredAzureVMs.length) {
            entry.count = filteredAzureVMs.length;
          }
        } else {
          regionMap.set(key, {
            region: rawReg,
            displayName,
            count: 1,
            color: '#0089D6',
            cloud: 'azure',
          });
        }
      }
    }

    // 3. Ensure custom servers (e.g. vm01, vm02) regions are counted if not in cloud SDK
    for (const s of customServers) {
      const provider = s.cloudProvider || 'azure';
      if (cloudProvider === 'aws' && provider !== 'aws') continue;
      if (cloudProvider === 'azure' && provider !== 'azure') continue;

      const rawReg = (s.region || (provider === 'azure' ? 'austriaeast' : 'us-east-1'))
        .toLowerCase()
        .trim();
      const key = rawReg;
      const displayName =
        rawReg === 'austriaeast'
          ? 'Austria East'
          : rawReg === 'eastus'
          ? 'East US'
          : rawReg === 'westeurope'
          ? 'West Europe'
          : rawReg.toUpperCase();

      if (regionMap.has(key)) {
        const entry = regionMap.get(key)!;
        if (entry.count < customServers.length) {
          entry.count = customServers.length;
        }
      } else {
        regionMap.set(key, {
          region: rawReg,
          displayName,
          count: customServers.length || 1,
          color: provider === 'aws' ? '#F97316' : '#0089D6',
          cloud: provider,
        });
      }
    }

    // 4. Ensure active AWS EC2 instances are represented
    if (cloudProvider === 'all' || cloudProvider === 'aws') {
      for (const e of filteredEC2Instances) {
        const rawReg = (e.region || 'us-east-1').toLowerCase().trim();
        const key = rawReg;
        if (regionMap.has(key)) {
          const entry = regionMap.get(key)!;
          entry.count += 1;
        } else {
          regionMap.set(key, {
            region: rawReg,
            displayName: rawReg,
            count: 1,
            color: '#F97316',
            cloud: 'aws',
          });
        }
      }
    }

    return Array.from(regionMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [regions, filteredAzureVMs, filteredEC2Instances, customServers, cloudProvider]);

  const maxVal = Math.max(3, ...filteredRegions.map((r) => r.count));
  const totalInstances = filteredRegions.reduce((sum, r) => sum + r.count, 0);

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

        {totalInstances > 0 && (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            {totalInstances} {totalInstances === 1 ? 'Active Instance' : 'Active Instances'}
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
