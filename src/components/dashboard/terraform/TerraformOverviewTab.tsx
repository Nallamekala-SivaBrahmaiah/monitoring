'use client';

import React from 'react';
import {
  Layers,
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  Terminal,
  FileCode,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { TerraformLogo, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface TerraformOverviewTabProps {
  stats: {
    totalProjects: number;
    awsProjects: number;
    azureProjects: number;
    prodProjects: number;
    successfulRuns: number;
    failedRuns: number;
  };
  activeProject: any;
  projects: any[];
  recentExecutions: any[];
  serverInfo?: {
    installed: boolean;
    version: string;
    binaryPath?: string;
  };
  onSwitchTab: (tab: any) => void;
  onOpenServerModal: () => void;
  onOpenCreateProject: () => void;
}

export function TerraformOverviewTab({
  stats,
  activeProject,
  projects,
  recentExecutions,
  serverInfo,
  onSwitchTab,
  onOpenServerModal,
  onOpenCreateProject,
}: TerraformOverviewTabProps) {
  const terraformVersion = serverInfo?.version || '1.14.6';
  const isInstalled = serverInfo?.installed !== false;

  return (
    <div className="space-y-6">
      {/* 1. TOP HERO SYSTEM STATUS BANNER */}
      <div className="bg-[#0D1526]/90 border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-xl shadow-purple-500/15 shrink-0">
              <TerraformLogo className="w-9 h-9" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Terraform Infrastructure Automation Engine
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  v{terraformVersion}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono flex items-center gap-1.5 ${
                    isInstalled
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isInstalled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  {isInstalled ? 'Core Engine Active' : 'CLI Not Installed'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl">
                Enterprise Infrastructure as Code (IaC) lifecycle controller for Amazon Web Services (AWS) and Microsoft Azure. Manage VPCs, VNets, Subnets, Linux VMs, Security Groups, S3, and Storage Accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenServerModal}
              className="px-4 py-2 bg-[#131D35] hover:bg-[#18233C] text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>Server Installation</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreateProject}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25"
            >
              <span>+ New Project</span>
            </button>
          </div>
        </div>

        {/* Quick specs strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-purple-500/15 text-xs">
          <div>
            <span className="text-gray-400 text-[11px] block">Active Cloud Provider:</span>
            <strong className="text-white font-mono text-xs flex items-center gap-1.5 mt-0.5">
              {activeProject?.provider === 'azure' ? (
                <>
                  <AzureLogo className="w-3.5 h-3.5" />
                  <span>Microsoft Azure</span>
                </>
              ) : (
                <>
                  <AwsLogo className="w-3.5 h-3.5" />
                  <span>Amazon Web Services</span>
                </>
              )}
            </strong>
          </div>

          <div>
            <span className="text-gray-400 text-[11px] block">Active Project:</span>
            <strong className="text-cyan-300 font-mono text-xs mt-0.5 block truncate">
              {activeProject?.name || 'No project selected'}
            </strong>
          </div>

          <div>
            <span className="text-gray-400 text-[11px] block">Workspace &amp; Target Env:</span>
            <span className="text-purple-300 font-mono text-xs mt-0.5 block">
              {activeProject?.currentWorkspace || 'default'} ({activeProject?.environment || 'dev'})
            </span>
          </div>

          <div>
            <span className="text-gray-400 text-[11px] block">Engine Execution Mode:</span>
            <span className="text-emerald-400 font-mono text-xs mt-0.5 block">
              ✓ Local &amp; Remote SSH Enabled
            </span>
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-[#0D1526]/85 border border-purple-500/20 rounded-2xl shadow-lg">
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
            Total Projects
          </span>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {stats.totalProjects || projects.length}
          </div>
          <span className="text-[10px] text-gray-400">AWS &amp; Azure Projects</span>
        </div>

        <div className="p-4 bg-[#0D1526]/85 border border-amber-500/20 rounded-2xl shadow-lg">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
            AWS Projects
          </span>
          <div className="text-2xl font-black font-mono text-amber-300 mt-1">
            {stats.awsProjects || projects.filter((p) => p.provider === 'aws').length}
          </div>
          <span className="text-[10px] text-gray-400">VPC, Subnets, EC2, S3</span>
        </div>

        <div className="p-4 bg-[#0D1526]/85 border border-blue-500/20 rounded-2xl shadow-lg">
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
            Azure Projects
          </span>
          <div className="text-2xl font-black font-mono text-blue-300 mt-1">
            {stats.azureProjects || projects.filter((p) => p.provider === 'azure').length}
          </div>
          <span className="text-[10px] text-gray-400">VNet, Subnets, NSG, VMs, Blob</span>
        </div>

        <div className="p-4 bg-[#0D1526]/85 border border-cyan-500/20 rounded-2xl shadow-lg">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
            Managed Resources
          </span>
          <div className="text-2xl font-black font-mono text-cyan-300 mt-1">
            {activeProject?.managedResourcesCount || 0}
          </div>
          <span className="text-[10px] text-gray-400">In Current State</span>
        </div>

        <div className="p-4 bg-[#0D1526]/85 border border-emerald-500/20 rounded-2xl shadow-lg">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
            Successful Runs
          </span>
          <div className="text-2xl font-black font-mono text-emerald-300 mt-1">
            {stats.successfulRuns || 0}
          </div>
          <span className="text-[10px] text-gray-400">Completed Without Error</span>
        </div>

        <div className="p-4 bg-[#0D1526]/85 border border-rose-500/20 rounded-2xl shadow-lg">
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
            Failed Runs
          </span>
          <div className="text-2xl font-black font-mono text-rose-400 mt-1">
            {stats.failedRuns || 0}
          </div>
          <span className="text-[10px] text-gray-400">Syntax / Cloud Errors</span>
        </div>
      </div>

      {/* 3. ACTIVE PROJECT STATUS & QUICK WORKFLOW LAUNCHER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Project Card */}
        <div className="lg:col-span-2 bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-purple-500/15 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Active Project: {activeProject?.name || 'Default Project'}
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-300 font-mono">
                    {activeProject?.provider || 'AWS'}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">{activeProject?.description || 'No description provided'}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSwitchTab('code')}
                className="px-3 py-1 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Code Editor
              </button>
              <button
                type="button"
                onClick={() => onSwitchTab('builder')}
                className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Resource Builder
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => onSwitchTab('plan')}
              className="p-3 rounded-xl bg-[#080D1A] border border-cyan-500/20 hover:border-cyan-400 text-left transition group cursor-pointer"
            >
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                1. Plan
              </span>
              <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                terraform plan
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Detect infrastructure diff</span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchTab('apply')}
              className="p-3 rounded-xl bg-[#080D1A] border border-emerald-500/20 hover:border-emerald-400 text-left transition group cursor-pointer"
            >
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                2. Apply
              </span>
              <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                terraform apply
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Provision cloud resources</span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchTab('state')}
              className="p-3 rounded-xl bg-[#080D1A] border border-blue-500/20 hover:border-blue-400 text-left transition group cursor-pointer"
            >
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                3. State
              </span>
              <span className="text-xs font-bold text-white group-hover:text-blue-300 transition">
                State &amp; Lock
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Inspect tfstate &amp; backend</span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchTab('resources')}
              className="p-3 rounded-xl bg-[#080D1A] border border-purple-500/20 hover:border-purple-400 text-left transition group cursor-pointer"
            >
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                4. Resources
              </span>
              <span className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                Managed Resources
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Explore cloud fleet</span>
            </button>
          </div>

          {/* Project files overview */}
          <div className="bg-[#080D1A] rounded-xl p-3 border border-purple-500/15">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Project Configuration Files ({activeProject?.files?.length || 3} Files)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {activeProject?.files && activeProject.files.length > 0 ? (
                activeProject.files.map((f: any) => (
                  <span
                    key={f.name}
                    className="px-2.5 py-1 rounded-lg bg-[#0D1526] border border-cyan-500/20 text-cyan-300 text-xs font-mono font-medium flex items-center gap-1.5"
                  >
                    <FileCode className="w-3 h-3 text-purple-400" />
                    <span>{f.name}</span>
                  </span>
                ))
              ) : (
                ['main.tf', 'variables.tf', 'outputs.tf'].map((name) => (
                  <span
                    key={name}
                    className="px-2.5 py-1 rounded-lg bg-[#0D1526] border border-cyan-500/20 text-cyan-300 text-xs font-mono font-medium"
                  >
                    {name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Templates & Quick Generator */}
        <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl space-y-3.5 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Production Templates</span>
            </h3>
            <p className="text-[11px] text-gray-400">
              One-click scaffold for production AWS and Azure infrastructure.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { name: 'AWS HA VPC & Subnets', provider: 'aws', icon: AwsLogo },
              { name: 'AWS Hardened EC2 & SG', provider: 'aws', icon: AwsLogo },
              { name: 'Azure Resource Group & VNet', provider: 'azure', icon: AzureLogo },
              { name: 'Azure Linux VM & Public IP', provider: 'azure', icon: AzureLogo },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.name}
                  onClick={() => onSwitchTab('builder')}
                  className="p-2.5 rounded-xl bg-[#080D1A] border border-purple-500/15 hover:border-purple-400/40 text-xs flex items-center justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-medium text-gray-200 group-hover:text-white transition">
                      {t.name}
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-500 group-hover:text-cyan-400 transition" />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onSwitchTab('builder')}
            className="w-full py-2 bg-[#131D35] hover:bg-[#18233C] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition text-center cursor-pointer"
          >
            Browse In Infrastructure Builder &rarr;
          </button>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY TIMELINE */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/15 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Recent Terraform Execution Timeline</h3>
          </div>
          <button
            type="button"
            onClick={() => onSwitchTab('code')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
          >
            Open Execution Console &rarr;
          </button>
        </div>

        <div className="space-y-2">
          {recentExecutions && recentExecutions.length > 0 ? (
            recentExecutions.slice(0, 5).map((ex: any) => {
              const isSuccess = ex.status === 'successful';
              return (
                <div
                  key={ex._id}
                  className="p-3 rounded-xl bg-[#080D1A] border border-purple-500/15 hover:border-purple-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        isSuccess
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {ex.status}
                    </span>

                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300">
                      terraform {ex.operation}
                    </span>

                    <span className="font-bold text-white">{ex.projectName}</span>
                    <span className="text-[11px] text-gray-400 font-mono">[{ex.workspace || 'default'}]</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span>Duration: {(ex.durationMs / 1000).toFixed(1)}s</span>
                    <span>•</span>
                    <span>{new Date(ex.startedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 rounded-xl bg-[#080D1A] border border-slate-800 text-center text-gray-400 text-xs">
              <Terminal className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-300">No Terraform executions yet</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Select a project and click "Run Plan" or "Run Apply" to execute Terraform commands.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
