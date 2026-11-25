'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Server,
  Cloud,
  FileCode,
  Calendar,
  Tag,
  Search,
  Play,
  Check,
  AlertTriangle,
  RotateCw,
  Terminal,
  FileCheck,
  RefreshCw,
  Zap,
  ShieldAlert,
  Sliders,
  Copy,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react';
import { AwsLogo, AzureLogo, TerraformLogo } from '@/components/icons/CloudIcons';
import { ENTERPRISE_TERRAFORM_TEMPLATES } from '@/app/api/terraform/templates/route';

interface TerraformProjectsTabProps {
  projects: any[];
  activeProject: any;
  onSelectProject: (proj: any) => void;
  onOpenCreateProject: (templateId?: string) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onExecuteAction: (operation: string, extraArgs?: string[], targetResource?: string) => Promise<any>;
  isExecuting?: boolean;
  activeLogs?: string;
  onApplyTemplateToProject?: (template: any) => Promise<void>;
  onSwitchTab?: (tab: any) => void;
}

export function TerraformProjectsTab({
  projects,
  activeProject,
  onSelectProject,
  onOpenCreateProject,
  onDeleteProject,
  onExecuteAction,
  isExecuting = false,
  activeLogs = '',
  onApplyTemplateToProject,
  onSwitchTab,
}: TerraformProjectsTabProps) {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'aws' | 'azure'>('all');
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [showConsole, setShowConsole] = useState(true);
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  const [lastOp, setLastOp] = useState<string>('');

  // Taint Modal State
  const [showTaintModal, setShowTaintModal] = useState(false);
  const [taintTarget, setTaintTarget] = useState('');

  // Destroy Modal State
  const [showDestroyModal, setShowDestroyModal] = useState(false);
  const [destroyConfirmText, setDestroyConfirmText] = useState('');

  const filtered = projects.filter((p) => {
    if (providerFilter !== 'all' && p.provider !== providerFilter) return false;
    if (envFilter !== 'all' && p.environment !== envFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCommand = async (op: string, extraArgs?: string[], targetRes?: string) => {
    if (!activeProject) return;
    setLastOp(op);
    setShowConsole(true);
    setConsoleOutput(`$ terraform ${op}...\n[Executing real Terraform engine on ${activeProject.name}]...\n`);
    try {
      const res = await onExecuteAction(op, extraArgs, targetRes);
      if (res?.output) {
        setConsoleOutput(res.output);
      } else if (res?.logs) {
        setConsoleOutput(res.logs);
      }
    } catch (e: any) {
      setConsoleOutput((prev) => `${prev}\n[ERROR]: ${e.message || 'Execution error'}`);
    }
  };

  const handleTaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taintTarget.trim()) return;
    setShowTaintModal(false);
    await handleCommand('taint', undefined, taintTarget.trim());
    setTaintTarget('');
  };

  const handleDestroySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (destroyConfirmText !== activeProject?.name) return;
    setShowDestroyModal(false);
    setDestroyConfirmText('');
    await handleCommand('destroy');
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. ACTIVE PROJECT INTERACTIVE OPERATIONS CONSOLE          */}
      {/* ======================================================== */}
      {activeProject ? (
        <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl p-5 shadow-2xl shadow-cyan-950/40 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                {activeProject.provider === 'aws' ? (
                  <AwsLogo className="w-5 h-5" />
                ) : (
                  <AzureLogo className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white font-mono">{activeProject.name}</h2>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                      activeProject.environment === 'production'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : activeProject.environment === 'staging'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {activeProject.environment}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    Workspace: <strong className="text-white">{activeProject.currentWorkspace || 'default'}</strong>
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Region: <span className="font-mono text-gray-300">{activeProject.region}</span> • Backend:{' '}
                  <span className="font-mono text-gray-300">{activeProject.backend?.type || 'local'}</span> •{' '}
                  Files: {activeProject.files?.length || 3}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* terraform init */}
              <button
                type="button"
                onClick={() => handleCommand('init')}
                disabled={isExecuting}
                className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-mono font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Initialize provider plugins and backend state"
              >
                <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isExecuting && lastOp === 'init' ? 'animate-spin' : ''}`} />
                <span>init</span>
              </button>

              {/* terraform plan */}
              <button
                type="button"
                onClick={() => handleCommand('plan')}
                disabled={isExecuting}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-cyan-950/40 cursor-pointer"
                title="Generate and inspect execution plan"
              >
                <Play className="w-3.5 h-3.5 fill-cyan-300" />
                <span>plan</span>
              </button>

              {/* terraform apply */}
              <button
                type="button"
                onClick={() => handleCommand('apply')}
                disabled={isExecuting}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-emerald-950/40 cursor-pointer"
                title="Apply changes to deploy real cloud infrastructure"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>apply</span>
              </button>

              {/* terraform fmt */}
              <button
                type="button"
                onClick={() => handleCommand('fmt')}
                disabled={isExecuting}
                className="px-2.5 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 border border-gray-700 text-xs font-mono font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                title="Format HCL code files"
              >
                <FileCode className="w-3.5 h-3.5 text-purple-400" />
                <span>fmt</span>
              </button>

              {/* terraform validate */}
              <button
                type="button"
                onClick={() => handleCommand('validate')}
                disabled={isExecuting}
                className="px-2.5 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 border border-gray-700 text-xs font-mono font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                title="Validate HCL syntax & structure"
              >
                <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>validate</span>
              </button>

              {/* terraform refresh */}
              <button
                type="button"
                onClick={() => handleCommand('refresh')}
                disabled={isExecuting}
                className="px-2.5 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 border border-gray-700 text-xs font-mono font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                title="Synchronize remote cloud state"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>refresh</span>
              </button>

              {/* terraform taint */}
              <button
                type="button"
                onClick={() => setShowTaintModal(true)}
                disabled={isExecuting}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                title="Mark a resource to be recreated on next apply"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>taint</span>
              </button>

              {/* terraform destroy */}
              <button
                type="button"
                onClick={() => setShowDestroyModal(true)}
                disabled={isExecuting}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-mono font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                title="Safely destroy infrastructure provisioned by this project"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>destroy</span>
              </button>

              {/* Open Code Tab */}
              {onSwitchTab && (
                <button
                  type="button"
                  onClick={() => onSwitchTab('code')}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-mono font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Output Console */}
          {showConsole && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1.5 font-mono">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Execution Output Console</span>
                  {isExecuting && (
                    <span className="text-cyan-400 font-bold animate-pulse text-[11px]">
                      ● Engine Running...
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(consoleOutput || activeLogs);
                    }}
                    className="hover:text-white transition flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsoleOutput('')}
                    className="hover:text-white transition text-[11px] cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <pre className="p-3.5 rounded-xl bg-[#060A14] border border-gray-800 font-mono text-xs text-gray-300 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {consoleOutput || activeLogs || '$ Ready for commands (init, plan, apply, fmt, validate, refresh, taint, destroy)...'}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#090F1E] border border-gray-800 text-center space-y-2">
          <TerraformLogo className="w-8 h-8 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-white">No Active Project Selected</h3>
          <p className="text-xs text-gray-400">
            Select a project from the catalog below or bootstrap a new stack from AWS/Azure templates.
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ENTERPRISE TEMPLATES SHOWCASE (AWS & AZURE)            */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Enterprise Terraform Templates (AWS & Azure)
            </h2>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {ENTERPRISE_TERRAFORM_TEMPLATES.length} Production Architectures
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ENTERPRISE_TERRAFORM_TEMPLATES.map((tpl) => {
            const isAws = tpl.provider === 'aws';
            return (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-[#0D1526]/90 border border-purple-500/20 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isAws ? <AwsLogo className="w-5 h-5" /> : <AzureLogo className="w-5 h-5" />}
                      <span className="text-[10px] font-bold uppercase font-mono text-gray-400">
                        {tpl.category}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                        isAws ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {tpl.provider}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{tpl.description}</p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {tpl.resources.slice(0, 4).map((r: string) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded bg-[#080D1A] text-gray-400 border border-[#1E293B] text-[10px] font-mono"
                      >
                        {r}
                      </span>
                    ))}
                    {tpl.resources.length > 4 && (
                      <span className="text-[10px] text-gray-500 font-mono">
                        +{tpl.resources.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-500 font-mono">
                    {tpl.files.length} HCL files
                  </span>

                  <div className="flex items-center gap-2">
                    {activeProject && onApplyTemplateToProject && (
                      <button
                        type="button"
                        onClick={() => onApplyTemplateToProject(tpl)}
                        className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition cursor-pointer"
                        title="Load this template into current active stack"
                      >
                        Apply to Stack
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenCreateProject(tpl.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-950/40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Project</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. PROJECTS CATALOG & FILTERING                           */}
      {/* ======================================================== */}
      <div className="space-y-4 pt-2">
        <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {['all', 'aws', 'azure'].map((p) => (
                <button
                  key={p}
                  onClick={() => setProviderFilter(p as any)}
                  className={`px-3 py-1 rounded-lg font-bold uppercase text-[10px] transition cursor-pointer ${
                    providerFilter === p
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-[#080D1A] text-gray-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenCreateProject()}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Terraform Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((proj) => {
            const isSelected = activeProject?._id === proj._id;
            const isAws = proj.provider === 'aws';

            return (
              <div
                key={proj._id}
                onClick={() => onSelectProject(proj)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'bg-[#0D1526] border-purple-500/60 shadow-xl shadow-purple-500/15'
                    : 'bg-[#0D1526]/75 border-[#1E293B] hover:border-purple-500/30'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isAws ? <AwsLogo className="w-5 h-5" /> : <AzureLogo className="w-5 h-5" />}
                      <h3 className="text-sm font-bold text-white truncate max-w-[180px]">{proj.name}</h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        proj.environment === 'production'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : proj.environment === 'staging'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {proj.environment}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2">
                    {proj.description || 'Enterprise infrastructure managed via Terraform automation.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-[#080D1A]">
                      <span className="text-gray-500 block">Region:</span>
                      <span className="text-white font-mono font-medium">{proj.region}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#080D1A]">
                      <span className="text-gray-500 block">Managed Resources:</span>
                      <span className="text-cyan-300 font-mono font-bold">
                        {proj.managedResources?.length || proj.managedResourcesCount || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs">
                  <span className="text-gray-500 text-[11px]">
                    Files: {proj.files?.length || 3}
                  </span>

                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <span className="text-cyan-400 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        Active
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[11px] group-hover:text-white">
                        Click to activate
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Archive project '${proj.name}'? Existing cloud infrastructure will NOT be destroyed.`)) {
                          onDeleteProject(proj._id);
                        }
                      }}
                      className="p-1 rounded text-gray-500 hover:text-rose-400 cursor-pointer"
                      title="Archive project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODALS (TAINT & DESTROY)                               */}
      {/* ======================================================== */}
      {/* Taint Modal */}
      {showTaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#090F1E] border border-amber-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Terraform Taint Resource</h3>
                <p className="text-xs text-gray-400">Mark a resource to be destroyed and recreated on next apply</p>
              </div>
            </div>

            <form onSubmit={handleTaintSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                  Target Resource Address
                </label>
                <input
                  type="text"
                  placeholder={
                    activeProject?.provider === 'aws'
                      ? 'e.g. aws_instance.app_server'
                      : 'e.g. azurerm_linux_virtual_machine.vm'
                  }
                  value={taintTarget}
                  onChange={(e) => setTaintTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1526] border border-gray-800 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowTaintModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono transition cursor-pointer"
                >
                  Execute Taint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Destroy Modal */}
      {showDestroyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#090F1E] border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Infrastructure Destroy</h3>
                <p className="text-xs text-red-300/80">
                  This will run real <code className="text-red-300">terraform destroy</code> on AWS/Azure
                </p>
              </div>
            </div>

            <form onSubmit={handleDestroySubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                Type the project name <strong className="font-mono text-white">{activeProject?.name}</strong> to confirm destruction:
              </div>

              <div>
                <input
                  type="text"
                  placeholder={activeProject?.name}
                  value={destroyConfirmText}
                  onChange={(e) => setDestroyConfirmText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1526] border border-gray-800 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowDestroyModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={destroyConfirmText !== activeProject?.name}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  Destroy Infrastructure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
