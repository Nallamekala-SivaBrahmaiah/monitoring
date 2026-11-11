'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Folder,
  GitBranch,
  Globe,
  Terminal,
  Cpu,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { MavenLogo } from '@/components/icons/CloudIcons';
import { IMavenProjectData, IMavenEnvVar } from '@/models/MavenProject';

interface CreateMavenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editProject?: IMavenProjectData | null;
}

export function CreateMavenProjectModal({
  isOpen,
  onClose,
  onSaved,
  editProject = null,
}: CreateMavenProjectModalProps) {
  const [name, setName] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [projectFolder, setProjectFolder] = useState('.');
  const [mavenVersion, setMavenVersion] = useState('3.9');
  const [jdkVersion, setJdkVersion] = useState('Java 21');
  const [mavenCommand, setMavenCommand] = useState('mvn clean package');
  const [customCommand, setCustomCommand] = useState('');
  const [executionMode, setExecutionMode] = useState<'native' | 'docker' | 'auto'>('auto');
  const [envVars, setEnvVars] = useState<IMavenEnvVar[]>([]);
  const [showSecretMap, setShowSecretMap] = useState<Record<number, boolean>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editProject) {
      setName(editProject.name || '');
      setRepositoryUrl(editProject.repositoryUrl || '');
      setBranch(editProject.branch || 'main');
      setProjectFolder(editProject.projectFolder || '.');
      setMavenVersion(editProject.mavenVersion || '3.9');
      setJdkVersion(editProject.jdkVersion || 'Java 21');
      setExecutionMode(editProject.executionMode || 'auto');
      setEnvVars(editProject.envVariables || []);

      const standardCommands = [
        'mvn clean package',
        'mvn clean install',
        'mvn test',
        'mvn package -DskipTests',
        'mvn clean verify',
      ];
      if (standardCommands.includes(editProject.mavenCommand)) {
        setMavenCommand(editProject.mavenCommand);
        setCustomCommand('');
      } else {
        setMavenCommand('custom');
        setCustomCommand(editProject.mavenCommand);
      }
    } else {
      setName('');
      setRepositoryUrl('');
      setBranch('main');
      setProjectFolder('.');
      setMavenVersion('3.9');
      setJdkVersion('Java 21');
      setMavenCommand('mvn clean package');
      setCustomCommand('');
      setExecutionMode('auto');
      setEnvVars([]);
    }
    setError(null);
  }, [editProject, isOpen]);

  if (!isOpen) return null;

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '', isSecret: false }]);
  };

  const handleRemoveEnvVar = (idx: number) => {
    setEnvVars(envVars.filter((_, i) => i !== idx));
  };

  const handleEnvChange = (idx: number, field: keyof IMavenEnvVar, val: any) => {
    const updated = [...envVars];
    (updated[idx] as any)[field] = val;
    setEnvVars(updated);
  };

  const toggleShowSecret = (idx: number) => {
    setShowSecretMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a project name.');
      return;
    }
    if (!repositoryUrl.trim()) {
      setError('Please provide a valid GitHub or Git repository URL.');
      return;
    }

    const finalCommand = mavenCommand === 'custom' ? customCommand.trim() : mavenCommand;
    if (!finalCommand) {
      setError('Please specify a Maven command to run.');
      return;
    }

    // Clean env variables (remove empty keys)
    const validEnvVars = envVars.filter((ev) => ev.key.trim() !== '');

    setSaving(true);
    try {
      const url = editProject
        ? `/api/maven/projects/${editProject._id}`
        : '/api/maven/projects';
      const method = editProject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          repositoryUrl: repositoryUrl.trim(),
          branch: branch.trim() || 'main',
          projectFolder: projectFolder.trim() || '.',
          mavenVersion,
          jdkVersion,
          mavenCommand: finalCommand,
          envVariables: validEnvVars,
          executionMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save project');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B] bg-[#0E1628]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-blue-500/20 border border-slate-700/50 flex items-center justify-center">
              <MavenLogo className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {editProject ? 'Edit Maven Project' : 'Configure New Maven Project'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Setup Git repository, Java/JDK version, build goals, and environment secrets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring PetClinic or demo-rest-service"
              className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none"
            />
          </div>

          {/* Repository & Branch */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>GitHub Repository URL <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="text"
                required
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/username/project.git"
                className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none font-mono text-[11px]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                <span>Branch</span>
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none font-mono"
              />
            </div>
          </div>

          {/* Project Folder & Execution Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Project Subfolder</span>
              </label>
              <input
                type="text"
                value={projectFolder}
                onChange={(e) => setProjectFolder(e.target.value)}
                placeholder=". (repository root) or e.g. backend / src"
                className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Build Environment Mode</span>
              </label>
              <select
                value={executionMode}
                onChange={(e) => setExecutionMode(e.target.value as any)}
                className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 outline-none cursor-pointer"
              >
                <option value="auto">Auto-Detect (Native Host / Wrapper)</option>
                <option value="native">Native System Maven (3.9.9)</option>
                <option value="docker">Docker Container (Isolated Sandbox)</option>
              </select>
            </div>
          </div>

          {/* Versions: Maven & Java JDK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Maven Version</label>
              <select
                value={mavenVersion}
                onChange={(e) => setMavenVersion(e.target.value)}
                className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 outline-none cursor-pointer"
              >
                <option value="3.9">Apache Maven 3.9 (Latest 3.9.9)</option>
                <option value="3.8">Apache Maven 3.8</option>
                <option value="wrapper">Use Repository Maven Wrapper (mvnw)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Java / JDK Version</label>
              <select
                value={jdkVersion}
                onChange={(e) => setJdkVersion(e.target.value)}
                className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 outline-none cursor-pointer"
              >
                <option value="Java 23">JDK 23 (Detected on host)</option>
                <option value="Java 21">JDK 21 (LTS)</option>
                <option value="Java 17">JDK 17 (LTS)</option>
                <option value="Java 11">JDK 11 (LTS)</option>
                <option value="Java 8">Java 8 (JRE 1.8)</option>
              </select>
            </div>
          </div>

          {/* Maven Goals & Commands */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Maven Goal / Build Command</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <select
                value={mavenCommand}
                onChange={(e) => setMavenCommand(e.target.value)}
                className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 outline-none cursor-pointer font-mono"
              >
                <option value="mvn clean package">mvn clean package (Standard)</option>
                <option value="mvn clean install">mvn clean install (Full Local Repo)</option>
                <option value="mvn test">mvn test (Run Unit &amp; Integration Tests)</option>
                <option value="mvn package -DskipTests">mvn package -DskipTests (Fast Build)</option>
                <option value="mvn clean verify">mvn clean verify (Quality Checks)</option>
                <option value="custom">Custom Maven Command...</option>
              </select>

              {mavenCommand === 'custom' && (
                <input
                  type="text"
                  required
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="e.g. mvn clean compile assembly:single"
                  className="w-full bg-[#111A2E] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 font-mono outline-none"
                />
              )}
            </div>
          </div>

          {/* Environment Variables & Secrets */}
          <div className="space-y-2 pt-2 border-t border-[#1E293B]">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Build Environment Variables &amp; Secrets</span>
                </label>
                <p className="text-[10px] text-slate-400">
                  Injected during build execution. Secrets are masked and never exposed.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddEnvVar}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-semibold text-[11px] border border-blue-500/30 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Variable</span>
              </button>
            </div>

            {envVars.length === 0 ? (
              <div className="p-3 text-center rounded-xl bg-[#111A2E]/50 border border-dashed border-[#1E293B] text-slate-500 text-[11px]">
                No custom environment variables configured.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {envVars.map((ev, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="KEY (e.g. DB_URL)"
                      value={ev.key}
                      onChange={(e) => handleEnvChange(idx, 'key', e.target.value)}
                      className="w-1/3 bg-[#111A2E] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-[11px] outline-none"
                    />
                    <div className="relative flex-1">
                      <input
                        type={ev.isSecret && !showSecretMap[idx] ? 'password' : 'text'}
                        placeholder="Value"
                        value={ev.value}
                        onChange={(e) => handleEnvChange(idx, 'value', e.target.value)}
                        className="w-full bg-[#111A2E] border border-[#1E293B] rounded-lg pl-2.5 pr-8 py-1.5 text-slate-200 font-mono text-[11px] outline-none"
                      />
                      {ev.isSecret && (
                        <button
                          type="button"
                          onClick={() => toggleShowSecret(idx)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showSecretMap[idx] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer text-slate-400 hover:text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(ev.isSecret)}
                        onChange={(e) => handleEnvChange(idx, 'isSecret', e.target.checked)}
                        className="rounded border-[#1E293B] bg-[#111A2E] text-blue-500 focus:ring-0"
                      />
                      <span className="text-[10px]">Secret</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveEnvVar(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#18233C] text-slate-300 font-semibold text-xs hover:bg-[#202E4E] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Project...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editProject ? 'Update Project' : 'Save & Configure'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

