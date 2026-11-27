'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  CloudProvider,
  TimeRange,
  AWSAccount,
  AzureSubscription,
  RegionInfo,
  EC2InstanceDetail,
  AzureVirtualMachine,
  DockerContainer,
  K8sCluster,
  K8sPod,
  AlertItem,
  OverviewMetrics,
  SyncStatusInfo,
} from '@/types/monitoring';

import { ALL_AWS_REGIONS, ALL_AZURE_REGIONS } from '@/services/regionDiscoveryService';

interface MonitoringContextType {
  cloudProvider: CloudProvider;
  setCloudProvider: (p: CloudProvider) => void;
  awsAccounts: AWSAccount[];
  selectedAwsAccountId: string;
  setSelectedAwsAccountId: (id: string) => void;
  azureSubscriptions: AzureSubscription[];
  selectedAzureSubId: string;
  setSelectedAzureSubId: (id: string) => void;
  regions: RegionInfo[];
  toggleRegion: (regionId: string) => void;
  selectedRegion: string;
  setSelectedRegion: (r: string) => void;
  timeRange: TimeRange;
  setTimeRange: (t: TimeRange) => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  isRefreshing: boolean;
  triggerRefresh: () => void;
  refreshInterval: number;
  setRefreshInterval: (sec: number) => void;
  lastRefreshedAt: Date | null;
  refreshError: string | null;
  syncStatus: SyncStatusInfo;
  isSyncing: boolean;
  syncNow: (provider?: string) => Promise<void>;

  // Account management
  addAwsAccount: (acc: Omit<AWSAccount, 'id' | 'resourcesCount' | 'lastSync' | 'status'>) => Promise<boolean>;
  addAzureSubscription: (sub: Omit<AzureSubscription, 'id' | 'resourcesCount' | 'lastSync' | 'status'> & { clientSecret?: string }) => Promise<boolean>;
  updateAwsAccountRegions: (id: string, regions: string[]) => void;
  updateAzureSubscriptionRegions: (id: string, regions: string[]) => Promise<void>;
  disconnectAwsAccount: (id: string) => void;
  disconnectAzureSubscription: (id: string) => Promise<void>;
  removeAwsAccount: (id: string) => Promise<void>;
  removeAzureSubscription: (id: string) => Promise<void>;

  // Dynamic filtered real resources
  filteredEC2Instances: EC2InstanceDetail[];
  filteredAzureVMs: AzureVirtualMachine[];
  filteredDockerContainers: DockerContainer[];
  filteredK8sClusters: K8sCluster[];
  filteredK8sPods: K8sPod[];
  filteredAlerts: AlertItem[];
  customServers: any[];
  overviewMetrics: OverviewMetrics;

