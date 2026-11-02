import connectToDatabase from '@/lib/mongodb';
import Server, { IServer } from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import Metric from '@/models/Metric';
import { decryptSecret } from './crypto';
import { collectServerViaSSH } from './sshCollector';
import { evaluateResourceMetrics } from '@/lib/monitoring/alertEvaluationEngine';

/**
 * Synchronize a single server via SSH, update MongoDB models and CloudResources.
 */
export async function syncSingleServer(serverId: string): Promise<IServer | null> {
  await connectToDatabase();

  const server = await Server.findById(serverId);
  if (!server) {
    throw new Error(`Server ${serverId} not found`);
  }

  // Decrypt secret
  let authSecret = '';
  try {
    authSecret = decryptSecret({
      encrypted: server.encryptedAuthSecret,
      iv: server.authSecretIv,
      tag: server.authSecretTag,
    });
  } catch (err: any) {
    server.status = 'Failed';
    server.lastError = `Decryption failure: ${err.message}`;
    await server.save();
    throw new Error(`Failed to decrypt credentials for server ${server.name}`);
  }

  try {
    const specs = await collectServerViaSSH({
      host: server.host,
      port: server.port || 22,
      username: server.username,
      authMethod: server.authMethod,
      authSecret,
      timeoutMs: 12000,
    });

    // Update server state
    server.status = 'Online';
    server.lastError = null;
    server.lastConnectedAt = new Date();
    if (specs.fingerprint) {
      server.hostFingerprint = specs.fingerprint;
    }

    server.os = specs.os;
    server.hardware = specs.hardware;
    server.metrics = specs.metrics;
    server.docker = {
      ...specs.docker,
      lastSyncedAt: new Date(),
    };
    server.kubernetes = {
      ...specs.kubernetes,
      lastSyncedAt: new Date(),
    };

    await server.save();

    // 1. Record time-series points to Metric model for performance charting
    const primaryDiskUsage =
      Array.isArray(specs.metrics.disks) && specs.metrics.disks.length > 0
        ? specs.metrics.disks[0].usagePercent
        : null;

    await Metric.create([
      {
        resourceId: `srv-${server._id.toString()}`,
        resourceType: 'Server',
        metricName: 'CPU',
        value: specs.metrics.cpu.usagePercent,
        unit: 'Percent',
        provider: server.cloudProvider === 'azure' ? 'azure' : server.cloudProvider === 'aws' ? 'aws' : 'other',
        timestamp: new Date(),
      },
      {
        resourceId: `srv-${server._id.toString()}`,
        resourceType: 'Server',
        metricName: 'Memory',
        value: specs.metrics.memory.usagePercent,
        unit: 'Percent',
        provider: server.cloudProvider === 'azure' ? 'azure' : server.cloudProvider === 'aws' ? 'aws' : 'other',
        timestamp: new Date(),
      },
      ...(primaryDiskUsage !== null
        ? [
            {
              resourceId: `srv-${server._id.toString()}`,
              resourceType: 'Server',
              metricName: 'Disk',
              value: primaryDiskUsage,
              unit: 'Percent',
              provider: server.cloudProvider === 'azure' ? 'azure' : server.cloudProvider === 'aws' ? 'aws' : 'other',
              timestamp: new Date(),
            },
          ]
        : []),
    ]).catch(() => null);

    // 2. Mirror into CloudResource for unified multi-cloud inventory
    const cloudResourceDoc = {
      resourceId: `srv-${server._id.toString()}`,
      provider: server.cloudProvider,
      accountId: 'custom-server',
      region: server.region || 'on-prem',
      name: server.name,
      resourceType: 'Server',
      status: 'Running',
      metrics: {
        cpuUtilization: specs.metrics.cpu.usagePercent,
        memoryUtilization: specs.metrics.memory.usagePercent,
        diskUtilization: specs.metrics.disks[0]?.usagePercent || 0,
        networkIn: specs.metrics.network[0]?.bytesReceived || 0,
        networkOut: specs.metrics.network[0]?.bytesSent || 0,
      },
      tags: {
        environment: server.environment,
        ip: server.host,
        os: `${specs.os.name} ${specs.os.version}`,
      },
      isDeleted: false,
      lastSyncedAt: new Date(),
    };

    await CloudResource.findOneAndUpdate(
      { resourceId: `srv-${server._id.toString()}` },
      { $set: cloudResourceDoc },
      { upsert: true }
    );

    // 3. Real-time threshold-based alert evaluation (CPU, Memory, Disks)
    await evaluateResourceMetrics({
      resourceId: `srv-${server._id.toString()}`,
      resourceName: server.name,
      resourceType: 'Server',
      provider: server.cloudProvider || 'other',
      region: server.region || 'global',
      metrics: {
        cpuUtilization: specs.metrics.cpu.usagePercent,
        memoryUtilization: specs.metrics.memory.usagePercent,
        disks: specs.metrics.disks || [],
        timestamp: specs.metrics.cpu.timestamp || new Date(),
      },
    }).catch((err) => console.warn('[ServerSync] Alert evaluation note:', err.message));

    return server;
  } catch (syncErr: any) {
    server.status = 'Failed';
    server.lastError = syncErr.message || 'Connection failed';
    await server.save();
    throw syncErr;
  }
}

/**
 * Reconcile and synchronize all active servers in background.
 * One failing server will NEVER interrupt the synchronization of other servers.
 */
export async function syncAllRegisteredServers(): Promise<{ successful: number; failed: number }> {
  await connectToDatabase();

  const servers = await Server.find().lean();
  let successful = 0;
  let failed = 0;

  for (const s of servers) {
    try {
      await syncSingleServer(s._id.toString());
      successful++;
    } catch (e: any) {
      console.warn(`[ServerSync] Warning: Failed to sync ${s.name} (${s.host}):`, e.message);
      failed++;
    }
  }

  return { successful, failed };
}
