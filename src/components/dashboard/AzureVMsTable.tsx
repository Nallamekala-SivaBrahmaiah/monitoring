'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronRight,
  TrendingUp,
  ArrowUpDown,
  Trash2,
  KeyRound,
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
  const pageSize = limit || 5;

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
            <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400 font-medium">
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>VM Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Resource Group</th>
              <th className="py-3 px-4">Region</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Power State</th>
              <th
                onClick={() => handleSort('cpuUsage')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>CPU Usage</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('memoryUsage')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Memory</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('diskUsage')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Disk</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Network In/Out</th>
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
              const netInVal = vm.networkInMB ?? (vm as any).networkIn ?? null;
              const netOutVal = vm.networkOutMB ?? (vm as any).networkOut ?? null;

              return (
                <tr
                  key={vm.id}
                  onClick={() => router.push(`/dashboard/azure-vms/${vm.vmId}`)}
                  className="hover:bg-[#162238]/60 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-[#0089D6]/20 flex items-center justify-center text-[#0089D6] flex-shrink-0">
                        <AzureVmIcon className="w-3 h-3" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white group-hover:underline">
                            {vm.name}
                          </span>
                          {(vm as any).isSSHConnected ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTerminal(vm);
                              }}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1 cursor-pointer transition-colors"
                              title="Click to Open SSH Terminal"
                            >
                              <span>SSH Verified</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTerminal(vm);
                              }}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 font-mono flex items-center gap-1 transition-colors cursor-pointer"
                              title="Connect SSH (PPK / PEM / Password) for in-guest CPU, RAM, Disk, Docker & K8s telemetry"
                            >
                              <KeyRound className="w-2.5 h-2.5" />
                              <span>Connect SSH</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {vm.publicIp && vm.publicIp !== '-' ? vm.publicIp : vm.privateIp}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-400 font-mono">
                    {vm.resourceGroup}
                  </td>

                  <td className="py-3 px-4 text-slate-400">{vm.region}</td>

                  <td className="py-3 px-4 font-mono text-slate-300">
                    {vm.vmSize}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isRunning
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span
                        className={isRunning ? 'text-emerald-400' : 'text-slate-400'}
                      >
                        {isRunning ? 'Running' : vm.powerState}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {cpuVal !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="w-9 font-semibold text-slate-200">
                          {cpuVal}%
                        </span>
                        <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getUsageColor(
                              cpuVal
                            )}`}
                            style={{ width: `${Math.min(100, Math.max(0, cpuVal))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs italic">Unavailable</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {memVal !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="w-9 font-semibold text-slate-200">
                          {memVal}%
                        </span>
                        <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-cyan-500"
                            style={{ width: `${Math.min(100, Math.max(0, memVal))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60"
                        title="Guest OS memory requires Azure Monitor Agent (AMA) extension / Data Collection Rule"
                      >
                        N/A
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {diskVal !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="w-9 font-semibold text-slate-200">
                          {diskVal}%
                        </span>
                        <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${Math.min(100, Math.max(0, diskVal))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60"
                        title="Guest OS disk space requires Azure Monitor Agent (AMA) extension / Data Collection Rule"
                      >
                        N/A
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                    {netInVal !== null && netOutVal !== null ? (
                      `${netInVal} MB / ${netOutVal} MB`
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono text-emerald-400">
                    {vm.publicIp || '-'}
                  </td>

                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {!(vm as any).isSSHConnected ? (
                        <button
                          type="button"
                          onClick={() => handleOpenTerminal(vm)}
                          className="px-2 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded border border-blue-500/50 transition-colors flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
                          title="Open Secure SSH Terminal"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Connect SSH</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenTerminal(vm)}
                          className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-[#18233C] transition-colors cursor-pointer"
                          title="Open Direct SSH Terminal (Real Shell Session)"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-slate-300 hover:text-cyan-400" />
                        </button>
                      )}
                      <Link
                        href={`/dashboard/azure-vms/${vm.vmId}`}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-[#0089D6] hover:text-white text-slate-300 rounded border border-[#1E293B] transition-colors"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => router.push(`/dashboard/azure-vms/${vm.vmId}?tab=metrics`)}
                        className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-[#18233C]"
                        title="View Metrics"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVM(vm.id || vm.vmId, vm.name)}
                        disabled={deletingId === (vm.id || vm.vmId)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        title="Remove VM"
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
                  colSpan={11}
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
