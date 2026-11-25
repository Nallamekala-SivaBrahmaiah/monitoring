'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Check,
  Tag,
  Shield,
  FileCode,
} from 'lucide-react';

interface TerraformVariablesTabProps {
  activeProject: any;
  variables: any[];
  onSaveVariable: (variable: any) => Promise<void>;
  onDeleteVariable: (id: string) => Promise<void>;
}

export function TerraformVariablesTab({
  activeProject,
  variables,
  onSaveVariable,
  onDeleteVariable,
}: TerraformVariablesTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState('string');
  const [category, setCategory] = useState<'terraform' | 'env'>('terraform');
  const [workspace, setWorkspace] = useState('all');
  const [sensitive, setSensitive] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setSaving(true);
    try {
      await onSaveVariable({
        projectId: activeProject?._id,
        workspace,
        key: key.trim(),
        value,
        type,
        category,
        sensitive,
        description,
      });
      setShowAddModal(false);
      setKey('');
      setValue('');
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const tfVars = variables.filter((v) => v.category === 'terraform');
  const envVars = variables.filter((v) => v.category === 'env');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            <span>Terraform &amp; Environment Variables</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure variable overrides for <strong className="text-white font-mono">{activeProject?.name}</strong>. Variables are compiled into terraform.tfvars or injected as environment variables. Sensitive variables are masked and never exposed in logs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Variable</span>
        </button>
      </div>

      {/* Variables Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terraform Variables (tfvars) */}
        <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-purple-500/15 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Terraform Variables (HCL) ({tfVars.length})
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">terraform.tfvars</span>
          </div>

          {tfVars.length > 0 ? (
            <div className="divide-y divide-[#1E293B] text-xs font-mono">
              {tfVars.map((v) => (
                <div key={v._id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-cyan-300">{v.key}</strong>
                      <span className="text-[10px] text-gray-500">({v.type})</span>
                      {v.workspace !== 'all' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300">
                          {v.workspace}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-[11px] block mt-0.5">
                      {v.sensitive ? '••••••••••••' : v.value || '""'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteVariable(v._id)}
                    className="p-1 rounded text-gray-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic py-4 text-center">No Terraform variables added yet.</p>
          )}
        </div>

        {/* Environment Variables */}
        <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-purple-500/15 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Environment Variables ({envVars.length})
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">TF_VAR_* / Process Env</span>
          </div>

          {envVars.length > 0 ? (
            <div className="divide-y divide-[#1E293B] text-xs font-mono">
              {envVars.map((v) => (
                <div key={v._id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-purple-300">{v.key}</strong>
                      {v.sensitive && <Lock className="w-3 h-3 text-amber-400" />}
                    </div>
                    <span className="text-gray-400 text-[11px] block mt-0.5">
                      {v.sensitive ? '••••••••••••' : v.value}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteVariable(v._id)}
                    className="p-1 rounded text-gray-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic py-4 text-center">No Environment variables added yet.</p>
          )}
        </div>
      </div>

      {/* Add Variable Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-purple-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Add Variable</h3>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl p-2 text-white"
                  >
                    <option value="terraform">Terraform Variable (HCL)</option>
                    <option value="env">Environment Variable</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Type:</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl p-2 text-white font-mono"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="list">list</option>
                    <option value="map">map</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Variable Key:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. instance_type or AWS_REGION"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Value:</label>
                <input
                  type={sensitive ? 'password' : 'text'}
                  placeholder="e.g. t3.medium"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl p-2 text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sensCheck"
                  checked={sensitive}
                  onChange={(e) => setSensitive(e.target.checked)}
                />
                <label htmlFor="sensCheck" className="text-gray-300 font-semibold cursor-pointer">
                  Sensitive (Mask value in UI &amp; logs)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs"
                >
                  {saving ? 'Saving...' : 'Save Variable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
