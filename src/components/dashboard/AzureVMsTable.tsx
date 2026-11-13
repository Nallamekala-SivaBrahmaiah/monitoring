'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronRight,
  TrendingUp,
  ArrowUpDown,
  ExternalLink,
  Eye,
  Copy,
  Check,
  Trash2,
  KeyRound,
  Terminal,
  Play,
  Power,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AzureVirtualMachine } from '@/types/monitoring';
import { AzureVmIcon } from '@/components/icons/CloudIcons';
import { ConnectSSHModal, ConnectSSHTarget } from '@/components/dashboard/ConnectSSHModal';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { useMonitoring } from '@/context/MonitoringContext';

interface AzureVMsTableProps {
  vms: AzureVirtualMachine[];
  showViewAllButton?: boolean;
  limit?: number;
}

export function AzureVMsTable({
  vms,
  showViewAllButton = true,
  limit,
}: AzureVMsTableProps) {
  const router = useRouter();
  const { triggerRefresh } = useMonitoring();
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sshTarget, setSshTarget] = useState<ConnectSSHTarget | null>(null);
  const [showSSHModal, setShowSSHModal] = useState<boolean>(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);
  const [showTerminalModal, setShowTerminalModal] = useState<boolean>(false);
  const [powerActionLoadingId, setPowerActionLoadingId] = useState<string | null>(null);
  const [powerFeedback, setPowerFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const pageSize = limit || 5;

  const handleCopyIp = (ip: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handlePowerAction = async (vmId: string, action: 'start' | 'stop') => {
    try {
      setPowerActionLoadingId(vmId);
      const res = await fetch(`/api/azure/vms/${encodeURIComponent(vmId)}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setPowerFeedback({
          type: 'success',
          message: data.message || `Azure VM "${vmId}" ${action === 'start' ? 'started' : 'stopped'} successfully.`,
        });
        triggerRefresh?.();
      } else {
        setPowerFeedback({
          type: 'error',
          message: data.error || `Failed to ${action} Azure VM`,
        });
      }
    } catch (err: any) {
      setPowerFeedback({
        type: 'error',
        message: err.message || `Power action execution failed`,
      });
    } finally {
      setPowerActionLoadingId(null);
      setTimeout(() => setPowerFeedback(null), 6000);
    }
  };

  const handleOpenTerminal = (vm: AzureVirtualMachine) => {
    setTerminalTarget({
      id: vm.id,
      vmId: vm.vmId || vm.id,
      name: vm.name,
      host: vm.publicIp && vm.publicIp !== '-' ? vm.publicIp : vm.privateIp,
      port: 22,
      sshServerId: (vm as any).sshServerId,
      cloudProvider: 'azure',
      isSSHConnected: (vm as any).isSSHConnected,
    });
    setShowTerminalModal(true);
  };

  const handleOpenSSHModal = (vm: AzureVirtualMachine) => {
    setSshTarget({
      id: vm.id || vm.vmId,
      name: vm.name,
      host: vm.publicIp && vm.publicIp !== '-' ? vm.publicIp : vm.privateIp,
      cloudProvider: 'azure',
      region: vm.region,
      os: vm.os || 'Linux',
    });
    setShowSSHModal(true);
  };

  const handleSSHSuccess = () => {
    triggerRefresh();
    router.refresh();
  };

  const handleDeleteVM = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove VM "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/azure/vms/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setRemovedIds(prev => new Set(prev).add(id));
        router.refresh();
      }
    } catch (e) {
      console.error('Failed to remove VM:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVMs = useMemo(() => {
    return vms
      .filter((vm) => !removedIds.has(vm.id) && !removedIds.has(vm.vmId))
      .filter((vm) => {
      const matchSearch =
        vm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vm.resourceGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vm.privateIp.includes(searchTerm);

      const matchRegion =
        regionFilter === 'all' || vm.region === regionFilter;

      const matchStatus =
        statusFilter === 'all' ||
        vm.powerState.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchRegion && matchStatus;
    });
  }, [vms, searchTerm, regionFilter, statusFilter]);

  const sortedVMs = useMemo(() => {
    return [...filteredVMs].sort((a, b) => {
      let valA: string | number = a[sortField as keyof AzureVirtualMachine] as string | number;
      let valB: string | number = b[sortField as keyof AzureVirtualMachine] as string | number;

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredVMs, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedVMs.length / pageSize) || 1;
  const paginatedVMs = sortedVMs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getUsageColor = (val: number) => {
    if (val >= 80) return 'bg-rose-500';
    if (val >= 60) return 'bg-amber-500';
    return 'bg-[#0089D6]';
  };

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl shadow-sm overflow-hidden">
      {/* Power Action Feedback Toast Banner */}
      {powerFeedback && (
        <div
          className={`p-3 text-xs flex items-center justify-between border-b ${
            powerFeedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {powerFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{powerFeedback.message}</span>
          </div>
          <button
            onClick={() => setPowerFeedback(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Table Header / Action Bar */}
      <div className="p-4 sm:p-5 border-b border-[#1E293B] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0089D6]/15 flex items-center justify-center text-[#0089D6]">
            <AzureVmIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              Azure Virtual Machines
            </h3>
            <span className="text-xs text-slate-400">
              Showing {sortedVMs.length} Azure compute instances
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search VM or resource group..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-56"
            />
          </div>

          <div className="relative">
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter Azure VMs by region"
              className="px-2.5 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Regions</option>
              <option value="eastus">eastus</option>
              <option value="westeurope">westeurope</option>
              <option value="eastus2">eastus2</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter Azure VMs by status"
              className="px-2.5 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              <option value="deallocated">Deallocated</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>

          {showViewAllButton && (
            <Link
              href="/dashboard/azure-vms"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0089D6] hover:bg-[#0078D4] text-white rounded-lg transition-colors shadow-sm"
            >
              <span>View All Azure VMs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400 font-medium text-xs">
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>VM Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Resource &amp; Region</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Resource Usage</th>
              <th className="py-3 px-4">Public IP</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/60 font-medium">
            {paginatedVMs.map((vm) => {
              const isRunning = (vm.powerState || '').toLowerCase().includes('run');
              const cpuVal = vm.cpuUsage ?? (vm as any).cpuUtilization ?? null;
              const memVal = vm.memoryUsage ?? (vm as any).memoryUtilization ?? null;
              const diskVal = vm.diskUsage ?? (vm as any).diskUtilization ?? null;
              const ipAddress = vm.publicIp && vm.publicIp !== '-' ? vm.publicIp : (vm.privateIp || '-');

              return (
                <tr
                  key={vm.id}
                  onClick={() => router.push(`/dashboard/azure-vms/${vm.vmId}`)}
                  className="hover:bg-[#162238]/60 cursor-pointer transition-colors group"
                >
                  {/* 1. VM Name */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {vm.name}
                      </span>
                      {(vm as any).isSSHConnected ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-500/40"
                          title="SSH Telemetry Active &amp; Verified"
                        >
                          SSH ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSSHModal(vm);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-950/70 hover:bg-blue-900/80 text-blue-400 border border-blue-500/40 transition-colors cursor-pointer"
                          title="Connect SSH (PPK / PEM / Password)"
                        >
                          <KeyRound className="w-2.5 h-2.5" />
                          <span>Connect SSH</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 2. Resource & Region */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">{vm.resourceGroup || 'rg01'}</span>{' '}
                    <span className="text-slate-400">({vm.region || 'centralindia'})</span>
                  </td>

                  {/* 3. Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isRunning
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                            : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                        }`}
                      />
                      <span
                        className={`font-semibold text-xs ${
                          isRunning ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {isRunning ? 'Running' : vm.powerState || 'Stopped'}
                      </span>
                    </div>
                  </td>

                  {/* 4. Resource Usage (Stacked CPU / Mem / Disk) */}
                  <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1 w-36 text-[10px] font-mono">
                      {/* CPU */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[10px] w-6">CPU</span>
                        <div className="flex-1 h-1.5 bg-[#162238] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.5)] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, cpuVal || 0))}%` }}
                          />
                        </div>
                        <span className="text-slate-200 font-semibold w-8 text-right">
                          {cpuVal !== null ? `${cpuVal}%` : 'N/A'}
                        </span>
                      </div>

                      {/* Mem */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[10px] w-6">Mem</span>
                        <div className="flex-1 h-1.5 bg-[#162238] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.5)] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, memVal || 0))}%` }}
                          />
                        </div>
                        <span className="text-slate-200 font-semibold w-8 text-right">
                          {memVal !== null ? `${memVal}%` : 'N/A'}
                        </span>
                      </div>

                      {/* Disk */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[10px] w-6">Disk</span>
                        <div className="flex-1 h-1.5 bg-[#162238] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.5)] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, diskVal || 0))}%` }}
                          />
                        </div>
                        <span className="text-slate-200 font-semibold w-8 text-right">
                          {diskVal !== null ? `${diskVal}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 5. Public IP with Copy Icon */}
                  <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-200 font-semibold text-xs">
                        {ipAddress}
                      </span>
                      {ipAddress !== '-' && (
                        <button
                          type="button"
                          onClick={(e) => handleCopyIp(ipAddress, e)}
                          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer rounded hover:bg-slate-800"
                          title={copiedIp === ipAddress ? 'Copied!' : 'Copy IP Address'}
                        >
                          {copiedIp === ipAddress ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 6. Compact Icon Toolstrip Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Button 1: >_ SSH in Vibrant Emerald */}
                      <button
                        type="button"
                        onClick={() => handleOpenTerminal(vm)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-[#00FF9D] hover:bg-[#00E58D] text-[#0A1628] rounded-lg shadow-[0_0_14px_rgba(0,255,157,0.5)] transition-all cursor-pointer transform hover:scale-105 active:scale-95"
                        title="Login into Server (Real Interactive SSH Terminal)"
                      >
                        <Terminal className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>SSH</span>
                      </button>

                      {/* Button 2: Power (Stop / Start) in Deep Rose */}
                      {isRunning ? (
                        <button
                          type="button"
                          onClick={() => handlePowerAction(vm.vmId, 'stop')}
                          disabled={powerActionLoadingId === vm.vmId}
                          className="p-2 bg-[#3D1424] hover:bg-[#521B31] text-[#FF4D6D] border border-[#FF4D6D]/30 rounded-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-40"
                          title="Stop / Deallocate Virtual Machine"
                        >
                          <Power
                            className={`w-3.5 h-3.5 ${
                              powerActionLoadingId === vm.vmId ? 'animate-spin' : ''
                            }`}
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePowerAction(vm.vmId, 'start')}
                          disabled={powerActionLoadingId === vm.vmId}
                          className="p-2 bg-[#0D382B] hover:bg-[#134D3C] text-emerald-400 border border-emerald-500/30 rounded-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-40"
                          title="Start Virtual Machine"
                        >
                          <Play
                            className={`w-3.5 h-3.5 fill-current ${
                              powerActionLoadingId === vm.vmId ? 'animate-spin' : ''
                            }`}
                          />
                        </button>
                      )}

                      {/* Button 3: Key in Warm Amber */}
                      <button
                        type="button"
                        onClick={() => handleOpenSSHModal(vm)}
                        className="p-2 bg-[#3D2C10] hover:bg-[#523B16] text-[#FFB703] border border-[#FFB703]/30 rounded-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95"
                        title="Configure SSH Credentials (PPK / PEM / Password)"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {/* Button 4: Eye in Deep Blue */}
                      <Link
                        href={`/dashboard/azure-vms/${vm.vmId}`}
                        className="p-2 bg-[#0E294B] hover:bg-[#153B6C] text-[#38BDF8] border border-[#38BDF8]/30 rounded-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center"
                        title="View Virtual Machine Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      {/* Button 5: Trash in Dark Charcoal */}
                      <button
                        type="button"
                        onClick={() => handleDeleteVM(vm.id || vm.vmId, vm.name)}
                        disabled={deletingId === (vm.id || vm.vmId)}
                        className="p-2 bg-[#162032] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-[#1E293B] hover:border-rose-500/40 rounded-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-40"
                        title="Remove Virtual Machine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {paginatedVMs.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="py-8 text-center text-slate-400 font-medium"
                >
                  No Azure Virtual Machines found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-3 bg-[#0E1628]/40 border-t border-[#1E293B] flex items-center justify-between text-xs text-slate-400">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-[#18233C] hover:bg-[#202E4E] disabled:opacity-40 disabled:pointer-events-none text-slate-200"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded bg-[#18233C] hover:bg-[#202E4E] disabled:opacity-40 disabled:pointer-events-none text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Connect SSH Modal */}
      <ConnectSSHModal
        isOpen={showSSHModal}
        onClose={() => setShowSSHModal(false)}
        target={sshTarget}
        onSuccess={handleSSHSuccess}
      />

      {/* Direct Interactive SSH Terminal Modal */}
      <SSHTerminalModal
        isOpen={showTerminalModal}
        onClose={() => setShowTerminalModal(false)}
        target={terminalTarget}
        onConfigureSSH={(t) => {
          const matching = vms.find(
            (v) => v.name === t.name || (v.id || v.vmId) === (t.id || t.vmId)
          );
          if (matching) {
            handleOpenSSHModal(matching);
          }
        }}
      />
    </div>
  );
}
