'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Globe,
  Server,
  AlertTriangle,
  Check,
  Loader2,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IServerScheduleData } from '@/models/ServerSchedule';

interface AvailableResource {
  id: string;
  name: string;
  resourceId: string;
  provider: 'aws' | 'azure';
  region: string;
  currentState: string;
  ipAddress?: string;
}

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editSchedule?: IServerScheduleData | null;
}

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - UTC+08:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const HOURS_12 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
// All 60 minutes (00 to 59) allowing any minute 1 to 60 to be selected or typed
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// 30-minute interval quick timing presets across 24 hours
const TIMING_OPTIONS = [
  { value: '00:00', label: '12:00 AM (00:00 - Midnight)' },
  { value: '00:30', label: '12:30 AM (00:30)' },
  { value: '01:00', label: '01:00 AM (01:00)' },
  { value: '01:30', label: '01:30 AM (01:30)' },
  { value: '02:00', label: '02:00 AM (02:00)' },
  { value: '02:30', label: '02:30 AM (02:30)' },
  { value: '03:00', label: '03:00 AM (03:00)' },
  { value: '03:30', label: '03:30 AM (03:30)' },
  { value: '04:00', label: '04:00 AM (04:00)' },
  { value: '04:30', label: '04:30 AM (04:30)' },
  { value: '05:00', label: '05:00 AM (05:00)' },
  { value: '05:30', label: '05:30 AM (05:30)' },
  { value: '06:00', label: '06:00 AM (06:00)' },
  { value: '06:30', label: '06:30 AM (06:30)' },
  { value: '07:00', label: '07:00 AM (07:00)' },
  { value: '07:30', label: '07:30 AM (07:30)' },
  { value: '08:00', label: '08:00 AM (08:00)' },
  { value: '08:30', label: '08:30 AM (08:30)' },
  { value: '09:00', label: '09:00 AM (09:00 - Standard Start)' },
  { value: '09:30', label: '09:30 AM (09:30)' },
  { value: '10:00', label: '10:00 AM (10:00)' },
  { value: '10:30', label: '10:30 AM (10:30)' },
  { value: '11:00', label: '11:00 AM (11:00)' },
  { value: '11:30', label: '11:30 AM (11:30)' },
  { value: '12:00', label: '12:00 PM (12:00 - Noon)' },
  { value: '12:30', label: '12:30 PM (12:30)' },
  { value: '13:00', label: '01:00 PM (13:00)' },
  { value: '13:30', label: '01:30 PM (13:30)' },
  { value: '14:00', label: '02:00 PM (14:00)' },
  { value: '14:30', label: '02:30 PM (14:30)' },
  { value: '15:00', label: '03:00 PM (15:00)' },
  { value: '15:30', label: '03:30 PM (15:30)' },
  { value: '16:00', label: '04:00 PM (16:00)' },
  { value: '16:30', label: '04:30 PM (16:30)' },
  { value: '17:00', label: '05:00 PM (17:00)' },
  { value: '17:30', label: '05:30 PM (17:30)' },
  { value: '18:00', label: '06:00 PM (18:00)' },
  { value: '18:30', label: '06:30 PM (18:30)' },
  { value: '19:00', label: '07:00 PM (19:00 - Standard Stop)' },
  { value: '19:30', label: '07:30 PM (19:30)' },
  { value: '20:00', label: '08:00 PM (20:00)' },
  { value: '20:30', label: '08:30 PM (20:30)' },
  { value: '21:00', label: '09:00 PM (21:00)' },
  { value: '21:30', label: '09:30 PM (21:30)' },
  { value: '22:00', label: '10:00 PM (22:00)' },
  { value: '22:30', label: '10:30 PM (22:30)' },
  { value: '23:00', label: '11:00 PM (23:00)' },
  { value: '23:30', label: '11:30 PM (23:30)' },
];

