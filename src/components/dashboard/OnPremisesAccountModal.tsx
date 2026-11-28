'use client';

import React, { useState } from 'react';
import {
  Server,
  Shield,
  Key,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCw,
  X,
  Upload,
} from 'lucide-react';

interface OnPremisesAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (serverName: string) => void;
}

export function OnPremisesAccountModal({
  isOpen,
  onClose,
  onSuccess,
}: OnPremisesAccountModalProps) {
  const [formData, setFormData] = useState({
    accountName: 'Primary On-Premises Datacenter',
    name: '',
    host: '',
    port: 22,
    username: 'siva',
    authMethod: 'password' as 'password' | 'privateKey',
    authSecret: '',
    cloudProvider: 'on-premise' as const,
    region: 'Datacenter',
    tags: 'on-prem, datacenter',
    macAddress: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    hint?: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!formData.host.trim()) {
      setTestResult({ success: false, error: 'Please enter a Host or IP address' });
      return;
    }

    try {
      setTestingConnection(true);
      setTestResult(null);
      setSubmitError(null);

      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.host.trim(),
          port: Number(formData.port) || 22,
          username: formData.username.trim(),
          authMethod: formData.authMethod,
          authSecret: formData.authSecret,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, error: e.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setFormData((prev) => ({ ...prev, authSecret: content }));
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent, allowOfflineSave: boolean = false) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.host.trim()) {
      setSubmitError('Server Name and Host / IP Address are required.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const tagArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (formData.accountName.trim()) {
        tagArray.push(`account:${formData.accountName.trim()}`);
      }
      if (formData.macAddress.trim()) {
        tagArray.push(`wol:${formData.macAddress.trim()}`);
      }

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          host: formData.host.trim(),
          port: Number(formData.port) || 22,
          username: formData.username.trim(),
          authMethod: formData.authMethod,
          authSecret: formData.authSecret,
          cloudProvider: 'on-premise',
          region: formData.region || 'Datacenter',
          tags: tagArray,
          allowOfflineSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error + (data.hint ? `\n💡 Suggestion: ${data.hint}` : ''));
        return;
      }

      onSuccess(formData.name.trim());
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save on-premise server integration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0D1526] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between bg-[#111A2E]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>On-Premises Account &amp; Server Integration</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-mono">
                  Bare-Metal / Datacenter
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Register on-premise host credentials with live SSH telemetry &amp; power control
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Section 1: Datacenter Account info */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Datacenter Account Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Account / Datacenter Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="e.g. Primary Datacenter"
                  className="w-full px-3 py-1.5 text-xs bg-[#090D16] border border-[#1E293B] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Location / Region Tag
                </label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="e.g. Datacenter Rack-01"
                  className="w-full px-3 py-1.5 text-xs bg-[#090D16] border border-[#1E293B] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Server Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Server Display Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. azure-vm, web-node-01"
                className="w-full px-3 py-1.5 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Host IP / Public Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="e.g. 172.197.248.192"
                className="w-full px-3 py-1.5 text-xs bg-[#111A2E] border border-[#1E293B] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Section 3: SSH Authentication */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>SSH Access Credentials</span>
              </div>

              {/* Auth Method Selector */}
              <div className="flex items-center gap-2 bg-[#090D16] p-0.5 rounded-lg border border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, authMethod: 'password', authSecret: '' })}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    formData.authMethod === 'password'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, authMethod: 'privateKey', authSecret: '' })}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    formData.authMethod === 'privateKey'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SSH Key
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">SSH Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="siva, ubuntu, root"
                  className="w-full px-3 py-1.5 text-xs bg-[#090D16] border border-[#1E293B] rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">SSH Port</label>
                <input
                  type="number"
                  required
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
                  className="w-full px-3 py-1.5 text-xs bg-[#090D16] border border-[#1E293B] rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {formData.authMethod === 'password' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">SSH Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.authSecret}
                    onChange={(e) => setFormData({ ...formData, authSecret: e.target.value })}
                    placeholder="Enter server user password"
                    className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#090D16] border border-[#1E293B] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Private Key (.pem / OpenSSH)
                  </label>
                  <label className="text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Upload File</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" accept=".pem,.key,.ppk,text/plain" />
                  </label>
                </div>
                <textarea
                  required
                  rows={3}
                  value={formData.authSecret}
                  onChange={(e) => setFormData({ ...formData, authSecret: e.target.value })}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                  className="w-full px-3 py-1.5 text-xs bg-[#090D16] border border-[#1E293B] rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Section 4: Hardware Power Control (Optional) */}
          <div className="bg-[#111A2E]/60 border border-[#1E293B] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wake-on-LAN MAC Address (Optional Power-On Signal)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Port 9 UDP</span>
            </div>
            <input
              type="text"
              value={formData.macAddress}
              onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
              placeholder="e.g. 00:11:22:33:44:55"
              className="w-full px-3 py-1.5 text-xs bg-[#090D16] border border-[#1E293B] rounded-lg text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Connection Test Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">
                  {testResult.success ? 'SSH Connection Verified' : 'Connection Failed'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {testResult.message || testResult.error}
                </p>
                {testResult.hint && (
                  <p className="text-[10px] text-amber-300/90 mt-1">💡 {testResult.hint}</p>
                )}
              </div>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="whitespace-pre-wrap">{submitError}</div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || submitting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-emerald-400 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Testing SSH...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white hover:bg-[#111A2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'Connecting...' : 'Save & Integrate Server'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
