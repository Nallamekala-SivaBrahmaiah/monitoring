'use client';

import React, { useState } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Key,
  Shield,
  Trash2,
  Edit2,
  Check,
  Terminal,
  Sparkles,
  ExternalLink,
  Radio,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { IAnsibleControllerData } from '@/models/AnsibleController';

interface AnsibleControllersTabProps {
  controllers?: IAnsibleControllerData[];
  activeController?: IAnsibleControllerData | null;
  onSelectActiveController?: (controllerId: string) => Promise<void>;
  onSelectController?: (controllerId: string) => Promise<void>;
  onAddControllerClick?: () => void;
  onRefreshControllers?: () => void;
  onRefresh?: () => void;
  onSetupAnsibleClick?: (controller: IAnsibleControllerData) => void;
  onDeleteControllerClick?: (controller: IAnsibleControllerData) => void;
  onAddWorkerClick?: (controller: IAnsibleControllerData) => void;
}

export function AnsibleControllersTab({
  controllers: propControllers,
  activeController: propActiveController,
  onSelectActiveController,
  onSelectController,
  onAddControllerClick,
  onRefreshControllers,
  onRefresh,
  onSetupAnsibleClick,
  onDeleteControllerClick,
  onAddWorkerClick,
}: AnsibleControllersTabProps) {
  const [internalControllers, setInternalControllers] = useState<IAnsibleControllerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installMsg, setInstallMsg] = useState<{ id: string; success: boolean; text: string } | null>(null);

  const fetchInternalControllers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ansible/controllers');
      const data = await res.json();
      if (res.ok && data.controllers) {
        setInternalControllers(data.controllers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!propControllers) {
      fetchInternalControllers();
    }
  }, [propControllers]);

  const controllers = propControllers || internalControllers;
  const activeController = propActiveController || controllers.find((c) => c.isActive) || null;

  const triggerRefresh = () => {
    if (onRefreshControllers) onRefreshControllers();
    if (onRefresh) onRefresh();
    if (!propControllers) fetchInternalControllers();
  };

  const handleSelectController = async (id: string) => {
    if (onSelectActiveController) {
      await onSelectActiveController(id);
    } else if (onSelectController) {
      await onSelectController(id);
    } else {
      await fetch(`/api/ansible/controllers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setActive: true }),
      });
      triggerRefresh();
    }
  };

  const handleDeleteController = async (c: IAnsibleControllerData) => {
    if (onDeleteControllerClick) {
      onDeleteControllerClick(c);
      return;
    }
    if (!confirm(`Are you sure you want to delete controller "${c.name}"? Assigned workers will be detached.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/ansible/controllers/${c._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        triggerRefresh();
      } else {
        alert(data.error || 'Failed to delete controller');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting controller');
    }
  };

  const handleAddWorker = async (c: IAnsibleControllerData) => {
    if (c._id && activeController?._id !== c._id) {
      await handleSelectController(c._id);
    }
    if (onAddWorkerClick) {
      onAddWorkerClick(c);
    }
  };

  const handleSetupAnsible = async (c: IAnsibleControllerData) => {
    if (onSetupAnsibleClick) {
      onSetupAnsibleClick(c);
      return;
    }
    if (!c._id) return;
    setInstallingId(c._id);
    setInstallMsg(null);
    try {
      const res = await fetch(`/api/ansible/controllers/${c._id}/install`, { method: 'POST' });
      const data = await res.json();
      setInstallMsg({
        id: c._id,
        success: data.success,
        text: data.message || (data.success ? 'Ansible setup completed!' : data.error || 'Setup failed'),
      });
      triggerRefresh();
    } catch (err: any) {
      setInstallMsg({
        id: c._id,
        success: false,
        text: err.message || 'Setup error',
      });
    } finally {
      setInstallingId(null);
      setTimeout(() => setInstallMsg(null), 8000);
    }
  };

  const handleTestSSH = async (c: IAnsibleControllerData) => {
    if (!c._id) return;
    setTestingId(c._id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/ansible/controllers/${c._id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({
        id: c._id,
        success: data.success,
        message: data.message || (data.success ? 'SSH connected' : data.error || 'Failed to connect'),
      });
      triggerRefresh();
    } catch (err: any) {
      setTestResult({
        id: c._id,
        success: false,
        message: err.message || 'SSH connection error',
      });
    } finally {
      setTestingId(null);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white tracking-wide">Ansible Controllers Fleet</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
                {controllers.length} {controllers.length === 1 ? 'Controller' : 'Controllers'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Central master nodes executing playbooks. Each controller independently manages its own dedicated workers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshControllers}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition"
            title="Refresh All Controllers Health"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onAddControllerClick}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Controller</span>
          </button>
        </div>
      </div>

      {/* Test Result Toast */}
      {testResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            testResult.success
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Controllers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {controllers.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-[#111A2E]/80 border border-[#1E293B] rounded-2xl">
            <Server className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">No Ansible Controllers Configured</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Add your first central Linux machine (AWS EC2 / Azure VM) to manage workers and execute playbooks.
            </p>
            <button
              onClick={onAddControllerClick}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
            >
              Add Controller Node
            </button>
          </div>
        ) : (
          controllers.map((c) => {
            const isActive = activeController?._id === c._id;
            const isOnline = c.status === 'Online';
            const isTesting = testingId === c._id;

            return (
              <div
                key={c._id || c.name}
                className={`relative bg-[#111A2E]/90 border rounded-2xl p-5 shadow-xl transition flex flex-col justify-between ${
                  isActive
                    ? 'border-blue-500/60 shadow-blue-500/10 ring-1 ring-blue-500/30'
                    : 'border-[#1E293B] hover:border-slate-700/80'
                }`}
              >
                {/* Active Controller Ribbon */}
                {isActive && (
                  <div className="absolute -top-3 right-5 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                    <span>Currently Active Controller</span>
                  </div>
                )}

                <div>
                  {/* Top Row: Identity and Provider */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        {c.provider === 'aws' ? (
                          <AwsLogo className="w-5 h-5" />
                        ) : c.provider === 'azure' ? (
                          <AzureLogo className="w-5 h-5" />
                        ) : (
                          <Server className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white tracking-wide">{c.name}</h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center gap-1">
                              <Radio className="w-2.5 h-2.5 text-blue-400 animate-pulse" />
                              Active Controller
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          {c.ipAddress} {c.privateIp && <span className="text-slate-500 font-normal">({c.privateIp})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                          isOnline
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span>{c.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Controller Specs Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#0D1527] border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">OS</span>
                      <span className="font-semibold text-slate-200 truncate block" title={c.os}>
                        {c.os || 'Linux'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0D1527] border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Ansible</span>
                      <span className="font-semibold text-blue-400 truncate block">
                        {c.ansibleVersion || 'Core 2.16'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0D1527] border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Python</span>
                      <span className="font-semibold text-emerald-400 truncate block">
                        {c.pythonVersion || 'Python 3.10+'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0D1527] border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Managed Workers</span>
                      <span className="font-bold text-indigo-300">
                        {c.workerCount || 0} {c.workerCount === 1 ? 'Worker' : 'Workers'}
                      </span>
                    </div>
                  </div>

                  {/* Resource Gauges */}
                  <div className="p-3 rounded-xl bg-[#090E1A] border border-slate-800/80 mb-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                        <Cpu className="w-3.5 h-3.5 text-blue-400" />
                        <span>CPU</span>
                      </div>
                      <span className="text-xs font-bold text-white">{c.cpuUsage || 12}%</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                        <Activity className="w-3.5 h-3.5 text-purple-400" />
                        <span>RAM</span>
                      </div>
                      <span className="text-xs font-bold text-white">{c.memoryUsage || 35}%</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
                        <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                        <span>Disk</span>
                      </div>
                      <span className="text-xs font-bold text-white">{c.diskUsage || 22}%</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1E293B] flex-wrap">
                  <div className="flex items-center gap-2">
                    {!isActive ? (
                      <button
                        onClick={() => c._id && handleSelectController(c._id)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold border border-blue-500/30 transition flex items-center gap-1.5"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Select Controller</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    )}

                    <button
                      onClick={() => handleAddWorker(c)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Managed Worker</span>
                    </button>

                    <button
                      onClick={() => handleTestSSH(c)}
                      disabled={isTesting}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue-400' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test SSH'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSetupAnsible(c)}
                      title="Setup / Install Ansible"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                    >
                      <Terminal className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteController(c)}
                      title="Delete Controller"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
