'use client';

import React from 'react';
import { ModuleCustomizeButton } from '@/components/dashboard/style-studio/ModuleCustomizeButton';

interface MetricCardProps {
  title: string;
  count: number | string;
  changeText: string;
  icon: React.ReactNode;
  trendData: number[];
  color: string;
  isNegative?: boolean;
  moduleId?: string;
}

export function MetricCard({
  title,
  count,
  changeText,
  icon,
  trendData,
  color,
  isNegative = false,
  moduleId,
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
    <div
      data-module-id={moduleId}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0E172C]/95 via-[#0A1122]/95 to-[#070D1B]/95 backdrop-blur-xl border border-slate-700/50 hover:border-cyan-400/60 p-4 transition-all duration-300 shadow-xl hover:shadow-[0_0_25px_rgba(6,182,212,0.18)] flex flex-col justify-between group/card h-full w-full min-h-[118px]"
    >
      {/* Specular Top Rim Light */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />

      {/* Ambient Corner Radial Glow */}
      <div
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-15 group-hover/card:opacity-35 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2 module-header relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 flex items-center justify-center module-icon p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 group-hover/card:border-cyan-500/40 transition-colors shadow-sm">
            {icon}
          </div>
          <span className="text-xs font-semibold text-slate-300 group-hover/card:text-white transition-colors truncate module-heading">
            {title}
          </span>
        </div>
        {moduleId && (
          <div className="shrink-0 opacity-80 group-hover/card:opacity-100 transition-opacity">
            <ModuleCustomizeButton
              moduleId={moduleId}
              moduleName={title}
              variant="icon"
              title={`Customize ${title} Style, 3D & Layers`}
            />
          </div>
        )}
      </div>

      {/* Main Metric & Trend Sparkline */}
      <div className="flex items-end justify-between mt-1 relative z-10">
        <div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tight leading-none mb-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {count}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                isNegative
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <span>{isNegative ? '↓' : '↑'}</span>
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
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_6px_currentColor]"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
