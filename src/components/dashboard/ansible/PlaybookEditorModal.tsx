'use client';

import React, { useState, useEffect } from 'react';
import { X, FileCode, Check, Upload, Copy, CheckCheck } from 'lucide-react';
import { IAnsiblePlaybookData } from '@/models/AnsiblePlaybook';
import { ANSIBLE_TEMPLATES } from '@/lib/ansible/ansibleTemplates';

interface PlaybookEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingPlaybook?: IAnsiblePlaybookData | null;
}

export function PlaybookEditorModal({
  isOpen,
  onClose,
  onSaved,
  editingPlaybook,
}: PlaybookEditorModalProps) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [defaultExtraVars, setDefaultExtraVars] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (editingPlaybook) {
      setName(editingPlaybook.name);
      setTitle(editingPlaybook.title || editingPlaybook.name);
      setDescription(editingPlaybook.description || '');
      setCategory(editingPlaybook.category || 'General');
      setContent(editingPlaybook.content || '');
      setDefaultExtraVars(editingPlaybook.defaultExtraVars || '');
    } else {
      setName('custom_playbook.yml');
      setTitle('Custom Ansible Playbook');
      setDescription('');
      setCategory('General');
      setContent(`---\n- name: Custom Playbook\n  hosts: all\n  become: yes\n\n  tasks:\n    - name: Ping test\n      ping:\n`);
      setDefaultExtraVars('');
    }
    setError(null);
  }, [editingPlaybook, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setName(file.name);
    setTitle(file.name.replace(/\.(yml|yaml)$/i, '').replace(/_/g, ' '));

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setContent(text);
      }
    };
    reader.readAsText(file);
  };

  const handleSelectTemplate = (templateName: string) => {
    const found = ANSIBLE_TEMPLATES.find((t) => t.name === templateName);
    if (found) {
      setName(found.name);
      setTitle(found.title);
      setDescription(found.description);
      setCategory(found.category);
      setContent(found.content);
      setDefaultExtraVars(found.defaultExtraVars || '');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !content.trim()) {
      setError('Name and YAML content are required.');
      return;
    }

    setLoading(true);
    try {
      const url = editingPlaybook?._id
        ? `/api/ansible/playbooks/${editingPlaybook._id}`
        : '/api/ansible/playbooks';
      const method = editingPlaybook?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          content: content.trim(),
          defaultExtraVars: defaultExtraVars.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save playbook');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving playbook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-2xl p-6 text-slate-100 my-8">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingPlaybook ? 'Edit Ansible Playbook' : 'Create / Upload Playbook'}
              </h2>
              <p className="text-xs text-slate-400">Configure Ansible automation tasks and variables</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Template Picker & File Upload */}
        {!editingPlaybook && (
          <div className="mb-4 p-3 rounded-xl bg-[#111A2E] border border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Load Template:</span>
              <select
                onChange={(e) => handleSelectTemplate(e.target.value)}
                defaultValue=""
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="" disabled>
                  Select a pre-built template...
                </option>
                {ANSIBLE_TEMPLATES.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.title})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload YAML File</span>
              <input
                type="file"
                accept=".yml,.yaml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                File Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Display Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Package Management">Package Management</option>
                <option value="Containers & DevOps">Containers & DevOps</option>
                <option value="Web Server">Web Server</option>
                <option value="Deployment">Deployment</option>
                <option value="System Maintenance">System Maintenance</option>
                <option value="System Configuration">System Configuration</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <input
              type="text"
              placeholder="Brief description of what this playbook automates"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* YAML Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Playbook YAML Content <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy YAML'}</span>
              </button>
            </div>
            <textarea
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-[#0B1120] border border-slate-800 rounded-xl text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-purple-500 transition"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Default Extra Variables (Optional JSON or key=val)
            </label>
            <input
              type="text"
              placeholder='e.g. {"app_port": 8080}'
              value={defaultExtraVars}
              onChange={(e) => setDefaultExtraVars(e.target.value)}
              className="w-full px-3 py-2 bg-[#1E293B]/80 border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingPlaybook ? 'Save Changes' : 'Create Playbook'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

