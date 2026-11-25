'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCode,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Save,
  Check,
  Plus,
  Trash2,
  Copy,
  RotateCw,
  Search,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  FileCheck,
  RefreshCw,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { TerraformLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface TerraformCodeTabProps {
  activeProject: any;
  onSaveFiles: (files: Array<{ name: string; content: string }>) => Promise<void>;
  onExecuteAction: (operation: string, extraArgs?: string[], targetResource?: string) => Promise<any>;
  isExecuting?: boolean;
  activeLogs?: string;
  onSwitchTab?: (tab: any) => void;
}

export function TerraformCodeTab({
  activeProject,
  onSaveFiles,
  onExecuteAction,
  isExecuting = false,
  activeLogs = '',
  onSwitchTab,
}: TerraformCodeTabProps) {
  const [files, setFiles] = useState<Array<{ name: string; content: string }>>([]);
  const [activeFileName, setActiveFileName] = useState('main.tf');
  const [activeContent, setActiveContent] = useState('');
  const [customFolders, setCustomFolders] = useState<string[]>(['modules', 'environments']);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    modules: true,
    environments: true,
  });

  // Modal States
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [selectedFolderForNewFile, setSelectedFolderForNewFile] = useState('');

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [showTaintModal, setShowTaintModal] = useState(false);
  const [taintTarget, setTaintTarget] = useState('');

  const [showDestroyModal, setShowDestroyModal] = useState(false);
  const [destroyConfirmText, setDestroyConfirmText] = useState('');

  // Editor & Terminal States
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  const [showConsole, setShowConsole] = useState(true);
  const [lastExecutedOp, setLastExecutedOp] = useState<string>('');

  // Sync files from activeProject
  useEffect(() => {
    if (activeProject?.files && activeProject.files.length > 0) {
      setFiles(activeProject.files);
      const target =
        activeProject.files.find((f: any) => f.name === activeFileName) || activeProject.files[0];
      if (target) {
        setActiveFileName(target.name);
        setActiveContent(target.content);
      }
    }
  }, [activeProject]);

  // Extract all existing folders from file paths + custom folders
  const allFolders = useMemo(() => {
    const folderSet = new Set<string>(customFolders);
    files.forEach((f) => {
      const parts = f.name.split('/');
      if (parts.length > 1) {
        parts.pop(); // remove file name
        folderSet.add(parts.join('/'));
      }
    });
    return Array.from(folderSet);
  }, [files, customFolders]);

  // Hierarchical file tree structure
  const fileTree = useMemo(() => {
    const rootFiles: Array<{ name: string; content: string }> = [];
    const folderMap: Record<string, Array<{ name: string; content: string; displayName: string }>> =
      {};

    allFolders.forEach((folder) => {
      folderMap[folder] = [];
    });

    files.forEach((f) => {
      if (searchQuery.trim() && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      const parts = f.name.split('/');
      if (parts.length === 1) {
        rootFiles.push(f);
      } else {
        const fileName = parts.pop()!;
        const folderPath = parts.join('/');
        if (!folderMap[folderPath]) {
          folderMap[folderPath] = [];
        }
        folderMap[folderPath].push({ ...f, displayName: fileName });
      }
    });

    return { rootFiles, folderMap };
  }, [files, allFolders, searchQuery]);

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleSelectFile = (name: string) => {
    // Preserve current content in local state
    const updated = files.map((f) =>
      f.name === activeFileName ? { ...f, content: activeContent } : f
    );
    setFiles(updated);

    const nextFile = updated.find((f) => f.name === name);
    if (nextFile) {
      setActiveFileName(name);
      setActiveContent(nextFile.content);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = files.map((f) =>
        f.name === activeFileName ? { ...f, content: activeContent } : f
      );
      setFiles(updated);
      await onSaveFiles(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    let cleanName = newFileName.trim();
    if (!cleanName.endsWith('.tf') && !cleanName.endsWith('.tfvars') && !cleanName.endsWith('.json')) {
      cleanName = `${cleanName}.tf`;
    }

    const fullPath = selectedFolderForNewFile ? `${selectedFolderForNewFile}/${cleanName}` : cleanName;

    if (files.some((f) => f.name === fullPath)) {
      alert(`File '${fullPath}' already exists.`);
      return;
    }

    const newFile = {
      name: fullPath,
      content: `# ${fullPath}\n# Terraform HCL Configuration\n\n`,
    };
    const updated = [...files, newFile];
    setFiles(updated);
    setActiveFileName(fullPath);
    setActiveContent(newFile.content);
    setNewFileName('');
    setSelectedFolderForNewFile('');
    setShowNewFileModal(false);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const cleanFolder = newFolderName.trim().replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    if (!customFolders.includes(cleanFolder)) {
      setCustomFolders((prev) => [...prev, cleanFolder]);
      setExpandedFolders((prev) => ({ ...prev, [cleanFolder]: true }));
    }
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleDeleteFile = (fileName: string) => {
    if (fileName === 'main.tf') {
      alert('main.tf cannot be deleted (required entrypoint).');
      return;
    }
    if (confirm(`Delete '${fileName}'?`)) {
      const updated = files.filter((f) => f.name !== fileName);
      setFiles(updated);
      if (activeFileName === fileName) {
        setActiveFileName(updated[0]?.name || 'main.tf');
        setActiveContent(updated[0]?.content || '');
      }
    }
  };

  const handleDeleteFolder = (folder: string) => {
    if (confirm(`Delete folder '${folder}' and all files inside?`)) {
      setCustomFolders((prev) => prev.filter((f) => f !== folder));
      const updated = files.filter((f) => !f.name.startsWith(`${folder}/`));
      setFiles(updated);
      if (activeFileName.startsWith(`${folder}/`)) {
        setActiveFileName(updated[0]?.name || 'main.tf');
        setActiveContent(updated[0]?.content || '');
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeCommand = async (op: string, extraArgs?: string[], targetRes?: string) => {
    if (!activeProject) return;
    setLastExecutedOp(op);
    setShowConsole(true);
    setConsoleOutput(`$ terraform ${op}...\n[Executing real Terraform engine on ${activeProject.name}]...\n`);
    try {
      // Auto-save files before executing command so latest code is tested
      const updated = files.map((f) =>
        f.name === activeFileName ? { ...f, content: activeContent } : f
      );
      await onSaveFiles(updated);

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
    await executeCommand('taint', undefined, taintTarget.trim());
    setTaintTarget('');
  };

  const handleDestroySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (destroyConfirmText !== activeProject?.name) return;
    setShowDestroyModal(false);
    setDestroyConfirmText('');
    await executeCommand('destroy');
  };

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. TOP ACTION & TERRAFORM COMMANDS TOOLBAR               */}
      {/* ======================================================== */}
      <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active File Indicator */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <TerraformLogo className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Terraform HCL Editor:
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#080D1A] border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold shadow-sm">
                {activeFileName}
              </span>
              {savedSuccess && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 font-mono">
              Stack: <span className="text-gray-200">{activeProject?.name || 'none'}</span> • Workspace:{' '}
              <span className="text-purple-300">{activeProject?.currentWorkspace || 'default'}</span>
            </p>
          </div>
        </div>

        {/* Right: Integrated Terraform Lifecycle Commands */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* terraform init */}
          <button
            type="button"
            onClick={() => executeCommand('init')}
            disabled={isExecuting}
            className="px-2.5 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-gray-200 border border-gray-700 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            title="terraform init"
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-cyan-400 ${
                isExecuting && lastExecutedOp === 'init' ? 'animate-spin' : ''
              }`}
            />
            <span>init</span>
          </button>

          {/* terraform fmt */}
          <button
            type="button"
            onClick={() => executeCommand('fmt')}
            disabled={isExecuting}
            className="px-2.5 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-gray-300 border border-gray-700 rounded-xl text-xs font-mono font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            title="terraform fmt"
          >
            <FileCode className="w-3.5 h-3.5 text-purple-400" />
            <span>fmt</span>
          </button>

          {/* terraform validate */}
          <button
            type="button"
            onClick={() => executeCommand('validate')}
            disabled={isExecuting}
            className="px-2.5 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            title="terraform validate"
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>validate</span>
          </button>

          {/* terraform plan */}
          <button
            type="button"
            onClick={() => executeCommand('plan')}
            disabled={isExecuting}
            className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 disabled:opacity-50 shadow-md shadow-cyan-950/40 cursor-pointer"
            title="terraform plan"
          >
            <Play className="w-3.5 h-3.5 fill-cyan-300" />
            <span>plan</span>
          </button>

          {/* terraform apply */}
          <button
            type="button"
            onClick={() => executeCommand('apply')}
            disabled={isExecuting}
            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 disabled:opacity-50 shadow-md shadow-emerald-950/40 cursor-pointer"
            title="terraform apply"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>apply</span>
          </button>

          {/* terraform refresh */}
          <button
            type="button"
            onClick={() => executeCommand('refresh')}
            disabled={isExecuting}
            className="px-2.5 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-gray-300 border border-gray-700 rounded-xl text-xs font-mono font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            title="terraform refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>refresh</span>
          </button>

          {/* terraform taint */}
          <button
            type="button"
            onClick={() => setShowTaintModal(true)}
            disabled={isExecuting}
            className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-mono font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            title="terraform taint"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>taint</span>
          </button>

          {/* terraform destroy */}
          <button
            type="button"
            onClick={() => setShowDestroyModal(true)}
            disabled={isExecuting}
            className="px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            title="terraform destroy"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>destroy</span>
          </button>

          <div className="w-[1px] h-6 bg-gray-800 mx-1 hidden sm:block" />

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-gray-300 border border-[#1E293B] rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            title="Copy current file contents"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Save File */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/25"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save File'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FILE TREE EXPLORER & CODE EDITOR GRID                 */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Left: Folders & Files Explorer */}
        <div className="bg-[#090F1E]/95 border border-purple-500/25 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-purple-500/15 pb-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-cyan-400" />
                <span>Project Structure</span>
              </span>

              <div className="flex items-center gap-1">
                {/* + New Folder */}
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(true)}
                  className="p-1 rounded-lg bg-[#131D35] hover:bg-gray-800 text-cyan-300 border border-cyan-500/30 cursor-pointer"
                  title="Create New Folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>

                {/* + New File */}
                <button
                  type="button"
                  onClick={() => setShowNewFileModal(true)}
                  className="p-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 cursor-pointer"
                  title="Create New File"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl pl-8 pr-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Hierarchical Folder and File Tree */}
            <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
              {/* Folders and files inside them */}
              {allFolders.map((folder) => {
                const folderFiles = fileTree.folderMap[folder] || [];
                const isExpanded = !!expandedFolders[folder];

                return (
                  <div key={folder} className="space-y-0.5">
                    <div className="flex items-center justify-between group px-2 py-1.5 rounded-lg bg-[#0D1526]/80 hover:bg-[#131D35] transition text-xs">
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder)}
                        className="flex items-center gap-1.5 text-gray-300 hover:text-white font-mono flex-1 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-gray-500" />
                        )}
                        {isExpanded ? (
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-amber-400/80" />
                        )}
                        <span>{folder}</span>
                        <span className="text-[10px] text-gray-500">({folderFiles.length})</span>
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFolderForNewFile(folder);
                            setShowNewFileModal(true);
                          }}
                          className="p-0.5 text-gray-400 hover:text-cyan-300"
                          title={`Add file inside ${folder}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(folder)}
                          className="p-0.5 text-gray-500 hover:text-red-400"
                          title={`Delete folder ${folder}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Files inside folder */}
                    {isExpanded && (
                      <div className="pl-4 space-y-0.5 border-l border-gray-800 ml-3">
                        {folderFiles.length === 0 ? (
                          <div className="px-2 py-1 text-[11px] text-gray-600 italic">
                            (empty folder)
                          </div>
                        ) : (
                          folderFiles.map((f) => {
                            const isSelected = activeFileName === f.name;
                            return (
                              <div
                                key={f.name}
                                onClick={() => handleSelectFile(f.name)}
                                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-purple-600/30 text-cyan-300 border border-purple-500/50 font-bold'
                                    : 'text-gray-400 hover:bg-[#131D35] hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                  <span className="truncate font-mono">{f.displayName}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(f.name);
                                  }}
                                  className="text-gray-500 hover:text-red-400 p-0.5"
                                  title="Delete file"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Root Files */}
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase text-gray-500 px-2 py-1 block">
                  Root Files
                </span>
                {fileTree.rootFiles.map((f) => {
                  const isSelected = activeFileName === f.name;
                  return (
                    <div
                      key={f.name}
                      onClick={() => handleSelectFile(f.name)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-purple-600/30 text-cyan-300 border border-purple-500/50 font-bold shadow-sm'
                          : 'text-gray-400 hover:bg-[#131D35] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate font-mono">{f.name}</span>
                      </div>

                      {f.name !== 'main.tf' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(f.name);
                          }}
                          className="text-gray-500 hover:text-red-400 p-0.5"
                          title="Delete file"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick File Add Hint */}
          <div className="pt-2 border-t border-gray-800 text-[11px] text-gray-500 flex items-center justify-between font-mono">
            <span>Files: {files.length}</span>
            <span>Folders: {allFolders.length}</span>
          </div>
        </div>

        {/* Right: Code Editor (3 cols) */}
        <div className="md:col-span-3 bg-[#090F1E]/95 border border-cyan-500/25 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-gray-300">{activeFileName}</span>
              <span className="text-[10px] text-gray-500 font-mono">
                {activeContent.split('\n').length} lines • {activeContent.length} chars
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowConsole(!showConsole)}
                className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] transition flex items-center gap-1 ${
                  showConsole
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                    : 'bg-[#131D35] text-gray-400 border-gray-700'
                }`}
              >
                <Terminal className="w-3 h-3" />
                <span>{showConsole ? 'Hide Console' : 'Show Console'}</span>
              </button>
            </div>
          </div>

          {/* Code Textarea Editor */}
          <div className="relative">
            <textarea
              value={activeContent}
              onChange={(e) => setActiveContent(e.target.value)}
              spellCheck={false}
              rows={18}
              className="w-full bg-[#060A14] text-gray-200 font-mono text-xs p-4 rounded-xl border border-gray-800 focus:outline-none focus:border-cyan-400 resize-y leading-relaxed shadow-inner"
              placeholder="# Write or paste Terraform HCL configuration..."
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
            <span>Syntax: HashiCorp Configuration Language (HCL)</span>
            <span>Target: {activeProject?.provider?.toUpperCase() || 'MULTI-CLOUD'}</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DOCKED REAL-TIME EXECUTION CONSOLE                   */}
      {/* ======================================================== */}
      {showConsole && (
        <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl p-4 shadow-2xl shadow-cyan-950/40 space-y-2">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Terraform Engine Execution Console
              </span>
              {isExecuting && (
                <span className="text-cyan-400 font-bold animate-pulse text-[11px] font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  ● Executing real CLI...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(consoleOutput || activeLogs)}
                className="hover:text-white transition flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Logs</span>
              </button>
              <button
                type="button"
                onClick={() => setConsoleOutput('')}
                className="hover:text-white transition text-[11px] text-gray-400 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <pre className="p-3.5 rounded-xl bg-[#060A14] border border-gray-800 font-mono text-xs text-gray-300 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
            {consoleOutput ||
              activeLogs ||
              `$ Ready for commands (init, fmt, validate, plan, apply, refresh, taint, destroy)...`}
          </pre>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODALS (CREATE FILE, CREATE FOLDER, TAINT, DESTROY)   */}
      {/* ======================================================== */}
      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FilePlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Create New Terraform File</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Target Folder (Optional):</label>
                <select
                  value={selectedFolderForNewFile}
                  onChange={(e) => setSelectedFolderForNewFile(e.target.value)}
                  className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                >
                  <option value="">/ (Root Directory)</option>
                  {allFolders.map((f) => (
                    <option key={f} value={f}>
                      /{f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">File Name:</label>
                <input
                  type="text"
                  placeholder="e.g. security.tf, terraform.tfvars, outputs.tf"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFile}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Create New Folder</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Folder Name / Path:</label>
                <input
                  type="text"
                  placeholder="e.g. modules, environments, networking"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-cyan-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

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
                  className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white"
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
                Type project name <strong className="font-mono text-white">{activeProject?.name}</strong> to confirm destruction:
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
                  className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white"
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
