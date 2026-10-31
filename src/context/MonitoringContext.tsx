'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
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
} from '@/types/monitoring';
import {
  mockAwsAccounts,
  mockAzureSubscriptions,
  mockRegionsList,
  mockEC2Instances,
  mockAzureVMs,
  mockDockerContainers,
  mockK8sClusters,
  mockK8sPods,
  mockRecentAlerts,
  mockOverviewMetrics,
} from '@/mock/monitoringData';

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

  // Account management
  addAwsAccount: (acc: Omit<AWSAccount, 'id' | 'resourcesCount' | 'lastSync' | 'status'>) => Promise<boolean>;
  addAzureSubscription: (sub: Omit<AzureSubscription, 'id' | 'resourcesCount' | 'lastSync' | 'status'>) => Promise<boolean>;
  updateAwsAccountRegions: (id: string, regions: string[]) => void;
  updateAzureSubscriptionRegions: (id: string, regions: string[]) => void;
  disconnectAwsAccount: (id: string) => void;
  disconnectAzureSubscription: (id: string) => void;

  // Dynamic filtered resources
  filteredEC2Instances: EC2InstanceDetail[];
  filteredAzureVMs: AzureVirtualMachine[];
  filteredDockerContainers: DockerContainer[];
  filteredK8sClusters: K8sCluster[];
  filteredK8sPods: K8sPod[];
  filteredAlerts: AlertItem[];
  overviewMetrics: OverviewMetrics;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

