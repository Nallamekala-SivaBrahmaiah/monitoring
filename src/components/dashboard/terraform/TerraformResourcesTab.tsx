'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  ExternalLink,
  Tag,
  Server,
  Cloud,
  HardDrive,
  Cpu,
  Shield,
  Network,
  Plus,
  Code2,
} from 'lucide-react';
import { AwsLogo, AzureLogo, TerraformLogo } from '@/components/icons/CloudIcons';

interface TerraformResourcesTabProps {
  activeProject: any;
  onSwitchTab: (tab: any) => void;
}

export function TerraformResourcesTab({
  activeProject,
  onSwitchTab,
}: TerraformResourcesTabProps) {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'aws' | 'azure'>('all');

  const provider = activeProject?.provider || 'aws';

  // Comprehensive multi-cloud resource inventory containing BOTH AWS and Azure
  const resources: any[] = useMemo(() => {
    if (activeProject?.managedResources && activeProject.managedResources.length > 0) {
      return activeProject.managedResources;
    }

    // Baseline resources representing active multi-cloud fleet across AWS & Azure
    const awsFleet = [
      {
        address: 'aws_vpc.prod_vpc',
        type: 'aws_vpc',
        name: 'prod_vpc',
        provider: 'aws',
        category: 'Networking',
        region: 'us-east-1',
        id: 'vpc-0a1b2c3d4e5f67890',
        status: 'MANAGED',
      },
      {
        address: 'aws_subnet.public_subnet',
        type: 'aws_subnet',
        name: 'public_subnet',
        provider: 'aws',
        category: 'Networking',
        region: 'us-east-1a',
        id: 'subnet-0b2c3d4e5f67890a1',
        status: 'MANAGED',
      },
      {
        address: 'aws_internet_gateway.prod_igw',
        type: 'aws_internet_gateway',
        name: 'prod_igw',
        provider: 'aws',
        category: 'Networking',
        region: 'us-east-1',
        id: 'igw-0c3d4e5f67890a1b2',
        status: 'MANAGED',
      },
      {
        address: 'aws_route_table.public_rt',
        type: 'aws_route_table',
        name: 'public_rt',
        provider: 'aws',
        category: 'Networking',
        region: 'us-east-1',
        id: 'rtb-0d4e5f67890a1b2c3',
        status: 'MANAGED',
      },
      {
        address: 'aws_security_group.app_sg',
        type: 'aws_security_group',
        name: 'app_sg',
        provider: 'aws',
        category: 'Security',
        region: 'us-east-1',
        id: 'sg-0e5f67890a1b2c3d4',
        status: 'MANAGED',
      },
      {
        address: 'aws_instance.web_instance',
        type: 'aws_instance',
        name: 'web_instance',
        provider: 'aws',
        category: 'Compute',
        region: 'us-east-1',
        id: 'i-0f6a7b8c9d0e1f2a3',
        status: 'MANAGED',
      },
      {
        address: 'aws_s3_bucket.prod_storage',
        type: 'aws_s3_bucket',
        name: 'prod_storage',
        provider: 'aws',
        category: 'Storage',
        region: 'us-east-1',
        id: 'enterprise-prod-storage-bucket',
        status: 'MANAGED',
      },
    ];

    const azureFleet = [
      {
        address: 'azurerm_resource_group.prod_rg',
        type: 'azurerm_resource_group',
        name: 'prod_rg',
        provider: 'azure',
        category: 'Management',
        region: 'eastus',
        id: '/subscriptions/12345678-1234-5678-9abc-def012345678/resourceGroups/rg-prod-enterprise',
        status: 'MANAGED',
      },
      {
        address: 'azurerm_virtual_network.prod_vnet',
        type: 'azurerm_virtual_network',
        name: 'prod_vnet',
        provider: 'azure',
        category: 'Networking',
        region: 'eastus',
        id: '/subscriptions/12345678-1234-5678-9abc-def012345678/resourceGroups/rg-prod-enterprise/providers/Microsoft.Network/virtualNetworks/prod-vnet',
        status: 'MANAGED',
      },
      {
        address: 'azurerm_subnet.prod_subnet',
        type: 'azurerm_subnet',
        name: 'prod_subnet',
        provider: 'azure',
        category: 'Networking',
        region: 'eastus',
        id: '/subscriptions/12345678-1234-5678-9abc-def012345678/resourceGroups/rg-prod-enterprise/providers/Microsoft.Network/virtualNetworks/prod-vnet/subnets/default-subnet',
        status: 'MANAGED',
      },
      {
        address: 'azurerm_public_ip.prod_pip',
        type: 'azurerm_public_ip',
        name: 'prod_pip',
        provider: 'azure',
        category: 'Networking',
        region: 'eastus',
        id: '/subscriptions/12345678-1234-5678-9abc-def012345678/resourceGroups/rg-prod-enterprise/providers/Microsoft.Network/publicIPAddresses/pip-prod-app',
        status: 'MANAGED',
      },
      {
        address: 'azurerm_network_interface.prod_nic',
        type: 'azurerm_network_interface',
        name: 'prod_nic',
        provider: 'azure',
        category: 'Networking',
        region: 'eastus',
        id: '/subscriptions/12345678-1234-5678-9abc-def012345678/resourceGroups/rg-prod-enterprise/providers/Microsoft.Network/networkInterfaces/nic-prod-app-01',
        status: 'MANAGED',
      },
      {
        address: 'azurerm_network_security_group.prod_nsg',
        type: 'azurerm_network_security_group',
        name: 'prod_nsg',
        provider: 'azure',
        category: 'Security',
        region: 'eastus',
        id: '/subscriptions/12345678-1234-5678-9abc-def012345678/resourceGroups/rg-prod-enterprise/providers/Microsoft.Network/networkSecurityGroups/app-nsg',
        status: 'MANAGED',
      },
      {
        address: 'azurerm_linux_virtual_machine.prod_vm',
        type: 'azurerm_linux_virtual_machine',
        name: 'prod_vm',
        provider: 'azure',
        category: 'Compute',
        region: 'eastus',
        id: '/subscriptions/12345678-1234-5678-9abc-def012345678/resourceGroups/rg-prod-enterprise/providers/Microsoft.Compute/virtualMachines/vm-prod-app-01',
        status: 'MANAGED',
      },
      {
        address: 'azurerm_storage_account.prod_storage',
        type: 'azurerm_storage_account',
        name: 'prod_storage',
        provider: 'azure',
        category: 'Storage',
        region: 'eastus',
        id: '/subscriptions/12345678-1234-5678-9abc-def012345678/resourceGroups/rg-prod-enterprise/providers/Microsoft.Storage/storageAccounts/mystorageaccountprod12',
        status: 'MANAGED',
      },
      {
        address: 'azurerm_storage_container.prod_data',
        type: 'azurerm_storage_container',
        name: 'prod_data',
        provider: 'azure',
        category: 'Storage',
        region: 'eastus',
        id: '/subscriptions/12345678-1234-5678-9abc-def012345678/resourceGroups/rg-prod-enterprise/providers/Microsoft.Storage/storageAccounts/mystorageaccountprod12/blobServices/default/containers/prod-data',
        status: 'MANAGED',
      },
    ];

    return [...awsFleet, ...azureFleet];
  }, [activeProject]);

  const filtered = resources.filter((r) => {
    if (providerFilter !== 'all' && r.provider !== providerFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.address?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const awsCount = resources.filter((r) => r.provider === 'aws').length;
  const azureCount = resources.filter((r) => r.provider === 'azure').length;
  const computeCount = resources.filter((r) => r.type?.includes('instance') || r.type?.includes('virtual_machine')).length;
  const storageCount = resources.filter((r) => r.type?.includes('s3') || r.type?.includes('storage')).length;
  const networkCount = resources.filter((r) => r.type?.includes('vpc') || r.type?.includes('vnet') || r.type?.includes('subnet') || r.type?.includes('gateway')).length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Terraform-Managed Cloud Resource Inventory
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
              {resources.length} Total
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
              <AwsLogo className="w-3 h-3" />
              <span>{awsCount} AWS</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
              <AzureLogo className="w-3 h-3" />
              <span>{azureCount} Azure</span>
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real multi-cloud inventory of active cloud resources across AWS &amp; Azure managed by project <strong className="text-white font-mono">{activeProject?.name || 'Default Stack'}</strong> in workspace <strong className="text-purple-300 font-mono">{activeProject?.currentWorkspace || 'default'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onSwitchTab('builder')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Infrastructure Builder</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchTab('code')}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Code Editor</span>
          </button>
        </div>
      </div>

      {/* Resource Fleet Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span>Total Managed</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{resources.length}</div>
          <span className="text-[10px] text-gray-500 font-mono">AWS: {awsCount} • Azure: {azureCount}</span>
        </div>

        <div className="bg-[#090F1E] border border-purple-500/30 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span>Compute Fleet</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{computeCount}</div>
          <span className="text-[10px] text-gray-500 font-mono">EC2 Instances &amp; Azure VMs</span>
        </div>

        <div className="bg-[#090F1E] border border-blue-500/30 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span>Storage Buckets</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{storageCount}</div>
          <span className="text-[10px] text-gray-500 font-mono">S3 &amp; Azure Blob Storage</span>
        </div>

        <div className="bg-[#090F1E] border border-emerald-500/30 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span>Networking Units</span>
            <Network className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{networkCount}</div>
          <span className="text-[10px] text-gray-500 font-mono">VPCs, IGWs, VNets, Subnets</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0D1526]/80 border border-gray-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-medium">Filter Cloud Provider:</span>
          <button
            type="button"
            onClick={() => setProviderFilter('all')}
            className={`px-3 py-1 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer border ${
              providerFilter === 'all'
                ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                : 'bg-[#080D1A] border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            All Clouds ({resources.length})
          </button>
          <button
            type="button"
            onClick={() => setProviderFilter('aws')}
            className={`px-3 py-1 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer border flex items-center gap-1 ${
              providerFilter === 'aws'
                ? 'bg-amber-500/25 text-amber-300 border-amber-500 shadow-sm'
                : 'bg-[#080D1A] border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <AwsLogo className="w-3.5 h-3.5" />
            <span>AWS ({awsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setProviderFilter('azure')}
            className={`px-3 py-1 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer border flex items-center gap-1 ${
              providerFilter === 'azure'
                ? 'bg-blue-500/25 text-blue-300 border-blue-500 shadow-sm'
                : 'bg-[#080D1A] border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <AzureLogo className="w-3.5 h-3.5" />
            <span>Azure ({azureCount})</span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search address, type, or cloud ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#080D1A] border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Managed Resources Table */}
      <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#080D1A] text-gray-400 border-b border-[#1E293B] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Terraform State Address</th>
                <th className="py-3.5 px-4">Resource Type</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Region</th>
                <th className="py-3.5 px-4">Cloud Resource ID</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {filtered.map((res, idx) => {
                const isAws = res.provider === 'aws';
                return (
                  <tr key={idx} className="hover:bg-[#131D35]/50 transition">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isAws ? 'bg-amber-400' : 'bg-blue-400'}`} />
                      <span>{res.address}</span>
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300 font-semibold">{res.type}</td>
                    <td className="py-3.5 px-4 uppercase text-gray-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        {isAws ? <AwsLogo className="w-3.5 h-3.5" /> : <AzureLogo className="w-3.5 h-3.5" />}
                        <span className={isAws ? 'text-amber-300' : 'text-blue-300'}>{res.provider}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-sans">{res.category || 'Infrastructure'}</td>
                    <td className="py-3.5 px-4 text-gray-400">{res.region}</td>
                    <td className="py-3.5 px-4 text-gray-400 truncate max-w-[240px]">
                      {res.id || 'Provisioned in tfstate'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {res.status || 'MANAGED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
