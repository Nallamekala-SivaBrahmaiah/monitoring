'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Cloud,
  Key,
  Shield,
  Globe,
  Terminal,
  CheckCircle2,
  RefreshCw,
  Plus,
  Check,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IAnsibleHostData } from '@/models/AnsibleHost';
import { DiscoveredCloudServer } from '@/lib/ansible/ansibleCloudDiscovery';

interface AddHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingHost?: IAnsibleHostData | null;
  controllerId?: string;
  controllerName?: string;
}

export function AddHostModal({
  isOpen,
  onClose,
  onSaved,
  editingHost,
  controllerId,
  controllerName,
}: AddHostModalProps) {
  const [activeTab, setActiveTab] = useState<'cloud' | 'custom'>('cloud');

  // Discovered Cloud Servers
  const [cloudServers, setCloudServers] = useState<DiscoveredCloudServer[]>([]);
  const [loadingClouds, setLoadingClouds] = useState(false);
  const [selectedCloudServer, setSelectedCloudServer] = useState<DiscoveredCloudServer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [ip, setIp] = useState('');
  const [privateIp, setPrivateIp] = useState('');
  const [provider, setProvider] = useState<'aws' | 'azure' | 'linux' | 'local' | 'other'>('aws');
  const [region, setRegion] = useState('ap-southeast-2');
  const [os, setOs] = useState('Ubuntu 22.04 LTS');
  const [username, setUsername] = useState('ubuntu');
  const [port, setPort] = useState(22);
  const [authMethod, setAuthMethod] = useState<'privateKey' | 'password'>('privateKey');
  const [authSecret, setAuthSecret] = useState('');
  const [useExistingCredentials, setUseExistingCredentials] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCloudServers = async () => {
    setLoadingClouds(true);
    try {
      const url = controllerId
        ? `/api/ansible/hosts/import?controllerId=${encodeURIComponent(controllerId)}`
        : '/api/ansible/hosts/import';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setCloudServers(data.servers || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingClouds(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editingHost) {
        setActiveTab('custom');
        setName(editingHost.name || '');
        setInstanceId(editingHost.instanceId || '');
        setIp(editingHost.ip || '');
        setPrivateIp(editingHost.privateIp || '');
        setProvider(editingHost.provider || 'aws');
        setRegion(editingHost.region || 'ap-southeast-2');
        setOs(editingHost.os || 'Ubuntu 22.04 LTS');
        setUsername(editingHost.username || 'ubuntu');
        setPort(editingHost.port || 22);
        setAuthMethod(editingHost.authMethod || 'privateKey');
        setAuthSecret('');
        setUseExistingCredentials(false);
      } else {
        setActiveTab('cloud');
        setSelectedCloudServer(null);
        setName('');
        setInstanceId('');
        setIp('');
        setPrivateIp('');
        setProvider('aws');
        setRegion('ap-southeast-2');
        setOs('Ubuntu 22.04 LTS');
        setUsername('ubuntu');
        setPort(22);
        setAuthMethod('privateKey');
        setAuthSecret('');
        setUseExistingCredentials(true);
        fetchCloudServers();
      }
    }
  }, [editingHost, isOpen, controllerId]);

  if (!isOpen) return null;

  const handleSelectCloudServer = (s: DiscoveredCloudServer) => {
    setSelectedCloudServer(s);
    setName(s.name);
    setInstanceId(s.resourceId || '');
    setIp(s.ip || '');
    setPrivateIp(s.privateIp || '');
    setProvider(s.provider);
    setRegion(s.region || 'ap-southeast-2');
    setOs(s.os || 'Ubuntu 22.04 LTS');
    const defaultUser =
      s.username ||
      (s.provider === 'aws' ? 'ubuntu' : s.provider === 'azure' ? 'azureuser' : 'ubuntu');
    setUsername(defaultUser);
    setUseExistingCredentials(true);
    setAuthSecret('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !ip.trim()) {
      setError('Server Name and IP Address are required.');
      return;
    }

    if (!editingHost && !useExistingCredentials && authMethod === 'privateKey' && !authSecret.trim()) {
      setError('SSH Private Key is required, or check "Use verified credentials from Controller".');
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
          controllerId,
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
          useExistingCredentials,
          sourceResourceId: selectedCloudServer?.sshServerId || selectedCloudServer?.id || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-2xl p-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {editingHost ? 'Edit Managed Node' : 'Add Managed Node to Ansible Inventory'}
              </h2>
              <p className="text-xs text-slate-400">
                Register worker node under controller{' '}
                <span className="text-blue-400 font-semibold">{controllerName || 'Active Controller'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection (only when adding new) */}
        {!editingHost && (
          <div className="flex items-center border-b border-[#1E293B] bg-[#090E1A] rounded-xl p-1 mb-4 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('cloud')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'cloud'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>Select Cloud VM (AWS / Azure)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'custom'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Custom Linux Server / IP</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Discovered Cloud Instances Table */}
        {!editingHost && activeTab === 'cloud' && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Discovered Cloud Instances ({cloudServers.length} Available)
              </label>
              <button
                type="button"
                onClick={fetchCloudServers}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingClouds ? 'animate-spin' : ''}`} />
                <span>Refresh Instances</span>
              </button>
            </div>

            {loadingClouds ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-slate-800 rounded-xl bg-[#090E1A]">
                <span className="animate-spin inline-block mr-2">⟳</span> Discovering AWS EC2 & Azure VMs...
              </div>
            ) : cloudServers.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-400 border border-slate-800 rounded-xl bg-[#090E1A]">
                No available cloud instances discovered. Switch to &quot;Custom Linux Server / IP&quot; to add manually.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-[#090E1A] divide-y divide-slate-800/60">
                {cloudServers.map((s) => {
                  const isSelected = selectedCloudServer?.id === s.id || ip === s.ip;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectCloudServer(s)}
                      className={`p-2.5 px-3 flex items-center justify-between cursor-pointer transition text-xs ${
                        isSelected
                          ? 'bg-blue-600/20 border-l-2 border-blue-500'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="cloudServerSelect"
                          checked={isSelected}
                          onChange={() => handleSelectCloudServer(s)}
                          className="accent-blue-500"
                        />
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{s.name}</span>
                            {s.isAlreadyInAnsible && (
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700">
                                In Inventory
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {s.ip || '-'} • {s.resourceId || s.id}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.provider === 'aws' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF9900]">
                            <AwsLogo className="w-3 h-3" />
                            <span>AWS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0089D6]">
                            <AzureLogo className="w-3 h-3" />
                            <span>Azure</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{s.region}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                placeholder="e.g. ansible-worker-01"
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
                placeholder="e.g. 13.236.178.62"
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
                placeholder="e.g. 172.16.1.74"
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
                placeholder="e.g. ap-southeast-2"
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

          {/* Stored Credentials Option */}
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Shield className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Use verified SSH key / credentials from Controller ({controllerName || 'Ansible Controller'})</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white shrink-0">
              <input
                type="checkbox"
                checked={useExistingCredentials}
                onChange={(e) => setUseExistingCredentials(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>Use Stored Credentials</span>
            </label>
          </div>

          {/* SSH Secret (only shown if not using stored credentials) */}
          {!useExistingCredentials && (
            <div className="space-y-1.5 p-3 rounded-xl bg-[#090E1A] border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {authMethod === 'privateKey' ? 'SSH Private Key (.pem / id_rsa)' : 'SSH Password'}
                  <span className="text-rose-400"> *</span>
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
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 transition"
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
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              )}
            </div>
          )}

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