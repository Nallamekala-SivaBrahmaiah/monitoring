'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Server,
  Check,
  RefreshCw,
  Key,
  Shield,
  CheckCircle2,
  AlertCircle,
  Plus,
  Terminal,
  Layers,
  Copy,
  Sliders,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { DiscoveredCloudServer } from '@/lib/ansible/ansibleCloudDiscovery';
import { IAnsibleControllerData } from '@/models/AnsibleController';

interface ImportCloudServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  controllerId?: string;
  controllerName?: string;
  controller?: IAnsibleControllerData | null;
}

export function ImportCloudServerModal({
  isOpen,
  onClose,
  onImported,
  controllerId,
  controllerName,
  controller,
}: ImportCloudServerModalProps) {
  const [activeTab, setActiveTab] = useState<'cloud' | 'custom'>('cloud');

  // Cloud discovery state
  const [servers, setServers] = useState<DiscoveredCloudServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Custom manual node state
  const [customName, setCustomName] = useState('');
  const [customIp, setCustomIp] = useState('');
  const [customPrivateIp, setCustomPrivateIp] = useState('');
  const [customProvider, setCustomProvider] = useState<'aws' | 'azure' | 'linux'>('linux');
  const [customRegion, setCustomRegion] = useState('ap-southeast-2');
  const [customOs, setCustomOs] = useState('Ubuntu 22.04 LTS');
  const [customUsername, setCustomUsername] = useState('ubuntu');
  const [customPort, setCustomPort] = useState(22);
  const [customAuthMethod, setCustomAuthMethod] = useState<'privateKey' | 'password'>('privateKey');
  const [customAuthSecret, setCustomAuthSecret] = useState('');
  const [useExistingCredentials, setUseExistingCredentials] = useState(true);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const effectiveControllerId = controllerId || controller?._id;
  const effectiveControllerName = controllerName || controller?.name || 'Selected Controller';

  const fetchCloudServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = effectiveControllerId
        ? `/api/ansible/hosts/import?controllerId=${encodeURIComponent(effectiveControllerId)}`
        : '/api/ansible/hosts/import';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setServers(data.servers || []);
      } else {
        throw new Error(data.error || 'Failed to discover cloud servers');
      }
    } catch (err: any) {
      setError(err.message || 'Error discovering servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setSelectedIds(new Set());
      setCustomName('');
      setCustomIp('');
      setCustomPrivateIp('');
      setCustomAuthSecret('');
      setUseExistingCredentials(true);
      fetchCloudServers();
    }
  }, [isOpen, effectiveControllerId]);

  if (!isOpen) return null;

  // Toggle single instance selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === servers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(servers.map((s) => s.id)));
    }
  };

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit selected cloud instances
  const handleRegisterSelectedCloudWorkers = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one cloud instance to register as a managed worker.');
      return;
    }
    if (!effectiveControllerId) {
      setError('No target controller selected. Please select a controller first.');
      return;
    }

    const selectedServers = servers.filter((s) => selectedIds.has(s.id));
    setSubmitting(true);
    setError(null);

    try {
      // Build worker payload list
      const workersPayload = selectedServers.map((s) => ({
        serverId: s.sshServerId || s.id,
        instanceId: s.resourceId,
        name: s.name,
        ip: s.ip,
        privateIp: s.privateIp,
        provider: s.provider,
        region: s.region,
        os: s.os,
        username: s.username,
        useExistingCredentials: true,
      }));

      // Call nested controller worker registration endpoint
      const res = await fetch(`/api/ansible/controllers/${effectiveControllerId}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workers: workersPayload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register workers');
      }

      setSuccessMsg(`Successfully registered ${selectedServers.length} managed worker(s) under "${effectiveControllerName}"!`);
      setTimeout(() => {
        onImported();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit manual custom node
  const handleRegisterCustomWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customIp.trim()) {
      setError('Worker Name and IP Address are required.');
      return;
    }
    if (!effectiveControllerId) {
      setError('No target controller selected.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/ansible/controllers/${effectiveControllerId}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName.trim(),
          ip: customIp.trim(),
          privateIp: customPrivateIp.trim() || undefined,
          provider: customProvider,
          region: customRegion.trim(),
          os: customOs.trim(),
          username: customUsername.trim(),
          port: Number(customPort) || 22,
          authMethod: customAuthMethod,
          authSecret: customAuthSecret.trim() || undefined,
          useExistingCredentials,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register custom worker');
      }

      setSuccessMsg(`Successfully registered worker "${customName}" under "${effectiveControllerName}"!`);
      setTimeout(() => {
        onImported();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to register custom worker');
    } finally {
      setSubmitting(false);
    }
  };

  const isAllSelected = servers.length > 0 && selectedIds.size === servers.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#1E293B] bg-gradient-to-r from-[#111A2E] to-[#0F172A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Add Managed Workers to Controller
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span>Target Controller:</span>
                <span className="font-semibold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  {effectiveControllerName}
                </span>
                {controller?.ipAddress && (
                  <span className="font-mono text-slate-400">({controller.ipAddress})</span>
                )}
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

        {/* Tab Selection */}
        <div className="flex items-center border-b border-[#1E293B] bg-[#090E1A] px-5 py-2.5 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${
              activeTab === 'cloud'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Discover Cloud Instances (AWS EC2 & Azure VMs)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {servers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${
              activeTab === 'custom'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Manual Linux Server (Custom IP)</span>
          </button>
        </div>

        {/* Alerts */}
        <div className="px-5 pt-3">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'cloud' ? (
            <div>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Available Discovered Cloud Instances</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
                      {servers.length}
                    </span>
                  </label>
                  {selectedIds.size > 0 && (
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      ✓ {selectedIds.size} Selected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchCloudServers}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                    <span>{loading ? 'Scanning...' : 'Re-scan Cloud'}</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-16 border border-slate-800 rounded-xl bg-[#0C1324] flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  <span className="font-semibold text-slate-300 mt-2">
                    Scanning active AWS EC2 instances and Azure Virtual Machines...
                  </span>
                  <span className="text-[11px] text-slate-500">Checking credentials and network availability</span>
                </div>
              ) : servers.length === 0 ? (
                <div className="py-14 border border-slate-800 rounded-xl bg-[#0C1324] text-center px-4">
                  <Server className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">No Cloud Instances Found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    No active AWS EC2 instances or Azure VMs were found in your connected cloud accounts.
                    Make sure your AWS and Azure credentials are added under Cloud Accounts.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0C1324]">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#090E1A] text-slate-400 text-[11px] uppercase border-b border-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={handleToggleSelectAll}
                              className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              title="Select / Deselect All"
                            />
                          </th>
                          <th className="py-2.5 px-3">Instance / VM Name</th>
                          <th className="py-2.5 px-3">Cloud</th>
                          <th className="py-2.5 px-3">Public IP</th>
                          <th className="py-2.5 px-3">Private IP</th>
                          <th className="py-2.5 px-3">Region</th>
                          <th className="py-2.5 px-3">Credentials</th>
                          <th className="py-2.5 px-3">Inventory Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {servers.map((s) => {
                          const isSelected = selectedIds.has(s.id);
                          return (
                            <tr
                              key={s.id}
                              onClick={() => handleToggleSelect(s.id)}
                              className={`cursor-pointer transition ${
                                isSelected
                                  ? 'bg-blue-600/15 border-l-2 border-blue-500'
                                  : 'hover:bg-[#142038]'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(s.id)}
                                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-white">
                                <div className="flex items-center gap-2">
                                  <span>{s.name}</span>
                                  {s.resourceId && (
                                    <span
                                      className="font-mono text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded cursor-copy hover:text-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(s.resourceId, s.id);
                                      }}
                                      title="Copy Resource ID"
                                    >
                                      {copiedId === s.id ? 'Copied!' : s.resourceId}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                {s.provider === 'aws' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                                    <AwsLogo className="w-3.5 h-3.5" />
                                    <span>AWS EC2</span>
                                  </span>
                                ) : s.provider === 'azure' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                                    <AzureLogo className="w-3.5 h-3.5" />
                                    <span>Azure VM</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                                    <Server className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Linux</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-200">
                                {s.ip || '-'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-400">
                                {s.privateIp || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {s.region}
                              </td>
                              <td className="py-2.5 px-3">
                                {s.hasStoredCredentials ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                    <Shield className="w-3 h-3" />
                                    <span>Key Verified</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                                    <span>Inherit SSH</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {s.isAlreadyInAnsible ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3 text-blue-400" />
                                    <span>Registered</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-emerald-400">
                                    Ready to Add
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer info */}
                  <div className="p-3 bg-[#090E1A] border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>
                      {selectedIds.size} of {servers.length} instances selected for assignment
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Credentials are automatically linked from server monitoring
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Custom Manual Node Form */
            <form onSubmit={handleRegisterCustomWorker} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Worker Node Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. worker-node-01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Public IP Address / Hostname <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="e.g. 54.210.12.34"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Private IP Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={customPrivateIp}
                    onChange={(e) => setCustomPrivateIp(e.target.value)}
                    placeholder="e.g. 172.31.10.5"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cloud Provider</label>
                  <select
                    value={customProvider}
                    onChange={(e) => setCustomProvider(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="aws">Amazon Web Services (AWS EC2)</option>
                    <option value="azure">Microsoft Azure (Virtual Machine)</option>
                    <option value="linux">Custom Linux Server</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">SSH Username</label>
                  <input
                    type="text"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    placeholder="e.g. ubuntu, ec2-user, azureuser"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">SSH Port</label>
                  <input
                    type="number"
                    value={customPort}
                    onChange={(e) => setCustomPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-semibold mt-2">
                  <input
                    type="checkbox"
                    checked={useExistingCredentials}
                    onChange={(e) => setUseExistingCredentials(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Automatically inherit verified SSH credentials from Controller / Monitoring</span>
                </label>
              </div>

              {!useExistingCredentials && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    SSH Private Key (.pem content)
                  </label>
                  <textarea
                    rows={4}
                    value={customAuthSecret}
                    onChange={(e) => setCustomAuthSecret(e.target.value)}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-5 border-t border-[#1E293B] bg-[#090E1A] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            Cancel
          </button>

          {activeTab === 'cloud' ? (
            <button
              type="button"
              onClick={handleRegisterSelectedCloudWorkers}
              disabled={submitting || selectedIds.size === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Registering Workers...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>
                    Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Managed Worker
                    {selectedIds.size !== 1 ? 's' : ''} to {effectiveControllerName}
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRegisterCustomWorker}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Register Custom Worker</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
