'use client';

import React, { useState } from 'react';
import {
  Server,
  Upload,
  Lock,
  Radio,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (serverName: string) => void;
}

export function AddServerModal({ isOpen, onClose, onSuccess }: AddServerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'ubuntu',
    authMethod: 'privateKey' as 'privateKey' | 'password',
    authSecret: '',
    cloudProvider: 'on-premise' as 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other',
    region: 'Datacenter',
    tags: 'on-prem, datacenter',
  });

  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    hint?: string;
    preview?: any;
  } | null>(null);
  const [submittingServer, setSubmittingServer] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Test Connection in Modal
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      setSubmitError(null);

      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.host,
          port: formData.port,
          username: formData.username,
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

  // Submit Add Server Form
  const handleAddServerSubmit = async (e?: React.FormEvent, allowOfflineSave: boolean = false) => {
    if (e) e.preventDefault();
    try {
      setSubmittingServer(true);
      setSubmitError(null);

      const tagArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: tagArray,
          allowOfflineSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error + (data.hint ? `\n💡 Suggestion: ${data.hint}` : ''));
        return;
      }

      onSuccess(formData.name || formData.host);
      onClose();

      // Reset form
      setFormData({
        name: '',
        host: '',
        port: 22,
        username: 'ubuntu',
        authMethod: 'privateKey',
        authSecret: '',
        cloudProvider: 'on-premise',
        region: 'Datacenter',
        tags: 'on-prem, datacenter',
      });
      setTestResult(null);
      setSubmitError(null);
    } catch (e: any) {
      setSubmitError(e.message || 'Failed to add server');
    } finally {
      setSubmittingServer(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between sticky top-0 bg-[#111A2E] z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add On-Premises Server</h3>
              <p className="text-xs text-slate-400">
                Register a bare-metal physical machine or local datacenter virtual server.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              setTestResult(null);
              setSubmitError(null);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#18233C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAddServerSubmit} className="p-6 space-y-5">
          {/* Row 1: Server Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Server Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. srv-app-prod-01 or datacenter-db-01"
              className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Row 2: Host & Port */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Host IP Address or FQDN <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="e.g. 192.168.1.100 or srv.corp.internal"
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SSH Port <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 22 })}
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Row 3: Username & Auth Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SSH Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="root, admin, or siva"
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Authentication Method <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.authMethod}
                onChange={(e) => setFormData({ ...formData, authMethod: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="privateKey">SSH Private Key (PEM/RSA/Ed25519) - Recommended</option>
                <option value="password">SSH Password</option>
              </select>
            </div>
          </div>

          {/* Row 4: Secret Key / Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="block text-xs font-semibold text-slate-300">
                {formData.authMethod === 'privateKey' ? 'SSH Private Key (PEM or PPK)' : 'SSH Password'}{' '}
                <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-3">
                {formData.authMethod === 'privateKey' && (
                  <label className="cursor-pointer text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 transition-all flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Upload .pem / .ppk key file</span>
                    <input
                      type="file"
                      accept=".pem,.ppk,.key,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const text = event.target?.result as string;
                            if (text) {
                              setFormData((prev) => ({ ...prev, authSecret: text }));
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                )}
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Encrypted at rest with AES-256-GCM</span>
                </span>
              </div>
            </div>

            {formData.authMethod === 'privateKey' ? (
              <textarea
                required
                rows={4}
                value={formData.authSecret}
                onChange={(e) => setFormData({ ...formData, authSecret: e.target.value })}
                placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;... (or PuTTY PPK key content)"
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            ) : (
              <input
                type="password"
                required
                value={formData.authSecret}
                onChange={(e) => setFormData({ ...formData, authSecret: e.target.value })}
                placeholder="Enter SSH password"
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            )}
          </div>

          {/* Row 5: Provider, Location & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Environment</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Datacenter">Datacenter (Main)</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
                <option value="Local Lab">Local Lab</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g. bare-metal, on-prem, k8s-worker"
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Connection Test Results Preview */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <strong className="block font-bold">{testResult.message || testResult.error}</strong>
                  {testResult.hint && (
                    <div className="mt-2 text-[11px] text-slate-300 bg-[#0B1120]/90 p-3 rounded-lg border border-slate-700/60 leading-relaxed">
                      <strong className="text-amber-400 block mb-0.5">💡 Configuration Diagnosis & Solution:</strong>
                      <span>{testResult.hint}</span>
                    </div>
                  )}
                </div>
              </div>

              {!testResult.success && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-rose-800/40">
                  <span className="text-[11px] text-slate-400">
                    Want to register this server now and establish connectivity later?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddServerSubmit(undefined, true)}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors shrink-0"
                  >
                    Add Server in Offline Mode
                  </button>
                </div>
              )}

              {testResult.preview && (
                <div className="mt-2.5 pt-2.5 border-t border-emerald-800/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">OS:</span>
                    <span className="font-semibold text-white">
                      {testResult.preview.os?.name} {testResult.preview.os?.version}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">CPU & RAM:</span>
                    <span className="font-semibold text-white">
                      {testResult.preview.hardware?.cpuCores} Cores, {testResult.preview.initialMemory} Used
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Docker:</span>
                    <span className="font-semibold text-white">
                      {testResult.preview.dockerDetected
                        ? `${testResult.preview.dockerContainers} containers`
                        : 'Not Installed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Kubernetes:</span>
                    <span className="font-semibold text-white">
                      {testResult.preview.k8sDetected ? 'Detected' : 'Not Detected'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="whitespace-pre-line leading-relaxed">{submitError}</span>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-rose-800/40">
                <span className="text-[11px] text-slate-400">
                  You can save this server into inventory now and troubleshoot SSH access later.
                </span>
                <button
                  type="button"
                  onClick={() => handleAddServerSubmit(undefined, true)}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  Save as Offline Server
                </button>
              </div>
            </div>
          )}

          {/* Form Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || !formData.host || !formData.authSecret}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] transition-all disabled:opacity-50"
            >
              <Radio className={`w-3.5 h-3.5 text-emerald-400 ${testingConnection ? 'animate-pulse' : ''}`} />
              <span>{testingConnection ? 'Verifying SSH...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTestResult(null);
                  setSubmitError(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submittingServer}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{submittingServer ? 'Connecting & Saving...' : 'Connect & Add Server'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
