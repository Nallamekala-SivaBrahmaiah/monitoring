'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  RotateCw,
  Boxes,
  Layers,
  Terminal,
  Activity,
  Tag,
  HardDrive,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { DockerIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';
import { DockerContainer } from '@/types/monitoring';

interface DockerImageItem {
  id: string;
  imageId: string;
  shortId: string;
  repository: string;
  tag: string;
  fullTag: string;
  hostInstance: string;
  cloudProvider: 'aws' | 'azure';
  region: string;
  size: string;
  sizeBytes: number;
  activeContainers: number;
  created: string;
}

export default function DockerPage() {
  const {
    cloudProvider,
    filteredDockerContainers,
    triggerRefresh,
    isRefreshing,
    syncNow,
    isSyncing,
  } = useMonitoring();

  const [activeTab, setActiveTab] = useState<'containers' | 'images'>('containers');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [images, setImages] = useState<DockerImageItem[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    async function loadImages() {
      try {
        setLoadingImages(true);
        const res = await fetch('/api/docker/images');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setImages(data);
        }
      } catch (e) {
        console.warn('Failed to load docker images:', e);
      } finally {
        setLoadingImages(false);
      }
    }
    loadImages();
  }, [filteredDockerContainers]);

  const containers = useMemo(() => {
    return filteredDockerContainers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.image.toLowerCase().includes(search.toLowerCase()) ||
        c.hostInstance.toLowerCase().includes(search.toLowerCase()) ||
        c.containerId.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ||
        c.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [filteredDockerContainers, search, statusFilter]);

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (cloudProvider === 'aws' && img.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && img.cloudProvider !== 'azure') return false;

      const q = search.toLowerCase();
      return (
        img.repository.toLowerCase().includes(q) ||
        img.tag.toLowerCase().includes(q) ||
        img.hostInstance.toLowerCase().includes(q) ||
        img.shortId.toLowerCase().includes(q)
      );
    });
  }, [images, cloudProvider, search]);

  const runningCount = containers.filter((c) => c.status === 'Running').length;
  const stoppedCount = containers.filter((c) => c.status === 'Stopped').length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link href="/" className="hover:text-blue-400 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
                <span>/</span>
                <span className="text-white">Docker Observability</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <DockerIcon className="w-6 h-6 text-blue-400" />
                <span>Docker Containers & Images Observability</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs bg-[#111A2E] border border-[#1E293B] px-3 py-1.5 rounded-lg">
                <span className="text-emerald-400 font-bold">{runningCount}</span>
                <span className="text-slate-400">Running</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 font-bold">{stoppedCount}</span>
                <span className="text-slate-400">Stopped</span>
              </div>

              <button
                onClick={() => syncNow()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 text-sky-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Containers'}</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3">
            <button
              onClick={() => setActiveTab('containers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'containers'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-[#111A2E] text-slate-400 hover:text-slate-200 border border-[#1E293B]'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Containers</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'containers' ? 'bg-blue-500/40 text-white' : 'bg-[#18233C] text-slate-400'
              }`}>
                {filteredDockerContainers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('images')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'images'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-[#111A2E] text-slate-400 hover:text-slate-200 border border-[#1E293B]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Docker Images</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'images' ? 'bg-blue-500/40 text-white' : 'bg-[#18233C] text-slate-400'
              }`}>
                {images.length}
              </span>
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-medium text-slate-400">
                {cloudProvider === 'aws'
                  ? 'Monitoring resources running inside connected AWS EC2 instances'
                  : cloudProvider === 'azure'
                  ? 'Monitoring resources running inside connected Azure VMs'
                  : 'Monitoring resources running inside connected AWS EC2 & Azure VMs'}
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={activeTab === 'containers' ? "Search container, image or host..." : "Search repository, tag or image id..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52 sm:w-64"
                  />
                </div>

                {activeTab === 'containers' && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter Docker containers by status"
                    className="px-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                    <option value="restarting">Restarting</option>
                  </select>
                )}
              </div>
            </div>

            {activeTab === 'containers' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400 font-medium">
                      <th className="py-3 px-4">Container Name</th>
                      <th className="py-3 px-4">Container ID</th>
                      <th className="py-3 px-4">Image</th>
                      <th className="py-3 px-4">Host Instance</th>
                      <th className="py-3 px-4">Cloud Provider</th>
                      <th className="py-3 px-4">Region</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">CPU Usage</th>
                      <th className="py-3 px-4">Memory</th>
                      <th className="py-3 px-4">Memory Limit</th>
                      <th className="py-3 px-4">Disk I/O</th>
                      <th className="py-3 px-4">Network Traffic</th>
                      <th className="py-3 px-4">Restarts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                    {containers.map((c) => {
                      const isRunning = c.status === 'Running';
                      const isRestarting = c.status === 'Restarting';

                      return (
                        <tr key={c.id} className="hover:bg-[#162238]/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-white font-mono">
                            {c.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {c.containerId}
                          </td>
                          <td className="py-3 px-4 font-mono text-cyan-400">
                            {c.image}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {c.hostInstance}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {c.cloudProvider === 'aws' ? (
                                <AwsLogo className="w-4 h-3" />
                              ) : (
                                <AzureLogo className="w-3.5 h-3.5" />
                              )}
                              <span className="uppercase text-[11px] font-semibold text-slate-300">
                                {c.cloudProvider}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{c.region}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                isRunning
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : isRestarting
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {c.cpuUsage !== null && c.cpuUsage !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span className="w-8 font-semibold text-white">
                                  {c.cpuUsage}%
                                </span>
                                <div className="w-12 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-blue-500"
                                    style={{ width: `${Math.min(100, Math.max(0, c.cpuUsage))}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Unavailable</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {c.memoryUsage !== null && c.memoryUsage !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span className="w-8 font-semibold text-white">
                                  {c.memoryUsage}%
                                </span>
                                <div className="w-12 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-cyan-500"
                                    style={{ width: `${Math.min(100, Math.max(0, c.memoryUsage))}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Unavailable</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono">{c.memoryLimit}</td>
                          <td className="py-3 px-4 text-slate-300 font-mono">{c.diskIO}</td>
                          <td className="py-3 px-4 text-slate-300 font-mono">{c.networkTraffic}</td>
                          <td className="py-3 px-4 text-slate-300 font-semibold">{c.restartCount}</td>
                        </tr>
                      );
                    })}

                    {containers.length === 0 && (
                      <tr>
                        <td colSpan={13} className="py-8 text-center text-slate-400">
                          No containers found matching current cloud provider or filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400 font-medium">
                      <th className="py-3 px-4">Repository / Image Name</th>
                      <th className="py-3 px-4">Tag</th>
                      <th className="py-3 px-4">Image ID</th>
                      <th className="py-3 px-4">Host Instance</th>
                      <th className="py-3 px-4">Cloud Provider</th>
                      <th className="py-3 px-4">Region</th>
                      <th className="py-3 px-4">Virtual Size</th>
                      <th className="py-3 px-4">Active Containers</th>
                      <th className="py-3 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                    {filteredImages.map((img) => (
                      <tr key={img.id} className="hover:bg-[#162238]/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-white font-mono flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Layers className="w-3 h-3" />
                          </div>
                          <span>{img.repository}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#18233C] text-cyan-400 border border-cyan-500/30">
                            {img.tag}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {img.shortId}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {img.hostInstance}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {img.cloudProvider === 'aws' ? (
                              <AwsLogo className="w-4 h-3" />
                            ) : (
                              <AzureLogo className="w-3.5 h-3.5" />
                            )}
                            <span className="uppercase text-[11px] font-semibold text-slate-300">
                              {img.cloudProvider}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{img.region}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                          {img.size}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#18233C] text-slate-300 border border-[#1E293B]">
                            {img.activeContainers} {img.activeContainers === 1 ? 'container' : 'containers'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {img.created}
                        </td>
                      </tr>
                    ))}

                    {filteredImages.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          {loadingImages ? 'Loading Docker images...' : 'No Docker images found matching current filter.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
