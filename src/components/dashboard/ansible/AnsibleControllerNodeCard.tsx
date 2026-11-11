'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Settings2,
  Check,
  Radio,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { AnsibleLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { SelectControllerNodeModal } from './SelectControllerNodeModal';
import { SetupAnsibleModal } from './SetupAnsibleModal';

export interface AnsibleControllerInfo {
  id?: string;
  name: string;
  type: 'cloud' | 'custom' | 'local';
  sourceResourceId?: string;
  instanceId?: string;
  hostname: string;
  ipAddress: string;
  privateIp?: string;
  provider: 'aws' | 'azure' | 'linux' | 'local' | 'other';
  region?: string;
  os: string;
  username?: string;
  port?: number;
  ansibleVersion: string;
  pythonVersion: string;
  status: 'Online' | 'Offline' | 'Connecting' | 'Authentication Failed';
  sshStatus: 'Ready / Active' | 'Connected' | 'Disconnected' | 'Unavailable';
  uptimeFormatted: string;
  cpuCores: number;
  memoryFormatted: string;
  lastCheckedAt?: Date | null;
  lastLatencyMs?: number | null;
}

interface AnsibleControllerNodeCardProps {
  onControllerChanged?: () => void;
}

export function AnsibleControllerNodeCard({ onControllerChanged }: AnsibleControllerNodeCardProps) {
  const [controller, setController] = useState<AnsibleControllerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  const fetchController = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const url = isManual ? '/api/ansible/controller?refresh=true' : '/api/ansible/controller';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.controller) {
        setController(data.controller);
      } else {
        throw new Error(data.error || 'Failed to inspect controller node');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to controller runtime');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchController();
  }, []);

  const handleModalUpdated = () => {
    fetchController(true);
    if (onControllerChanged) onControllerChanged();
  };

  const isOnline = controller?.status === 'Online';
  const isCloud = controller?.type === 'cloud';
  const isLocal = controller?.type === 'local';
  const isAnsibleMissing =
    controller?.ansibleVersion?.toLowerCase().includes('not installed') ||
    controller?.ansibleVersion?.toLowerCase().includes('unknown');

  return (
    <>
      <div className="bg-[#111A2E]/90 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/25 relative overflow-hidden backdrop-blur-sm">
        {/* Decorative gradient orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-600/10 via-blue-600/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B] relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-950/40 shrink-0">
              <AnsibleLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {controller?.name || 'Ansible-Controller-01'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                  Primary Controller Node
                </span>

                {isCloud && controller?.provider === 'aws' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FF9900]/10 border border-[#FF9900]/30 text-[#FF9900]">
                    <AwsLogo className="w-3.5 h-3.5" />
                    <span>AWS EC2 Control Machine</span>
                  </span>
                ) : isCloud && controller?.provider === 'azure' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#0089D6]/10 border border-[#0089D6]/30 text-[#0089D6]">
                    <AzureLogo className="w-3.5 h-3.5" />
                    <span>Azure VM Control Machine</span>
                  </span>
                ) : isLocal ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    Local Laptop (Host)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                    Linux Control Host
                  </span>
                )}

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1.5 ${
                    isOnline
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  ></span>
                  <span>{controller?.status || 'Online'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Central master node executing playbooks and orchestrating managed cloud instances
                {controller?.instanceId && (
                  <span className="font-mono text-indigo-300 ml-1.5">
                    · ID: {controller.instanceId}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            <button
              onClick={() => setSetupModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/40 flex items-center gap-1.5 transition"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Setup / Install Ansible</span>
            </button>

            <button
              onClick={() => setSelectModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Change Controller</span>
            </button>

            <button
              onClick={() => fetchController(true)}
              disabled={refreshing || loading}
              title="Refresh Controller Status"
              className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
            </button>
          </div>
        </div>

        {/* Warning Banner if Ansible is not installed on Controller */}
        {isAnsibleMissing && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Ansible is not installed on this controller node ({controller?.name}) yet. Click &quot;Install Now&quot; to auto-install via SSH.
              </span>
            </div>
            <button
              onClick={() => setSetupModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold flex items-center gap-1 shrink-0 transition"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Install Now</span>
            </button>
          </div>
        )}

        {/* Main Spec & Health Metrics Grid */}
        {loading && !controller ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Inspecting Ansible controller node specifications...</span>
          </div>
        ) : error ? (
          <div className="py-6 flex items-center gap-2.5 text-xs text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : controller ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-4.5 mt-1 relative z-10">
            {/* 1. Hostname / IP */}
            <div className="bg-[#0D1527]/80 border border-slate-800/80 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hostname / IP</p>
              <p className="text-xs font-bold text-white mt-1 truncate" title={controller.hostname}>
                {controller.hostname}
              </p>
              <p className="text-[11px] font-mono text-indigo-400 mt-0.5">{controller.ipAddress}</p>
            </div>

            {/* 2. Operating System */}
            <div className="bg-[#0D1527]/80 border border-slate-800/80 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Operating System</p>
              <p className="text-xs font-bold text-white mt-1 truncate" title={controller.os}>
                {controller.os}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Control Machine Host</p>
            </div>

            {/* 3. Ansible Version */}
            <div className="bg-[#0D1527]/80 border border-slate-800/80 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ansible Version</p>
              <p
                className={`text-xs font-bold mt-1 font-mono truncate ${
                  isAnsibleMissing ? 'text-amber-400' : 'text-indigo-300'
                }`}
                title={controller.ansibleVersion}
              >
                {controller.ansibleVersion}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAnsibleMissing ? 'Setup Needed' : 'Playbook Runner'}
              </p>
            </div>

            {/* 4. Python Version */}
            <div className="bg-[#0D1527]/80 border border-slate-800/80 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Python Version</p>
              <p className="text-xs font-bold text-emerald-400 mt-1 font-mono truncate" title={controller.pythonVersion}>
                {controller.pythonVersion}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Execution Engine</p>
            </div>

            {/* 5. SSH Dispatcher Status */}
            <div className="bg-[#0D1527]/80 border border-slate-800/80 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SSH Dispatcher</p>
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-400">{controller.sshStatus}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {controller.lastLatencyMs ? `${controller.lastLatencyMs}ms latency` : 'Port 22 Outbound'}
              </p>
            </div>

            {/* 6. Uptime & Cores */}
            <div className="bg-[#0D1527]/80 border border-slate-800/80 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Host Uptime</p>
              <p className="text-xs font-bold text-cyan-300 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{controller.uptimeFormatted}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {controller.cpuCores} Cores · {controller.memoryFormatted.split('/')[0].trim()}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Select Controller Modal */}
      <SelectControllerNodeModal
        isOpen={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        onControllerUpdated={handleModalUpdated}
        currentControllerName={controller?.name}
        currentControllerIp={controller?.ipAddress}
        currentType={controller?.type}
      />

      {/* Setup / Install Ansible Modal */}
      <SetupAnsibleModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        controller={controller}
        onInstalled={handleModalUpdated}
      />
    </>
  );
}
