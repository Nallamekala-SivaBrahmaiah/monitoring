'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Check,
  Search,
  RotateCw,
  Play,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Code2,
  Package,
  Boxes,
  FileCode,
  Terminal,
  Undo2,
} from 'lucide-react';
import {
  TOOL_CATALOG,
  TOOL_CATEGORIES,
  ToolCategory,
  ToolDefinition,
} from '@/lib/automation/toolCatalog';

interface SoftwareInstallationTabProps {
  servers: any[];
  selectedServerId: string;
  onSelectServerId: (id: string) => void;
  onStartInstallation: (params: {
    serverId: string;
    selectedTools: { toolId: string; version?: string }[];
    stopOnError: boolean;
  }) => void;
  isInstalling?: boolean;
}

export function SoftwareInstallationTab({
  servers,
  selectedServerId,
  onSelectServerId,
  onStartInstallation,
  isInstalling = false,
}: SoftwareInstallationTabProps) {
  // Tools catalog state (built-in + custom MongoDB packages)
  const [toolsList, setToolsList] = useState<ToolDefinition[]>(TOOL_CATALOG);
  const [loadingTools, setLoadingTools] = useState(false);

  // Selected tools map: { [toolId]: { selected: boolean, version: string } }
  const [selectedToolsMap, setSelectedToolsMap] = useState<
    Record<string, { selected: boolean; version: string }>
  >(() => {
    const initial: Record<string, { selected: boolean; version: string }> = {};
    for (const tool of TOOL_CATALOG) {
      initial[tool.id] = {
        selected: false,
        version: tool.defaultVersion || '',
      };
    }
    return initial;
  });

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [stopOnError, setStopOnError] = useState(false);

  // Server SSH Quick Test state
  const [testingServer, setTestingServer] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    osInfo?: string;
    error?: string;
  } | null>(null);

  // Custom Package Create / Edit Modal State
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolDefinition | null>(null);
  const [deletingTool, setDeletingTool] = useState<ToolDefinition | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [packageFormError, setPackageFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Package Form Fields
  const [pkgName, setPkgName] = useState('');
  const [pkgId, setPkgId] = useState('');
  const [pkgCategory, setPkgCategory] = useState<ToolCategory>('devops');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgBadge, setPkgBadge] = useState('Custom');
  const [pkgDefaultVersion, setPkgDefaultVersion] = useState('latest');
  const [pkgSupportedVersions, setPkgSupportedVersions] = useState('latest');
  const [pkgPort, setPkgPort] = useState('');
  const [pkgDependencies, setPkgDependencies] = useState('');
  const [pkgVerification, setPkgVerification] = useState('');
  const [pkgInstallScript, setPkgInstallScript] = useState('');

  // Fetch all packages (merging built-in + MongoDB custom packages)
  const fetchPackages = async () => {
    setLoadingTools(true);
    try {
      const res = await fetch('/api/server-automation/packages');
      if (res.ok) {
        const data = await res.json();
        if (data.tools && Array.isArray(data.tools)) {
          setToolsList(data.tools);
          // Sync selection map for any newly added custom tools
          setSelectedToolsMap((prev) => {
            const updated = { ...prev };
            for (const t of data.tools) {
              if (!updated[t.id]) {
                updated[t.id] = {
                  selected: false,
                  version: t.defaultVersion || '',
                };
              }
            }
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const selectedServer = servers.find((s) => s._id === selectedServerId) || servers[0];

  const handleTestSelectedServer = async () => {
    if (!selectedServer) return;
    setTestingServer(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/server-automation/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: selectedServer._id }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingServer(false);
    }
  };

  const toggleTool = (toolId: string) => {
    setSelectedToolsMap((prev) => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        selected: !prev[toolId]?.selected,
      },
    }));
  };

  const setToolVersion = (toolId: string, version: string) => {
    setSelectedToolsMap((prev) => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        selected: true, // auto-select if version is changed
        version,
      },
    }));
  };

  const selectAll = () => {
    setSelectedToolsMap((prev) => {
      const updated = { ...prev };
      for (const t of toolsList) {
        updated[t.id] = {
          ...updated[t.id],
          selected: true,
        };
      }
      return updated;
    });
  };

  const clearSelection = () => {
    setSelectedToolsMap((prev) => {
      const updated = { ...prev };
      for (const t of toolsList) {
        updated[t.id] = {
          ...updated[t.id],
          selected: false,
        };
      }
      return updated;
    });
  };

  const selectedToolEntries = Object.entries(selectedToolsMap)
    .filter(([_, val]) => val.selected)
    .map(([toolId, val]) => {
      const def = toolsList.find((t) => t.id === toolId);
      return {
        toolId,
        def,
        version: val.version,
      };
    })
    .filter((entry) => Boolean(entry.def));

  const selectedCount = selectedToolEntries.length;

  const handleConfirmAndRun = () => {
    setShowConfirmModal(false);
    if (!selectedServer) return;

    onStartInstallation({
      serverId: selectedServer._id,
      selectedTools: selectedToolEntries.map((e) => ({
        toolId: e.toolId,
        version: e.version,
      })),
      stopOnError,
    });
  };

  // Filter tools
  const filteredTools = toolsList.filter((tool) => {
    const matchesCat = activeCategoryFilter === 'all' || tool.category === activeCategoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.id.toLowerCase().includes(q) ||
      (tool.supportedVersions || []).some((v) => v.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  // Package Templates
  const applyTemplate = (type: 'apt' | 'docker' | 'binary' | 'source') => {
    const cleanId = pkgId || (pkgName ? pkgName.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'package');
    const nameStr = pkgName || 'Package';
    const portStr = pkgPort || '8080';

    if (type === 'apt') {
      setPkgInstallScript(`log_step "Installing ${nameStr}"
if command -v ${cleanId} &>/dev/null; then
  log_success "${nameStr} is already installed."
  return 0
fi

pkg_update
if [[ "$IS_DEBIAN" == "true" ]]; then
  sudo apt-get install -y ${cleanId}
elif [[ "$IS_RHEL" == "true" ]]; then
  sudo dnf install -y ${cleanId} || sudo yum install -y ${cleanId}
fi

log_success "${nameStr} installed successfully."`);
    } else if (type === 'docker') {
      setPkgInstallScript(`log_step "Deploying ${nameStr} Container via Docker"
if ! command -v docker &>/dev/null; then
  log_step "Docker runtime required - provisioning Docker engine..."
  install_docker
fi

if sudo docker ps --format '{{.Names}}' | grep -q "^${cleanId}$"; then
  log_success "${nameStr} container is already running."
  return 0
fi

sudo docker run -d \\
  --name ${cleanId} \\
  --restart unless-stopped \\
  -p ${portStr}:${portStr} \\
  ${cleanId}:latest

log_success "${nameStr} container started on port ${portStr}."`);
    } else if (type === 'binary') {
      setPkgInstallScript(`log_step "Installing ${nameStr} from Official Release Binary"
local target_ver="\${1:-latest}"

if command -v ${cleanId} &>/dev/null; then
  log_success "${nameStr} is already installed."
  return 0
fi

pkg_install curl tar
TMP_DIR=$(mktemp -d)
log_step "Downloading ${nameStr} release..."
# curl -fsSL "https://github.com/org/repo/releases/download/v\${target_ver}/${cleanId}-linux-amd64.tar.gz" -o "$TMP_DIR/pkg.tar.gz"
# tar -xzf "$TMP_DIR/pkg.tar.gz" -C "$TMP_DIR"
# sudo mv "$TMP_DIR/${cleanId}" /usr/local/bin/${cleanId}
# sudo chmod +x /usr/local/bin/${cleanId}
rm -rf "$TMP_DIR"

log_success "${nameStr} binary installed in /usr/local/bin/${cleanId}."`);
    } else if (type === 'source') {
      setPkgInstallScript(`log_step "Compiling ${nameStr} from Source"
pkg_install git gcc make

SRC_DIR="/opt/${cleanId}"
if [ ! -d "$SRC_DIR" ]; then
  sudo git clone https://github.com/example/${cleanId}.git "$SRC_DIR"
fi

cd "$SRC_DIR"
# sudo make && sudo make install
log_success "${nameStr} compiled and installed from source."`);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingTool(null);
    setPackageFormError(null);
    setPkgName('');
    setPkgId('');
    setPkgCategory('devops');
    setPkgDescription('');
    setPkgBadge('Custom');
    setPkgDefaultVersion('latest');
    setPkgSupportedVersions('latest');
    setPkgPort('');
    setPkgDependencies('');
    setPkgVerification('');
    setPkgInstallScript(`log_step "Installing Custom Package"
local target_ver="\${1:-latest}"

# Check idempotency
if command -v custom-tool &>/dev/null; then
  log_success "Custom tool is already installed."
  return 0
fi

pkg_update
if [[ "$IS_DEBIAN" == "true" ]]; then
  sudo apt-get install -y custom-tool
elif [[ "$IS_RHEL" == "true" ]]; then
  sudo dnf install -y custom-tool || sudo yum install -y custom-tool
fi

log_success "Custom package installation complete."`);
    setShowPackageModal(true);
  };

  // Open Edit Modal (Supports BOTH built-in tools like Java/Python/Node/PHP AND custom packages)
  const handleOpenEditModal = async (tool: ToolDefinition) => {
    setEditingTool(tool);
    setPackageFormError(null);
    setPkgName(tool.name);
    setPkgId(tool.id);
    setPkgCategory(tool.category);
    setPkgDescription(tool.description || '');
    setPkgBadge(tool.badge || '');
    setPkgDefaultVersion(tool.defaultVersion || 'latest');
    setPkgSupportedVersions((tool.supportedVersions || [tool.defaultVersion || 'latest']).join(', '));
    setPkgPort(tool.port ? String(tool.port) : '');
    setPkgDependencies((tool.dependencies || []).join(', '));
    setPkgVerification(tool.verificationCommand || '');

    // If tool already has installScript, use it; otherwise fetch from packages endpoint
    if (tool.installScript) {
      setPkgInstallScript(tool.installScript);
    } else {
      try {
        const res = await fetch(`/api/server-automation/packages/${tool.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.package?.installScript) {
            setPkgInstallScript(data.package.installScript);
          } else {
            setPkgInstallScript(`log_step "Installing ${tool.name}"\npkg_update\nlog_success "${tool.name} installation finished."`);
          }
        }
      } catch {
        setPkgInstallScript(`log_step "Installing ${tool.name}"\npkg_update\nlog_success "${tool.name} installation finished."`);
      }
    }

    setShowPackageModal(true);
  };

  // Reset a modified built-in tool back to factory default
  const handleResetBuiltIn = async (tool: ToolDefinition) => {
    if (!confirm(`Revert "${tool.name}" back to original factory default installation script?`)) return;
    try {
      const res = await fetch(`/api/server-automation/packages/${tool.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessToast(`Reverted "${tool.name}" to factory default settings.`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchPackages();
      }
    } catch (err: any) {
      alert(`Failed to reset: ${err.message}`);
    }
  };

  // Save Package (Create or Edit)
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setPackageFormError(null);

    if (!pkgName.trim()) {
      setPackageFormError('Package name is required.');
      return;
    }
    if (!pkgInstallScript.trim()) {
      setPackageFormError('Installation bash script is required.');
      return;
    }

    setSavingPackage(true);
    try {
      const versionsArr = pkgSupportedVersions
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      const depsArr = pkgDependencies
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const payload = {
        name: pkgName.trim(),
        packageId: pkgId.trim() || undefined,
        category: pkgCategory,
        description: pkgDescription.trim(),
        badge: pkgBadge.trim() || undefined,
        defaultVersion: pkgDefaultVersion.trim() || 'latest',
        supportedVersions: versionsArr.length > 0 ? versionsArr : ['latest'],
        port: pkgPort ? Number(pkgPort) : undefined,
        dependencies: depsArr,
        verificationCommand: pkgVerification.trim(),
        installScript: pkgInstallScript.trim(),
      };

      let res: Response;
      if (editingTool) {
        const targetId = editingTool._id || editingTool.id;
        res = await fetch(`/api/server-automation/packages/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/server-automation/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save package');
      }

      setShowPackageModal(false);
      setSuccessToast(
        editingTool
          ? `Package "${pkgName}" updated successfully!`
          : `Custom package "${pkgName}" created and added to catalog!`
      );
      setTimeout(() => setSuccessToast(null), 4000);

      // Reload package list from backend
      await fetchPackages();

      // If created new package, auto-select it
      if (!editingTool && data.package?.packageId) {
        setSelectedToolsMap((prev) => ({
          ...prev,
          [data.package.packageId]: {
            selected: true,
            version: data.package.defaultVersion || 'latest',
          },
        }));
      }
    } catch (err: any) {
      setPackageFormError(err.message || 'Error saving package');
    } finally {
      setSavingPackage(false);
    }
  };

  // Delete Custom Package
  const handleDeletePackageConfirm = async () => {
    if (!deletingTool) return;
    const targetId = deletingTool._id || deletingTool.id;

    try {
      const res = await fetch(`/api/server-automation/packages/${targetId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete package');
      }

      // Deselect and refresh
      setSelectedToolsMap((prev) => {
        const copy = { ...prev };
        delete copy[deletingTool.id];
        return copy;
      });

      setSuccessToast(`Package "${deletingTool.name}" removed from catalog.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setDeletingTool(null);
      await fetchPackages();
    } catch (err: any) {
      alert(`Error deleting package: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. Server Selection Bar */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              Target Remote Server Node
            </span>
            <p className="text-xs text-slate-300">
              Select the remote Linux server where the chosen software packages will be installed.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Server Dropdown */}
            <div className="relative min-w-[280px]">
              <select
                value={selectedServer?._id || ''}
                onChange={(e) => onSelectServerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111A2E] border border-slate-700 hover:border-cyan-500 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-cyan-400 transition cursor-pointer"
              >
                {servers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.publicIp || s.host}) • {s.environment || 'prod'} • [{s.status || 'Offline'}]
                  </option>
                ))}
              </select>
            </div>

            {/* Test SSH Button */}
            <button
              type="button"
              onClick={handleTestSelectedServer}
              disabled={testingServer || !selectedServer}
              className="px-4 py-2.5 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${testingServer ? 'animate-spin' : ''}`} />
              <span>{testingServer ? 'Testing SSH...' : 'Test SSH Connection'}</span>
            </button>
          </div>
        </div>

        {/* Selected Server Details Strip */}
        {selectedServer && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400">Host IP:</span>
              <span className="font-mono text-white font-bold bg-[#111A2E] px-2 py-0.5 rounded border border-slate-800">
                {selectedServer.publicIp || selectedServer.host}
              </span>

              <span className="text-slate-400 ml-2">OS:</span>
              <span className="text-cyan-300 font-semibold">
                {selectedServer.os?.name ? `${selectedServer.os.name} ${selectedServer.os.version || ''}` : 'Linux Remote Host'}
              </span>

              <span className="text-slate-400 ml-2">User:</span>
              <span className="font-mono text-slate-300">{selectedServer.username || 'ubuntu'}</span>

              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedServer.environment === 'production'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {selectedServer.environment || 'production'}
              </span>
            </div>

            {/* Test connection result pill */}
            {testResult && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono border ${
                  testResult.success
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {testResult.success
                    ? `Verified (${testResult.latencyMs}ms)`
                    : testResult.error || 'Connection Failed'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Controls & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search software (Docker, Java, Git, Nginx, Redis, MySQL...)"
            className="w-full pl-9 pr-3 py-2 bg-[#111A2E] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-mono font-bold mr-1">
            Selected: <span className="text-cyan-400">{selectedCount}</span> / {toolsList.length}
          </span>

          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-1.5 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-slate-700/80 text-xs font-semibold transition cursor-pointer"
          >
            Select All
          </button>

          <button
            type="button"
            onClick={clearSelection}
            disabled={selectedCount === 0}
            className="px-3 py-1.5 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-400 hover:text-rose-300 border border-slate-700/80 text-xs font-semibold transition cursor-pointer disabled:opacity-40"
          >
            Clear Selection
          </button>

          {/* Create & Add Package Button */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-600/25"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Custom Package</span>
          </button>

          <button
            type="button"
            disabled={selectedCount === 0 || isInstalling}
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/25 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Install Selected Tools ({selectedCount})</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
            activeCategoryFilter === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-[#0D1526] text-slate-400 hover:text-white border-slate-800'
          }`}
        >
          All Software ({toolsList.length})
        </button>

        {TOOL_CATEGORIES.map((cat) => {
          const catCount = toolsList.filter((t) => t.category === cat.id).length;
          const isCurrent = activeCategoryFilter === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                isCurrent
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-[#0D1526] text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              {cat.title} ({catCount})
            </button>
          );
        })}
      </div>

      {/* 3. Categorized Software Cards Grid */}
      <div className="space-y-6">
        {TOOL_CATEGORIES.map((cat) => {
          const categoryTools = filteredTools.filter((t) => t.category === cat.id);
          if (categoryTools.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-3">
              {/* Category Sub-Header */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">{cat.title}</h3>
                  <span className="text-[11px] text-slate-400">({cat.description})</span>
                </div>
                <span className="text-[11px] font-mono text-cyan-400">
                  {categoryTools.filter((t) => selectedToolsMap[t.id]?.selected).length} / {categoryTools.length} selected
                </span>
              </div>

              {/* Tools Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {categoryTools.map((tool) => {
                  const state = selectedToolsMap[tool.id] || { selected: false, version: '' };
                  const isSelected = state.selected;
                  const isCustom = Boolean(tool.isCustom);
                  const isCustomized = Boolean(tool.isCustomized);

                  return (
                    <div
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={`relative rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#101F3B] to-[#0A162B] border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                          : isCustom
                          ? 'bg-[#10132B]/90 hover:bg-[#15193B] border-purple-500/30 hover:border-purple-400/50'
                          : isCustomized
                          ? 'bg-[#0E172E]/90 hover:bg-[#131F3D] border-amber-500/30 hover:border-amber-400/50'
                          : 'bg-[#0D1526]/90 hover:bg-[#111A2E] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Checkbox & Name Row */}
                      <div className="flex items-start gap-3">
                        {/* Custom Animated Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isSelected
                              ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
                              : 'border-slate-700 bg-[#111A2E]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Title & Badges */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-bold text-sm leading-tight transition-colors ${
                                isSelected ? 'text-white' : 'text-slate-200'
                              }`}
                            >
                              {tool.name}
                            </span>

                            {isCustom ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40 font-mono">
                                {tool.badge || 'Custom'}
                              </span>
                            ) : isCustomized ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                {tool.badge ? `${tool.badge} • Edited` : 'Customized'}
                              </span>
                            ) : (
                              tool.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                                  {tool.badge}
                                </span>
                              )
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-2">
                            {tool.description}
                          </p>
                        </div>

                        {/* Action buttons: Edit option is available on ALL cards */}
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(tool)}
                            title={`Edit ${tool.name} installation commands & options`}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111A2E] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-400/50 text-xs font-semibold transition cursor-pointer shadow-sm"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Edit</span>
                          </button>

                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => setDeletingTool(tool)}
                              title={`Delete ${tool.name} custom package`}
                              className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-400/50 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          )}

                          {isCustomized && !isCustom && (
                            <button
                              type="button"
                              onClick={() => handleResetBuiltIn(tool)}
                              title="Revert to factory default script"
                              className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-700/80 hover:border-amber-400/50 transition cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Options: Version Picker & Port Badge */}
                      <div
                        className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()} // don't toggle tool when clicking version dropdown
                      >
                        {tool.supportedVersions && tool.supportedVersions.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-mono uppercase">Ver:</span>
                            <div className="relative">
                              <select
                                value={state.version || tool.defaultVersion || ''}
                                onChange={(e) => setToolVersion(tool.id, e.target.value)}
                                className="px-2 py-1 bg-[#111A2E] border border-slate-700 hover:border-cyan-400 rounded-lg text-xs font-mono font-bold text-cyan-300 focus:outline-none cursor-pointer"
                              >
                                {tool.supportedVersions.map((ver) => (
                                  <option key={ver} value={ver}>
                                    {tool.id === 'java' && !ver.toLowerCase().startsWith('java')
                                      ? `Java ${ver}`
                                      : ver}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">
                            {tool.defaultVersion || 'Stable Latest'}
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {tool.port && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono">
                              Port {tool.port}
                            </span>
                          )}
                          {tool.dependencies && tool.dependencies.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-mono">
                              Req: {tool.dependencies.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Sticky Bottom Summary & Install Bar */}
      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-40 bg-[#0C1527]/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
            <span className="text-xs font-bold text-slate-300 shrink-0 font-mono uppercase tracking-wider">
              Selected ({selectedCount}):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedToolEntries.map(({ toolId, def, version }) => (
                <span
                  key={toolId}
                  className="px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0"
                >
                  <span>{def?.name.split(' ')[0]}</span>
                  {version && <span className="text-[10px] text-cyan-400/80">({version})</span>}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTool(toolId);
                    }}
                    className="hover:text-rose-400 transition cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={clearSelection}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/30 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Install Selected Tools ({selectedCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Pre-Execution Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Confirm Remote Software Installation
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target: {selectedServer?.name} ({selectedServer?.publicIp || selectedServer?.host})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Production Warning Banner if production */}
              {selectedServer?.environment === 'production' && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider block">
                      Production Server Confirmation
                    </span>
                    <p className="mt-0.5 text-rose-200/90 leading-relaxed">
                      You are about to install software on a production environment server ({selectedServer.name}). Ensure firewall and backup protocols are in place.
                    </p>
                  </div>
                </div>
              )}

              {/* Exact Shell Functions that will execute */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">
                  Exact Shell Functions to Execute ({selectedCount}):
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-[#080D1A] border border-slate-800 font-mono text-xs">
                  {selectedToolEntries.map(({ toolId, def, version }) => (
                    <div key={toolId} className="flex items-center justify-between text-slate-300">
                      <span className="text-cyan-300 font-bold">
                        {def?.functionName}({version ? `"${version}"` : ''})
                      </span>
                      <div className="flex items-center gap-1.5">
                        {def?.isCustom && (
                          <span className="text-[10px] text-purple-300 bg-purple-900/30 px-1.5 py-0.5 rounded font-mono border border-purple-500/30">
                            custom
                          </span>
                        )}
                        {def?.isCustomized && !def?.isCustom && (
                          <span className="text-[10px] text-amber-300 bg-amber-900/30 px-1.5 py-0.5 rounded font-mono border border-amber-500/30">
                            edited
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-sans">{def?.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strict Isolation & Idempotency Guarantee Notice */}
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-200 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Selective Execution Guarantee:</strong> Only these {selectedCount} functions will be invoked. Unselected tools (e.g. Jenkins, Nginx, Python) will <strong>NOT</strong> be touched or installed.
                </span>
              </div>

              {/* Options */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={stopOnError}
                  onChange={(e) => setStopOnError(e.target.checked)}
                  className="rounded border-slate-700 bg-[#111A2E] text-cyan-500 focus:ring-0"
                />
                <span>Halt deployment immediately if any tool installation fails</span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#090F1C] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndRun}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/30 flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Confirm & Execute Installation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Package Create / Edit Modal (Works for BOTH built-in tools and custom packages) */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#0C1425] border border-cyan-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
                  {editingTool ? (
                    <Edit3 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Plus className="w-4 h-4 text-purple-400 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">
                      {editingTool ? `Edit Package: ${editingTool.name}` : 'Create New Software Package'}
                    </h3>
                    {editingTool && !editingTool.isCustom && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Built-in Package
                      </span>
                    )}
                    {editingTool && editingTool.isCustom && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Custom Package
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editingTool
                      ? `Customize commands, supported versions, and configuration for ${editingTool.name}.`
                      : 'Define custom software packages, supported versions, and idempotent installation shell scripts.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPackageModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePackage} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {packageFormError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{packageFormError}</span>
                </div>
              )}

              {/* Grid 1: Name and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Package Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pkgName}
                    onChange={(e) => {
                      setPkgName(e.target.value);
                      if (!editingTool && !pkgId) {
                        setPkgId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      }
                    }}
                    placeholder="e.g. Java Development Kit (JDK)"
                    className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={pkgCategory}
                    onChange={(e) => setPkgCategory(e.target.value as ToolCategory)}
                    className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 transition cursor-pointer"
                  >
                    {TOOL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid 2: Identifier Slug & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Package Identifier Slug
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingTool)}
                    value={pkgId}
                    onChange={(e) => setPkgId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                    placeholder="e.g. java"
                    className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition disabled:opacity-60"
                  />
                  <p className="text-[10px] text-slate-400">Function: install_{pkgId.replace(/-/g, '_') || 'name'}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Badge / Tag Label
                  </label>
                  <input
                    type="text"
                    value={pkgBadge}
                    onChange={(e) => setPkgBadge(e.target.value)}
                    placeholder="e.g. Enterprise standard, LTS"
                    className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Default Port (Optional)
                  </label>
                  <input
                    type="number"
                    value={pkgPort}
                    onChange={(e) => setPkgPort(e.target.value)}
                    placeholder="e.g. 8080"
                    className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              {/* Grid 3: Versions & Dependencies */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Default Version
                  </label>
                  <input
                    type="text"
                    value={pkgDefaultVersion}
                    onChange={(e) => setPkgDefaultVersion(e.target.value)}
                    placeholder="17"
                    className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Supported Versions (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={pkgSupportedVersions}
                    onChange={(e) => setPkgSupportedVersions(e.target.value)}
                    placeholder="8, 11, 17, 21"
                    className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Description
                </label>
                <input
                  type="text"
                  value={pkgDescription}
                  onChange={(e) => setPkgDescription(e.target.value)}
                  placeholder="Short summary of what this tool does, port, or capabilities..."
                  className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              {/* Verification Command & Dependencies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Verification Command (Test if installed)
                  </label>
                  <input
                    type="text"
                    value={pkgVerification}
                    onChange={(e) => setPkgVerification(e.target.value)}
                    placeholder="e.g. java -version"
                    className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Dependencies (Optional, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={pkgDependencies}
                    onChange={(e) => setPkgDependencies(e.target.value)}
                    placeholder="e.g. curl, git"
                    className="w-full px-3.5 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              {/* Bash Script Editor */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Installation Bash Function Script <span className="text-rose-400">*</span></span>
                  </label>

                  {/* Template Quick Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-mono">Insert Template:</span>
                    <button
                      type="button"
                      onClick={() => applyTemplate('apt')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 text-[10px] font-mono cursor-pointer transition"
                    >
                      Apt/Dnf
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('docker')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono cursor-pointer transition"
                    >
                      Docker
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('binary')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] hover:bg-blue-900/40 text-blue-300 border border-blue-500/30 text-[10px] font-mono cursor-pointer transition"
                    >
                      Binary
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('source')}
                      className="px-2 py-0.5 rounded bg-[#111A2E] hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono cursor-pointer transition"
                    >
                      Source
                    </button>
                  </div>
                </div>

                <div className="relative rounded-xl border border-slate-800 bg-[#070C18] overflow-hidden focus-within:border-cyan-500/60 transition">
                  <textarea
                    required
                    rows={12}
                    value={pkgInstallScript}
                    onChange={(e) => setPkgInstallScript(e.target.value)}
                    placeholder="# Enter bash commands for installation function...
log_step 'Installing tool'
pkg_update
sudo apt-get install -y tool"
                    className="w-full p-3.5 bg-transparent font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-y leading-relaxed"
                    spellCheck={false}
                  />
                </div>

                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>
                    Environment variables <code className="text-cyan-300 font-mono">$IS_DEBIAN</code>,{' '}
                    <code className="text-cyan-300 font-mono">$IS_RHEL</code>, and helpers{' '}
                    <code className="text-cyan-300 font-mono">log_step</code>,{' '}
                    <code className="text-cyan-300 font-mono">log_success</code>,{' '}
                    <code className="text-cyan-300 font-mono">pkg_install</code> are available in scope.
                  </span>
                </p>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <div>
                  {editingTool && editingTool.isCustomized && !editingTool.isCustom && (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleResetBuiltIn(editingTool);
                        setShowPackageModal(false);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Revert to Factory Default</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPackageModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPackage}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/30 flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingPackage ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{editingTool ? 'Save & Apply Changes' : 'Save & Register Package'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deletingTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Delete Custom Package</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong>{deletingTool.name}</strong> from your software catalog?
              Its custom script and configuration will be deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTool(null)}
                className="px-4 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePackageConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-rose-600/30"
              >
                Delete Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
