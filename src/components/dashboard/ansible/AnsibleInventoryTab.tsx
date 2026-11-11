'use client';

import React, { useState } from 'react';
import {
  Server,
  Plus,
  Cloud,
  Terminal,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Radio,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IAnsibleHostData } from '@/models/AnsibleHost';
import { AnsibleControllerNodeCard } from './AnsibleControllerNodeCard';
import { SetupManagedNodeModal } from './SetupManagedNodeModal';

interface AnsibleInventoryTabProps {
  hosts: IAnsibleHostData[];
  onAddHostClick: () => void;
  onImportCloudClick: () => void;
  onEditHostClick: (host: IAnsibleHostData) => void;
  onDeleteHostClick: (host: IAnsibleHostData) => void;
  onTestSSH: (hostId: string) => Promise<void>;
  testingHostId: string | null;
  onRefresh?: () => void;
}

export function AnsibleInventoryTab({
  hosts,
  onAddHostClick,
  onImportCloudClick,
  onEditHostClick,
  onDeleteHostClick,
  onTestSSH,
  testingHostId,
  onRefresh,
}: AnsibleInventoryTabProps) {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Setup modal for individual managed nodes
  const [setupNodeModalHost, setSetupNodeModalHost] = useState<IAnsibleHostData | null>(null);

  // Batch setup all nodes state
  const [settingUpAll, setSettingUpAll] = useState(false);
  const [setupAllMessage, setSetupAllMessage] = useState<{ text: string; success: boolean } | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSetupAllNodes = async () => {
    if (settingUpAll || hosts.length === 0) return;
    setSettingUpAll(true);
    setSetupAllMessage(null);
    try {
      const res = await fetch('/api/ansible/hosts/setup-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSetupAllMessage({
          text: data.message || `Setup completed: ${data.connectedCount} of ${data.total} nodes connected.`,
          success: true,
        });
        if (onRefresh) onRefresh();
      } else {
        setSetupAllMessage({
          text: data.error || 'Failed to setup all nodes',
          success: false,
        });
      }
    } catch (err: any) {
      setSetupAllMessage({
        text: err?.message || 'Error running batch setup across managed nodes',
        success: false,
      });
    } finally {
      setSettingUpAll(false);
      setTimeout(() => setSetupAllMessage(null), 8000);
    }
  };

  const formatLastCheck = (date?: Date | string | null) => {
    if (!date) return 'Not checked yet';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Not checked yet';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const filteredHosts = hosts.filter((h) => {
    const term = search.toLowerCase();
    const matchesSearch =
      h.name.toLowerCase().includes(term) ||
      h.ip.toLowerCase().includes(term) ||
      (h.privateIp && h.privateIp.toLowerCase().includes(term)) ||
      (h.instanceId && h.instanceId.toLowerCase().includes(term)) ||
      (h.region && h.region.toLowerCase().includes(term)) ||
      (h.os && h.os.toLowerCase().includes(term));

    const matchesProvider =
      providerFilter === 'all' || h.provider.toLowerCase() === providerFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'all' || h.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesProvider && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Main Ansible Controller Node Section (Exactly ONE at the top) */}
      <section aria-label="Ansible Controller Node">
        <AnsibleControllerNodeCard onControllerChanged={onRefresh} />
      </section>

      {/* 2. Managed Nodes Section (Multiple Servers directly below controller) */}
      <section aria-label="Ansible Managed Nodes" className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white tracking-wide">Managed Nodes</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
                  {hosts.length} {hosts.length === 1 ? 'Server' : 'Servers'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target AWS EC2 instances & Azure VMs controlled by the Ansible Controller
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1-Click Automated Setup for All Managed Nodes */}
            <button
              onClick={handleSetupAllNodes}
              disabled={settingUpAll || hosts.length === 0}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition disabled:opacity-50"
              title="Automatically configure Python3 and test SSH across all managed nodes"
            >
              <Sparkles className={`w-4 h-4 ${settingUpAll ? 'animate-spin' : ''}`} />
              <span>{settingUpAll ? 'Setting up all nodes...' : '⚡ Setup & Connect All Nodes'}</span>
            </button>

            <button
              onClick={onImportCloudClick}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 flex items-center gap-1.5 shadow-sm transition"
            >
              <Cloud className="w-4 h-4 text-blue-400" />
              <span>Import Cloud Nodes</span>
            </button>

            <button
              onClick={onAddHostClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Managed Node</span>
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh Managed Nodes"
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Batch Setup Banner Message */}
        {setupAllMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              setupAllMessage.success
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {setupAllMessage.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="font-medium">{setupAllMessage.text}</span>
            </div>
            <button
              onClick={() => setSetupAllMessage(null)}
              className="text-xs hover:text-white underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E]/80 border border-[#1E293B]/80 rounded-xl p-3 shadow-md">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, instance ID, IP, or region..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#0F172A] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0F172A] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Clouds</option>
              <option value="aws">AWS EC2</option>
              <option value="azure">Azure VM</option>
              <option value="linux">Linux / Other</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0F172A] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Statuses</option>
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
              <option value="authentication failed">Auth Failed</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            Showing {filteredHosts.length} of {hosts.length} managed nodes
          </div>
        </div>

        {/* Managed Nodes Table */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
          <div className="overflow-x-auto relative">
            <table className="w-full text-left text-xs min-w-[980px]">
              <thead>
                <tr className="bg-[#0D1527] text-slate-400 border-b border-[#1E293B] text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3.5">Server / VM Name</th>
                  <th className="py-3 px-3.5">Instance / Resource ID</th>
                  <th className="py-3 px-3.5">Public IP</th>
                  <th className="py-3 px-3.5">Private IP</th>
                  <th className="py-3 px-3.5">Cloud Provider</th>
                  <th className="py-3 px-3.5">Region / OS</th>
                  <th className="py-3 px-3.5">SSH Username</th>
                  <th className="py-3 px-3.5">Connection Status</th>
                  <th className="py-3 px-3.5">Last Check</th>
                  <th className="py-3 px-3.5 text-right sticky right-0 bg-[#0D1527] z-20 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] border-b border-[#1E293B]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/50">
                {filteredHosts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                          <Server className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">No Managed Nodes Registered</h4>
                        <p className="text-xs text-slate-400 mb-4 text-center leading-relaxed">
                          {search || providerFilter !== 'all' || statusFilter !== 'all'
                            ? 'No managed nodes matched your search filters. Reset filters to see all servers.'
                            : 'There are currently no target servers registered in your Ansible inventory. Import your active AWS EC2 instances or Azure VMs to begin automated playbook execution.'}
                        </p>
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={onImportCloudClick}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
                          >
                            <Cloud className="w-4 h-4" />
                            <span>Import AWS & Azure VMs</span>
                          </button>
                          <button
                            onClick={onAddHostClick}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
                          >
                            <span>Add Custom Node</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHosts.map((h) => {
                    const isConnected = h.status === 'Connected';
                    const isAuthFailed = h.status === 'Authentication Failed';
                    const isTesting = testingHostId === h._id;
                    const displayInstanceId = h.instanceId || h.sourceResourceId || '-';

                    return (
                      <tr key={h._id || h.name} className="hover:bg-[#142038]/50 transition group">
                        {/* 1. Server / VM Name */}
                        <td className="py-3 px-3.5 font-semibold text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                isConnected
                                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                                  : isAuthFailed
                                  ? 'bg-amber-400'
                                  : 'bg-slate-500'
                              }`}
                            ></span>
                            <span className="font-medium text-slate-100">{h.name}</span>
                          </div>
                        </td>

                        {/* 2. Real Instance ID or Azure Resource ID */}
                        <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="truncate max-w-[150px] text-slate-300"
                              title={displayInstanceId}
                            >
                              {displayInstanceId}
                            </span>
                            {displayInstanceId !== '-' && (
                              <button
                                onClick={() => handleCopy(displayInstanceId, `inst-${h._id}`)}
                                title="Copy Instance ID"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                              >
                                {copiedId === `inst-${h._id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 3. Public IP Address */}
                        <td className="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-semibold">{h.ip}</span>
                            <button
                              onClick={() => handleCopy(h.ip, `ip-${h._id}`)}
                              title="Copy IP Address"
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                            >
                              {copiedId === `ip-${h._id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 4. Private IP Address */}
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {h.privateIp ? (
                            <span>{h.privateIp}</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* 5. Cloud Provider */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {h.provider === 'aws' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/25">
                              <AwsLogo className="w-3.5 h-3.5" />
                              <span>AWS EC2</span>
                            </span>
                          ) : h.provider === 'azure' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#0089D6]/10 text-[#0089D6] border border-[#0089D6]/25">
                              <AzureLogo className="w-3.5 h-3.5" />
                              <span>Azure VM</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              <span>🐧</span>
                              <span>Linux Server</span>
                            </span>
                          )}
                        </td>

                        {/* 6. Region / OS */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-300">
                          <div className="font-medium">{h.region || 'default'}</div>
                          <div className="text-[10px] text-slate-400">{h.os || 'Linux'}</div>
                        </td>

                        {/* 7. SSH Username */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                            {h.username}
                          </span>
                        </td>

                        {/* 8. Connection Status */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                isConnected
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : isAuthFailed
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : h.status === 'Connecting'
                                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {isConnected ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : isAuthFailed ? (
                                <AlertCircle className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              <span>{h.status}</span>
                            </span>
                            {h.lastLatencyMs && isConnected && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {h.lastLatencyMs}ms
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 9. Last Connection Check */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{formatLastCheck(h.lastCheckedAt)}</span>
                          </span>
                        </td>

                        {/* 10. Actions (Sticky right so it is ALWAYS immediately visible) */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap sticky right-0 bg-[#111A2E] group-hover:bg-[#142038] z-10 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] border-b border-[#1E293B]">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Setup Node Action */}
                            <button
                              onClick={() => setSetupNodeModalHost(h)}
                              title="Setup Node (Verify/Install Python3 & Check SSH)"
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 flex items-center gap-1 transition"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>Setup Node</span>
                            </button>

                            {/* Test Connection Action */}
                            <button
                              onClick={() => h._id && onTestSSH(h._id)}
                              disabled={isTesting}
                              title="Test SSH Connectivity"
                              className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700/80 flex items-center gap-1 transition disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-blue-400' : ''}`} />
                              <span>{isTesting ? 'Testing...' : 'Test SSH'}</span>
                            </button>

                            {/* Edit Action */}
                            <button
                              onClick={() => onEditHostClick(h)}
                              title="Edit Managed Node"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Remove Action */}
                            <button
                              onClick={() => onDeleteHostClick(h)}
                              title="Remove Managed Node"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Setup Managed Node Modal */}
      <SetupManagedNodeModal
        isOpen={Boolean(setupNodeModalHost)}
        host={setupNodeModalHost}
        onClose={() => setSetupNodeModalHost(null)}
        onSetupCompleted={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}
