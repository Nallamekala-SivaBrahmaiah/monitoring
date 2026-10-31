'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronRight,
  TrendingUp,
  ArrowUpDown,
} from 'lucide-react';
import { AzureVirtualMachine } from '@/types/monitoring';
import { AzureVmIcon } from '@/components/icons/CloudIcons';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = limit || 5;

  const filteredVMs = useMemo(() => {
    return vms.filter((vm) => {
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
              const isRunning = vm.powerState === 'Running';

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
                      <span className="font-semibold text-white group-hover:underline">
                        {vm.name}
                      </span>
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
                        {vm.powerState}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-9 font-semibold text-slate-200">
                        {vm.cpuUsage}%
                      </span>
                      <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getUsageColor(
                            vm.cpuUsage
                          )}`}
                          style={{ width: `${vm.cpuUsage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-9 font-semibold text-slate-200">
                        {vm.memoryUsage}%
                      </span>
                      <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${vm.memoryUsage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-9 font-semibold text-slate-200">
                        {vm.diskUsage}%
                      </span>
                      <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${vm.diskUsage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-300">
                    {vm.networkInMB} MB/s / {vm.networkOutMB} MB/s
                  </td>

                  <td className="py-3 px-4 font-mono text-emerald-400">
                    {vm.publicIp || '-'}
                  </td>

                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
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
    </div>
  );
}
