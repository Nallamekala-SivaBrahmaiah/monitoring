'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { EC2InstanceDetail } from '@/types/monitoring';
import { Ec2Icon } from '@/components/icons/CloudIcons';

interface EC2InstancesTableProps {
  instances: EC2InstanceDetail[];
  showViewAllButton?: boolean;
  limit?: number;
}

export function EC2InstancesTable({
  instances,
  showViewAllButton = true,
  limit,
}: EC2InstancesTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = limit || 5;

  // Filter and sort instances
  const filteredInstances = useMemo(() => {
    return instances.filter((inst) => {
      const matchSearch =
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.instanceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.privateIp.includes(searchTerm);

      const matchRegion =
        regionFilter === 'all' || inst.region === regionFilter;

      const matchStatus =
        statusFilter === 'all' ||
        inst.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchRegion && matchStatus;
    });
  }, [instances, searchTerm, regionFilter, statusFilter]);

  const sortedInstances = useMemo(() => {
    return [...filteredInstances].sort((a, b) => {
      let valA: string | number = a[sortField as keyof EC2InstanceDetail] as string | number;
      let valB: string | number = b[sortField as keyof EC2InstanceDetail] as string | number;

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredInstances, sortField, sortAsc]);

  // Paginated instances
  const totalPages = Math.ceil(sortedInstances.length / pageSize) || 1;
  const paginatedInstances = sortedInstances.slice(
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
    return 'bg-blue-500';
  };

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl shadow-sm overflow-hidden">
      {/* Table Header / Action Bar */}
      <div className="p-4 sm:p-5 border-b border-[#1E293B] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FF9900]/15 flex items-center justify-center text-[#FF9900]">
            <Ec2Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              EC2 Instances
            </h3>
            <span className="text-xs text-slate-400">
              Showing {sortedInstances.length} compute instances
            </span>
          </div>
        </div>

        {/* Filter Controls & View All Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search instance or ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-56"
            />
          </div>

          {/* Region Filter */}
          <div className="relative">
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by region"
              className="px-2.5 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Regions</option>
              <option value="us-east-1">us-east-1</option>
              <option value="us-west-2">us-west-2</option>
              <option value="ap-south-1">ap-south-1</option>
              <option value="eu-west-1">eu-west-1</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by status"
              className="px-2.5 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>

          {/* View All Button */}
          {showViewAllButton && (
            <Link
              href="/dashboard/ec2"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-sm"
            >
              <span>View All EC2 Instances</span>
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
                onClick={() => handleSort('instanceId')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Instance ID</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Region</th>
              <th className="py-3 px-4">AZ</th>
              <th className="py-3 px-4">Status</th>
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
              <th
                onClick={() => handleSort('uptime')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Uptime</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/60 font-medium">
            {paginatedInstances.map((inst) => {
              const isRunning = inst.status === 'Running';

              return (
                <tr
                  key={inst.id}
                  onClick={() => router.push(`/dashboard/ec2/${inst.instanceId}`)}
                  className="hover:bg-[#162238]/60 cursor-pointer transition-colors group"
                >
                  {/* Instance ID */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-[#FF9900]/20 flex items-center justify-center text-[#FF9900] flex-shrink-0">
                        <Ec2Icon className="w-3 h-3" />
                      </div>
                      <span className="font-mono text-blue-400 group-hover:underline">
                        {inst.instanceId}
                      </span>
                    </div>
                  </td>

                  {/* Name */}
                  <td className="py-3 px-4 font-semibold text-white">
                    {inst.name}
                  </td>

                  {/* Region */}
                  <td className="py-3 px-4 text-slate-400">{inst.region}</td>

                  {/* AZ */}
                  <td className="py-3 px-4 text-slate-400">
                    {inst.availabilityZone}
                  </td>

                  {/* Status */}
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
                        {inst.status}
                      </span>
                    </div>
                  </td>

                  {/* CPU Usage */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-9 font-semibold text-slate-200">
                        {inst.cpuUsage}%
                      </span>
                      <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getUsageColor(
                            inst.cpuUsage
                          )}`}
                          style={{ width: `${inst.cpuUsage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Memory */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-9 font-semibold text-slate-200">
                        {inst.memoryUsage}%
                      </span>
                      <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${inst.memoryUsage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Disk */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-9 font-semibold text-slate-200">
                        {inst.diskUsage}%
                      </span>
                      <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${inst.diskUsage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Network In/Out */}
                  <td className="py-3 px-4 text-slate-300">
                    {inst.networkInMB} MB / {inst.networkOutMB} MB
                  </td>

                  {/* Uptime */}
                  <td className="py-3 px-4 text-slate-400">{inst.uptime}</td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/dashboard/ec2/${inst.instanceId}`}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-blue-600 hover:text-white text-slate-300 rounded border border-[#1E293B] transition-colors"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => router.push(`/dashboard/ec2/${inst.instanceId}?tab=metrics`)}
                        className="p-1 text-slate-400 hover:text-blue-400 rounded hover:bg-[#18233C]"
                        title="View Metrics"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {paginatedInstances.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="py-8 text-center text-slate-400 font-medium"
                >
                  No EC2 instances found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
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
