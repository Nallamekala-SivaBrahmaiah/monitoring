'use client';

import React, { useState } from 'react';
import {
  Settings,
  Save,
  Check,
  CheckCircle2,
  Shield,
  Layers,
  Terminal,
} from 'lucide-react';

interface TerraformSettingsTabProps {
  settings: any;
  onSaveSettings: (settings: any) => Promise<void>;
}

export function TerraformSettingsTab({
  settings,
  onSaveSettings,
}: TerraformSettingsTabProps) {
  const [defaultProvider, setDefaultProvider] = useState(settings?.defaultProvider || 'aws');
  const [defaultRegion, setDefaultRegion] = useState(settings?.defaultRegion || 'us-east-1');
  const [defaultTerraformVersion, setDefaultTerraformVersion] = useState(settings?.defaultTerraformVersion || '1.14.6');
  const [executionTimeout, setExecutionTimeout] = useState(settings?.executionTimeoutSeconds || 300);
  const [requireProductionApproval, setRequireProductionApproval] = useState(settings?.requireProductionApproval !== false);
  const [enableStateLocking, setEnableStateLocking] = useState(settings?.enableStateLocking !== false);
  const [sensitiveSecretRedaction, setSensitiveSecretRedaction] = useState(settings?.sensitiveSecretRedaction !== false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings({
        defaultProvider,
        defaultRegion,
        defaultTerraformVersion,
        executionTimeoutSeconds: executionTimeout,
        requireProductionApproval,
        enableStateLocking,
        sensitiveSecretRedaction,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl space-y-2">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" />
          <span>Terraform Module Settings &amp; Governance</span>
        </h2>
        <p className="text-xs text-gray-400">
          Global defaults for new Terraform projects, safety guardrails for production environments, state locking, and process timeouts.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl p-6 shadow-xl space-y-5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-300 font-bold block mb-1">Default Cloud Provider:</label>
            <select
              value={defaultProvider}
              onChange={(e) => setDefaultProvider(e.target.value as any)}
              className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl p-2.5 text-white"
            >
              <option value="aws">Amazon Web Services (AWS)</option>
              <option value="azure">Microsoft Azure</option>
            </select>
          </div>

          <div>
            <label className="text-gray-300 font-bold block mb-1">Default Region:</label>
            <input
              type="text"
              value={defaultRegion}
              onChange={(e) => setDefaultRegion(e.target.value)}
              className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-gray-300 font-bold block mb-1">Default Terraform CLI Version:</label>
            <input
              type="text"
              value={defaultTerraformVersion}
              onChange={(e) => setDefaultTerraformVersion(e.target.value)}
              className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-gray-300 font-bold block mb-1">Execution Timeout (Seconds):</label>
            <input
              type="number"
              value={executionTimeout}
              onChange={(e) => setExecutionTimeout(parseInt(e.target.value, 10))}
              className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl p-2.5 text-white font-mono"
            />
          </div>
        </div>

        {/* Checkbox Toggles */}
        <div className="space-y-3 pt-4 border-t border-[#1E293B]">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="reqProdApp"
              checked={requireProductionApproval}
              onChange={(e) => setRequireProductionApproval(e.target.checked)}
              className="cursor-pointer"
            />
            <label htmlFor="reqProdApp" className="text-gray-200 font-semibold cursor-pointer">
              Enforce Production Approval: Require explicit approval before running Apply or Destroy in Production
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enLocking"
              checked={enableStateLocking}
              onChange={(e) => setEnableStateLocking(e.target.checked)}
              className="cursor-pointer"
            />
            <label htmlFor="enLocking" className="text-gray-200 font-semibold cursor-pointer">
              State Locking: Automatically lock workspace during Plan, Apply, and Destroy
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sensRedact"
              checked={sensitiveSecretRedaction}
              onChange={(e) => setSensitiveSecretRedaction(e.target.checked)}
              className="cursor-pointer"
            />
            <label htmlFor="sensRedact" className="text-gray-200 font-semibold cursor-pointer">
              Automatic Secret Masking: Scrub AWS Secret Access Keys and Azure Client Secrets from all console logs
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#1E293B]">
          {saved && (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings successfully saved!</span>
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="ml-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
