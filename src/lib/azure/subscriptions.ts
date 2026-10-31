import connectToDatabase from '@/lib/mongodb';
import CloudAccount, { ICloudAccount } from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import { validateAzureCredentials } from './credentials';
import { discoverAzureRegions } from './regions';
import { discoverAllAzureResources } from './resources';

export interface SaveAzureSubscriptionInput {
  subscriptionName: string;
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  selectedRegions?: string[];
}

export async function saveAzureSubscription(input: SaveAzureSubscriptionInput) {
  await connectToDatabase();

  const { subscriptionName, subscriptionId, tenantId, clientId, clientSecret, selectedRegions } = input;

  // 1. Validate credentials
  const valResult = await validateAzureCredentials(subscriptionId, tenantId, clientId, clientSecret);
  if (!valResult.success) {
    throw new Error(valResult.error || 'Failed to validate Azure credentials');
  }

  // 2. Discover all regions
  const regionsList = await discoverAzureRegions(subscriptionId, { tenantId, clientId, clientSecret });
  const allRegionCodes = regionsList.map((r) => r.code);

  // Requirement: Default to ALL regions if none specified or explicitly provided
  const enabledRegions =
    selectedRegions && selectedRegions.length > 0 ? selectedRegions : allRegionCodes;

  // 3. Upsert account in MongoDB
  const account = await CloudAccount.findOneAndUpdate(
    { provider: 'azure', subscriptionId },
    {
      provider: 'azure',
      accountName: subscriptionName || valResult.displayName || 'Azure Subscription',
      subscriptionId,
      tenantId,
      clientId,
      clientSecret, // Hidden by select: false
      authType: 'service_principal',
      status: 'Connected',
      availableRegions: allRegionCodes,
      selectedRegions: enabledRegions,
      lastSyncAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 4. Trigger resource discovery in background
  discoverAndPersistAzureResources(subscriptionId, { tenantId, clientId, clientSecret }, enabledRegions).catch(
    (err) => console.error('[Background Discovery Error]', err)
  );

  return {
    id: account._id.toString(),
    subscriptionName: account.accountName,
    subscriptionId: account.subscriptionId,
    tenantId: account.tenantId,
    clientId: account.clientId,
    authType: account.authType,
    status: account.status,
    availableRegions: account.availableRegions,
    selectedRegions: account.selectedRegions,
    enabledRegions: account.selectedRegions,
    resourcesCount: account.resourcesCount,
    lastSync: 'Just now',
  };
}

export async function getAzureSubscriptions() {
  await connectToDatabase();
  const accounts = await CloudAccount.find({ provider: 'azure' }).lean();

  return accounts.map((acc: any) => ({
    id: acc._id.toString(),
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
  await connectToDatabase();
  await CloudAccount.deleteOne({ provider: 'azure', subscriptionId });
  await CloudResource.deleteMany({ provider: 'azure', subscriptionId });
  return { success: true };
}

export async function updateAzureSubscriptionRegions(subscriptionId: string, regions: string[]) {
  await connectToDatabase();
  const account = await CloudAccount.findOne({ provider: 'azure', subscriptionId }).select('+clientSecret');
  if (!account) throw new Error('Subscription not found');

  account.selectedRegions = regions;
  await account.save();

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
  await connectToDatabase();
  const account = await CloudAccount.findOne({ provider: 'azure', subscriptionId }).select('+clientSecret');
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
  await connectToDatabase();
  const resources = await discoverAllAzureResources(subscriptionId, credentials, regions);

  // Update MongoDB resources
  const bulkOps = resources.map((r) => ({
    updateOne: {
      filter: { resourceId: r.resourceId, provider: 'azure' },
      update: {
        $set: {
          ...r,
          provider: 'azure',
          subscriptionId,
        },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    await CloudResource.bulkWrite(bulkOps as any);
  }

  // Update count and lastSync on CloudAccount
  await CloudAccount.updateOne(
    { provider: 'azure', subscriptionId },
    {
      $set: {
        resourcesCount: resources.length,
        lastSyncAt: new Date(),
        status: 'Connected',
      },
    }
  );
}
