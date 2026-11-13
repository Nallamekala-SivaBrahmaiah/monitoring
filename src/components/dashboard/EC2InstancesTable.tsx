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
  KeyRound,
  Terminal,
  Play,
  Power,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { EC2InstanceDetail } from '@/types/monitoring';
import { Ec2Icon } from '@/components/icons/CloudIcons';
import { ConnectSSHModal, ConnectSSHTarget } from '@/components/dashboard/ConnectSSHModal';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { useMonitoring } from '@/context/MonitoringContext';

interface EC2InstancesTableProps {
  instances: EC2InstanceDetail[];
  showViewAllButton?: boolean;
  limit?: number;
  isLoading?: boolean;
  syncError?: string | null;
  lastSyncAt?: string | null;
  onRefresh?: () => void;
}

export function EC2InstancesTable({
  instances,
  showViewAllButton = true,
  limit,
  isLoading,
  syncError,
  lastSyncAt,
  onRefresh,
}: EC2InstancesTableProps) {
  const router = useRouter();
  const { triggerRefresh } = useMonitoring();
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sshTarget, setSshTarget] = useState<ConnectSSHTarget | null>(null);
  const [showSSHModal, setShowSSHModal] = useState<boolean>(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);
  const [showTerminalModal, setShowTerminalModal] = useState<boolean>(false);
  const [powerActionLoadingId, setPowerActionLoadingId] = useState<string | null>(null);
  const [powerFeedback, setPowerFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = limit || 5;

  const handleDeleteEC2 = async (instanceId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove EC2 instance "${name}" (${instanceId})?`)) return;
    try {
      setDeletingId(instanceId);
      const res = await fetch(`/api/aws/ec2/instances/${encodeURIComponent(instanceId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setRemovedIds((prev) => new Set(prev).add(instanceId));
        setPowerFeedback({
          type: 'success',
          message: data.message || `EC2 instance "${name}" removed successfully.`,
        });
        triggerRefresh?.();
      } else {
        setPowerFeedback({
          type: 'error',
          message: data.error || 'Failed to remove EC2 instance',
        });
      }
    } catch (err: any) {
      setPowerFeedback({
        type: 'error',
        message: err.message || 'Failed to remove EC2 instance',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePowerAction = async (instanceId: string, action: 'start' | 'stop') => {
    try {
      setPowerActionLoadingId(instanceId);
      const res = await fetch(`/api/aws/ec2/instances/${encodeURIComponent(instanceId)}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setPowerFeedback({
          type: 'success',
          message: data.message || `EC2 instance "${instanceId}" ${action === 'start' ? 'started' : 'stopped'} successfully.`,
        });
        triggerRefresh?.();
      } else {
        setPowerFeedback({
          type: 'error',
          message: data.error || `Failed to ${action} instance`,
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

  const handleOpenSSHModal = (inst: EC2InstanceDetail) => {
    setSshTarget({
      id: inst.id || inst.instanceId,
      name: inst.name || inst.instanceId,
      host: inst.publicIp && inst.publicIp !== '-' ? inst.publicIp : inst.privateIp,
      cloudProvider: 'aws',
      region: inst.region,
      os: inst.os || 'Linux',
    });
    setShowSSHModal(true);
  };

  const handleOpenTerminal = (inst: EC2InstanceDetail) => {
    setTerminalTarget({
      id: inst.id || inst.instanceId,
      name: inst.name || inst.instanceId,
      host: inst.publicIp && inst.publicIp !== '-' ? inst.publicIp : inst.privateIp,
      cloudProvider: 'aws',
      region: inst.region,
      sshServerId: (inst as any).sshServerId,
    });
    setShowTerminalModal(true);
  };

  const handleSSHSuccess = () => {
    triggerRefresh();
    router.refresh();
  };

  // Dynamically discovered regions from instances
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    instances.forEach((inst) => {
      if (inst.region) set.add(inst.region);
    });
    if (set.size === 0) set.add('ap-southeast-2');
    return Array.from(set).sort();
  }, [instances]);

  // Filter and sort instances
  const filteredInstances = useMemo(() => {
    return instances
      .filter((inst) => !removedIds.has(inst.instanceId) && !removedIds.has(inst.id))
      .filter((inst) => {
      const matchSearch =
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.instanceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.privateIp.includes(searchTerm);

      const matchRegion =
        regionFilter === 'all' || inst.region === regionFilter;

      const isRunning = (inst.status || '').toLowerCase().includes('run');
      const normalizedStatus = isRunning ? 'running' : 'stopped';
      const matchStatus =
        statusFilter === 'all' ||
        normalizedStatus === statusFilter.toLowerCase();

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
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FF9900]/15 flex items-center justify-center text-[#FF9900]">
            <Ec2Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              EC2 Instances
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Showing {sortedInstances.length} compute instances</span>
              {lastSyncAt && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Synced {lastSyncAt}</span>
                </>
              )}
            </div>
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
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
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

      {/* Sync Error Notice */}
      {syncError && (
        <div className="mx-4 sm:mx-5 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2.5 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="flex-1 font-medium">AWS Sync Notice: {syncError}</span>
        </div>
      )}

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
              <th
                onClick={() => handleSort('status')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
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
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/60 font-medium">
            {paginatedInstances.map((inst) => {
              const isRunning = (inst.status || '').toLowerCase().includes('run');

              const memVal = inst.memoryUsage !== null && inst.memoryUsage !== undefined
                ? inst.memoryUsage
                : (inst as any).memoryUtilization !== null && (inst as any).memoryUtilization !== undefined
                ? (inst as any).memoryUtilization
                : (inst as any).metrics?.memoryUtilization !== null && (inst as any).metrics?.memoryUtilization !== undefined
                ? (inst as any).metrics?.memoryUtilization
                : null;

              const cpuVal = inst.cpuUsage !== null && inst.cpuUsage !== undefined
                ? inst.cpuUsage
                : (inst as any).cpuUtilization !== null && (inst as any).cpuUtilization !== undefined
                ? (inst as any).cpuUtilization
                : (inst as any).metrics?.cpuUtilization !== null && (inst as any).metrics?.cpuUtilization !== undefined
                ? (inst as any).metrics?.cpuUtilization
                : null;

              const diskVal = inst.diskUsage !== null && inst.diskUsage !== undefined
                ? inst.diskUsage
                : (inst as any).diskUtilization !== null && (inst as any).diskUtilization !== undefined
                ? (inst as any).diskUtilization
                : (inst as any).metrics?.diskUtilization !== null && (inst as any).metrics?.diskUtilization !== undefined
                ? (inst as any).metrics?.diskUtilization
                : null;

              const isSSH = Boolean(
                (inst as any).isSSHConnected ||
                (inst as any).tags?.isSSHConnected === 'true' ||
                memVal !== null
              );

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
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-white">
                        {inst.name}
                      </span>
                      {isSSH ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                          SSH Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSSHModal(inst);
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-[#FF9900]/15 hover:bg-[#FF9900]/25 text-[#FF9900] border border-[#FF9900]/30 font-mono flex items-center gap-1 transition-colors"
                          title="Connect SSH (PPK / PEM / Password) for real in-guest telemetry"
                        >
                          <KeyRound className="w-2.5 h-2.5" />
                          <span>Connect SSH</span>
                        </button>
                      )}
                    </div>
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
                            : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                        }`}
                      />
                      <span
                        className={isRunning ? 'text-emerald-400 font-semibold' : 'text-slate-400 font-semibold'}
                      >
                        {isRunning ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                  </td>

                  {/* CPU Usage */}
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

                  {/* Memory */}
                  <td className="py-3 px-4">
                    {memVal !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="w-9 font-semibold text-slate-200">
                          {memVal}%
                        </span>
                        <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${Math.min(100, Math.max(0, memVal))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60"
                        title="Guest OS memory requires Amazon CloudWatch Agent or direct SSH connection"
                      >
                        Unavailable
                      </span>
                    )}
                  </td>

                  {/* Disk */}
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
                      <span className="text-slate-500 text-xs italic">Unavailable</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {/* 1. Real Cloud Power Actions (Start & Stop) */}
                      <div className="inline-flex rounded-lg border border-[#1E293B] bg-[#0D1526] p-0.5 shadow-sm shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePowerAction(inst.instanceId, 'start')}
                          disabled={isRunning || powerActionLoadingId === inst.instanceId}
                          className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                            isRunning
                              ? 'text-slate-500 cursor-not-allowed opacity-40'
                              : 'bg-emerald-600/25 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 cursor-pointer shadow-sm'
                          }`}
                          title={isRunning ? 'EC2 instance is already running' : 'Start EC2 Instance in AWS'}
                        >
                          <Play
                            className={`w-3 h-3 fill-current ${
                              powerActionLoadingId === inst.instanceId ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Start</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePowerAction(inst.instanceId, 'stop')}
                          disabled={!isRunning || powerActionLoadingId === inst.instanceId}
                          className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                            !isRunning
                              ? 'text-slate-500 cursor-not-allowed opacity-40'
                              : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/35 border border-rose-500/30 cursor-pointer shadow-sm'
                          }`}
                          title={!isRunning ? 'EC2 instance is currently stopped' : 'Stop EC2 Instance in AWS'}
                        >
                          <Power
                            className={`w-3 h-3 ${
                              powerActionLoadingId === inst.instanceId ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Stop</span>
                        </button>
                      </div>

                      {isSSH ? (
                        <>
                          {/* Login: Real Interactive SSH Terminal */}
                          <button
                            type="button"
                            onClick={() => handleOpenTerminal(inst)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-md transition-all shadow-sm shrink-0 cursor-pointer whitespace-nowrap"
                            title="Login into EC2 Instance (Interactive SSH Terminal)"
                          >
                            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Login</span>
                          </button>

                          {/* Reconfigure SSH credentials */}
                          <button
                            type="button"
                            onClick={() => handleOpenSSHModal(inst)}
                            className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-[#18233C] transition-colors shrink-0 cursor-pointer"
                            title="Reconfigure SSH Credentials"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenSSHModal(inst)}
                          className="px-2 py-1 text-xs font-semibold bg-[#FF9900] hover:bg-[#FF9900]/85 text-black font-bold rounded border border-[#FF9900]/60 transition-colors flex items-center gap-1 shadow-sm shrink-0"
                          title="Connect SSH (PPK / PEM / Password) to view real CPU, RAM, Disk, Docker & K8s"
                        >
                          <KeyRound className="w-3 h-3 text-black" />
                          <span>Connect SSH</span>
                        </button>
                      )}
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
                      <button
                        onClick={() => handleDeleteEC2(inst.instanceId, inst.name)}
                        disabled={deletingId === inst.instanceId}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        title="Remove EC2 Instance"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {isLoading && instances.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                    <span>Synchronizing EC2 instances with AWS...</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedInstances.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-400 font-medium"
                  >
                    No EC2 instances found matching current filters.
                  </td>
                </tr>
              )
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

      {/* Connect SSH Modal */}
      <ConnectSSHModal
        isOpen={showSSHModal}
        onClose={() => setShowSSHModal(false)}
        target={sshTarget}
        onSuccess={handleSSHSuccess}
      />

      {/* Interactive SSH Terminal Modal */}
      <SSHTerminalModal
        isOpen={showTerminalModal}
        onClose={() => setShowTerminalModal(false)}
        target={terminalTarget}
      />
    </div>
  );
}
