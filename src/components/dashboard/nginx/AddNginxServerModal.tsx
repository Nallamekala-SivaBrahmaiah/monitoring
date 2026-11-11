'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  X,
  UploadCloud,
  CheckCircle2,
  Key,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { INginxServerData } from '@/models/NginxServer';

interface AddNginxServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddNginxServerModal({
  isOpen,
  onClose,
  onSaved,
}: AddNginxServerModalProps) {
  const [tab, setTab] = useState<'import' | 'manual'>('import');
  const [availableCloudServers, setAvailableCloudServers] = useState<any[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [selectedCloudId, setSelectedCloudId] = useState('');

  // Manual form state
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('ubuntu');
  const [authMethod, setAuthMethod] = useState<'privateKey' | 'password'>('privateKey');
  const [authSecret, setAuthSecret] = useState('');
  const [cloudProvider, setCloudProvider] = useState<'aws' | 'azure' | 'on-premise'>('aws');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch available servers from existing Server collection
      setLoadingCloud(true);
      fetch('/api/servers')
        .then((res) => res.json())
        .then((data) => {
          if (data.servers) {
            setAvailableCloudServers(data.servers);
            if (data.servers.length > 0) {
              setSelectedCloudId(data.servers[0]._id);
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoadingCloud(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCloudId) return;

    setSaving(true);
    setError(null);
    try {
      const target = availableCloudServers.find((s) => s._id === selectedCloudId);
      const res = await fetch('/api/nginx/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: target?.name || 'Cloud Server',
          host: target?.host,
          port: target?.port || 22,
          username: target?.username || 'ubuntu',
          cloudProvider: target?.cloudProvider || 'aws',
          region: target?.region || '',
          importFromServerId: selectedCloudId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to import server');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/nginx/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          host,
          port: Number(port),
          username,
          authMethod,
          authSecret,
          cloudProvider,
          region,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register server');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111A2E] border border-slate-700/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Cloud Server</h3>
              <p className="text-xs text-slate-400">Connect AWS EC2 or Azure VM for Nginx management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-[#0B1120] p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === 'import'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Import from Cloud Fleet ({availableCloudServers.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === 'manual'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Add Manually
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Import Tab */}
        {tab === 'import' ? (
          <form onSubmit={handleImport} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Select from Discovered AWS / Azure Servers
              </label>

              {loadingCloud ? (
                <div className="p-8 text-center text-slate-500 text-xs">Loading cloud instances...</div>
              ) : availableCloudServers.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                  No existing servers found in database. Use &quot;Add Manually&quot; or register cloud servers first.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {availableCloudServers.map((srv) => {
                    const isSelected = selectedCloudId === srv._id;
                    return (
                      <div
                        key={srv._id}
                        onClick={() => setSelectedCloudId(srv._id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 text-white'
                            : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {srv.cloudProvider === 'azure' ? (
                            <AzureLogo className="w-4 h-4" />
                          ) : (
                            <AwsLogo className="w-4 h-4" />
                          )}
                          <div>
                            <span className="font-bold text-white block">{srv.name}</span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {srv.host} &bull; User: {srv.username}
                            </span>
                          </div>
                        </div>

                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !selectedCloudId}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition disabled:opacity-40"
              >
                {saving ? 'Importing...' : 'Import Server'}
              </button>
            </div>
          </form>
        ) : (
          /* Manual Add Form */
          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Server Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. ec2-production"
                  className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Cloud Provider</label>
                <select
                  value={cloudProvider}
                  onChange={(e) => setCloudProvider(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="aws">AWS EC2</option>
                  <option value="azure">Azure VM</option>
                  <option value="other">Linux Server</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Host IP / Domain</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                  placeholder="e.g. 13.211.50.77"
                  className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">SSH Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="22"
                  className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">SSH Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="ubuntu"
                  className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Auth Method</label>
                <select
                  value={authMethod}
                  onChange={(e) => setAuthMethod(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="privateKey">SSH Private Key (PEM / PPK)</option>
                  <option value="password">Password</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {authMethod === 'privateKey' ? 'Private Key (PEM)' : 'SSH Password'}
              </label>
              {authMethod === 'privateKey' ? (
                <textarea
                  rows={4}
                  value={authSecret}
                  onChange={(e) => setAuthSecret(e.target.value)}
                  required
                  placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                  className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              ) : (
                <input
                  type="password"
                  value={authSecret}
                  onChange={(e) => setAuthSecret(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
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
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition disabled:opacity-40"
              >
                {saving ? 'Registering...' : 'Register Server'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

