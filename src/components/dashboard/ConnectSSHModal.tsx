'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  KeyRound,
  Upload,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Terminal,
  Shield,
  FileKey,
  Layers,
  Cpu,
  HardDrive,
  Activity,
  Check,
  FileText,
  Trash2,
} from 'lucide-react';

export interface ConnectSSHTarget {
  id?: string;
  name: string;
  host: string;
  port?: number;
  username?: string;
  authMethod?: 'privateKey' | 'password';
  cloudProvider?: 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other';
  region?: string;
  os?: string;
  cloudResourceId?: string;
  instanceId?: string;
  hasSavedKey?: boolean;
}

interface ConnectSSHModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ConnectSSHTarget | null;
  onSuccess?: (serverData: any) => void;
}

type AuthTypeSelection = 'password' | 'privateKey_pem' | 'privateKey_ppk' | 'privateKey_openssh';

export function ConnectSSHModal({
  isOpen,
  onClose,
  target,
  onSuccess,
}: ConnectSSHModalProps) {
  const [mounted, setMounted] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('ubuntu');
  const [selectedAuthType, setSelectedAuthType] = useState<AuthTypeSelection>('privateKey_pem');
  const [authSecret, setAuthSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [keyFileName, setKeyFileName] = useState<string | null>(null);
  const [keyFileSize, setKeyFileSize] = useState<string | null>(null);

  // Operational State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mount check for React Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync state when target server changes
  useEffect(() => {
    if (target) {
      setName(target.name || '');
      setHost(target.host && target.host !== '-' ? target.host : '');
      setPort(target.port || 22);

      // Intelligent default username based on provider or existing target
      const isAzure =
        target.cloudProvider === 'azure' ||
        target.name?.toLowerCase().includes('azure') ||
        target.host?.startsWith('20.') ||
        target.host?.startsWith('4.');

      if (target.username) {
        setUsername(target.username);
      } else if (isAzure) {
        setUsername('siva');
      } else {
        setUsername('ubuntu');
      }

      if (target.authMethod === 'password') {
        setSelectedAuthType('password');
      } else if (isAzure && !target.hasSavedKey) {
        setSelectedAuthType('password');
      } else {
        setSelectedAuthType('privateKey_pem');
      }

      setAuthSecret('');
      setPassphrase('');
      setShowPassword(false);
      setShowPassphrase(false);
      setKeyFileName(null);
      setKeyFileSize(null);
      setTestResult(null);
      setSubmitError(null);
    }
  }, [target]);

  if (!isOpen || !target || !mounted) return null;

  // File Upload Handler (.pem, .ppk, .key)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKeyFileName(file.name);
      setKeyFileSize(
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`
      );

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setAuthSecret(text);
          setTestResult(null);
          setSubmitError(null);

          // Auto-detect format and update dropdown
          const trimmed = text.trim();
          if (trimmed.startsWith('PuTTY-User-Key-File')) {
            setSelectedAuthType('privateKey_ppk');
          } else if (trimmed.includes('BEGIN OPENSSH PRIVATE KEY')) {
            setSelectedAuthType('privateKey_openssh');
          } else if (trimmed.includes('BEGIN RSA PRIVATE KEY') || trimmed.includes('BEGIN PRIVATE KEY')) {
            setSelectedAuthType('privateKey_pem');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClearUploadedFile = () => {
    setKeyFileName(null);
    setKeyFileSize(null);
    setAuthSecret('');
    setTestResult(null);
    setSubmitError(null);
  };

  // Test Connection Action
  const handleTestConnection = async () => {
    if (!host || !username) {
      setSubmitError('Please provide server IP / Host and SSH username.');
      return;
    }

    if (!authSecret && !target.hasSavedKey) {
      setSubmitError(
        selectedAuthType === 'password'
          ? 'Please enter the SSH password before testing.'
          : 'Please enter or upload an SSH private key before testing.'
      );
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      setSubmitError(null);

      const actualAuthMethod = selectedAuthType === 'password' ? 'password' : 'privateKey';

      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port: Number(port) || 22,
          username: username.trim(),
          authMethod: actualAuthMethod,
          authSecret: authSecret ? authSecret.trim() : undefined,
          passphrase: passphrase ? passphrase.trim() : undefined,
          serverId: target.id,
          instanceId: target.instanceId || target.cloudResourceId,
          name: target.name,
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

  // Connect & Establish SSH Session
  const handleConnectAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!host || !username) {
      setSubmitError('Please fill in required fields (Server IP / Host and SSH username).');
      return;
    }

    if (!authSecret && !target.hasSavedKey) {
      setSubmitError(
        selectedAuthType === 'password'
          ? 'Please provide the SSH password to connect.'
          : 'Please provide or upload a private key (.pem or .ppk) to connect.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const actualAuthMethod = selectedAuthType === 'password' ? 'password' : 'privateKey';

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: target.id,
          instanceId: target.instanceId || target.cloudResourceId,
          name: name.trim() || target.name,
          host: host.trim(),
          port: Number(port) || 22,
          username: username.trim(),
          authMethod: actualAuthMethod,
          authSecret: authSecret ? authSecret.trim() : undefined,
          passphrase: passphrase ? passphrase.trim() : undefined,
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

  const isPasswordAuth = selectedAuthType === 'password';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0D1526] border border-[#1E293B] rounded-2xl w-full max-w-[680px] md:max-w-[720px] max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ssh-modal-title"
      >
        {/* 1. Header (Sticky Top) */}
        <div className="sticky top-0 bg-[#0D1526]/95 backdrop-blur-md border-b border-[#1E293B] px-5 sm:px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-cyan-950/40">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="ssh-modal-title" className="text-base font-bold text-white tracking-tight">
                  SSH Connection
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase">
                  {target.cloudProvider || 'Linux Server'}
                </span>
                {target.region && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18233C] text-slate-300 border border-[#1E293B] uppercase">
                    {target.region}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                Configure authentication & connect to <span className="text-white font-semibold">{target.name}</span> ({target.host || 'Pending IP'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {target.hasSavedKey && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                <Check className="w-3 h-3" /> Saved Credentials
              </span>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#18233C] transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Modal Form Body */}
        <form onSubmit={handleConnectAndSave} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 text-xs">
          {/* Server Info Summary Card */}
          <div className="bg-[#080E1C] border border-[#1A2642] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Server className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-white truncate text-xs">{target.name}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>Host IP: <span className="text-cyan-300 font-mono font-medium">{host || 'Not Assigned'}</span></span>
                  <span>•</span>
                  <span>Port: <span className="font-mono text-slate-300">{port}</span></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ready to Connect</span>
              </span>
            </div>
          </div>

          {/* Form Row 1: Host IP & SSH Port */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Server IP / Host <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g. 4.240.105.247 or 15.135.74.255"
                className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                SSH Port <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 22)}
                className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Form Row 2: SSH Username & Authentication Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                SSH Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="siva, ubuntu, ec2-user, root"
                className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Authentication Type <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedAuthType}
                onChange={(e) => {
                  setSelectedAuthType(e.target.value as AuthTypeSelection);
                  setTestResult(null);
                  setSubmitError(null);
                }}
                className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer transition-colors"
              >
                <option value="password">Password</option>
                <option value="privateKey_pem">Private Key (.pem)</option>
                <option value="privateKey_ppk">PuTTY Private Key (.ppk)</option>
                <option value="privateKey_openssh">OpenSSH Private Key</option>
              </select>
            </div>
          </div>

          {/* Dynamic Authentication Fields */}
          {isPasswordAuth ? (
            /* PASSWORD AUTHENTICATION FIELD */
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                SSH Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!target.hasSavedKey}
                  value={authSecret}
                  onChange={(e) => {
                    setAuthSecret(e.target.value);
                    setTestResult(null);
                    setSubmitError(null);
                  }}
                  placeholder={
                    target.hasSavedKey
                      ? '•••••••••••• (Leave blank to use existing saved password)'
                      : 'Enter SSH password'
                  }
                  className="w-full pl-3 pr-10 py-2 bg-[#080E1C] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>Password is encrypted with AES-256-GCM before secure storage.</span>
              </p>
            </div>
          ) : (
            /* PRIVATE KEY AUTHENTICATION FIELDS */
            <div className="space-y-3">
              {/* Private Key Header with File Upload Button */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-xs font-semibold text-slate-200">
                  {selectedAuthType === 'privateKey_ppk'
                    ? 'PuTTY Private Key (.ppk)'
                    : selectedAuthType === 'privateKey_openssh'
                    ? 'OpenSSH Private Key'
                    : 'SSH Private Key (.pem)'}{' '}
                  <span className="text-rose-400">*</span>
                </label>

                <label className="cursor-pointer text-[11px] font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-md border border-cyan-500/30 transition-all flex items-center gap-1.5">
                  <Upload className="w-3 h-3" />
                  <span>Upload .pem / .ppk file</span>
                  <input
                    type="file"
                    accept=".pem,.ppk,.key,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {/* Uploaded File Badge */}
              {keyFileName && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span className="font-mono truncate">{keyFileName}</span>
                    {keyFileSize && <span className="text-[10px] text-cyan-400/80 shrink-0">({keyFileSize})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearUploadedFile}
                    className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400 hover:text-rose-300 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Private Key Textarea */}
              <textarea
                required={!target.hasSavedKey}
                rows={5}
                value={authSecret}
                onChange={(e) => {
                  setAuthSecret(e.target.value);
                  setTestResult(null);
                  setSubmitError(null);
                }}
                placeholder={
                  target.hasSavedKey && !authSecret
                    ? 'Existing encrypted private key saved in database.\n(Paste a new key or upload a file only if you wish to overwrite it)'
                    : selectedAuthType === 'privateKey_ppk'
                    ? 'PuTTY-User-Key-File-2: ssh-rsa\nEncryption: none\nComment: rsa-key-2026\nPublic-Lines: ...\nPrivate-Lines: ...'
                    : selectedAuthType === 'privateKey_openssh'
                    ? '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAA...\n-----END OPENSSH PRIVATE KEY-----'
                    : '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'
                }
                className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed transition-colors"
              />

              {/* Optional Passphrase Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Private Key Passphrase <span className="text-slate-500 font-normal">(optional - only for encrypted keys)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase if key is encrypted"
                    className="w-full pl-3 pr-10 py-2 bg-[#080E1C] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded transition-colors"
                    title={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  >
                    {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Support Notice */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                <FileKey className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Supports PuTTY .ppk (v2/v3) and OpenSSH .pem private keys with seamless auto-conversion.</span>
              </div>
            </div>
          )}

          {/* Test Connection Result Preview */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs animate-in fade-in duration-150 ${
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
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="font-bold block text-sm">
                    {testResult.success ? 'SSH Connection Verified' : 'Connection Failed'}
                  </span>
                  <p className="text-[11px] leading-relaxed opacity-90 break-words">
                    {testResult.message || testResult.error}
                  </p>

                  {testResult.preview && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-400 block">OS</span>
                        <span className="text-white font-bold truncate block">
                          {testResult.preview.os?.name} {testResult.preview.os?.version}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">CPU / RAM</span>
                        <span className="text-emerald-400 font-bold block">
                          {testResult.preview.initialCpu || 'Active'} / {testResult.preview.initialMemory || 'Active'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Docker</span>
                        <span className="text-cyan-400 font-bold block">
                          {testResult.preview.dockerDetected ? `${testResult.preview.dockerContainers} containers` : 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Kubernetes</span>
                        <span className="text-indigo-400 font-bold block">
                          {testResult.preview.k8sDetected ? 'Detected' : 'None'}
                        </span>
                      </div>
                    </div>
                  )}

                  {testResult.hint && (
                    <p className="text-[10px] text-amber-300/90 pt-1 leading-normal">
                      💡 {testResult.hint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Error Banner */}
          {submitError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line text-[11px] leading-relaxed break-words">{submitError}</div>
            </div>
          )}

          {/* 3. Action Footer (Sticky Bottom) */}
          <div className="sticky bottom-0 bg-[#0D1526]/95 backdrop-blur-md border-t border-[#1E293B] -mx-5 sm:-mx-6 -mb-5 px-5 sm:px-6 py-4 flex items-center justify-between gap-3 z-10">
            <button
              type="button"
              disabled={isTesting || isSubmitting || (!authSecret && !target.hasSavedKey)}
              onClick={handleTestConnection}
              className="px-3.5 py-2 rounded-lg bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isTesting ? 'Testing SSH...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#18233C] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!authSecret && !target.hasSavedKey)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Connect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
