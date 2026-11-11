'use client';

import React, { useState } from 'react';
import { Globe, Plus, X, Server, Layers, FileCode } from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';

interface CreateReverseProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeServer: INginxServerData | null;
  onCreated: () => void;
}

export function CreateReverseProxyModal({
  isOpen,
  onClose,
  activeServer,
  onCreated,
}: CreateReverseProxyModalProps) {
  const [domain, setDomain] = useState('');
  const [listenPort, setListenPort] = useState('80');
  const [mode, setMode] = useState<'proxy' | 'static'>('proxy');
  const [proxyPass, setProxyPass] = useState('http://127.0.0.1:3000');
  const [rootPath, setRootPath] = useState('/var/www/my-app');
  const [spaFallback, setSpaFallback] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !activeServer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          listenPort: Number(listenPort),
          isStatic: mode === 'static',
          proxyPass: mode === 'proxy' ? proxyPass : undefined,
          rootPath: mode === 'static' ? rootPath : undefined,
          spaFallback,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to configure Nginx reverse proxy.');
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111A2E] border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Nginx Site</h3>
              <p className="text-xs text-slate-400">Configure reverse proxy or static root on {activeServer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Domain / Server Name</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              placeholder="e.g. app.example.com or _"
              className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Listen Port</label>
              <input
                type="number"
                value={listenPort}
                onChange={(e) => setListenPort(e.target.value)}
                placeholder="80"
                className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Routing Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="proxy">Reverse Proxy (PM2/Node)</option>
                <option value="static">Static Hosting (Vite/React)</option>
              </select>
            </div>
          </div>

          {mode === 'proxy' ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Upstream Proxy URL</label>
              <input
                type="text"
                value={proxyPass}
                onChange={(e) => setProxyPass(e.target.value)}
                required
                placeholder="http://127.0.0.1:3000"
                className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Document Root Directory</label>
                <input
                  type="text"
                  value={rootPath}
                  onChange={(e) => setRootPath(e.target.value)}
                  required
                  placeholder="/var/www/my-app"
                  className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spaFallback}
                  onChange={(e) => setSpaFallback(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900"
                />
                <span>Enable SPA routing fallback (`try_files $uri /index.html;`)</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition disabled:opacity-40"
            >
              {saving ? 'Testing & Reloading...' : 'Save & Apply Config'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

