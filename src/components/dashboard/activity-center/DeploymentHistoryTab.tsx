'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  GitCommit,
  Layers,
  Server,
  X,
  FileCode,
} from 'lucide-react';

export function DeploymentHistoryTab() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<{ title: string; logs: string } | null>(null);

  // Form states
  const [appName, setAppName] = useState('');
  const [projectName, setProjectName] = useState('MultiCloud Monitoring');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [platform, setPlatform] = useState<'aws' | 'azure' | 'onprem' | 'kubernetes'>('onprem');
  const [targetServer, setTargetServer] = useState('');
  const [branch, setBranch] = useState('main');
  const [commitId, setCommitId] = useState('');
  const [buildVersion, setBuildVersion] = useState('v1.0.0');
  const [dockerImage, setDockerImage] = useState('');
  const [deployStatus, setDeployStatus] = useState<'successful' | 'failed' | 'in_progress'>('successful');
  const [logs, setLogs] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (envFilter !== 'all') params.set('environment', envFilter);

      const res = await fetch(`/api/activity-center/deployments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDeployments(data.deployments || []);
      }
    } catch (err) {
      console.error('Fetch deployments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, [statusFilter, envFilter]);

  const handleRecordDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/activity-center/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          projectName,
          environment,
          platform,
          targetServer,
          branch,
          commitId,
          buildVersion,
          dockerImage,
          status: deployStatus,
          logs,
          initiatingUser: 'DevOps Engineer',
          durationSeconds: 45,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setAppName('');
        setTargetServer('');
        setLogs('');
        fetchDeployments();
      }
    } catch (err) {
      alert(`Error saving deployment: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-400" />
            <span>Continuous Deployment & Rollout History</span>
          </h2>
          <p className="text-xs text-slate-400">
            Audit-tracked deployments across AWS, Azure, On-Premises, and Kubernetes clusters
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-teal-500/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Record Deployment</span>
          </button>
          <button
            type="button"
            onClick={fetchDeployments}
            className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700/80 transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Deployments Table */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#111A2E] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Started (IST)</th>
                <th className="py-3 px-4">Application</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Target Server / Cluster</th>
                <th className="py-3 px-4">Git Branch & Commit</th>
                <th className="py-3 px-4">Docker Image / Version</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Loading deployments history...
                  </td>
                </tr>
              ) : deployments.length > 0 ? (
                deployments.map((dep) => (
                  <tr key={dep._id || dep.deploymentId} className="hover:bg-[#111A2E]/60 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-teal-300 whitespace-nowrap">
                      {new Date(dep.startTime).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{dep.appName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {dep.environment}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{dep.targetServer}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      <span className="text-cyan-300">{dep.branch || 'main'}</span>{' '}
                      {dep.commitId && <span className="text-slate-500">({dep.commitId.substring(0, 7)})</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {dep.buildVersion || dep.dockerImage || 'latest'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          dep.status === 'successful'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40'
                            : dep.status === 'failed'
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-500/40'
                            : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/40'
                        }`}
                      >
                        {dep.status === 'successful' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : dep.status === 'failed' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{dep.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {dep.logs ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLogs({ title: `${dep.appName} (${dep.buildVersion})`, logs: dep.logs })}
                          className="px-2.5 py-1 rounded-lg bg-[#111A2E] hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold cursor-pointer"
                        >
                          View Logs
                        </button>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No deployment records found. Deployments initiated in the platform or recorded manually will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. View Logs Modal */}
      {selectedLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-teal-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Deployment Execution Logs</h3>
                <span className="text-[11px] text-teal-400 font-mono">{selectedLogs.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogs(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <pre className="p-4 rounded-xl bg-[#050914] border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selectedLogs.logs}
              </pre>
            </div>
            <div className="p-4 border-t border-slate-800 bg-[#090F1C] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogs(null)}
                className="px-4 py-2 rounded-xl bg-[#111A2E] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Record Deployment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#0C1425] border border-teal-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-sm text-white">Record Deployment Entry</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordDeployment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Application Name *</label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g. backend-api, frontend-ui"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Environment</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Target Server / Host *</label>
                  <input
                    type="text"
                    required
                    value={targetServer}
                    onChange={(e) => setTargetServer(e.target.value)}
                    placeholder="e.g. vm01siva-mon (4.240.105.247)"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="onprem">On-Premises / Linux</option>
                    <option value="aws">AWS EC2 / ECS</option>
                    <option value="azure">Azure VM / App Service</option>
                    <option value="kubernetes">Kubernetes Cluster</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-cyan-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Commit ID</label>
                  <input
                    type="text"
                    value={commitId}
                    onChange={(e) => setCommitId(e.target.value)}
                    placeholder="7f8b92c"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Build Version</label>
                  <input
                    type="text"
                    value={buildVersion}
                    onChange={(e) => setBuildVersion(e.target.value)}
                    placeholder="v1.2.4"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Deployment Status</label>
                <select
                  value={deployStatus}
                  onChange={(e) => setDeployStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="successful">Successful</option>
                  <option value="failed">Failed</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Deployment Logs</label>
                <textarea
                  rows={4}
                  value={logs}
                  onChange={(e) => setLogs(e.target.value)}
                  placeholder="Deployment output, container build logs, or exit codes..."
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#111A2E] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Recording...' : 'Record Deployment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
