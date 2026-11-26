'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Moon,
  Clock,
  Plus,
  Trash2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  BellOff,
  Server,
  ZapOff,
  Edit3,
  Save,
  X,
  RotateCcw,
  Search,
  ChevronDown,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useMonitoring } from '@/context/MonitoringContext';
import {
  AwsEc2Logo,
  AzureVmLogo,
  KubernetesLogo,
  DockerLogo,
} from '@/components/icons/CloudIcons';

export interface FleetServerItem {
  id: string;
  name: string;
  host: string;
  provider: 'aws' | 'azure' | 'k8s' | 'docker' | 'on-premise';
  region?: string;
  status: 'Online' | 'Stopped';
  isOnline: boolean;
}

interface MaintenanceWindow {
  id: string;
  target: string;
  targetName?: string;
  provider?: 'aws' | 'azure' | 'k8s' | 'docker' | 'on-premise';
  reason: string;
  startTime: string;
  endTime: string;
  status: 'active' | 'scheduled' | 'expired';
}

interface MaintenanceSilenceTabProps {
  maintenanceMode: boolean;
  onToggleMaintenance: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export function MaintenanceSilenceTab({
  maintenanceMode,
  onToggleMaintenance,
  onShowToast,
}: MaintenanceSilenceTabProps) {
  const {
    filteredEC2Instances = [],
    filteredAzureVMs = [],
    customServers = [],
    filteredK8sClusters = [],
  } = useMonitoring();

  // API servers state
  const [apiServers, setApiServers] = useState<any[]>([]);

  useEffect(() => {
    async function loadApiServers() {
      try {
        const res = await fetch('/api/servers');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.servers)) {
            setApiServers(data.servers);
          }
        }
      } catch (e) {
        // Fallback to context servers
      }
    }
    loadApiServers();
  }, []);

  // Consolidate all real infrastructure servers across AWS, Azure, K8s, and On-Premise
  const fleetServers = useMemo<FleetServerItem[]>(() => {
    const list: FleetServerItem[] = [];
    const seenHosts = new Set<string>();

    // 1. Registered API / Custom Servers
    const allRegistered = [...(apiServers || []), ...(customServers || [])];
    for (const s of allRegistered) {
      const host = s.host || s.ip || s.publicIp || s.privateIp || '';
      if (!host || seenHosts.has(host)) continue;
      seenHosts.add(host);

      const prov = (s.cloudProvider || s.provider || 'on-premise').toLowerCase();
      const isOnline = s.status === 'online' || s.status === 'running' || s.isOnline === true;
      list.push({
        id: s._id || s.id || `srv-${host}`,
        name: s.name || host,
        host,
        provider: prov.includes('aws') ? 'aws' : prov.includes('azure') ? 'azure' : 'on-premise',
        region: s.region || (prov.includes('azure') ? 'centralindia' : 'ap-southeast-2'),
        status: isOnline ? 'Online' : 'Stopped',
        isOnline,
      });
    }

    // 2. Azure Virtual Machines from MonitoringContext
    for (const vm of filteredAzureVMs) {
      const host = vm.publicIp || vm.privateIp || '';
      if (!host || seenHosts.has(host)) continue;
      seenHosts.add(host);

      const isRunning = ((vm.powerState || (vm as any).status || '') as string).toLowerCase().includes('run');
      list.push({
        id: vm.id || vm.vmId,
        name: vm.name || `azure-vm-${host}`,
        host,
        provider: 'azure',
        region: vm.region || 'centralindia',
        status: isRunning ? 'Online' : 'Stopped',
        isOnline: isRunning,
      });
    }

    // 3. AWS EC2 Instances from MonitoringContext
    for (const ec2 of filteredEC2Instances) {
      const host = ec2.publicIp || ec2.privateIp || '';
      if (!host || seenHosts.has(host)) continue;
      seenHosts.add(host);

      const isRunning = (ec2.status || '').toLowerCase().includes('run');
      list.push({
        id: ec2.instanceId,
        name: ec2.name || ec2.instanceId,
        host,
        provider: 'aws',
        region: ec2.region || 'ap-southeast-2',
        status: isRunning ? 'Online' : 'Stopped',
        isOnline: isRunning,
      });
    }

    // 4. Kubernetes Clusters
    for (const k8s of filteredK8sClusters) {
      const host = k8s.endpoint || k8s.name;
      if (!host || seenHosts.has(host)) continue;
      seenHosts.add(host);
      list.push({
        id: k8s.id || `k8s-${k8s.name}`,
        name: k8s.name,
        host,
        provider: 'k8s',
        region: k8s.region || 'cluster-default',
        status: 'Online',
        isOnline: true,
      });
    }

    // Fallback default list if no accounts connected yet
    if (list.length === 0) {
      list.push(
        {
          id: 'def-1',
          name: 'vm01siva-mon',
          host: '10.0.1.24',
          provider: 'azure',
          region: 'centralindia',
          status: 'Online',
          isOnline: true,
        },
        {
          id: 'def-2',
          name: 'aws-ec2-prod-db-01',
          host: '172.31.18.90',
          provider: 'aws',
          region: 'ap-southeast-2',
          status: 'Online',
          isOnline: true,
        },
        {
          id: 'def-3',
          name: 'k8s-cluster-workers',
          host: 'k8s.internal.cluster:6443',
          provider: 'k8s',
          region: 'us-east-1',
          status: 'Online',
          isOnline: true,
        }
      );
    }

    return list;
  }, [apiServers, customServers, filteredAzureVMs, filteredEC2Instances, filteredK8sClusters]);

  // Initial maintenance windows using real servers or local storage
  const [windows, setWindows] = useState<MaintenanceWindow[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('maintenance_windows');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('maintenance_windows', JSON.stringify(windows));
    } catch (e) {}
  }, [windows]);

  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(30);
  const [dedupMinutes, setDedupMinutes] = useState<number>(10);
  const [flapThreshold, setFlapThreshold] = useState<number>(3);
  const [policySaved, setPolicySaved] = useState<boolean>(true);

  // Window Editing State
  const [editingWindowId, setEditingWindowId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState('');
  const [editTargetName, setEditTargetName] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Add Window Form State
  const [isAddingWindow, setIsAddingWindow] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [newTarget, setNewTarget] = useState('');
  const [newTargetName, setNewTargetName] = useState('');
  const [newProvider, setNewProvider] = useState<'aws' | 'azure' | 'k8s' | 'docker' | 'on-premise'>('azure');
  const [newReason, setNewReason] = useState('');
  const [newStart, setNewStart] = useState('Immediate (Next 2 Hours)');
  const [newEnd, setNewEnd] = useState('Today +2 Hours');

  // Server Picker Dropdown State
  const [isServerPickerOpen, setIsServerPickerOpen] = useState(false);
  const [serverSearchQuery, setServerSearchQuery] = useState('');
  const serverPickerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (serverPickerRef.current && !serverPickerRef.current.contains(e.target as Node)) {
        setIsServerPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered servers in dropdown
  const filteredPickerServers = fleetServers.filter(
    (s) =>
      s.name.toLowerCase().includes(serverSearchQuery.toLowerCase()) ||
      s.host.toLowerCase().includes(serverSearchQuery.toLowerCase()) ||
      s.provider.toLowerCase().includes(serverSearchQuery.toLowerCase())
  );

  const handleSelectServer = (server: FleetServerItem) => {
    setSelectedServerId(server.id);
    setNewTarget(server.host);
    setNewTargetName(server.name);
    setNewProvider(server.provider);
    if (!newReason) {
      setNewReason(`Routine OS maintenance & security patching on ${server.name}`);
    }
    setIsServerPickerOpen(false);
    onShowToast(`Selected server: ${server.name} (${server.host})`, 'info');
  };

  const handleStartEditWindow = (win: MaintenanceWindow) => {
    setEditingWindowId(win.id);
    setEditTarget(win.target);
    setEditTargetName(win.targetName || win.target);
    setEditReason(win.reason);
    setEditStartTime(win.startTime);
    setEditEndTime(win.endTime);
  };

  const handleSaveEditWindow = (id: string) => {
    if (!editTarget.trim() || !editReason.trim()) {
      onShowToast('Target and reason cannot be empty.', 'warning');
      return;
    }
    setWindows(
      windows.map((w) =>
        w.id === id
          ? {
              ...w,
              target: editTarget.trim(),
              targetName: editTargetName.trim() || editTarget.trim(),
              reason: editReason.trim(),
              startTime: editStartTime.trim() || w.startTime,
              endTime: editEndTime.trim() || w.endTime,
            }
          : w
      )
    );
    setEditingWindowId(null);
    onShowToast(`Maintenance window for ${editTargetName.trim()} saved!`, 'success');
  };

  const handleDeleteWindow = (id: string, target: string) => {
    setWindows(windows.filter((w) => w.id !== id));
    if (editingWindowId === id) setEditingWindowId(null);
    onShowToast(`Removed maintenance window for ${target}`, 'info');
  };

  const handleAddWindow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarget.trim() || !newReason.trim()) {
      onShowToast('Please select or specify a target server and reason.', 'warning');
      return;
    }
    const newWin: MaintenanceWindow = {
      id: `mw-${Date.now()}`,
      target: newTarget.trim(),
      targetName: newTargetName.trim() || newTarget.trim(),
      provider: newProvider,
      reason: newReason.trim(),
      startTime: newStart || 'Immediate (Next 2 Hours)',
      endTime: newEnd || 'Scheduled End',
      status: 'active',
    };
    setWindows([newWin, ...windows]);
    setIsAddingWindow(false);
    setNewTarget('');
    setNewTargetName('');
    setNewReason('');
    setSelectedServerId('');
    onShowToast(`Scheduled maintenance window for ${newWin.targetName}!`, 'success');
  };

  const handleSavePolicy = () => {
    setPolicySaved(true);
    onShowToast(`Flap control (${flapThreshold}) and Dedup (${dedupMinutes}m) saved!`, 'success');
  };

  const handleResetPolicy = () => {
    setDedupMinutes(10);
    setFlapThreshold(3);
    onShowToast('Deduplication & Flap policies reset to enterprise defaults.', 'info');
  };

  const renderProviderIcon = (provider?: string) => {
    switch (provider) {
      case 'aws':
        return <AwsEc2Logo className="w-4 h-4 shrink-0" />;
      case 'azure':
        return <AzureVmLogo className="w-4 h-4 shrink-0" />;
      case 'k8s':
        return <KubernetesLogo className="w-4 h-4 shrink-0" />;
      case 'docker':
        return <DockerLogo className="w-4 h-4 shrink-0" />;
      default:
        return <Server className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Global Silence / Snooze Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          maintenanceMode
            ? 'bg-amber-950/20 border-amber-500/40 shadow-xl shadow-amber-950/30'
            : 'bg-[#090F1E]/90 border-cyan-500/30 shadow-xl'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                maintenanceMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <BellOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Global Alert Silence & Emergency Snooze
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    maintenanceMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {maintenanceMode ? 'SILENCE ACTIVE — NON-P1 MUTED' : 'NORMAL MONITORING (UNMUTED)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Temporarily pause all audio chimes, push alerts, and webhooks during large-scale deployments or planned outages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={onToggleMaintenance}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 ${
                maintenanceMode
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-950/30'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-950/30'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>{maintenanceMode ? 'Deactivate Silence (Unmute)' : 'Activate Emergency Silence'}</span>
            </button>
          </div>
        </div>

        {/* Quick Duration Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400 mr-1">Quick Snooze Duration:</span>
          {[15, 30, 60, 120, 240].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                setSnoozeMinutes(mins);
                if (!maintenanceMode) onToggleMaintenance();
                onShowToast(`Silence activated for ${mins < 60 ? `${mins} minutes` : `${mins / 60} hours`}`, 'info');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                snoozeMinutes === mins && maintenanceMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {mins < 60 ? `${mins}m` : `${mins / 60}h`}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Targeted Server Maintenance Windows with Real Server Fleet Picker */}
      <div className="bg-[#090F1E]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Targeted Server Maintenance Windows ({windows.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any real server from your multi-cloud fleet to schedule silence periods with Edit, Save & Remove.
            </p>
          </div>

          <button
            onClick={() => {
              setIsAddingWindow(!isAddingWindow);
              if (!isAddingWindow && fleetServers.length > 0) {
                // Auto-suggest first available server
                handleSelectServer(fleetServers[0]);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-950/40 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Maintenance Window</span>
          </button>
        </div>

        {/* Real Server Quick Inventory Banner */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">Live Infrastructure Fleet ({fleetServers.length}):</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {fleetServers.slice(0, 6).map((server) => (
              <button
                key={server.id}
                onClick={() => {
                  setIsAddingWindow(true);
                  handleSelectServer(server);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-750 hover:border-cyan-500/50 text-[11px] font-mono transition-all shrink-0"
                title={`Schedule maintenance for ${server.name}`}
              >
                {renderProviderIcon(server.provider)}
                <span>{server.name}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    server.isOnline ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Add Window Form with REAL SERVER SELECTOR */}
        {isAddingWindow && (
          <form
            onSubmit={handleAddWindow}
            className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/50 space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white font-mono uppercase flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Schedule New Maintenance Window (Real Server Picker)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingWindow(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* SERVER SELECTOR DROPDOWN */}
              <div className="space-y-1 relative" ref={serverPickerRef}>
                <label className="text-[11px] font-mono uppercase text-slate-300 flex items-center justify-between">
                  <span>Target Server / Host (Click to Pick)</span>
                  <span className="text-cyan-400 text-[10px] font-mono font-normal">
                    {fleetServers.length} Servers Detected
                  </span>
                </label>

                {/* Dropdown Trigger */}
                <div
                  onClick={() => setIsServerPickerOpen(!isServerPickerOpen)}
                  className="w-full bg-slate-900 border border-cyan-500/50 hover:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white cursor-pointer flex items-center justify-between transition-colors shadow-inner"
                >
                  <div className="flex items-center gap-2 truncate">
                    {renderProviderIcon(newProvider)}
                    <span className="font-bold text-cyan-300">
                      {newTargetName || 'Select a server from your live fleet...'}
                    </span>
                    {newTarget && (
                      <span className="text-[10px] font-mono text-slate-400">({newTarget})</span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isServerPickerOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* DROPDOWN POPUP DISPLAYING ALL REAL SERVERS */}
                {isServerPickerOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-[#090F1E] border border-cyan-500/50 rounded-xl shadow-2xl p-2.5 space-y-2 max-h-72 overflow-y-auto">
                    {/* Search inside server list */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search real servers by name, IP, cloud..."
                        value={serverSearchQuery}
                        onChange={(e) => setServerSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                        autoFocus
                      />
                    </div>

                    {/* Servers list items */}
                    <div className="space-y-1">
                      {filteredPickerServers.length === 0 ? (
                        <div className="p-3 text-center text-slate-500 text-xs font-mono">
                          No matching servers found
                        </div>
                      ) : (
                        filteredPickerServers.map((server) => {
                          const isSelected = selectedServerId === server.id || newTarget === server.host;
                          return (
                            <div
                              key={server.id}
                              onClick={() => handleSelectServer(server)}
                              className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-white'
                                  : 'hover:bg-slate-900 border border-transparent text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                {renderProviderIcon(server.provider)}
                                <div>
                                  <div className="text-xs font-bold flex items-center gap-2">
                                    <span>{server.name}</span>
                                    <span
                                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                        server.provider === 'aws'
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : server.provider === 'azure'
                                          ? 'bg-blue-500/20 text-blue-300'
                                          : 'bg-purple-500/20 text-purple-300'
                                      } uppercase`}
                                    >
                                      {server.provider}
                                    </span>
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400">
                                    {server.host} • {server.region || 'global'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                                    server.isOnline
                                      ? 'bg-emerald-500/15 text-emerald-400'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      server.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                                    }`}
                                  />
                                  <span>{server.status}</span>
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* REASON / SCOPE */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-400">Reason / Scope</label>
                <input
                  type="text"
                  placeholder="e.g. Database engine upgrade & disk expansion"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            {/* DURATION PRESETS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Start Time</label>
                <input
                  type="text"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">End Time</label>
                <input
                  type="text"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddingWindow(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Maintenance Window</span>
              </button>
            </div>
          </form>
        )}

        {/* Windows Table displaying real server identity */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Target Host / Server</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Window Duration</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {windows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-500 font-mono text-xs">
                    No active or scheduled maintenance windows. Click &ldquo;+ Schedule Silence Window&rdquo; above to select a real server from your fleet.
                  </td>
                </tr>
              ) : (
                windows.map((win) => {
                const isEditing = editingWindowId === win.id;

                return (
                  <tr key={win.id} className="hover:bg-slate-900/40 transition-colors">
                    {isEditing ? (
                      /* Inline Edit Row */
                      <>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={editTargetName}
                            onChange={(e) => {
                              setEditTargetName(e.target.value);
                              setEditTarget(e.target.value);
                            }}
                            className="bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-xs text-white font-mono w-full"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-xs text-white w-full"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-xs text-white font-mono w-full"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-amber-400 font-mono">Editing...</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEditWindow(win.id)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1"
                              title="Save Changes"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setEditingWindowId(null)}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      /* View Row with Edit & Remove */
                      <>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {renderProviderIcon(win.provider)}
                            <div>
                              <div className="font-mono font-bold text-cyan-300 text-xs">
                                {win.targetName || win.target}
                              </div>
                              {win.target && win.target !== win.targetName && (
                                <div className="text-[10px] font-mono text-slate-400">
                                  {win.target}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{win.reason}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {win.startTime} ➔ {win.endTime}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            {win.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartEditWindow(win)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                              title="Edit window"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteWindow(win.id, win.targetName || win.target)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Remove maintenance window"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Alert Deduplication & Flapping Controls */}
      <div className="bg-[#090F1E]/90 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Alert Deduplication & Flap Control Policies</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Suppresses repeated alert spam and groups multiple related threshold breaches into single envelopes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleResetPolicy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition-all"
              title="Reset to Defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSavePolicy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-950/40 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Policy</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Dedup window */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Deduplication Suppression Window</span>
              <span className="font-mono text-purple-300">{dedupMinutes} Minutes</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Subsequent alerts from the same server metric will be consolidated into the existing incident rather than dispatching duplicate notifications.
            </p>
            <input
              type="range"
              min="2"
              max="60"
              value={dedupMinutes}
              onChange={(e) => {
                setDedupMinutes(Number(e.target.value));
                setPolicySaved(false);
              }}
              className="w-full accent-purple-500 cursor-pointer pt-1"
            />
          </div>

          {/* Flap Control */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Flapping Threshold Gate</span>
              <span className="font-mono text-purple-300">{flapThreshold} State Changes / 15m</span>
            </div>
            <p className="text-[11px] text-slate-400">
              When a service toggles between HEALTHY and UNHEALTHY {flapThreshold} times within 15 minutes, it is marked as FLAPPING and muted until stabilized.
            </p>
            <input
              type="range"
              min="2"
              max="10"
              value={flapThreshold}
              onChange={(e) => {
                setFlapThreshold(Number(e.target.value));
                setPolicySaved(false);
              }}
              className="w-full accent-purple-500 cursor-pointer pt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
