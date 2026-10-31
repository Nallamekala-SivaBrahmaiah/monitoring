'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Upload,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Layers,
  Cpu,
  HardDrive,
  Activity,
  FileKey,
} from 'lucide-react';
import { DockerIcon, KubernetesIcon } from '@/components/icons/CloudIcons';

export interface ConnectSSHTarget {
  id?: string;
  name: string;
  host: string;
  port?: number;
  cloudProvider?: 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other';
  region?: string;
  os?: string;
}

interface ConnectSSHModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ConnectSSHTarget | null;
  onSuccess?: (serverData: any) => void;
}

export function ConnectSSHModal({
  isOpen,
  onClose,
  target,
  onSuccess,
}: ConnectSSHModalProps) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('azureuser');
  const [authMethod, setAuthMethod] = useState<'privateKey' | 'password'>('privateKey');
  const [authSecret, setAuthSecret] = useState('');
  const [keyFileName, setKeyFileName] = useState<string | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setName(target.name || '');
      setHost(target.host && target.host !== '-' ? target.host : '');
      setPort(target.port || 22);

      // Intelligent default username based on provider
      if (target.cloudProvider === 'azure') {
        setUsername('azureuser');
      } else if (target.cloudProvider === 'aws') {
        setUsername('ubuntu');
      } else {
        setUsername('ubuntu');
      }

      setAuthMethod('privateKey');
      setAuthSecret('');
      setKeyFileName(null);
      setTestResult(null);
      setSubmitError(null);
    }
  }, [target]);

  if (!isOpen || !target) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKeyFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setAuthSecret(text);
          setTestResult(null);
          setSubmitError(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTestConnection = async () => {
    if (!host || !username || !authSecret) {
      setSubmitError('Please provide host IP, SSH username, and private key / password before testing.');
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      setSubmitError(null);

      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port: Number(port) || 22,
          username: username.trim(),
          authMethod,
          authSecret,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnectAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host || !username || !authSecret) {
      setSubmitError('Please fill in all required fields (Host IP, SSH username, and key/password).');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || target.name,
          host: host.trim(),
          port: Number(port) || 22,
          username: username.trim(),
          authMethod,
          authSecret,
          cloudProvider: target.cloudProvider || 'other',
          region: target.region || 'global',
          tags: ['ssh-connected', target.cloudProvider || 'vm'],
          allowOfflineSave: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error + (data.hint ? `\n💡 Hint: ${data.hint}` : ''));
        return;
      }

      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to connect server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between sticky top-0 bg-[#111A2E] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Connect SSH Monitoring</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                  {target.cloudProvider || 'VM'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct SSH telemetry for <span className="text-white font-semibold">{target.name}</span> ({target.host})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#18233C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleConnectAndSave} className="p-6 space-y-4 flex-1">
          {/* Server Info Badge */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-200">{target.name}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>IP: {host || 'Pending IP'}</span>
              <span>•</span>
              <span>Region: {target.region || 'global'}</span>
            </div>
          </div>

          {/* Row: Host IP & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Server IP / Host <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g. 68.210.185.121"
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                SSH Port <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 22)}
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Row: Username & Auth Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                SSH Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="azureuser, ubuntu, ec2-user, root"
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Auth Type <span className="text-rose-400">*</span>
              </label>
              <select
                value={authMethod}
                onChange={(e) => setAuthMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="privateKey">Private Key (.pem / .ppk)</option>
                <option value="password">Password</option>
              </select>
            </div>
          </div>

          {/* Secret / Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="block text-xs font-semibold text-slate-300">
                {authMethod === 'privateKey' ? 'SSH Private Key (.pem or .ppk)' : 'SSH Password'}{' '}
                <span className="text-rose-400">*</span>
              </label>

              {authMethod === 'privateKey' && (
                <label className="cursor-pointer text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md border border-blue-500/30 transition-all flex items-center gap-1.5">
                  <Upload className="w-3 h-3" />
                  <span>{keyFileName ? keyFileName : 'Upload .pem or .ppk file'}</span>
                  <input
                    type="file"
                    accept=".pem,.ppk,.key,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>

            {authMethod === 'privateKey' ? (
              <textarea
                required
                rows={5}
                value={authSecret}
                onChange={(e) => setAuthSecret(e.target.value)}
                placeholder="Paste OpenSSH PEM key (-----BEGIN RSA/OPENSSH PRIVATE KEY-----) or PuTTY PPK file content here..."
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
              />
            ) : (
              <input
                type="password"
                required
                value={authSecret}
                onChange={(e) => setAuthSecret(e.target.value)}
                placeholder="Enter SSH password"
                className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span className="flex items-center gap-1 text-slate-400">
                <FileKey className="w-3 h-3 text-cyan-400" />
                <span>Supports PuTTY .ppk and OpenSSH .pem keys</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Lock className="w-2.5 h-2.5" />
                <span>Encrypted with AES-256-GCM</span>
              </span>
            </div>
          </div>

          {/* Test Connection Result Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs animate-fade-in ${
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
                <div className="space-y-1.5 flex-1">
                  <span className="font-bold block">
                    {testResult.success ? 'SSH Connection Verified & Verified Host' : 'Connection Failed'}
                  </span>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {testResult.message || testResult.error}
                  </p>

                  {testResult.preview && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-400 block">OS</span>
                        <span className="text-white font-bold">{testResult.preview.os?.name} {testResult.preview.os?.version}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Live CPU / RAM</span>
                        <span className="text-emerald-400 font-bold">{testResult.preview.initialCpu} / {testResult.preview.initialMemory}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Docker</span>
                        <span className="text-blue-400 font-bold">
                          {testResult.preview.dockerDetected ? `${testResult.preview.dockerContainers} containers` : 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Kubernetes</span>
                        <span className="text-indigo-400 font-bold">
                          {testResult.preview.k8sDetected ? 'Detected' : 'None'}
                        </span>
                      </div>
                    </div>
                  )}

                  {testResult.hint && (
                    <p className="text-[10px] text-amber-300/90 pt-1">
                      💡 {testResult.hint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line text-[11px]">{submitError}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isTesting || isSubmitting || !authSecret}
              onClick={handleTestConnection}
              className="px-3.5 py-2 rounded-lg bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isTesting ? 'Testing SSH...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#18233C] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !authSecret}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting & Collecting Metrics...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Connect & Start Monitoring</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