function parseTime24(time24: string): { hour12: number; minute: string; ampm: 'AM' | 'PM' } {
  if (!time24 || !time24.includes(':')) {
    return { hour12: 9, minute: '00', ampm: 'AM' };
  }
  const [hStr, mStr] = time24.split(':');
  let h24 = parseInt(hStr, 10);
  if (isNaN(h24)) h24 = 9;
  const m = (mStr || '00').padStart(2, '0').slice(0, 2);
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { hour12: h12, minute: m, ampm };
}

function formatToTime24(hour12: number, minute: string, ampm: 'AM' | 'PM'): string {
  let h24 = hour12;
  if (ampm === 'PM') {
    h24 = hour12 === 12 ? 12 : hour12 + 12;
  } else {
    h24 = hour12 === 12 ? 0 : hour12;
  }
  const hStr = String(h24).padStart(2, '0');
  const mStr = (minute || '00').padStart(2, '0');
  return `${hStr}:${mStr}`;
}

function formatDisplay12h(time24: string): string {
  const { hour12, minute, ampm } = parseTime24(time24);
  const hStr = hour12 < 10 ? `0${hour12}` : `${hour12}`;
  return `${hStr}:${minute} ${ampm}`;
}

interface TimePicker12hProps {
  label: string;
  value: string;
  onChange: (val24: string) => void;
  accent: 'emerald' | 'rose';
  presets: Array<{ label: string; time24: string }>;
  helperText: string;
}

