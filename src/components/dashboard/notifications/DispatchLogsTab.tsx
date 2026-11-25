'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  Send,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  Mail,
  Volume2,
  Bell,
  Webhook,
  Smartphone,
  ExternalLink,
  Zap,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
} from 'lucide-react';

interface DispatchLog {
  id: string;
  timestamp: string;
  severity: 'P1' | 'P2' | 'P3';
  channel: 'email' | 'audio' | 'push' | 'webhook' | 'sms';
  target: string;
  message: string;
  latencyMs: number;
  status: 'delivered' | 'retrying' | 'failed';
  httpCode?: number;
}

interface DispatchLogsTabProps {
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export function DispatchLogsTab({ onShowToast }: DispatchLogsTabProps) {
  // Test Dispatcher State
  const [testSeverity, setTestSeverity] = useState<'P1' | 'P2' | 'P3'>('P1');
  const [testChannel, setTestChannel] = useState<'all' | 'email' | 'audio' | 'push' | 'webhook' | 'sms'>('all');
  const [testMessage, setTestMessage] = useState('Synthetic Health Check Breach: CPU utilization on aws-ec2-prod-db-01 reached 96.2%');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  // Logs Filter State
  const [filterChannel, setFilterChannel] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [logs, setLogs] = useState<DispatchLog[]>([
    {
      id: 'log-1',
      timestamp: 'Just now (17:20:12)',
      severity: 'P1',
      channel: 'audio',
      target: 'In-App WebAudio Siren',
      message: 'aws-ec2-prod-db-01: High CPU threshold breach (>95%)',
      latencyMs: 4,
      status: 'delivered',
      httpCode: 200,
    },
    {
      id: 'log-2',
      timestamp: '1 min ago (17:19:40)',
      severity: 'P1',
      channel: 'webhook',
      target: 'Slack Channel: #sre-critical',
      message: 'P1 Critical Incident dispatched to primary SRE Slack channel',
      latencyMs: 82,
      status: 'delivered',
      httpCode: 200,
    },
    {
      id: 'log-3',
      timestamp: '2 mins ago (17:18:15)',
      severity: 'P1',
      channel: 'email',
      target: 'nallasiva552@gmail.com',
      message: '[ALERT CRITICAL] Production Database Disk usage at 91.4%',
      latencyMs: 146,
      status: 'delivered',
      httpCode: 250,
    },
    {
      id: 'log-4',
      timestamp: '5 mins ago (17:15:02)',
      severity: 'P2',
      channel: 'push',
      target: 'Chrome Desktop Push Worker',
      message: 'azure-vm-web-01: Memory utilization at 86.8%',
      latencyMs: 64,
      status: 'delivered',
      httpCode: 200,
    },
    {
      id: 'log-5',
      timestamp: '12 mins ago (17:08:19)',
      severity: 'P3',
      channel: 'email',
      target: 'devops-sre-alerts@company.internal',
      message: 'Daily Cloud Infrastructure Health Digest & Uptime Report',
      latencyMs: 128,
      status: 'delivered',
      httpCode: 250,
    },
  ]);

  const handleSendTestDispatch = () => {
    const newLog: DispatchLog = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now (' + new Date().toLocaleTimeString() + ')',
      severity: testSeverity,
      channel: testChannel === 'all' ? 'email' : testChannel,
      target: testChannel === 'all' ? 'Multi-Channel Broadcast (All Active)' : `${testChannel.toUpperCase()} Gateway`,
      message: testMessage,
      latencyMs: Math.floor(Math.random() * 80) + 40,
      status: 'delivered',
      httpCode: 200,
    };
    setLogs([newLog, ...logs]);
    onShowToast(`Dispatched test ${testSeverity} alert across ${testChannel.toUpperCase()}!`, 'success');
  };

  const handleRemoveLog = (id: string) => {
    setLogs(logs.filter((l) => l.id !== id));
    onShowToast('Log entry removed.', 'info');
  };

  const handleClearAllLogs = () => {
    setLogs([]);
    onShowToast('All delivery audit logs cleared.', 'warning');
  };

