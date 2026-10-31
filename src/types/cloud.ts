export type CloudProvider = 'all' | 'aws' | 'azure';

export type AccountConnectionStatus = 'Connected' | 'Connection Failed' | 'Disconnected' | 'Validating';

export interface AWSAccount {
  id: string;
  accountName: string;
  accountId: string;
  roleArn?: string;
  accessKeyId?: string;
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

export interface DiscoveredRegion {
  name: string;
  code: string;
  status?: string;
  geography?: string;
  enabled?: boolean;
}

export interface DiscoveredResource {
  id: string;
  resourceId: string;
  name: string;
  provider: 'aws' | 'azure';
  resourceType: string;
  region: string;
  status: string;
  size?: string;
  privateIp?: string;
  publicIp?: string;
  metrics: {
    cpuUtilization: number | null;
    memoryUtilization: number | null;
    diskUtilization: number | null;
    networkIn: number | null;
    networkOut: number | null;
    lastUpdated: Date;
  };
}
