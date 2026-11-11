'use client';

import React from 'react';
import {
  Play,
  Square,
  ExternalLink,
  Terminal,
  Trash2,
  Server,
  Activity,
  Layers,
  Clock,
  RotateCw,
  AlertTriangle,
  Globe,
  Radio,
} from 'lucide-react';
import { IMavenAppData } from '@/models/MavenApp';

interface MavenActiveAppsTableProps {
  apps: IMavenAppData[];
  loading: boolean;
  onRefresh: () => void;
  onStartApp: (app: IMavenAppData) => void;
  onStopApp: (appId: string) => void;
  onDeleteApp: (appId: string) => void;
  onViewLogs: (app: IMavenAppData) => void;
}

export function MavenActiveAppsTable({
  apps,
  loading,
  onRefresh,
  onStartApp,
  onStopApp,
  onDeleteApp,
  onViewLogs,
}: MavenActiveAppsTableProps) {
  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-[#1E293B] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Managed Application Runtimes</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {apps.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Live Spring Boot &amp; Java application processes running on host
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-300 hover:text-white text-xs font-semibold transition-colors"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh Runtimes</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0D1526] text-slate-400 font-semibold border-b border-[#1E293B]">
            <tr>
              <th className="py-3 px-4">Application</th>
              <th className="py-3 px-4">Framework / Artifact</th>
              <th className="py-3 px-4">Port / Endpoint</th>
              <th className="py-3 px-4">PID</th>
              <th className="py-3 px-4">Runtime Status</th>
              <th className="py-3 px-4">Started / Uptime</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/60 text-slate-200">
            {apps.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Server className="w-8 h-8 text-slate-600" />
                    <span className="text-sm font-medium text-slate-400">
                      No applications currently running.
                    </span>
                    <span className="text-xs text-slate-500 max-w-md">
                      Build your Maven project and click &quot;Run Application&quot; to launch Spring Boot or Java services.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              apps.map((app) => {
                const isRunning = app.status === 'RUNNING';
                const isStarting = app.status === 'STARTING';
                const isStopped = app.status === 'STOPPED';
                const isFailed = app.status === 'FAILED';

                const directUrl = app.appUrl || `http://localhost:${app.port}`;
                const proxyUrl = `/api/maven/apps/${app._id}/proxy/`;

                return (
                  <tr
                    key={app._id}
                    className="hover:bg-[#162036]/50 transition-colors"
                  >
                    {/* Project / App Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{app.projectName}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px] block">
                        {app.runCommand}
                      </span>
                    </td>

                    {/* Framework & Artifact */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                          {app.framework || 'Java'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono truncate max-w-[180px] block mt-0.5">
                        {app.artifactName}
                      </span>
                    </td>

                    {/* Port & Endpoints */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 text-[11px] font-bold">
                          :{app.port}
                        </span>
                        {isRunning && (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={directUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-emerald-400 transition-colors"
                              title="Open direct localhost"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={proxyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-blue-400 transition-colors text-[10px] underline"
                              title="Open via secure reverse proxy"
                            >
                              proxy
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* PID */}
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {app.pid ? (
                        <span className="text-slate-300 font-semibold">{app.pid}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isRunning
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : isStarting
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse'
                            : isFailed
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                            : 'bg-slate-800/80 text-slate-400 border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isRunning
                              ? 'bg-emerald-400 animate-pulse'
                              : isStarting
                              ? 'bg-amber-400'
                              : isFailed
                              ? 'bg-rose-400'
                              : 'bg-slate-500'
                          }`}
                        />
                        <span>{app.status}</span>
                      </span>
                      {app.errorMessage && (
                        <span className="text-[10px] text-rose-400 block truncate max-w-[160px] mt-0.5" title={app.errorMessage}>
                          {app.errorMessage}
                        </span>
                      )}
                    </td>

                    {/* Started / Uptime */}
                    <td className="py-3 px-4 text-slate-400">
                      {app.startTime ? (
                        <div>
                          <span>{new Date(app.startTime).toLocaleTimeString()}</span>
                          {app.uptimeSeconds ? (
                            <span className="text-[10px] text-slate-500 block">
                              Duration: {app.uptimeSeconds}s
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Open Application Button */}
                        {isRunning && (
                          <a
                            href={directUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors shadow-sm"
                            title="Open Application in Browser"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </a>
                        )}

                        {/* Stop Button */}
                        {(isRunning || isStarting) && (
                          <button
                            onClick={() => onStopApp(app._id)}
                            className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 transition-colors"
                            title="Stop Application"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        {/* Start / Restart Button */}
                        {(isStopped || isFailed) && (
                          <button
                            onClick={() => onStartApp(app)}
                            className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 transition-colors"
                            title="Start Application"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        {/* View Logs Button */}
                        <button
                          onClick={() => onViewLogs(app)}
                          className="p-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] border border-[#1E293B] text-slate-300 hover:text-white transition-colors"
                          title="View Application Logs"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Record Button */}
                        <button
                          onClick={() => onDeleteApp(app._id)}
                          className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Delete Application Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

