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
  Eye,
  Copy,
  Check,
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
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const pageSize = limit || 5;

  const handleCopyIp = (ip: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

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
            <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400 font-medium text-xs">
              <th
                onClick={() => handleSort('name')}
                className="py-3.5 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Instance Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4">Resource &amp; Region</th>
              <th
                onClick={() => handleSort('status')}
                className="py-3.5 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4">Resource Usage</th>
              <th className="py-3.5 px-4">Public IP</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
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

              const ipAddress = inst.publicIp || inst.privateIp || '-';

              return (
                <tr
                  key={inst.id}
                  onClick={() => router.push(`/dashboard/ec2/${inst.instanceId}`)}
                  className="hover:bg-[#162238]/60 cursor-pointer transition-colors group"
                >
                  {/* 1. Instance Name + SSH Pill */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">
                        {inst.name || inst.instanceId}
                      </span>
                      {isSSH ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-500/40"
                          title="SSH Telemetry Active & Verified"
                        >
                          SSH ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSSHModal(inst);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-950/70 hover:bg-blue-900/80 text-blue-400 border border-blue-500/40 transition-colors cursor-pointer"
                          title="Connect SSH (PPK / PEM / Password)"
                        >
                          <KeyRound className="w-2.5 h-2.5" />
                          <span>Connect SSH</span>
                        </button>
                      )}
                    </div>
                    {inst.name && inst.name !== inst.instanceId && (
                      <span className="text-[10px] font-mono text-slate-500 block">
                        {inst.instanceId}
                      </span>
                    )}
                  </td>

                  {/* 2. Resource & Region */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">{inst.availabilityZone || 'az'}</span>{' '}
                    <span className="text-slate-400">({inst.region})</span>
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
                        {isRunning ? 'Running' : inst.status || 'Stopped'}
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
                        onClick={() => handleOpenTerminal(inst)}
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
                          onClick={() => handlePowerAction(inst.instanceId, 'stop')}
                          disabled={powerActionLoadingId === inst.instanceId}
                          className="p-2 bg-[#3D1424] hover:bg-[#521B31] text-[#FF4D6D] border border-[#FF4D6D]/30 rounded-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-40"
                          title="Stop EC2 Instance in AWS"
                        >
                          <Power
                            className={`w-3.5 h-3.5 ${
                              powerActionLoadingId === inst.instanceId ? 'animate-spin' : ''
                            }`}
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePowerAction(inst.instanceId, 'start')}
                          disabled={powerActionLoadingId === inst.instanceId}
                          className="p-2 bg-[#0D382B] hover:bg-[#134D3C] text-emerald-400 border border-emerald-500/30 rounded-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-40"
                          title="Start EC2 Instance in AWS"
                        >
                          <Play
                            className={`w-3.5 h-3.5 fill-current ${
                              powerActionLoadingId === inst.instanceId ? 'animate-spin' : ''
                            }`}
                          />
                        </button>
                      )}

                      {/* Button 3: Key in Warm Amber */}
                      <button
                        type="button"
                        onClick={() => handleOpenSSHModal(inst)}
                        className="p-2 bg-[#3D2C10] hover:bg-[#523B16] text-[#FFB703] border border-[#FFB703]/30 rounded-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95"
                        title="Configure SSH Credentials (PPK / PEM / Password)"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {/* Button 4: Eye in Deep Blue */}
                      <Link
                        href={`/dashboard/ec2/${inst.instanceId}`}
                        className="p-2 bg-[#0E294B] hover:bg-[#153B6C] text-[#38BDF8] border border-[#38BDF8]/30 rounded-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center"
                        title="View EC2 Instance Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      {/* Button 5: Trash in Dark Charcoal */}
                      <button
                        type="button"
                        onClick={() => handleDeleteEC2(inst.instanceId, inst.name)}
                        disabled={deletingId === inst.instanceId}
                        className="p-2 bg-[#162032] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-[#1E293B] hover:border-rose-500/40 rounded-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-40"
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
                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
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
                    colSpan={6}
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
