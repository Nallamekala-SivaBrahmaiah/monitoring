'use client';

import React from 'react';
import {
  Server,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { TOOL_CATALOG } from '@/lib/automation/toolCatalog';

interface OverviewProps {
  servers: any[];
  executions: any[];
  totalPackages?: number;
  onSelectTab: (tab: 'overview' | 'servers' | 'install' | 'scripts' | 'terminal' | 'history') => void;
  onQuickInstall: (toolIds: string[]) => void;
}

export function AutomationOverviewTab({
  servers,
  executions,
  totalPackages,
  onSelectTab,
  onQuickInstall,
}: OverviewProps) {
  const packageCatalogCount = totalPackages ?? TOOL_CATALOG.length;
  const onlineServers = servers.filter(
    (s) => (s.status || '').toLowerCase() === 'online' || (s.status || '').toLowerCase() === 'running'
  ).length;

  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter((e) => e.status === 'success').length;
  const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100;

  const popularTools = [
    { id: 'docker', name: 'Docker Engine', desc: 'Containerization standard' },
    { id: 'java', name: 'Java 17 JDK', desc: 'OpenJDK runtime' },
    { id: 'nodejs', name: 'Node.js 20 LTS', desc: 'JavaScript runtime' },
    { id: 'git', name: 'Git CLI', desc: 'Version control' },
    { id: 'nginx', name: 'Nginx Web Server', desc: 'Reverse proxy & HTTP' },
    { id: 'ansible', name: 'Ansible Engine', desc: 'Agentless automation' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0C1527] via-[#101E38] to-[#0A1325] border border-cyan-500/20 p-6 md:p-8 shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono tracking-wider">
                DEVOPS AUTOMATION ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                CENTRALIZED SHELL SCRIPTS
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Server Setup & Remote Automation Hub
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Automate multi-cloud software provisioning, programming language runtimes, security scanners, and custom bash scripts across remote Linux servers with real-time streaming execution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('install')}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Install Tools Now</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('scripts')}
              className="px-5 py-3 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-slate-700 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Custom Scripts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Managed Servers */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Managed Servers
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Server className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{servers.length}</span>
            <span className="text-xs text-emerald-400 font-medium">
              ({onlineServers} Online)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">AWS, Azure & On-Premise nodes</p>
        </div>

        {/* Total Tools Available */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tool Catalog
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{packageCatalogCount}</span>
            <span className="text-xs text-purple-300 font-medium">Across 7 Categories</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Idempotent functions in central script</p>
        </div>

        {/* Total Executions */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Executions
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{totalExecutions}</span>
            <span className="text-xs text-blue-300 font-medium">Logged & Tracked</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">With real-time stdout streams</p>
        </div>

        {/* Success Rate */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Execution Success Rate
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{successRate}%</span>
            <span className="text-xs text-slate-400 font-medium">
              ({successfulExecutions}/{totalExecutions || 0})
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Zero duplicate packages installed</p>
        </div>
      </div>

      {/* Two Column Section: Quick Deploy Presets & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Tool Presets */}
        <div className="lg:col-span-2 bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Popular DevOps Tools & Runtimes</h2>
              <p className="text-xs text-slate-400">Click any tool to jump directly to installation with it pre-selected</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('install')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All {packageCatalogCount}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {popularTools.map((pt) => (
              <div
                key={pt.id}
                onClick={() => onQuickInstall([pt.id])}
                className="bg-[#111A2E] hover:bg-[#16223B] border border-slate-800 hover:border-cyan-500/40 rounded-xl p-4 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {pt.name}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-slate-400">{pt.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-cyan-400 font-medium">
                  <span>Quick Select</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick 3-Tool DevOps Bundle Button */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-cyan-300">
                ⚡ Recommended CI/CD Node Preset (Docker + Java 17 + Git)
              </span>
              <p className="text-[11px] text-slate-300">
                Prepares a pristine remote server for Jenkins build agents with Docker Engine, OpenJDK 17, and Git.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onQuickInstall(['docker', 'java', 'git'])}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>Install Bundle (3 Tools)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Executions Widget */}
        <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Recent Automations</h2>
                <p className="text-xs text-slate-400">Latest execution logs</p>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('history')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Full History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {executions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No executions recorded yet.</p>
                <p className="text-[11px] text-slate-600">Run an installation to view real-time logs here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {executions.slice(0, 5).map((ex) => {
                  const isSuccess = ex.status === 'success';
                  const isRunning = ex.status === 'running';
                  const isFailed = ex.status === 'failed';
                  const isPartial = ex.status === 'partial';

                  return (
                    <div
                      key={ex._id}
                      className="p-3 rounded-xl bg-[#111A2E] border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">{ex.serverName}</span>
                          <span className="text-[10px] font-mono text-slate-400">({ex.serverHost})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {ex.executionType === 'tool-installation'
                            ? `${ex.selectedTools?.length || 0} Tools (${ex.selectedTools?.map((t: any) => t.toolId).join(', ')})`
                            : ex.scriptName || 'Custom Script'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isRunning
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                              : isPartial
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {ex.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('servers')}
            className="w-full py-2.5 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-slate-700 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manage Remote Servers</span>
          </button>
        </div>
      </div>
    </div>
  );
}
