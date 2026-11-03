'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  Power,
  Shield,
  Key,
  Globe,
  X,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { RegionSelector } from '@/components/dashboard/RegionSelector';
import {
  ALL_AWS_REGIONS,
  ALL_AZURE_REGIONS,
  fetchAwsRegions,
  fetchAzureRegions,
} from '@/services/regionDiscoveryService';
import { useMonitoring } from '@/context/MonitoringContext';
import { DiscoveredRegion, AWSAccount, AzureSubscription } from '@/types/monitoring';
import { testAzureConnection } from '@/services/api';

export default function CloudAccountsPage() {
  const {
    cloudProvider,
    awsAccounts,
    azureSubscriptions,
    addAwsAccount,
    addAzureSubscription,
    updateAwsAccountRegions,
    updateAzureSubscriptionRegions,
    disconnectAwsAccount,
    disconnectAzureSubscription,
  } = useMonitoring();

  const [activeModal, setActiveModal] = useState<'none' | 'aws' | 'azure'>('none');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  const [validating, setValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState<boolean | null>(null);
  const [validationMsg, setValidationMsg] = useState('');

  // Dynamic discovered regions state - All regions enabled by default
  const [discoveredAwsRegions, setDiscoveredAwsRegions] = useState<DiscoveredRegion[]>(ALL_AWS_REGIONS);
  const [discoveredAzureRegions, setDiscoveredAzureRegions] = useState<DiscoveredRegion[]>(
    ALL_AZURE_REGIONS.map((r) => ({ ...r, enabled: true }))
  );
  const [loadingAwsDiscovery, setLoadingAwsDiscovery] = useState(false);
  const [loadingAzureDiscovery, setLoadingAzureDiscovery] = useState(false);
  const [awsDiscoveryError, setAwsDiscoveryError] = useState<string | null>(null);
  const [azureDiscoveryError, setAzureDiscoveryError] = useState<string | null>(null);

  // AWS Form State (Account ID, Access Key ID, Secret Access Key)
  const [awsForm, setAwsForm] = useState({
    accountName: '',
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    regions: ALL_AWS_REGIONS.map((r) => r.code),
  });
  const [showAwsSecretKey, setShowAwsSecretKey] = useState(false);

  // Azure Form State - All supported regions selected by default
  const [azureForm, setAzureForm] = useState({
    subscriptionName: '',
    subscriptionId: '',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    authType: 'client_secret' as 'client_secret' | 'managed_identity',
    regions: ALL_AZURE_REGIONS.map((r) => r.code),
  });

  const handleValidateAws = async () => {
    if (!awsForm.accessKeyId.trim() || !awsForm.secretAccessKey.trim()) {
      setValidationSuccess(false);
      setValidationMsg('Please enter both AWS Access Key ID and Secret Access Key.');
      return;
    }

    setValidating(true);
    setValidationSuccess(null);
    setValidationMsg('Validating AWS IAM credentials via STS GetCallerIdentity & EC2 DescribeRegions...');

    try {
      const res = await fetch('/api/aws/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId: awsForm.accessKeyId.trim(),
          secretAccessKey: awsForm.secretAccessKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AWS authentication failed.');
      }

      if (data.regions && Array.isArray(data.regions) && data.regions.length > 0) {
        setDiscoveredAwsRegions(
          data.regions.map((r: any) => ({
            name: r.name || r.code,
            code: r.code,
            status: 'available',
            optInStatus: 'opt-in-not-required',
            geography: 'Global',
            enabled: true,
          }))
        );
      }

      // If account ID was not entered, auto-fill it from verified STS caller identity
      if (data.accountId && (!awsForm.accountId || awsForm.accountId === '1234-5678-9012')) {
        setAwsForm((prev) => ({ ...prev, accountId: data.accountId }));
      }

      setValidating(false);
      setValidationSuccess(true);
      setValidationMsg(
        `✓ AWS Credentials Verified! Connected Account ID: ${data.accountId || awsForm.accountId}. Discovered ${data.regionsCount || 31} regions.`
      );
    } catch (err: any) {
      setValidating(false);
      setValidationSuccess(false);
      setValidationMsg(`Validation failed: ${err.message || 'Could not verify AWS Access Keys.'}`);
    }
  };

  const handleSaveAws = async () => {
    if (editingAccountId) {
      updateAwsAccountRegions(editingAccountId, awsForm.regions);
      setActiveModal('none');
      setEditingAccountId(null);
      return;
    }

    if (!awsForm.accountName || !awsForm.accessKeyId || !awsForm.secretAccessKey) return;

    const ok = await addAwsAccount({
      accountName: awsForm.accountName.trim(),
      accountId: awsForm.accountId.trim() || 'aws-account',
      accessKeyId: awsForm.accessKeyId.trim(),
      secretAccessKey: awsForm.secretAccessKey.trim(),
      enabledRegions: awsForm.regions,
    });

    if (ok) {
      setActiveModal('none');
      setAwsForm({
        accountName: '',
        accountId: '',
        accessKeyId: '',
        secretAccessKey: '',
        regions: ALL_AWS_REGIONS.map((r) => r.code),
      });
      setValidationSuccess(null);
      setEditingAccountId(null);
    }
  };

  const handleValidateAzure = async () => {
    if (!azureForm.subscriptionId || !azureForm.tenantId || !azureForm.clientId || !azureForm.clientSecret) {
      setValidationSuccess(false);
      setValidationMsg('Validation failed: Subscription ID, Tenant ID, Client ID, and Client Secret are all required.');
      return;
    }

    setValidating(true);
    setValidationSuccess(null);
    setValidationMsg('Authenticating with Azure Active Directory and verifying subscription access...');

    try {
      const res = await testAzureConnection({
        subscriptionId: azureForm.subscriptionId,
        tenantId: azureForm.tenantId,
        clientId: azureForm.clientId,
        clientSecret: azureForm.clientSecret,
      });

      if (!res.success) {
        setValidating(false);
        setValidationSuccess(false);
        setValidationMsg(res.error || 'Azure validation failed: Access Denied or Invalid Credentials');
        return;
      }

      // Discover all real supported regions
      const discovered = await fetchAzureRegions(azureForm.subscriptionId);
      const allEnabled = discovered.map((r) => ({ ...r, enabled: true }));
      setDiscoveredAzureRegions(allEnabled);

      // Select ALL regions by default
      setAzureForm((prev) => ({
        ...prev,
        regions: discovered.map((r) => r.code),
      }));

      setValidating(false);
      setValidationSuccess(true);
      setValidationMsg(
        `✓ Azure Service Principal authenticated! Verified subscription "${res.subscription?.displayName || azureForm.subscriptionId}". Discovered ${discovered.length} locations (All enabled by default).`
      );
    } catch (err: any) {
      setValidating(false);
      setValidationSuccess(false);
      setValidationMsg(`Azure Connection Error: ${err.message || 'Could not verify Azure subscription.'}`);
    }
  };

  const handleSaveAzure = async () => {
    if (!azureForm.subscriptionName || !azureForm.subscriptionId || !azureForm.tenantId || !azureForm.clientId) {
      setValidationSuccess(false);
      setValidationMsg('Please fill in Subscription Name, Subscription ID, Tenant ID, and Client ID.');
      return;
    }

    setValidating(true);
    setValidationMsg('Connecting subscription and discovering cloud resources...');

    try {
      if (editingSubId) {
        await updateAzureSubscriptionRegions(editingSubId, azureForm.regions);
        setActiveModal('none');
        setEditingSubId(null);
        setValidating(false);
        return;
      }

      await addAzureSubscription({
        subscriptionName: azureForm.subscriptionName,
        subscriptionId: azureForm.subscriptionId,
        tenantId: azureForm.tenantId,
        clientId: azureForm.clientId,
        clientSecret: azureForm.clientSecret,
        authType: azureForm.authType,
        enabledRegions: azureForm.regions,
      });

      setActiveModal('none');
      setAzureForm({
        subscriptionName: '',
        subscriptionId: '',
        tenantId: '',
        clientId: '',
        clientSecret: '',
        authType: 'client_secret',
        regions: ALL_AZURE_REGIONS.map((r) => r.code),
      });
      setValidationSuccess(null);
      setEditingSubId(null);
    } catch (err: any) {
      setValidationSuccess(false);
      setValidationMsg(err.message || 'Failed to save Azure subscription.');
    } finally {
      setValidating(false);
    }
  };

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
                <span className="text-white">Cloud Accounts</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Connected Cloud Accounts & Subscriptions
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {(cloudProvider === 'all' || cloudProvider === 'aws') && (
                <button
                  onClick={() => {
                    setEditingAccountId(null);
                    setAwsForm({
                      accountName: '',
                      accountId: '',
                      accessKeyId: '',
                      secretAccessKey: '',
                      regions: ['us-east-1', 'us-west-2'],
                    });
                    setActiveModal('aws');
                    setValidationSuccess(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FF9900]/15 hover:bg-[#FF9900]/25 text-[#FF9900] border border-[#FF9900]/30 rounded-lg transition-colors shadow-sm"
                >
                  <AwsLogo className="w-4 h-3" />
                  <span>Connect AWS Account</span>
                </button>
              )}

              {(cloudProvider === 'all' || cloudProvider === 'azure') && (
                <button
                  onClick={() => {
                    setEditingSubId(null);
                    setAzureForm({
                      subscriptionName: '',
                      subscriptionId: '',
                      tenantId: '',
                      clientId: '',
                      clientSecret: '',
                      authType: 'client_secret',
                      regions: ['eastus', 'westeurope'],
                    });
                    setActiveModal('azure');
                    setValidationSuccess(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0089D6]/15 hover:bg-[#0089D6]/25 text-[#5EA0EF] border border-[#0089D6]/30 rounded-lg transition-colors shadow-sm"
                >
                  <AzureLogo className="w-3.5 h-3.5" />
                  <span>Connect Azure Subscription</span>
                </button>
              )}
            </div>
          </div>

          {/* Accounts Grid */}
          <div className={`grid gap-5 ${cloudProvider === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* AWS Accounts Section */}
            {(cloudProvider === 'all' || cloudProvider === 'aws') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AwsLogo className="w-5 h-4" />
                    <span>AWS Accounts ({awsAccounts.length})</span>
                  </h3>
                </div>

              {awsAccounts.map((acc) => {
                const isConnected = acc.status === 'Connected';

                return (
                  <div
                    key={acc.id}
                    className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#FF9900]/15 text-[#FF9900] flex items-center justify-center flex-shrink-0">
                          <AwsLogo className="w-6 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {acc.accountName}
                          </h4>
                          <span className="text-xs font-mono text-slate-400">
                            ID: {acc.accountId}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isConnected
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isConnected ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{acc.status}</span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#1E293B] space-y-2 text-xs">
                      <div className="text-slate-400 font-mono truncate flex items-center justify-between">
                        <span>Account ID: <span className="text-slate-200">{acc.accountId}</span></span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">IAM Access Keys</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <div>
                          Active Regions ({acc.enabledRegions.length}):{' '}
                          <span className="text-white font-semibold">
                            {acc.enabledRegions.join(', ')}
                          </span>
                        </div>
                        <div>Last Sync: {acc.lastSync}</div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingAccountId(acc.id);
                          setAwsForm({
                            accountName: acc.accountName,
                            accountId: acc.accountId,
                            accessKeyId: acc.accessKeyId || '••••••••',
                            secretAccessKey: '••••••••',
                            regions: [...acc.enabledRegions],
                          });
                          setValidationSuccess(null);
                          setActiveModal('aws');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-sky-500/15 hover:text-sky-300 text-slate-300 rounded border border-[#1E293B] transition-colors flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5 text-[#FF9900]" />
                        <span>Manage Regions</span>
                      </button>

                      {isConnected && (
                        <button
                          onClick={() => disconnectAwsAccount(acc.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 rounded border border-[#1E293B] transition-colors flex items-center gap-1"
                        >
                          <Power className="w-3 h-3" />
                          <span>Disconnect</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {awsAccounts.length === 0 && (
                <div className="p-8 text-center bg-[#111A2E] border border-[#1E293B] rounded-xl text-xs text-slate-400 space-y-3">
                  <p>No AWS accounts connected.</p>
                  <button
                    onClick={() => {
                      setEditingAccountId(null);
                      setAwsForm({
                        accountName: '',
                        accountId: '',
                        accessKeyId: '',
                        secretAccessKey: '',
                        regions: ['us-east-1', 'us-west-2'],
                      });
                      setActiveModal('aws');
                      setValidationSuccess(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30 rounded-lg font-semibold hover:bg-[#FF9900]/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect AWS Account</span>
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Azure Subscriptions Section */}
            {(cloudProvider === 'all' || cloudProvider === 'azure') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AzureLogo className="w-4 h-4 text-[#0089D6]" />
                    <span>Azure Subscriptions ({azureSubscriptions.length})</span>
                  </h3>
                </div>

              {azureSubscriptions.map((sub) => {
                const isConnected = sub.status === 'Connected';

                return (
                  <div
                    key={sub.id}
                    className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0089D6]/15 text-[#0089D6] flex items-center justify-center flex-shrink-0">
                          <AzureLogo className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {sub.subscriptionName}
                          </h4>
                          <span className="text-xs font-mono text-slate-400 truncate max-w-[200px] block">
                            {sub.subscriptionId}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isConnected
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isConnected ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{sub.status}</span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#1E293B] space-y-2 text-xs">
                      <div className="text-slate-400 font-mono truncate">
                        Tenant ID: <span className="text-slate-200">{sub.tenantId}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <div>
                          Active Regions ({sub.enabledRegions.length}):{' '}
                          <span className="text-white font-semibold">
                            {sub.enabledRegions.join(', ')}
                          </span>
                        </div>
                        <div>Last Sync: {sub.lastSync}</div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingSubId(sub.id);
                          setAzureForm({
                            subscriptionName: sub.subscriptionName,
                            subscriptionId: sub.subscriptionId,
                            tenantId: sub.tenantId,
                            clientId: sub.clientId || '',
                            clientSecret: '••••••••',
                            authType: sub.authType,
                            regions: [...sub.enabledRegions],
                          });
                          setValidationSuccess(null);
                          setActiveModal('azure');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-sky-500/15 hover:text-sky-300 text-slate-300 rounded border border-[#1E293B] transition-colors flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5 text-[#0089D6]" />
                        <span>Manage Regions</span>
                      </button>

                      {isConnected && (
                        <button
                          onClick={() => disconnectAzureSubscription(sub.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#18233C] hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 rounded border border-[#1E293B] transition-colors flex items-center gap-1"
                        >
                          <Power className="w-3 h-3" />
                          <span>Disconnect</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {azureSubscriptions.length === 0 && (
                <div className="p-8 text-center bg-[#111A2E] border border-[#1E293B] rounded-xl text-xs text-slate-400 space-y-3">
                  <p>No Azure subscriptions connected.</p>
                  <button
                    onClick={() => {
                      setEditingSubId(null);
                      setAzureForm({
                        subscriptionName: '',
                        subscriptionId: '',
                        tenantId: '',
                        clientId: '',
                        clientSecret: '',
                        authType: 'client_secret',
                        regions: ['eastus', 'westeurope'],
                      });
                      setActiveModal('azure');
                      setValidationSuccess(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0089D6]/20 text-[#5EA0EF] border border-[#0089D6]/30 rounded-lg font-semibold hover:bg-[#0089D6]/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect Azure Subscription</span>
                  </button>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Modal: Connect / Manage AWS Account */}
          {activeModal === 'aws' && (
            <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-black/75 backdrop-blur-sm flex justify-center items-start">
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-4xl p-6 space-y-4 shadow-2xl my-8">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                  <div className="flex items-center gap-2.5">
                    <AwsLogo className="w-6 h-5" />
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {editingAccountId ? 'Manage AWS Regions & Configuration' : 'Connect AWS Account (IAM Access Keys)'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {editingAccountId ? 'Restore or update monitored regions for this AWS account' : 'Authenticate securely using your AWS Account ID, Access Key ID, and Secret Access Key'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveModal('none');
                      setEditingAccountId(null);
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Row 1: Account Display Name & AWS Account ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Account Display Name <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Production AWS (Primary)"
                        value={awsForm.accountName}
                        onChange={(e) => setAwsForm({ ...awsForm, accountName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        AWS Account ID <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1234-5678-9012"
                        value={awsForm.accountId}
                        onChange={(e) => setAwsForm({ ...awsForm, accountId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: AWS Access Key ID & AWS Secret Access Key */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        AWS Access Key ID <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        value={awsForm.accessKeyId}
                        onChange={(e) => setAwsForm({ ...awsForm, accessKeyId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono focus:outline-none focus:border-amber-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        AWS Secret Access Key <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showAwsSecretKey ? 'text' : 'password'}
                          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                          value={awsForm.secretAccessKey}
                          onChange={(e) => setAwsForm({ ...awsForm, secretAccessKey: e.target.value })}
                          className="w-full px-3 py-2 pr-9 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAwsSecretKey(!showAwsSecretKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showAwsSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Searchable Region Selector */}
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1.5">
                      Monitored AWS Regions (Dynamic Discovery via EC2 DescribeRegions)
                    </label>
                    <RegionSelector
                      cloud="aws"
                      regions={discoveredAwsRegions}
                      selectedCodes={awsForm.regions}
                      onChange={(selected) => setAwsForm({ ...awsForm, regions: selected })}
                      isLoading={loadingAwsDiscovery}
                      onRefresh={async () => {
                        setLoadingAwsDiscovery(true);
                        setAwsDiscoveryError(null);
                        try {
                          const regs = await fetchAwsRegions(awsForm.accountId);
                          setDiscoveredAwsRegions(regs);
                        } catch (e: any) {
                          setAwsDiscoveryError(e.message || 'Discovery failed');
                        } finally {
                          setLoadingAwsDiscovery(false);
                        }
                      }}
                      error={awsDiscoveryError}
                    />
                  </div>

                  {/* Live Validation Feedback */}
                  {validationSuccess !== null && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium border flex items-start gap-2 ${
                        validationSuccess
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-800 text-rose-300'
                      }`}
                    >
                      {validationSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{validationMsg}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[#1E293B] pt-4 flex-shrink-0">
                  <button
                    onClick={handleValidateAws}
                    disabled={validating || !awsForm.accessKeyId || !awsForm.secretAccessKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] text-slate-200 text-xs font-semibold disabled:opacity-40"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
                    <span>{validating ? 'Verifying...' : 'Verify Access Keys'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveModal('none');
                        setEditingAccountId(null);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAws}
                      disabled={!awsForm.accountName || (!editingAccountId && (!awsForm.accessKeyId || !awsForm.secretAccessKey))}
                      className="px-4 py-1.5 text-xs font-bold bg-[#FF9900] hover:bg-[#FF8800] text-black rounded-lg transition-colors shadow disabled:opacity-40"
                    >
                      {editingAccountId ? 'Update Regions' : 'Save Account'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Connect / Manage Azure Subscription */}
          {activeModal === 'azure' && (
            <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-black/75 backdrop-blur-sm flex justify-center items-start">
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-4xl p-6 space-y-4 shadow-2xl my-8">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                  <div className="flex items-center gap-2.5">
                    <AzureLogo className="w-5 h-5" />
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {editingSubId ? 'Manage Azure Regions & Configuration' : 'Connect Azure Subscription (Service Principal)'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {editingSubId ? 'Restore or update monitored regions for this subscription' : 'Azure Resource Manager Locations API with dynamic discovery'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveModal('none');
                      setEditingSubId(null);
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Subscription Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Corporate Azure Enterprise"
                      value={azureForm.subscriptionName}
                      onChange={(e) => setAzureForm({ ...azureForm, subscriptionName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Subscription ID
                      </label>
                      <input
                        type="text"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={azureForm.subscriptionId}
                        onChange={(e) => setAzureForm({ ...azureForm, subscriptionId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Tenant ID (Directory)
                      </label>
                      <input
                        type="text"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={azureForm.tenantId}
                        onChange={(e) => setAzureForm({ ...azureForm, tenantId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Client ID (Application ID)
                      </label>
                      <input
                        type="text"
                        placeholder="App registration client ID"
                        value={azureForm.clientId}
                        onChange={(e) => setAzureForm({ ...azureForm, clientId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Client Secret (Securely encrypted)
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••••••••••"
                        value={azureForm.clientSecret}
                        onChange={(e) => setAzureForm({ ...azureForm, clientSecret: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E293B] text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Dynamic Searchable Region Selector */}
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1.5">
                      Monitored Azure Locations (Dynamic Discovery via ARM Locations API)
                    </label>
                    <RegionSelector
                      cloud="azure"
                      regions={discoveredAzureRegions}
                      selectedCodes={azureForm.regions}
                      onChange={(selected) => setAzureForm({ ...azureForm, regions: selected })}
                      isLoading={loadingAzureDiscovery}
                      onRefresh={async () => {
                        setLoadingAzureDiscovery(true);
                        setAzureDiscoveryError(null);
                        try {
                          const regs = await fetchAzureRegions(azureForm.subscriptionId);
                          setDiscoveredAzureRegions(regs);
                        } catch (e: any) {
                          setAzureDiscoveryError(e.message || 'Discovery failed');
                        } finally {
                          setLoadingAzureDiscovery(false);
                        }
                      }}
                      error={azureDiscoveryError}
                    />
                  </div>

                  {validationSuccess !== null && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium border flex items-start gap-2 ${
                        validationSuccess
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-800 text-rose-300'
                      }`}
                    >
                      {validationSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{validationMsg}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[#1E293B] pt-4 flex-shrink-0">
                  <button
                    onClick={handleValidateAzure}
                    disabled={validating || !azureForm.subscriptionId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18233C] hover:bg-[#202E4E] text-slate-200 text-xs font-semibold disabled:opacity-40"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
                    <span>{validating ? 'Discovering...' : 'Test Azure Connection'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveModal('none');
                        setEditingSubId(null);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAzure}
                      disabled={!azureForm.subscriptionName || !azureForm.subscriptionId}
                      className="px-4 py-1.5 text-xs font-bold bg-[#0089D6] hover:bg-[#0078D4] text-white rounded-lg transition-colors shadow disabled:opacity-40"
                    >
                      {editingSubId ? 'Update Regions' : 'Save Subscription'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
