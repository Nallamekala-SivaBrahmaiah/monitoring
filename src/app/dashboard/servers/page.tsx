'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Server,
  Plus,
  RefreshCw,
  Shield,
  Activity,
  HardDrive,
  Cpu,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Terminal,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Boxes,
  Lock,
  Radio,
  X,
  Upload,
  MapPin,
  Clock,
  Wifi,
  RotateCw,
  Play,
  Power,
  KeyRound,
} from 'lucide-react';
import { AwsLogo, AzureLogo, DockerIcon, KubernetesIcon, Ec2Icon, AzureVmIcon } from '@/components/icons/CloudIcons';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { ConnectSSHModal, ConnectSSHTarget } from '@/components/dashboard/ConnectSSHModal';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useMonitoring } from '@/context/MonitoringContext';

interface RegisteredServer {
  _id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  environment?: string;
  cloudProvider: 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other';
  region?: string;
  tags: string[];
  status: 'Online' | 'Offline' | 'Connecting' | 'Failed' | 'Warning';
  lastError: string | null;
  lastConnectedAt: string | null;
  lastHeartbeatAt: string | null;
  hostFingerprint: string | null;
  os: {
    name: string;
    version: string;
    kernel: string;
    arch: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
  };
  hardware: {
    cpuCores: number;
    cpuModel: string;
    totalMemoryBytes: number;
    totalDiskBytes: number;
  };
  metrics: {
    cpu: {
      usagePercent: number;
      loadAvg1m: number;
      loadAvg5m: number;
      loadAvg15m: number;
      cores: number;
      timestamp: string;
    };
    memory: {
      totalBytes: number;
      usedBytes: number;
      availableBytes: number;
      usagePercent: number;
      swapTotalBytes: number;
      swapUsedBytes: number;
      timestamp: string;
    };
    disks: Array<{
      filesystem: string;
      mount: string;
      totalBytes: number;
      usedBytes: number;
      availableBytes: number;
      usagePercent: number;
    }>;
    network: Array<{
      interface: string;
      bytesReceived: number;
      bytesSent: number;
      packetsReceived: number;
      packetsSent: number;
    }>;
  };
  docker: {
    detected: boolean;
    version: string;
    containersCount: number;
    runningCount: number;
    imagesCount: number;
  };
  kubernetes: {
    detected: boolean;
    version: string;
    podsCount: number;
  };
  agent: {
    installed: boolean;
    version: string;
    token: string;
    status: 'healthy' | 'unreachable' | 'not-installed';
  };
  createdAt: string;
}

