'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Cloud,
  Server,
  Play,
  Power,
  RefreshCw,
  ExternalLink,
  Filter,
  X,
  Check,
  ChevronDown,
  Layers,
  Activity,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Plus,
  Eye,
  EyeOff,
  RotateCw,
  Key,
  Shield,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

export interface CloudAccountServerItem {
  id: string;
  resourceId: string;
  name: string;
  cloudProvider: 'aws' | 'azure';
  accountName: string;
  accountId: string;
  subscriptionId?: string;
  resourceGroup?: string;
  region: string;
  publicIp: string | null;
  privateIp: string | null;
  host: string;
  os: string;
  status: string;
  powerState: string;
  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
  lastConnected: string;
  lastSyncedAt?: string;
  detailUrl: string;
  isSSHConnected?: boolean;
}

export interface AvailableCloudAccount {
  id: string;
  accountId: string;
  subscriptionId?: string;
  accountName: string;
  provider: 'aws' | 'azure';
  regions: string[];
  status: string;
}

export function OnPremisesCloudAccountManager() {
  // Accounts and Server state
  const [accounts, setAccounts] = useState<AvailableCloudAccount[]>([]);
  const [servers, setServers] = useState<CloudAccountServerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & Selection
  const [selectedProvider, setSelectedProvider] = useState<'all' | 'aws' | 'azure'>('all');
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Power operation loading tracking
  const [powerLoadingId, setPowerLoadingId] = useState<string | null>(null);
  const [singleSyncId, setSingleSyncId] = useState<string | null>(null);

  // Connect Cloud Account Modals
  const [activeModal, setActiveModal] = useState<'none' | 'aws' | 'azure'>('none');

  // AWS Connection Form State
  const [awsForm, setAwsForm] = useState({
    accountName: 'Production AWS Account',
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    regions: ['ap-southeast-2', 'us-east-1'],
  });
  const [showAwsSecret, setShowAwsSecret] = useState(false);
  const [awsTesting, setAwsTesting] = useState(false);
  const [awsTestResult, setAwsTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [awsSubmitting, setAwsSubmitting] = useState(false);
  const [awsSubmitError, setAwsSubmitError] = useState<string | null>(null);

  // Azure Connection Form State
  const [azureForm, setAzureForm] = useState({
    subscriptionName: 'Primary Azure Subscription',
    subscriptionId: '',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    regions: ['eastus', 'westeurope'],
  });
  const [showAzureSecret, setShowAzureSecret] = useState(false);
  const [azureTesting, setAzureTesting] = useState(false);
  const [azureTestResult, setAzureTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [azureSubmitting, setAzureSubmitting] = useState(false);
  const [azureSubmitError, setAzureSubmitError] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  // Restore persisted selections from localStorage on client mount
  useEffect(() => {
    try {
      const savedProvider = localStorage.getItem('onprem_selected_provider');
      if (savedProvider === 'aws' || savedProvider === 'azure' || savedProvider === 'all') {
        setSelectedProvider(savedProvider);
      }
      const savedAccounts = localStorage.getItem('onprem_selected_accounts');
      if (savedAccounts) {
        const parsed = JSON.parse(savedAccounts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedAccountIds(new Set(parsed));
        }
      }
    } catch {}
  }, []);

  // Fetch Accounts & Servers from backend
  const fetchData = useCallback(
    async (isManualRefresh: boolean = false) => {
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        const accountIdsArr = Array.from(selectedAccountIds);
        const queryParams = new URLSearchParams();
        queryParams.set('provider', selectedProvider);
        if (accountIdsArr.length > 0) {
          queryParams.set('accountIds', accountIdsArr.join(','));
        }
        if (selectedRegion && selectedRegion !== 'all') {
          queryParams.set('region', selectedRegion);
        }
        if (searchTerm) {
          queryParams.set('search', searchTerm);
        }

        const res = await fetch(`/api/on-premises/cloud-servers?${queryParams.toString()}&_t=${Date.now()}`, {
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.accounts)) {
            setAccounts(data.accounts);

            // If no accounts are selected yet, auto-select the first available account for immediate usability
            setSelectedAccountIds((prev) => {
              if (prev.size === 0 && data.accounts.length > 0) {
                const firstId = data.accounts[0].accountId || data.accounts[0].subscriptionId || data.accounts[0].id;
                const initialSet = new Set([firstId]);
                try {
                  localStorage.setItem('onprem_selected_accounts', JSON.stringify([firstId]));
                } catch {}
                return initialSet;
              }
              return prev;
            });
          }
          if (Array.isArray(data.servers)) {
            setServers(data.servers);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch on-premises cloud servers:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedProvider, selectedAccountIds, selectedRegion, searchTerm]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Persist selections
  const handleSelectAccount = (accId: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(accId)) {
        next.delete(accId);
      } else {
        next.add(accId);
      }
      try {
        localStorage.setItem('onprem_selected_accounts', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleProviderChange = (provider: 'all' | 'aws' | 'azure') => {
    setSelectedProvider(provider);
    setSelectedRegion('all');
    setSelectedInstanceIds(new Set());
    try {
      localStorage.setItem('onprem_selected_provider', provider);
    } catch {}
  };

  const handleClearSelection = () => {
    setSelectedAccountIds(new Set());
    setSelectedRegion('all');
    setSelectedInstanceIds(new Set());
    setSearchTerm('');
    try {
      localStorage.removeItem('onprem_selected_accounts');
    } catch {}
  };

  // Filter accounts by currently active provider
  const filteredAccounts = useMemo(() => {
    if (selectedProvider === 'all') return accounts;
    return accounts.filter((a) => a.provider === selectedProvider);
  }, [accounts, selectedProvider]);

  // Filter regions based on active selected accounts
  const availableRegions = useMemo(() => {
    const regSet = new Set<string>();
    for (const acc of filteredAccounts) {
      if (selectedAccountIds.has(acc.accountId) || selectedAccountIds.has(acc.subscriptionId || '') || selectedAccountIds.has(acc.id)) {
        for (const reg of acc.regions) {
          regSet.add(reg);
        }
      }
    }
    return Array.from(regSet);
  }, [filteredAccounts, selectedAccountIds]);

  // Filter servers by instance selection
  const displayedServers = useMemo(() => {
    if (selectedInstanceIds.size === 0) return servers;
    return servers.filter((s) => selectedInstanceIds.has(s.resourceId) || selectedInstanceIds.has(s.id));
  }, [servers, selectedInstanceIds]);

  // Real Cloud Power Action Dispatcher
  const handlePowerAction = async (server: CloudAccountServerItem, action: 'start' | 'stop') => {
    try {
      setPowerLoadingId(server.id);

      const res = await fetch('/api/on-premises/cloud-servers/power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: server.resourceId,
          name: server.name,
          provider: server.cloudProvider,
          action,
          accountId: server.accountId,
          subscriptionId: server.subscriptionId,
          resourceGroup: server.resourceGroup,
          region: server.region,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(
          'success',
          data.message ||
            `${server.cloudProvider.toUpperCase()} server "${server.name}" ${action === 'start' ? 'started' : 'stopped'} successfully.`
        );
        // Optimistically update status and trigger full reload
        setServers((prev) =>
          prev.map((s) =>
            s.id === server.id
              ? {
                  ...s,
                  status: action === 'start' ? 'Starting' : 'Stopping',
                  powerState: action === 'start' ? 'Starting' : 'Stopping',
                }
              : s
          )
        );
        setTimeout(() => fetchData(true), 3000);
      } else {
        showToast('error', data.error || `Failed to ${action} ${server.cloudProvider.toUpperCase()} server.`);
      }
    } catch (err: any) {
      showToast('error', err.message || `Error executing power action on ${server.name}`);
    } finally {
      setPowerLoadingId(null);
    }
  };

  // Sync single server
  const handleSingleSync = async (server: CloudAccountServerItem) => {
    try {
      setSingleSyncId(server.id);
      await fetchData(true);
      showToast('info', `Synchronized live status for "${server.name}".`);
    } finally {
      setSingleSyncId(null);
    }
  };

  // ==================== CONNECT AWS ACCOUNT HANDLERS ====================
  const handleTestAwsConnection = async () => {
    if (!awsForm.accessKeyId.trim() || !awsForm.secretAccessKey.trim()) {
      setAwsTestResult({ success: false, message: 'AWS Access Key ID and Secret Access Key are required.' });
      return;
    }
    try {
      setAwsTesting(true);
      setAwsTestResult(null);
      setAwsSubmitError(null);

      const res = await fetch('/api/aws/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId: awsForm.accessKeyId.trim(),
          secretAccessKey: awsForm.secretAccessKey.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAwsTestResult({
          success: true,
          message: `✓ AWS Credentials Verified! Connected Account ID: ${data.accountId || 'Verified'}. Regions discovered: ${data.regionsCount || 31}.`,
        });
        if (data.accountId && !awsForm.accountId) {
          setAwsForm((prev) => ({ ...prev, accountId: data.accountId }));
        }
      } else {
        setAwsTestResult({
          success: false,
          message: data.error || 'AWS verification failed. Please check your credentials.',
        });
      }
    } catch (err: any) {
      setAwsTestResult({ success: false, message: err.message || 'AWS connection test failed' });
    } finally {
      setAwsTesting(false);
    }
  };

  const handleSaveAwsAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awsForm.accountName.trim() || !awsForm.accessKeyId.trim() || !awsForm.secretAccessKey.trim()) {
      setAwsSubmitError('Account Name, Access Key ID, and Secret Access Key are required.');
      return;
    }

    try {
      setAwsSubmitting(true);
      setAwsSubmitError(null);

      const res = await fetch('/api/cloud-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'aws',
          accountName: awsForm.accountName.trim(),
          accountId: awsForm.accountId.trim() || undefined,
          accessKeyId: awsForm.accessKeyId.trim(),
          secretAccessKey: awsForm.secretAccessKey.trim(),
          regions: awsForm.regions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAwsSubmitError(data.error || 'Failed to connect AWS Account.');
        return;
      }

      showToast('success', `AWS Account "${awsForm.accountName}" connected successfully! Instances are now active.`);
      setActiveModal('none');
      if (data.accountId) {
        setSelectedAccountIds((prev) => new Set([...Array.from(prev), data.accountId]));
      }
      await fetchData(true);
    } catch (err: any) {
      setAwsSubmitError(err.message || 'Failed to save AWS Account.');
    } finally {
      setAwsSubmitting(false);
    }
  };

  // ==================== CONNECT AZURE ACCOUNT HANDLERS ====================
  const handleTestAzureConnection = async () => {
    if (!azureForm.subscriptionId.trim() || !azureForm.tenantId.trim() || !azureForm.clientId.trim() || !azureForm.clientSecret.trim()) {
      setAzureTestResult({ success: false, message: 'Subscription ID, Tenant ID, Client ID, and Client Secret are required.' });
      return;
    }

    try {
      setAzureTesting(true);
      setAzureTestResult(null);
      setAzureSubmitError(null);

      const res = await fetch('/api/azure/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: azureForm.subscriptionId.trim(),
          tenantId: azureForm.tenantId.trim(),
          clientId: azureForm.clientId.trim(),
          clientSecret: azureForm.clientSecret.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAzureTestResult({
          success: true,
          message: `✓ Azure ARM Connection Verified! Subscription: ${data.subscriptionName || azureForm.subscriptionId}.`,
        });
        if (data.subscriptionName && !azureForm.subscriptionName) {
          setAzureForm((prev) => ({ ...prev, subscriptionName: data.subscriptionName }));
        }
      } else {
        setAzureTestResult({
          success: false,
          message: data.error || 'Azure verification failed. Please verify your Service Principal details.',
        });
      }
    } catch (err: any) {
      setAzureTestResult({ success: false, message: err.message || 'Azure connection test failed' });
    } finally {
      setAzureTesting(false);
    }
  };

  const handleSaveAzureSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!azureForm.subscriptionName.trim() || !azureForm.subscriptionId.trim() || !azureForm.tenantId.trim() || !azureForm.clientId.trim() || !azureForm.clientSecret.trim()) {
      setAzureSubmitError('All Azure credentials (Subscription Name, Subscription ID, Tenant ID, Client ID, Secret) are required.');
      return;
    }

    try {
      setAzureSubmitting(true);
      setAzureSubmitError(null);

      const res = await fetch('/api/cloud-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'azure',
          subscriptionName: azureForm.subscriptionName.trim(),
          subscriptionId: azureForm.subscriptionId.trim(),
          tenantId: azureForm.tenantId.trim(),
          clientId: azureForm.clientId.trim(),
          clientSecret: azureForm.clientSecret.trim(),
          regions: azureForm.regions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAzureSubmitError(data.error || 'Failed to connect Azure Subscription.');
        return;
      }

      showToast('success', `Azure Subscription "${azureForm.subscriptionName}" connected successfully! VMs are now active.`);
      setActiveModal('none');
      if (data.subscriptionId) {
        setSelectedAccountIds((prev) => new Set([...Array.from(prev), data.subscriptionId]));
      }
      await fetchData(true);
    } catch (err: any) {
      setAzureSubmitError(err.message || 'Failed to save Azure Subscription.');
    } finally {
      setAzureSubmitting(false);
    }
  };

  const awsAccountsCount = accounts.filter((a) => a.provider === 'aws').length;
  const azureAccountsCount = accounts.filter((a) => a.provider === 'azure').length;

  return (
    <div className="bg-[#0D1526] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
      {/* 1. Header with Badge & Sync Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Cloud-Account-Managed Infrastructure
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Live Cloud Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control servers using existing credentials from AWS &amp; Azure Cloud Accounts with real API power actions
            </p>
          </div>
        </div>

        {/* Action Buttons: Add AWS, Add Azure, Clear, Sync */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* + Connect AWS Account Button */}
          <button
            type="button"
            onClick={() => {
              setActiveModal('aws');
              setAwsTestResult(null);
              setAwsSubmitError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 transition-all shadow-sm cursor-pointer"
            title="Connect AWS Account directly from On-Premises"
          >
            <AwsLogo className="w-3.5 h-3.5" />
            <span>+ Connect AWS</span>
          </button>

          {/* + Connect Azure Account Button */}
          <button
            type="button"
            onClick={() => {
              setActiveModal('azure');
              setAzureTestResult(null);
              setAzureSubmitError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 transition-all shadow-sm cursor-pointer"
            title="Connect Azure Subscription directly from On-Premises"
          >
            <AzureLogo className="w-3.5 h-3.5" />
            <span>+ Connect Azure</span>
          </button>

          {selectedAccountIds.size > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] transition-all cursor-pointer"
              title="Clear all selections"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
            title="Synchronize live state across cloud accounts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* 2. Account & Provider Selection Controls Bar (Requirement 1, 2, 7) */}
      <div className="bg-[#111A2E]/80 border border-[#1E293B] rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Provider Selector Dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              1. Cloud Provider
            </label>
            <div className="flex items-center gap-1.5 p-1 bg-[#090D16] border border-[#1E293B] rounded-lg">
              <button
                type="button"
                onClick={() => handleProviderChange('all')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  selectedProvider === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({accounts.length})
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('aws')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedProvider === 'aws'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AwsLogo className="w-3.5 h-3.5" />
                <span>AWS ({awsAccountsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('azure')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedProvider === 'azure'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AzureLogo className="w-3.5 h-3.5" />
                <span>Azure ({azureAccountsCount})</span>
              </button>
            </div>
          </div>

          {/* Region Selector Dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              2. Target Region
            </label>
            <div className="relative">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer appearance-none"
              >
                <option value="all">All Regions ({availableRegions.length})</option>
                {availableRegions.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              3. Search Resource
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by VM name, IP, or ID..."
              className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Account Selector Checklist Pills */}
        <div className="pt-2 border-t border-[#1E293B]/70">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Connected Cloud Accounts (Select accounts to monitor):</span>
            </span>

            {filteredAccounts.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = new Set(
                      filteredAccounts.map((a) => a.accountId || a.subscriptionId || a.id)
                    );
                    setSelectedAccountIds(allIds);
                    try {
                      localStorage.setItem('onprem_selected_accounts', JSON.stringify(Array.from(allIds)));
                    } catch {}
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccountIds(new Set());
                    try {
                      localStorage.removeItem('onprem_selected_accounts');
                    } catch {}
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-300 cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="p-3 bg-[#090D16] border border-[#1E293B] rounded-lg text-xs text-slate-400 text-center flex items-center justify-center gap-3">
              <span>No connected {selectedProvider.toUpperCase()} accounts found.</span>
              <button
                type="button"
                onClick={() => setActiveModal(selectedProvider === 'azure' ? 'azure' : 'aws')}
                className="text-blue-400 font-semibold underline hover:text-blue-300 cursor-pointer"
              >
                Connect {selectedProvider === 'azure' ? 'Azure' : 'AWS'} Account Now
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {filteredAccounts.map((acc) => {
                const accId = acc.accountId || acc.subscriptionId || acc.id;
                const isSelected = selectedAccountIds.has(accId);
                const isAws = acc.provider === 'aws';

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectAccount(accId)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? isAws
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                          : 'bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-sm'
                        : 'bg-[#090D16] border-[#1E293B] text-slate-400 hover:text-slate-200 opacity-60'
                    }`}
                  >
                    {isAws ? <AwsLogo className="w-3.5 h-3.5" /> : <AzureLogo className="w-3.5 h-3.5" />}
                    <span>{acc.accountName}</span>
                    <span className="text-[10px] font-mono opacity-60">({acc.accountId || acc.subscriptionId})</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-400 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Toast Feedback */}
      {toast && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between animate-fade-in border ${
            toast.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : toast.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              : 'bg-blue-950/60 border-blue-500/40 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Activity className="w-4 h-4 text-blue-400" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="font-bold opacity-75 hover:opacity-100 ml-4">
            ✕
          </button>
        </div>
      )}

      {/* 4. Filtered Server Table (Requirement 2 & 6) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Active Monitored Cloud Servers</span>
            <span className="text-slate-600">|</span>
            <span>
              Showing <span className="text-blue-400 font-bold">{displayedServers.length}</span> servers from{' '}
              <span className="text-white font-semibold">{selectedAccountIds.size}</span> selected account(s)
            </span>
          </div>
          {loading && <span className="text-slate-400 animate-pulse text-[11px]">Loading real cloud inventory...</span>}
        </div>

        {selectedAccountIds.size === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3 bg-[#090D16] border border-[#1E293B] rounded-xl">
            <Layers className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-white">No Cloud Accounts Selected</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Select one or more AWS or Azure accounts above to view and execute real power actions on their servers.
            </p>
            {filteredAccounts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allIds = new Set(filteredAccounts.map((a) => a.accountId || a.subscriptionId || a.id));
                  setSelectedAccountIds(allIds);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
              >
                <span>Select All ({filteredAccounts.length}) Accounts</span>
              </button>
            )}
          </div>
        ) : displayedServers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3 bg-[#090D16] border border-[#1E293B] rounded-xl">
            <Server className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-white">No Servers Found</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No compute instances or virtual machines were discovered for the selected accounts in region &quot;{selectedRegion}&quot;.
            </p>
            <button
              type="button"
              onClick={() => fetchData(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Retry Cloud Synchronization</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#1E293B] bg-[#090D16]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#111A2E] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1E293B]">
                <tr>
                  <th className="py-3 px-4">Server / VM Name</th>
                  <th className="py-3 px-4">Provider &amp; Account</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">IP Addresses</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">CPU</th>
                  <th className="py-3 px-4">RAM</th>
                  <th className="py-3 px-4">Disk</th>
                  <th className="py-3 px-4">Last Synced</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {displayedServers.map((server) => {
                  const isAws = server.cloudProvider === 'aws';
                  const rawStatus = server.status.toLowerCase();
                  const isRunning = rawStatus === 'running';
                  const isStopped = rawStatus === 'stopped' || rawStatus === 'deallocated';
                  const isTransitioning = rawStatus === 'starting' || rawStatus === 'stopping';
                  const isActionLoading = powerLoadingId === server.id;

                  return (
                    <tr key={server.id} className="hover:bg-[#111A2E]/50 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <Link href={server.detailUrl} className="group block">
                          <div className="font-semibold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1">
                            <span className="truncate max-w-[150px]">{server.name}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[150px]">
                            {server.resourceId}
                          </span>
                        </Link>
                      </td>

                      {/* Provider & Account */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isAws ? <AwsLogo className="w-4 h-4" /> : <AzureLogo className="w-4 h-4" />}
                          <span className="font-medium text-white">{server.accountName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {server.accountId}
                        </span>
                      </td>

                      {/* Region */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {server.region}
                      </td>

                      {/* IP Addresses */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-500 mr-1">PUB:</span>
                          <span className={server.publicIp ? 'text-slate-200' : 'text-slate-600'}>
                            {server.publicIp || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 mr-1">PRIV:</span>
                          <span className={server.privateIp ? 'text-slate-400' : 'text-slate-600'}>
                            {server.privateIp || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Real Status Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isRunning
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : isStopped
                              ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning
                                ? 'bg-emerald-400 animate-pulse'
                                : isStopped
                                ? 'bg-slate-500'
                                : 'bg-amber-400 animate-ping'
                            }`}
                          />
                          <span>{server.status}</span>
                        </span>
                      </td>

                      {/* CPU Usage */}
                      <td className="py-3 px-4">
                        {server.cpuUsage !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  server.cpuUsage > 80 ? 'bg-rose-500' : server.cpuUsage > 50 ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(server.cpuUsage, 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px]">{server.cpuUsage}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* RAM Usage */}
                      <td className="py-3 px-4">
                        {server.memoryUsage !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(server.memoryUsage, 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px]">{server.memoryUsage}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Disk Usage */}
                      <td className="py-3 px-4">
                        {server.diskUsage !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${Math.min(server.diskUsage, 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px]">{server.diskUsage}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Last Synced */}
                      <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                        {server.lastConnected}
                      </td>

                      {/* Real Actions: Start / Stop / View / Refresh */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Real Cloud Start Button */}
                          <button
                            type="button"
                            onClick={() => handlePowerAction(server, 'start')}
                            disabled={isRunning || isTransitioning || isActionLoading}
                            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                              isRunning || isTransitioning
                                ? 'text-slate-600 bg-slate-900/40 border border-slate-800 cursor-not-allowed opacity-40'
                                : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/35 border border-emerald-500/30 cursor-pointer shadow-sm'
                            }`}
                            title={isRunning ? 'Server is already running in cloud' : 'Start instance in cloud'}
                          >
                            <Play className={`w-3 h-3 fill-current ${isActionLoading ? 'animate-spin' : ''}`} />
                            <span>Start</span>
                          </button>

                          {/* Real Cloud Stop Button */}
                          <button
                            type="button"
                            onClick={() => handlePowerAction(server, 'stop')}
                            disabled={isStopped || isTransitioning || isActionLoading}
                            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                              isStopped || isTransitioning
                                ? 'text-slate-600 bg-slate-900/40 border border-slate-800 cursor-not-allowed opacity-40'
                                : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/35 border border-rose-500/30 cursor-pointer shadow-sm'
                            }`}
                            title={isStopped ? 'Server is currently stopped' : 'Stop instance in cloud'}
                          >
                            <Power className={`w-3 h-3 ${isActionLoading ? 'animate-spin' : ''}`} />
                            <span>Stop</span>
                          </button>

                          {/* Individual Refresh */}
                          <button
                            type="button"
                            onClick={() => handleSingleSync(server)}
                            disabled={singleSyncId === server.id}
                            className="p-1 rounded-md bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] transition-colors cursor-pointer"
                            title="Refresh real-time telemetry from cloud"
                          >
                            <RefreshCw className={`w-3 h-3 ${singleSyncId === server.id ? 'animate-spin text-blue-400' : ''}`} />
                          </button>

                          {/* View Link */}
                          <Link
                            href={server.detailUrl}
                            className="px-2 py-1 text-xs font-semibold rounded-md bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================== MODAL: CONNECT AWS ACCOUNT ==================== */}
      {activeModal === 'aws' && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-black/80 backdrop-blur-sm flex justify-center items-center animate-fade-in">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <AwsLogo className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect AWS Account</h3>
                  <p className="text-[11px] text-slate-400">Authenticate securely using AWS IAM Access Keys</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1E293B] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAwsAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Display Name *</label>
                <input
                  type="text"
                  required
                  value={awsForm.accountName}
                  onChange={(e) => setAwsForm({ ...awsForm, accountName: e.target.value })}
                  placeholder="e.g. Production AWS Account"
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">AWS Account ID (Optional)</label>
                <input
                  type="text"
                  value={awsForm.accountId}
                  onChange={(e) => setAwsForm({ ...awsForm, accountId: e.target.value })}
                  placeholder="e.g. 123456789012 (auto-discovered if left blank)"
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">AWS Access Key ID *</label>
                <input
                  type="text"
                  required
                  value={awsForm.accessKeyId}
                  onChange={(e) => setAwsForm({ ...awsForm, accessKeyId: e.target.value })}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">AWS Secret Access Key *</label>
                <div className="relative">
                  <input
                    type={showAwsSecret ? 'text' : 'password'}
                    required
                    value={awsForm.secretAccessKey}
                    onChange={(e) => setAwsForm({ ...awsForm, secretAccessKey: e.target.value })}
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAwsSecret(!showAwsSecret)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showAwsSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Test Connection Diagnostics Feedback */}
              {awsTestResult && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    awsTestResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {awsTestResult.message}
                </div>
              )}

              {awsSubmitError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-xs text-rose-300">
                  {awsSubmitError}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={handleTestAwsConnection}
                  disabled={awsTesting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-amber-400 border border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${awsTesting ? 'animate-spin' : ''}`} />
                  <span>{awsTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal('none')}
                    className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={awsSubmitting}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {awsSubmitting ? 'Connecting...' : 'Connect AWS Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CONNECT AZURE SUBSCRIPTION ==================== */}
      {activeModal === 'azure' && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-black/80 backdrop-blur-sm flex justify-center items-center animate-fade-in">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                  <AzureLogo className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Azure Subscription</h3>
                  <p className="text-[11px] text-slate-400">Authenticate securely via Azure AD Service Principal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1E293B] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAzureSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subscription Display Name *</label>
                <input
                  type="text"
                  required
                  value={azureForm.subscriptionName}
                  onChange={(e) => setAzureForm({ ...azureForm, subscriptionName: e.target.value })}
                  placeholder="e.g. Primary Azure Subscription"
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Azure Subscription ID *</label>
                <input
                  type="text"
                  required
                  value={azureForm.subscriptionId}
                  onChange={(e) => setAzureForm({ ...azureForm, subscriptionId: e.target.value })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Directory (Tenant) ID *</label>
                  <input
                    type="text"
                    required
                    value={azureForm.tenantId}
                    onChange={(e) => setAzureForm({ ...azureForm, tenantId: e.target.value })}
                    placeholder="Tenant GUID"
                    className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Application (Client) ID *</label>
                  <input
                    type="text"
                    required
                    value={azureForm.clientId}
                    onChange={(e) => setAzureForm({ ...azureForm, clientId: e.target.value })}
                    placeholder="App/Client GUID"
                    className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Client Secret (Value) *</label>
                <div className="relative">
                  <input
                    type={showAzureSecret ? 'text' : 'password'}
                    required
                    value={azureForm.clientSecret}
                    onChange={(e) => setAzureForm({ ...azureForm, clientSecret: e.target.value })}
                    placeholder="Client Secret Value"
                    className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-3 py-2 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAzureSecret(!showAzureSecret)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showAzureSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Test Connection Diagnostics Feedback */}
              {azureTestResult && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    azureTestResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {azureTestResult.message}
                </div>
              )}

              {azureSubmitError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-xs text-rose-300">
                  {azureSubmitError}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={handleTestAzureConnection}
                  disabled={azureTesting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-sky-400 border border-sky-500/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${azureTesting ? 'animate-spin' : ''}`} />
                  <span>{azureTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal('none')}
                    className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={azureSubmitting}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {azureSubmitting ? 'Connecting...' : 'Connect Azure Subscription'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
