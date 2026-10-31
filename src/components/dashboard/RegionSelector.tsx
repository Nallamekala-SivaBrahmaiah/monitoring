'use client';

import React, { useState, useMemo } from 'react';
import { Search, Check, RefreshCw, Globe, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { DiscoveredRegion } from '@/types/monitoring';

interface RegionSelectorProps {
  cloud: 'aws' | 'azure';
  regions: DiscoveredRegion[];
  selectedCodes: string[];
  onChange: (selected: string[]) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  error?: string | null;
}

export function RegionSelector({
  cloud,
  regions,
  selectedCodes,
  onChange,
  isLoading = false,
  onRefresh,
  error = null,
}: RegionSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGeo, setActiveGeo] = useState<string>('all');

  // Filtered regions
  const filteredRegions = useMemo(() => {
    return regions.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.geography.toLowerCase().includes(searchTerm.toLowerCase());

      const matchGeo = activeGeo === 'all' || r.geography === activeGeo;

      return matchSearch && matchGeo;
    });
  }, [regions, searchTerm, activeGeo]);

  // Geographies list
  const geographies = useMemo(() => {
    const set = new Set<string>();
    regions.forEach((r) => set.add(r.geography));
    return Array.from(set);
  }, [regions]);

  const handleSelectAll = () => {
    // Select all visible filtered or all regions
    const allCodes = Array.from(new Set([...selectedCodes, ...filteredRegions.map((r) => r.code)]));
    onChange(allCodes);
  };

  const handleDeselectAll = () => {
    if (activeGeo === 'all' && !searchTerm) {
      onChange([]);
    } else {
      const filteredCodesSet = new Set(filteredRegions.map((r) => r.code));
      onChange(selectedCodes.filter((code) => !filteredCodesSet.has(code)));
    }
  };

  const toggleRegion = (code: string) => {
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter((c) => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };

  const brandColor = cloud === 'aws' ? '#FF9900' : '#0089D6';
  const brandName = cloud === 'aws' ? 'AWS' : 'Azure';

  return (
    <div className="space-y-3 bg-[#0D1526] border border-[#1E293B] rounded-xl p-4 text-xs">
      {/* Header with Title and Counts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E293B] pb-2.5">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: brandColor }} />
          <span className="font-bold text-white text-sm">
            {brandName} Regions
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#18233C] text-slate-300 border border-[#1E293B]">
            {regions.length} available, {selectedCodes.length} selected
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Redundant region discovery"
              className="p-1 rounded bg-[#18233C] hover:bg-[#202E4E] text-slate-300 hover:text-white disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#18233C] hover:bg-[#202E4E] text-slate-200 font-medium transition-colors"
          >
            <CheckSquare className="w-3 h-3 text-emerald-400" />
            <span>Select All</span>
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#18233C] hover:bg-[#202E4E] text-slate-300 font-medium transition-colors"
          >
            <Square className="w-3 h-3 text-slate-400" />
            <span>Deselect All</span>
          </button>
        </div>
      </div>

      {/* Search Input & Geography Filter Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${brandName} regions (e.g. us-east, Virginia, Tokyo, Europe)...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Geography Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveGeo('all')}
            className={`px-2.5 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeGeo === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-[#111A2E] text-slate-400 hover:text-slate-200'
            }`}
          >
            All Geographies ({regions.length})
          </button>
          {geographies.map((geo) => {
            const count = regions.filter((r) => r.geography === geo).length;
            return (
              <button
                key={geo}
                type="button"
                onClick={() => setActiveGeo(geo)}
                className={`px-2.5 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  activeGeo === geo
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#111A2E] text-slate-400 hover:text-slate-200'
                }`}
              >
                {geo} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span>Discovering available {brandName} regions via provider APIs...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Region Discovery Error</div>
            <div className="text-[11px] text-rose-400">{error}</div>
          </div>
        </div>
      )}

      {/* Naturally Expanding Region Cards Grid - No Internal Scrollbar */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredRegions.map((region) => {
            const isSelected = selectedCodes.includes(region.code);

            return (
              <div
                key={region.code}
                onClick={() => toggleRegion(region.code)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                  isSelected
                    ? 'bg-[#13203C] border-blue-500/60 shadow-sm'
                    : 'bg-[#111A2E] border-[#1E293B] hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // handled by parent div click
                  className="mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-white text-xs truncate">
                      {region.code}
                    </span>
                    {region.optInStatus && region.optInStatus !== 'opt-in-not-required' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold flex-shrink-0">
                        Opt-in
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-300 truncate">
                    {region.name}
                  </div>

                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {region.geography}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredRegions.length === 0 && (
            <div className="col-span-full py-6 text-center text-slate-400">
              No regions found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
