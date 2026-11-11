'use client';

import React, { useState } from 'react';
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
  Code,
  Shield,
} from 'lucide-react';
import { AnsibleLogo } from '@/components/icons/CloudIcons';
import { AnsibleControllerInfo } from './AnsibleControllerNodeCard';

interface SetupAnsibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  controller: AnsibleControllerInfo | null;
  onInstalled: () => void;
}

export function SetupAnsibleModal({
  isOpen,
  onClose,
  controller,
  onInstalled,
}: SetupAnsibleModalProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  const [installing, setInstalling] = useState(false);
  const [installLogs, setInstallLogs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleAutoInstall = async () => {
    setInstalling(true);
    setError(null);
    setSuccess(false);
    setInstallLogs('Connecting to controller node via SSH and launching automated setup...\n');

    try {
      const res = await fetch('/api/ansible/controller/install', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to install Ansible on controller');
      }

      setInstallLogs(data.logs || 'Ansible installation completed successfully.\n');
      setSuccess(true);
      onInstalled();
    } catch (err: any) {
      setError(err.message || 'Installation encountered an error');
    } finally {
      setInstalling(false);
    }
  };

  const ubuntuCommands = `# 1. Update package repository
sudo apt update -y

# 2. Install software properties & Ansible
sudo apt install -y software-properties-common
sudo apt-add-repository --yes --update ppa:ansible/ansible
sudo apt install -y ansible python3-pip

# 3. Verify installation
ansible --version`;

  const amazonLinuxCommands = `# 1. Install Ansible & Python packages
sudo dnf install -y ansible python3-pip

# 2. Verify installation
ansible --version`;

  const sshKeySetup = `# On your Controller node (ansible-controller), copy your .pem key
# or generate an SSH key to access worker nodes:
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# Test SSH connection to worker node:
ssh -i /path/to/key.pem ubuntu@<WORKER_IP> "echo Connected!"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#111A2E] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <AnsibleLogo className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Setup Ansible on Controller Node
              </h3>
              <p className="text-xs text-slate-400">
                Target: <span className="font-mono text-indigo-300 font-semibold">{controller?.name}</span> ({controller?.ipAddress})
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
                ? 'border-indigo-500 text-indigo-400 bg-[#111A2E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>1-Click Auto Install (Recommended)</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition ${
              activeTab === 'manual'
                ? 'border-indigo-500 text-indigo-400 bg-[#111A2E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Manual SSH Commands</span>
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
              <span>Ansible has been successfully installed and verified on your controller node!</span>
            </div>
          )}

          {/* TAB 1: Auto Install */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0D1527] border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span>Automated In-Guest Installation</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{controller?.os}</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  The platform will automatically connect to <strong className="text-white">{controller?.ipAddress}</strong> over SSH using your saved credentials, detect the operating system package manager (<code className="text-indigo-300">apt</code> or <code className="text-indigo-300">dnf</code>), install Ansible Core and Python packages, and refresh the controller specifications.
                </p>
              </div>

              {!installing && !installLogs && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleAutoInstall}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Automated Ansible Setup Now</span>
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
                      <span className="text-[11px] text-indigo-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Installing packages on remote host...</span>
                      </span>
                    )}
                  </div>
                  <div className="bg-[#090E1A] border border-slate-800 rounded-xl p-3.5 font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                    {installLogs}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Manual Terminal Commands */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                You can also SSH into your controller server directly and run these commands to install Ansible:
              </p>

              {/* Ubuntu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">For Ubuntu / Debian (AWS EC2 Ubuntu)</span>
                  <button
                    onClick={() => handleCopy(ubuntuCommands, 'ubuntu')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    {copiedSection === 'ubuntu' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedSection === 'ubuntu' ? 'Copied' : 'Copy Commands'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#090E1A] border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {ubuntuCommands}
                </pre>
              </div>

              {/* Amazon Linux 2023 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">For Amazon Linux 2023 / RHEL</span>
                  <button
                    onClick={() => handleCopy(amazonLinuxCommands, 'amazon')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    {copiedSection === 'amazon' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedSection === 'amazon' ? 'Copied' : 'Copy Commands'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#090E1A] border border-slate-800 rounded-xl text-[11px] font-mono text-indigo-300 overflow-x-auto leading-relaxed">
                  {amazonLinuxCommands}
                </pre>
              </div>

              {/* SSH connection to workers */}
              <div className="space-y-1.5 pt-2 border-t border-[#1E293B]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Connecting Controller to Managed Worker Nodes</span>
                  <button
                    onClick={() => handleCopy(sshKeySetup, 'sshkey')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    {copiedSection === 'sshkey' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedSection === 'sshkey' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#090E1A] border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                  {sshKeySetup}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#1E293B] bg-[#0D1527]">
          <span className="text-[11px] text-slate-400">
            Once installed, click &quot;Refresh Status&quot; on the controller card to verify.
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
                onInstalled();
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