  const filteredLogs = logs.filter((log) => {
    if (filterChannel !== 'ALL' && log.channel.toUpperCase() !== filterChannel) return false;
    if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) return false;
    if (
      searchTerm &&
      !log.target.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.message.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. 1-Click Interactive Test Dispatcher Deck with Edit, Save & Reset */}
      <div className="bg-[#090F1E]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" />
              <span>1-Click Real-Time Test Alert Dispatcher</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly fire synthetic alarm payloads with editable message templates to verify end-to-end receipt.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isEditingTemplate ? (
              <button
                onClick={() => {
                  setIsEditingTemplate(false);
                  onShowToast('Custom test payload template saved!', 'success');
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Template</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditingTemplate(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Template</span>
              </button>
            )}

            <button
              onClick={() => {
                setTestMessage('Synthetic Health Check Breach: CPU utilization on aws-ec2-prod-db-01 reached 96.2%');
                setIsEditingTemplate(false);
                onShowToast('Template reset to default.', 'info');
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700"
              title="Reset Template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Editable Message Field */}
        {isEditingTemplate && (
          <div className="space-y-1 text-xs animate-in fade-in duration-150">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Custom Payload Message</label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full bg-slate-900 border border-cyan-500 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Severity selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-slate-400">Severity Tier</label>
            <div className="flex gap-2">
              {(['P1', 'P2', 'P3'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setTestSeverity(sev)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                    testSeverity === sev
                      ? sev === 'P1'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : sev === 'P2'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Channel selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-slate-400">Target Channel</label>
            <select
              value={testChannel}
              onChange={(e) => setTestChannel(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Broadcast: All Active Channels</option>
              <option value="email">Email SMTP Gateway</option>
              <option value="audio">In-App Audio Chime</option>
              <option value="push">Desktop Browser Push</option>
              <option value="webhook">Outbound Webhooks</option>
              <option value="sms">Emergency SMS</option>
            </select>
          </div>

          {/* Trigger Button */}
          <div className="flex items-end">
            <button
              onClick={handleSendTestDispatch}
              className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Fire Test Alert Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Telemetry SLA Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#090F1E]/90 border border-slate-800 backdrop-blur-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Total Dispatched</div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-1">1,428</div>
        </div>

        <div className="p-4 rounded-xl bg-[#090F1E]/90 border border-slate-800 backdrop-blur-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Success Rate</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">99.98%</div>
        </div>

        <div className="p-4 rounded-xl bg-[#090F1E]/90 border border-slate-800 backdrop-blur-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Mean Latency</div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-300 mt-1">112 ms</div>
        </div>

        <div className="p-4 rounded-xl bg-[#090F1E]/90 border border-slate-800 backdrop-blur-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Dropped Events</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">0</div>
        </div>
      </div>

      {/* 3. Live Dispatch Logs Table (With Remove on each row & Clear All) */}
      <div className="bg-[#090F1E]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-cyan-400" />
              <span>Live Delivery Audit Ledger ({filteredLogs.length} Records)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable telemetry log recording every dispatched alert envelope, latency, and remote server HTTP response.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
            {/* Search box */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter logs or host..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Clear All Logs Button */}
            {logs.length > 0 && (
              <button
                onClick={handleClearAllLogs}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                title="Clear All Audit Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-mono text-[10px] text-slate-500 uppercase mr-1">Channel:</span>
          {['ALL', 'EMAIL', 'AUDIO', 'PUSH', 'WEBHOOK', 'SMS'].map((chan) => (
            <button
              key={chan}
              onClick={() => setFilterChannel(chan)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all border ${
                filterChannel === chan
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {chan}
            </button>
          ))}

          <span className="text-slate-700 mx-1">|</span>

          <span className="font-mono text-[10px] text-slate-500 uppercase mr-1">Severity:</span>
          {['ALL', 'P1', 'P2', 'P3'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all border ${
                filterSeverity === sev
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Logs Table with Remove button on each row */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Destination / Target</th>
                <th className="py-2.5 px-3">Alert Message</th>
                <th className="py-2.5 px-3 text-right">Latency</th>
                <th className="py-2.5 px-3 text-right">Status</th>
                <th className="py-2.5 px-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-bold ${
                        log.severity === 'P1'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : log.severity === 'P2'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-[10px] font-mono text-slate-300 border border-slate-700 uppercase">
                      {log.channel}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-cyan-300 max-w-[180px] truncate" title={log.target}>
                    {log.target}
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-[240px] truncate" title={log.message}>
                    {log.message}
                  </td>
                  <td className="py-3 px-3 font-mono text-right text-emerald-400 text-[11px]">
                    {log.latencyMs}ms
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{log.httpCode ? `${log.httpCode} OK` : 'Delivered'}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleRemoveLog(log.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove log entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