  // Gemini AI DevOps Copilot State
  isGeminiDrawerOpen: boolean;
  geminiTargetServer: { id?: string; name?: string; host?: string; provider?: string } | null;
  openGeminiDrawer: (server?: { id?: string; name?: string; host?: string; provider?: string } | null) => void;
  closeGeminiDrawer: () => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

// Initial real catalog of supported regions (All enabled by default)
const allDiscoveredRegionsList: RegionInfo[] = [
  ...ALL_AWS_REGIONS.map((r) => ({
    id: `reg-aws-${r.code}`,
    region: r.code,
    displayName: r.name,
    cloud: 'aws' as const,
    enabled: true,
    resourceCount: 0,
    color: '#F97316',
  })),
  ...ALL_AZURE_REGIONS.map((r) => ({
    id: `reg-azure-${r.code}`,
    region: r.code,
    displayName: r.name,
    cloud: 'azure' as const,
    enabled: true,
    resourceCount: 0,
    color: '#0089D6',
  })),
];

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  const [cloudProvider, setCloudProviderState] = useState<CloudProvider>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monitoring_cloud_provider') as CloudProvider;
      if (saved && ['all', 'aws', 'azure'].includes(saved)) return saved;
    }
    return 'all';
  });

  // Zero dummy data - starts strictly empty until user connects real cloud accounts
  const [awsAccounts, setAwsAccounts] = useState<AWSAccount[]>([]);
  const [selectedAwsAccountId, setSelectedAwsAccountId] = useState<string>('all');
  const [azureSubscriptions, setAzureSubscriptions] = useState<AzureSubscription[]>([]);
  const [selectedAzureSubId, setSelectedAzureSubId] = useState<string>('all');
  const [regions, setRegions] = useState<RegionInfo[]>(allDiscoveredRegionsList);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(1); // 1 second real-time auto-refresh
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    lastSyncAt: null,
    status: 'synced',
    freshness: 'Just now',
    resourcesCount: { aws: 0, azure: 0, docker: 0, kubernetes: 0 },
  });

  // Concurrency and debounce guards
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchTimestampRef = useRef<number>(0);
  const deletedAccountIdsRef = useRef<Set<string>>(new Set());

  // Real discovered infrastructure
  const [azureVMs, setAzureVMs] = useState<AzureVirtualMachine[]>([]);
  const [ec2Instances, setEc2Instances] = useState<EC2InstanceDetail[]>([]);
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>([]);
  const [k8sClusters, setK8sClusters] = useState<K8sCluster[]>([]);
  const [k8sPods, setK8sPods] = useState<K8sPod[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [customServers, setCustomServers] = useState<any[]>([]);

  // Gemini AI DevOps Copilot state
  const [isGeminiDrawerOpen, setIsGeminiDrawerOpen] = useState<boolean>(false);
  const [geminiTargetServer, setGeminiTargetServer] = useState<{ id?: string; name?: string; host?: string; provider?: string } | null>(null);

  const openGeminiDrawer = useCallback((server?: { id?: string; name?: string; host?: string; provider?: string } | null) => {
    setGeminiTargetServer(server || null);
    setIsGeminiDrawerOpen(true);
  }, []);

  const closeGeminiDrawer = useCallback(() => {
    setIsGeminiDrawerOpen(false);
  }, []);

  // Load real subscriptions, AWS accounts, real VMs, and real alerts from Next.js Route Handlers
  const loadRealData = useCallback(async (silent = false) => {
    // Prevent overlapping / duplicate simultaneous API calls
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsRefreshing(true);

    let hadSuccess = false;
    try {
      const fetchWithTimeout = async (url: string) => {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 12000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(tid);
          return res;
        } catch {
          clearTimeout(tid);
          return null;
        }
      };

      const [subsRes, awsRes, azureVmsRes, ec2Res, alertsRes, dockerRes, k8sClustersRes, k8sPodsRes, serversRes, syncRes] = await Promise.all([
        fetchWithTimeout('/api/azure/subscriptions'),
        fetchWithTimeout('/api/cloud-accounts?provider=aws'),
        fetchWithTimeout('/api/azure/vms'),
        fetchWithTimeout('/api/aws/ec2'),
        fetchWithTimeout('/api/alerts'),
        fetchWithTimeout('/api/docker/containers'),
        fetchWithTimeout('/api/kubernetes/clusters'),
        fetchWithTimeout('/api/kubernetes/pods'),
        fetchWithTimeout('/api/servers'),
        fetchWithTimeout('/api/sync'),
      ]);

      if (subsRes && subsRes.ok) {
        const subs = await subsRes.json();
        if (Array.isArray(subs)) {
          setAzureSubscriptions(
            subs.filter(
              (s: any) =>
                !deletedAccountIdsRef.current.has(s.id) &&
                !deletedAccountIdsRef.current.has(s.subscriptionId)
            )
          );
        }
        hadSuccess = true;
      }

      if (awsRes && awsRes.ok) {
        const accs = await awsRes.json();
        if (Array.isArray(accs)) {
          setAwsAccounts(
            accs.filter(
              (a: any) =>
                !deletedAccountIdsRef.current.has(a.id) &&
                !deletedAccountIdsRef.current.has(a.accountId)
            )
          );
        }
        hadSuccess = true;
      }

      if (azureVmsRes && azureVmsRes.ok) {
        const vms = await azureVmsRes.json();
        if (Array.isArray(vms)) {
          setAzureVMs(
            vms.filter((v: any) => !deletedAccountIdsRef.current.has(v.subscriptionId))
          );
        }
        hadSuccess = true;
      }

      if (ec2Res && ec2Res.ok) {
        const ec2 = await ec2Res.json();
        if (Array.isArray(ec2)) {
          setEc2Instances(
            ec2.filter((e: any) => !deletedAccountIdsRef.current.has(e.accountId))
          );
        }
        hadSuccess = true;
      }

      if (alertsRes && alertsRes.ok) {
        const alts = await alertsRes.json();
        if (Array.isArray(alts)) setAlerts(alts);
        hadSuccess = true;
      }

      if (dockerRes && dockerRes.ok) {
        const containers = await dockerRes.json();
        if (Array.isArray(containers)) setDockerContainers(containers);
        hadSuccess = true;
      }

      if (k8sClustersRes && k8sClustersRes.ok) {
        const clusters = await k8sClustersRes.json();
        if (Array.isArray(clusters)) setK8sClusters(clusters);
        hadSuccess = true;
      }

      if (k8sPodsRes && k8sPodsRes.ok) {
        const pods = await k8sPodsRes.json();
        if (Array.isArray(pods)) setK8sPods(pods);
        hadSuccess = true;
      }

      if (serversRes && serversRes.ok) {
        const srvs = await serversRes.json();
        if (Array.isArray(srvs)) setCustomServers(srvs);
        hadSuccess = true;
      }

      if (syncRes && syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData && syncData.status) {
          setSyncStatus(syncData);
        }
        hadSuccess = true;
      }

      if (hadSuccess) {
        const now = new Date();
        setLastRefreshedAt(now);
        setRefreshError(null);
        lastFetchTimestampRef.current = Date.now();
      } else {
        setRefreshError('Network timeout or server unavailable. Preserving latest cached data.');
      }
    } catch (e: any) {
      console.warn('Real data sync note:', e);
      setRefreshError('Failed to refresh latest data; displaying cached infrastructure.');
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  // Initial load on page mount
  useEffect(() => {
    setSyncStatus((prev) => ({
      ...prev,
      lastSyncAt: prev.lastSyncAt || new Date().toISOString(),
    }));
    loadRealData();
  }, [loadRealData]);

  // Periodic automatic refresh every 30 seconds (configurable)
  useEffect(() => {
    if (!isLive || refreshInterval <= 0) return;
    const interval = setInterval(() => {
      loadRealData(true);
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [isLive, refreshInterval, loadRealData]);

  // Tab visibility and focus listener: auto-refresh when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastFetchTimestampRef.current;
        if (elapsed > 10000) {
          loadRealData(false);
        }
      }
    };

    const handleFocus = () => {
      const elapsed = Date.now() - lastFetchTimestampRef.current;
      if (elapsed > 10000) {
        loadRealData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadRealData]);

  // Set cloud provider with strict isolation and filter reset
  const setCloudProvider = (p: CloudProvider) => {
    setCloudProviderState(p);
    if (typeof window !== 'undefined') {
      localStorage.setItem('monitoring_cloud_provider', p);
    }

    if (p === 'aws') {
      setSelectedAzureSubId('all');
      setSelectedRegion((prev) => {
        if (prev === 'all') return 'all';
        const reg = regions.find((r) => r.region === prev);
        return reg && reg.cloud === 'azure' ? 'all' : prev;
      });
    } else if (p === 'azure') {
      setSelectedAwsAccountId('all');
      setSelectedRegion((prev) => {
        if (prev === 'all') return 'all';
        const reg = regions.find((r) => r.region === prev);
        return reg && reg.cloud === 'aws' ? 'all' : prev;
      });
    }
  };

  const toggleRegion = (regionId: string) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === regionId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    await loadRealData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const syncNow = async (provider?: string) => {
    setIsSyncing(true);
    setSyncStatus((prev) => ({
      ...prev,
      status: 'syncing',
      freshness: 'Syncing...',
    }));
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider || 'all' }),
      });
      const nowIso = new Date().toISOString();
      setSyncStatus((prev) => ({
        ...prev,
        lastSyncAt: nowIso,
        status: 'synced',
        freshness: 'Just now',
      }));
      await loadRealData(true);
    } catch (e) {
      console.warn('Reconciliation sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add AWS Account
  const addAwsAccount = async (
    data: Omit<AWSAccount, 'id' | 'resourcesCount' | 'lastSync' | 'status'>
  ) => {
    try {
      const res = await fetch('/api/cloud-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'aws',
          accountName: data.accountName,
          accountId: data.accountId,
          accessKeyId: data.accessKeyId,
          secretAccessKey: data.secretAccessKey,
          roleArn: data.roleArn,
          regions: data.enabledRegions,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setAwsAccounts((prev) => [...prev.filter((a) => a.accountId !== created.accountId), created]);
        await loadRealData();
        return true;
      }
    } catch (e) {
      console.warn('AWS account save note:', e);
    }
    return false;
  };

  // Add Real Azure Subscription
  const addAzureSubscription = async (
    data: Omit<AzureSubscription, 'id' | 'resourcesCount' | 'lastSync' | 'status'> & { clientSecret?: string }
  ) => {
    try {
      const res = await fetch('/api/azure/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to save subscription`);
      }

      const created = await res.json();
      setAzureSubscriptions((prev) => [...prev.filter((s) => s.subscriptionId !== created.subscriptionId), created]);

      // Automatically trigger real resource discovery
      await loadRealData();
      return true;
    } catch (e: any) {
      console.error('Subscription save failed:', e.message);
      throw e;
    }
  };

  const updateAwsAccountRegions = (id: string, newRegions: string[]) => {
    setAwsAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id || acc.accountId === id
          ? { ...acc, enabledRegions: newRegions }
          : acc
      )
    );
  };

  const updateAzureSubscriptionRegions = async (id: string, newRegions: string[]) => {
    setAzureSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === id || sub.subscriptionId === id
          ? { ...sub, enabledRegions: newRegions, selectedRegions: newRegions }
          : sub
      )
    );

    try {
      await fetch(`/api/azure/subscriptions/${id}/regions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regions: newRegions }),
      });
      await loadRealData();
    } catch (e) {
      console.warn('Update regions note:', e);
    }
  };

  const disconnectAwsAccount = async (id: string) => {
    setAwsAccounts((prev) =>
      prev.map((acc) => (acc.id === id || acc.accountId === id ? { ...acc, status: 'Disconnected' } : acc))
    );
    try {
      await fetch(`/api/cloud-accounts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'aws', id, status: 'Disconnected' }),
      });
      await loadRealData();
    } catch (e) {
      console.warn('Disconnect AWS note:', e);
    }
  };

  const disconnectAzureSubscription = async (id: string) => {
    setAzureSubscriptions((prev) =>
      prev.map((sub) => (sub.id === id || sub.subscriptionId === id ? { ...sub, status: 'Disconnected' } : sub))
    );

    try {
      await fetch(`/api/azure/subscriptions/${encodeURIComponent(id)}/disconnect`, { method: 'POST' });
      await fetch(`/api/cloud-accounts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'azure', id, status: 'Disconnected' }),
      });
      await loadRealData();
    } catch (e) {
      console.warn('Disconnect note:', e);
    }
  };

  const removeAwsAccount = async (id: string) => {
    // 1. Instantly record in deleted set
    deletedAccountIdsRef.current.add(id);
    const target = awsAccounts.find((a) => a.id === id || a.accountId === id);
    if (target?.accountId) deletedAccountIdsRef.current.add(target.accountId);
    if (target?.id) deletedAccountIdsRef.current.add(target.id);

    // 2. Instantly remove from React state (accounts + EC2)
    setAwsAccounts((prev) =>
      prev.filter(
        (acc) =>
          acc.id !== id &&
          acc.accountId !== id &&
          !deletedAccountIdsRef.current.has(acc.id) &&
          !deletedAccountIdsRef.current.has(acc.accountId)
      )
    );
    setEc2Instances((prev) =>
      prev.filter(
        (inst) =>
          inst.accountId !== id &&
          (!target || inst.accountId !== target.accountId) &&
          !deletedAccountIdsRef.current.has(inst.accountId)
      )
    );

    // 3. Persist deletion in backend
    try {
      await fetch(`/api/cloud-accounts?provider=aws&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (target?.accountId && target.accountId !== id) {
        await fetch(`/api/cloud-accounts?provider=aws&id=${encodeURIComponent(target.accountId)}`, { method: 'DELETE' });
      }
      await loadRealData();
    } catch (e) {
      console.warn('Remove AWS account note:', e);
    }
  };

  const removeAzureSubscription = async (id: string) => {
    // 1. Instantly record in deleted set
    deletedAccountIdsRef.current.add(id);
    const target = azureSubscriptions.find((s) => s.id === id || s.subscriptionId === id);
    if (target?.subscriptionId) deletedAccountIdsRef.current.add(target.subscriptionId);
    if (target?.id) deletedAccountIdsRef.current.add(target.id);

    // 2. Instantly remove from React state (subscriptions + VMs)
    setAzureSubscriptions((prev) =>
      prev.filter(
        (sub) =>
          sub.id !== id &&
          sub.subscriptionId !== id &&
          !deletedAccountIdsRef.current.has(sub.id) &&
          !deletedAccountIdsRef.current.has(sub.subscriptionId)
      )
    );
    setAzureVMs((prev) =>
      prev.filter(
        (vm) =>
          vm.subscriptionId !== id &&
          (!target || vm.subscriptionId !== target.subscriptionId) &&
          !deletedAccountIdsRef.current.has(vm.subscriptionId)
      )
    );

    // 3. Persist deletion in backend
    try {
      await fetch(`/api/cloud-accounts?provider=azure&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await fetch(`/api/azure/subscriptions?subscriptionId=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await fetch(`/api/azure/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (target?.subscriptionId && target.subscriptionId !== id) {
        await fetch(`/api/cloud-accounts?provider=azure&id=${encodeURIComponent(target.subscriptionId)}`, { method: 'DELETE' });
        await fetch(`/api/azure/subscriptions?subscriptionId=${encodeURIComponent(target.subscriptionId)}`, { method: 'DELETE' });
        await fetch(`/api/azure/subscriptions/${encodeURIComponent(target.subscriptionId)}`, { method: 'DELETE' });
      }
      await loadRealData();
    } catch (e) {
      console.warn('Remove Azure subscription note:', e);
    }
  };

  // Filtered EC2 instances - Real data only
  const filteredEC2Instances = useMemo(() => {
    if (cloudProvider === 'azure') return [];
    const connectedAws = awsAccounts.filter((a) => a.status === 'Connected');
    if (connectedAws.length === 0) return [];

    const targetAccounts =
      selectedAwsAccountId === 'all'
        ? connectedAws
        : connectedAws.filter((a) => a.id === selectedAwsAccountId || a.accountId === selectedAwsAccountId);

    const activeSelectedRegions = new Set(targetAccounts.flatMap((a) => a.enabledRegions));

    return ec2Instances.filter((inst) => {
      if (activeSelectedRegions.size > 0 && !activeSelectedRegions.has(inst.region)) return false;
      if (selectedAwsAccountId !== 'all' && inst.accountId !== selectedAwsAccountId) return false;
      if (selectedRegion !== 'all' && inst.region !== selectedRegion) return false;
      return true;
    });
  }, [cloudProvider, awsAccounts, ec2Instances, selectedAwsAccountId, selectedRegion]);

  // Filtered Azure VMs - Real data only
  const filteredAzureVMs = useMemo(() => {
    if (cloudProvider === 'aws') return [];
    const connectedSubs = azureSubscriptions.filter((s) => s.status === 'Connected');
    // Only suppress if there are configured subscriptions and none are connected
    if (azureSubscriptions.length > 0 && connectedSubs.length === 0) return [];

    const targetSubs =
      selectedAzureSubId === 'all'
        ? connectedSubs
        : connectedSubs.filter((s) => s.id === selectedAzureSubId || s.subscriptionId === selectedAzureSubId);

    const activeSelectedRegions = new Set(
      targetSubs
        .flatMap((s) => (s.enabledRegions || (s as any).selectedRegions || []))
        .map((r: string) => (r || '').toLowerCase().replace(/[\s-_]+/g, ''))
        .filter(Boolean)
    );

    return azureVMs.filter((vm) => {
      const vmReg = (vm.region || '').toLowerCase().replace(/[\s-_]+/g, '');
      if (activeSelectedRegions.size > 0 && !activeSelectedRegions.has(vmReg)) return false;
      if (selectedAzureSubId !== 'all' && vm.subscriptionId !== selectedAzureSubId) return false;
      if (selectedRegion !== 'all') {
        const selReg = selectedRegion.toLowerCase().replace(/[\s-_]+/g, '');
        if (vmReg !== selReg && !vmReg.includes(selReg) && !selReg.includes(vmReg)) return false;
      }
      return true;
    });
  }, [cloudProvider, azureSubscriptions, azureVMs, selectedAzureSubId, selectedRegion]);

  // Filtered Docker containers
  const filteredDockerContainers = useMemo(() => {
    return dockerContainers.filter((c) => {
      if (cloudProvider === 'aws' && c.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && c.cloudProvider !== 'azure') return false;
      if (selectedRegion !== 'all' && c.region !== selectedRegion) return false;
      return true;
    });
  }, [cloudProvider, dockerContainers, selectedRegion]);

  // Filtered K8s Clusters
  const filteredK8sClusters = useMemo(() => {
    return k8sClusters.filter((c) => {
      if (cloudProvider === 'aws' && c.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && c.cloudProvider !== 'azure') return false;
      if (selectedRegion !== 'all' && c.region !== selectedRegion) return false;
      return true;
    });
  }, [cloudProvider, k8sClusters, selectedRegion]);

  // Filtered K8s Pods
  const filteredK8sPods = useMemo(() => {
    return k8sPods.filter((p) => {
      if (cloudProvider === 'aws' && p.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && p.cloudProvider !== 'azure') return false;
      return true;
    });
  }, [cloudProvider, k8sPods]);

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (cloudProvider === 'aws' && a.provider !== 'aws') return false;
      if (cloudProvider === 'azure' && a.provider !== 'azure') return false;
      return true;
    });
  }, [cloudProvider, alerts]);

  // Dynamically compute real resource counts for all discovered regions based on actual VMs, EC2 & custom servers
  const computedRegions: RegionInfo[] = useMemo(() => {
    return regions.map((reg) => {
      let count = 0;
      const normReg = (reg.region || '').toLowerCase().replace(/[\s-_]+/g, '');

      if (reg.cloud === 'azure') {
        const vmMatches = azureVMs.filter((v) => {
          const vReg = (v.region || (v as any).location || '').toLowerCase().replace(/[\s-_]+/g, '');
          return vReg === normReg || (vReg.includes(normReg) || normReg.includes(vReg));
        }).length;
        const customMatches = customServers.filter((s) => {
          if (s.cloudProvider && s.cloudProvider !== 'azure') return false;
          const sReg = (s.region || 'austriaeast').toLowerCase().replace(/[\s-_]+/g, '');
          return sReg === normReg || (sReg.includes(normReg) || normReg.includes(sReg));
        }).length;
        count = Math.max(vmMatches, customMatches);
      } else if (reg.cloud === 'aws') {
        const ec2Matches = ec2Instances.filter((e) => {
          const eReg = (e.region || '').toLowerCase().replace(/[\s-_]+/g, '');
          return eReg === normReg;
        }).length;
        const customMatches = customServers.filter((s) => {
          if (s.cloudProvider !== 'aws') return false;
          const sReg = (s.region || 'us-east-1').toLowerCase().replace(/[\s-_]+/g, '');
          return sReg === normReg;
        }).length;
        count = Math.max(ec2Matches, customMatches);
      }

      return {
        ...reg,
        resourceCount: count,
      };
    });
  }, [regions, azureVMs, ec2Instances, customServers]);

  // Real Dynamic Overview Metrics (No hardcoded trend arrays or fallback numbers)
  const overviewMetrics = useMemo<OverviewMetrics>(() => {
    const awsCount = filteredEC2Instances.length;
    const azureCount = filteredAzureVMs.length;
    const dockerCount = filteredDockerContainers.length;
    const k8sCount = filteredK8sClusters.length;
    const alertCount = filteredAlerts.filter((a) => a.status === 'active').length;

    // Known IPs and names from cloud VMs to prevent duplicate counting
    const knownIps = new Set([
      ...filteredAzureVMs.map((v) => v.publicIp).filter(Boolean),
      ...filteredAzureVMs.map((v) => v.privateIp).filter(Boolean),
      ...filteredEC2Instances.map((e) => e.publicIp).filter(Boolean),
      ...filteredEC2Instances.map((e) => e.privateIp).filter(Boolean),
    ]);
    const knownNames = new Set([
      ...filteredAzureVMs.map((v) => (v.name || '').toLowerCase().trim()).filter(Boolean),
      ...filteredEC2Instances.map((e) => (e.name || '').toLowerCase().trim()).filter(Boolean),
    ]);

    // Only count custom servers that are not already matched to a cloud VM
    const unlinkedCustomServers = customServers.filter((s) => {
      const host = (s.host || '').trim();
      const name = (s.name || '').toLowerCase().trim();
      if (host && knownIps.has(host)) return false;
      if (name && knownNames.has(name)) return false;
      return true;
    });

    let totalServers = awsCount + azureCount + unlinkedCustomServers.length;
    let runningServers =
      filteredEC2Instances.filter((i) => i.status === 'Running').length +
      filteredAzureVMs.filter((v) => (v.powerState || '').toLowerCase().includes('run')).length +
      unlinkedCustomServers.filter((s) => s.status === 'Online').length;

    if (cloudProvider === 'aws') {
      const unlinkedAws = unlinkedCustomServers.filter((s) => s.cloudProvider === 'aws');
      totalServers = awsCount + unlinkedAws.length;
      runningServers =
        filteredEC2Instances.filter((i) => i.status === 'Running').length +
        unlinkedAws.filter((s) => s.status === 'Online').length;
    } else if (cloudProvider === 'azure') {
      const unlinkedAzure = unlinkedCustomServers.filter((s) => s.cloudProvider === 'azure');
      totalServers = azureCount + unlinkedAzure.length;
      runningServers =
        filteredAzureVMs.filter((v) => (v.powerState || '').toLowerCase().includes('run')).length +
        unlinkedAzure.filter((s) => s.status === 'Online').length;
    }

    return {
      awsResources: {
        total: cloudProvider === 'azure' ? 0 : awsCount,
        changeText: awsCount > 0 ? '+0 new' : '0 new',
        trend: awsCount > 0 ? [awsCount] : [],
      },
      azureResources: {
        total: cloudProvider === 'aws' ? 0 : azureCount,
        changeText: azureCount > 0 ? '+0 new' : '0 new',
        trend: azureCount > 0 ? [azureCount] : [],
      },
      totalServers: {
        total: totalServers,
        runningText: `${runningServers} running`,
        trend: totalServers > 0 ? [totalServers] : [],
      },
      dockerContainers: {
        total: dockerCount,
        runningText: `${dockerCount} running`,
        trend: dockerCount > 0 ? [dockerCount] : [],
      },
      k8sClusters: {
        total: k8sCount,
        healthyText: `${k8sCount} healthy`,
        trend: k8sCount > 0 ? [k8sCount] : [],
      },
      activeAlerts: {
        total: alertCount,
        newText: `${alertCount} new`,
        trend: alertCount > 0 ? [alertCount] : [],
      },
    };
  }, [cloudProvider, filteredEC2Instances, filteredAzureVMs, filteredDockerContainers, filteredK8sClusters, filteredAlerts, customServers]);

  return (
    <MonitoringContext.Provider
      value={{
        cloudProvider,
        setCloudProvider,
        awsAccounts,
        selectedAwsAccountId,
        setSelectedAwsAccountId,
        azureSubscriptions,
        selectedAzureSubId,
        setSelectedAzureSubId,
        regions: computedRegions,
        toggleRegion,
        selectedRegion,
        setSelectedRegion,
        timeRange,
        setTimeRange,
        isLive,
        setIsLive,
        isRefreshing,
        triggerRefresh,
        refreshInterval,
        setRefreshInterval,
        lastRefreshedAt,
        refreshError,
        syncStatus,
        isSyncing,
        syncNow,
        addAwsAccount,
        addAzureSubscription,
        updateAwsAccountRegions,
        updateAzureSubscriptionRegions,
        disconnectAwsAccount,
        disconnectAzureSubscription,
        removeAwsAccount,
        removeAzureSubscription,
        filteredEC2Instances,
        filteredAzureVMs,
        filteredDockerContainers,
        filteredK8sClusters,
        filteredK8sPods,
        filteredAlerts,
        customServers,
        overviewMetrics,
        isGeminiDrawerOpen,
        geminiTargetServer,
        openGeminiDrawer,
        closeGeminiDrawer,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
}
