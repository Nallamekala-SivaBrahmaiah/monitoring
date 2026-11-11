'use client';

import React, { useState } from 'react';
import {
  Server,
  ChevronDown,
  Plus,
  Radio,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { AnsibleLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IAnsibleControllerData } from '@/models/AnsibleController';

interface AnsibleControllerSelectorBarProps {
  controllers: IAnsibleControllerData[];
  activeController: IAnsibleControllerData | null;
  workerCount?: number;
  onSelectController: (controllerId: string) => Promise<void>;
  onAddControllerClick: () => void;
  onManageControllersClick: () => void;
  loading?: boolean;
}

export function AnsibleControllerSelectorBar({
  controllers,
  activeController,
  workerCount,
  onSelectController,
  onAddControllerClick,
  onManageControllersClick,
  loading = false,
}: AnsibleControllerSelectorBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const effectiveWorkerCount =
    typeof workerCount === 'number'
      ? workerCount
      : (activeController?.workerCount ?? 0);

  const handleSwitch = async (id: string) => {
    if (activeController?._id === id) {
      setDropdownOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await onSelectController(id);
    } finally {
      setSwitching(false);
      setDropdownOpen(false);
    }
  };

  const getProviderIcon = (provider?: string) => {
    switch (provider?.toLowerCase()) {
      case 'aws':
        return <AwsLogo className="w-3.5 h-3.5" />;
      case 'azure':
        return <AzureLogo className="w-3.5 h-3.5" />;
      default:
        return <Server className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const isOnline = activeController?.status === 'Online';

  return (
    <div className="relative bg-gradient-to-r from-[#111A2E] via-[#141F36] to-[#111A2E] border border-[#1E293B] rounded-2xl p-3 sm:p-4 shadow-xl shadow-black/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Active Controller Info + Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[1px] shrink-0 shadow-lg shadow-blue-600/20">
            <div className="w-full h-full bg-[#0D1527] rounded-[11px] flex items-center justify-center text-blue-400 font-bold">
              <AnsibleLogo className="w-5 h-5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Active Ansible Controller:
              </span>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  isOnline
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                <span>{activeController?.status || 'Offline'}</span>
              </span>

              {/* Worker Count Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-300">
                <Server className="w-3 h-3" />
                <span>{effectiveWorkerCount} {effectiveWorkerCount === 1 ? 'Managed Worker' : 'Managed Workers'}</span>
              </span>
            </div>

            {/* Dropdown Toggle Button */}
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={switching}
                className="flex items-center gap-2 text-left hover:opacity-90 transition group"
              >
                <span className="text-base font-bold text-white group-hover:text-blue-300 transition">
                  {activeController?.name || 'No Controller Selected'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ({activeController?.ipAddress || '127.0.0.1'})
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
                {switching && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3 bg-slate-900/90 text-xs font-semibold text-slate-400 flex items-center justify-between">
                      <span>Select Controller Environment ({controllers.length})</span>
                      <button
                        onClick={onManageControllersClick}
                        className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                      >
                        Manage
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                      {controllers.map((ctrl) => {
                        const isCurrent = ctrl._id === activeController?._id;
                        return (
                          <div
                            key={ctrl._id}
                            onClick={() => handleSwitch(ctrl._id || '')}
                            className={`p-2.5 rounded-lg cursor-pointer text-xs transition flex items-center justify-between ${
                              isCurrent
                                ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                                : 'hover:bg-slate-800/80 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                {getProviderIcon(ctrl.provider)}
                              </div>
                              <div>
                                <div className="font-semibold flex items-center gap-1.5">
                                  <span>{ctrl.name}</span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500/20 text-blue-300 font-bold uppercase">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {ctrl.ipAddress} • {isCurrent ? effectiveWorkerCount : (ctrl.workerCount || 0)} workers
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  ctrl.status === 'Online' ? 'bg-emerald-400' : 'bg-rose-400'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-2 bg-slate-900/60">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onAddControllerClick();
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Controller Node</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onManageControllersClick}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 flex items-center gap-1.5 transition shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Manage Controllers ({controllers.length})</span>
          </button>

          <button
            onClick={onAddControllerClick}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Controller</span>
          </button>
        </div>
      </div>
    </div>
  );
}

