'use client';

import React, { useState } from 'react';
import { Clock, Check, Sparkles, AlertCircle, Save } from 'lucide-react';

interface ClockTimeSelectorProps {
  initialTime?: string;
  onTimeChange?: (time: string) => void;
  onSave?: (time: string) => Promise<void>;
  title?: string;
  subtitle?: string;
}

export function ClockTimeSelector({
  initialTime = '18:30',
  onTimeChange,
  onSave,
  title = 'Scheduled Report Dispatch Time',
  subtitle = 'Set the exact daily time for compiling and sending work reports (Asia/Kolkata IST)',
}: ClockTimeSelectorProps) {
  const [hour, setHour] = useState<string>(() => {
    const parts = (initialTime || '18:30').split(':');
    return parts[0] || '18';
  });

  const [minute, setMinute] = useState<string>(() => {
    const parts = (initialTime || '18:30').split(':');
    return parts[1] || '30';
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentTimeStr = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  const handleHourChange = (newHour: string) => {
    setHour(newHour);
    const updated = `${newHour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    onTimeChange?.(updated);
    setSaveSuccess(false);
  };

  const handleMinuteChange = (newMin: string) => {
    setMinute(newMin);
    const updated = `${hour.padStart(2, '0')}:${newMin.padStart(2, '0')}`;
    onTimeChange?.(updated);
    setSaveSuccess(false);
  };

  const handlePreset = (presetTime: string) => {
    const [h, m] = presetTime.split(':');
    setHour(h);
    setMinute(m);
    onTimeChange?.(presetTime);
    setSaveSuccess(false);
  };

  const handleSaveTime = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(currentTimeStr);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save time:', e);
    } finally {
      setSaving(false);
    }
  };

  // Convert to 12-hour display format for convenience
  const hourNum = parseInt(hour, 10);
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  const time12Formatted = `${hour12}:${minute.padStart(2, '0')} ${period}`;

  const presets = [
    { label: '09:30 AM (Work Start)', value: '09:30' },
    { label: '01:00 PM (Midday Sync)', value: '13:00' },
    { label: '05:30 PM (Evening Prep)', value: '17:30' },
    { label: '06:30 PM (Default EOD)', value: '18:30' },
    { label: '07:00 PM (Shift Close)', value: '19:00' },
    { label: '08:00 PM (Night Audit)', value: '20:00' },
  ];

  return (
    <div className="bg-[#0D1526]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/15 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {title}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Asia/Kolkata (IST)
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {onSave && (
          <button
            type="button"
            onClick={handleSaveTime}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg ${
              saveSuccess
                ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved & Scheduled!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Set Scheduled Time'}</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Interactive Digital Clock Face */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-[#080D1A]/90 rounded-2xl border border-cyan-500/20 shadow-inner">
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Selected Dispatch Time
          </span>

          <div className="flex items-center gap-2 font-mono text-5xl font-black text-white tracking-wider my-2">
            <div className="flex flex-col items-center">
              <span className="bg-[#131D35] px-4 py-3 rounded-2xl border border-cyan-500/40 text-cyan-300 shadow-lg shadow-cyan-500/10">
                {hour.padStart(2, '0')}
              </span>
              <span className="text-[10px] text-gray-500 mt-1 uppercase font-sans">Hour (24h)</span>
            </div>

            <span className="text-cyan-400 animate-pulse -mt-4">:</span>

            <div className="flex flex-col items-center">
              <span className="bg-[#131D35] px-4 py-3 rounded-2xl border border-cyan-500/40 text-cyan-300 shadow-lg shadow-cyan-500/10">
                {minute.padStart(2, '0')}
              </span>
              <span className="text-[10px] text-gray-500 mt-1 uppercase font-sans">Minute</span>
            </div>

            <div className="flex flex-col items-center ml-2">
              <span className="bg-gradient-to-br from-purple-500/20 to-blue-600/30 text-purple-300 border border-purple-500/40 px-3 py-3 rounded-2xl text-2xl font-bold">
                {period}
              </span>
              <span className="text-[10px] text-purple-400/80 mt-1 uppercase font-sans">Format</span>
            </div>
          </div>

          <div className="text-xs text-cyan-300/80 font-mono mt-3 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            {time12Formatted} IST (Daily Automation)
          </div>
        </div>

        {/* Hour & Minute Selectors and Presets */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Preset Buttons */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">
              Quick Schedule Presets:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {presets.map((p) => {
                const isSelected = currentTimeStr === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePreset(p.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10 font-bold'
                        : 'bg-[#131D35]/80 hover:bg-[#18233C] text-gray-400 hover:text-white border-cyan-500/10'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Precision Dials / Sliders */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Select Hour (00 - 23):
              </label>
              <select
                value={hour}
                onChange={(e) => handleHourChange(e.target.value)}
                className="w-full bg-[#131D35] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const hStr = i.toString().padStart(2, '0');
                  const hNum = i === 0 ? 12 : i > 12 ? i - 12 : i;
                  const ampm = i >= 12 ? 'PM' : 'AM';
                  return (
                    <option key={i} value={hStr}>
                      {hStr}:00 ({hNum} {ampm})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Select Minute (00 - 59):
              </label>
              <select
                value={minute}
                onChange={(e) => handleMinuteChange(e.target.value)}
                className="w-full bg-[#131D35] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
              >
                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                  <option key={m} value={m}>
                    :{m} mins
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
