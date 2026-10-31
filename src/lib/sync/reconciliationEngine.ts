import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import { discoverAllAzureResources } from '@/lib/azure/resources';
import { discoverEC2InstancesInRegion } from '@/lib/aws/ec2';
import { syncDockerResources } from '@/lib/docker/sync';
import { syncKubernetesResources } from '@/lib/kubernetes/sync';

export interface ReconciliationResult {
  success: boolean;
  timestamp: string;
  durationMs: number;
  stats: {
    azureResourcesDiscovered: number;
    awsResourcesDiscovered: number;
    dockerContainersDiscovered: number;
    k8sClustersDiscovered: number;
    prunedDeletedCount: number;
  };
  errors: string[];
}

let isSyncRunning = false;
let lastSyncTimestamp: Date | null = null;
let lastSyncError: string | null = null;

export async function runFullInfrastructureReconciliation(): Promise<ReconciliationResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  if (isSyncRunning) {
    return {
      success: false,
      timestamp: lastSyncTimestamp ? lastSyncTimestamp.toISOString() : new Date().toISOString(),
      durationMs: 0,
      stats: {
        azureResourcesDiscovered: 0,
        awsResourcesDiscovered: 0,
        dockerContainersDiscovered: 0,
        k8sClustersDiscovered: 0,
        prunedDeletedCount: 0,
      },
      errors: ['A synchronization cycle is already currently running.'],
    };
  }

  isSyncRunning = true;
  let azureCount = 0;
  let awsCount = 0;
  let dockerCount = 0;
  let k8sCount = 0;
  let prunedCount = 0;

  try {
    await connectToDatabase();

    // -------------------------------------------------------------
    // 1. RECONCILE AZURE RESOURCES
    // -------------------------------------------------------------
    const azureAccounts = await CloudAccount.find({ provider: 'azure', status: 'Connected' })
      .select('+clientSecret')
      .lean();

    for (const acc of azureAccounts) {
      if (!acc.subscriptionId || !acc.tenantId || !acc.clientId || !acc.clientSecret) continue;

      try {
        const liveAzureResources = await discoverAllAzureResources(
          acc.subscriptionId,
          { tenantId: acc.tenantId, clientId: acc.clientId, clientSecret: acc.clientSecret },
          acc.selectedRegions || []
        );

        const liveAzureIds = new Set<string>();

        for (const res of liveAzureResources) {
          liveAzureIds.add(res.resourceId);

          await CloudResource.updateOne(
            { resourceId: res.resourceId, provider: 'azure' },
            {
              $set: {
                ...res,
                provider: 'azure',
                subscriptionId: acc.subscriptionId,
                isDeleted: false,
                deletedAt: null,
                lastSyncAt: new Date(),
                metricSource: 'Azure Monitor & ARM API',
              },
            },
            { upsert: true }
          );
        }

        // PRUNE DELETED AZURE RESOURCES:
        // Any resource previously stored for this subscription that is not in live inventory is marked deleted
        const pruneAzureRes = await CloudResource.updateMany(
          {
            provider: 'azure',
            subscriptionId: acc.subscriptionId,
            resourceType: { $nin: ['container', 'k8s_pod'] }, // handled by docker/k8s modules
            resourceId: { $nin: Array.from(liveAzureIds) },
          },
          {
            $set: {
              isDeleted: true,
              deletedAt: new Date(),
              status: 'Terminated',
            },
          }
        );

        prunedCount += pruneAzureRes.modifiedCount || 0;
        azureCount += liveAzureResources.length;

        await CloudAccount.updateOne(
          { _id: acc._id },
          { $set: { resourcesCount: liveAzureResources.length, lastSyncAt: new Date() } }
        );
      } catch (err: any) {
        const msg = `Azure subscription ${acc.subscriptionId} sync error: ${err.message || err}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    // -------------------------------------------------------------
    // 2. RECONCILE AWS RESOURCES
    // -------------------------------------------------------------
    const awsAccounts = await CloudAccount.find({ provider: 'aws', status: 'Connected' })
      .select('+accessKeyId +secretAccessKey')
      .lean();

    for (const acc of awsAccounts) {
      const regions = acc.selectedRegions && acc.selectedRegions.length > 0 ? acc.selectedRegions : ['us-east-1'];
      const liveAwsIds = new Set<string>();
      let totalAwsForAccount = 0;

      for (const reg of regions) {
        try {
          const instances = await discoverEC2InstancesInRegion(reg, {
            accessKeyId: acc.accessKeyId,
            secretAccessKey: acc.secretAccessKey,
            region: reg,
          });

          for (const inst of instances) {
            // Terminated EC2 instances must disappear from active inventory
            const isTerminated = (inst.status || '').toLowerCase().includes('terminat');
            if (!isTerminated) {
              liveAwsIds.add(inst.resourceId);
            }

            await CloudResource.updateOne(
              { resourceId: inst.resourceId, provider: 'aws' },
              {
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
                  isDeleted: isTerminated,
                  deletedAt: isTerminated ? new Date() : null,
                  lastSyncAt: new Date(),
                  metricSource: 'Amazon CloudWatch',
                },
              },
              { upsert: true }
            );

            if (!isTerminated) totalAwsForAccount++;
          }
        } catch (regErr: any) {
          const msg = `AWS sync error in ${reg} for ${acc.accountId}: ${regErr.message || regErr}`;
          console.warn(msg);
          errors.push(msg);
        }
      }

      // PRUNE DELETED AWS EC2:
      const pruneAwsRes = await CloudResource.updateMany(
        {
          provider: 'aws',
          accountId: acc.accountId,
          resourceType: 'ec2',
          resourceId: { $nin: Array.from(liveAwsIds) },
        },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            status: 'Terminated',
          },
        }
      );

      prunedCount += pruneAwsRes.modifiedCount || 0;
      awsCount += totalAwsForAccount;

      await CloudAccount.updateOne(
        { _id: acc._id },
        { $set: { resourcesCount: totalAwsForAccount, lastSyncAt: new Date() } }
      );
    }

    // -------------------------------------------------------------
    // 3. RECONCILE DOCKER CONTAINERS
    // -------------------------------------------------------------
    try {
      const dockerResult = await syncDockerResources();
      dockerCount = dockerResult.containers.length;
    } catch (dockerErr: any) {
      const msg = `Docker synchronization error: ${dockerErr.message || dockerErr}`;
      console.warn(msg);
      errors.push(msg);
    }

    // -------------------------------------------------------------
    // 4. RECONCILE KUBERNETES CLUSTERS & PODS
    // -------------------------------------------------------------
    try {
      const k8sResult = await syncKubernetesResources();
      k8sCount = k8sResult.clusters.length;
    } catch (k8sErr: any) {
      const msg = `Kubernetes synchronization error: ${k8sErr.message || k8sErr}`;
      console.warn(msg);
      errors.push(msg);
    }

    lastSyncTimestamp = new Date();
    lastSyncError = errors.length > 0 ? errors.join('; ') : null;
  } catch (globalErr: any) {
    const msg = `Fatal infrastructure reconciliation error: ${globalErr.message || globalErr}`;
    console.error(msg);
    errors.push(msg);
    lastSyncError = msg;
  } finally {
    isSyncRunning = false;
  }

  return {
    success: errors.length === 0,
    timestamp: lastSyncTimestamp ? lastSyncTimestamp.toISOString() : new Date().toISOString(),
    durationMs: Date.now() - startTime,
    stats: {
      azureResourcesDiscovered: azureCount,
      awsResourcesDiscovered: awsCount,
      dockerContainersDiscovered: dockerCount,
      k8sClustersDiscovered: k8sCount,
      prunedDeletedCount: prunedCount,
    },
    errors,
  };
}

export function getLastSyncStatus() {
  return {
    isSyncRunning,
    lastSyncTimestamp: lastSyncTimestamp ? lastSyncTimestamp.toISOString() : null,
    lastSyncError,
  };
}
