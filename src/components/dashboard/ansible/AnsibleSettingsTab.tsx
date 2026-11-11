'use client';

import React, { useState } from 'react';
import { Settings, Save, Shield, Terminal, CheckCircle2 } from 'lucide-react';

export function AnsibleSettingsTab() {
  const [forks, setForks] = useState(5);
  const [timeout, setTimeoutVal] = useState(30);
  const [hostKeyChecking, setHostKeyChecking] = useState(false);
  const [defaultUser, setDefaultUser] = useState('ubuntu');
  const [verbosity, setVerbosity] = useState('standard');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 mb-5 border-b border-[#1E293B] pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Ansible Engine Settings</h3>
            <p className="text-xs text-slate-400">Configure global execution limits, SSH options and default behavior</p>
          </div>
        </div>

        {saved && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Max Parallel Forks</label>
              <input
                type="number"
                min={1}
                max={50}
                value={forks}
                onChange={(e) => setForks(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Number of concurrent hosts processed in parallel.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">SSH Timeout (Seconds)</label>
              <input
                type="number"
                min={5}
                max={300}
                value={timeout}
                onChange={(e) => setTimeoutVal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Timeout for initial SSH connection handshake.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Default Fallback Username</label>
              <input
                type="text"
                value={defaultUser}
                onChange={(e) => setDefaultUser(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Log Verbosity Level</label>
              <select
                value={verbosity}
                onChange={(e) => setVerbosity(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="standard">Standard (Default)</option>
                <option value="verbose">Verbose (-v)</option>
                <option value="debug">Deep Debug (-vvv)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 p-3 bg-[#0F172A] border border-slate-700/60 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={hostKeyChecking}
                onChange={(e) => setHostKeyChecking(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="font-semibold text-slate-200">Strict Host Key Checking</span>
                <p className="text-[11px] text-slate-400">
                  When disabled (recommended for dynamic cloud fleets), new host keys are accepted automatically.
                </p>
              </div>
            </label>
          </div>

          <div className="pt-3 border-t border-[#1E293B] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