const allDiscoveredRegionsList: RegionInfo[] = [
  ...ALL_AWS_REGIONS.map((r) => {
    const existing = mockRegionsList.find((m) => m.region === r.code && m.cloud === 'aws');
    return {
      id: `reg-aws-${r.code}`,
      region: r.code,
      displayName: r.name,
      cloud: 'aws' as const,
      enabled: existing ? existing.enabled : (r.enabled ?? false),
      resourceCount: existing ? existing.resourceCount : 0,
      color: existing ? existing.color : '#F97316',
    };
  }),
  ...ALL_AZURE_REGIONS.map((r) => {
    const existing = mockRegionsList.find((m) => m.region === r.code && m.cloud === 'azure');
    return {
      id: `reg-azure-${r.code}`,
      region: r.code,
      displayName: r.name,
      cloud: 'azure' as const,
      enabled: existing ? existing.enabled : (r.enabled ?? false),
      resourceCount: existing ? existing.resourceCount : 0,
      color: existing ? existing.color : '#0089D6',
    };
  }),
];

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  const [cloudProvider, setCloudProviderState] = useState<CloudProvider>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monitoring_cloud_provider') as CloudProvider;
      if (saved && ['all', 'aws', 'azure'].includes(saved)) return saved;
    }
    return 'all';
  });

  const [awsAccounts, setAwsAccounts] = useState<AWSAccount[]>(mockAwsAccounts);
  const [selectedAwsAccountId, setSelectedAwsAccountId] = useState<string>('all');
  const [azureSubscriptions, setAzureSubscriptions] = useState<AzureSubscription[]>(mockAzureSubscriptions);
  const [selectedAzureSubId, setSelectedAzureSubId] = useState<string>('all');
  const [regions, setRegions] = useState<RegionInfo[]>(allDiscoveredRegionsList);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Set cloud provider with strict isolation and filter reset
  const setCloudProvider = (p: CloudProvider) => {
    setCloudProviderState(p);
    if (typeof window !== 'undefined') {
      localStorage.setItem('monitoring_cloud_provider', p);
    }

    if (p === 'aws') {
      // Invalidate and reset any Azure selections
      setSelectedAzureSubId('all');
      setSelectedRegion((prev) => {
        if (prev === 'all') return 'all';
        const reg = regions.find((r) => r.region === prev);
        return reg && reg.cloud === 'azure' ? 'all' : prev;
      });
    } else if (p === 'azure') {
      // Invalidate and reset any AWS selections
      setSelectedAwsAccountId('all');
      setSelectedRegion((prev) => {
        if (prev === 'all') return 'all';
        const reg = regions.find((r) => r.region === prev);
        return reg && reg.cloud === 'aws' ? 'all' : prev;
      });
    }
  };

  // Toggle enable/disable region
  const toggleRegion = (regionId: string) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === regionId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Add AWS Account
  const addAwsAccount = async (
    data: Omit<AWSAccount, 'id' | 'resourcesCount' | 'lastSync' | 'status'>
  ) => {
    // Validate role ARN format
    if (!data.roleArn.startsWith('arn:aws:iam::')) {
      return false;
    }
    const newAcc: AWSAccount = {
      ...data,
      id: `acc-aws-${Date.now()}`,
      status: 'Connected',
      resourcesCount: data.enabledRegions.length * 3,
      lastSync: 'Just now',
    };
    setAwsAccounts((prev) => [...prev, newAcc]);
    return true;
  };

  // Add Azure Subscription
  const addAzureSubscription = async (
    data: Omit<AzureSubscription, 'id' | 'resourcesCount' | 'lastSync' | 'status'>
  ) => {
    const newSub: AzureSubscription = {
      ...data,
      id: `sub-azure-${Date.now()}`,
      status: 'Connected',
      resourcesCount: data.enabledRegions.length * 2,
      lastSync: 'Just now',
    };
    setAzureSubscriptions((prev) => [...prev, newSub]);
    return true;
  };

  const updateAwsAccountRegions = (id: string, newRegions: string[]) => {
    setAwsAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id || acc.accountId === id
          ? { ...acc, enabledRegions: newRegions, resourcesCount: newRegions.length * 3 }
          : acc
      )
    );
  };

  const updateAzureSubscriptionRegions = (id: string, newRegions: string[]) => {
    setAzureSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === id || sub.subscriptionId === id
          ? { ...sub, enabledRegions: newRegions, resourcesCount: newRegions.length * 2 }
          : sub
      )
    );
  };

  const disconnectAwsAccount = (id: string) => {
    setAwsAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, status: 'Disconnected' } : acc))
    );
  };

  const disconnectAzureSubscription = (id: string) => {
    setAzureSubscriptions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, status: 'Disconnected' } : sub))
    );
  };

  // Filtered EC2 instances - strictly respects user's selected regions
  const filteredEC2Instances = useMemo(() => {
    if (cloudProvider === 'azure') return [];

    const connectedAws = awsAccounts.filter((a) => a.status === 'Connected');
    if (connectedAws.length === 0) return [];

    const targetAccounts =
      selectedAwsAccountId === 'all'
        ? connectedAws
        : connectedAws.filter(
            (a) => a.id === selectedAwsAccountId || a.accountId === selectedAwsAccountId
          );

    const activeSelectedRegions = new Set(targetAccounts.flatMap((a) => a.enabledRegions));

    return mockEC2Instances.filter((inst) => {
      // Must be from an enabled/selected region
      if (!activeSelectedRegions.has(inst.region)) {
        return false;
      }
      // Account filter
      if (selectedAwsAccountId !== 'all' && inst.accountId !== selectedAwsAccountId) {
        return false;
      }
      // Region filter
      if (selectedRegion !== 'all' && inst.region !== selectedRegion) {
        return false;
      }
      return true;
    });
  }, [cloudProvider, awsAccounts, selectedAwsAccountId, selectedRegion]);

  // Filtered Azure VMs - strictly respects user's selected regions
  const filteredAzureVMs = useMemo(() => {
    if (cloudProvider === 'aws') return [];

    const connectedSubs = azureSubscriptions.filter((s) => s.status === 'Connected');
    if (connectedSubs.length === 0) return [];

    const targetSubs =
      selectedAzureSubId === 'all'
        ? connectedSubs
        : connectedSubs.filter(
            (s) => s.id === selectedAzureSubId || s.subscriptionId === selectedAzureSubId
          );

    const activeSelectedRegions = new Set(targetSubs.flatMap((s) => s.enabledRegions));

    return mockAzureVMs.filter((vm) => {
      // Must be from an enabled/selected region
      if (!activeSelectedRegions.has(vm.region)) {
        return false;
      }
      // Subscription filter
      if (selectedAzureSubId !== 'all' && vm.subscriptionId !== selectedAzureSubId) {
        return false;
      }
      // Region filter
      if (selectedRegion !== 'all' && vm.region !== selectedRegion) {
        return false;
      }
      return true;
    });
  }, [cloudProvider, azureSubscriptions, selectedAzureSubId, selectedRegion]);

  // Filtered Docker containers
  const filteredDockerContainers = useMemo(() => {
    return mockDockerContainers.filter((c) => {
      if (cloudProvider === 'aws' && c.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && c.cloudProvider !== 'azure') return false;
      if (selectedRegion !== 'all' && c.region !== selectedRegion) return false;
      return true;
    });
  }, [cloudProvider, selectedRegion]);

  // Filtered K8s Clusters
  const filteredK8sClusters = useMemo(() => {
    return mockK8sClusters.filter((c) => {
      if (cloudProvider === 'aws' && c.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && c.cloudProvider !== 'azure') return false;
      if (selectedRegion !== 'all' && c.region !== selectedRegion) return false;
      return true;
    });
  }, [cloudProvider, selectedRegion]);

  // Filtered K8s Pods
  const filteredK8sPods = useMemo(() => {
    return mockK8sPods.filter((p) => {
      if (cloudProvider === 'aws' && p.cloudProvider !== 'aws') return false;
      if (cloudProvider === 'azure' && p.cloudProvider !== 'azure') return false;
      return true;
    });
  }, [cloudProvider]);

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return mockRecentAlerts.filter((a) => {
      if (cloudProvider === 'aws' && a.provider === 'azure') return false;
      if (cloudProvider === 'azure' && a.provider === 'aws') return false;
      return true;
    });
  }, [cloudProvider]);

  // Dynamically calculate overview metrics based on current filters
  const overviewMetrics = useMemo<OverviewMetrics>(() => {
    const awsCount = filteredEC2Instances.length;
    const azureCount = filteredAzureVMs.length;
    const dockerCount = filteredDockerContainers.length;
    const k8sCount = filteredK8sClusters.length;
    const alertCount = filteredAlerts.filter((a) => a.status === 'active').length;

    let totalServers = awsCount + azureCount;
    let runningServers =
      filteredEC2Instances.filter((i) => i.status === 'Running').length +
      filteredAzureVMs.filter((v) => v.powerState === 'Running').length;

    if (cloudProvider === 'aws') {
      totalServers = awsCount;
      runningServers = filteredEC2Instances.filter((i) => i.status === 'Running').length;
    } else if (cloudProvider === 'azure') {
      totalServers = azureCount;
      runningServers = filteredAzureVMs.filter((v) => v.powerState === 'Running').length;
    }

    return {
      awsResources: {
        total: cloudProvider === 'azure' ? 0 : awsCount,
        changeText: '+1 new',
        trend: [8, 9, 10, 10, 11, awsCount],
      },
      azureResources: {
        total: cloudProvider === 'aws' ? 0 : azureCount,
        changeText: '+0 new',
        trend: [7, 7, 8, 8, 8, azureCount],
      },
      totalServers: {
        total: totalServers,
        runningText: `${runningServers} running`,
        trend: [16, 17, 18, 19, 19, totalServers],
      },
      dockerContainers: {
        total: dockerCount,
        runningText: `${dockerCount > 0 ? dockerCount : 0} running`,
        trend: [10, 11, 12, 13, 14, dockerCount],
      },
      k8sClusters: {
        total: k8sCount,
        healthyText: `${k8sCount} healthy`,
        trend: [1, 1, 2, 2, 2, k8sCount],
      },
      activeAlerts: {
        total: alertCount,
        newText: `${alertCount} new`,
        trend: [1, 2, 1, 3, 2, alertCount],
      },
    };
  }, [cloudProvider, filteredEC2Instances, filteredAzureVMs, filteredDockerContainers, filteredK8sClusters, filteredAlerts]);

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
        regions,
        toggleRegion,
        selectedRegion,
        setSelectedRegion,
        timeRange,
        setTimeRange,
        isLive,
        setIsLive,
        isRefreshing,
        triggerRefresh,
        addAwsAccount,
        addAzureSubscription,
        updateAwsAccountRegions,
        updateAzureSubscriptionRegions,
        disconnectAwsAccount,
        disconnectAzureSubscription,
        filteredEC2Instances,
        filteredAzureVMs,
        filteredDockerContainers,
        filteredK8sClusters,
        filteredK8sPods,
        filteredAlerts,
        overviewMetrics,
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
