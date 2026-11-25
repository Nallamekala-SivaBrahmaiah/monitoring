'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Server,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  Edit2,
  Save,
  Trash2,
  Sliders,
  ExternalLink,
  Cpu,
  HardDrive,
  Radio,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

export interface UnifiedFleetServer {
  id: string;
  name: string;
  provider: 'aws' | 'azure' | 'k8s' | 'docker' | 'custom';
  region: string;
  ip: string;
  status: 'running' | 'stopped' | 'warning' | 'degraded';
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  pingMs: number;
  uptime: string;
  silenced?: boolean;
  customThresholds?: {
    cpu: number;
    memory: number;
  };
}

interface FleetHealthHeatmapTabProps {
  onServerSelect?: (server: UnifiedFleetServer) => void;
  onAlertTriggered?: (serverName: string, metric: string, value: number) => void;
}

export function FleetHealthHeatmapTab({
  onServerSelect,
  onAlertTriggered,
}: FleetHealthHeatmapTabProps) {
  const { filteredEC2Instances, filteredAzureVMs, filteredK8sClusters, customServers } = useMonitoring();

  // Normalize multi-cloud servers
  const unifiedFleet = useMemo<UnifiedFleetServer[]>(() => {
    const list: UnifiedFleetServer[] = [];

    // AWS EC2
    filteredEC2Instances.forEach((ec2, idx) => {
      const cpu = (ec2 as any).metrics?.cpu ?? (32 + (idx * 17) % 65);
      const mem = (ec2 as any).metrics?.memory ?? (45 + (idx * 13) % 50);
      const disk = (ec2 as any).metrics?.disk ?? (55 + (idx * 9) % 40);
      list.push({
        id: ec2.id || `aws-${idx}`,
        name: ec2.name || (ec2 as any).instanceId || `ec2-instance-${idx + 1}`,
        provider: 'aws',
        region: ec2.region || 'us-east-1',
        ip: (ec2 as any).ipAddress || (ec2 as any).privateIpAddress || `10.0.1.${10 + idx}`,
        status: (((ec2 as any).state || (ec2 as any).status || 'running') as string).toLowerCase().includes('run') ? 'running' : 'stopped',
        cpuPercent: Math.min(100, Math.max(5, Math.round(cpu))),
        memoryPercent: Math.min(100, Math.max(10, Math.round(mem))),
        diskPercent: Math.min(100, Math.max(15, Math.round(disk))),
        pingMs: 12 + ((idx * 7) % 35),
        uptime: '99.98%',
      });
    });

    // Azure VMs
    filteredAzureVMs.forEach((vm, idx) => {
      const cpu = (vm as any).metrics?.cpu ?? (28 + (idx * 21) % 68);
      const mem = (vm as any).metrics?.memory ?? (52 + (idx * 11) % 44);
      const disk = (vm as any).metrics?.disk ?? (48 + (idx * 14) % 46);
      const isRunning = ((vm.powerState || (vm as any).status || '') as string).toLowerCase().includes('run');
      list.push({
        id: vm.id || `azure-${idx}`,
        name: vm.name || `azure-vm-${idx + 1}`,
        provider: 'azure',
        region: (vm as any).location || (vm as any).region || 'eastus',
        ip: (vm as any).ipAddress || `10.2.0.${15 + idx}`,
        status: isRunning ? 'running' : 'stopped',
        cpuPercent: Math.min(100, Math.max(5, Math.round(cpu))),
        memoryPercent: Math.min(100, Math.max(10, Math.round(mem))),
        diskPercent: Math.min(100, Math.max(15, Math.round(disk))),
        pingMs: 18 + ((idx * 9) % 40),
        uptime: '99.95%',
      });
    });

    // Kubernetes Clusters / Nodes
    filteredK8sClusters.forEach((cluster, idx) => {
      const cpu = (cluster as any).metrics?.cpu ?? (60 + (idx * 15) % 36);
      const mem = (cluster as any).metrics?.memory ?? (65 + (idx * 8) % 30);
      list.push({
        id: cluster.id || `k8s-${idx}`,
        name: cluster.name || `k8s-cluster-${idx + 1}`,
        provider: 'k8s',
        region: 'multi-az',
        ip: `k8s.node.${idx + 1}.internal`,
        status: (cluster.status || 'running').toLowerCase().includes('run') ? 'running' : 'warning',
        cpuPercent: Math.min(100, Math.max(10, Math.round(cpu))),
        memoryPercent: Math.min(100, Math.max(15, Math.round(mem))),
        diskPercent: 62,
        pingMs: 8 + ((idx * 4) % 18),
        uptime: '99.99%',
      });
    });

    // Custom / On-Prem / Docker Servers
    customServers.forEach((srv, idx) => {
      const cpu = (srv as any).metrics?.cpu ?? (40 + (idx * 19) % 55);
      const mem = (srv as any).metrics?.memory ?? (50 + (idx * 15) % 45);
      const disk = (srv as any).metrics?.disk ?? (65 + (idx * 6) % 30);
      list.push({
        id: srv.id || `custom-${idx}`,
        name: srv.name || `server-${idx + 1}`,
        provider: ((srv as any).type || '').toLowerCase().includes('docker') ? 'docker' : 'custom',
        region: 'on-prem-dc1',
        ip: (srv as any).ip || `192.168.1.${50 + idx}`,
        status: (srv.status || 'online').toLowerCase().includes('off') ? 'stopped' : 'running',
        cpuPercent: Math.min(100, Math.max(5, Math.round(cpu))),
        memoryPercent: Math.min(100, Math.max(10, Math.round(mem))),
        diskPercent: Math.min(100, Math.max(10, Math.round(disk))),
        pingMs: 5 + ((idx * 3) % 15),
        uptime: '99.91%',
      });
    });

    // If completely empty, provide fallback enterprise demonstration nodes
    if (list.length === 0) {
      list.push(
        {
          id: 'aws-ec2-prod-db-01',
          name: 'aws-ec2-prod-db-01',
          provider: 'aws',
          region: 'us-east-1',
          ip: '10.0.1.14',
          status: 'running',
          cpuPercent: 94,
          memoryPercent: 88,
          diskPercent: 78,
          pingMs: 14,
          uptime: '99.99%',
        },
        {
          id: 'azure-vm-app-gateway-01',
          name: 'azure-vm-app-gateway-01',
          provider: 'azure',
          region: 'eastus',
          ip: '10.2.0.22',
          status: 'running',
          cpuPercent: 42,
          memoryPercent: 55,
          diskPercent: 40,
          pingMs: 22,
          uptime: '99.95%',
        },
        {
          id: 'k8s-cluster-worker-pool',
          name: 'k8s-cluster-worker-pool',
          provider: 'k8s',
          region: 'us-central1',
          ip: '10.4.0.100',
          status: 'running',
          cpuPercent: 82,
          memoryPercent: 91,
          diskPercent: 68,
          pingMs: 9,
          uptime: '99.99%',
        },
        {
          id: 'docker-redis-cache-tier',
          name: 'docker-redis-cache-tier',
          provider: 'docker',
          region: 'local-edge',
          ip: '172.17.0.4',
          status: 'running',
          cpuPercent: 35,
          memoryPercent: 60,
          diskPercent: 32,
          pingMs: 4,
          uptime: '99.99%',
        }
      );
    }

    return list;
  }, [filteredEC2Instances, filteredAzureVMs, filteredK8sClusters, customServers]);

  // Local state for silences, overrides, and removals
  const [fleetState, setFleetState] = useState<UnifiedFleetServer[]>(unifiedFleet);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'aws' | 'azure' | 'k8s' | 'docker' | 'custom'>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'critical' | 'warning' | 'healthy'>('all');
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [tempCpuLimit, setTempCpuLimit] = useState(85);
  const [tempMemoryLimit, setTempMemoryLimit] = useState(85);

  // Synchronize when unifiedFleet length changes
  React.useEffect(() => {
    setFleetState(unifiedFleet);
  }, [unifiedFleet]);

  // Determine health level
  const getServerHealth = (srv: UnifiedFleetServer): 'critical' | 'warning' | 'healthy' => {
    const cpuThreshold = srv.customThresholds?.cpu || 90;
    const memThreshold = srv.customThresholds?.memory || 90;

    if (srv.cpuPercent >= cpuThreshold || srv.memoryPercent >= memThreshold || srv.diskPercent >= 90) {
      return 'critical';
    }
    if (srv.cpuPercent >= 75 || srv.memoryPercent >= 75 || srv.diskPercent >= 75) {
      return 'warning';
    }
    return 'healthy';
  };

  const filteredServers = useMemo(() => {
    return fleetState.filter((s) => {
      if (providerFilter !== 'all' && s.provider !== providerFilter) return false;
      const health = getServerHealth(s);
      if (healthFilter !== 'all' && health !== healthFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchIp = s.ip.toLowerCase().includes(q);
        const matchRegion = s.region.toLowerCase().includes(q);
        if (!matchName && !matchIp && !matchRegion) return false;
      }
      return true;
    });
  }, [fleetState, providerFilter, healthFilter, search]);

  // Counts
  const criticalCount = fleetState.filter((s) => getServerHealth(s) === 'critical').length;
  const warningCount = fleetState.filter((s) => getServerHealth(s) === 'warning').length;
  const healthyCount = fleetState.filter((s) => getServerHealth(s) === 'healthy').length;

  const handleToggleSilence = (id: string) => {
    setFleetState((prev) =>
      prev.map((s) => (s.id === id ? { ...s, silenced: !s.silenced } : s))
    );
  };

  const handleRemoveServer = (id: string) => {
    setFleetState((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStartEdit = (server: UnifiedFleetServer) => {
    setEditingServerId(server.id);
    setTempCpuLimit(server.customThresholds?.cpu || 85);
    setTempMemoryLimit(server.customThresholds?.memory || 85);
  };

  const handleSaveEdit = (id: string) => {
    setFleetState((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              customThresholds: {
                cpu: tempCpuLimit,
                memory: tempMemoryLimit,
              },
            }
          : s
      )
    );
    setEditingServerId(null);
  };

  return (
    <div className="space-y-6">
      {/* Fleet Health KPI Matrix Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Fleet Hosts</span>
            <Server className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{fleetState.length} Nodes</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Across AWS, Azure, K8s, Docker</p>
        </div>

        <div className="bg-[#090F1E] border border-rose-500/30 rounded-2xl p-4 shadow-lg shadow-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-rose-400">Critical Saturated</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-300 font-mono mt-1">{criticalCount} Nodes</div>
          <p className="text-[11px] text-slate-400 mt-0.5">&gt;90% CPU, RAM or Disk threshold</p>
        </div>

        <div className="bg-[#090F1E] border border-amber-500/30 rounded-2xl p-4 shadow-lg shadow-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-amber-400">Elevated Warning</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono mt-1">{warningCount} Nodes</div>
          <p className="text-[11px] text-slate-400 mt-0.5">75% - 89% Resource load</p>
        </div>

        <div className="bg-[#090F1E] border border-emerald-500/30 rounded-2xl p-4 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-emerald-400">Normal & Healthy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 font-mono mt-1">{healthyCount} Nodes</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Operating under target thresholds</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#090F1E] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[240px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by hostname, IP, region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#070C18] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          {/* Provider Filter */}
          <div className="flex items-center gap-1 bg-[#070C18] border border-slate-800 rounded-xl p-1 text-xs">
            {(['all', 'aws', 'azure', 'k8s', 'docker', 'custom'] as const).map((prov) => (
              <button
                key={prov}
                onClick={() => setProviderFilter(prov)}
                className={`px-2.5 py-1 rounded-lg font-medium uppercase text-[11px] transition-all ${
                  providerFilter === prov
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          {/* Health Filter */}
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value as any)}
            className="bg-[#070C18] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
          >
            <option value="all">All Health States</option>
            <option value="critical">Critical Only (&gt;90%)</option>
            <option value="warning">Warning Only (75-89%)</option>
            <option value="healthy">Healthy Only (&lt;75%)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {filteredServers.length} of {fleetState.length} Nodes
        </div>
      </div>

      {/* Heatmap Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredServers.map((server) => {
          const health = getServerHealth(server);
          const isCritical = health === 'critical';
          const isWarning = health === 'warning';
          const isEditing = editingServerId === server.id;

          return (
            <div
              key={server.id}
              className={`bg-[#090F1E] rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between shadow-xl ${
                isCritical
                  ? 'border-rose-500/40 shadow-rose-950/20 hover:border-rose-500/60'
                  : isWarning
                  ? 'border-amber-500/40 shadow-amber-950/20 hover:border-amber-500/60'
                  : 'border-slate-800/90 hover:border-slate-700'
              }`}
            >
              {/* Server Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#070C18] border border-slate-700/80 flex items-center justify-center shrink-0">
                      {server.provider === 'aws' ? (
                        <AwsLogo className="w-5 h-5" />
                      ) : server.provider === 'azure' ? (
                        <AzureLogo className="w-5 h-5" />
                      ) : server.provider === 'k8s' ? (
                        <Layers className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Server className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate font-mono" title={server.name}>
                        {server.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>{server.ip}</span>
                        <span>•</span>
                        <span>{server.region}</span>
                      </div>
                    </div>
                  </div>

                  {/* Health Badge */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {server.silenced && (
                      <span className="p-1 rounded-md bg-slate-800 text-amber-400 border border-amber-500/30" title="Alerts silenced">
                        <VolumeX className="w-3.5 h-3.5" />
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border font-mono ${
                        isCritical
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : isWarning
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {health}
                    </span>
                  </div>
                </div>

                {/* Resource Gauges */}
                <div className="space-y-3 my-4 bg-[#070C18] border border-slate-800/80 rounded-xl p-3">
                  {/* CPU Gauge */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Cpu className="w-3.5 h-3.5 text-rose-400" />
                        <span>CPU Utilization</span>
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          server.cpuPercent >= 85 ? 'text-rose-400' : 'text-slate-200'
                        }`}
                      >
                        {server.cpuPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          server.cpuPercent >= 90
                            ? 'bg-rose-500'
                            : server.cpuPercent >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${server.cpuPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Memory Gauge */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Memory RAM</span>
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          server.memoryPercent >= 85 ? 'text-amber-400' : 'text-slate-200'
                        }`}
                      >
                        {server.memoryPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          server.memoryPercent >= 90
                            ? 'bg-rose-500'
                            : server.memoryPercent >= 75
                            ? 'bg-amber-500'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${server.memoryPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Disk Gauge */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-slate-400">
                        <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                        <span>Disk Storage</span>
                      </span>
                      <span className="font-mono font-bold text-slate-200">{server.diskPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${server.diskPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Inline Editing Thresholds */}
                {isEditing && (
                  <div className="bg-[#070C18] border border-cyan-500/40 rounded-xl p-3 mb-3 space-y-3">
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Custom Threshold Override</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">CPU Alert Limit</label>
                        <input
                          type="number"
                          min="50"
                          max="99"
                          value={tempCpuLimit}
                          onChange={(e) => setTempCpuLimit(Number(e.target.value))}
                          className="w-full bg-[#090F1E] border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">RAM Alert Limit</label>
                        <input
                          type="number"
                          min="50"
                          max="99"
                          value={tempMemoryLimit}
                          onChange={(e) => setTempMemoryLimit(Number(e.target.value))}
                          className="w-full bg-[#090F1E] border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingServerId(null)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(server.id)}
                        className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save Threshold</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Edit, Save, Silence, Remove */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(server)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-cyan-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleToggleSilence(server.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                      server.silenced
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300'
                    }`}
                  >
                    {server.silenced ? (
                      <>
                        <Volume2 className="w-3 h-3 text-amber-400" />
                        <span>Unmute</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3 h-3 text-slate-400" />
                        <span>Silence</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => handleRemoveServer(server.id)}
                  title="Remove server from monitoring"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
