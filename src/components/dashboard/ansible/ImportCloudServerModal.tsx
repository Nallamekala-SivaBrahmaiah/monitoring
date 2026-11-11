'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Server,
  Check,
  ArrowRight,
  Shield,
  RefreshCw,
  Key,
  Globe,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Copy,
  Upload,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { DiscoveredCloudServer } from '@/lib/ansible/ansibleCloudDiscovery';

interface ImportCloudServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportCloudServerModal({ isOpen, onClose, onImported }: ImportCloudServerModalProps) {
  const [servers, setServers] = useState<DiscoveredCloudServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState<DiscoveredCloudServer | null>(null);

  // Form states
  const [customName, setCustomName] = useState('');
  const [username, setUsername] = useState('ubuntu');
  const [port, setPort] = useState(22);
  const [authMethod, setAuthMethod] = useState<'privateKey' | 'password'>('privateKey');
  const [authSecret, setAuthSecret] = useState('');
  const [useExistingCredentials, setUseExistingCredentials] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCloudServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ansible/hosts/import');
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
      fetchCloudServers();
      setSelectedServer(null);
      setError(null);
      setAuthSecret('');
      setUseExistingCredentials(false);
    }
  }, [isOpen]);

  const handleSelectServer = (server: DiscoveredCloudServer) => {
    setSelectedServer(server);
    setCustomName(server.name);
    const defaultUser =
      server.username ||
      (server.provider === 'aws' ? 'ec2-user' : server.provider === 'azure' ? 'azureuser' : 'ubuntu');
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

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer) return;

    setError(null);
    if (!useExistingCredentials && !authSecret.trim()) {
      setError('Please paste your SSH Private Key (.pem file content) or upload your key file.');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/ansible/hosts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServer.id,
          instanceId: selectedServer.resourceId,
          customName: customName.trim() || selectedServer.name,
          ip: selectedServer.ip,
          privateIp: selectedServer.privateIp,
          provider: selectedServer.provider,
          region: selectedServer.region,
          os: selectedServer.os,
          username: username.trim(),
          port: Number(port) || 22,
          authMethod,
          authSecret: authSecret.trim() || undefined,
          useExistingCredentials,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import server');
      }

      onImported();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Import Real Cloud Instances as Managed Nodes
              </h3>
              <p className="text-xs text-slate-400">
                Discover active AWS EC2 instances & Azure VMs from your connected cloud accounts
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Discovered Cloud Servers */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Step 1: Select Discovered Cloud VM ({servers.length} Available)
              </label>
              <button
                type="button"
                onClick={fetchCloudServers}
                disabled={loading}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Re-scan Cloud Accounts</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 border border-slate-800 rounded-xl bg-[#0C1324] flex items-center justify-center gap-2 text-xs text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Scanning active AWS EC2 instances and Azure Virtual Machines...</span>
              </div>
            ) : servers.length === 0 ? (
              <div className="py-10 border border-slate-800 rounded-xl bg-[#0C1324] text-center px-4">
                <Server className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-white">No Cloud Instances Discovered</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                  No active AWS EC2 instances or Azure VMs were found in your connected cloud accounts.
                  Verify your AWS/Azure credentials under Cloud Accounts, or add a custom server manually.
                </p>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-[#0C1324]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#090E1A] text-slate-400 text-[11px] uppercase border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Select</th>
                      <th className="py-2.5 px-3">Instance / VM Name</th>
                      <th className="py-2.5 px-3">Instance ID</th>
                      <th className="py-2.5 px-3">Cloud</th>
                      <th className="py-2.5 px-3">Public IP</th>
                      <th className="py-2.5 px-3">Private IP</th>
                      <th className="py-2.5 px-3">Region</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {servers.map((s) => {
                      const isSelected = selectedServer?.id === s.id;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => handleSelectServer(s)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-600/20 border-l-2 border-blue-500'
                              : 'hover:bg-[#142038]'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="radio"
                              name="selectedCloudServer"
                              checked={isSelected}
                              onChange={() => handleSelectServer(s)}
                              className="accent-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[130px]">{s.name}</span>
                              {s.isAlreadyInAnsible && (
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700">
                                  In Inventory
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-300">
                            <span className="truncate max-w-[120px] inline-block" title={s.resourceId}>
                              {s.resourceId}
                            </span>
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
                          <td className="py-2.5 px-3 font-mono text-slate-200 text-[11px]">
                            {s.ip || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[10px]">
                            {s.privateIp || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">{s.region}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                s.status?.toLowerCase().includes('running')
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Step 2: Configure & Approve Managed Node */}
          {selectedServer && (
            <form onSubmit={handleImportSubmit} className="space-y-4 pt-2 border-t border-[#1E293B]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Step 2: SSH Credentials & Node Approval
                </label>
                <div className="text-[11px] text-slate-400">
                  Target: <span className="text-indigo-400 font-mono font-semibold">{selectedServer.name}</span> ({selectedServer.ip})
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Managed Node Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Instance / Resource ID (Read-only)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={selectedServer.resourceId}
                    className="w-full px-3 py-2 bg-[#0B1020] border border-slate-800 rounded-xl text-xs text-slate-400 font-mono focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    SSH Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">SSH Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Authentication Method Selection & Upload */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Authentication Method:
                  </label>
                  <select
                    value={authMethod}
                    onChange={(e: any) => setAuthMethod(e.target.value)}
                    className="px-2.5 py-1 bg-[#0F172A] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="privateKey">SSH Private Key (.pem)</option>
                    <option value="password">SSH Password</option>
                  </select>
                </div>

                {authMethod === 'privateKey' && (
                  <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-white text-xs font-semibold border border-blue-500/40 inline-flex items-center gap-1.5 transition">
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

              {/* Stored Credentials Option (if genuinely present) */}
              {selectedServer.hasStoredCredentials && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>This server has verified encrypted credentials in your platform.</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={useExistingCredentials}
                      onChange={(e) => setUseExistingCredentials(e.target.checked)}
                      className="accent-blue-500 rounded"
                    />
                    <span>Use Stored Credentials</span>
                  </label>
                </div>
              )}

              {/* Manual Secret Input */}
              {!useExistingCredentials && (
                <div className="space-y-2 p-3.5 bg-[#0D1527] border border-slate-800 rounded-xl">
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
                      className="w-full px-3 py-2 bg-[#090E1A] border border-slate-700 rounded-lg text-[11px] text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  ) : (
                    <input
                      type="password"
                      required
                      placeholder="Enter SSH password"
                      value={authSecret}
                      onChange={(e) => setAuthSecret(e.target.value)}
                      className="w-full px-3 py-2 bg-[#090E1A] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50 transition"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Adding Managed Node...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Add as Managed Node</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
