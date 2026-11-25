'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  Trash2,
  ArrowRight,
  Shield,
  DownloadCloud,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface TerraformServerInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: any[];
}

export function TerraformServerInstallModal({
  isOpen,
  onClose,
  servers,
}: TerraformServerInstallModalProps) {
  const [selectedServerId, setSelectedServerId] = useState<string>(servers[0]?._id || '');
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [logs, setLogs] = useState('');

  useEffect(() => {
    if (servers.length > 0 && !selectedServerId) {
      setSelectedServerId(servers[0]._id);
    }
  }, [servers, selectedServerId]);

  if (!isOpen) return null;

  const selectedServer = servers.find((s) => s._id === selectedServerId);

  const handleCheck = async () => {
    if (!selectedServerId) return;
    setChecking(true);
    setStatusResult(null);
    setLogs('');
    try {
      const res = await fetch('/api/terraform/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: selectedServerId, action: 'check' }),
      });
      const data = await res.json();
      if (data.success && data.checkResult) {
        setStatusResult(data.checkResult);
      } else {
        setStatusResult({ installed: false, error: data.error || 'Check failed' });
      }
    } catch (e: any) {
      setStatusResult({ installed: false, error: e.message });
    } finally {
      setChecking(false);
    }
  };

  const handleInstall = async () => {
    if (!selectedServerId) return;
    setInstalling(true);
    setLogs('');
    try {
      const res = await fetch('/api/terraform/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: selectedServerId, action: 'install' }),
      });
      const data = await res.json();
      if (data.installResult) {
        setLogs(data.installResult.logs || '');
        if (data.success) {
          setStatusResult({ installed: true, version: data.installResult.version || 'v1.14.6' });
        } else {
          setStatusResult({ installed: false, error: data.installResult.error });
        }
      }
    } catch (e: any) {
      setLogs(`Error: ${e.message}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!confirm('Are you sure you want to uninstall Terraform from this server?')) return;
    setUninstalling(true);
    try {
      const res = await fetch('/api/terraform/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: selectedServerId, action: 'uninstall' }),
      });
      const data = await res.json();
      if (data.uninstallResult) {
        setLogs(data.uninstallResult.logs || '');
        if (data.success) {
          setStatusResult({ installed: false });
        }
      }
    } catch (e: any) {
      setLogs(`Error: ${e.message}`);
    } finally {
      setUninstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-purple-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">
              Remote Server Terraform Installation &amp; Lifecycle
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Server Select Bar */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 block">Select Registered Linux Server:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
            {servers.map((s) => {
              const isSelected = s._id === selectedServerId;
              const isAws = s.cloudProvider === 'aws';
              const isAzure = s.cloudProvider === 'azure';

              return (
                <div
                  key={s._id}
                  onClick={() => {
                    setSelectedServerId(s._id);
                    setStatusResult(null);
                    setLogs('');
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500/60 shadow-md'
                      : 'bg-[#080D1A] border-[#1E293B] hover:border-purple-500/30'
                  }`}
                >
                  <div className="space-y-0.5 truncate">
                    <div className="flex items-center gap-2">
                      {isAws ? <AwsLogo className="w-3.5 h-3.5" /> : isAzure ? <AzureLogo className="w-3.5 h-3.5" /> : <Server className="w-3.5 h-3.5 text-gray-400" />}
                      <span className="font-bold text-white truncate">{s.name}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono block truncate">{s.host}</span>
                  </div>

                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      s.status === 'Online' ? 'bg-emerald-400' : 'bg-gray-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Server Details & Actions */}
        {selectedServer && (
          <div className="p-4 rounded-xl bg-[#080D1A] border border-[#1E293B] space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-gray-400 block text-[11px]">Selected Target:</span>
                <strong className="text-white font-mono text-sm">{selectedServer.name} ({selectedServer.host}:{selectedServer.port || 22})</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={checking || installing}
                  className="px-3 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                  <span>{checking ? 'Checking...' : 'Check Status'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={installing || checking}
                  className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <DownloadCloud className={`w-3.5 h-3.5 ${installing ? 'animate-bounce' : ''}`} />
                  <span>{installing ? 'Installing...' : 'Install Official Terraform'}</span>
                </button>

                {statusResult?.installed && (
                  <button
                    type="button"
                    onClick={handleUninstall}
                    disabled={uninstalling}
                    className="p-1.5 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 rounded-lg cursor-pointer"
                    title="Uninstall Terraform"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Result Display */}
            {statusResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                  statusResult.installed
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                {statusResult.installed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div className="font-mono">
                  {statusResult.installed ? (
                    <span>
                      ✓ Terraform is installed ({statusResult.version}) at <strong className="text-white">{statusResult.binaryPath || '/usr/bin/terraform'}</strong>
                    </span>
                  ) : (
                    <span>
                      Terraform is NOT installed on this node. ({statusResult.error || 'Ready to install'})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Logs Terminal */}
        {logs && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
              Installation Output:
            </span>
            <pre className="p-3 rounded-xl bg-[#080D1A] border border-[#1E293B] text-cyan-300 font-mono text-xs max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {logs}
            </pre>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[#1E293B]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-gray-300 rounded-xl text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
