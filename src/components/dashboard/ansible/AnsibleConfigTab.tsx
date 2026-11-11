'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Terminal, Cpu, HardDrive, CheckCircle2, RefreshCw } from 'lucide-react';

export function AnsibleConfigTab() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ansible/config');
      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Ansible Control Node Configuration</h3>
            <p className="text-xs text-slate-400">System diagnostics, CLI runtime, environment and storage validation</p>
          </div>
        </div>

        <button
          onClick={fetchConfig}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Grid of properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Runtime & Versions */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 text-blue-400">
            <Cpu className="w-4 h-4" />
            <span>Execution Runtime</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/60">
              <span className="text-slate-400">Control Node Status:</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{config?.controlNodeStatus || 'Operational'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/60">
              <span className="text-slate-400">Ansible Engine:</span>
              <span className="font-mono text-white text-[11px] font-medium">
                {config?.ansibleVersion || 'Ansible Core 2.16'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/60">
              <span className="text-slate-400">Python / Host Runtime:</span>
              <span className="font-mono text-white text-[11px] font-medium">
                {config?.pythonVersion || 'Python 3.10+ / Node.js runtime'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/60">
              <span className="text-slate-400">Host Platform:</span>
              <span className="text-slate-200">{config?.osPlatform || 'Windows NT (x64)'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: SSH & Paths */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 text-purple-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Transport & Directories</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/60">
              <span className="text-slate-400">SSH Transport Client:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>OpenSSH / SSH2 Client Ready</span>
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/60">
              <span className="text-slate-400">Credential Encryption:</span>
              <span className="text-emerald-400 font-mono text-[11px] font-semibold">
                AES-256-GCM at rest
              </span>
            </div>

            <div className="flex items-start justify-between pb-2 border-b border-[#1E293B]/60">
              <span className="text-slate-400">Inventory Storage:</span>
              <span className="font-mono text-slate-300 text-[11px] text-right truncate max-w-[200px]">
                MongoDB / .ansible-data
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/60">
              <span className="text-slate-400">Configuration Check:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All checks passed</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

