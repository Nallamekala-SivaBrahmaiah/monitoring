export type CloudProvider = 'all' | 'aws' | 'azure';

export type TimeRange = '15m' | '1h' | '6h' | '24h' | '7d';

export type MetricType = 'CPU' | 'Memory' | 'Disk' | 'Network';

export type AlertSeverity = 'Critical' | 'Warning' | 'Info';

export type ServerHealth = 'Healthy' | 'Warning' | 'Critical';

export type AccountConnectionStatus = 'Connected' | 'Connection Failed' | 'Disconnected' | 'Validating';

export interface AWSAccount {
  id: string;
  accountName: string;
  accountId: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
  externalId?: string;
  status: AccountConnectionStatus;
  enabledRegions: string[];
  resourcesCount: number;
  lastSync: string;
}

export interface AzureSubscription {
  id: string;
  subscriptionName: string;
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  authType: 'client_secret' | 'managed_identity';
  status: AccountConnectionStatus;
  enabledRegions: string[];
  resourcesCount: number;
  lastSync: string;
}

export interface CloudAccount {
  id: string;
  accountName: string;
  accountId: string;
  provider: 'aws' | 'azure';
  status: AccountConnectionStatus;
  resourcesCount: number;
  lastSync: string;
}

export interface DiscoveredRegion {
  name: string;
  code: string;
  status: string;
  optInStatus?: string;
  geography: string;
  enabled?: boolean;
}

export interface RegionInfo {
  id: string;
  region: string;
  code?: string;
  displayName: string;
  cloud: 'aws' | 'azure';
  enabled: boolean;
  resourceCount: number;
  color: string;
  status?: string;
  geography?: string;
}


export interface OverviewMetrics {
  awsResources: {
    total: number;
    changeText: string;
    trend: number[];
  };
  azureResources: {
    total: number;
    changeText: string;
    trend: number[];
  };
  totalServers: {
    total: number;
    runningText: string;
    trend: number[];
  };
  dockerContainers: {
    total: number;
    runningText: string;
    trend: number[];
  };
  k8sClusters: {
    total: number;
    healthyText: string;
    trend: number[];
  };
  activeAlerts: {
    total: number;
    newText: string;
    trend: number[];
  };
}

export interface ResourceMetricPoint {
  time: string;
  aws?: number;
  azure?: number;
}

export interface CloudDistributionItem {
  name: string;
  provider: 'aws' | 'azure';
  value: number;
  percentage: number;
  color: string;
}

export interface ServerStatusItem {
  status: ServerHealth;
  count: number;
  percentage: number;
  color: string;
}

export interface RegionDistributionItem {
  region: string;
  count: number;
  color: string;
  cloud: 'aws' | 'azure' | 'multi';
}

export interface RunningServiceItem {
  id: string;
  name: string;
  type: string;
  count: string;
  provider: 'aws' | 'azure';
  status: 'healthy' | 'warning' | 'critical';
}

export interface AlertHistoryEntry {
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  value: number;
  message: string;
}

export interface AlertItem {
  id: string;
  alertKey?: string;
  title: string;
  message?: string;
  resourceId?: string;
  resourceName: string;
  resourceType: string;
  provider: string;
  region?: string;
  metricName?: 'cpu' | 'memory' | 'disk' | string;
  filesystem?: string;
  value?: number;
  peakValue?: number | null;
  threshold?: number;
  timeAgo?: string;
  timestamp: string;
  triggeredAt?: string;
  lastEvaluatedAt?: string;
  resolvedAt?: string | null;
  acknowledgedAt?: string | null;
  severity: AlertSeverity;
  status: 'active' | 'acknowledged' | 'resolved';
  history?: AlertHistoryEntry[];
}

export interface EC2Instance {
  id: string;
  instanceId: string;
  name: string;
  accountId: string;
  accountName?: string;
  region: string;
  availabilityZone: string;
  status: 'Running' | 'Stopped' | 'Terminated' | 'Pending';
  cpuUsage: number; // Percentage 0-100
  memoryUsage: number; // Percentage 0-100
  diskUsage: number; // Percentage 0-100
  networkInMB: number; // MB/s
  networkOutMB: number; // MB/s
  uptime: string;
  instanceType: string;
  privateIp: string;
  publicIp: string;
  launchTime: string;
  os: string;
  isSSHConnected?: boolean;
  sshServerId?: string;
  sshStatus?: string;
}

export interface EC2InstanceDetail extends EC2Instance {
  vpcId: string;
  subnetId: string;
  iamRole: string;
  securityGroups: Array<{ id: string; name: string }>;
  attachedVolumes: Array<{
    volumeId: string;
    device: string;
    sizeGb: number;
    type: string;
    iops: number;
    status: string;
  }>;
  networkInterfaces: Array<{
    id: string;
    mac: string;
    privateIp: string;
    publicIp?: string;
    subnetId: string;
  }>;
  historicalMetrics: {
    cpu: Array<{ timestamp: string; value: number }>;
    memory: Array<{ timestamp: string; value: number }>;
    diskIo: Array<{ timestamp: string; readMB: number; writeMB: number }>;
    network: Array<{ timestamp: string; inMB: number; outMB: number }>;
  };
  activeAlarms: Array<{
    name: string;
    metric: string;
    threshold: string;
    status: 'OK' | 'ALARM' | 'INSUFFICIENT_DATA';
  }>;
}

