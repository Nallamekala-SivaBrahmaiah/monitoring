'use client';

import React from 'react';
import {
  Layers,
  Rocket,
  Folder,
  Globe,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Server,
  ArrowRight,
  Terminal,
  Cpu,
  Package,
  Wrench,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';
import { DiscoveredApp } from '@/lib/nginx/nginxEngine';

interface NginxApplicationsTabProps {
  activeServer: INginxServerData | null;
  apps: DiscoveredApp[];
  onRefresh: () => void;
  onDeployNew: (prefillDir?: string, prefillName?: string) => void;
  loading?: boolean;
}

export function NginxApplicationsTab({
  activeServer,
  apps,
  onRefresh,
  onDeployNew,
  loading,
}: NginxApplicationsTabProps) {
  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server to view deployed applications.
      </div>
    );
  }

  const getFrameworkBadge = (app: DiscoveredApp) => {
    const t = (app.type || '').toLowerCase();
    if (t.includes('next')) {
      return { label: app.frameworkName || 'Next.js', color: 'bg-black text-white border-slate-700' };
    }
    if (t.includes('vite')) {
      return { label: app.frameworkName || 'Vite', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
    }
    if (t.includes('maven')) {
      return { label: app.frameworkName || 'Maven / Java', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    }
    if (t.includes('gradle')) {
      return { label: app.frameworkName || 'Gradle / Java', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' };
    }
    if (t.includes('docker')) {
      return { label: app.frameworkName || 'Docker App', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
    }
    if (t.includes('express')) {
      return { label: app.frameworkName || 'Express.js', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    }
    return { label: app.frameworkName || 'Node.js', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Application Discovery &amp; Frameworks</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live applications detected in <code className="text-blue-300">/var/www</code>, <code className="text-blue-300">/opt</code>, <code className="text-blue-300">/home</code>, and <code className="text-blue-300">/srv</code> on <strong className="text-slate-200">{activeServer.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Rescan Apps</span>
          </button>

          <button
            type="button"
            onClick={() => onDeployNew()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/25 transition cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Deploy Application</span>
          </button>
        </div>
      </div>

      {/* Grid of Applications */}
      {apps.length === 0 ? (
        <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-16 text-center text-slate-400 space-y-3">
          <Layers className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
          <h4 className="text-base font-bold text-white">No Applications Discovered Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No active PM2 or framework project files (package.json, pom.xml, build.gradle, Dockerfile) detected in standard paths on this server. Click below to deploy your application build.
          </p>
          <button
            type="button"
            onClick={() => onDeployNew()}
            className="mt-3 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            <span>Deploy First Application</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app, i) => {
            const badge = getFrameworkBadge(app);
            return (
              <div
                key={i}
                className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-lg shadow-black/20 hover:border-slate-700 transition flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${badge.color}`}>
                        {badge.label}
                      </span>
                      <h4 className="text-base font-bold text-white pt-1">{app.name}</h4>
                    </div>
                    {app.port && (
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        :{app.port}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-[#1E293B]">
                    {/* Project Directory */}
                    <div className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-[11px] truncate text-slate-300" title={app.directory}>
                        {app.directory}
                      </span>
                    </div>

                    {/* Runtime Version */}
                    <div className="flex items-center justify-between text-[11px] bg-[#0B1120] px-2.5 py-1.5 rounded-lg border border-[#1E293B]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-blue-400" />
                        <span>Runtime:</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-200">
                        {app.runtimeVersion || 'Auto-detected'}
                      </span>
                    </div>

                    {/* Package Manager */}
                    <div className="flex items-center justify-between text-[11px] bg-[#0B1120] px-2.5 py-1.5 rounded-lg border border-[#1E293B]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Package className="w-3 h-3 text-purple-400" />
                        <span>Package Mgr:</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-200">
                        {app.packageManager || 'npm'}
                      </span>
                    </div>

                    {/* Build Configuration */}
                    <div className="flex items-center justify-between text-[11px] bg-[#0B1120] px-2.5 py-1.5 rounded-lg border border-[#1E293B]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-amber-400" />
                        <span>Build Cmd:</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-200 truncate max-w-[140px]" title={app.buildConfig || 'npm run build'}>
                        {app.buildConfig || 'npm run build'}
                      </span>
                    </div>

                    {app.pm2Name && (
                      <div className="flex items-center gap-1.5 text-xs text-purple-300 pt-1">
                        <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>PM2: <strong>{app.pm2Name}</strong> ({app.pm2Status || 'active'})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E293B]/70 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDeployNew(app.directory, app.name)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Rocket className="w-3 h-3" />
                    <span>Deploy Application</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
