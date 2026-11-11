'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Server,
  Key,
  Upload,
} from 'lucide-react';
import { IAnsibleHostData } from '@/models/AnsibleHost';

interface SetupManagedNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: IAnsibleHostData | null;
  onSetupCompleted: () => void;
}

export function SetupManagedNodeModal({
  isOpen,
  onClose,
  host,
  onSetupCompleted,
}: SetupManagedNodeModalProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  const [installing, setInstalling] = useState(false);
  const [installLogs, setInstallLogs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Optional custom SSH key
  const [customKey, setCustomKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !host) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCustomKey(content);
        setShowKeyInput(true);
      }
    };
    reader.readAsText(file);
  };

  const handleAutoSetup = async () => {
    setInstalling(true);
    setError(null);
    setSuccess(false);
    setInstallLogs(`[1/3] Connecting to managed node "${host.name}" (${host.ip}) via SSH...\n`);

    try {
      const res = await fetch(`/api/ansible/hosts/${host._id}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authSecret: customKey.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to setup managed node');
      }

      setInstallLogs(data.logs || 'Node configuration completed successfully.\n[3/3] Python environment verified. Status is now Connected!\n');
      setSuccess(true);
      onSetupCompleted();
    } catch (err: any) {
      setError(err.message || 'Error configuring managed node');
    } finally {
      setInstalling(false);
    }
  };

  const ubuntuWorkerCommands = `# Run on managed worker node (${host.name}):
sudo apt update -y
sudo apt install -y python3 python3-apt python3-pip
python3 --version`;

  const amazonWorkerCommands = `# Run on managed worker node (${host.name}):
sudo dnf install -y python3 python3-pip
python3 --version`;

  const controllerTestCommand = `# Test SSH connectivity from your Controller node to this worker:
ssh -i your-key.pem ${host.username}@${host.ip} "python3 --version"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#111A2E] border border-blue-500/30 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Setup Managed Node: {host.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
                  {host.provider.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                IP: <span className="font-mono text-indigo-300 font-semibold">{host.ip}</span> · User:{' '}
                <span className="font-mono text-slate-300">{host.username}</span>
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
            onClick={() => setActiveTab('auto')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition ${
              activeTab === 'auto'
                ? 'border-blue-500 text-blue-400 bg-[#111A2E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>1-Click Auto Setup (Recommended)</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-400 bg-[#111A2E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Manual Commands</span>
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

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Managed node successfully configured and connected! Status is now Connected.</span>
            </div>
          )}

          {/* TAB 1: Auto Setup */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0D1527] border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span>Automated Target Node Preparation</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">Zero-CLI Effort</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  The platform connects to <strong className="text-white">{host.ip}</strong> over SSH, verifies and installs Python3 runtime packages required by Ansible modules, tests SSH latency, and changes connection status to <strong className="text-emerald-400">Connected</strong>.
                </p>
              </div>

              {/* SSH Credentials Option */}
              <div className="p-3.5 rounded-xl bg-[#0A101D] border border-slate-800 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300 font-semibold">
                    <Key className="w-4 h-4 text-indigo-400" />
                    <span>SSH Authentication</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                  >
                    {showKeyInput ? 'Use Default / Controller Key' : 'Provide Custom .pem Key'}
                  </button>
                </div>

                {!showKeyInput ? (
                  <p className="text-[11px] text-slate-400">
                    Will use existing node key or automatically inherit the SSH key uploaded for the Primary Controller.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Private Key (.pem):</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 border border-slate-700 transition"
                      >
                        <Upload className="w-3 h-3 text-indigo-400" />
                        <span>Upload .pem</span>
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pem,.key,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <textarea
                      rows={3}
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                      className="w-full p-2 bg-[#060A12] border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {!installing && !installLogs && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleAutoSetup}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-xl shadow-blue-600/30 flex items-center gap-2 transition"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Auto-Setup & Connect Node Now</span>
                  </button>
                </div>
              )}

              {/* Progress Terminal */}
              {(installing || installLogs) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      <span>Setup Progress Logs</span>
                    </span>
                    {installing && (
                      <span className="text-[11px] text-blue-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Configuring worker node packages...</span>
                      </span>
                    )}
                  </div>
                  <div className="bg-[#090E1A] border border-slate-800 rounded-xl p-3.5 font-mono text-[11px] text-slate-300 max-h-52 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                    {installLogs}
                  </div>
                  {!installing && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleAutoSetup}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Re-run Setup</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Manual Commands */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                To prepare this worker node manually, run the following commands on the server:
              </p>

              {/* Ubuntu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">For Ubuntu / Debian</span>
                  <button
                    onClick={() => handleCopy(ubuntuWorkerCommands, 'ub-worker')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    {copiedSection === 'ub-worker' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedSection === 'ub-worker' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#090E1A] border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {ubuntuWorkerCommands}
                </pre>
              </div>

              {/* Amazon Linux */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">For Amazon Linux 2023 / RHEL</span>
                  <button
                    onClick={() => handleCopy(amazonWorkerCommands, 'amz-worker')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    {copiedSection === 'amz-worker' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedSection === 'amz-worker' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#090E1A] border border-slate-800 rounded-xl text-[11px] font-mono text-indigo-300 overflow-x-auto leading-relaxed">
                  {amazonWorkerCommands}
                </pre>
              </div>

              {/* Controller Test */}
              <div className="space-y-1.5 pt-2 border-t border-[#1E293B]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Verify from Controller Node</span>
                  <button
                    onClick={() => handleCopy(controllerTestCommand, 'ctrl-test')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    {copiedSection === 'ctrl-test' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedSection === 'ctrl-test' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#090E1A] border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                  {controllerTestCommand}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#1E293B] bg-[#0D1527]">
          <span className="text-[11px] text-slate-400">
            Click Done to close and view updated connection status.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                onSetupCompleted();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
            >
              Done / Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
