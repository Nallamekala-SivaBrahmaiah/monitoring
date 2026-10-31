'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Cloud,
  MapPin,
  Bell,
  Menu,
  ChevronDown,
  Check,
  RotateCw,
  Layers,
  AlertCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { CloudProvider } from '@/types/monitoring';
import { useMonitoring } from '@/context/MonitoringContext';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const {
    cloudProvider,
    setCloudProvider,
    awsAccounts,
    selectedAwsAccountId,
    setSelectedAwsAccountId,
    azureSubscriptions,
    selectedAzureSubId,
    setSelectedAzureSubId,
    regions,
    selectedRegion,
    setSelectedRegion,
    isLive,
    setIsLive,
    isRefreshing,
    triggerRefresh,
    lastRefreshedAt,
    refreshError,
    refreshInterval,
    filteredAlerts,
    syncStatus,
    isSyncing,
    syncNow,
  } = useMonitoring();

  const [openCloudMenu, setOpenCloudMenu] = useState(false);
  const [openAccountMenu, setOpenAccountMenu] = useState(false);
  const [openRegionMenu, setOpenRegionMenu] = useState(false);
  const [openAlertsMenu, setOpenAlertsMenu] = useState(false);

  const cloudOptions: { label: string; value: CloudProvider; icon: React.ReactNode }[] = [
    { label: 'All Clouds', value: 'all', icon: <Cloud className="w-3.5 h-3.5 text-blue-400" /> },
    { label: 'AWS', value: 'aws', icon: <AwsLogo className="w-4 h-3 text-[#FF9900]" /> },
    { label: 'Azure', value: 'azure', icon: <AzureLogo className="w-3.5 h-3.5 text-[#0089D6]" /> },
  ];

  // Filter available regions based on selected cloud provider
  const availableRegions = regions.filter((r) => {
    if (cloudProvider === 'aws') return r.cloud === 'aws';
    if (cloudProvider === 'azure') return r.cloud === 'azure';
    return true;
  });

  const selectedRegionObj = regions.find((r) => r.region === selectedRegion);

  const activeAlerts = filteredAlerts.filter((a) => a.status === 'active');

  const closeAllMenus = () => {
    setOpenCloudMenu(false);
    setOpenAccountMenu(false);
    setOpenRegionMenu(false);
    setOpenAlertsMenu(false);
  };

  const formatRefreshTime = (date: Date | null) => {
    if (!date) return 'just now';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-20 bg-[#0B1120]/95 backdrop-blur-md border-b border-[#1E293B] px-4 lg:px-7 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg bg-[#111A2E] border border-[#1E293B] text-slate-300 hover:text-white"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Infrastructure Dashboard</span>
            {cloudProvider === 'aws' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30 font-semibold">
                AWS View
              </span>
            )}
            {cloudProvider === 'azure' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0089D6]/20 text-[#5EA0EF] border border-[#0089D6]/30 font-semibold">
                Azure View
              </span>
            )}
          </h2>
          <p className="text-[11px] text-slate-400">
            Real-time monitoring across AWS & Azure
          </p>
        </div>
      </div>

      {/* Filter and Status Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Manual Refresh Button */}
        <button
          onClick={triggerRefresh}
          disabled={isRefreshing}
          title={`Refresh latest infrastructure data (Auto-refresh: every ${refreshInterval}s)`}
          className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <RotateCw
            className={`w-3.5 h-3.5 text-blue-400 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
        </button>

        {/* Real-Time Auto-Refresh & Latest Data Status */}
        {isRefreshing ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sky-300 bg-sky-950/40 border border-sky-800/50 rounded-lg">
            <RotateCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span className="hidden sm:inline">Refreshing latest data...</span>
            <span className="sm:hidden">Refreshing...</span>
          </div>
        ) : refreshError ? (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-lg cursor-help"
            title={refreshError}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Cached {formatRefreshTime(lastRefreshedAt)}</span>
          </div>
        ) : (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-[#111A2E] border border-[#1E293B] rounded-lg"
            title={`Automatic refresh active every ${refreshInterval}s. Always displaying latest infrastructure data.`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Updated {formatRefreshTime(lastRefreshedAt)}</span>
          </div>
        )}

        {/* 2. Global Cloud Provider Filter */}
        <div className="relative">
          <button
            onClick={() => {
              const prev = openCloudMenu;
              closeAllMenus();
              setOpenCloudMenu(!prev);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] rounded-lg transition-colors shadow-sm"
          >
            {cloudOptions.find((c) => c.value === cloudProvider)?.icon}
            <span>
              {cloudOptions.find((c) => c.value === cloudProvider)?.label ||
                'All Clouds'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {openCloudMenu && (
            <div className="absolute right-0 mt-1.5 w-36 bg-[#111A2E] border border-[#1E293B] rounded-lg shadow-xl py-1 z-30">
              {cloudOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setCloudProvider(opt.value);
                    setSelectedRegion('all');
                    setOpenCloudMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-[#18233C]"
                >
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                  {cloudProvider === opt.value && (
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. AWS Account Selector (Visible when AWS is selected) */}
        {cloudProvider === 'aws' && (
          <div className="relative">
            <button
              onClick={() => {
                const prev = openAccountMenu;
                closeAllMenus();
                setOpenAccountMenu(!prev);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#FF9900] bg-[#FF9900]/10 hover:bg-[#FF9900]/15 border border-[#FF9900]/30 rounded-lg transition-colors shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-[#FF9900]" />
              <span className="truncate max-w-[130px]">
                {selectedAwsAccountId === 'all'
                  ? 'All AWS Accounts'
                  : awsAccounts.find((a) => a.id === selectedAwsAccountId)?.accountName ||
                    'Select Account'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#FF9900]" />
            </button>

            {openAccountMenu && (
              <div className="absolute right-0 mt-1.5 w-56 bg-[#111A2E] border border-[#1E293B] rounded-lg shadow-xl py-1 z-30">
                <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-500">
                  Select AWS Account
                </div>
                <button
                  onClick={() => {
                    setSelectedAwsAccountId('all');
                    setOpenAccountMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-[#18233C]"
                >
                  <span>All AWS Accounts</span>
                  {selectedAwsAccountId === 'all' && (
                    <Check className="w-3.5 h-3.5 text-[#FF9900]" />
                  )}
                </button>
                {awsAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedAwsAccountId(acc.id);
                      setOpenAccountMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-[#18233C]"
                  >
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">
                        {acc.accountName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {acc.accountId}
                      </div>
                    </div>
                    {selectedAwsAccountId === acc.id && (
                      <Check className="w-3.5 h-3.5 text-[#FF9900] flex-shrink-0 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Azure Subscription Selector (Visible when Azure is selected) */}
        {cloudProvider === 'azure' && (
          <div className="relative">
            <button
              onClick={() => {
                const prev = openAccountMenu;
                closeAllMenus();
                setOpenAccountMenu(!prev);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#5EA0EF] bg-[#0089D6]/10 hover:bg-[#0089D6]/15 border border-[#0089D6]/30 rounded-lg transition-colors shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-[#0089D6]" />
              <span className="truncate max-w-[130px]">
                {selectedAzureSubId === 'all'
                  ? 'All Subscriptions'
                  : azureSubscriptions.find((s) => s.id === selectedAzureSubId)?.subscriptionName ||
                    'Select Subscription'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#5EA0EF]" />
            </button>

            {openAccountMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-[#111A2E] border border-[#1E293B] rounded-lg shadow-xl py-1 z-30">
                <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-500">
                  Select Azure Subscription
                </div>
                <button
                  onClick={() => {
                    setSelectedAzureSubId('all');
                    setOpenAccountMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-[#18233C]"
                >
                  <span>All Subscriptions</span>
                  {selectedAzureSubId === 'all' && (
                    <Check className="w-3.5 h-3.5 text-[#0089D6]" />
                  )}
                </button>
                {azureSubscriptions.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setSelectedAzureSubId(sub.id);
                      setOpenAccountMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-[#18233C]"
                  >
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">
                        {sub.subscriptionName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {sub.subscriptionId.slice(0, 18)}...
                      </div>
                    </div>
                    {selectedAzureSubId === sub.id && (
                      <Check className="w-3.5 h-3.5 text-[#0089D6] flex-shrink-0 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. Region Filter */}
        <div className="relative">
          <button
            onClick={() => {
              const prev = openRegionMenu;
              closeAllMenus();
              setOpenRegionMenu(!prev);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] rounded-lg transition-colors shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {selectedRegion === 'all'
                ? 'All Regions'
                : selectedRegionObj?.displayName.split(' ')[0] || selectedRegion}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {openRegionMenu && (
            <div className="absolute right-0 mt-1.5 w-56 bg-[#111A2E] border border-[#1E293B] rounded-lg shadow-xl py-1 z-30">
              <button
                onClick={() => {
                  setSelectedRegion('all');
                  setOpenRegionMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-[#18233C]"
              >
                <span>All Regions</span>
                {selectedRegion === 'all' && (
                  <Check className="w-3.5 h-3.5 text-blue-500" />
                )}
              </button>
              {availableRegions.map((reg) => (
                <button
                  key={reg.id}
                  onClick={() => {
                    setSelectedRegion(reg.region);
                    setOpenRegionMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-[#18233C]"
                >
                  <div className="truncate">
                    <span className="font-semibold text-white">{reg.region}</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {reg.displayName}
                    </span>
                  </div>
                  {selectedRegion === reg.region && (
                    <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 6. Live Monitoring Toggle */}
        <button
          onClick={() => setIsLive(!isLive)}
          title={isLive ? 'Live stream active (click to pause)' : 'Paused (click to resume)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            isLive
              ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60 shadow-sm'
              : 'text-slate-400 bg-slate-900 border-slate-800'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-emerald-400 animate-pulse-glow' : 'bg-slate-500'
            }`}
          />
          <span>{isLive ? 'Live' : 'Paused'}</span>
        </button>

        {/* 6b. Real Infrastructure Sync Button & Freshness Pill */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => syncNow()}
            disabled={isSyncing}
            title={
              syncStatus.lastSyncAt
                ? `Last synchronized: ${new Date(syncStatus.lastSyncAt).toLocaleString()}`
                : 'Synchronize live infrastructure from AWS, Azure, Docker & Kubernetes'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              isSyncing
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 cursor-wait'
                : 'bg-[#131F37] hover:bg-[#1A2A4A] text-slate-200 border-slate-700/80 hover:border-slate-500 shadow-sm'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 text-sky-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Sync Infrastructure'}</span>
            <span className="md:hidden">{isSyncing ? 'Sync...' : 'Sync'}</span>
          </button>

          {syncStatus.lastSyncAt && (
            <div
              className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border ${
                syncStatus.status === 'stale'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              }`}
              title={`Last sync: ${new Date(syncStatus.lastSyncAt).toLocaleTimeString()} (${syncStatus.lastSyncAt})`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus.status === 'stale' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span>{syncStatus.freshness}</span>
            </div>
          )}
        </div>


        {/* 7. Notification Bell with Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              const prev = openAlertsMenu;
              closeAllMenus();
              setOpenAlertsMenu(!prev);
            }}
            className="relative p-2 rounded-lg bg-[#111A2E] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {activeAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {openAlertsMenu && (
            <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-[#111A2E] border border-[#1E293B] rounded-xl shadow-2xl p-3 z-30 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E293B] mb-2">
                <span className="font-semibold text-white">Active Alerts ({activeAlerts.length})</span>
                <Link
                  href="/dashboard/alerts"
                  onClick={() => setOpenAlertsMenu(false)}
                  className="text-blue-400 hover:underline flex items-center gap-0.5 text-[11px]"
                >
                  <span>View All</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activeAlerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-2 rounded-lg bg-[#0D1526] border border-[#1E293B] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate max-w-[180px]">
                        {al.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          al.severity === 'Critical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {al.severity}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>{al.resourceName}</span>
                      <span>{al.timeAgo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
