'use client';

import React, { useState } from 'react';
import {
  DownloadCloud,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Terminal,
  Zap,
  Check,
  Copy,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface TerraformImportTabProps {
  activeProject: any;
  onExecuteImport: (address: string, id: string) => Promise<any>;
  onSwitchTab: (tab: any) => void;
}

export function TerraformImportTab({
  activeProject,
  onExecuteImport,
  onSwitchTab,
}: TerraformImportTabProps) {
  // Cloud Provider Option: explicitly switchable between AWS and Azure
  const [selectedCloud, setSelectedCloud] = useState<'aws' | 'azure'>(
    activeProject?.provider || 'aws'
  );

  const [resourceType, setResourceType] = useState(
    selectedCloud === 'aws' ? 'aws_instance' : 'azurerm_resource_group'
  );
  const [resourceName, setResourceName] = useState('imported_resource');
  const [resourceId, setResourceId] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const fullAddress = `${resourceType}.${resourceName}`;

  // Handle switching between AWS and Azure Cloud
  const handleSelectCloud = (cloud: 'aws' | 'azure') => {
    setSelectedCloud(cloud);
    if (cloud === 'aws') {
      setResourceType('aws_instance');
      setResourceName('app_server');
      setResourceId('');
    } else {
      setResourceType('azurerm_resource_group');
      setResourceName('app_rg');
      setResourceId('');
    }
    setResult(null);
  };

  const handleImport = async () => {
    if (!resourceId.trim() || !resourceName.trim()) {
      alert('Resource Address and Resource ID are required to run terraform import');
      return;
    }

    setImporting(true);
    try {
      const res = await onExecuteImport(fullAddress, resourceId.trim());
      setResult(res);
    } catch (e: any) {
      setResult({ success: false, error: e.message, logs: e.message });
    } finally {
      setImporting(false);
    }
  };

  // Sample Autofill presets
  const presets = selectedCloud === 'aws'
    ? [
        { label: 'EC2 Instance', type: 'aws_instance', name: 'app_server', id: 'i-0123456789abcdef0' },
        { label: 'S3 Bucket', type: 'aws_s3_bucket', name: 'assets_storage', id: 'enterprise-prod-assets-bucket' },
        { label: 'VPC', type: 'aws_vpc', name: 'main_vpc', id: 'vpc-0123456789abcdef0' },
        { label: 'Subnet', type: 'aws_subnet', name: 'public_sub', id: 'subnet-0123456789abcdef0' },
        { label: 'Security Group', type: 'aws_security_group', name: 'web_sg', id: 'sg-0123456789abcdef0' },
      ]
    : [
        {
          label: 'Resource Group',
          type: 'azurerm_resource_group',
          name: 'prod_rg',
          id: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-prod-enterprise',
        },
        {
          label: 'Linux VM',
          type: 'azurerm_linux_virtual_machine',
          name: 'app_vm',
          id: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/vm-prod-01',
        },
        {
          label: 'Storage Account',
          type: 'azurerm_storage_account',
          name: 'prod_storage',
          id: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-prod/providers/Microsoft.Storage/storageAccounts/mystorageaccount01',
        },
        {
          label: 'Virtual Network',
          type: 'azurerm_virtual_network',
          name: 'prod_vnet',
          id: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod',
        },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl space-y-2">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <DownloadCloud className="w-5 h-5 text-purple-400" />
          <span>Import Existing AWS &amp; Azure Cloud Resources into Terraform</span>
        </h2>
        <p className="text-xs text-gray-400">
          Bring pre-existing cloud infrastructure into Terraform state without destroying or recreating it. Executes official <strong className="text-cyan-300 font-mono">terraform import &lt;ADDRESS&gt; &lt;ID&gt;</strong> and incorporates state records.
        </p>
      </div>

      {/* Cloud Provider Selector (AWS vs Azure) */}
      <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-3">
        <label className="text-xs font-bold text-gray-300 block uppercase tracking-wider">
          Step 1: Select Cloud Provider to Import From
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSelectCloud('aws')}
            className={`p-4 rounded-xl border flex items-center justify-between transition cursor-pointer font-bold ${
              selectedCloud === 'aws'
                ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/40'
                : 'bg-[#0D1526] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <AwsLogo className="w-6 h-6 shrink-0" />
              <div className="text-left">
                <div className="text-sm text-white font-extrabold">Amazon Web Services (AWS)</div>
                <div className="text-[11px] text-gray-400 font-normal">
                  Import EC2 Instances, S3 Buckets, VPCs, Subnets, Security Groups
                </div>
              </div>
            </div>
            {selectedCloud === 'aws' && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectCloud('azure')}
            className={`p-4 rounded-xl border flex items-center justify-between transition cursor-pointer font-bold ${
              selectedCloud === 'azure'
                ? 'bg-blue-500/15 border-blue-500/80 text-blue-300 shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/40'
                : 'bg-[#0D1526] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <AzureLogo className="w-6 h-6 shrink-0" />
              <div className="text-left">
                <div className="text-sm text-white font-extrabold">Microsoft Azure Cloud</div>
                <div className="text-[11px] text-gray-400 font-normal">
                  Import Resource Groups, Linux VMs, Storage Accounts, VNets, Subnets
                </div>
              </div>
            </div>
            {selectedCloud === 'azure' && (
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Import Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-purple-500/15 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Import Parameters: {selectedCloud.toUpperCase()}</span>
            </h3>
            <span className="text-[10px] font-mono text-cyan-400 bg-[#080D1A] px-2 py-0.5 rounded border border-gray-800">
              Stack: {activeProject?.name || 'Default'}
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="text-[11px] font-bold text-gray-400 block mb-1.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Autofill Presets:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setResourceType(p.type);
                    setResourceName(p.name);
                    setResourceId(p.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#080D1A] hover:bg-[#131D35] text-gray-300 hover:text-white border border-gray-800 text-[11px] font-mono transition cursor-pointer"
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-300 font-bold block mb-1">
                {selectedCloud === 'aws' ? 'AWS Resource Type:' : 'Azure Resource Type:'}
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
              >
                {selectedCloud === 'aws' ? (
                  <>
                    <option value="aws_instance">aws_instance (EC2 Instance)</option>
                    <option value="aws_s3_bucket">aws_s3_bucket (S3 Storage Bucket)</option>
                    <option value="aws_vpc">aws_vpc (Virtual Private Cloud)</option>
                    <option value="aws_subnet">aws_subnet (VPC Subnet)</option>
                    <option value="aws_internet_gateway">aws_internet_gateway (Internet Gateway)</option>
                    <option value="aws_security_group">aws_security_group (Security Group)</option>
                    <option value="aws_route_table">aws_route_table (Route Table)</option>
                    <option value="aws_eip">aws_eip (Elastic IP)</option>
                  </>
                ) : (
                  <>
                    <option value="azurerm_resource_group">azurerm_resource_group (Resource Group)</option>
                    <option value="azurerm_virtual_network">azurerm_virtual_network (Virtual Network)</option>
                    <option value="azurerm_subnet">azurerm_subnet (Subnet)</option>
                    <option value="azurerm_linux_virtual_machine">azurerm_linux_virtual_machine (Linux VM)</option>
                    <option value="azurerm_storage_account">azurerm_storage_account (Storage Account)</option>
                    <option value="azurerm_network_security_group">azurerm_network_security_group (NSG)</option>
                    <option value="azurerm_public_ip">azurerm_public_ip (Public IP)</option>
                    <option value="azurerm_network_interface">azurerm_network_interface (NIC)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-gray-300 font-bold block mb-1">Terraform Resource Identifier (HCL Name):</label>
              <input
                type="text"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                placeholder="my_resource"
                className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
              <span className="text-[11px] text-gray-500 font-mono mt-0.5 block">
                Target State Address: <strong className="text-cyan-400">{fullAddress}</strong>
              </span>
            </div>

            <div>
              <label className="text-gray-300 font-bold block mb-1">
                Cloud Resource ID <span className="text-rose-400">*</span>:
              </label>
              <input
                type="text"
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder={
                  selectedCloud === 'aws'
                    ? 'e.g. i-0123456789abcdef0 or my-s3-bucket-name'
                    : 'e.g. /subscriptions/.../resourceGroups/my-rg'
                }
                className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                {selectedCloud === 'aws'
                  ? 'AWS EC2 Instance ID, VPC ID, or S3 Bucket Name'
                  : 'Full Azure Resource ID string (/subscriptions/...)'}
              </span>
            </div>

            {/* Simulated Command Preview */}
            <div className="p-3 rounded-xl bg-[#080D1A] border border-gray-800 text-[11px] font-mono text-gray-400">
              <span className="text-purple-400 font-bold block mb-0.5">Command to Execute:</span>
              <span className="text-cyan-300 font-bold">
                terraform import {fullAddress} {resourceId ? `"${resourceId}"` : '<RESOURCE_ID>'}
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !resourceId.trim() || !resourceName.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25"
              >
                <RotateCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
                <span>{importing ? 'Executing Import...' : 'Run terraform import'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Output Console */}
        <div className="bg-[#080D1A] border border-purple-500/25 rounded-2xl p-5 shadow-xl space-y-2 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b border-purple-500/15 pb-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Import Console Output
              </span>
            </div>

            <pre className="p-3 text-cyan-300 font-mono text-xs max-h-80 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {result?.logs || (importing ? 'Executing terraform import in project workspace...' : 'Ready. Select AWS or Azure, enter Resource ID, and click "Run terraform import".')}
            </pre>
          </div>

          {result?.success && (
            <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Resource Imported into State!</span>
              </span>
              <button
                type="button"
                onClick={() => onSwitchTab('resources')}
                className="text-cyan-300 hover:underline font-semibold"
              >
                View in Resources Tab &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
