'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Server as ServerIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Play,
  MapPin,
  RefreshCw,
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
  hostId: string;
  hostIp: string;
  cloudProvider: 'aws' | 'azure' | 'other';
  region: string;
  size: string;
  sizeBytes: number;
  activeContainers: number;
  created: string;
  metricSource?: string;
  lastUpdated?: string;
  dockerVersion?: string;
}

interface DockerHostItem {
  id: string;
  name: string;
  host: string;
  port: number;
  cloudProvider: string;
  region: string;
  serverStatus: string;
  dockerDetected: boolean;
  dockerStatus: 'running' | 'permission_denied' | 'not_installed' | 'daemon_stopped' | 'error';
  dockerStatusMessage: string;
  dockerVersion: string;
  containersCount: number;
  runningCount: number;
  imagesCount: number;
  lastSyncedAt?: string;
  lastError?: string;
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

  // State
  const [activeTab, setActiveTab] = useState<'containers' | 'images'>('containers');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [images, setImages] = useState<DockerImageItem[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [hosts, setHosts] = useState<DockerHostItem[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(false);

  // Host selector state - strictly real hosts
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [hostSearch, setHostSearch] = useState('');
  const [hostFilter, setHostFilter] = useState('all');
  const [syncingHostId, setSyncingHostId] = useState<string | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Scroll tabs helper
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 260;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Load real Docker hosts from database API
  const loadHosts = async () => {
    try {
      setLoadingHosts(true);
      const res = await fetch('/api/docker/hosts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHosts(data);
        }
      }
    } catch (e) {
      console.warn('Failed to load docker hosts:', e);
    } finally {
      setLoadingHosts(false);
    }
  };

  // Load real Docker images from database API
  const loadImages = async () => {
    try {
      setLoadingImages(true);
      const res = await fetch('/api/docker/images');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setImages(data);
        }
      }
    } catch (e) {
      console.warn('Failed to load docker images:', e);
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    loadImages();
    loadHosts();
  }, [filteredDockerContainers, isSyncing]);

  // Automatically select the first real host when hosts are loaded
  useEffect(() => {
    if (hosts.length > 0) {
      if (!selectedHostId || !hosts.some((h) => h.id === selectedHostId)) {
        setSelectedHostId(hosts[0].id);
      }
    }
  }, [hosts, selectedHostId]);

  // Filter real hosts by search query and cloud provider filter
  const visibleHosts = useMemo(() => {
    return hosts.filter((h) => {
      if (hostFilter === 'running' && h.dockerStatus !== 'running' && !h.dockerDetected) return false;
      if (hostFilter === 'azure' && h.cloudProvider !== 'azure') return false;
      if (hostFilter === 'aws' && h.cloudProvider !== 'aws') return false;

      if (hostSearch.trim()) {
        const q = hostSearch.toLowerCase();
        const matchName = h.name.toLowerCase().includes(q);
        const matchHost = h.host.toLowerCase().includes(q);
        return matchName || matchHost;
      }
      return true;
    });
  }, [hosts, hostSearch, hostFilter]);

  // Currently selected real host
  const selectedHost = useMemo(() => {
    if (!hosts.length) return null;
    return hosts.find((h) => h.id === selectedHostId) || hosts[0];
  }, [hosts, selectedHostId]);

  // Real containers filtered for the selected host
  const selectedHostContainers = useMemo(() => {
    if (!selectedHost) return [];
    return filteredDockerContainers.filter((c) => {
      return (
        c.hostId === selectedHost.id ||
        (c.hostInstance && c.hostInstance.toLowerCase() === selectedHost.name.toLowerCase()) ||
        (c.hostIp && c.hostIp === selectedHost.host)
      );
    });
  }, [filteredDockerContainers, selectedHost]);

  // Real images filtered for the selected host
  const selectedHostImages = useMemo(() => {
    if (!selectedHost) return [];
    return images.filter((img) => {
      return (
        img.hostId === selectedHost.id ||
        (img.hostInstance && img.hostInstance.toLowerCase() === selectedHost.name.toLowerCase()) ||
        (img.hostIp && img.hostIp === selectedHost.host)
      );
    });
  }, [images, selectedHost]);

  // Filtered view by search and status
  const displayedContainers = useMemo(() => {
    return selectedHostContainers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.image.toLowerCase().includes(search.toLowerCase()) ||
        c.containerId.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'all' || c.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [selectedHostContainers, search, statusFilter]);

  const displayedImages = useMemo(() => {
    return selectedHostImages.filter((img) => {
      const q = search.toLowerCase();
      return (
        img.repository.toLowerCase().includes(q) ||
        img.tag.toLowerCase().includes(q) ||
        img.shortId.toLowerCase().includes(q)
      );
    });
  }, [selectedHostImages, search]);

  // Real KPI metrics from actual database counts
  const totalDockerHosts = hosts.length;
  const totalRunningContainers = filteredDockerContainers.filter((c) => c.status === 'Running').length;
  const totalImagesCount = images.length;
  const hostsWithDockerCount = hosts.filter((h) => h.dockerDetected || h.dockerStatus === 'running').length;

  // Sync single host action
  const handleSyncSingleHost = async () => {
    if (!selectedHost) return;
    try {
      setSyncingHostId(selectedHost.id);
      await fetch(`/api/servers/${selectedHost.id}/refresh`, { method: 'POST' });
      await loadHosts();
      await loadImages();
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setTimeout(() => setSyncingHostId(null), 1000);
    }
  };

  const handleGlobalSync = async () => {
    await syncNow();
    await loadImages();
    await loadHosts();
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-6">
          {/* Breadcrumb & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link href="/" className="hover:text-blue-400 flex items-center gap-1 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Docker Observability</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <DockerIcon className="w-6 h-6 text-blue-400" />
                <span>Docker Containers & Images Observability</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGlobalSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 text-sky-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Infrastructure'}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* REAL KPI SUMMARY CARDS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Docker Hosts */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Total Docker Hosts</span>
                <div className="text-2xl font-bold text-white mt-1">{totalDockerHosts}</div>
                <span className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <span>●</span>
                  <span>{hosts.filter((h) => h.serverStatus === 'Online').length} Online</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <ServerIcon className="w-6 h-6" />
              </div>
            </div>

            {/* Running Containers */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Running Containers</span>
                <div className="text-2xl font-bold text-white mt-1">{totalRunningContainers}</div>
                <span className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <span>●</span>
                  <span>{totalRunningContainers} active</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Play className="w-6 h-6 fill-current" />
              </div>
            </div>

            {/* Docker Images */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Docker Images</span>
                <div className="text-2xl font-bold text-white mt-1">{totalImagesCount}</div>
                <span className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <span>●</span>
                  <span>{totalImagesCount} cached</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            {/* Hosts with Docker */}
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Hosts with Docker</span>
                <div className="text-2xl font-bold text-white mt-1">{hostsWithDockerCount}</div>
                <span className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <span>●</span>
                  <span>
                    {totalDockerHosts > 0 ? Math.round((hostsWithDockerCount / totalDockerHosts) * 100) : 0}% of fleet
                  </span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CONNECTED SERVER DOCKER HOSTS (SCROLLABLE TABS) */}
          {/* ========================================================================= */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ServerIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Connected Server Docker Hosts</span>
                    <span className="text-xs font-semibold text-slate-400">({visibleHosts.length})</span>
                  </h3>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hostSearch}
                    onChange={(e) => setHostSearch(e.target.value)}
                    placeholder="Search server..."
                    className="pl-8 pr-2.5 py-1.5 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-56"
                  />
                </div>

                <select
                  value={hostFilter}
                  onChange={(e) => setHostFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#0D1526] border border-[#1E293B] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="all">All Hosts</option>
                  <option value="running">Docker Running</option>
                  <option value="azure">Azure Only</option>
                  <option value="aws">AWS Only</option>
                </select>
              </div>
            </div>

            {/* Scrollable Tabs */}
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollTabs('left')}
                className="p-2 rounded-lg bg-[#0D1526] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] transition-colors shrink-0 z-10"
                title="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div
                ref={tabsContainerRef}
                className="flex items-center gap-2.5 overflow-x-auto scroll-smooth py-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-[#0D1526] flex-1"
                style={{ scrollbarWidth: 'thin' }}
              >
                {visibleHosts.map((host) => {
                  const isSelected = selectedHost?.id === host.id;
                  const isRunning = host.dockerStatus === 'running' || host.dockerDetected;

                  return (
                    <button
                      key={host.id}
                      type="button"
                      onClick={() => setSelectedHostId(host.id)}
                      className={`flex flex-col gap-1 px-3.5 py-2.5 rounded-xl border text-left shrink-0 transition-all min-w-[170px] ${
                        isSelected
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30 font-medium'
                          : 'bg-[#0D1526] hover:bg-[#18233C] text-slate-300 border-[#1E293B]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`block w-2 h-2 rounded-full ${
                              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-bold text-xs">{host.name}</span>
                        </div>
                      </div>

                      <div className={`text-[11px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {host.host}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] mt-0.5">
                        {host.cloudProvider === 'azure' ? (
                          <AzureLogo className="w-3 h-3" />
                        ) : host.cloudProvider === 'aws' ? (
                          <AwsLogo className="w-3.5 h-2.5" />
                        ) : (
                          <ServerIcon className="w-3 h-3" />
                        )}
                        <span className={`capitalize text-[10px] font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {host.cloudProvider}
                        </span>
                      </div>

                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                            isSelected
                              ? 'bg-blue-700/60 text-white border border-blue-400/40'
                              : isRunning
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <DockerIcon className="w-2.5 h-2.5" />
                          <span>{isRunning ? 'Docker: Running' : 'Docker: Stopped'}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}

                {visibleHosts.length === 0 && (
                  <div className="py-4 px-6 text-xs text-slate-400 italic">
                    {loadingHosts ? 'Loading registered hosts...' : 'No server hosts found matching the current filter.'}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => scrollTabs('right')}
                className="p-2 rounded-lg bg-[#0D1526] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] transition-colors shrink-0 z-10"
                title="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SELECTED SERVER RESOURCES SUMMARY CARD */}
          {/* ========================================================================= */}
          {selectedHost ? (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Identity */}
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">{selectedHost.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        selectedHost.serverStatus === 'Online'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedHost.serverStatus === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                        }`}
                      />
                      <span>{selectedHost.serverStatus}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedHost.host}</span>
                    <span>|</span>
                    <span>{selectedHost.region || 'East US'}</span>
                  </div>
                </div>
              </div>

              {/* Center Stats */}
              <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                {/* Docker Version */}
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <DockerIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Docker Version</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {selectedHost.dockerVersion
                        ? selectedHost.dockerVersion.replace('Docker version ', '').split(',')[0]
                        : selectedHost.dockerDetected
                        ? 'Running'
                        : 'Not Installed'}
                    </span>
                  </div>
                </div>

                {/* Running Containers */}
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Running Containers</span>
                    <span className="text-sm font-bold text-white">
                      {selectedHostContainers.filter((c) => c.status === 'Running').length || selectedHost.runningCount || 0}
                    </span>
                  </div>
                </div>

                {/* Docker Images */}
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Docker Images</span>
                    <span className="text-sm font-bold text-white">
                      {selectedHostImages.length || selectedHost.imagesCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sync Host Button */}
              <div>
                <button
                  type="button"
                  onClick={handleSyncSingleHost}
                  disabled={syncingHostId === selectedHost.id}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition-all disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${syncingHostId === selectedHost.id ? 'animate-spin' : ''}`} />
                  <span>{syncingHostId === selectedHost.id ? 'Syncing...' : 'Sync Host'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-6 text-center text-xs text-slate-400">
              No server hosts registered yet. Add servers under the Servers page to monitor Docker resources.
            </div>
          )}

          {/* ========================================================================= */}
          {/* RESOURCES SUB-TABS & TABLE */}
          {/* ========================================================================= */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
            {/* Header: Sub-Tabs & Search */}
            <div className="p-4 sm:p-5 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('containers')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'containers'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-[#0D1526] text-slate-400 hover:text-slate-200 border border-[#1E293B]'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>Containers</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === 'containers' ? 'bg-blue-500/40 text-white' : 'bg-[#18233C] text-slate-400'
                    }`}
                  >
                    {selectedHostContainers.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('images')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'images'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-[#0D1526] text-slate-400 hover:text-slate-200 border border-[#1E293B]'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Docker Images</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === 'images' ? 'bg-blue-500/40 text-white' : 'bg-[#18233C] text-slate-400'
                    }`}
                  >
                    {selectedHostImages.length}
                  </span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'containers' ? 'Search containers...' : 'Search docker images...'
                    }
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
                    className="px-3 py-1.5 text-xs bg-[#0D1526] border border-[#1E293B] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="all">All Statuses</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                    <option value="restarting">Restarting</option>
                  </select>
                )}
              </div>
            </div>

            {/* Containers Table */}
            {activeTab === 'containers' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400 font-medium">
                      <th className="py-3 px-4">Container Name</th>
                      <th className="py-3 px-4">Container ID</th>
                      <th className="py-3 px-4">Image</th>
                      <th className="py-3 px-4">Host Server</th>
                      <th className="py-3 px-4">Cloud Provider</th>
                      <th className="py-3 px-4">Region</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">CPU Usage</th>
                      <th className="py-3 px-4">Memory</th>
                      <th className="py-3 px-4">Network I/O</th>
                      <th className="py-3 px-4">Published Ports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                    {displayedContainers.map((c) => {
                      const isRunning = c.status === 'Running';
                      const isRestarting = c.status === 'Restarting';

                      return (
                        <tr key={c.id} className="hover:bg-[#162238]/60 transition-colors">
                          {/* Container Name */}
                          <td className="py-3 px-4 font-bold text-white font-mono">
                            {c.name}
                          </td>

                          {/* Container ID */}
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {c.containerId}
                          </td>

                          {/* Image */}
                          <td className="py-3 px-4 font-mono text-cyan-400">
                            {c.image}
                          </td>

                          {/* Host Server */}
                          <td className="py-3 px-4 text-slate-300 font-semibold text-white">
                            {c.hostInstance}
                          </td>

                          {/* Cloud Provider */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {c.cloudProvider === 'aws' ? (
                                <AwsLogo className="w-4 h-3" />
                              ) : c.cloudProvider === 'azure' ? (
                                <AzureLogo className="w-3.5 h-3.5" />
                              ) : (
                                <ServerIcon className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span className="capitalize text-[11px] font-semibold text-slate-300">
                                {c.cloudProvider}
                              </span>
                            </div>
                          </td>

                          {/* Region */}
                          <td className="py-3 px-4 text-slate-400">{c.region}</td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                isRunning
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : isRestarting
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                }`}
                              />
                              <span>{c.status}</span>
                            </span>
                          </td>

                          {/* CPU Usage */}
                          <td className="py-3 px-4">
                            {c.cpuUsage !== null && c.cpuUsage !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span className="w-8 font-semibold text-white">{c.cpuUsage}%</span>
                                <div className="w-12 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-blue-500"
                                    style={{ width: `${Math.min(100, Math.max(0, c.cpuUsage * 5))}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">0.0%</span>
                            )}
                          </td>

                          {/* Memory */}
                          <td className="py-3 px-4 text-slate-300 font-mono">
                            {c.memoryLimit || 'Available'}
                          </td>

                          {/* Network I/O */}
                          <td className="py-3 px-4 text-slate-300 font-mono">
                            {c.networkTraffic || '0 B/s'}
                          </td>

                          {/* Published Ports */}
                          <td className="py-3 px-4 text-cyan-400 font-mono text-[11px]">
                            {c.publishedPorts || '-'}
                          </td>
                        </tr>
                      );
                    })}

                    {displayedContainers.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400">
                          <div className="max-w-md mx-auto space-y-2">
                            <Boxes className="w-8 h-8 text-slate-500 mx-auto" />
                            <h4 className="text-sm font-semibold text-white">No Running Containers</h4>
                            <p className="text-xs text-slate-400">
                              {selectedHost?.dockerDetected
                                ? `Docker is running on ${selectedHost.name}, but no containers are currently active.`
                                : selectedHost
                                ? `Docker daemon is not detected on ${selectedHost.name}.`
                                : 'No containers found matching current filter.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Docker Images Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E293B] bg-[#0E1628]/60 text-slate-400 font-medium">
                      <th className="py-3 px-4">Repository / Image Name</th>
                      <th className="py-3 px-4">Tag</th>
                      <th className="py-3 px-4">Image ID</th>
                      <th className="py-3 px-4">Host Server</th>
                      <th className="py-3 px-4">Cloud Provider</th>
                      <th className="py-3 px-4">Region</th>
                      <th className="py-3 px-4">Virtual Size</th>
                      <th className="py-3 px-4">Active Containers</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4">Telemetry Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                    {displayedImages.map((img) => (
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
                        <td className="py-3 px-4 font-mono text-slate-400">{img.shortId}</td>
                        <td className="py-3 px-4 text-white font-semibold">{img.hostInstance}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {img.cloudProvider === 'aws' ? (
                              <AwsLogo className="w-4 h-3" />
                            ) : img.cloudProvider === 'azure' ? (
                              <AzureLogo className="w-3.5 h-3.5" />
                            ) : (
                              <ServerIcon className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="capitalize text-[11px] font-semibold text-slate-300">
                              {img.cloudProvider}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{img.region}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">{img.size}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#18233C] text-slate-300 border border-[#1E293B]">
                            {img.activeContainers} {img.activeContainers === 1 ? 'container' : 'containers'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{img.created}</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                          Direct SSH (Docker Engine)
                        </td>
                      </tr>
                    ))}

                    {displayedImages.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <div className="max-w-md mx-auto space-y-2">
                            <Layers className="w-8 h-8 text-slate-500 mx-auto" />
                            <h4 className="text-sm font-semibold text-white">No Docker Images Found</h4>
                            <p className="text-xs text-slate-400">
                              No cached Docker images found on {selectedHost?.name || 'this host'}.
                            </p>
                          </div>
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
