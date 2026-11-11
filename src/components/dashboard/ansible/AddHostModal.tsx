'use client';

import React, { useState, useEffect } from 'react';
import { X, Server, Key, Shield, Globe, Terminal, CheckCircle2 } from 'lucide-react';
import { IAnsibleHostData } from '@/models/AnsibleHost';

interface AddHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingHost?: IAnsibleHostData | null;
}

export function AddHostModal({ isOpen, onClose, onSaved, editingHost }: AddHostModalProps) {
  const [name, setName] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [ip, setIp] = useState('');
  const [privateIp, setPrivateIp] = useState('');
  const [provider, setProvider] = useState<'aws' | 'azure' | 'linux' | 'local' | 'other'>('aws');
  const [region, setRegion] = useState('ap-south-1');
  const [os, setOs] = useState('Ubuntu 22.04 LTS');
  const [username, setUsername] = useState('ubuntu');
  const [port, setPort] = useState(22);
  const [authMethod, setAuthMethod] = useState<'privateKey' | 'password'>('privateKey');
  const [authSecret, setAuthSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingHost) {
      setName(editingHost.name || '');
      setInstanceId(editingHost.instanceId || '');
      setIp(editingHost.ip || '');
      setPrivateIp(editingHost.privateIp || '');
      setProvider(editingHost.provider || 'aws');
      setRegion(editingHost.region || 'ap-south-1');
      setOs(editingHost.os || 'Ubuntu 22.04 LTS');
      setUsername(editingHost.username || 'ubuntu');
      setPort(editingHost.port || 22);
      setAuthMethod(editingHost.authMethod || 'privateKey');
      setAuthSecret('');
    } else {
      setName('');
      setInstanceId('');
      setIp('');
      setPrivateIp('');
      setProvider('aws');
      setRegion('ap-south-1');
      setOs('Ubuntu 22.04 LTS');
      setUsername('ubuntu');
      setPort(22);
      setAuthMethod('privateKey');
      setAuthSecret('');
    }
    setError(null);
  }, [editingHost, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !ip.trim()) {
      setError('Server Name and IP Address are required.');
      return;
    }

    if (!editingHost && authMethod === 'privateKey' && !authSecret.trim()) {
      setError('SSH Private Key is required.');
      return;
    }

    setLoading(true);

    try {
      const url = editingHost?._id ? `/api/ansible/hosts/${editingHost._id}` : '/api/ansible/hosts';
      const method = editingHost?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          instanceId: instanceId.trim() || undefined,
          ip: ip.trim(),
          privateIp: privateIp.trim() || undefined,
          provider,
          region: region.trim() || undefined,
          os: os.trim(),
          username: username.trim(),
          port: Number(port) || 22,
          authMethod,
          authSecret: authSecret.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save managed node');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-2xl p-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingHost ? 'Edit Managed Node' : 'Add Managed Node to Ansible Inventory'}
              </h2>
              <p className="text-xs text-slate-400">Configure target server SSH connectivity and host details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Server Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Server / VM Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. prod-web-ec2-01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Instance ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Instance ID / Resource ID
              </label>
              <input
                type="text"
                placeholder="e.g. i-0a1b2c3d4e5f6789"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Public IP */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Public IP Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 13.233.45.67"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

            {/* Private IP */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Private IP Address (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 10.0.1.15"
                value={privateIp}
                onChange={(e) => setPrivateIp(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Provider */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cloud Provider</label>
              <select
                value={provider}
                onChange={(e: any) => setProvider(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="aws">AWS EC2</option>
                <option value="azure">Azure VM</option>
                <option value="linux">Linux / VM</option>
                <option value="local">Local Datacenter</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Region</label>
              <input
                type="text"
                placeholder="e.g. us-east-1"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* OS */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Operating System</label>
              <input
                type="text"
                placeholder="e.g. Ubuntu 22.04 LTS"
                value={os}
                onChange={(e) => setOs(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* SSH Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SSH Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="ubuntu"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

            {/* SSH Port */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">SSH Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

            {/* Auth Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Authentication Method</label>
              <select
                value={authMethod}
                onChange={(e: any) => setAuthMethod(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="privateKey">SSH Private Key (Recommended)</option>
                <option value="password">Password</option>
              </select>
            </div>
          </div>

          {/* SSH Secret */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                {authMethod === 'privateKey' ? 'SSH Private Key (.pem / id_rsa)' : 'SSH Password'}
                {!editingHost && <span className="text-rose-400"> *</span>}
              </label>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Encrypted with AES-256-GCM</span>
              </div>
            </div>

            {authMethod === 'privateKey' ? (
              <textarea
                rows={4}
                placeholder={
                  editingHost
                    ? 'Leave blank to preserve existing encrypted private key'
                    : '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----'
                }
                value={authSecret}
                onChange={(e) => setAuthSecret(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 transition"
              />
            ) : (
              <input
                type="password"
                placeholder={
                  editingHost
                    ? 'Leave blank to preserve existing password'
                    : 'Enter SSH password'
                }
                value={authSecret}
                onChange={(e) => setAuthSecret(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingHost ? 'Update Managed Node' : 'Save Managed Node'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
