'use client';

import React from 'react';
import {
  Server,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  Rocket,
  ShieldCheck,
  Terminal,
  FileCode,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';
import { INginxDeploymentData } from '@/models/NginxDeployment';
import { DiscoveredApp } from '@/lib/nginx/nginxEngine';

interface NginxOverviewTabProps {
  activeServer: INginxServerData | null;
  serverDetails: any;
  deployments: INginxDeploymentData[];
  discoveredApps: DiscoveredApp[];
  onExecuteNginxAction: (action: 'start' | 'stop' | 'restart' | 'reload' | 'test') => void;
  onNavigateTab: (tab: string) => void;
  onOpenTerminal: () => void;
  isActionLoading?: boolean;
}

export function NginxOverviewTab({
  activeServer,
  serverDetails,
  deployments,
  discoveredApps,
  onExecuteNginxAction,
  onNavigateTab,
  onOpenTerminal,
  isActionLoading,
}: NginxOverviewTabProps) {
  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400 space-y-3">
        <Server className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
        <h3 className="text-base font-bold text-white">No Server Selected</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Please select or register an AWS EC2 instance or Azure Virtual Machine to begin managing Nginx and application deployments.
        </p>
      </div>
    );
  }

  const isNginxRunning = activeServer.nginxStatus === 'RUNNING' || serverDetails?.nginxStatus === 'RUNNING';
  const isNginxStopped = activeServer.nginxStatus === 'STOPPED' || serverDetails?.nginxStatus === 'STOPPED';

  const memPercent = serverDetails?.metrics?.memoryPercent || activeServer.metrics?.memoryPercent || 0;
  const diskPercent = serverDetails?.metrics?.diskPercent || activeServer.metrics?.diskPercent || 0;
  const uptime = serverDetails?.metrics?.uptime || activeServer.metrics?.uptime || 'N/A';

  return (
    <div className="space-y-5">
      {/* Top Banner: Quick Actions & Server Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Nginx Service Controller Card */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Nginx Web Server
              </span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Nginx Service</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    isNginxRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : isNginxStopped
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isNginxRunning ? 'RUNNING' : isNginxStopped ? 'STOPPED' : activeServer.nginxStatus || 'UNKNOWN'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {activeServer.nginxVersion ? `Version ${activeServer.nginxVersion}` : 'Checking version...'}
                {activeServer.nginxPorts && activeServer.nginxPorts.length > 0 && ` | Ports: ${activeServer.nginxPorts.join(', ')}`}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2 border-t border-[#1E293B]/70">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => onExecuteNginxAction('start')}
                disabled={isActionLoading || isNginxRunning}
                className="px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>
              <button
                onClick={() => onExecuteNginxAction('stop')}
                disabled={isActionLoading || isNginxStopped}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition disabled:opacity-40"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
              <button
                onClick={() => onExecuteNginxAction('restart')}
                disabled={isActionLoading}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
              <button
                onClick={() => onExecuteNginxAction('reload')}
                disabled={isActionLoading}
                className="px-3 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-40"
              >
                <span>Reload</span>
              </button>
            </div>

            <button
              onClick={() => onExecuteNginxAction('test')}
              disabled={isActionLoading}
              className="w-full py-1.5 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700/80 transition flex items-center justify-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>Test Configuration (`nginx -t`)</span>
            </button>
          </div>
        </div>

        {/* Server Hardware Telemetry Card */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Host Telemetry
              </span>
              <h3 className="text-base font-bold text-white">System Resources</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Memory Usage */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  RAM Usage
                </span>
                <span className="font-mono font-bold text-white">{memPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    memPercent > 85 ? 'bg-rose-500' : memPercent > 60 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${memPercent}%` }}
                />
              </div>
            </div>

            {/* Disk Usage */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  Disk Root (/)
                </span>
                <span className="font-mono font-bold text-white">{diskPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    diskPercent > 85 ? 'bg-rose-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${diskPercent}%` }}
                />
              </div>
            </div>

            {/* OS & Uptime */}
            <div className="pt-2 border-t border-[#1E293B]/70 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Operating System</span>
                <span className="font-semibold text-slate-200 truncate block">
                  {activeServer.osName || 'Ubuntu Linux'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Server Uptime</span>
                <span className="font-mono text-slate-200 truncate block">{uptime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch Deployment Callout */}
        <div className="bg-gradient-to-br from-blue-900/30 via-[#111A2E] to-purple-900/30 border border-blue-500/30 rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Rocket className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Application Deployment
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Deploy Local Build</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upload your local Vite, React, Next.js Standalone or Node.js build ZIP directly to{' '}
              <strong className="text-white">{activeServer.name}</strong>. Zero rebuild required on remote server.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onNavigateTab('deploy')}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
            >
              <span>Deploy Build Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenTerminal}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Open PuTTY SSH Terminal"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Columns: Discovered Apps & Recent Deployments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Applications on Server */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Discovered Applications</h4>
                <p className="text-xs text-slate-400">Running Node & PM2 instances</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('apps')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>View All ({discoveredApps.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {discoveredApps.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p>No applications discovered yet on {activeServer.name}.</p>
              <p className="text-[11px] text-slate-500 mt-1">Deploy an application or check PM2 processes.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {discoveredApps.slice(0, 4).map((app, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#0B1120] border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-xs">{app.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                        {app.type}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                      {app.directory}
                    </p>
                  </div>

                  <div className="text-right">
                    {app.port && (
                      <span className="text-[11px] font-mono font-semibold text-emerald-400 block">
                        Port :{app.port}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">
                      PM2: {app.pm2Status || 'inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Deployments */}
        <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Rocket className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Recent Deployments</h4>
                <p className="text-xs text-slate-400">Audit trail of uploaded builds</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('deploy')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>View Deployments ({deployments.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {deployments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Rocket className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p>No deployments recorded yet for this server.</p>
              <button
                onClick={() => onNavigateTab('deploy')}
                className="mt-2 text-blue-400 hover:text-blue-300 font-semibold text-xs inline-flex items-center gap-1"
              >
                <span>Deploy your first build</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {deployments.slice(0, 4).map((dep) => {
                const isSuccess = dep.status === 'SUCCESS';
                const isFailed = dep.status === 'FAILED';
                return (
                  <div
                    key={dep.deploymentId}
                    className="p-3 rounded-xl bg-[#0B1120] border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{dep.appName}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isFailed
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400">
                        {dep.deploymentId} &bull; {new Date(dep.startTime).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-mono text-slate-300 block">
                        {dep.durationSeconds ? `${dep.durationSeconds}s` : 'Active'}
                      </span>
                      {dep.appUrl && (
                        <a
                          href={dep.appUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5 justify-end"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

