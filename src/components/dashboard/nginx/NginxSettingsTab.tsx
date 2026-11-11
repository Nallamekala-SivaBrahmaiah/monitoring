'use client';

import React, { useState } from 'react';
import { Settings, Shield, Clock, HardDrive, Check, Save } from 'lucide-react';

export function NginxSettingsTab() {
  const [defaultDir, setDefaultDir] = useState('/var/www');
  const [sshTimeout, setSshTimeout] = useState('15');
  const [refreshInterval, setRefreshInterval] = useState('15');
  const [backupRetention, setBackupRetention] = useState('5');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-6 shadow-xl shadow-black/20 space-y-6">
        <div className="flex items-center gap-3.5 pb-4 border-b border-[#1E293B]">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nginx Module Configuration</h3>
            <p className="text-xs text-slate-400">
              Deployment directories, SSH timeouts, and rollback retention defaults
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Default Deployment Root Path
            </label>
            <input
              type="text"
              value={defaultDir}
              onChange={(e) => setDefaultDir(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-slate-500">
              Applications are extracted and configured under this remote filesystem root.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                SSH Command Timeout (seconds)
              </label>
              <input
                type="number"
                value={sshTimeout}
                onChange={(e) => setSshTimeout(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Auto-Refresh Polling Interval (seconds)
              </label>
              <input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Rollback Backups Retention
            </label>
            <input
              type="number"
              value={backupRetention}
              onChange={(e) => setBackupRetention(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-slate-500">
              Maximum previous deployment backup directories retained under `/var/www/backups`.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Settings Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