function TimePicker12h({
  label,
  value,
  onChange,
  accent,
  presets,
  helperText,
}: TimePicker12hProps) {
  const { hour12, minute, ampm } = parseTime24(value);

  const updateHour = (newHour: number) => {
    onChange(formatToTime24(newHour, minute, ampm));
  };

  const updateMinute = (newMin: string) => {
    onChange(formatToTime24(hour12, newMin, ampm));
  };

  const updateAmPm = (newAmPm: 'AM' | 'PM') => {
    onChange(formatToTime24(hour12, minute, newAmPm));
  };

  const isStart = accent === 'emerald';

  return (
    <div className="space-y-2.5 bg-[#0D1526] p-3.5 rounded-xl border border-[#1E293B]">
      {/* Header with Title & Formatted AM/PM Display */}
      <div className="flex items-center justify-between">
        <label className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isStart ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
              isStart
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}
          >
            {formatDisplay12h(value)}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            ({value})
          </span>
        </div>
      </div>

      {/* Main 12-Hour Selector: Hour : Minute | AM / PM */}
      <div className="flex items-center gap-2">
        {/* Hour (01 - 12) */}
        <div className="flex-1 min-w-[70px]">
          <span className="text-[10px] text-slate-400 mb-1 block font-medium">Hour</span>
          <select
            value={String(hour12).padStart(2, '0')}
            onChange={(e) => updateHour(parseInt(e.target.value, 10))}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 text-slate-100 font-mono text-xs outline-none cursor-pointer"
          >
            {HOURS_12.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500 font-bold pt-4">:</span>

        {/* Minute (00 - 59: Any number 1 to 60 can be typed or selected) */}
        <div className="flex-1 min-w-[125px]">
          <span className="text-[10px] text-slate-400 mb-1 block font-medium">Minute (00–59)</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  updateMinute('00');
                  return;
                }
                let num = parseInt(raw, 10);
                if (isNaN(num)) num = 0;
                if (num > 59) num = 59;
                if (num < 0) num = 0;
                updateMinute(String(num).padStart(2, '0'));
              }}
              title="Type any minute from 00 to 59"
              className="w-12 px-1.5 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 text-slate-100 font-mono text-xs text-center outline-none"
            />
            <select
              value={minute}
              onChange={(e) => updateMinute(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 text-slate-100 font-mono text-xs outline-none cursor-pointer"
            >
              {ALL_MINUTES.map((m) => (
                <option key={m} value={m}>
                  :{m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* AM / PM Toggle Buttons */}
        <div className="flex-1 min-w-[95px]">
          <span className="text-[10px] text-slate-400 mb-1 block font-medium">AM / PM</span>
          <div className="grid grid-cols-2 bg-[#111A2E] border border-[#1E293B] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => updateAmPm('AM')}
              className={`py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                ampm === 'AM'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => updateAmPm('PM')}
              className={`py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                ampm === 'PM'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Quick Select Timing Dropdown */}
      <div className="pt-0.5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#111A2E] border border-[#1E293B] text-[11px] text-slate-300 focus:border-blue-500 outline-none cursor-pointer"
          >
            <option value="" disabled>
              ⚡ Quick Select Timing...
            </option>
            {TIMING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[10px] text-slate-500">Popular:</span>
        {presets.map((p) => {
          const isSelected = value === p.time24;
          return (
            <button
              key={p.time24}
              type="button"
              onClick={() => onChange(p.time24)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                isSelected
                  ? isStart
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                  : 'bg-[#111A2E] hover:bg-[#18233C] text-slate-400 hover:text-slate-200 border-[#1E293B]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <span className="text-[10px] text-slate-500 block pt-0.5">
        {helperText}
      </span>
    </div>
  );
}

export function CreateScheduleModal({
  isOpen,
  onClose,
  onSaved,
  editSchedule,
}: CreateScheduleModalProps) {
  const [loadingResources, setLoadingResources] = useState(false);
  const [resources, setResources] = useState<AvailableResource[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<'aws' | 'azure'>('aws');
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [stopTime, setStopTime] = useState('19:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [enabled, setEnabled] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [safetyConfirmed, setSafetyConfirmed] = useState(true);

  // Fetch available resources from database
  useEffect(() => {
    if (!isOpen) return;

    async function loadResources() {
      setLoadingResources(true);
      setError(null);
      try {
        const res = await fetch('/api/schedules/available-resources');
        const data = await res.json();
        if (res.ok && data.resources) {
          setResources(data.resources);
          if (!editSchedule && data.resources.length > 0) {
            // Pre-select first resource of current provider
            const matched = data.resources.find((r: AvailableResource) => r.provider === provider);
            if (matched) {
              setSelectedResourceId(matched.resourceId);
            } else if (data.resources[0]) {
              setProvider(data.resources[0].provider);
              setSelectedResourceId(data.resources[0].resourceId);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch available cloud resources');
      } finally {
        setLoadingResources(false);
      }
    }

    loadResources();
  }, [isOpen]);

  // Populate fields if editing or auto-set smart defaults
  useEffect(() => {
    if (editSchedule) {
      setName(editSchedule.name);
      setProvider(editSchedule.provider);
      setSelectedResourceId(editSchedule.resourceId);
      setStartTime(editSchedule.startTime || '09:00');
      setStopTime(editSchedule.stopTime || '19:00');
      setTimezone(editSchedule.timezone || 'Asia/Kolkata');
      setDaysOfWeek(editSchedule.daysOfWeek || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setEnabled(editSchedule.enabled !== false);
      setStartDate(
        editSchedule.startDate
          ? new Date(editSchedule.startDate).toISOString().split('T')[0]
          : ''
      );
      setEndDate(
        editSchedule.endDate
          ? new Date(editSchedule.endDate).toISOString().split('T')[0]
          : ''
      );
    } else {
      setStartTime('09:00');
      setStopTime('19:00');
      setTimezone('Asia/Kolkata');
      setDaysOfWeek(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setEnabled(true);
      setStartDate('');
      setEndDate('');
    }
  }, [editSchedule, isOpen]);

  // Auto-select first matching resource when provider or resources change
  useEffect(() => {
    if (!isOpen) return;
    const currentFiltered = resources.filter((r) => r.provider === provider);
    if (currentFiltered.length > 0) {
      const exists = currentFiltered.some((r) => r.resourceId === selectedResourceId);
      if (!exists) {
        setSelectedResourceId(currentFiltered[0].resourceId);
      }
    }
  }, [isOpen, provider, resources, selectedResourceId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-fill a friendly Schedule Name if empty
  useEffect(() => {
    if (!isOpen || editSchedule) return;
    if (!name.trim() && selectedResourceId) {
      const res = resources.find((r) => r.resourceId === selectedResourceId);
      if (res) {
        setName(`${res.name} Workday Hours`);
      }
    }
  }, [isOpen, selectedResourceId, resources, editSchedule]);

  if (!isOpen) return null;

  const filteredResources = resources.filter((r) => r.provider === provider);
  const selectedResource = resources.find((r) => r.resourceId === selectedResourceId);
  const currentResource =
    selectedResource || filteredResources.find((r) => r.resourceId === selectedResourceId);
  const serverDisplayName = currentResource?.name || selectedResourceId || 'Select Server';

  const toggleDay = (day: string) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handlePresetDays = (preset: 'workdays' | 'all' | 'weekends') => {
    if (preset === 'workdays') setDaysOfWeek(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    if (preset === 'all') setDaysOfWeek(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    if (preset === 'weekends') setDaysOfWeek(['Sat', 'Sun']);
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const finalResourceId =
      selectedResourceId || (filteredResources.length > 0 ? filteredResources[0].resourceId : '');

    if (!finalResourceId) {
      setError('Please select a target EC2 instance or Azure VM.');
      return;
    }

    const finalDisplayName = currentResource?.name || finalResourceId;
    const finalName =
      name.trim() || `${finalDisplayName} Workday Schedule (${formatDisplay12h(startTime)} - ${formatDisplay12h(stopTime)})`;

    if (daysOfWeek.length === 0) {
      setError('Please select at least one active day of the week (e.g. Mon–Fri).');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: finalName,
      provider,
      resourceId: finalResourceId,
      serverName: finalDisplayName,
      region: currentResource?.region || 'global',
      startTime,
      stopTime,
      timezone,
      daysOfWeek,
      enabled,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
    };

    try {
      const url = editSchedule
        ? `/api/schedules/${editSchedule._id}`
        : '/api/schedules';
      const method = editSchedule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save schedule');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#070D1B] flex flex-col overflow-hidden'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden'
      }
    >
      <form
        onSubmit={handleSubmit}
        className={
          isFullscreen
            ? 'w-full h-full flex flex-col overflow-hidden bg-[#070D1B]'
            : 'relative w-full max-w-6xl h-[92vh] max-h-[920px] bg-[#0C1427] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col overflow-hidden'
        }
      >
        {/* Modal Top Header */}
        <div className="shrink-0 h-16 px-6 sm:px-8 border-b border-[#1E293B] bg-[#0A1122] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {editSchedule ? 'Edit Server Schedule' : 'Create Automated Server Schedule'}
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  Full Automation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous Start/Stop Automation for AWS EC2 instances &amp; Azure Virtual Machines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Target Server Indicator Pill */}
            {currentResource && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111A2E] border border-[#1E293B] text-xs">
                {currentResource.provider === 'aws' ? (
                  <AwsLogo className="w-3.5 h-3.5" />
                ) : (
                  <AzureLogo className="w-3 h-3" />
                )}
                <span className="font-semibold text-slate-200">{serverDisplayName}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    currentResource.currentState?.toLowerCase() === 'running'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {currentResource.currentState}
                </span>
              </div>
            )}

            {/* Fullscreen / Windowed Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white bg-[#111A2E] hover:bg-[#1A2640] border border-[#1E293B] flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
              title={isFullscreen ? 'Switch to Windowed' : 'Switch to Full Screen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Windowed</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-[#111A2E] hover:bg-[#1A2640] border border-[#1E293B] transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-10 lg:px-12 bg-[#070D1B]">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-3 text-xs shadow-lg shadow-rose-950/20">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN: Server & Operating Schedule */}
              <div className="space-y-6">
                {/* Card 1: Instance & Target Server */}
                <div className="bg-[#0D1527] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#1E293B]/70">
                    <Server className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-sm text-white">1. Target Instance &amp; Name</h3>
                  </div>

                  {/* Schedule Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-200 text-xs">Schedule Name</label>
                      <span className="text-[11px] text-slate-500">Auto-filled if left blank</span>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Workday Office Hours (09:00 AM - 07:00 PM)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080E1C] border border-[#1E293B] focus:border-blue-500 text-slate-100 text-xs outline-none transition-all"
                    />
                  </div>

                  {/* Cloud Provider Switcher */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-200 text-xs">Cloud Provider</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setProvider('aws');
                          const firstAws = resources.find((r) => r.provider === 'aws');
                          if (firstAws) setSelectedResourceId(firstAws.resourceId);
                        }}
                        className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border font-semibold text-xs transition-all cursor-pointer ${
                          provider === 'aws'
                            ? 'bg-[#FF9900]/20 border-[#FF9900]/70 text-white shadow-md shadow-[#FF9900]/10'
                            : 'bg-[#080E1C] border-[#1E293B] text-slate-400 hover:text-white hover:bg-[#121B2F]'
                        }`}
                      >
                        <AwsLogo className="w-4 h-4" />
                        <span>AWS EC2</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProvider('azure');
                          const firstAzure = resources.find((r) => r.provider === 'azure');
                          if (firstAzure) setSelectedResourceId(firstAzure.resourceId);
                        }}
                        className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border font-semibold text-xs transition-all cursor-pointer ${
                          provider === 'azure'
                            ? 'bg-[#0089D6]/20 border-[#0089D6]/70 text-white shadow-md shadow-[#0089D6]/10'
                            : 'bg-[#080E1C] border-[#1E293B] text-slate-400 hover:text-white hover:bg-[#121B2F]'
                        }`}
                      >
                        <AzureLogo className="w-3.5 h-3.5" />
                        <span>Azure VM</span>
                      </button>
                    </div>
                  </div>

                  {/* Target Server Selector */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-200 text-xs">
                      Target Instance / Server <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedResourceId}
                      onChange={(e) => setSelectedResourceId(e.target.value)}
                      disabled={loadingResources || filteredResources.length === 0}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080E1C] border border-[#1E293B] focus:border-blue-500 text-slate-100 text-xs outline-none transition-all cursor-pointer"
                    >
                      {filteredResources.length === 0 ? (
                        <option value="">No {provider.toUpperCase()} resources discovered</option>
                      ) : (
                        filteredResources.map((r) => (
                          <option key={r.resourceId} value={r.resourceId}>
                            {r.name} ({r.resourceId}) — [{r.currentState}]
                          </option>
                        ))
                      )}
                    </select>

                    {/* Server details chip */}
                    {currentResource && (
                      <div className="p-3 rounded-xl bg-[#080E1C] border border-[#1E293B] flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <div>
                          <span className="text-slate-500">Region: </span>
                          <span className="text-slate-200 font-mono">{currentResource.region}</span>
                          {currentResource.ipAddress && (
                            <>
                              <span className="text-slate-500 ml-3">IP: </span>
                              <span className="text-slate-200 font-mono">{currentResource.ipAddress}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Live Status:</span>
                          <span
                            className={`font-semibold ${
                              currentResource.currentState?.toLowerCase() === 'running'
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }`}
                          >
                            ● {currentResource.currentState}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 2: Operating Days of Week & Calendar Limits */}
                <div className="bg-[#0D1527] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <h3 className="font-bold text-sm text-white">2. Operating Days of Week</h3>
                    </div>
                    {/* Presets */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handlePresetDays('workdays')}
                        className="px-2.5 py-1 rounded-lg bg-[#141F36] hover:bg-[#1E2D4E] text-blue-400 hover:text-white transition-colors cursor-pointer font-medium"
                      >
                        Mon–Fri
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetDays('all')}
                        className="px-2.5 py-1 rounded-lg bg-[#141F36] hover:bg-[#1E2D4E] text-blue-400 hover:text-white transition-colors cursor-pointer font-medium"
                      >
                        All 7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetDays('weekends')}
                        className="px-2.5 py-1 rounded-lg bg-[#141F36] hover:bg-[#1E2D4E] text-blue-400 hover:text-white transition-colors cursor-pointer font-medium"
                      >
                        Weekends
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {DAYS.map((d) => {
                      const isSelected = daysOfWeek.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(d)}
                          className={`py-2.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                              : 'bg-[#080E1C] border-[#1E293B] text-slate-400 hover:text-white hover:bg-[#121B2F]'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Weekend days (Sat &amp; Sun) unselected by default. Servers remain stopped / deallocated on inactive days.
                  </p>

                  {/* Effective Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1E293B]/70">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-medium">
                        Effective Start Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#080E1C] border border-[#1E293B] text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-medium">
                        Effective End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#080E1C] border border-[#1E293B] text-slate-200 outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Automation Timings & Safety Rules */}
              <div className="space-y-6">
                {/* Card 3: Execution Timings (12h AM/PM) */}
                <div className="bg-[#0D1527] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/70">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <h3 className="font-bold text-sm text-white">3. Autonomous Execution Timings</h3>
                    </div>
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                      12-Hour AM / PM Format
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Start Time */}
                    <TimePicker12h
                      label="Daily Start Time"
                      value={startTime}
                      onChange={setStartTime}
                      accent="emerald"
                      presets={[
                        { label: '08:00 AM', time24: '08:00' },
                        { label: '08:30 AM', time24: '08:30' },
                        { label: '09:00 AM', time24: '09:00' },
                        { label: '09:30 AM', time24: '09:30' },
                        { label: '10:00 AM', time24: '10:00' },
                      ]}
                      helperText="Instances will autonomously start at this time."
                    />

                    {/* Stop Time */}
                    <TimePicker12h
                      label="Daily Stop Time"
                      value={stopTime}
                      onChange={setStopTime}
                      accent="rose"
                      presets={[
                        { label: '05:00 PM', time24: '17:00' },
                        { label: '06:00 PM', time24: '18:00' },
                        { label: '07:00 PM', time24: '19:00' },
                        { label: '08:00 PM', time24: '20:00' },
                        { label: '09:00 PM', time24: '21:00' },
                      ]}
                      helperText="Instances will autonomously stop/deallocate at this time."
                    />
                  </div>

                  {/* Timezone */}
                  <div className="space-y-1.5 pt-1">
                    <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>Execution Timezone</span>
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080E1C] border border-[#1E293B] focus:border-blue-500 text-slate-200 text-xs outline-none cursor-pointer"
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Card 4: Production Safety Policy & Activation */}
                <div className="bg-[#0D1527] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#1E293B]/70">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">4. Safety Policy &amp; Activation</h3>
                  </div>

                  {/* Safety Policy Card */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#080E1C] border border-[#1E293B]">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed text-slate-300">
                      <span className="font-bold text-white block mb-0.5">
                        Enterprise Production Safety Policy
                      </span>
                      Automated operations invoke official cloud provider APIs (AWS EC2 StartInstances / StopInstances &amp; Azure VM Start / Deallocate). Server instances are never terminated or deleted, and instance configurations are never altered.
                    </div>
                  </div>

                  {/* Immediate Activation Checkbox */}
                  <div
                    onClick={() => setEnabled(!enabled)}
                    className="p-3.5 rounded-xl bg-[#080E1C] border border-[#1E293B] hover:border-blue-500/40 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold text-white text-xs block">
                        Enable schedule immediately upon saving
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Autonomous worker will begin monitoring start/stop triggers right away
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        enabled
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#111A2E] border-[#1E293B] text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (Always Pinned & Visible) */}
        <div className="shrink-0 px-6 sm:px-8 py-3.5 border-t border-[#1E293B] bg-[#0A101F] flex flex-wrap items-center justify-between gap-3">
          {/* Summary Strip */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Schedule:</span>
            <span className="font-semibold text-white bg-[#111A2E] border border-[#1E293B] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              {provider === 'aws' ? <AwsLogo className="w-3.5 h-3.5" /> : <AzureLogo className="w-3 h-3" />}
              {serverDisplayName}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
              ▶ Start: {formatDisplay12h(startTime)}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-400 font-mono font-bold bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded">
              ⏹ Stop: {formatDisplay12h(stopTime)}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-medium">
              {daysOfWeek.join(', ') || 'No days'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{timezone}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#141F36] hover:bg-[#1E2E4F] text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Schedule...</span>
                </>
              ) : (
                <span>{editSchedule ? 'Save Changes' : 'Create Schedule'}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
