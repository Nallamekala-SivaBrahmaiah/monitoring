'use client';

import React, { useState, useRef } from 'react';
import {
  Rocket,
  UploadCloud,
  FileCode,
  Server,
  Layers,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Folder,
  Terminal,
  Cpu,
  RefreshCw,
  ArrowRight,
  Shield,
  Zap,
  GitBranch,
  RotateCcw,
  Trash2,
  Search,
  ExternalLink,
  Eye,
  Loader2,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';
import { INginxDeploymentData } from '@/models/NginxDeployment';

interface NginxDeployTabProps {
  servers: INginxServerData[];
  activeServer: INginxServerData | null;
  onSelectServer: (server: INginxServerData) => void;
  onDeploymentSuccess: () => void;
  deployments?: INginxDeploymentData[];
  onRefreshDeployments?: () => void;
  onRollback?: (deployment: INginxDeploymentData) => void;
  onClearLogs?: () => void;
  onDeleteRecord?: (id: string) => void;
  isRollingBack?: boolean;
  prefillDir?: string;
  prefillName?: string;
}

export function NginxDeployTab({
  servers,
  activeServer,
  onSelectServer,
  onDeploymentSuccess,
  deployments = [],
  onRefreshDeployments,
  onRollback,
  onClearLogs,
  onDeleteRecord,
  isRollingBack,
  prefillDir,
  prefillName,
}: NginxDeployTabProps) {
  // Deployment mode: 'local' (ZIP upload) or 'git' (GitHub repo)
  const [deploySource, setDeploySource] = useState<'local' | 'git'>('local');

  // Local build file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Git repo fields
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [installCommand, setInstallCommand] = useState('npm install');
  const [buildCommand, setBuildCommand] = useState('npm run build');

  // Common application configuration
  const [appName, setAppName] = useState(prefillName || 'my-app');
  const [appType, setAppType] = useState<'vite' | 'react' | 'nextjs' | 'nextjs-standalone' | 'nodejs' | 'express' | 'custom'>('vite');
  const [deploymentMode, setDeploymentMode] = useState<'static' | 'pm2-node' | 'pm2-next' | 'pm2-standalone' | 'custom'>('static');
  const [deployDir, setDeployDir] = useState(prefillDir || '/var/www/my-app');
  const [appPort, setAppPort] = useState('3000');
  const [domain, setDomain] = useState('');
  const [pm2Name, setPm2Name] = useState(prefillName || 'my-app');
  const [startCommand, setStartCommand] = useState('node server.js');
  const [envVars, setEnvVars] = useState('');

  // Deployment execution state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);

  // History filtering & logs viewer
  const [searchHistory, setSearchHistory] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLogsModal, setSelectedLogsModal] = useState<INginxDeploymentData | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Guess app name from zip file name
      const guessedName = file.name.replace(/\.zip$/i, '').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      if (appName === 'my-app') {
        setAppName(guessedName);
        setPm2Name(guessedName);
        setDeployDir(`/var/www/${guessedName}`);
      }

      // Guess type
      if (file.name.toLowerCase().includes('standalone')) {
        setAppType('nextjs-standalone');
        setDeploymentMode('pm2-standalone');
        setStartCommand('node server.js');
      } else if (file.name.toLowerCase().includes('next')) {
        setAppType('nextjs');
        setDeploymentMode('pm2-next');
        setStartCommand('npm start');
      } else if (file.name.toLowerCase().includes('dist') || file.name.toLowerCase().includes('vite')) {
        setAppType('vite');
        setDeploymentMode('static');
      }
    }
  };

  const handleAppTypeChange = (type: any) => {
    setAppType(type);
    if (type === 'vite' || type === 'react') {
      setDeploymentMode('static');
    } else if (type === 'nextjs-standalone') {
      setDeploymentMode('pm2-standalone');
      setStartCommand('node server.js');
    } else if (type === 'nextjs') {
      setDeploymentMode('pm2-next');
      setStartCommand('npm start');
    } else {
      setDeploymentMode('pm2-node');
      setStartCommand('node index.js');
    }
  };

  const handleStartDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServer) {
      alert('Please select a target server.');
      return;
    }

    if (deploySource === 'local' && !selectedFile) {
      alert('Please select your build ZIP archive.');
      return;
    }

    if (deploySource === 'git' && !gitRepoUrl.trim()) {
      alert('Please enter a GitHub repository URL (e.g. https://github.com/user/repo.git).');
      return;
    }

    setIsDeploying(true);
    setDeployStatus('running');

    if (deploySource === 'local') {
      setDeployLogs([
        `[Local Manager] Packaging build "${selectedFile!.name}" (${(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB)...`,
        `[Local Manager] Target Cloud Server: ${activeServer.name} (${activeServer.host})`,
        `[Local Manager] Deployment Directory: ${deployDir}`,
        `[Local Manager] Mode: ${deploymentMode.toUpperCase()}`,
        `[Local Manager] Uploading archive to server via secure SFTP...`,
      ]);
    } else {
      setDeployLogs([
        `[Git Manager] Initializing GitHub deployment for "${appName}"...`,
        `[Git Manager] Repository: ${gitRepoUrl} (Branch: ${gitBranch})`,
        `[Git Manager] Target Server: ${activeServer.name} (${activeServer.host})`,
        `[Git Manager] Deployment Directory: ${deployDir}`,
        `[Git Manager] Mode: ${deploymentMode.toUpperCase()}`,
        `[Git Manager] Connecting via SSH to clone repository...`,
      ]);
    }

    const formData = new FormData();
    formData.append('deploySource', deploySource);
    formData.append('serverId', activeServer._id || '');
    formData.append('appName', appName);
    formData.append('appType', appType);
    formData.append('deploymentMode', deploymentMode);
    formData.append('deployDir', deployDir);
    formData.append('appPort', appPort);
    formData.append('domain', domain);
    formData.append('pm2ProcessName', pm2Name);
    formData.append('startCommand', startCommand);
    formData.append('envVars', envVars);

    if (deploySource === 'local' && selectedFile) {
      formData.append('file', selectedFile);
    } else if (deploySource === 'git') {
      formData.append('gitRepoUrl', gitRepoUrl);
      formData.append('gitBranch', gitBranch);
      formData.append('installCommand', installCommand);
      formData.append('buildCommand', buildCommand);
    }

    try {
      const res = await fetch('/api/nginx/deploy', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Deployment failed.');
      }

      const depId = data.deploymentId;
      setActiveDeploymentId(depId);
      setDeployLogs((prev) => [
        ...prev,
        `[Deployment Engine] Job ID: ${depId}`,
        `[Deployment Engine] Deployment initiated. Monitoring remote execution...`,
      ]);

      // Poll deployment logs for completion
      const pollTimer = setInterval(async () => {
        try {
          const checkRes = await fetch(`/api/nginx/deployments?limit=5`);
          const checkData = await checkRes.json();
          if (checkData.deployments) {
            const current = checkData.deployments.find((d: any) => d.deploymentId === depId);
            if (current) {
              if (current.logs) {
                setDeployLogs(current.logs.split('\n').filter(Boolean));
              }

              if (current.status === 'SUCCESS') {
                clearInterval(pollTimer);
                setIsDeploying(false);
                setDeployStatus('success');
                onDeploymentSuccess();
                if (onRefreshDeployments) onRefreshDeployments();
              } else if (current.status === 'FAILED') {
                clearInterval(pollTimer);
                setIsDeploying(false);
                setDeployStatus('failed');
                if (onRefreshDeployments) onRefreshDeployments();
              }
            }
          }
        } catch {}
      }, 3000);
    } catch (err: any) {
      setIsDeploying(false);
      setDeployStatus('failed');
      setDeployLogs((prev) => [...prev, `[ERROR] ${err.message}`]);
    }
  };

  const filteredDeployments = deployments.filter((d) => {
    const matchesSearch =
      d.deploymentId.toLowerCase().includes(searchHistory.toLowerCase()) ||
      d.appName.toLowerCase().includes(searchHistory.toLowerCase()) ||
      d.serverName.toLowerCase().includes(searchHistory.toLowerCase());

    const matchesStatus = statusFilter === 'all' || d.status === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Workflow Banner */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
          Zero-Downtime Application Deployment Workflow
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          {[
            { step: '1', title: 'Source Code', desc: 'Local ZIP or GitHub' },
            { step: '2', title: 'Target Server', desc: 'AWS EC2 or Azure' },
            { step: '3', title: 'SSH Transfer', desc: 'SFTP / Git Clone' },
            { step: '4', title: 'Install & Build', desc: 'npm install & build' },
            { step: '5', title: 'Backup Release', desc: 'Atomic rollback copy' },
            { step: '6', title: 'PM2 & Nginx', desc: 'Cluster & reverse proxy' },
            { step: '7', title: 'Live Verification', desc: 'Zero downtime' },
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-[#0B1120] border border-slate-800">
              <span className="w-5 h-5 mx-auto rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center mb-1">
                {item.step}
              </span>
              <span className="font-bold text-white text-xs block truncate">{item.title}</span>
              <span className="text-[10px] text-slate-500 block truncate">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Deployment Form & Execution Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Configuration */}
        <form onSubmit={handleStartDeploy} className="lg:col-span-7 space-y-4">
          {/* Source Selector Tab */}
          <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">1. Select Deployment Source</h4>
              <div className="flex items-center gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setDeploySource('local')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                    deploySource === 'local'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Local Build (ZIP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeploySource('git')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                    deploySource === 'git'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </button>
              </div>
            </div>

            {/* Local Build Dropzone */}
            {deploySource === 'local' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition bg-[#0B1120]/60 hover:bg-[#0B1120] group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition">
                  <UploadCloud className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <span className="font-bold text-white text-sm block">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-emerald-400 font-mono">
                      Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for deployment
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-300 text-xs block">
                      Click to browse or drop your build package (.zip)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Supports Next.js standalone, Vite dist, React build, Node.js or Express.js archives
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* GitHub Repository Form */}
            {deploySource === 'git' && (
              <div className="space-y-3 p-4 rounded-xl bg-[#0B1120] border border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    GitHub Repository URL *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://github.com/organization/repository.git"
                    value={gitRepoUrl}
                    onChange={(e) => {
                      setGitRepoUrl(e.target.value);
                      if (appName === 'my-app' && e.target.value) {
                        const parts = e.target.value.split('/');
                        const last = parts[parts.length - 1].replace(/\.git$/i, '').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
                        if (last) {
                          setAppName(last);
                          setPm2Name(last);
                          setDeployDir(`/var/www/${last}`);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Branch
                    </label>
                    <input
                      type="text"
                      placeholder="main"
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Install Command
                    </label>
                    <input
                      type="text"
                      placeholder="npm install"
                      value={installCommand}
                      onChange={(e) => setInstallCommand(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Build Command
                    </label>
                    <input
                      type="text"
                      placeholder="npm run build"
                      value={buildCommand}
                      onChange={(e) => setBuildCommand(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 transition font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Application Details */}
          <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
            <h4 className="text-sm font-bold text-white">2. Application & Runtime Configuration</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Target Server
                </label>
                <select
                  value={activeServer?._id || ''}
                  onChange={(e) => {
                    const found = servers.find((s) => s._id === e.target.value);
                    if (found) onSelectServer(found);
                  }}
                  className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                >
                  {servers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.host})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => {
                    setAppName(e.target.value);
                    setPm2Name(e.target.value);
                    setDeployDir(`/var/www/${e.target.value}`);
                  }}
                  className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Framework / App Type
                </label>
                <select
                  value={appType}
                  onChange={(e) => handleAppTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="vite">Vite.js / React (Static SPA)</option>
                  <option value="nextjs-standalone">Next.js (Standalone Server)</option>
                  <option value="nextjs">Next.js (SSR / npm start)</option>
                  <option value="nodejs">Node.js / Express.js</option>
                  <option value="custom">Custom Node Application</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Deployment Directory
                </label>
                <input
                  type="text"
                  required
                  value={deployDir}
                  onChange={(e) => setDeployDir(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  App Port
                </label>
                <input
                  type="number"
                  value={appPort}
                  onChange={(e) => setAppPort(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Domain (Nginx Reverse Proxy)
                </label>
                <input
                  type="text"
                  placeholder="app.example.com (optional)"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Environment Variables (KEY=VALUE per line)
              </label>
              <textarea
                rows={3}
                placeholder="NODE_ENV=production&#10;PORT=3000&#10;DATABASE_URL=..."
                value={envVars}
                onChange={(e) => setEnvVars(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setGitRepoUrl('');
                  setAppName('my-app');
                  setDeployDir('/var/www/my-app');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={isDeploying || !activeServer}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isDeploying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deploying Release...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Deploy Application</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Real-Time Execution Console */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Execution Logs
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                {deployStatus === 'running' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    DEPLOYING
                  </span>
                )}
                {deployStatus === 'success' && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    SUCCESS
                  </span>
                )}
                {deployStatus === 'failed' && (
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    FAILED
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 bg-[#070B14] border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto mt-3 select-text space-y-1">
              {deployLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6 space-y-2">
                  <Terminal className="w-8 h-8 opacity-40 text-slate-400" />
                  <p className="text-xs">No active deployment.</p>
                  <p className="text-[11px] text-slate-600 max-w-xs">
                    Configure your application above and click &quot;Deploy Application&quot; to watch real-time server output.
                  </p>
                </div>
              ) : (
                deployLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`text-[11px] ${
                      log.includes('[ERROR]') || log.includes('FAILED')
                        ? 'text-rose-400'
                        : log.includes('SUCCESS') || log.includes('completed')
                        ? 'text-emerald-400 font-bold'
                        : log.includes('STEP:')
                        ? 'text-cyan-300 font-semibold'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Deployment History & Rollbacks */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Recent Deployments & One-Click Rollback</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Past deployment releases and automated backup restore points
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search releases..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0F172A] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {onRefreshDeployments && (
              <button
                onClick={onRefreshDeployments}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            )}

            {onClearLogs && (
              <button
                onClick={() => setConfirmClearOpen(true)}
                disabled={deployments.length === 0}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clean Logs</span>
              </button>
            )}
          </div>
        </div>

        {/* Deployments Table */}
        <div className="border border-[#1E293B] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0D1527] text-slate-400 border-b border-[#1E293B] text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Release ID</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Server</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60 font-sans">
                {filteredDeployments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No past deployment records found for this server.
                    </td>
                  </tr>
                ) : (
                  filteredDeployments.map((dep, idx) => (
                    <tr key={idx} className="hover:bg-[#142038]/60 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {dep.deploymentId}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-200 block">{dep.appName}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          {dep.appType} &bull; {dep.deploymentMode}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-300 text-xs truncate max-w-[180px] block">
                          {dep.archiveName || 'Local Archive'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-300 block">{dep.serverName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{dep.serverHost}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {dep.durationSeconds ? `${dep.durationSeconds}s` : '-'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            dep.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : dep.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : dep.status === 'ROLLED_BACK'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(dep.startTime).toLocaleTimeString()} &bull;{' '}
                        {new Date(dep.startTime).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onRollback && dep.rollbackAvailable && dep.status === 'SUCCESS' && (
                            <button
                              onClick={() => onRollback(dep)}
                              disabled={isRollingBack}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 transition disabled:opacity-50"
                              title="Rollback to this release backup"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Rollback</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedLogsModal(dep)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition"
                            title="Inspect logs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Logs</span>
                          </button>

                          {onDeleteRecord && (
                            <button
                              onClick={() => onDeleteRecord(dep.deploymentId)}
                              className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                              title="Delete deployment record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Logs Modal */}
      {selectedLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111A2E] border border-slate-700 rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base">
                  Deployment Logs &mdash; {selectedLogsModal.deploymentId}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  App: {selectedLogsModal.appName} &bull; Target: {selectedLogsModal.serverName} ({selectedLogsModal.serverHost})
                </p>
              </div>
              <button
                onClick={() => setSelectedLogsModal(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="bg-[#070B14] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed max-h-[460px] overflow-y-auto whitespace-pre-wrap select-text">
              {selectedLogsModal.logs || 'No log output recorded for this deployment.'}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedLogsModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Logs Confirm Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111A2E] border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Clear All Deployment Logs?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will purge deployment history records. Deployed applications on servers will not be affected.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmClearOpen(false);
                  if (onClearLogs) onClearLogs();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
