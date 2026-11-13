'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronRight,
  Plus,
  Server,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Radio,
  X,
  RefreshCw,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import {
  UnifiedServerItem,
  UnifiedServerRow,
} from '@/components/dashboard/UnifiedServerRow';
import { ConnectSSHModal, ConnectSSHTarget } from '@/components/dashboard/ConnectSSHModal';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { useMonitoring } from '@/context/MonitoringContext';

interface UnifiedServerTableProps {
  servers: UnifiedServerItem[];
  provider?: 'aws' | 'azure' | 'fleet' | 'linux';
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  addLabel?: string;
  onAddClick?: () => void;
  showToolbar?: boolean;
  showViewAllButton?: boolean;
  viewAllHref?: string;
  limit?: number;
  detailUrlPrefix?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
}

export function UnifiedServerTable({
  servers,
  provider = 'fleet',
  title,
  subtitle,
  icon,
  addLabel,
  onAddClick,
  showToolbar = true,
  showViewAllButton = false,
  viewAllHref,
  limit,
  detailUrlPrefix,
  isLoading = false,
  onRefresh,
  emptyMessage,
}: UnifiedServerTableProps) {
  const { triggerRefresh } = useMonitoring();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Active operation IDs
  const [powerActionLoadingId, setPowerActionLoadingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modals state
  const [sshTarget, setSshTarget] = useState<ConnectSSHTarget | null>(null);
  const [showSSHModal, setShowSSHModal] = useState(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UnifiedServerItem | null>(null);

  // Notification Toast
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setFeedbackToast({ type, title, message });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 6000);
  };

  // Provider styling
  const isAzure = provider === 'azure';
  const isAws = provider === 'aws';

  const defaultTitle = isAzure
    ? 'Microsoft Azure Virtual Machines'
    : isAws
    ? 'Amazon Web Services (AWS EC2)'
    : 'Infrastructure Servers';

  const defaultSubtitle = isAzure
    ? 'High-performance cloud virtual machines managed via Microsoft Azure Resource Manager (ARM)'
    : isAws
    ? 'Elastic Compute Cloud instances managed via AWS EC2 API across global regions'
    : 'Multi-cloud compute instances with live guest and cloud telemetry';

  const defaultIcon = isAzure ? (
    <AzureLogo className="w-4 h-4" />
  ) : isAws ? (
    <AwsLogo className="w-4 h-4" />
  ) : (
    <Server className="w-4 h-4 text-blue-400" />
  );

  const headerBg = isAzure
    ? 'bg-gradient-to-r from-[#0089D6]/20 via-[#0089D6]/5 to-transparent'
    : isAws
    ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent'
    : 'bg-gradient-to-r from-blue-900/15 via-blue-900/5 to-transparent';

  const borderAccent = isAzure
    ? 'border-[#0089D6]/30'
    : isAws
    ? 'border-amber-500/30'
    : 'border-[#1E293B]';

  const badgeStyle = isAzure
    ? 'bg-[#0089D6]/20 text-[#5EA0EF] border border-[#0089D6]/30'
    : isAws
    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30';

  // Available unique regions
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    servers.forEach((s) => {
      if (s.region) set.add(s.region);
    });
    return Array.from(set).sort();
  }, [servers]);

  // Filtered servers
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      // Region filter
      if (regionFilter !== 'all' && s.region !== regionFilter) return false;

      // Status filter
      const rawStatus = (s.status || '').toLowerCase();
      const pState = (s.cloudPowerState || '').toLowerCase();
      const isOnline = rawStatus === 'online' || rawStatus === 'running' || pState === 'running' || Boolean(s.isSSHConnected && rawStatus !== 'offline');

      if (statusFilter === 'running' || statusFilter === 'online') {
        if (!isOnline) return false;
      } else if (statusFilter === 'stopped' || statusFilter === 'offline' || statusFilter === 'deallocated') {
        if (isOnline) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchId = (s.resourceId || s.id)?.toLowerCase().includes(q);
        const matchHost = s.host?.toLowerCase().includes(q);
        const matchPub = s.publicIp?.toLowerCase().includes(q);
        const matchPriv = s.privateIp?.toLowerCase().includes(q);
        const matchRegion = s.region?.toLowerCase().includes(q);
        const matchOs = (typeof s.os === 'string' ? s.os : s.os?.name)?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchHost && !matchPub && !matchPriv && !matchRegion && !matchOs) {
          return false;
        }
      }

      return true;
    });
  }, [servers, regionFilter, statusFilter, searchTerm]);

  // Pagination or limit
  const displayedServers = useMemo(() => {
    if (limit && limit > 0) {
      return filteredServers.slice(0, limit);
    }
    return filteredServers;
  }, [filteredServers, limit]);

  const onlineCount = useMemo(() => {
    return servers.filter((s) => {
      const raw = (s.status || '').toLowerCase();
      const p = (s.cloudPowerState || '').toLowerCase();
      return raw === 'online' || raw === 'running' || p === 'running' || Boolean(s.isSSHConnected && raw !== 'offline');
    }).length;
  }, [servers]);

  // Actions
  const handlePowerAction = async (server: UnifiedServerItem, action: 'start' | 'stop') => {
    try {
      setPowerActionLoadingId(server.id);
      const targetId = (server.serverId || server.id || server.resourceId || '');

      // Primary power endpoint
      const res = await fetch(`/api/servers/${encodeURIComponent(targetId)}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (res.ok) {
        showNotification(
          'success',
          action === 'start' ? 'Power Operation Sent' : 'Server Stopped',
          data.message || `Server ${server.name} was ${action === 'start' ? 'started' : 'stopped'} successfully.`
        );
        onRefresh?.();
        triggerRefresh?.();
      } else {
        showNotification('error', 'Power Action Failed', data.error || 'Failed to dispatch cloud power action');
      }
    } catch (err: any) {
      showNotification('error', 'Execution Error', err.message || 'Error executing power action');
    } finally {
      setPowerActionLoadingId(null);
    }
  };

  const handleOpenTerminal = (server: UnifiedServerItem) => {
    setTerminalTarget({
      id: server.serverId || server.id,
      sshServerId: server.serverId || server.id,
      name: server.name,
      host: server.publicIp && server.publicIp !== '-' ? server.publicIp : (server.host || server.privateIp || ''),
      port: server.port || 22,
      username: server.username || (server.cloudProvider === 'azure' ? 'siva' : 'ubuntu'),
      cloudProvider: server.cloudProvider,
      isSSHConnected: Boolean(server.isSSHConnected || server.status === 'Online'),
    });
    setShowTerminalModal(true);
  };

  const handleOpenSSHModal = (server: UnifiedServerItem) => {
    const pub = server.publicIp || server.host;
    const instanceId = server.resourceId || server.serverId || server.id;

    setSshTarget({
      id: server.serverId || server.id,
      name: server.name,
      host: pub && pub !== '-' && pub !== 'N/A' ? pub : (server.host || ''),
      port: server.port || 22,
      username: server.username || (server.cloudProvider === 'azure' ? 'siva' : 'ubuntu'),
      authMethod: server.authMethod,
      cloudProvider: server.cloudProvider,
      region: server.region,
      cloudResourceId: instanceId,
      instanceId: instanceId,
      hasSavedKey: Boolean(server.hasSavedKey || server.isSSHConnected || server.status === 'Online'),
      os: typeof server.os === 'string' ? server.os : `${server.os?.name || 'Linux'} ${server.os?.version || ''}`.trim(),
    });
    setShowSSHModal(true);
  };

  const handleRefreshServer = async (server: UnifiedServerItem) => {
    try {
      setSyncingId(server.id);
      const targetId = server.serverId || server.id;
      const res = await fetch(`/api/servers/${encodeURIComponent(targetId)}/refresh`, {
        method: 'POST',
      });
      if (res.ok) {
        showNotification('success', 'Telemetry Synchronized', `Real-time metrics refreshed for ${server.name}.`);
        onRefresh?.();
        triggerRefresh?.();
      } else {
        showNotification('info', 'Refreshing', 'Sent probe refresh request to server.');
        onRefresh?.();
      }
    } catch {
      onRefresh?.();
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteServerConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      const targetId = (deleteTarget.serverId || deleteTarget.id || deleteTarget.resourceId || '');

      let endpoint = `/api/servers/${encodeURIComponent(targetId)}`;
      if (deleteTarget.cloudProvider === 'aws' && deleteTarget.resourceId?.startsWith('i-')) {
        endpoint = `/api/aws/ec2/instances/${encodeURIComponent(deleteTarget.resourceId)}`;
      } else if (deleteTarget.cloudProvider === 'azure' && deleteTarget.resourceId) {
        endpoint = `/api/azure/vms/${encodeURIComponent(deleteTarget.resourceId)}`;
      }

      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showNotification('success', 'Server Removed', data.message || `Server ${deleteTarget.name} has been removed.`);
        setDeleteTarget(null);
        onRefresh?.();
        triggerRefresh?.();
      } else {
        showNotification('error', 'Deletion Failed', data.error || 'Failed to remove server');
      }
    } catch (err: any) {
      showNotification('error', 'Error', err.message || 'Failed to delete server');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`bg-[#111A2E] border ${borderAccent} rounded-xl overflow-hidden shadow-sm`}>
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          className={`p-3.5 border-b flex items-center justify-between gap-3 animate-fade-in transition-all text-xs ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : feedbackToast.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
              : 'bg-sky-950/80 border-sky-500/40 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : feedbackToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Radio className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />
            )}
            <div>
              <strong className="font-bold text-white mr-1.5">{feedbackToast.title}:</strong>
              <span>{feedbackToast.message}</span>
            </div>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Card Header */}
      <div className={`px-5 py-3.5 border-b border-[#1E293B] ${headerBg} flex flex-col lg:flex-row lg:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0D1526]/90 border border-[#1E293B] flex items-center justify-center shrink-0">
            {icon || defaultIcon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
              <span>{title || defaultTitle}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badgeStyle}`}>
                {servers.length} {servers.length === 1 ? 'instance' : 'instances'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-semibold">
                {onlineCount} Online
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {subtitle || defaultSubtitle}
            </p>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {showToolbar && (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isAzure ? 'Search Azure VM...' : isAws ? 'Search EC2 instance...' : 'Search servers...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-48"
                />
              </div>

              {/* Region Filter */}
              {availableRegions.length > 0 && (
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Regions</option>
                  {availableRegions.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              )}

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="running">Online / Running</option>
                <option value="stopped">Offline / Stopped</option>
              </select>
            </>
          )}

          {/* Add Server Button */}
          {addLabel && (
            <button
              type="button"
              onClick={onAddClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0D1526] hover:bg-[#15203A] text-slate-200 border border-[#1E293B] transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addLabel}</span>
            </button>
          )}

          {/* View All Button */}
          {showViewAllButton && viewAllHref && (
            <Link
              href={viewAllHref}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm ${
                isAzure
                  ? 'bg-[#0089D6] hover:bg-[#0078D4]'
                  : isAws
                  ? 'bg-[#FF9900] hover:bg-[#E68A00] text-black font-bold'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Table Content */}
      {displayedServers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0D1526] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Server Name & ID</th>
                <th className="py-3.5 px-4 font-semibold">IP Addresses</th>
                <th className="py-3.5 px-4 font-semibold">Provider / Region</th>
                <th className="py-3.5 px-4 font-semibold">OS & User</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">CPU Usage</th>
                <th className="py-3.5 px-4 font-semibold">RAM Usage</th>
                <th className="py-3.5 px-4 font-semibold">Disk Space</th>
                <th className="py-3.5 px-4 font-semibold">Last Connected</th>
                <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {displayedServers.map((server) => (
                <UnifiedServerRow
                  key={server.id || server.resourceId || server.name}
                  server={server}
                  detailUrlPrefix={detailUrlPrefix}
                  powerActionLoadingId={powerActionLoadingId}
                  syncingId={syncingId}
                  onPowerAction={handlePowerAction}
                  onOpenTerminal={handleOpenTerminal}
                  onOpenSSHModal={handleOpenSSHModal}
                  onRefreshServer={handleRefreshServer}
                  onDeleteServer={(srv) => setDeleteTarget(srv)}
                  onCopyIp={(ip) => {
                    if (navigator?.clipboard) {
                      navigator.clipboard.writeText(ip);
                      showNotification('info', 'Copied', 'Public IP address copied to clipboard');
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-10 px-4 text-center space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Loading infrastructure instances...</span>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {emptyMessage || 'No instances in this cloud section match the current search or filter.'}
            </p>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111A2E] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Server</h3>
                <p className="text-xs text-slate-400">Are you sure you want to remove this instance?</p>
              </div>
            </div>

            <div className="p-3 bg-[#0D1526] rounded-lg border border-[#1E293B] text-xs font-mono space-y-1">
              <div className="text-white font-semibold">{deleteTarget.name}</div>
              <div className="text-slate-400 text-[11px]">{deleteTarget.resourceId || deleteTarget.id}</div>
              <div className="text-emerald-400 text-[11px]">{deleteTarget.publicIp || deleteTarget.host || 'No Public IP'}</div>
            </div>

            <p className="text-xs text-slate-400">
              This will remove the server from monitoring and terminate active SSH telemetry collectors.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0D1526] hover:bg-[#1E293B] text-slate-300 border border-[#1E293B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === deleteTarget.id}
                onClick={handleDeleteServerConfirm}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {deletingId === deleteTarget.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete Server</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SSHTerminalModal for Live Interactive Shell */}
      {showTerminalModal && terminalTarget && (
        <SSHTerminalModal
          isOpen={showTerminalModal}
          onClose={() => {
            setShowTerminalModal(false);
            setTerminalTarget(null);
          }}
          target={terminalTarget}
        />
      )}

      {/* ConnectSSHModal for SSH Credentials and Dynamic IP */}
      {showSSHModal && sshTarget && (
        <ConnectSSHModal
          isOpen={showSSHModal}
          onClose={() => {
            setShowSSHModal(false);
            setSshTarget(null);
          }}
          target={sshTarget}
          onSuccess={() => {
            showNotification('success', 'Connected', 'SSH credentials saved and verified.');
            onRefresh?.();
            triggerRefresh?.();
          }}
        />
      )}
    </div>
  );
}
