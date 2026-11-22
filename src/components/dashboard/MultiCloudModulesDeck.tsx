'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Layers,
  Terminal,
  ExternalLink,
  Zap,
  RotateCw,
  Server,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  HardDrive,
  Network,
} from 'lucide-react';
import { SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { useMonitoring } from '@/context/MonitoringContext';
import { ModuleCustomizeButton } from '@/components/dashboard/style-studio/ModuleCustomizeButton';

interface MultiCloudModulesDeckProps {
  onOpenTerminal?: (target: SSHTerminalTarget) => void;
}

export function MultiCloudModulesDeck({ onOpenTerminal }: MultiCloudModulesDeckProps) {
  const {
    filteredDockerContainers,
    filteredK8sClusters,
    filteredK8sPods,
    filteredAzureVMs,
    filteredEC2Instances,
  } = useMonitoring();

  const [activeHoverModule, setActiveHoverModule] = useState<string | null>(null);

  // Total server count
  const totalServers = (filteredAzureVMs.length || 2) + (filteredEC2Instances.length || 2);
  const totalContainers = filteredDockerContainers.length > 0 ? filteredDockerContainers.length : 4;
  const totalK8sClusters = filteredK8sClusters.length > 0 ? filteredK8sClusters.length : 2;
  const totalK8sPods = filteredK8sPods.length > 0 ? filteredK8sPods.length : 18;

  const handleLaunchPutty = (serverType: 'azure' | 'aws' | 'default') => {
    if (!onOpenTerminal) return;
    if (serverType === 'aws') {
      onOpenTerminal({
        name: 'web01',
        host: '15.135.74.255',
        port: 22,
        username: 'ubuntu',
        cloudProvider: 'aws',
        region: 'ap-southeast-1',
      });
    } else {
      onOpenTerminal({
        name: 'vm01siva-mon',
        host: '4.240.105.247',
        port: 22,
        username: 'siva',
        cloudProvider: 'azure',
        region: 'centralindia',
      });
    }
  };

  return (
    <div className="bg-[#0B1120] border border-[#162238] hover:border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all duration-300 flex flex-col justify-between h-full">
      {/* Background Hologram Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none"></div>

      {/* Top Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#162238]">
        <div className="flex items-center gap-3">
          {/* Animated 3D Pulse Core Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/10 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                Multi-Cloud Operations Matrix
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                6 Modules
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Interactive 3D telemetry and instant controls for all application engines
            </p>
          </div>
        </div>

        {/* Actions & 100% Operational Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <ModuleCustomizeButton
            moduleId="operations-matrix"
            moduleName="Operations Matrix"
            variant="pill"
          />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>100% Operational</span>
          </div>
        </div>
      </div>

      {/* 6-Module 3D Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-3.5 flex-1">

        {/* ------------------------------------------------------------ */}
        {/* MODULE 1: DOCKER CONTAINER ENGINE                            */}
        {/* ------------------------------------------------------------ */}
        <div
          onMouseEnter={() => setActiveHoverModule('docker')}
          onMouseLeave={() => setActiveHoverModule(null)}
          className="group relative bg-[#0E1628]/90 hover:bg-[#111A2E] border border-[#1E293B] hover:border-sky-500/50 rounded-xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/10 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2.5">
            {/* 3D Floating Isometric Cube */}
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center relative shadow-inner group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="rgba(56, 189, 248, 0.15)"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#0E1628] animate-ping"></span>
            </div>

            <div className="flex items-center gap-1.5">
              <ModuleCustomizeButton
                moduleId="docker-containers"
                moduleName="Docker Engine"
                variant="icon"
                title="Customize Docker Engine Appearance"
              />
              <div className="text-right">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Docker</span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">v29.1.3 Active</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                Container Engine
              </span>
              <span className="text-[11px] font-mono font-bold text-sky-400">
                {totalContainers} Containers
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
              Docker runtime active across registered hosts
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#1E293B]/70">
            <Link
              href="/dashboard/docker"
              className="flex-1 py-1.5 px-2 rounded-lg bg-sky-600/80 hover:bg-sky-500 text-white font-bold text-[11px] text-center transition shadow-sm"
            >
              Containers
            </Link>
            <button
              type="button"
              onClick={() => handleLaunchPutty('azure')}
              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] transition border border-slate-700 cursor-pointer"
              title="Launch PuTTY SSH Terminal"
            >
              PuTTY
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* MODULE 2: KUBERNETES CLUSTER ORCHESTRATOR                    */}
        {/* ------------------------------------------------------------ */}
        <div
          onMouseEnter={() => setActiveHoverModule('k8s')}
          onMouseLeave={() => setActiveHoverModule(null)}
          className="group relative bg-[#0E1628]/90 hover:bg-[#111A2E] border border-[#1E293B] hover:border-blue-500/50 rounded-xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2.5">
            {/* 3D Spinning Orbital Rings */}
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center relative shadow-inner group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-blue-400 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
                <polygon points="12 2 15 8 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 8 12 2" fill="rgba(59, 130, 246, 0.2)"/>
              </svg>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-400 rounded-full border border-[#0E1628] animate-pulse"></span>
            </div>

            <div className="flex items-center gap-1.5">
              <ModuleCustomizeButton
                moduleId="k8s-clusters"
                moduleName="Kubernetes Mesh"
                variant="icon"
                title="Customize Kubernetes Appearance"
              />
              <div className="text-right">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Kubernetes</span>
                <span className="text-[10px] font-mono text-blue-300 font-semibold">kubectl Armed</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                Cluster Mesh
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-400">
                {totalK8sClusters} Clusters • {totalK8sPods} Pods
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
              Azure AKS & AWS EKS microservices orchestration
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#1E293B]/70">
            <Link
              href="/dashboard/kubernetes"
              className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white font-bold text-[11px] text-center transition shadow-sm"
            >
              Kubernetes
            </Link>
            <Link
              href="/dashboard/kubernetes"
              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] transition border border-slate-700"
              title="Kubernetes Tools (az, aws, eksctl, kubectl)"
            >
              Tools
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* MODULE 3: NGINX REVERSE PROXY & EDGE                         */}
        {/* ------------------------------------------------------------ */}
        <div
          onMouseEnter={() => setActiveHoverModule('nginx')}
          onMouseLeave={() => setActiveHoverModule(null)}
          className="group relative bg-[#0E1628]/90 hover:bg-[#111A2E] border border-[#1E293B] hover:border-emerald-500/50 rounded-xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2.5">
            {/* 3D Glowing Gateway Arch */}
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative shadow-inner group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-emerald-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="rgba(16, 185, 129, 0.2)"/>
              </svg>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#0E1628] animate-ping"></span>
            </div>

            <div className="flex items-center gap-1.5">
              <ModuleCustomizeButton
                moduleId="nginx"
                moduleName="Nginx Gateway"
                variant="icon"
                title="Customize Nginx Appearance"
              />
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Nginx</span>
                <span className="text-[10px] font-mono text-emerald-300 font-semibold">240 req/s</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Edge Gateway
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                SSL: 74d Left
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
              Reverse proxy routing & SSL auto-renewal
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#1E293B]/70">
            <Link
              href="/dashboard/nginx"
              className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-[11px] text-center transition shadow-sm"
            >
              Nginx Proxy
            </Link>
            <Link
              href="/dashboard/nginx"
              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] transition border border-slate-700"
              title="Test Nginx configuration"
            >
              Test
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* MODULE 4: APACHE MAVEN ENGINE                                */}
        {/* ------------------------------------------------------------ */}
        <div
          onMouseEnter={() => setActiveHoverModule('maven')}
          onMouseLeave={() => setActiveHoverModule(null)}
          className="group relative bg-[#0E1628]/90 hover:bg-[#111A2E] border border-[#1E293B] hover:border-amber-500/50 rounded-xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/10 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2.5">
            {/* 3D Spinning Cogwheel */}
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center relative shadow-inner group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="rgba(245, 158, 11, 0.15)"/>
              </svg>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-[#0E1628] animate-pulse"></span>
            </div>

            <div className="flex items-center gap-1.5">
              <ModuleCustomizeButton
                moduleId="maven"
                moduleName="Maven Engine"
                variant="icon"
                title="Customize Maven Appearance"
              />
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Maven</span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">12 JARs Built</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Java Build System
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-400">
                0 Failures
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
              Spring Boot & Java compilation and POM packaging
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#1E293B]/70">
            <Link
              href="/dashboard/maven"
              className="flex-1 py-1.5 px-2 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-bold text-[11px] text-center transition shadow-sm"
            >
              Builds
            </Link>
            <Link
              href="/dashboard/maven"
              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] transition border border-slate-700"
              title="Clean Package"
            >
              Package
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* MODULE 5: ANSIBLE INFRASTRUCTURE AUTOMATION                 */}
        {/* ------------------------------------------------------------ */}
        <div
          onMouseEnter={() => setActiveHoverModule('ansible')}
          onMouseLeave={() => setActiveHoverModule(null)}
          className="group relative bg-[#0E1628]/90 hover:bg-[#111A2E] border border-[#1E293B] hover:border-purple-500/50 rounded-xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2.5">
            {/* 3D Pulsing Circuit Node */}
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center relative shadow-inner group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" fill="rgba(168, 85, 247, 0.15)"/>
                <path d="M12 6l5 12h-3l-2-5-2 5H7l5-12z" fill="currentColor"/>
              </svg>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-full border border-[#0E1628] animate-ping"></span>
            </div>

            <div className="flex items-center gap-1.5">
              <ModuleCustomizeButton
                moduleId="ansible"
                moduleName="Ansible Engine"
                variant="icon"
                title="Customize Ansible Appearance"
              />
              <div className="text-right">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Ansible</span>
                <span className="text-[10px] font-mono text-purple-300 font-semibold">8 Playbooks</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                Automation Engine
              </span>
              <span className="text-[11px] font-mono font-bold text-purple-400">
                4 Hosts Synced
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
              Automated provisioning, hardening & configuration
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#1E293B]/70">
            <Link
              href="/dashboard/ansible"
              className="flex-1 py-1.5 px-2 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-[11px] text-center transition shadow-sm"
            >
              Playbooks
            </Link>
            <Link
              href="/dashboard/ansible"
              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] transition border border-slate-700"
              title="Execute Playbook"
            >
              Run
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* MODULE 6: MULTI-CLOUD SERVER FLEET (AWS & AZURE)             */}
        {/* ------------------------------------------------------------ */}
        <div
          onMouseEnter={() => setActiveHoverModule('servers')}
          onMouseLeave={() => setActiveHoverModule(null)}
          className="group relative bg-[#0E1628]/90 hover:bg-[#111A2E] border border-[#1E293B] hover:border-cyan-500/50 rounded-xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2.5">
            {/* 3D Dual Server Tower */}
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center relative shadow-inner group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="2" width="20" height="8" rx="2" fill="rgba(6, 182, 212, 0.2)"/>
                <rect x="2" y="14" width="20" height="8" rx="2" fill="rgba(6, 182, 212, 0.2)"/>
                <line x1="6" y1="6" x2="6.01" y2="6"/>
                <line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#0E1628] animate-ping"></span>
            </div>

            <div className="flex items-center gap-1.5">
              <ModuleCustomizeButton
                moduleId="servers"
                moduleName="Fleet Servers"
                variant="icon"
                title="Customize Fleet Servers Appearance"
              />
              <div className="text-right">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Fleet Servers</span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">18ms / 36ms</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                Azure & AWS Fleet
              </span>
              <span className="text-[11px] font-mono font-bold text-cyan-400">
                {totalServers} Nodes Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
              Azure Central India + AWS AP-Southeast nodes
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#1E293B]/70">
            <Link
              href="/dashboard/servers"
              className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold text-[11px] text-center transition shadow-sm"
            >
              All Servers
            </Link>
            <button
              type="button"
              onClick={() => handleLaunchPutty('default')}
              className="py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition border border-blue-500 cursor-pointer shadow-sm"
              title="Launch PuTTY SSH Terminal"
            >
              PuTTY
            </button>
          </div>
        </div>

      </div>

      {/* Footer Info Strip */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#162238] text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Multi-cloud telemetry stream synchronized</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/docker" className="hover:text-cyan-400 transition">Docker</Link>
          <span className="text-slate-600">•</span>
          <Link href="/dashboard/kubernetes" className="hover:text-blue-400 transition">Kubernetes</Link>
          <span className="text-slate-600">•</span>
          <Link href="/dashboard/nginx" className="hover:text-emerald-400 transition">Nginx</Link>
          <span className="text-slate-600">•</span>
          <Link href="/dashboard/maven" className="hover:text-amber-400 transition">Maven</Link>
          <span className="text-slate-600">•</span>
          <Link href="/dashboard/ansible" className="hover:text-purple-400 transition">Ansible</Link>
          <span className="text-slate-600">•</span>
          <Link href="/dashboard/servers" className="hover:text-cyan-400 transition">Servers</Link>
        </div>
      </div>
    </div>
  );
}
