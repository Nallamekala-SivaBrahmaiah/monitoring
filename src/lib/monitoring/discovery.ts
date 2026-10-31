import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import { discoverAllAzureResources } from '@/lib/azure/resources';
import { discoverEC2InstancesInRegion } from '@/lib/aws/ec2';

let isDiscoveryRunning = false;

export async function runGlobalResourceDiscovery(): Promise<{
  totalResources: number;
  azureResources: number;
  awsResources: number;
}> {
  if (isDiscoveryRunning) {
    return { totalResources: 0, azureResources: 0, awsResources: 0 };
  }

  isDiscoveryRunning = true;
  let azureCount = 0;
  let awsCount = 0;

  try {
    await connectToDatabase();

    // 1. Process Azure Accounts
    const azureAccounts = await CloudAccount.find({ provider: 'azure', status: 'Connected' })
      .select('+clientSecret')
      .lean();

    for (const acc of azureAccounts) {
      if (!acc.subscriptionId || !acc.tenantId || !acc.clientId || !acc.clientSecret) continue;

      try {
        const resources = await discoverAllAzureResources(
          acc.subscriptionId,
          { tenantId: acc.tenantId, clientId: acc.clientId, clientSecret: acc.clientSecret },
          acc.selectedRegions || []
        );

        const bulkOps = resources.map((r) => ({
          updateOne: {
            filter: { resourceId: r.resourceId, provider: 'azure' },
            update: {
              $set: {
                ...r,
                provider: 'azure',
                subscriptionId: acc.subscriptionId,
              },
            },
            upsert: true,
          },
        }));

        if (bulkOps.length > 0) {
          await CloudResource.bulkWrite(bulkOps as any);
        }

        await CloudAccount.updateOne(
          { _id: acc._id },
          { $set: { resourcesCount: resources.length, lastSyncAt: new Date() } }
        );

        azureCount += resources.length;
      } catch (subErr) {
        console.error(`[Discovery] Error refreshing Azure subscription ${acc.subscriptionId}:`, subErr);
      }
    }

    // 2. Process AWS Accounts
    const awsAccounts = await CloudAccount.find({ provider: 'aws', status: 'Connected' })
      .select('+accessKeyId +secretAccessKey')
      .lean();

    for (const acc of awsAccounts) {
      const regions = acc.selectedRegions && acc.selectedRegions.length > 0 ? acc.selectedRegions : ['us-east-1'];
      let totalAwsForAccount = 0;

      for (const reg of regions) {
        try {
          const instances = await discoverEC2InstancesInRegion(reg, {
            accessKeyId: acc.accessKeyId,
            secretAccessKey: acc.secretAccessKey,
            region: reg,
          });

          const bulkOps = instances.map((inst) => ({
            updateOne: {
              filter: { resourceId: inst.resourceId, provider: 'aws' },
              update: {
                $set: {
                  provider: 'aws',
                  resourceType: 'ec2',
                  resourceId: inst.resourceId,
                  name: inst.name,
                  region: inst.region,
                  accountId: acc.accountId,
                  status: inst.status,
                  size: inst.instanceType,
                  privateIp: inst.privateIp,
                  publicIp: inst.publicIp,
                  metrics: inst.metrics,
                },
              },
              upsert: true,
            },
          }));

          if (bulkOps.length > 0) {
            await CloudResource.bulkWrite(bulkOps as any);
          }

          totalAwsForAccount += instances.length;
        } catch (regErr) {
          console.warn(`[Discovery] AWS discovery error in ${reg}:`, regErr);
        }
      }

      await CloudAccount.updateOne(
        { _id: acc._id },
        { $set: { resourcesCount: totalAwsForAccount, lastSyncAt: new Date() } }
      );

      awsCount += totalAwsForAccount;
    }
  } catch (err) {
    console.error('[Global Resource Discovery] Failed:', err);
  } finally {
    isDiscoveryRunning = false;
  }

  return {
    totalResources: azureCount + awsCount,
    azureResources: azureCount,
    awsResources: awsCount,
  };
}
