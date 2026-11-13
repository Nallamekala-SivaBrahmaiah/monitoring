import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleController from '@/models/AnsibleController';
import { discoverAllAzureResources } from '@/lib/azure/resources';
import { discoverEC2InstancesInRegion, getEnabledAWSRegions, isInaccessibleRegion } from '@/lib/aws/ec2';
import { syncDockerResources } from '@/lib/docker/sync';
import { syncKubernetesResources } from '@/lib/kubernetes/sync';
import { syncAllRegisteredServers } from '@/lib/serverMonitoring/serverSync';
import { evaluateAllMonitoredResources } from '@/lib/monitoring/alertEvaluationEngine';

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
    const elapsed = lastSyncTimestamp ? Date.now() - lastSyncTimestamp.getTime() : 0;
    if (elapsed > 45000) {
      isSyncRunning = false;
    } else {
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
        // Any resource previously stored for this subscription that is not in live inventory is purged
        const pruneAzureRes = await CloudResource.deleteMany({
          provider: 'azure',
          $or: [
            { subscriptionId: acc.subscriptionId, resourceId: { $nin: Array.from(liveAzureIds) } },
            { resourceType: { $in: ['vm', 'Server' as any] }, resourceId: { $nin: Array.from(liveAzureIds) } },
            { status: 'Terminated' },
            { isDeleted: true },
          ],
        } as any);

        // Also clean up any deleted Azure VMs from the Server collection
        const liveAzureNames = liveAzureResources.map((r) => (r.name || '').toLowerCase().trim());
        const liveAzureIps = liveAzureResources.flatMap((r) =>
          [r.publicIp, r.privateIp].filter((ip): ip is string => Boolean(ip)).map((ip) => ip.trim())
        );

        await Server.deleteMany({
          cloudProvider: 'azure',
          name: { $nin: liveAzureNames },
          host: { $nin: liveAzureIps },
        });

        await AnsibleHost.deleteMany({
          provider: 'azure',
          name: { $nin: liveAzureNames },
          ip: { $nin: liveAzureIps },
        }).catch(() => null);

        await AnsibleController.deleteMany({
          provider: 'azure',
          name: { $nin: liveAzureNames },
          ipAddress: { $nin: liveAzureIps },
        }).catch(() => null);

        prunedCount += pruneAzureRes.deletedCount || 0;
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

    const allRegisteredServers = await Server.find().lean();

    for (const acc of awsAccounts) {
      if (!acc.accessKeyId || !acc.secretAccessKey) continue;

      const creds = {
        accessKeyId: acc.accessKeyId,
        secretAccessKey: acc.secretAccessKey,
        region: acc.selectedRegions?.[0] || 'ap-southeast-2',
      };

      // Dynamically discover all enabled AWS regions for this account
      const enabledRegions = await getEnabledAWSRegions(
        creds,
        Array.from(new Set([...(acc.selectedRegions || []), 'ap-southeast-2']))
      );

      let totalAwsForAccount = 0;
      const allAccountLiveAwsIds = new Set<string>();
      const allAccountLiveAwsNames = new Set<string>();
      const allAccountLiveAwsIps = new Set<string>();

      // Query candidate regions in parallel to prevent background cycle stalls
      const activeRegions = enabledRegions.filter((r) => !isInaccessibleRegion(r));
      const discoveryResults = await Promise.all(
        activeRegions.map((reg) => discoverEC2InstancesInRegion(reg, creds))
      );

      for (const discovery of discoveryResults) {
        const reg = discovery.region;
        try {
          if (!discovery.success) {
            const msg = `AWS sync note in ${reg} for ${acc.accountId}: ${discovery.error}`;
            console.warn(msg);
            errors.push(msg);
            // PRESERVE INVENTORY: Never prune resources in a region where the query failed!
            continue;
          }

          const regionLiveIds = new Set<string>();
          const regionLiveNames = new Set<string>();
          const regionLiveIps = new Set<string>();

          for (const inst of discovery.instances) {
            regionLiveIds.add(inst.resourceId);
            if (inst.name) regionLiveNames.add(inst.name.toLowerCase().trim());
            regionLiveNames.add(inst.resourceId.toLowerCase().trim());
            if (inst.publicIp) regionLiveIps.add(inst.publicIp.trim());
            if (inst.privateIp) regionLiveIps.add(inst.privateIp.trim());

            allAccountLiveAwsIds.add(inst.resourceId);
            if (inst.name) allAccountLiveAwsNames.add(inst.name.toLowerCase().trim());
            allAccountLiveAwsNames.add(inst.resourceId.toLowerCase().trim());
            if (inst.publicIp) allAccountLiveAwsIps.add(inst.publicIp.trim());
            if (inst.privateIp) allAccountLiveAwsIps.add(inst.privateIp.trim());

            const existingRes = await CloudResource.findOne({ resourceId: inst.resourceId, provider: 'aws' }).lean();

            const instPublic = (inst.publicIp || '').trim();
            const instPrivate = (inst.privateIp || '').trim();
            const instName = (inst.name || '').toLowerCase().trim();
            const existingSshId = (existingRes as any)?.metadata?.sshServerId || (existingRes as any)?.tags?.sshServerId;

            const matchingServer = allRegisteredServers.find((s: any) => {
              const sId = s._id?.toString();
              if (existingSshId && sId && existingSshId === sId) return true;
              if (s.cloudResourceId && s.cloudResourceId === inst.resourceId) return true;
              if (s.instanceId && s.instanceId === inst.resourceId) return true;
              const sHost = (s.host || '').trim();
              const sName = (s.name || '').toLowerCase().trim();
              if (sHost && (sHost === instPublic || sHost === instPrivate)) return true;
              if (sName && (sName === instName || sName === inst.resourceId.toLowerCase())) return true;
              return false;
            });

            const isRunning = (inst.status || '').toLowerCase().includes('run');

            // Dynamically synchronize updated AWS EC2 Public/Private IP to matching Server record
            if (matchingServer) {
              const updatedHost = instPublic || instPrivate || matchingServer.host;
              await Server.updateOne(
                { _id: matchingServer._id },
                {
                  $set: {
                    host: updatedHost,
                    publicIp: instPublic || null,
                    privateIp: instPrivate || null,
                    cloudResourceId: inst.resourceId,
                    instanceId: inst.resourceId,
                    cloudPowerState: isRunning ? 'Running' : 'Stopped',
                    ...(isRunning ? {} : { status: 'Offline', lastError: 'Instance is stopped in AWS EC2' }),
                  },
                }
              ).catch(() => null);
            }

            // Preserve in-guest memory and disk if CloudWatch doesn't provide them
            const finalMemory = matchingServer?.metrics?.memory?.usagePercent
              ?? ((existingRes as any)?.metrics?.memoryUtilization ?? inst.metrics.memoryUtilization);

            const finalDisk = (matchingServer?.metrics?.disks?.find((d: any) => d.mount === '/') || matchingServer?.metrics?.disks?.[0])?.usagePercent
              ?? ((existingRes as any)?.metrics?.diskUtilization ?? inst.metrics.diskUtilization);

            const finalCpu = matchingServer?.metrics?.cpu?.usagePercent
              ?? inst.metrics.cpuUtilization;

            const isSSH = Boolean(matchingServer || (existingRes as any)?.metadata?.isSSHConnected || (existingRes as any)?.tags?.isSSHConnected === 'true');
            const sshId = matchingServer?._id?.toString() || existingSshId;

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
                  metrics: {
                    cpuUtilization: finalCpu,
                    memoryUtilization: finalMemory,
                    diskUtilization: finalDisk,
                    networkIn: inst.metrics.networkIn,
                    networkOut: inst.metrics.networkOut,
                    lastUpdated: new Date(),
                  },
                  metadata: {
                    ...((existingRes as any)?.metadata || {}),
                    availabilityZone: inst.availabilityZone,
                    vpcId: inst.vpcId,
                    subnetId: inst.subnetId,
                    launchTime: inst.launchTime,
                    rawState: inst.rawState,
                    isSSHConnected: isSSH,
                    sshServerId: sshId,
                  },
                  tags: {
                    ...((existingRes as any)?.tags || {}),
                    availabilityZone: inst.availabilityZone,
                    vpcId: inst.vpcId,
                    subnetId: inst.subnetId,
                    ...inst.tags,
                    isSSHConnected: isSSH ? 'true' : 'false',
                    sshServerId: sshId || '',
                  },
                  isDeleted: false,
                  deletedAt: null,
                  lastSyncAt: new Date(),
                  metricSource: isSSH ? 'SSH In-Guest Telemetry (Verified)' : 'Amazon CloudWatch',
                },
                $setOnInsert: {
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );

            totalAwsForAccount++;
          }

          // PRUNE TERMINATED EC2 INSTANCES ONLY IN THIS REGION WHERE QUERY SUCCEEDED:
          const pruneAwsRes = await CloudResource.deleteMany({
            provider: 'aws',
            accountId: acc.accountId,
            region: reg,
            resourceType: 'ec2',
            resourceId: { $nin: Array.from(regionLiveIds) },
          });

          // Also clean up terminated AWS EC2 instances from Server and AnsibleHost for this region
          await Server.deleteMany({
            cloudProvider: 'aws',
            region: reg,
            $and: [
              { name: { $nin: Array.from(regionLiveNames) } },
              { host: { $nin: Array.from(regionLiveIps) } },
              { tags: { $nin: Array.from(regionLiveIds) } },
            ],
          }).catch(() => null);

          await AnsibleHost.deleteMany({
            provider: 'aws',
            region: reg,
            $and: [
              { name: { $nin: Array.from(regionLiveNames) } },
              { ip: { $nin: Array.from(regionLiveIps) } },
              ...(regionLiveIds.size > 0 ? [{ instanceId: { $nin: Array.from(regionLiveIds) } }] : []),
            ],
          }).catch(() => null);

          await AnsibleController.deleteMany({
            provider: 'aws',
            region: reg,
            $and: [
              { name: { $nin: Array.from(regionLiveNames) } },
              { ipAddress: { $nin: Array.from(regionLiveIps) } },
              ...(regionLiveIds.size > 0 ? [{ instanceId: { $nin: Array.from(regionLiveIds) } }] : []),
            ],
          }).catch(() => null);

          // Sync status with any matching registered servers in Server collection
          for (const inst of discovery.instances) {
            await Server.updateMany(
              {
                $or: [
                  { name: inst.name },
                  { host: inst.publicIp },
                  { host: inst.privateIp },
                  { tags: inst.resourceId },
                ],
              },
              {
                $set: {
                  status: inst.status === 'Running' ? 'Online' : 'Offline',
                  lastError: inst.status === 'Running' ? null : 'Server stopped in AWS console',
                },
              }
            ).catch(() => null);
          }

          prunedCount += pruneAwsRes.deletedCount || 0;
        } catch (regErr: any) {
          const msg = `AWS sync error in ${reg} for ${acc.accountId}: ${regErr.message || regErr}`;
          console.warn(msg);
          errors.push(msg);
        }
      }

      // Account-level cleanup: If at least one region query succeeded, purge any AWS server not present in any live region
      if (discoveryResults.some((d) => d.success)) {
        await Server.deleteMany({
          cloudProvider: 'aws',
          $and: [
            { name: { $nin: Array.from(allAccountLiveAwsNames) } },
            { host: { $nin: Array.from(allAccountLiveAwsIps) } },
            { tags: { $nin: Array.from(allAccountLiveAwsIds) } },
          ],
        }).catch(() => null);

        await AnsibleHost.deleteMany({
          provider: 'aws',
          $and: [
            { name: { $nin: Array.from(allAccountLiveAwsNames) } },
            { ip: { $nin: Array.from(allAccountLiveAwsIps) } },
            ...(allAccountLiveAwsIds.size > 0 ? [{ instanceId: { $nin: Array.from(allAccountLiveAwsIds) } }] : []),
          ],
        }).catch(() => null);

        await AnsibleController.deleteMany({
          provider: 'aws',
          $and: [
            { name: { $nin: Array.from(allAccountLiveAwsNames) } },
            { ipAddress: { $nin: Array.from(allAccountLiveAwsIps) } },
            ...(allAccountLiveAwsIds.size > 0 ? [{ instanceId: { $nin: Array.from(allAccountLiveAwsIds) } }] : []),
          ],
        }).catch(() => null);

        // If active controller was deleted, ensure another controller is active
        const activeCtrl = await AnsibleController.findOne({ isActive: true });
        if (!activeCtrl) {
          const nextCtrl = await AnsibleController.findOne().sort({ createdAt: 1 });
          if (nextCtrl) {
            nextCtrl.isActive = true;
            await nextCtrl.save();
          }
        }
      }

      awsCount += totalAwsForAccount;

      await CloudAccount.updateOne(
        { _id: acc._id },
        {
          $set: {
            resourcesCount: totalAwsForAccount,
            availableRegions: enabledRegions,
            lastSyncAt: new Date(),
          },
        }
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

    // -------------------------------------------------------------
    // 5. RECONCILE REGISTERED SSH SERVERS & TELEMETRY
    // -------------------------------------------------------------
    try {
      await syncAllRegisteredServers();
    } catch (serverErr: any) {
      const msg = `Server synchronization error: ${serverErr.message || serverErr}`;
      console.warn(msg);
      errors.push(msg);
    }

    // -------------------------------------------------------------
    // 6. EVALUATE ALL COLLECTED METRICS FOR THRESHOLD-BASED ALERTS
    // -------------------------------------------------------------
    try {
      console.log('[Reconciliation] 🔍 Running threshold evaluation for all monitored resources...');
      const evalResult = await evaluateAllMonitoredResources();
      console.log('[Reconciliation] 📊 Evaluation completed:', JSON.stringify(evalResult));
    } catch (evalErr: any) {
      const msg = `Threshold alert evaluation error: ${evalErr.message || evalErr}`;
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
