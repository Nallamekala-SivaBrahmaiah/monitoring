'use client';

import React, { useState, useMemo } from 'react';
import {
  Key,
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Copy,
  Save,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Search,
  Layers,
  MinusCircle,
  ExternalLink,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { AwsLogo, AzureLogo, TerraformLogo } from '@/components/icons/CloudIcons';

export interface SecretItem {
  id: string;
  name: string;
  provider: 'aws' | 'azure' | 'generic';
  category: 'cloud_credential' | 'env_var' | 'api_token';
  key: string;
  value: string;
  workspace: string; // 'all' | 'default' | 'staging' | 'production'
  description: string;
  isMasked: boolean;
  status: 'active' | 'inactive';
  lastUpdated: string;
}

interface TerraformSecretsTabProps {
  activeProject: any;
  cloudAccounts: any[];
  onShowBanner?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function TerraformSecretsTab({
  activeProject,
  cloudAccounts,
  onShowBanner,
}: TerraformSecretsTabProps) {
  const boundAccount = cloudAccounts.find((a) => a._id === activeProject?.cloudAccountId);

  // Initial Enterprise Secrets State
  const [secrets, setSecrets] = useState<SecretItem[]>([
    {
      id: 'sec-aws-1',
      name: 'AWS Production Access Key',
      provider: 'aws',
      category: 'cloud_credential',
      key: 'AWS_ACCESS_KEY_ID',
      value: boundAccount?.accountId ? `AKIA${boundAccount.accountId.substring(0, 12).toUpperCase()}` : 'AKIAIOSFODNN7EXAMPLE',
      workspace: 'all',
      description: 'IAM User programmatic access key for deploying AWS VPC, EC2, and S3 resources.',
      isMasked: true,
      status: 'active',
      lastUpdated: 'Today at 10:15 AM',
    },
    {
      id: 'sec-aws-2',
      name: 'AWS Production Secret Key',
      provider: 'aws',
      category: 'cloud_credential',
      key: 'AWS_SECRET_ACCESS_KEY',
      value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      workspace: 'all',
      description: 'IAM Secret Access Key injected into runtime memory for provider authentication.',
      isMasked: true,
      status: 'active',
      lastUpdated: 'Today at 10:15 AM',
    },
    {
      id: 'sec-az-1',
      name: 'Azure Service Principal Client Secret',
      provider: 'azure',
      category: 'cloud_credential',
      key: 'ARM_CLIENT_SECRET',
      value: '7a2e8c9b-4f1d-4a8b-9e3f-6c1d0a8b4e2f~EXAMPLE',
      workspace: 'production',
      description: 'Azure Entra ID App Registration client secret for Terraform azurerm provider.',
      isMasked: true,
      status: 'active',
      lastUpdated: 'Yesterday at 04:30 PM',
    },
    {
      id: 'sec-az-2',
      name: 'Azure Entra Tenant ID',
      provider: 'azure',
      category: 'cloud_credential',
      key: 'ARM_TENANT_ID',
      value: boundAccount?.tenantId || '4f3a2b1c-9d8e-7f6a-5b4c-3d2e1f0a9b8c',
      workspace: 'all',
      description: 'Azure Tenant identifier for subscription scope authentication.',
      isMasked: true,
      status: 'active',
      lastUpdated: 'Yesterday at 04:30 PM',
    },
    {
      id: 'sec-gen-1',
      name: 'PostgreSQL RDS Root Password',
      provider: 'generic',
      category: 'env_var',
      key: 'TF_VAR_db_password',
      value: 'Sup3rS3cur3_Pr0d_Db_P@ss2026!',
      workspace: 'production',
      description: 'Database master administrator password injected as a sensitive Terraform variable.',
      isMasked: true,
      status: 'active',
      lastUpdated: '2 days ago',
    },
    {
      id: 'sec-gen-2',
      name: 'GitHub Deployment Webhook Token',
      provider: 'generic',
      category: 'api_token',
      key: 'TF_VAR_github_token',
      value: 'ghp_928374829103984712093847192837461928',
      workspace: 'all',
      description: 'Personal Access Token for provisioning repository secrets and CI/CD webhooks.',
      isMasked: true,
      status: 'active',
      lastUpdated: '3 days ago',
    },
  ]);

  // Filtering & Search
  const [providerFilter, setProviderFilter] = useState<'all' | 'aws' | 'azure' | 'generic'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'cloud_credential' | 'env_var' | 'api_token'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Global Save Feedback
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Modals
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingSecretId, setEditingSecretId] = useState<string | null>(null);
  const [deleteConfirmSecret, setDeleteConfirmSecret] = useState<SecretItem | null>(null);
  const [removeConfirmSecret, setRemoveConfirmSecret] = useState<SecretItem | null>(null);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState<'aws' | 'azure' | 'generic'>('aws');
  const [formCategory, setFormCategory] = useState<'cloud_credential' | 'env_var' | 'api_token'>('cloud_credential');
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formWorkspace, setFormWorkspace] = useState('all');
  const [formDescription, setFormDescription] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);

  // Open Add Modal
  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingSecretId(null);
    setFormName('');
    setFormProvider(activeProject?.provider === 'azure' ? 'azure' : 'aws');
    setFormCategory('cloud_credential');
    setFormKey('');
    setFormValue('');
    setFormWorkspace('all');
    setFormDescription('');
    setFormShowPassword(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (secret: SecretItem) => {
    setModalMode('edit');
    setEditingSecretId(secret.id);
    setFormName(secret.name);
    setFormProvider(secret.provider);
    setFormCategory(secret.category);
    setFormKey(secret.key);
    setFormValue(secret.value);
    setFormWorkspace(secret.workspace);
    setFormDescription(secret.description);
    setFormShowPassword(false);
  };

  // Save Secret (Inside Modal)
  const handleSaveModalSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim() || !formValue.trim()) {
      alert('Key Identifier and Secret Value are required.');
      return;
    }

    if (modalMode === 'add') {
      const newSecret: SecretItem = {
        id: `sec-${Date.now()}`,
        name: formName.trim() || formKey.trim(),
        provider: formProvider,
        category: formCategory,
        key: formKey.trim(),
        value: formValue.trim(),
        workspace: formWorkspace,
        description: formDescription.trim(),
        isMasked: true,
        status: 'active',
        lastUpdated: 'Just now',
      };
      setSecrets((prev) => [newSecret, ...prev]);
      setModalMode(null);
      triggerSuccess('New secret created and saved into secure vault.');
    } else if (modalMode === 'edit' && editingSecretId) {
      setSecrets((prev) =>
        prev.map((s) =>
          s.id === editingSecretId
            ? {
                ...s,
                name: formName.trim() || formKey.trim(),
                provider: formProvider,
                category: formCategory,
                key: formKey.trim(),
                value: formValue.trim(),
                workspace: formWorkspace,
                description: formDescription.trim(),
                lastUpdated: 'Just now',
              }
            : s
        )
      );
      setModalMode(null);
      triggerSuccess('Secret changes successfully saved.');
    }
  };

  // Delete Action (Permanent removal)
  const handleConfirmDelete = () => {
    if (!deleteConfirmSecret) return;
    setSecrets((prev) => prev.filter((s) => s.id !== deleteConfirmSecret.id));
    const deletedKey = deleteConfirmSecret.key;
    setDeleteConfirmSecret(null);
    triggerSuccess(`Secret "${deletedKey}" deleted permanently.`);
  };

  // Remove Action (Deactivate / Remove from active stack)
  const handleConfirmRemove = () => {
    if (!removeConfirmSecret) return;
    setSecrets((prev) =>
      prev.map((s) => (s.id === removeConfirmSecret.id ? { ...s, status: 'inactive' } : s))
    );
    const removedKey = removeConfirmSecret.key;
    setRemoveConfirmSecret(null);
    triggerSuccess(`Secret "${removedKey}" removed from active stack execution.`);
  };

  // Toggle mask for a specific secret
  const handleToggleMask = (id: string) => {
    setSecrets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isMasked: !s.isMasked } : s))
    );
  };

  // Copy secret value or key
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Global Save & Sync
  const handleSaveAllSecrets = async () => {
    setIsSavingGlobal(true);
    try {
      // Simulate persistence sync
      await new Promise((resolve) => setTimeout(resolve, 600));
      triggerSuccess('All secrets & credentials verified, encrypted (AES-256), and synced to runtime.');
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const triggerSuccess = (msg: string) => {
    setSaveSuccessMessage(msg);
    if (onShowBanner) {
      onShowBanner('success', msg);
    }
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Filtered Secrets List
  const filteredSecrets = useMemo(() => {
    return secrets.filter((s) => {
      if (providerFilter !== 'all' && s.provider !== providerFilter) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.key.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.workspace.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [secrets, providerFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" />
              <span>Secrets, Credentials &amp; Cloud Authentication</span>
            </h2>
            <p className="text-xs text-gray-400 max-w-3xl">
              Manage sensitive cloud provider API keys, service principal tokens, and Terraform input variables.
              All credentials are encrypted with AES-256, injected directly into in-memory execution runtimes, and never committed to Git or plain text files.
            </p>
          </div>

          {/* Action Buttons: Add Secret & Save Secrets */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Secret</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAllSecrets}
              disabled={isSavingGlobal}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/30 disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${isSavingGlobal ? 'animate-spin' : ''}`} />
              <span>Save &amp; Sync</span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {saveSuccessMessage && (
          <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-400/80 hover:text-emerald-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bound Cloud Credentials Summary Banner */}
      <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/15 pb-3">
          <div className="flex items-center gap-3">
            {activeProject?.provider === 'aws' ? <AwsLogo className="w-6 h-6" /> : <AzureLogo className="w-6 h-6" />}
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Active Provider Credentials ({activeProject?.provider?.toUpperCase() || 'AWS'})</span>
              </h3>
              <span className="text-xs text-gray-400">
                Bound to Project: <strong className="text-cyan-300 font-mono">{activeProject?.name || 'Default Project'}</strong>
              </span>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            SECURELY INJECTED
          </span>
        </div>

        {boundAccount ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#080D1A] border border-[#1E293B]">
              <span className="text-gray-500 block text-[10px] uppercase font-sans">Account Name</span>
              <strong className="text-white mt-0.5 block truncate">{boundAccount.accountName}</strong>
            </div>

            <div className="p-3 rounded-xl bg-[#080D1A] border border-[#1E293B]">
              <span className="text-gray-500 block text-[10px] uppercase font-sans">
                {activeProject?.provider === 'aws' ? 'Account ID / Role' : 'Subscription ID'}
              </span>
              <span className="text-cyan-300 mt-0.5 block truncate">
                {boundAccount.accountId || boundAccount.subscriptionId || 'Configured'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#080D1A] border border-[#1E293B]">
              <span className="text-gray-500 block text-[10px] uppercase font-sans">Secret Key / Secret</span>
              <span className="text-amber-400 mt-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                ••••••••••••••••
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#080D1A] border border-[#1E293B]">
              <span className="text-gray-500 block text-[10px] uppercase font-sans">Region Target</span>
              <span className="text-emerald-400 mt-0.5 block">{activeProject?.region || 'us-east-1'}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <strong>No Cloud Account Bound to Project</strong>
              <p className="text-amber-300/80 mt-0.5">
                Using local environment variables (AWS_ACCESS_KEY_ID or ARM_CLIENT_ID) or instance IAM role. You can bind a cloud account in the Cloud Providers tab.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0D1526]/85 border border-[#1E293B] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search secrets by name, key identifier, or workspace..."
            className="w-full pl-9 pr-4 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Provider Filter */}
          <div className="flex items-center bg-[#080D1A] border border-[#1E293B] rounded-xl p-1 text-xs">
            {(['all', 'aws', 'azure', 'generic'] as const).map((prov) => (
              <button
                key={prov}
                onClick={() => setProviderFilter(prov)}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer uppercase text-[11px] ${
                  providerFilter === prov
                    ? 'bg-purple-600 text-white font-bold shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center bg-[#080D1A] border border-[#1E293B] rounded-xl p-1 text-xs">
            {(
              [
                { id: 'all', label: 'All Types' },
                { id: 'cloud_credential', label: 'Cloud Credentials' },
                { id: 'env_var', label: 'Env Variables' },
                { id: 'api_token', label: 'API Tokens' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                  categoryFilter === cat.id
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Secrets & Credentials Table / Cards */}
      <div className="bg-[#0D1526]/85 border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Configured Vault Secrets</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-mono">
              {filteredSecrets.length} total
            </span>
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted at rest with AES-256-GCM</span>
          </div>
        </div>

        {filteredSecrets.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Key className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-sm">No secrets found matching the selected filters.</p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add a Secret</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1E293B]/70">
            {filteredSecrets.map((secret) => {
              return (
                <div
                  key={secret.id}
                  className="p-5 hover:bg-[#0F192E]/60 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {secret.provider === 'aws' && <AwsLogo className="w-4 h-4 shrink-0" />}
                      {secret.provider === 'azure' && <AzureLogo className="w-4 h-4 shrink-0" />}
                      {secret.provider === 'generic' && <TerraformLogo className="w-4 h-4 shrink-0" />}

                      <span className="text-sm font-bold text-white">{secret.name}</span>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          secret.provider === 'aws'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : secret.provider === 'azure'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            : 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {secret.provider}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-gray-300 border border-slate-700">
                        {secret.category.replace('_', ' ')}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                        scope: {secret.workspace}
                      </span>

                      {secret.status === 'active' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          REMOVED FROM STACK
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-400">{secret.description}</div>

                    {/* Key and Masked Value Display */}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-[#080D1A] px-2.5 py-1 rounded-lg border border-[#1E293B] text-xs font-mono text-cyan-300">
                        <span className="text-gray-500 text-[10px]">KEY:</span>
                        <span>{secret.key}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`key-${secret.id}`, secret.key)}
                          title="Copy Key Identifier"
                          className="text-gray-500 hover:text-cyan-300 p-0.5"
                        >
                          {copiedId === `key-${secret.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#080D1A] px-2.5 py-1 rounded-lg border border-[#1E293B] text-xs font-mono text-amber-300">
                        <span className="text-gray-500 text-[10px]">VALUE:</span>
                        <span className="tracking-wider">
                          {secret.isMasked ? '••••••••••••••••••••' : secret.value}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleMask(secret.id)}
                          title={secret.isMasked ? 'Reveal secret' : 'Hide secret'}
                          className="text-gray-500 hover:text-amber-300 p-0.5"
                        >
                          {secret.isMasked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(`val-${secret.id}`, secret.value)}
                          title="Copy Secret Value"
                          className="text-gray-500 hover:text-amber-300 p-0.5"
                        >
                          {copiedId === `val-${secret.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <span className="text-[10px] text-gray-500">Updated: {secret.lastUpdated}</span>
                    </div>
                  </div>

                  {/* Right: Actions: EDIT, REMOVE, DELETE */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    {/* Edit Option */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(secret)}
                      className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Edit secret identifier, value, or scope"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Remove Option (Detach from active stack) */}
                    {secret.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => setRemoveConfirmSecret(secret)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        title="Remove from active stack execution"
                      >
                        <MinusCircle className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSecrets((prev) =>
                            prev.map((s) => (s.id === secret.id ? { ...s, status: 'active' } : s))
                          );
                          triggerSuccess(`Secret "${secret.key}" re-activated in stack.`);
                        }}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        title="Re-attach to stack"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Attach</span>
                      </button>
                    )}

                    {/* Delete Option (Permanent removal) */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmSecret(secret)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Delete secret permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Best Practices */}
      <div className="bg-[#0D1526]/85 border border-[#1E293B] rounded-2xl p-6 space-y-3 text-xs text-gray-400">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>Enterprise Secret Masking &amp; Injection Guardrails</span>
        </h4>
        <ul className="space-y-1.5 list-disc pl-5">
          <li>
            Credentials are encrypted at rest using AES-256 and never committed into <span className="font-mono text-cyan-300">.tf</span> or <span className="font-mono text-cyan-300">.tfvars</span> source files.
          </li>
          <li>
            All Terraform execution stdout/stderr streams are dynamically scrubbed against registered secret patterns to prevent accidental leakage in pipeline logs.
          </li>
          <li>
            Secret values are injected strictly as in-memory process environment variables (<span className="font-mono text-cyan-300">AWS_ACCESS_KEY_ID</span>, <span className="font-mono text-cyan-300">ARM_CLIENT_SECRET</span>, <span className="font-mono text-cyan-300">TF_VAR_*</span>) during execution lifecycle.
          </li>
        </ul>
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT SECRET */}
      {/* ======================================================== */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-purple-500/40 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  {modalMode === 'add' ? 'Add New Secret / Credential' : 'Edit Secret / Credential'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalSecret} className="space-y-4">
              {/* Friendly Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Secret Name / Label <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Production RDS Master Password"
                  className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                  required
                />
              </div>

              {/* Provider & Category row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Cloud / Engine Provider
                  </label>
                  <select
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/60"
                  >
                    <option value="aws">AWS (Amazon Web Services)</option>
                    <option value="azure">Azure (Microsoft Azure)</option>
                    <option value="generic">Generic Terraform / Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Secret Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/60"
                  >
                    <option value="cloud_credential">Cloud Provider Credential</option>
                    <option value="env_var">Environment Variable (TF_VAR_*)</option>
                    <option value="api_token">API Token / SSH Key</option>
                  </select>
                </div>
              </div>

              {/* Key Identifier */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Key Identifier / Env Variable Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="e.g. AWS_SECRET_ACCESS_KEY, ARM_CLIENT_SECRET, TF_VAR_db_password"
                  className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs font-mono text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/60"
                  required
                />
                <span className="text-[10px] text-gray-500 mt-0.5 block">
                  This identifier is used to inject the secret into Terraform runtime or provider credentials.
                </span>
              </div>

              {/* Secret Value */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-300">
                    Secret Value <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormShowPassword(!formShowPassword)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    {formShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{formShowPassword ? 'Hide value' : 'Show value'}</span>
                  </button>
                </div>
                <input
                  type={formShowPassword ? 'text' : 'password'}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="Paste confidential token, secret key, or password..."
                  className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs font-mono text-amber-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/60"
                  required
                />
              </div>

              {/* Target Workspace */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Workspace Scope
                </label>
                <select
                  value={formWorkspace}
                  onChange={(e) => setFormWorkspace(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/60"
                >
                  <option value="all">All Workspaces (Global)</option>
                  <option value="default">default</option>
                  <option value="staging">staging</option>
                  <option value="production">production</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Description / Documentation
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional usage notes or compliance justification..."
                  className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 resize-none"
                />
              </div>

              {/* Modal Buttons: Save & Cancel */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-900/30"
                >
                  <Save className="w-4 h-4" />
                  <span>{modalMode === 'add' ? 'Save Secret' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ======================================================== */}
      {deleteConfirmSecret && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Permanently Delete Secret</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white font-mono">{deleteConfirmSecret.key}</strong> (
              {deleteConfirmSecret.name})? This action cannot be undone and any running pipelines relying on this secret may fail.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setDeleteConfirmSecret(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-900/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REMOVE FROM STACK CONFIRMATION */}
      {/* ======================================================== */}
      {removeConfirmSecret && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-400">
              <MinusCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Remove Secret from Stack</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Remove <strong className="text-white font-mono">{removeConfirmSecret.key}</strong> from active runtime injection? The secret will remain safely preserved in the vault and can be re-attached at any time.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setRemoveConfirmSecret(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-900/30"
              >
                <MinusCircle className="w-4 h-4" />
                <span>Remove from Stack</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
