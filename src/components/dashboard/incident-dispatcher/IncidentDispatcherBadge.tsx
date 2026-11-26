'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Radio, Power, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface IncidentDispatcherBadgeProps {
  className?: string;
}

export function IncidentDispatcherBadge({ className = '' }: IncidentDispatcherBadgeProps) {
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/incident-dispatcher/config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setConnected(Boolean(data.connected));
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleConnection = async () => {
    setLoading(true);
    const target = !connected;
    try {
      const res = await fetch('/api/incident-dispatcher/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connected: target }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConnected(data.connected);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-xl px-3.5 py-2 border flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
        connected
          ? 'bg-[#0E2433]/70 border-cyan-500/40 text-cyan-200'
          : 'bg-[#1E1924]/70 border-amber-500/30 text-amber-200'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            connected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">Incident Dispatcher Hub:</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              connected
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {connected ? '● CONNECTED (ON)' : '○ DISCONNECTED (OFF)'}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {connected
              ? 'Alerts routing through escalation & dispatch engine'
              : 'Alerts running in standalone basic mode'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleConnection}
          disabled={loading}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
            connected
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
          }`}
        >
          <Power className="w-3 h-3" />
          <span>{connected ? 'Disconnect' : 'Connect'}</span>
        </button>

        <Link
          href="/dashboard/incident-dispatcher"
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 transition-colors"
        >
          <span>Open Module</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
