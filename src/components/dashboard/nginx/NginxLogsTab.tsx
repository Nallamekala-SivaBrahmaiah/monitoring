'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Copy,
  Check,
  Download,
  Pause,
  Play,
  Filter,
  AlertTriangle,
  Clock,
  Terminal,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';

interface NginxLogsTabProps {
  activeServer: INginxServerData | null;
  logType: 'access' | 'error';
}

export function NginxLogsTab({ activeServer, logType }: NginxLogsTabProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lineCount, setLineCount] = useState<number>(200);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  const logPath = logType === 'access' ? '/var/log/nginx/access.log' : '/var/log/nginx/error.log';

  const fetchLogs = async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const url = `/api/nginx/servers/${activeServer._id}/logs?type=${logType}&lines=${lineCount}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.lines) {
        setLogs(data.lines);
        setRawText(data.raw || '');
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeServer) {
      fetchLogs();
    }
  }, [activeServer?._id, logType, lineCount]);

  // Periodic refresh when not paused
  useEffect(() => {
    if (!activeServer || isPaused) return;
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [activeServer?._id, isPaused, logType, lineCount]);

  const handleCopy = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!rawText) return;
    const blob = new Blob([rawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nginx-${logType}-${activeServer?.name || 'server'}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter lines
  const filteredLines = logs.filter((line) => {
    const matchesSearch = !search || line.toLowerCase().includes(search.toLowerCase());
    let matchesStatus = true;
    if (statusFilter !== 'all' && logType === 'access') {
      matchesStatus = line.includes(`" ${statusFilter} `);
    } else if (statusFilter !== 'all' && logType === 'error') {
      matchesStatus = line.toLowerCase().includes(`[${statusFilter.toLowerCase()}]`);
    }
    return matchesSearch && matchesStatus;
  });

  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server to view {logType === 'access' ? 'access' : 'error'} logs.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {logType === 'access' ? 'Nginx Access Logs' : 'Nginx Error Logs'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {logPath} &bull; {filteredLines.length} line(s) loaded
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search in log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status / Severity Filter */}
          {logType === 'access' ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All HTTP Codes</option>
              <option value="200">200 OK</option>
              <option value="301">301 Redirect</option>
              <option value="404">404 Not Found</option>
              <option value="500">500 Server Error</option>
              <option value="502">502 Bad Gateway</option>
            </select>
          ) : (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="error">error</option>
              <option value="warn">warn</option>
              <option value="crit">crit</option>
              <option value="notice">notice</option>
            </select>
          )}

          {/* Line count */}
          <select
            value={lineCount}
            onChange={(e) => setLineCount(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="100">100 lines</option>
            <option value="200">200 lines</option>
            <option value="500">500 lines</option>
            <option value="1000">1000 lines</option>
          </select>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
              isPaused
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={isPaused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? 'Paused' : 'Live'}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            title="Download log file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="bg-[#070B14] border border-slate-800 rounded-2xl p-4 shadow-2xl min-h-[480px] max-h-[650px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
        {loading && logs.length === 0 ? (
          <div className="py-24 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Fetching live logs from {activeServer.host}...</span>
          </div>
        ) : filteredLines.length === 0 ? (
          <div className="py-24 text-center text-slate-500 font-sans">
            No log entries found matching your filters.
          </div>
        ) : (
          filteredLines.map((line, idx) => {
            const isError = line.includes(' 500 ') || line.includes('[error]') || line.includes('[crit]');
            const isWarn = line.includes(' 404 ') || line.includes('[warn]');
            const isSuccess = line.includes(' 200 ');

            return (
              <div
                key={idx}
                className={`py-0.5 hover:bg-slate-900/60 rounded px-1.5 transition ${
                  isError ? 'text-rose-400 font-semibold' : isWarn ? 'text-amber-300' : isSuccess ? 'text-emerald-300/90' : 'text-slate-300'
                }`}
              >
                {line}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

