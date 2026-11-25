'use client';

import React, { useState } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  Shield,
  Edit2,
  Trash2,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Check,
  Search,
} from 'lucide-react';

interface ServerManagementProps {
  servers: any[];
  onRefresh: () => void;
  onSelectForInstallation?: (server: any) => void;
}

export function ServerManagementTab({
  servers,
  onRefresh,
  onSelectForInstallation,
}: ServerManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; osInfo?: string; error?: string }>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State for Add / Edit Server
  const [editingServer, setEditingServer] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  const [formHost, setFormHost] = useState('');
  const [formPort, setFormPort] = useState(22);
  const [formUsername, setFormUsername] = useState('ubuntu');
  const [formAuthMethod, setFormAuthMethod] = useState<'privateKey' | 'password'>('privateKey');
  const [formAuthSecret, setFormAuthSecret] = useState('');
  const [formEnvironment, setFormEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [formCloudProvider, setFormCloudProvider] = useState<'aws' | 'azure' | 'gcp' | 'on-premise' | 'other'>('aws');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Test Connection in Add Modal
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; latencyMs?: number; osInfo?: string; error?: string } | null>(null);

  const resetForm = () => {
    setEditingServer(null);
    setFormName('');
    setFormHost('');
    setFormPort(22);
    setFormUsername('ubuntu');
    setFormAuthMethod('privateKey');
    setFormAuthSecret('');
    setFormEnvironment('production');
    setFormCloudProvider('aws');
    setFormError(null);
    setModalTestResult(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (server: any) => {
    setEditingServer(server);
    setFormName(server.name || '');
    setFormHost(server.publicIp || server.host || '');
    setFormPort(server.port || 22);
    setFormUsername(server.username || 'ubuntu');
    setFormAuthMethod(server.authMethod || 'privateKey');
    setFormAuthSecret(''); // Keep secret blank unless editing
    setFormEnvironment(server.environment || 'production');
    setFormCloudProvider(server.cloudProvider || 'aws');
    setFormError(null);
    setModalTestResult(null);
    setShowAddModal(true);
  };

  const handleTestConnection = async (serverId: string, hostVal?: string) => {
    setTestingServerId(serverId);
    try {
      const res = await fetch('/api/server-automation/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [serverId]: data,
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [serverId]: { success: false, error: err.message },
      }));
    } finally {
      setTestingServerId(null);
    }
  };

  const handleModalTestConnection = async () => {
    if (!formHost.trim()) {
      setFormError('Please enter a Host or IP address to test.');
      return;
    }
    setModalTesting(true);
    setModalTestResult(null);
    setFormError(null);

    try {
      const res = await fetch('/api/server-automation/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: editingServer ? editingServer._id : 'manual',
          overrideAuth: {
            host: formHost.trim(),
            port: formPort,
            username: formUsername.trim(),
            authMethod: formAuthMethod,
            authSecret: formAuthSecret.trim(),
          },
        }),
      });
      const data = await res.json();
      setModalTestResult(data);
    } catch (err: any) {
      setModalTestResult({ success: false, error: err.message });
    } finally {
      setModalTesting(false);
    }
  };

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formHost.trim()) {
      setFormError('Server name and Host IP are required.');
      return;
    }
    if (!editingServer && !formAuthSecret.trim()) {
      setFormError('Authentication secret (private key or password) is required for new servers.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload: any = {
        name: formName.trim(),
        host: formHost.trim(),
        publicIp: formHost.trim(),
        port: Number(formPort) || 22,
        username: formUsername.trim(),
        authMethod: formAuthMethod,
        environment: formEnvironment,
        cloudProvider: formCloudProvider,
      };

      if (formAuthSecret.trim()) {
        payload.authSecret = formAuthSecret.trim();
      }

      const url = editingServer ? `/api/servers/${editingServer._id}` : '/api/servers';
      const method = editingServer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save server');
      }

      setShowAddModal(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteServer = async (id: string) => {
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirmId(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Delete server error:', err);
    }
  };

  const filteredServers = servers.filter((s) => {
    const q = searchQuery.toLowerCase();
    const name = (s.name || '').toLowerCase();
    const host = (s.publicIp || s.host || '').toLowerCase();
    const os = (s.os?.name || '').toLowerCase();
    const provider = (s.cloudProvider || '').toLowerCase();
    return name.includes(q) || host.includes(q) || os.includes(q) || provider.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search servers by name, IP, OS, cloud..."
              className="w-full pl-9 pr-3 py-2 bg-[#111A2E] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
          <span className="text-xs text-slate-400 shrink-0 font-medium">
            {filteredServers.length} Server(s)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700/80 transition cursor-pointer"
            title="Refresh Server List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-cyan-600/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Linux Server</span>
          </button>
        </div>
      </div>

      {/* Servers Cards Grid */}
      {filteredServers.length === 0 ? (
        <div className="bg-[#0D1526]/80 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Server className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200">No Servers Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Add your remote Linux servers (Ubuntu, Debian, Amazon Linux, RHEL) with SSH credentials to automate software installation.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            + Add First Server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredServers.map((server) => {
            const hostIp = server.publicIp || server.host;
            const isOnline =
              (server.status || '').toLowerCase() === 'online' ||
              (server.status || '').toLowerCase() === 'running';
            const testResult = testResults[server._id];
            const isTesting = testingServerId === server._id;

            return (
              <div
                key={server._id}
                className="bg-[#0D1526]/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all space-y-4 flex flex-col justify-between"
              >
                {/* Header Row */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-xl bg-[#111A2E] border border-slate-700/80 shrink-0">
                        <Server className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate" title={server.name}>
                          {server.name}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400">{hostIp}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isOnline ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {server.status || 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Badges / Specs */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded-lg bg-[#111A2E] text-slate-300 border border-slate-800">
                      Port: {server.port || 22}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#111A2E] text-slate-300 border border-slate-800">
                      User: {server.username || 'ubuntu'}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase">
                      {server.cloudProvider || 'Linux'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg uppercase ${
                        server.environment === 'production'
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      }`}
                    >
                      {server.environment || 'prod'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate">
                    OS: {server.os?.name ? `${server.os.name} ${server.os.version || ''}` : 'Linux Remote Server'}
                  </p>
                </div>

                {/* Connection Test Output Box if tested */}
                {testResult && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-mono border ${
                      testResult.success
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {testResult.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="font-bold">
                        {testResult.success ? `Connected (${testResult.latencyMs}ms)` : 'Connection Failed'}
                      </span>
                    </div>
                    {testResult.osInfo && (
                      <div className="mt-1 text-[11px] opacity-80 truncate">OS: {testResult.osInfo}</div>
                    )}
                    {testResult.error && (
                      <div className="mt-1 text-[11px] opacity-80 break-words">{testResult.error}</div>
                    )}
                  </div>
                )}

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTestConnection(server._id, hostIp)}
                      disabled={isTesting}
                      className="px-2.5 py-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      title="Test real SSH connection and verify credentials"
                    >
                      <RefreshCw className={`w-3 h-3 text-cyan-400 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test SSH'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(server)}
                      className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
                      title="Edit Server Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {deleteConfirmId === server._id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteServer(server._id)}
                        className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer transition"
                      >
                        Confirm Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(server._id)}
                        className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                        title="Delete Server"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {onSelectForInstallation && (
                    <button
                      type="button"
                      onClick={() => onSelectForInstallation(server)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Install Software</span>
                      <span>&rarr;</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-cyan-500/30 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Server className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {editingServer ? 'Edit Linux Server' : 'Add New Remote Linux Server'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Credentials are encrypted at rest with AES-256-GCM.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveServer} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Server Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. AWS-Production-Node-01"
                    required
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Public IP / Hostname *</label>
                  <input
                    type="text"
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    placeholder="e.g. 54.210.12.34 or ec2.internal"
                    required
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">SSH Port</label>
                  <input
                    type="number"
                    value={formPort}
                    onChange={(e) => setFormPort(parseInt(e.target.value, 10) || 22)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">SSH Username</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="ubuntu, ec2-user, root"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Environment</label>
                  <select
                    value={formEnvironment}
                    onChange={(e: any) => setFormEnvironment(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Cloud Provider</label>
                <select
                  value={formCloudProvider}
                  onChange={(e: any) => setFormCloudProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="aws">Amazon Web Services (AWS EC2)</option>
                  <option value="azure">Microsoft Azure (Virtual Machine)</option>
                  <option value="gcp">Google Cloud Platform (GCE)</option>
                  <option value="on-premise">On-Premise / Bare Metal</option>
                  <option value="other">Other Linux Host</option>
                </select>
              </div>

              {/* Auth Method Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-300">Authentication Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormAuthMethod('privateKey')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formAuthMethod === 'privateKey'
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                        : 'bg-[#111A2E] border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>SSH Private Key (.pem / .ppk)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormAuthMethod('password')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formAuthMethod === 'password'
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                        : 'bg-[#111A2E] border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Password Auth</span>
                  </button>
                </div>
              </div>

              {/* Secret Input (Private Key or Password) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  {formAuthMethod === 'privateKey'
                    ? 'Paste OpenSSH Private Key (.pem) or PuTTY Key (.ppk)'
                    : 'SSH Password'}
                  {editingServer && (
                    <span className="text-[11px] text-slate-400 font-normal ml-2">
                      (Leave blank to keep existing encrypted secret)
                    </span>
                  )}
                </label>

                {formAuthMethod === 'privateKey' ? (
                  <textarea
                    rows={6}
                    value={formAuthSecret}
                    onChange={(e) => setFormAuthSecret(e.target.value)}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----&#10;or PuTTY-User-Key-File-2..."
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                ) : (
                  <input
                    type="password"
                    value={formAuthSecret}
                    onChange={(e) => setFormAuthSecret(e.target.value)}
                    placeholder="Enter SSH password..."
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                )}
              </div>

              {/* Modal Test Result Box */}
              {modalTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono border ${
                    modalTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {modalTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-bold">
                      {modalTestResult.success
                        ? `SSH Connection Succeeded in ${modalTestResult.latencyMs}ms!`
                        : 'SSH Connection Failed'}
                    </span>
                  </div>
                  {modalTestResult.osInfo && (
                    <div className="mt-1">OS: {modalTestResult.osInfo}</div>
                  )}
                  {modalTestResult.error && (
                    <div className="mt-1 break-words">{modalTestResult.error}</div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleModalTestConnection}
                  disabled={modalTesting || !formHost}
                  className="px-3.5 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${modalTesting ? 'animate-spin' : ''}`} />
                  <span>{modalTesting ? 'Testing SSH...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-cyan-600/30 disabled:opacity-50"
                  >
                    {formSubmitting ? 'Saving...' : editingServer ? 'Update Server' : 'Add Server'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
