'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BarChart3, Activity, RotateCw } from 'lucide-react';
import { MetricType, ResourceMetricPoint } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';

interface ResourceOverviewChartProps {
  initialMetric?: MetricType;
  data?: Record<string, ResourceMetricPoint[]>;
}

export function ResourceOverviewChart({
  initialMetric = 'CPU',
  data,
}: ResourceOverviewChartProps) {
  const { cloudProvider, isRefreshing } = useMonitoring();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(initialMetric);
  const [livePoints, setLivePoints] = useState<ResourceMetricPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) return;
    let isMounted = true;

    async function loadTelemetry() {
      try {
        setLoading(true);
        const res = await fetch(`/api/dashboard/metrics?provider=${cloudProvider}`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && isMounted) {
            const mapped: ResourceMetricPoint[] = list.map((item: any) => {
              const date = new Date(item.timestamp || Date.now());
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const metricVal =
                selectedMetric === 'CPU'
                  ? (item.cpu ?? (item.metricName === 'CPU' ? item.value : 0))
                  : selectedMetric === 'Memory'
                  ? (item.memory ?? (item.metricName === 'Memory' ? item.value : 0))
                  : selectedMetric === 'Disk'
                  ? (item.disk ?? (item.metricName === 'Disk' ? item.value : 0))
                  : (item.networkIn ?? 0);

              const num = typeof metricVal === 'number' ? Math.round(metricVal) : 0;
              return {
                time: timeStr,
                aws: item.provider === 'aws' ? num : 0,
                azure: item.provider === 'azure' ? num : 0,
              };
            });
            setLivePoints(mapped);
          }
        }
      } catch (e) {
        console.warn('Real telemetry fetch note:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTelemetry();
    return () => {
      isMounted = false;
    };
  }, [cloudProvider, selectedMetric, isRefreshing, data]);

  const metricTabs: MetricType[] = ['CPU', 'Memory', 'Disk', 'Network'];
  const chartData = data ? (data[selectedMetric] || data['CPU'] || []) : livePoints;

  const showAws = cloudProvider === 'all' || cloudProvider === 'aws';
  const showAzure = cloudProvider === 'all' || cloudProvider === 'azure';

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Header with Title and Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Resource Overview</h3>
            <span className="text-[10px] text-slate-400">
              {cloudProvider === 'aws'
                ? 'AWS CloudWatch Metrics'
                : cloudProvider === 'azure'
                ? 'Azure Monitor Telemetry'
                : 'AWS & Azure Combined Telemetry'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            {showAws && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9900]" />
                <span className="text-slate-300 font-medium">AWS</span>
              </div>
            )}
            {showAzure && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0089D6]" />
                <span className="text-slate-300 font-medium">Azure</span>
              </div>
            )}
          </div>

          {/* Metric Switcher Tabs */}
          <div className="flex items-center p-0.5 bg-[#0D1526] border border-[#1E293B] rounded-lg">
            {metricTabs.map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedMetric === metric
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {metric}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recharts Area/Line Chart */}
      <div className="w-full h-56 min-h-[220px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-2 bg-[#0D1526]/50 rounded-lg border border-[#1E293B]/60">
            <Activity className="w-8 h-8 text-slate-600" />
            <p className="text-xs text-slate-300 font-semibold">No Live Telemetry Collected Yet</p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Synchronize connected AWS or Azure infrastructure to stream real-time {selectedMetric} metrics.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="awsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9900" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FF9900" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="azureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0089D6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0089D6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1E293B"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1E293B' }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#0D1526]/95 border border-[#1E293B] backdrop-blur-md px-3 py-2 rounded-lg shadow-xl text-xs">
                        <p className="text-slate-400 font-semibold mb-1">{label}</p>
                        <div className="space-y-1">
                          {payload
                            .filter((p) => (showAws && p.dataKey === 'aws') || (showAzure && p.dataKey === 'azure'))
                            .map((p, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: p.stroke }}
                                />
                                <span className="text-slate-300">
                                  {p.dataKey === 'aws' ? 'AWS' : 'Azure'}:
                                </span>
                                <span className="font-bold text-white">
                                  {p.value}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showAws && (
                <Area
                  type="monotone"
                  dataKey="aws"
                  stroke="#FF9900"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#awsGradient)"
                  dot={{ r: 4, fill: '#FF9900', strokeWidth: 1, stroke: '#111A2E' }}
                  activeDot={{ r: 6, fill: '#FF9900', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
              {showAzure && (
                <Area
                  type="monotone"
                  dataKey="azure"
                  stroke="#0089D6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#azureGradient)"
                  dot={{ r: 4, fill: '#0089D6', strokeWidth: 1, stroke: '#111A2E' }}
                  activeDot={{ r: 6, fill: '#0089D6', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
