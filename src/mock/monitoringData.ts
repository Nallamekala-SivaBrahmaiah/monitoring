import {
  OverviewMetrics,
  ResourceMetricPoint,
  CloudDistributionItem,
  ServerStatusItem,
  RegionDistributionItem,
  RunningServiceItem,
  AlertItem,
  EC2InstanceDetail,
  AzureVirtualMachine,
  DockerContainer,
  K8sCluster,
  K8sNode,
  K8sPod,
  K8sNamespace,
  K8sDeployment,
  AWSAccount,
  AzureSubscription,
  RegionInfo,
  CloudAccount,
} from '@/types/monitoring';

// All dummy/mock accounts, resources, telemetry and seed records are permanently removed.
// Real data is populated exclusively through connected AWS accounts and Azure subscriptions.

export const mockAwsAccounts: AWSAccount[] = [];
export const mockAzureSubscriptions: AzureSubscription[] = [];
export const mockRegionsList: RegionInfo[] = [];
export const mockEC2Instances: EC2InstanceDetail[] = [];
export const mockAzureVMs: AzureVirtualMachine[] = [];
export const mockDockerContainers: DockerContainer[] = [];
export const mockK8sClusters: K8sCluster[] = [];
export const mockK8sNodes: K8sNode[] = [];
export const mockK8sPods: K8sPod[] = [];
export const mockK8sNamespaces: K8sNamespace[] = [];
export const mockK8sDeployments: K8sDeployment[] = [];
export const mockRecentAlerts: AlertItem[] = [];
export const mockCloudDistribution: CloudDistributionItem[] = [];
export const mockServerStatus: ServerStatusItem[] = [];
export const mockTopRegions: RegionDistributionItem[] = [];
export const mockRunningServices: RunningServiceItem[] = [];

export const mockPerformanceMetrics: Record<string, ResourceMetricPoint[]> = {
  CPU: [],
  Memory: [],
  Disk: [],
  Network: [],
};

export const mockCloudAccounts: CloudAccount[] = [];

export const mockOverviewMetrics: OverviewMetrics = {
  awsResources: {
    total: 0,
    changeText: '0 new',
    trend: [],
  },
  azureResources: {
    total: 0,
    changeText: '0 new',
    trend: [],
  },
  totalServers: {
    total: 0,
    runningText: '0 running',
    trend: [],
  },
  dockerContainers: {
    total: 0,
    runningText: '0 running',
    trend: [],
  },
  k8sClusters: {
    total: 0,
    healthyText: '0 healthy',
    trend: [],
  },
  activeAlerts: {
    total: 0,
    newText: '0 new',
    trend: [],
  },
};