export interface AzureVirtualMachine {
  id: string;
  vmId: string;
  name: string;
  subscriptionId: string;
  subscriptionName?: string;
  resourceGroup: string;
  region: string;
  vmSize: string;
  powerState: 'Running' | 'Deallocated' | 'Stopped' | 'Starting';
  cpuUsage: number; // Percentage 0-100
  memoryUsage: number; // Percentage 0-100
  diskUsage: number; // Percentage 0-100
  networkInMB: number; // MB/s
  networkOutMB: number; // MB/s
  uptime: string;
  os: string;
  privateIp: string;
  publicIp?: string;
  vnet: string;
  subnet: string;
  tags?: Record<string, string>;
  historicalMetrics?: {
    cpu: Array<{ timestamp: string; value: number }>;
    memory: Array<{ timestamp: string; value: number }>;
    diskIo: Array<{ timestamp: string; readMB: number; writeMB: number }>;
    network: Array<{ timestamp: string; inMB: number; outMB: number }>;
  };
}

export interface MetricDetail {
  value: number | null;
  unit: string;
  source: 'Azure Monitor' | 'AWS CloudWatch' | 'Docker Engine API' | 'Linux Guest' | 'Kubernetes metrics-server' | string;
  timestamp: string;
  status: 'Available' | 'Unavailable';
  explanation?: string;
}

export interface SyncStatusInfo {
  lastSyncAt: string | null;
  status: 'synced' | 'syncing' | 'stale' | 'error' | 'idle';
  freshness: string;
  error?: string | null;
  resourcesCount: {
    aws: number;
    azure: number;
    docker: number;
    kubernetes: number;
  };
}

export interface DockerContainer {
  id: string;
  containerId: string;
  name: string;
  image: string;
  hostInstance: string;
  hostId: string;
  cloudProvider: 'aws' | 'azure';
  region: string;
  status: 'Running' | 'Stopped' | 'Restarting' | 'Paused' | 'Exited';
  cpuUsage: number | null; // Percentage 0-100 or null if unavailable
  memoryUsage: number | null; // Percentage 0-100 or null if unavailable
  memoryUsageRaw?: string;
  memoryLimit: string;
  diskIO: string;
  networkTraffic: string;
  restartCount: number;
  uptime: string;
  created: string;
  publishedPorts?: string;
  healthStatus?: string;
  metricSource?: string;
  lastUpdated?: string;
  hostIp?: string;
  dockerDaemonStatus?: string;
  dockerDaemonMessage?: string;
  dockerVersion?: string;
}

export interface K8sCluster {
  id: string;
  name: string;
  cloudProvider: 'aws' | 'azure';
  region: string;
  type: 'EKS' | 'AKS';
  version: string;
  nodeCount: number;
  namespaceCount: number;
  podCount: number;
  status: 'Healthy' | 'Degraded' | 'Critical';
  endpoint: string;
}

export interface K8sNode {
  id: string;
  name: string;
  cluster: string;
  cloudProvider: 'aws' | 'azure';
  status: 'Ready' | 'NotReady';
  role: 'control-plane' | 'worker';
  cpuUsage: number | null;
  memoryUsage: number | null;
  kubeletVersion: string;
  osImage: string;
  podsCount: number;
}

export interface K8sPod {
  id: string;
  podUid?: string;
  name: string;
  namespace: string;
  cluster: string;
  node: string;
  cloudProvider: 'aws' | 'azure';
  status: 'Running' | 'Pending' | 'Succeeded' | 'Failed' | 'Unknown' | 'CrashLoopBackOff' | 'ImagePullBackOff' | 'ContainerCreating';
  cpuUsage: number | null; // Percentage
  memoryUsage: number | null; // Percentage
  cpuMetricStatus?: 'Available' | 'Unavailable';
  memoryMetricStatus?: 'Available' | 'Unavailable';
  metricSource?: string;
  restartCount: number;
  ready?: string;
  age: string;
  ip: string;
  creationTimestamp?: string;
  requestsAndLimits?: {
    cpuRequest?: string;
    cpuLimit?: string;
    memoryRequest?: string;
    memoryLimit?: string;
  };
}

export interface K8sNamespace {
  name: string;
  cluster: string;
  status: 'Active' | 'Terminating';
  podCount: number;
  age: string;
}

export interface K8sDeployment {
  name: string;
  namespace: string;
  cluster: string;
  desiredReplicas: number;
  readyReplicas: number;
  upToDateReplicas: number;
  availableReplicas: number;
  age: string;
}

export interface DynamicRegionResource {
  id: string;
  resourceId: string;
  name: string;
  cloudProvider: 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other';
  region: string;
  status: string;
  type: string;
  size: string;
  privateIp?: string;
  publicIp?: string;
  os?: string;
  creationTime?: string;
  startTime?: string;
  runningDuration?: string;
  tags?: Record<string, string>;
  isSSHConnected?: boolean;
  sshServerId?: string;
  sshStatus?: string;
  metrics?: {
    cpu?: number | null;
    memory?: number | null;
    disk?: number | null;
    network?: string;
  };
  docker?: {
    detected: boolean;
    status: string;
    version?: string;
    containersCount?: number;
  };
  kubernetes?: {
    detected: boolean;
    version?: string;
    podsCount?: number;
  };
}

export interface DynamicRegionSummary {
  region: string;
  displayName: string;
  cloud: 'aws' | 'azure' | 'other';
  resourceCount: number;
  runningCount: number;
  stoppedCount: number;
  resources: DynamicRegionResource[];
}
