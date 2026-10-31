import { validateAzureCredentials } from './credentials';
import { discoverAzureRegions } from './regions';
import { discoverAllAzureResources } from './resources';
import {
  upsertAccount,
  fetchAccounts,
  removeAccount,
  bulkUpsertResources,
} from '@/lib/storage';

export interface SaveAzureSubscriptionInput {
  subscriptionName: string;
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  selectedRegions?: string[];
}

export async function saveAzureSubscription(input: SaveAzureSubscriptionInput) {
  const { subscriptionName, subscriptionId, tenantId, clientId, clientSecret, selectedRegions } = input;

  // 1. Validate credentials with real Azure SDK
  const valResult = await validateAzureCredentials(subscriptionId, tenantId, clientId, clientSecret);
  if (!valResult.success) {
    throw new Error(valResult.error || 'Failed to validate Azure credentials');
  }

  // 2. Discover all regions via ARM Locations API
  const regionsList = await discoverAzureRegions(subscriptionId, { tenantId, clientId, clientSecret });
  const allRegionCodes = regionsList.map((r) => r.code);

  // Requirement: Default to ALL regions if none specified or explicitly provided
  const enabledRegions =
    selectedRegions && selectedRegions.length > 0 ? selectedRegions : allRegionCodes;

  // 3. Upsert account into resilient storage (MongoDB with automatic persistent fallback)
  const accountData = {
    provider: 'azure',
    accountName: subscriptionName || valResult.displayName || 'Azure Subscription',
    subscriptionId,
    tenantId,
    clientId,
    clientSecret, // Kept safe server-side
    authType: 'service_principal',
    status: 'Connected',
    availableRegions: allRegionCodes,
    selectedRegions: enabledRegions,
    resourcesCount: 0,
    lastSyncAt: new Date(),
  };

  const account = await upsertAccount(accountData);

  // 4. Trigger resource discovery in background
  discoverAndPersistAzureResources(subscriptionId, { tenantId, clientId, clientSecret }, enabledRegions).catch(
    (err) => console.error('[Background Discovery Error]', err)
  );

  return {
    id: account._id ? account._id.toString() : `sub-${subscriptionId}`,
    subscriptionName: account.accountName,
    subscriptionId: account.subscriptionId,
    tenantId: account.tenantId,
    clientId: account.clientId,
    authType: account.authType,
    status: account.status,
    availableRegions: account.availableRegions,
    selectedRegions: account.selectedRegions,
    enabledRegions: account.selectedRegions,
    resourcesCount: account.resourcesCount || 0,
    lastSync: 'Just now',
  };
}

export async function getAzureSubscriptions() {
  const accounts = await fetchAccounts('azure');

  return accounts.map((acc: any) => ({
    id: acc._id ? acc._id.toString() : acc.subscriptionId,
    subscriptionName: acc.accountName,
    subscriptionId: acc.subscriptionId,
    tenantId: acc.tenantId,
    clientId: acc.clientId,
    authType: acc.authType || 'service_principal',
    status: acc.status,
    availableRegions: acc.availableRegions || [],
    selectedRegions: acc.selectedRegions || [],
    enabledRegions: acc.selectedRegions || [],
    resourcesCount: acc.resourcesCount || 0,
    lastSync: acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleTimeString() : 'Never',
  }));
}

export async function disconnectAzureSubscription(subscriptionId: string) {
  await removeAccount('azure', subscriptionId);
  return { success: true };
}

export async function updateAzureSubscriptionRegions(subscriptionId: string, regions: string[]) {
  const accounts = await fetchAccounts('azure');
  const account = accounts.find((a) => a.subscriptionId === subscriptionId);
  if (!account) throw new Error('Subscription not found');

  account.selectedRegions = regions;
  await upsertAccount(account);

  if (account.clientSecret && account.tenantId && account.clientId) {
    discoverAndPersistAzureResources(
      subscriptionId,
      { tenantId: account.tenantId, clientId: account.clientId, clientSecret: account.clientSecret },
      regions
    ).catch(console.error);
  }

  return { success: true, selectedRegions: regions };
}

export async function refreshAzureSubscription(subscriptionId: string) {
  const accounts = await fetchAccounts('azure');
  const account = accounts.find((a) => a.subscriptionId === subscriptionId);
  if (!account || !account.clientSecret || !account.tenantId || !account.clientId) {
    throw new Error('Azure subscription credentials not available');
  }

  await discoverAndPersistAzureResources(
    subscriptionId,
    { tenantId: account.tenantId, clientId: account.clientId, clientSecret: account.clientSecret },
    account.selectedRegions
  );

  return { success: true };
}

export async function discoverAndPersistAzureResources(
  subscriptionId: string,
  credentials: { tenantId: string; clientId: string; clientSecret: string },
  regions: string[]
) {
  const resources = await discoverAllAzureResources(subscriptionId, credentials, regions);

  // Bulk upsert into resilient storage
  const formattedResources = resources.map((r) => ({
    ...r,
    provider: 'azure',
    subscriptionId,
  }));

  await bulkUpsertResources(formattedResources);

  // Update count and lastSync on account
  const accounts = await fetchAccounts('azure');
  const account = accounts.find((a) => a.subscriptionId === subscriptionId);
  if (account) {
    account.resourcesCount = resources.length;
    account.lastSyncAt = new Date();
    account.status = 'Connected';
    await upsertAccount(account);
  }
}
