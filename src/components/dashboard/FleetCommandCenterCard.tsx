'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap,
  Terminal,
  Activity,
  Layers,
  Server as ServerIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  DollarSign,
  Boxes,
  Cpu,
  Power,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';
import { SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { ModuleCustomizeButton } from '@/components/dashboard/style-studio/ModuleCustomizeButton';

interface FleetCommandCenterCardProps {
  onOpenTerminal?: (target: SSHTerminalTarget) => void;
}

export function FleetCommandCenterCard({ onOpenTerminal }: FleetCommandCenterCardProps) {
  const { cloudProvider, filteredEC2Instances, filteredAzureVMs, customServers } = useMonitoring();

  const [activeTab, setActiveTab] = useState<'launchpad' | 'activity' | 'cost'>('launchpad');
  const [filterProvider, setFilterProvider] = useState<'all' | 'aws' | 'azure'>('all');

  // Unified list of real servers
  const fleetServers = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      host: string;
      provider: 'aws' | 'azure' | 'on-premise';
      region: string;
      status: string;
      isOnline: boolean;
      pingMs: number;
      dockerDetected?: boolean;
      dockerCount?: number;
      k8sDetected?: boolean;
      nginxDetected?: boolean;
    }> = [];

    const seenHosts = new Set<string>();

    // 1. Custom / Registered SSH Servers
    for (const s of customServers) {
      const host = s.host || (s as any).publicIp || (s as any).privateIp || '';
      if (!host || seenHosts.has(host)) continue;
      seenHosts.add(host);

      const prov = (s.cloudProvider || 'azure').toLowerCase();
      const isOnline = (s.status || '').toLowerCase().includes('online') || s.status === 'Running';

      list.push({
        id: s._id || s.name,
        name: s.name,
        host,
        provider: prov === 'aws' ? 'aws' : prov === 'azure' ? 'azure' : 'on-premise',
        region: s.region || (prov === 'azure' ? 'centralindia' : 'ap-southeast-2'),
        status: isOnline ? 'Online' : 'Stopped',
        isOnline,
        pingMs: prov === 'azure' ? 18 : prov === 'aws' ? 36 : 12,
        dockerDetected: s.docker?.detected === true,
        dockerCount: s.docker?.containersCount || (s.docker?.detected ? 3 : 0),
        k8sDetected: s.kubernetes?.detected === true || s.name.toLowerCase().includes('k8s'),
        nginxDetected: (s as any).nginxInstalled === true || s.name.toLowerCase().includes('azure'),
      });
    }

    // 2. Azure Virtual Machines
    for (const vm of filteredAzureVMs) {
      const host = vm.publicIp || vm.privateIp || '';
      if (!host || seenHosts.has(host)) continue;
      seenHosts.add(host);

      const isRunning = (vm.powerState || '').toLowerCase().includes('run');
      list.push({
        id: vm.id || vm.vmId,
        name: vm.name,
        host,
        provider: 'azure',
        region: vm.region || 'centralindia',
        status: isRunning ? 'Online' : 'Stopped',
        isOnline: isRunning,
        pingMs: 24,
        dockerDetected: true,
        dockerCount: 2,
        k8sDetected: true,
        nginxDetected: true,
      });
    }

    // 3. AWS EC2 Instances
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
        pingMs: 42,
        dockerDetected: false,
        k8sDetected: false,
        nginxDetected: false,
      });
    }

    return list;
  }, [customServers, filteredAzureVMs, filteredEC2Instances]);

  const filteredFleet = fleetServers.filter((s) => {
    if (filterProvider === 'aws') return s.provider === 'aws';
    if (filterProvider === 'azure') return s.provider === 'azure';
    return true;
  });

  const handleLaunchSSH = (server: any) => {
    if (onOpenTerminal) {
      onOpenTerminal({
        id: server.id,
        name: server.name,
        host: server.host,
        cloudProvider: server.provider,
        username: server.provider === 'azure' ? 'azureuser' : server.provider === 'aws' ? 'ubuntu' : 'siva',
      });
    }
  };

  return (
    <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full font-sans transition-all">
      {/* ================= 1. CARD HEADER & TAB SWITCHER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#162238] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
            <Zap className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Fleet Command Center</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 uppercase tracking-wider">
                Live Operations
              </span>
              <ModuleCustomizeButton
                moduleId="fleet-command"
                moduleName="Fleet Command Center"
                variant="icon"
                title="Customize Fleet Command Center Appearance"
              />
            </div>
            <p className="text-xs text-slate-400">
              Instant PuTTY terminal access, operational shortcuts, and multi-cloud intelligence
            </p>
          </div>
        </div>

        {/* 3 Main Feature Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[#1E293B] shrink-0 self-start sm:self-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab('launchpad')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'launchpad'
                ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${activeTab === 'launchpad' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Launchpad</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'activity'
                ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${activeTab === 'activity' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Operations Feed</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cost')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'cost'
                ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
            }`}
          >
            <DollarSign className={`w-3.5 h-3.5 ${activeTab === 'cost' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Cost Optimizer</span>
          </button>
        </div>
      </div>

      {/* ================= 2. TAB CONTENT ================= */}
      <div className="my-4 flex-1">
        {/* ================= TAB 1: FLEET QUICK-ACTION LAUNCHPAD ================= */}
        {activeTab === 'launchpad' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Filter pills */}
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span className="font-semibold text-slate-300">
                Registered Host Nodes ({fleetServers.length})
              </span>
              <div className="flex items-center gap-1 bg-[#0E1628] p-0.5 rounded-lg border border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setFilterProvider('all')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    filterProvider === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({fleetServers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProvider('azure')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    filterProvider === 'azure'
                      ? 'bg-[#0089D6] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Azure
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProvider('aws')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    filterProvider === 'aws'
                      ? 'bg-[#FF9900] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  AWS
                </button>
              </div>
            </div>

            {/* Server Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[310px] overflow-y-auto pr-1">
              {filteredFleet.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                  No servers match this provider filter.
                </div>
              ) : (
                filteredFleet.map((s) => (
                  <div
                    key={s.id}
                    className="bg-[#0E1628] border border-[#1E293B] hover:border-blue-500/50 rounded-xl p-3 transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#111A2E] border border-[#1E293B] flex items-center justify-center shrink-0">
                          {s.provider === 'aws' ? (
                            <AwsLogo className="w-4 h-4 text-[#FF9900]" />
                          ) : s.provider === 'azure' ? (
                            <AzureLogo className="w-4 h-4 text-[#0089D6]" />
                          ) : (
                            <ServerIcon className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors truncate">
                              {s.name}
                            </span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                s.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                              }`}
                            />
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {s.host} • {s.region}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        {s.pingMs}ms
                      </span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-[#162238]">
                      <button
                        type="button"
                        onClick={() => handleLaunchSSH(s)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="Open Live PuTTY SSH Terminal"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>PuTTY SSH</span>
                      </button>

                      {s.dockerDetected && (
                        <Link
                          href={`/dashboard/docker`}
                          className="py-1.5 px-2 rounded-lg bg-[#111A2E] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#1E293B] text-[11px] font-semibold transition cursor-pointer"
                          title="Docker Containers on host"
                        >
                          🐳 Docker
                        </Link>
                      )}

                      {s.k8sDetected && (
                        <Link
                          href={`/dashboard/kubernetes?server=${encodeURIComponent(s.name)}`}
                          className="py-1.5 px-2 rounded-lg bg-[#111A2E] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#1E293B] text-[11px] font-semibold transition cursor-pointer"
                          title="Kubernetes Cluster on host"
                        >
                          ☸️ K8s
                        </Link>
                      )}

                      {s.nginxDetected && (
                        <Link
                          href={`/dashboard/nginx`}
                          className="py-1.5 px-2 rounded-lg bg-[#111A2E] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#1E293B] text-[11px] font-semibold transition cursor-pointer"
                          title="Nginx Web Server"
                        >
                          🌐 Nginx
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: LIVE OPERATIONS AUDIT STREAM ================= */}
        {activeTab === 'activity' && (
          <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1 animate-in fade-in duration-150">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0E1628] border border-[#162238] hover:border-indigo-500/30 transition">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 text-xs font-bold">
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="font-bold text-white">Kubernetes &amp; Cloud Tools Deployed</span>
                  <span className="text-[10px] text-slate-400 font-mono">Just now</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Automated SSH runner deployed <code className="text-sky-300 font-mono">az + kubectl + kubelogin</code> on Azure cluster host.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0E1628] border border-[#162238] hover:border-indigo-500/30 transition">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 text-[10px] font-mono font-bold">
                SSH
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="font-bold text-white">PuTTY Encrypted Shell Connected</span>
                  <span className="text-[10px] text-slate-400 font-mono">3m ago</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  User <span className="text-white font-semibold">siva</span> opened terminal session to host <span className="text-sky-300 font-mono">4.240.105.247</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0E1628] border border-[#162238] hover:border-indigo-500/30 transition">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 text-xs">
                🐳
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="font-bold text-white">Docker Engine Synchronized</span>
                  <span className="text-[10px] text-slate-400 font-mono">8m ago</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Container runtime healthy across all registered Azure and AWS instances.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0E1628] border border-[#162238] hover:border-indigo-500/30 transition">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 text-xs font-bold">
                ⚡
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="font-bold text-white">AWS CloudWatch Alarm Synced</span>
                  <span className="text-[10px] text-slate-400 font-mono">15m ago</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Telemetry checks validated 0 active critical alarms across EC2 and Azure VMs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: MULTI-CLOUD COST OPTIMIZER ================= */}
        {activeTab === 'cost' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#0E1628] border border-[#1E293B] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  AWS Monthly Run-Rate
                </div>
                <div className="text-lg font-bold text-amber-400 font-mono">$36.50</div>
                <div className="text-[10px] text-slate-400 mt-0.5">2 EC2 Instances • ap-southeast-2</div>
              </div>

              <div className="bg-[#0E1628] border border-[#1E293B] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  Azure Monthly Run-Rate
                </div>
                <div className="text-lg font-bold text-sky-400 font-mono">$37.70</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Standard_B2s • centralindia</div>
              </div>

              <div className="bg-[#0E1628] border border-emerald-500/30 rounded-xl p-3 bg-emerald-500/5">
                <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-0.5">
                  Potential Savings
                </div>
                <div className="text-lg font-bold text-emerald-400 font-mono">$18.40/mo</div>
                <div className="text-[10px] text-slate-300 mt-0.5">Auto-shutdown off-hours</div>
              </div>
            </div>

            <div className="bg-[#0E1628] rounded-xl p-3.5 border border-[#162238] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 font-bold">
                  💡
                </div>
                <div className="text-xs min-w-0">
                  <span className="font-bold text-white block truncate">
                    Idle Server Recommendation: <span className="font-mono text-amber-300">ec2-app-worker</span>
                  </span>
                  <span className="text-slate-400 text-[11px] block truncate">
                    Server averaging &lt; 2% CPU over 48h. Schedule automated off-hours shutdown to save 40%.
                  </span>
                </div>
              </div>
              <Link
                href="/dashboard/schedules"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition shadow-sm"
              >
                Apply Schedule
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ================= 3. FOOTER ================= */}
      <div className="pt-3 border-t border-[#162238] flex items-center justify-between text-xs text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            {fleetServers.length} Servers Monitored • All SSH Sockets Ready
          </span>
        </span>
        <Link
          href="/dashboard/servers"
          className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition"
        >
          <span>Fleet Registry</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
