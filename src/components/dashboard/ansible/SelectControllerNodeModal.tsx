'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Cloud,
  Terminal,
  Shield,
  Key,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Laptop,
  Check,
  Upload,
  FileText,
} from 'lucide-react';
import { AnsibleLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { DiscoveredCloudServer } from '@/lib/ansible/ansibleCloudDiscovery';

interface SelectControllerNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onControllerUpdated: () => void;
  currentControllerName?: string;
  currentControllerIp?: string;
  currentType?: string;
}

export function SelectControllerNodeModal({
  isOpen,
  onClose,
  onControllerUpdated,
  currentControllerName,
  currentControllerIp,
  currentType,
}: SelectControllerNodeModalProps) {
  const [activeTab, setActiveTab] = useState<'cloud' | 'custom' | 'local'>('cloud');

  // Cloud VMs discovery
  const [cloudServers, setCloudServers] = useState<DiscoveredCloudServer[]>([]);
  const [loadingClouds, setLoadingClouds] = useState(false);
  const [selectedCloudServer, setSelectedCloudServer] = useState<DiscoveredCloudServer | null>(null);

  // Form inputs
  const [controllerName, setControllerName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [username, setUsername] = useState('ubuntu');
  const [port, setPort] = useState(22);
  const [authMethod, setAuthMethod] = useState<'privateKey' | 'password'>('privateKey');
  const [authSecret, setAuthSecret] = useState('');
  const [useExistingCredentials, setUseExistingCredentials] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCloudServers = async () => {
    setLoadingClouds(true);
    setError(null);
    try {
      const res = await fetch('/api/ansible/hosts/import');
      const data = await res.json();
      if (res.ok) {
        setCloudServers(data.servers || []);
      } else {
        throw new Error(data.error || 'Failed to discover cloud instances');
      }
    } catch (err: any) {
      setError(err.message || 'Error discovering cloud servers');
    } finally {
      setLoadingClouds(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      fetchCloudServers();
      setSelectedCloudServer(null);
      setControllerName('');
      setIpAddress('');
      setAuthSecret('');
      setUseExistingCredentials(false);
    }
  }, [isOpen]);

  const handleSelectCloudServer = (s: DiscoveredCloudServer) => {
    setSelectedCloudServer(s);
    setControllerName(`${s.name}`);
    setIpAddress(s.ip);
    const defaultUser =
      s.username ||
      (s.provider === 'aws' ? 'ec2-user' : s.provider === 'azure' ? 'azureuser' : 'ubuntu');
    setUsername(defaultUser);
    setUseExistingCredentials(false);
    setAuthSecret('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setAuthSecret(text.trim());
        setAuthMethod('privateKey');
        setUseExistingCredentials(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveController = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    setSubmitting(true);
    try {
      let payload: any = {};

      if (activeTab === 'local') {
        payload = { type: 'local', name: 'Ansible-Controller-01' };
      } else if (activeTab === 'cloud') {
        if (!selectedCloudServer) {
          throw new Error('Please select an AWS EC2 instance or Azure VM from the list.');
        }
        if (!useExistingCredentials && !authSecret.trim()) {
          throw new Error('Please paste your SSH Private Key (.pem file) or upload your key file.');
        }

        payload = {
          type: 'cloud',
          name: controllerName.trim() || `${selectedCloudServer.name}`,
          sourceResourceId: selectedCloudServer.id,
          instanceId: selectedCloudServer.resourceId,
          ipAddress: selectedCloudServer.ip,
          privateIp: selectedCloudServer.privateIp,
          provider: selectedCloudServer.provider,
          region: selectedCloudServer.region,
          os: selectedCloudServer.os,
          username: username.trim(),
          port: Number(port) || 22,
          authMethod,
          authSecret: authSecret.trim() || undefined,
          useExistingCredentials,
        };
      } else {
        // Custom
        if (!ipAddress.trim()) {
          throw new Error('IP Address or Hostname is required.');
        }
        if (!authSecret.trim()) {
          throw new Error('SSH Private Key or Password is required.');
        }

        payload = {
          type: 'custom',
          name: controllerName.trim() || 'Ansible-Controller-Linux',
          ipAddress: ipAddress.trim(),
          provider: 'linux',
          username: username.trim(),
          port: Number(port) || 22,
          authMethod,
          authSecret: authSecret.trim(),
        };
      }

      const res = await fetch('/api/ansible/controller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to configure controller node');
      }

      if (data.warning) {
        setSuccessMsg(data.warning);
      } else {
        setSuccessMsg(data.message || 'Controller node successfully configured.');
      }

      setTimeout(() => {
        onControllerUpdated();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error configuring controller node');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#111A2E] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <AnsibleLogo className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Select Primary Ansible Controller Node
              </h3>
              <p className="text-xs text-slate-400">
                Choose the central Linux machine (AWS EC2 / Azure VM) that executes playbooks
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
        <div className="flex items-center border-b border-[#1E293B] bg-[#0D1527] px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition ${
              activeTab === 'cloud'
                ? 'border-indigo-500 text-indigo-400 bg-[#111A2E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Select Cloud Instance (AWS / Azure)</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition ${
              activeTab === 'custom'
                ? 'border-indigo-500 text-indigo-400 bg-[#111A2E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Custom Linux Server</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition ${
              activeTab === 'local'
                ? 'border-indigo-500 text-indigo-400 bg-[#111A2E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Local Machine</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Controller Indicator */}
          <div className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400">Current Active Controller:</span>
            <span className="font-mono text-indigo-300 font-semibold">
              {currentControllerName || 'Ansible-Controller-01'} ({currentControllerIp || '127.0.0.1'})
              {currentType === 'local' ? ' · Local Host' : ' · Remote'}
            </span>
          </div>

          <form onSubmit={handleSaveController} className="space-y-4">
            {/* TAB 1: Real Cloud Instance */}
            {activeTab === 'cloud' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Select Discovered Cloud VM ({cloudServers.length} Available)
                  </label>
                  <button
                    type="button"
                    onClick={fetchCloudServers}
                    disabled={loadingClouds}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingClouds ? 'animate-spin' : ''}`} />
                    <span>Scan Cloud VMs</span>
                  </button>
                </div>

                {loadingClouds ? (
                  <div className="py-10 border border-slate-800 rounded-xl bg-[#0C1324] flex items-center justify-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    <span>Discovering AWS EC2 and Azure VMs...</span>
                  </div>
                ) : cloudServers.length === 0 ? (
                  <div className="py-8 border border-slate-800 rounded-xl bg-[#0C1324] text-center px-4">
                    <Cloud className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-white">No Cloud Instances Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Check your connected AWS or Azure accounts under Cloud Accounts, or switch to the Custom Linux Server tab.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto bg-[#0C1324]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#090E1A] text-slate-400 text-[11px] uppercase border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Select</th>
                          <th className="py-2.5 px-3">Instance Name</th>
                          <th className="py-2.5 px-3">Cloud</th>
                          <th className="py-2.5 px-3">Instance ID</th>
                          <th className="py-2.5 px-3">Public IP</th>
                          <th className="py-2.5 px-3">Region</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {cloudServers.map((s) => {
                          const isSelected = selectedCloudServer?.id === s.id;
                          return (
                            <tr
                              key={s.id}
                              onClick={() => handleSelectCloudServer(s)}
                              className={`cursor-pointer transition ${
                                isSelected
                                  ? 'bg-indigo-600/20 border-l-2 border-indigo-500'
                                  : 'hover:bg-[#142038]'
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <input
                                  type="radio"
                                  name="selectedController"
                                  checked={isSelected}
                                  onChange={() => handleSelectCloudServer(s)}
                                  className="accent-indigo-500"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-white truncate max-w-[130px]">
                                {s.name}
                              </td>
                              <td className="py-2.5 px-3">
                                {s.provider === 'aws' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF9900]">
                                    <AwsLogo className="w-3.5 h-3.5" />
                                    <span>AWS</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0089D6]">
                                    <AzureLogo className="w-3.5 h-3.5" />
                                    <span>Azure</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[10px] text-slate-300 truncate max-w-[120px]">
                                {s.resourceId}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-200 text-[11px]">
                                {s.ip}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                {s.region}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Configuration for selected cloud VM */}
                {selectedCloudServer && (
                  <div className="space-y-3.5 pt-3 border-t border-[#1E293B]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Controller Node Name
                        </label>
                        <input
                          type="text"
                          value={controllerName}
                          onChange={(e) => setControllerName(e.target.value)}
                          className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          SSH Username <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-300">
                          Authentication Method:
                        </label>
                        <select
                          value={authMethod}
                          onChange={(e: any) => setAuthMethod(e.target.value)}
                          className="px-2.5 py-1 bg-[#0F172A] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                        >
                          <option value="privateKey">SSH Private Key (.pem)</option>
                          <option value="password">SSH Password</option>
                        </select>
                      </div>

                      {/* Upload PEM button */}
                      {authMethod === 'privateKey' && (
                        <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/40 inline-flex items-center gap-1.5 transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload .pem Key</span>
                          <input
                            type="file"
                            accept=".pem,.key,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Stored credentials toggle (if genuinely available) */}
                    {selectedCloudServer.hasStoredCredentials && (
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <Shield className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Platform has verified stored credentials for this VM</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                          <input
                            type="checkbox"
                            checked={useExistingCredentials}
                            onChange={(e) => setUseExistingCredentials(e.target.checked)}
                            className="accent-indigo-500 rounded"
                          />
                          <span>Use Saved Credentials</span>
                        </label>
                      </div>
                    )}

                    {/* Input secret box */}
                    {!useExistingCredentials && (
                      <div className="space-y-2 p-3 bg-[#0D1527] border border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-300">
                            {authMethod === 'privateKey'
                              ? 'SSH Private Key (.pem file content) *'
                              : 'SSH Password *'}
                          </label>
                          <span className="text-[11px] text-slate-400">Encrypted with AES-256-GCM</span>
                        </div>

                        {authMethod === 'privateKey' ? (
                          <textarea
                            rows={4}
                            required
                            placeholder="-----BEGIN RSA PRIVATE KEY----- or -----BEGIN OPENSSH PRIVATE KEY-----&#10;Paste your AWS/Azure EC2 private key content here...&#10;-----END OPENSSH PRIVATE KEY-----"
                            value={authSecret}
                            onChange={(e) => setAuthSecret(e.target.value)}
                            className="w-full px-3 py-2 bg-[#090E1A] border border-slate-700 rounded-lg text-[11px] text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                          />
                        ) : (
                          <input
                            type="password"
                            required
                            placeholder="Enter SSH password"
                            value={authSecret}
                            onChange={(e) => setAuthSecret(e.target.value)}
                            className="w-full px-3 py-2 bg-[#090E1A] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Custom Linux Server */}
            {activeTab === 'custom' && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Controller Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dedicated-Ansible-Master"
                      value={controllerName}
                      onChange={(e) => setControllerName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Public IP / Hostname <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 13.233.10.25"
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      SSH Username <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ubuntu"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      SSH Port
                    </label>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-[#0D1527] border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      SSH Private Key (.pem / id_rsa)
                    </label>
                    <label className="cursor-pointer px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[11px] font-semibold border border-indigo-500/40 inline-flex items-center gap-1 transition">
                      <Upload className="w-3 h-3" />
                      <span>Upload .pem</span>
                      <input
                        type="file"
                        accept=".pem,.key,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    value={authSecret}
                    onChange={(e) => setAuthSecret(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#090E1A] border border-slate-700 rounded-lg text-[11px] text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Local Host */}
            {activeTab === 'local' && (
              <div className="p-4 rounded-xl bg-[#0D1527] border border-slate-800 space-y-2">
                <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                  <Laptop className="w-5 h-5 text-indigo-400" />
                  <span>Local Development Environment</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Use the current machine hosting this Next.js server as the control runner. In production/cloud deployments, it is recommended to designate a dedicated Linux VM (EC2/Azure) as the primary controller.
                </p>
              </div>
            )}

            {/* Submit & Cancel Buttons */}
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
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50 transition"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting & Inspecting Controller...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      {activeTab === 'local'
                        ? 'Set Local Host as Controller'
                        : 'Test & Set as Primary Controller Node'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
