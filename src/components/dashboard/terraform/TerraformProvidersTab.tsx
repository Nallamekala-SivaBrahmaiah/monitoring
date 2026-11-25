'use client';

import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Key,
  Shield,
  Layers,
  ExternalLink,
  Plus,
  RefreshCw,
  Server,
} from 'lucide-react';
import { AwsLogo, AzureLogo, TerraformLogo } from '@/components/icons/CloudIcons';

interface TerraformProvidersTabProps {
  activeProject: any;
  cloudAccounts: any[];
  onSelectProvider: (provider: 'aws' | 'azure') => void;
  onSelectAccount: (accountId: string) => void;
}

export function TerraformProvidersTab({
  activeProject,
  cloudAccounts,
  onSelectProvider,
  onSelectAccount,
}: TerraformProvidersTabProps) {
  const [selectedProvider, setSelectedProvider] = useState<'aws' | 'azure'>(
    activeProject?.provider || 'aws'
  );

  const awsAccounts = cloudAccounts.filter((a) => a.provider === 'aws');
  const azureAccounts = cloudAccounts.filter((a) => a.provider === 'azure');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl space-y-2">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Cloud className="w-5 h-5 text-purple-400" />
          <span>Cloud Provider Configuration &amp; Authentication</span>
        </h2>
        <p className="text-xs text-gray-400">
          Configure official HashiCorp AWS and Azure provider blocks. Automatically binds connected cloud credentials to Terraform executions without exposing secret keys in code or source repositories.
        </p>
      </div>

      {/* Provider Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* AWS Provider Card */}
        <div
          onClick={() => {
            setSelectedProvider('aws');
            onSelectProvider('aws');
          }}
          className={`p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            selectedProvider === 'aws'
              ? 'bg-[#0D1526] border-amber-500/60 shadow-xl shadow-amber-500/10'
              : 'bg-[#0D1526]/70 border-[#1E293B] hover:border-amber-500/30'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <AwsLogo className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Amazon Web Services (AWS)</h3>
                  <span className="text-xs text-amber-400 font-mono">hashicorp/aws (~&gt; 5.0)</span>
                </div>
              </div>
              {selectedProvider === 'aws' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  ACTIVE PROVIDER
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Full support for VPC, Subnets, EC2, Application Load Balancers, S3 Buckets, EKS Clusters, RDS Databases, Security Groups, IAM Roles, and CloudWatch.
            </p>

            <div className="space-y-2 pt-2 border-t border-[#1E293B]">
              <span className="text-[11px] font-bold text-gray-300 block">Connected AWS Accounts ({awsAccounts.length}):</span>
              {awsAccounts.length > 0 ? (
                <div className="space-y-1.5">
                  {awsAccounts.map((acc) => (
                    <div
                      key={acc._id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAccount(acc._id);
                      }}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                        activeProject?.cloudAccountId === acc._id
                          ? 'bg-amber-500/15 border-amber-500/50 text-white'
                          : 'bg-[#080D1A] border-[#1E293B] text-gray-300 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold">{acc.accountName}</span>
                        {acc.accountId && <span className="text-[10px] text-gray-500 font-mono">({acc.accountId})</span>}
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase">
                        {activeProject?.cloudAccountId === acc._id ? 'BOUND' : 'SELECT'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No AWS accounts connected yet in Cloud Accounts module.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#1E293B] text-[11px] text-gray-400 flex items-center justify-between">
            <span>Auth: IAM Role / Access Keys</span>
            <span className="text-amber-400 font-mono font-bold">AWS_DEFAULT_REGION</span>
          </div>
        </div>

        {/* Azure Provider Card */}
        <div
          onClick={() => {
            setSelectedProvider('azure');
            onSelectProvider('azure');
          }}
          className={`p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            selectedProvider === 'azure'
              ? 'bg-[#0D1526] border-blue-500/60 shadow-xl shadow-blue-500/10'
              : 'bg-[#0D1526]/70 border-[#1E293B] hover:border-blue-500/30'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <AzureLogo className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Microsoft Azure</h3>
                  <span className="text-xs text-blue-400 font-mono">hashicorp/azurerm (~&gt; 3.0)</span>
                </div>
              </div>
              {selectedProvider === 'azure' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                  ACTIVE PROVIDER
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Full support for Resource Groups, Virtual Networks (VNet), Subnets, Linux/Windows Virtual Machines, Azure Kubernetes Service (AKS), Storage Accounts, Blobs, NSGs, and App Services.
            </p>

            <div className="space-y-2 pt-2 border-t border-[#1E293B]">
              <span className="text-[11px] font-bold text-gray-300 block">Connected Azure Accounts ({azureAccounts.length}):</span>
              {azureAccounts.length > 0 ? (
                <div className="space-y-1.5">
                  {azureAccounts.map((acc) => (
                    <div
                      key={acc._id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAccount(acc._id);
                      }}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                        activeProject?.cloudAccountId === acc._id
                          ? 'bg-blue-500/15 border-blue-500/50 text-white'
                          : 'bg-[#080D1A] border-[#1E293B] text-gray-300 hover:border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold">{acc.accountName}</span>
                        {acc.subscriptionId && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            ({acc.subscriptionId.substring(0, 13)}...)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase">
                        {activeProject?.cloudAccountId === acc._id ? 'BOUND' : 'SELECT'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No Azure subscriptions connected yet in Cloud Accounts module.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#1E293B] text-[11px] text-gray-400 flex items-center justify-between">
            <span>Auth: Service Principal (SPN)</span>
            <span className="text-blue-400 font-mono font-bold">ARM_SUBSCRIPTION_ID</span>
          </div>
        </div>
      </div>

      {/* Generated Provider HCL Preview */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Standard Provider HCL Block ({selectedProvider.toUpperCase()})
        </h3>
        <pre className="p-4 rounded-xl bg-[#080D1A] border border-[#1E293B] text-xs font-mono text-gray-200 leading-relaxed overflow-x-auto">
          {selectedProvider === 'aws'
            ? `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region # e.g. "us-east-1"
  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "Terraform Automation"
    }
  }
}`
            : `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}`}
        </pre>
      </div>
    </div>
  );
}