export default function ServersPage() {
  const { cloudProvider, isRefreshing } = useMonitoring();

  // State
  const [servers, setServers] = useState<RegisteredServer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fleetFilter, setFleetFilter] = useState<'all' | 'azure' | 'aws' | 'online' | 'offline' | 'docker' | 'kubernetes'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'custom' | 'aws' | 'azure'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Terminal Modal state
  const [showTerminalModal, setShowTerminalModal] = useState<boolean>(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);

  const handleOpenTerminal = (server: RegisteredServer) => {
    setTerminalTarget({
      id: server._id,
      sshServerId: server._id,
      name: server.name,
      host: server.host,
      port: server.port || 22,
      username: server.username || 'ubuntu',
      cloudProvider: server.cloudProvider,
      isSSHConnected: true,
    });
    setShowTerminalModal(true);
  };

  // SSH Credentials modal state (matching Second Image)
  const [sshTarget, setSshTarget] = useState<ConnectSSHTarget | null>(null);
  const [showSSHModal, setShowSSHModal] = useState<boolean>(false);

  const handleOpenSSHModal = (server: RegisteredServer) => {
    setSshTarget({
      id: server._id,
      name: server.name,
      host: server.host,
      port: server.port || 22,
      cloudProvider: server.cloudProvider,
      region: server.region,
      os: `${server.os?.name || 'Linux'} ${server.os?.version || ''}`.trim(),
    });
    setShowSSHModal(true);
  };

  // Server power control state (Start / Stop)
  const [powerActionLoadingId, setPowerActionLoadingId] = useState<string | null>(null);

  const handlePowerAction = async (server: RegisteredServer, action: 'start' | 'stop') => {
    try {
      setPowerActionLoadingId(server._id);
      const res = await fetch(`/api/servers/${server._id}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(
          'success',
          action === 'start' ? 'Server Started' : 'Server Stopped',
          data.message || `Server ${server.name} was ${action === 'start' ? 'started' : 'stopped'}.`
        );
        await fetchServers();
      } else {
        showNotification('error', 'Power Action Failed', data.error || 'Failed to update server power state');
      }
    } catch (e: any) {
      showNotification('error', 'Error', e.message || 'Power action failed');
    } finally {
      setPowerActionLoadingId(null);
    }
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showAgentModal, setShowAgentModal] = useState<boolean>(false);
  const [selectedAgentServer, setSelectedAgentServer] = useState<RegisteredServer | null>(null);
  const [agentScriptData, setAgentScriptData] = useState<{ oneLiner: string; script: string; instructions: string[] } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<RegisteredServer | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);

  // Add Server Form State
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'ubuntu',
    authMethod: 'privateKey' as 'privateKey' | 'password',
    authSecret: '',
    cloudProvider: 'other' as 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other',
    region: 'us-east-1',
    tags: 'web, api',
  });

  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; hint?: string; preview?: any } | null>(null);
  const [submittingServer, setSubmittingServer] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // User notification feedback toast
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

  // Fetch servers from backend
  const fetchServers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/servers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setServers(data);
      }
    } catch (e) {
      console.warn('Failed to load registered servers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, [isRefreshing]);

  // Sync single server
  const handleRefreshServer = async (id: string) => {
    try {
      setSyncingId(id);
      const res = await fetch(`/api/servers/${id}/refresh`, { method: 'POST' });
      if (res.ok) {
        await fetchServers();
        showNotification('success', 'Telemetry Synchronized', 'Real-time metrics refreshed via SSH probe.');
      }
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setSyncingId(null);
    }
  };

  // Test Connection in Modal
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      setSubmitError(null);

      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.host,
          port: formData.port,
          username: formData.username,
          authMethod: formData.authMethod,
          authSecret: formData.authSecret,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, error: e.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  // Submit Add Server Form
  const handleAddServerSubmit = async (e?: React.FormEvent, allowOfflineSave: boolean = false) => {
    if (e) e.preventDefault();
    try {
      setSubmittingServer(true);
      setSubmitError(null);

      const tagArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: tagArray,
          allowOfflineSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error + (data.hint ? `\n💡 Suggestion: ${data.hint}` : ''));
        return;
      }

      setShowAddModal(false);
      const serverName = formData.name;
      const serverHost = formData.host;

      // Reset form
      setFormData({
        name: '',
        host: '',
        port: 22,
        username: 'ubuntu',
        authMethod: 'privateKey',
        authSecret: '',
        cloudProvider: 'other',
        region: 'us-east-1',
        tags: 'web, api',
      });
      setTestResult(null);

      if (allowOfflineSave) {
        showNotification(
          'info',
          'Server Registered in Offline Mode',
          `Server "${serverName}" (${serverHost}) added. Telemetry will sync automatically once network/SSH access is established.`
        );
      } else {
        showNotification(
          'success',
          'Server Successfully Connected',
          `Server "${serverName}" (${serverHost}) connected and added to monitoring fleet.`
        );
      }

      await fetchServers();
    } catch (err: any) {
      setSubmitError(err.message || 'Server registration failed');
    } finally {
      setSubmittingServer(false);
    }
  };

  // Open Agent Modal
  const handleOpenAgentModal = async (server: RegisteredServer) => {
    setSelectedAgentServer(server);
    setShowAgentModal(true);
    setCopiedCmd(false);
    try {
      const res = await fetch(`/api/servers/${server._id}/install-script`);
      if (res.ok) {
        const data = await res.json();
        setAgentScriptData(data);
      }
    } catch (e) {
      console.warn('Failed to fetch agent script:', e);
    }
  };

  // Confirm delete server
  const handleDeleteServer = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const url = `/api/servers/${deleteTarget._id}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (res.ok) {
        const removedName = deleteTarget.name;
        const removedHost = deleteTarget.host;
        setDeleteTarget(null);
        setDeleteConfirmText('');
        showNotification(
          'info',
          'Server Disconnected and Removed',
          `Server "${removedName}" (${removedHost}) was successfully disconnected and removed from monitoring fleet.`
        );
        await fetchServers();
      } else {
        const err = await res.json();
        showNotification('error', 'Failed to Remove Server', err.error || 'Server deletion failed');
      }
    } catch (e: any) {
      showNotification('error', 'Error', e.message || 'Failed to remove server');
    } finally {
      setDeleting(false);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Filtered servers
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      if (fleetFilter === 'azure' && s.cloudProvider !== 'azure') return false;
      if (fleetFilter === 'aws' && s.cloudProvider !== 'aws') return false;
      if (fleetFilter === 'online' && s.status !== 'Online') return false;
      if (fleetFilter === 'offline' && s.status === 'Online') return false;
      if (fleetFilter === 'docker' && !s.docker?.detected) return false;
      if (fleetFilter === 'kubernetes' && !s.kubernetes?.detected) return false;
      if (cloudProvider === 'aws' && s.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && s.cloudProvider !== 'azure') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchHost = s.host.toLowerCase().includes(q);
        const matchTags = s.tags.some((t) => t.toLowerCase().includes(q));
        const matchProvider = (s.cloudProvider || '').toLowerCase().includes(q);
        const matchRegion = (s.region || '').toLowerCase().includes(q);
        return matchName || matchHost || matchTags || matchProvider || matchRegion;
      }
      return true;
    });
  }, [servers, fleetFilter, cloudProvider, searchQuery]);

  // Cloud provider groups
  const azureServers = useMemo(() => {
    const list = filteredServers.filter((s) => s.cloudProvider === 'azure');
    const seen = new Set<string>();
    return list.filter((s) => {
      const key = (s.name || s._id).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredServers]);

  const awsServers = useMemo(() => {
    const list = filteredServers.filter((s) => s.cloudProvider === 'aws');
    const seen = new Set<string>();
    return list.filter((s) => {
      const key = (s.name || s._id).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredServers]);

  const otherServers = useMemo(() => filteredServers.filter((s) => s.cloudProvider !== 'azure' && s.cloudProvider !== 'aws'), [filteredServers]);

  const totalAzureCount = useMemo(() => {
    const list = servers.filter((s) => s.cloudProvider === 'azure');
    const seen = new Set<string>();
    return list.filter((s) => {
      const key = (s.name || s._id).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).length;
  }, [servers]);

  const totalAwsCount = useMemo(() => {
    const list = servers.filter((s) => s.cloudProvider === 'aws');
    const seen = new Set<string>();
    return list.filter((s) => {
      const key = (s.name || s._id).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).length;
  }, [servers]);

    // Aggregate stats
  const totalCustomServers = servers.length;
  const onlineServersCount = servers.filter((s) => s.status === 'Online').length;

  const renderTableHeader = () => (
    <thead className="bg-[#0D1526] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
      <tr>
        <th className="py-3 px-4">Server Name & Host</th>
        <th className="py-3 px-4">Provider / Location</th>
        <th className="py-3 px-4">Status</th>
        <th className="py-3 px-4">CPU Usage</th>
        <th className="py-3 px-4">RAM Usage</th>
        <th className="py-3 px-4">Disk Space</th>
        <th className="py-3 px-4 text-right">Actions</th>
      </tr>
    </thead>
  );

  const renderServerRows = (serverList: RegisteredServer[]) => {
    return serverList.map((server) => {
      const cpuVal = server.metrics?.cpu?.usagePercent ?? 0;
      const memVal = server.metrics?.memory?.usagePercent ?? 0;
      const diskVal = server.metrics?.disks?.[0]?.usagePercent ?? 0;

      return (
        <tr key={server._id} className="hover:bg-[#15203A] transition-colors">
          {/* Server Name & Host with SSH Verified badge (matching Second Image) */}
          <td className="py-3.5 px-4">
            <Link href={`/dashboard/servers/${server._id}`} className="group block">
              <div className="font-semibold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                <span>{server.name}</span>
                <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Check className="w-2.5 h-2.5" />
                  <span>SSH Verified</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {server.host}:{server.port || 22}
                </span>
              </div>
              {server.os?.name && (
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {server.os.name} {server.os.version}
                </div>
              )}
            </Link>
          </td>

          {/* Provider / Location */}
          <td className="py-3.5 px-4">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                server.cloudProvider === 'azure'
                  ? 'bg-[#0089D6]/15 text-[#5EA0EF] border-[#0089D6]/30'
                  : server.cloudProvider === 'aws'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
              }`}
            >
              <span className="uppercase font-bold">{server.cloudProvider}</span>
              {server.region && <span className="text-slate-400 font-normal">({server.region})</span>}
            </span>
          </td>

          {/* Status */}
          <td className="py-3.5 px-4">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  server.status === 'Online'
                    ? 'bg-emerald-400 animate-pulse'
                    : server.status === 'Connecting'
                    ? 'bg-blue-400'
                    : 'bg-rose-500'
                }`}
              />
              <span
                className={`font-semibold ${
                  server.status === 'Online'
                    ? 'text-emerald-400'
                    : server.status === 'Connecting'
                    ? 'text-blue-400'
                    : 'text-rose-400'
                }`}
              >
                {server.status}
              </span>
            </div>
            {server.lastError && (
              <span className="text-[10px] text-rose-400/80 block truncate max-w-[140px]" title={server.lastError}>
                {server.lastError}
              </span>
            )}
          </td>

          {/* CPU */}
          <td className="py-3.5 px-4">
            <div className="w-28 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">{cpuVal}%</span>
                <span className="text-slate-500 font-mono">{server.hardware?.cpuCores || 1}c</span>
              </div>
              <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    cpuVal > 85 ? 'bg-rose-500' : cpuVal > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, cpuVal)}%` }}
                />
              </div>
            </div>
          </td>

          {/* Memory */}
          <td className="py-3.5 px-4">
            <div className="w-28 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">{memVal}%</span>
                <span className="text-slate-500 font-mono">
                  {formatBytes(server.metrics?.memory?.totalBytes || 0)}
                </span>
              </div>
              <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    memVal > 90 ? 'bg-rose-500' : memVal > 70 ? 'bg-amber-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${Math.min(100, memVal)}%` }}
                />
              </div>
            </div>
          </td>

          {/* Disk */}
          <td className="py-3.5 px-4">
            <div className="w-24 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">{diskVal}%</span>
                <span className="text-slate-500 font-mono">
                  {server.metrics?.disks?.[0]?.mount || '/'}
                </span>
              </div>
              <div className="w-full bg-[#0D1526] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    diskVal > 85 ? 'bg-rose-500' : 'bg-teal-400'
                  }`}
                  style={{ width: `${Math.min(100, diskVal)}%` }}
                />
              </div>
            </div>
          </td>

          {/* Actions: Start & Stop + Login + Key + Refresh + View + Delete */}
          <td className="py-3.5 px-4 text-right">
            <div className="flex items-center justify-end gap-1.5">
              {/* 1. Start & Stop Server Button Group */}
              {(() => {
                const isOnline =
                  server.status === 'Online' ||
                  ((server as any).cloudPowerState && (server as any).cloudPowerState === 'Running');
                return (
                  <div className="inline-flex rounded-lg border border-[#1E293B] bg-[#0D1526] p-0.5 shadow-sm shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePowerAction(server, 'start')}
                      disabled={isOnline || powerActionLoadingId === server._id}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                        isOnline
                          ? 'text-slate-500 cursor-not-allowed opacity-40'
                          : 'bg-emerald-600/25 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 cursor-pointer shadow-sm'
                      }`}
                      title={isOnline ? 'Server is already running in cloud' : 'Start Server in Cloud'}
                    >
                      <Play className={`w-3 h-3 fill-current ${powerActionLoadingId === server._id ? 'animate-spin' : ''}`} />
                      <span>Start</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePowerAction(server, 'stop')}
                      disabled={!isOnline || powerActionLoadingId === server._id}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                        !isOnline
                          ? 'text-slate-500 cursor-not-allowed opacity-40'
                          : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/35 border border-rose-500/30 cursor-pointer shadow-sm'
                      }`}
                      title={!isOnline ? 'Server is currently stopped' : 'Stop Server in Cloud (AWS / Azure)'}
                    >
                      <Power className={`w-3 h-3 ${powerActionLoadingId === server._id ? 'animate-spin' : ''}`} />
                      <span>Stop</span>
                    </button>
                  </div>
                );
              })()}

              {/* 2. Direct interactive SSH Terminal Login button (from Second Image) */}
              <button
                type="button"
                onClick={() => handleOpenTerminal(server)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-md transition-all shadow-sm shrink-0 cursor-pointer whitespace-nowrap"
                title="Login into Server (Real Interactive SSH Terminal)"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Login</span>
              </button>

              {/* 3. SSH Key configuration button (from Second Image) */}
              <button
                type="button"
                onClick={() => handleOpenSSHModal(server)}
                className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-[#18233C] transition-colors shrink-0 cursor-pointer border border-[#1E293B]"
                title="Configure / Reconfigure SSH Credentials"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>

              {/* 4. Refresh / Sync Button */}
              <button
                onClick={() => handleRefreshServer(server._id)}
                disabled={syncingId === server._id}
                title="Synchronize live metrics via SSH"
                className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-[#1A2642] text-slate-300 hover:text-white border border-[#1E293B] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingId === server._id ? 'animate-spin text-blue-400' : ''}`} />
              </button>

              {/* 5. View / Details Button (matching Second Image) */}
              <Link
                href={`/dashboard/servers/${server._id}`}
                className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-[#202E4E] text-slate-200 rounded-lg border border-[#1E293B] transition-colors"
              >
                View
              </Link>

              {/* 6. Delete / Disconnect Button */}
              <button
                onClick={() => setDeleteTarget(server)}
                title="Remove server"
                className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-[#1E293B] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-6">
          {/* Action Notification Toast Banner */}
          {feedbackToast && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg animate-fade-in backdrop-blur-md transition-all ${
                feedbackToast.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                  : feedbackToast.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                  : 'bg-sky-950/80 border-sky-500/40 text-sky-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {feedbackToast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : feedbackToast.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <Radio className="w-5 h-5 text-sky-400 shrink-0 animate-pulse" />
                )}
                <div>
                  <strong className="block text-xs font-bold text-white tracking-wide">{feedbackToast.title}</strong>
                  <p className="text-xs text-slate-300 mt-0.5">{feedbackToast.message}</p>
                </div>
              </div>
              <button
                onClick={() => setFeedbackToast(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top Breadcrumb & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link href="/" className="hover:text-blue-400 flex items-center gap-1 transition-colors">
                  <span>Dashboard</span>
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Production Server Monitoring</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Server className="w-5 h-5" />
                </div>
                <span>Server Infrastructure & Node Fleet</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-semibold">
                  {onlineServersCount} Online
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Automatic, continuous monitoring for Production, Staging, and Development Linux hosts.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchServers}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Fleet</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Linux Server</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Servers</span>
              <div className="text-2xl font-bold text-white mt-1">{totalCustomServers}</div>
              <span className="text-[10px] text-emerald-400 mt-0.5 block">{onlineServersCount} connected</span>
            </div>

            <div className="bg-[#111A2E] border border-emerald-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Online Nodes</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{onlineServersCount}</div>
              <span className="text-[10px] text-emerald-300/80 mt-0.5 block">Active Telemetry</span>
            </div>

            <div className="bg-[#111A2E] border border-slate-700/60 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Offline Nodes</span>
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{totalCustomServers - onlineServersCount}</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Needs Attention</span>
            </div>

            <div className="bg-[#111A2E] border border-blue-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Docker Hosts</span>
                <DockerIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {servers.filter((s) => s.docker?.detected).length}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Engine Detected</span>
            </div>

            <div className="bg-[#111A2E] border border-indigo-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Kubernetes</span>
                <KubernetesIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {servers.filter((s) => s.kubernetes?.detected).length}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">K8s Nodes</span>
            </div>

            <div className="bg-[#111A2E] border border-cyan-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Fleet Health</span>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {servers.filter((s) => (s.metrics?.cpu?.usagePercent || 0) < 80).length} / {totalCustomServers}
              </div>
              <span className="text-[10px] text-emerald-400 mt-0.5 block">Healthy Load</span>
            </div>
          </div>
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] rounded-xl p-3">
            {/* Fleet Status & Cloud Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFleetFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                All Servers ({servers.length})
              </button>

              <button
                onClick={() => setFleetFilter('azure')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'azure'
                    ? 'bg-[#0089D6] text-white shadow-sm ring-1 ring-[#5EA0EF]'
                    : 'text-[#5EA0EF] hover:bg-[#0089D6]/15 hover:text-white'
                }`}
              >
                <AzureLogo className="w-3.5 h-3.5" />
                <span>Azure VMs ({totalAzureCount})</span>
              </button>

              <button
                onClick={() => setFleetFilter('aws')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'aws'
                    ? 'bg-[#FF9900] text-slate-950 font-bold shadow-sm ring-1 ring-amber-300'
                    : 'text-amber-400 hover:bg-amber-500/15 hover:text-white'
                }`}
              >
                <AwsLogo className="w-3.5 h-3.5" />
                <span>AWS EC2 ({totalAwsCount})</span>
              </button>

              <button
                onClick={() => setFleetFilter('online')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'online'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400 hover:bg-emerald-950/30'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Online ({onlineServersCount})</span>
              </button>

              <button
                onClick={() => setFleetFilter('offline')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'offline'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Offline ({totalCustomServers - onlineServersCount})
              </button>

              <button
                onClick={() => setFleetFilter('docker')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'docker'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-400 hover:bg-sky-950/30'
                }`}
              >
                <DockerIcon className="w-3 h-3" />
                <span>Docker Hosts ({servers.filter((s) => s.docker?.detected).length})</span>
              </button>

              <button
                onClick={() => setFleetFilter('kubernetes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  fleetFilter === 'kubernetes'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-400 hover:bg-indigo-950/30'
                }`}
              >
                <KubernetesIcon className="w-3.5 h-3.5" />
                <span>Kubernetes ({servers.filter((s) => s.kubernetes?.detected).length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search server, IP, tag..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 1. AZURE VIRTUAL MACHINES (COMPUTE VMS) TABLE */}
          {/* ========================================================================= */}
          {(fleetFilter === 'all' || fleetFilter === 'azure' || (fleetFilter !== 'aws' && azureServers.length > 0)) && (
            <div className="bg-[#111A2E] border border-blue-500/20 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-[#1E293B] bg-gradient-to-r from-[#0089D6]/10 via-transparent to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0089D6]/15 border border-[#0089D6]/30 flex items-center justify-center shrink-0">
                    <AzureLogo className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Azure Virtual Machines (Compute VMs)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0089D6]/20 text-[#5EA0EF] border border-[#0089D6]/30 font-semibold">
                        {azureServers.length} {azureServers.length === 1 ? 'node' : 'nodes'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-semibold">
                        {azureServers.filter((s) => s.status === 'Online').length} Online
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Microsoft Azure Linux servers with continuous SSH telemetry &amp; interactive terminal access.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        cloudProvider: 'azure',
                        region: 'austriaeast',
                      }));
                      setShowAddModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0089D6]/20 hover:bg-[#0089D6]/30 text-[#5EA0EF] border border-[#0089D6]/40 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Azure VM</span>
                  </button>
                </div>
              </div>

              {azureServers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    {renderTableHeader()}
                    <tbody className="divide-y divide-[#1E293B]">
                      {renderServerRows(azureServers)}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs">No Azure Virtual Machines found matching your filter.</p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. AWS EC2 INSTANCES (COMPUTE FLEET) TABLE */}
          {/* ========================================================================= */}
          {(fleetFilter === 'all' || fleetFilter === 'aws' || (fleetFilter !== 'azure' && awsServers.length > 0)) && (
            <div className="bg-[#111A2E] border border-amber-500/20 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-[#1E293B] bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <AwsLogo className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>AWS EC2 Instances (Compute Fleet)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                        {awsServers.length} {awsServers.length === 1 ? 'node' : 'nodes'}
                      </span>
                      {awsServers.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-semibold">
                          {awsServers.filter((s) => s.status === 'Online').length} Online
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Amazon Web Services EC2 Linux instances with continuous telemetry &amp; interactive terminal access.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        cloudProvider: 'aws',
                        region: 'us-east-1',
                      }));
                      setShowAddModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add AWS EC2 Server</span>
                  </button>
                </div>
              </div>

              {awsServers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    {renderTableHeader()}
                    <tbody className="divide-y divide-[#1E293B]">
                      {renderServerRows(awsServers)}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 px-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                    <AwsLogo className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No AWS EC2 Instances Connected Yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Connect your AWS EC2 Linux instances (Ubuntu, Amazon Linux, Debian, RHEL) with SSH credentials to enable automatic metric collection and 1-click interactive terminal login.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        cloudProvider: 'aws',
                        region: 'us-east-1',
                      }));
                      setShowAddModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>Connect AWS EC2 Server</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. ON-PREMISES & OTHER LINUX SERVERS TABLE */}
          {/* ========================================================================= */}
          {otherServers.length > 0 && (
            <div className="bg-[#111A2E] border border-slate-700/40 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-[#1E293B] bg-gradient-to-r from-slate-900/40 via-transparent to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <Server className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>On-Premises &amp; Other Linux Servers</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        {otherServers.length} {otherServers.length === 1 ? 'node' : 'nodes'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Bare-metal, hybrid cloud, and on-premises Linux host nodes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  {renderTableHeader()}
                  <tbody className="divide-y divide-[#1E293B]">
                    {renderServerRows(otherServers)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. FILTER EMPTY STATE */}
          {/* ========================================================================= */}
          {filteredServers.length === 0 && !loading && (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#0D1526] border border-[#1E293B] flex items-center justify-center mx-auto text-slate-500">
                <Server className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No Servers Match Selected Criteria</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try clearing your search query or selecting &quot;All Servers&quot; to view your registered cloud instances.
              </p>
              <button
                onClick={() => {
                  setFleetFilter('all');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
              >
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 1. ADD SERVER MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#1E293B] flex items-center justify-between sticky top-0 bg-[#111A2E] z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Linux Server to Monitoring</h3>
                  <p className="text-xs text-slate-400">
                    Connect once with SSH credentials. Real telemetry will be collected automatically.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setTestResult(null);
                  setSubmitError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#18233C]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddServerSubmit} className="p-6 space-y-5">
              {/* Row 1: Server Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Server Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. vm01siva or prod-api-01"
                  className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Row 2: Host & Port */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Host IP or Domain <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="e.g. 20.235.241.140 or srv.mydomain.com"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    SSH Port <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 22 })}
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Username & Auth Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    SSH Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="ubuntu, root, ec2-user, or azureuser"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Authentication Method <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.authMethod}
                    onChange={(e) => setFormData({ ...formData, authMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="privateKey">SSH Private Key (PEM/RSA/Ed25519) - Recommended</option>
                    <option value="password">SSH Password</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Secret Key / Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    {formData.authMethod === 'privateKey' ? 'SSH Private Key (PEM or PPK)' : 'SSH Password'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {formData.authMethod === 'privateKey' && (
                      <label className="cursor-pointer text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30 transition-all flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Upload .pem / .ppk key file</span>
                        <input
                          type="file"
                          accept=".pem,.ppk,.key,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const text = event.target?.result as string;
                                if (text) {
                                  setFormData((prev) => ({ ...prev, authSecret: text }));
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                      </label>
                    )}
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Encrypted at rest with AES-256-GCM</span>
                    </span>
                  </div>
                </div>

                {formData.authMethod === 'privateKey' ? (
                  <textarea
                    required
                    rows={4}
                    value={formData.authSecret}
                    onChange={(e) => setFormData({ ...formData, authSecret: e.target.value })}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;... (or PuTTY PPK key content)"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                ) : (
                  <input
                    type="password"
                    required
                    value={formData.authSecret}
                    onChange={(e) => setFormData({ ...formData, authSecret: e.target.value })}
                    placeholder="Enter SSH password"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                )}
              </div>

              {/* Row 5: Cloud Provider & Region & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Host Provider</label>
                  <select
                    value={formData.cloudProvider}
                    onChange={(e) => setFormData({ ...formData, cloudProvider: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="other">On-Premise / Bare Metal / Other</option>
                    <option value="aws">AWS EC2</option>
                    <option value="azure">Azure Virtual Machine</option>
                    <option value="gcp">Google Cloud Platform</option>
                    <option value="on-premise">On-Premises Datacenter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Region / Location</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g. us-east-1 or on-prem"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. web, prod, nginx"
                    className="w-full px-3 py-2 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Connection Test Results Preview */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <strong className="block font-bold">{testResult.message || testResult.error}</strong>
                      {testResult.hint && (
                        <div className="mt-2 text-[11px] text-slate-300 bg-[#0B1120]/90 p-3 rounded-lg border border-slate-700/60 leading-relaxed">
                          <strong className="text-amber-400 block mb-0.5">💡 Configuration Diagnosis & Solution:</strong>
                          <span>{testResult.hint}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!testResult.success && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-rose-800/40">
                      <span className="text-[11px] text-slate-400">
                        Want to register this server now and establish connectivity later?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddServerSubmit(undefined, true)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors shrink-0"
                      >
                        Add Server in Offline Mode
                      </button>
                    </div>
                  )}

                  {testResult.preview && (
                    <div className="mt-2.5 pt-2.5 border-t border-emerald-800/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">OS:</span>
                        <span className="font-semibold text-white">
                          {testResult.preview.os?.name} {testResult.preview.os?.version}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">CPU & RAM:</span>
                        <span className="font-semibold text-white">
                          {testResult.preview.hardware?.cpuCores} Cores, {testResult.preview.initialMemory} Used
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Docker:</span>
                        <span className="font-semibold text-white">
                          {testResult.preview.dockerDetected
                            ? `${testResult.preview.dockerContainers} containers`
                            : 'Not Installed'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Kubernetes:</span>
                        <span className="font-semibold text-white">
                          {testResult.preview.k8sDetected ? 'Detected' : 'Not Detected'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span className="whitespace-pre-line leading-relaxed">{submitError}</span>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-rose-800/40">
                    <span className="text-[11px] text-slate-400">
                      You can save this server into inventory now and troubleshoot SSH access later.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddServerSubmit(undefined, true)}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors shrink-0"
                    >
                      Save as Offline Server
                    </button>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !formData.host || !formData.authSecret}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] transition-all disabled:opacity-50"
                >
                  <Radio className={`w-3.5 h-3.5 text-blue-400 ${testingConnection ? 'animate-pulse' : ''}`} />
                  <span>{testingConnection ? 'Verifying SSH...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingServer}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{submittingServer ? 'Connecting & Saving...' : 'Connect & Add Server'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AGENT INSTALLATION MODAL */}
      {/* ========================================================================= */}
      {showAgentModal && selectedAgentServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#1E293B] flex items-center justify-between sticky top-0 bg-[#111A2E] z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Monitoring Agent Setup</h3>
                  <p className="text-xs text-slate-400">
                    Optional background agent for server: <span className="text-white font-mono">{selectedAgentServer.name}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAgentModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs space-y-1.5">
                <span className="font-bold text-blue-300">Continuous Monitoring via Lightweight Agent</span>
                <p className="text-slate-300 leading-relaxed">
                  The agent runs read-only probes for OS telemetry, CPU, Memory, Disks, Docker containers, and Kubernetes pods. It reports back to the central platform via HTTPS and requires zero open inbound ports.
                </p>
              </div>

              {/* Single-line install command */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Run this single command on your Linux server:
                </label>
                <div className="flex items-center gap-2 bg-[#0D1526] border border-[#1E293B] rounded-lg p-2.5">
                  <code className="text-xs text-emerald-400 font-mono flex-1 overflow-x-auto select-all">
                    {agentScriptData?.oneLiner || `curl -sSL "http://localhost:3000/api/servers/${selectedAgentServer._id}/install-script" | bash`}
                  </code>
                  <button
                    onClick={() => {
                      if (agentScriptData?.oneLiner) {
                        navigator.clipboard.writeText(agentScriptData.oneLiner);
                        setCopiedCmd(true);
                        setTimeout(() => setCopiedCmd(false), 2000);
                      }
                    }}
                    className="p-1.5 rounded-md bg-[#18233C] text-slate-300 hover:text-white transition-colors flex-shrink-0"
                  >
                    {copiedCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Instructions list */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">Step-by-step Execution:</span>
                <ul className="text-xs text-slate-400 space-y-1.5 pl-4 list-disc">
                  <li>Log in to your target server via SSH as root or sudoer.</li>
                  <li>Execute the command above to transmit the first heartbeat.</li>
                  <li>(Optional) Add a cron job to automatically stream metrics every 60 seconds.</li>
                  <li>The dashboard will automatically update to show agent health as Online.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex justify-end">
                <button
                  onClick={() => setShowAgentModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all"
                >
                  Close & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111A2E] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Server from Monitoring</h3>
                <span className="text-xs text-slate-400 font-medium">{deleteTarget.host}:{deleteTarget.port}</span>
              </div>
            </div>

            {/* Server Details Summary Card */}
            <div className="bg-[#0D1526] border border-[#1E293B] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Server Name:</span>
                <span className="font-bold text-white">{deleteTarget.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Host IP / Port:</span>
                <span className="font-mono text-blue-400 font-semibold">{deleteTarget.host}:{deleteTarget.port}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Provider & Location:</span>
                <span className="text-slate-300">
                  <span className="uppercase">{deleteTarget.cloudProvider}</span> ({deleteTarget.region})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Health:</span>
                <span className={`font-semibold ${deleteTarget.status === 'Online' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {deleteTarget.status} ({deleteTarget.hardware?.cpuCores || 1} CPU cores, {formatBytes(deleteTarget.hardware?.totalMemoryBytes || 0)} RAM)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Disconnecting will terminate scheduled SSH telemetry collection, stop agent sync, and purge this server node from the monitoring fleet.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#18233C] text-slate-300 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteServer}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all disabled:opacity-50"
              >
                {deleting ? 'Disconnecting & Removing...' : 'Disconnect & Remove Server'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 4. Interactive SSH Terminal Modal */}
      <SSHTerminalModal
        isOpen={showTerminalModal}
        onClose={() => setShowTerminalModal(false)}
        target={terminalTarget}
      />

      {/* 5. SSH Credentials Configuration Modal (matching Second Image) */}
      <ConnectSSHModal
        isOpen={showSSHModal}
        onClose={() => setShowSSHModal(false)}
        target={sshTarget}
        onSuccess={() => {
          fetchServers();
          showNotification('success', 'SSH Credentials Saved', 'Server credentials updated successfully.');
        }}
      />
    </div>
  );
}
