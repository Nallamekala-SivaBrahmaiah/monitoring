'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Layers,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Lock,
} from 'lucide-react';
import { AwsLogo, AzureLogo, TerraformLogo } from '@/components/icons/CloudIcons';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: any) => void;
  cloudAccounts: any[];
  initialTemplateId?: string;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
  cloudAccounts,
  initialTemplateId,
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<'aws' | 'azure'>('aws');
  const [environment, setEnvironment] = useState<'dev' | 'test' | 'staging' | 'production'>('dev');
  const [region, setRegion] = useState('us-east-1');
  const [cloudAccountId, setCloudAccountId] = useState('');
  const [backendType, setBackendType] = useState<'local' | 's3' | 'azurerm'>('local');
  const [backendBucket, setBackendBucket] = useState('');
  const [starterTemplate, setStarterTemplate] = useState('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTemplateId) {
      setStarterTemplate(initialTemplateId);
      if (initialTemplateId.startsWith('azure')) {
        setProvider('azure');
        setRegion('eastus');
      } else if (initialTemplateId.startsWith('aws')) {
        setProvider('aws');
        setRegion('us-east-1');
      }
    }
  }, [initialTemplateId, isOpen]);

  if (!isOpen) return null;

  // Filter accounts by selected provider
  const filteredAccounts = cloudAccounts.filter(
    (acc) => acc.provider?.toLowerCase() === provider.toLowerCase()
  );

  const handleProviderChange = (p: 'aws' | 'azure') => {
    setProvider(p);
    if (p === 'aws') {
      setRegion('us-east-1');
      if (backendType === 'azurerm') setBackendType('local');
    } else {
      setRegion('eastus');
      if (backendType === 's3') setBackendType('local');
    }
    setCloudAccountId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        description: description.trim(),
        provider,
        region,
        environment,
        cloudAccountId: cloudAccountId || undefined,
        backend: {
          type: backendType,
          config: backendType === 's3' 
            ? { bucket: backendBucket, key: `${name}/terraform.tfstate`, region }
            : backendType === 'azurerm'
            ? { container_name: backendBucket || 'tfstate', key: `${name}.terraform.tfstate` }
            : {},
        },
        templateId: starterTemplate !== 'none' ? starterTemplate : undefined,
      };

      const res = await fetch('/api/terraform/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create project');
      }

      onProjectCreated(data.project);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-950/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-[#090F1E]/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <TerraformLogo className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Create Terraform Project
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                  Real HCL Engine
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Initialize an isolated AWS or Azure Terraform infrastructure stack
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cloud Provider Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Select Cloud Target <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleProviderChange('aws')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  provider === 'aws'
                    ? 'border-amber-500/60 bg-amber-500/10 text-white shadow-lg shadow-amber-950/30'
                    : 'border-gray-800 bg-[#0D1526]/60 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                  <AwsLogo className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Amazon Web Services</div>
                  <div className="text-xs text-gray-400">VPC, Subnets, IGW, EC2, S3, RDS</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('azure')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  provider === 'azure'
                    ? 'border-blue-500/60 bg-blue-500/10 text-white shadow-lg shadow-blue-950/30'
                    : 'border-gray-800 bg-[#0D1526]/60 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                  <AzureLogo className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Microsoft Azure</div>
                  <div className="text-xs text-gray-400">VNet, Subnets, Public IP, NIC, NSG, VMs, Blob</div>
                </div>
              </button>
            </div>
          </div>

          {/* Project Name & Environment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Project Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder={provider === 'aws' ? 'aws-prod-vpc-stack' : 'azure-k8s-cluster'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1526] border border-gray-800 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono placeholder:text-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e: any) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D1526] border border-gray-800 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="dev">Dev</option>
                <option value="test">Test</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Primary multi-tier VPC and compute cluster"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0D1526] border border-gray-800 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600"
            />
          </div>

          {/* Cloud Account & Region */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Connected Cloud Account
              </label>
              <select
                value={cloudAccountId}
                onChange={(e) => setCloudAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D1526] border border-gray-800 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Default Host / Env Credentials</option>
                {filteredAccounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name || acc.accountName || acc.email} ({acc.provider})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Injects secure credentials automatically during plan and apply
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Target Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D1526] border border-gray-800 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                {provider === 'aws' ? (
                  <>
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-east-2">us-east-2 (Ohio)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="eu-west-1">eu-west-1 (Ireland)</option>
                    <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                    <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                    <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                  </>
                ) : (
                  <>
                    <option value="eastus">eastus (East US)</option>
                    <option value="eastus2">eastus2 (East US 2)</option>
                    <option value="westus2">westus2 (West US 2)</option>
                    <option value="westeurope">westeurope (West Europe)</option>
                    <option value="centralindia">centralindia (Central India)</option>
                    <option value="southeastasia">southeastasia (Southeast Asia)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Backend Selection */}
          <div className="p-4 rounded-xl bg-[#0D1526]/80 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Terraform State Backend</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBackendType('local')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-colors ${
                    backendType === 'local'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Local
                </button>
                {provider === 'aws' && (
                  <button
                    type="button"
                    onClick={() => setBackendType('s3')}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-colors ${
                      backendType === 's3'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Remote (AWS S3)
                  </button>
                )}
                {provider === 'azure' && (
                  <button
                    type="button"
                    onClick={() => setBackendType('azurerm')}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-colors ${
                      backendType === 'azurerm'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                        : 'border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Remote (Azure Blob)
                  </button>
                )}
              </div>
            </div>

            {backendType !== 'local' && (
              <div>
                <input
                  type="text"
                  placeholder={
                    backendType === 's3'
                      ? 'e.g. my-terraform-state-bucket-unique'
                      : 'e.g. mytfstatecontainer'
                  }
                  value={backendBucket}
                  onChange={(e) => setBackendBucket(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070C18] border border-gray-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Starter Template Option */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Bootstrap with Starter Template</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  starterTemplate === 'none'
                    ? 'border-purple-500/50 bg-purple-500/10 text-white'
                    : 'border-gray-800 bg-[#0D1526]/50 text-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="starter"
                  value="none"
                  checked={starterTemplate === 'none'}
                  onChange={() => setStarterTemplate('none')}
                  className="hidden"
                />
                <span className="font-semibold">Blank Project</span>
              </label>

              {provider === 'aws' ? (
                <>
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors col-span-2 ${
                      starterTemplate === 'aws-fullstack-vpc-ec2-s3'
                        ? 'border-purple-500/50 bg-purple-500/10 text-white shadow-sm'
                        : 'border-gray-800 bg-[#0D1526]/50 text-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starter"
                      value="aws-fullstack-vpc-ec2-s3"
                      checked={starterTemplate === 'aws-fullstack-vpc-ec2-s3'}
                      onChange={() => setStarterTemplate('aws-fullstack-vpc-ec2-s3')}
                      className="hidden"
                    />
                    <div>
                      <span className="font-semibold text-cyan-300">★ Full Stack: VPC + Subnet + IGW + EC2 + S3</span>
                      <p className="text-[10px] text-gray-400">Complete AWS stack with Internet Gateway, Route Tables, Linux VM & S3 Bucket</p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      starterTemplate === 'aws-vpc-complete'
                        ? 'border-purple-500/50 bg-purple-500/10 text-white'
                        : 'border-gray-800 bg-[#0D1526]/50 text-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starter"
                      value="aws-vpc-complete"
                      checked={starterTemplate === 'aws-vpc-complete'}
                      onChange={() => setStarterTemplate('aws-vpc-complete')}
                      className="hidden"
                    />
                    <span className="font-semibold">VPC + Subnets + NAT</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      starterTemplate === 'aws-ec2-complete'
                        ? 'border-purple-500/50 bg-purple-500/10 text-white'
                        : 'border-gray-800 bg-[#0D1526]/50 text-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starter"
                      value="aws-ec2-complete"
                      checked={starterTemplate === 'aws-ec2-complete'}
                      onChange={() => setStarterTemplate('aws-ec2-complete')}
                      className="hidden"
                    />
                    <span className="font-semibold">EC2 + Security Group</span>
                  </label>
                </>
              ) : (
                <>
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors col-span-2 ${
                      starterTemplate === 'azure-fullstack-rg-vnet-vm-storage'
                        ? 'border-purple-500/50 bg-purple-500/10 text-white shadow-sm'
                        : 'border-gray-800 bg-[#0D1526]/50 text-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starter"
                      value="azure-fullstack-rg-vnet-vm-storage"
                      checked={starterTemplate === 'azure-fullstack-rg-vnet-vm-storage'}
                      onChange={() => setStarterTemplate('azure-fullstack-rg-vnet-vm-storage')}
                      className="hidden"
                    />
                    <div>
                      <span className="font-semibold text-cyan-300">★ Full Stack: RG + VNet + Subnet + NSG Assoc + Linux VM + Storage</span>
                      <p className="text-[10px] text-gray-400">Complete Azure stack with Subnet-associated NSG, Public IP, NIC & Blob Storage</p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      starterTemplate === 'azure-vnet-complete'
                        ? 'border-purple-500/50 bg-purple-500/10 text-white'
                        : 'border-gray-800 bg-[#0D1526]/50 text-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starter"
                      value="azure-vnet-complete"
                      checked={starterTemplate === 'azure-vnet-complete'}
                      onChange={() => setStarterTemplate('azure-vnet-complete')}
                      className="hidden"
                    />
                    <span className="font-semibold">VNet + Subnets + NSG</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      starterTemplate === 'azure-vm-complete'
                        ? 'border-purple-500/50 bg-purple-500/10 text-white'
                        : 'border-gray-800 bg-[#0D1526]/50 text-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starter"
                      value="azure-vm-complete"
                      checked={starterTemplate === 'azure-vm-complete'}
                      onChange={() => setStarterTemplate('azure-vm-complete')}
                      className="hidden"
                    />
                    <span className="font-semibold">Ubuntu VM + NIC + Public IP</span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Initializing HCL Project...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Project & Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
