'use client';

import React from 'react';

interface MetricCardProps {
  title: string;
  count: number | string;
  changeText: string;
  icon: React.ReactNode;
  trendData: number[];
  color: string;
  isNegative?: boolean;
}

export function MetricCard({
  title,
  count,
  changeText,
  icon,
  trendData,
  color,
  isNegative = false,
}: MetricCardProps) {
  // Generate an SVG path for the mini sparkline
  const min = Math.min(...trendData);
  const max = Math.max(...trendData);
  const range = max - min === 0 ? 1 : max - min;
  const width = 80;
  const height = 30;

  const points = trendData.map((val, idx) => {
    const x = (idx / (trendData.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] hover:border-slate-700/80 rounded-xl p-4 transition-all duration-200 shadow-sm flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex-shrink-0 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-400 truncate">
          {title}
        </span>
      </div>

      {/* Main Metric & Trend Sparkline */}
      <div className="flex items-end justify-between mt-1">
        <div>
          <div className="text-2xl font-bold text-white tracking-tight leading-none mb-1.5">
            {count}
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                isNegative ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              <span>↑</span>
              <span>{changeText}</span>
            </span>
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="w-20 h-8 flex items-center justify-end">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
          >
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
