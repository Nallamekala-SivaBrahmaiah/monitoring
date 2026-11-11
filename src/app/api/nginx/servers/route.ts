import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import AnsibleController from '@/models/AnsibleController';
import AnsibleHost from '@/models/AnsibleHost';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';

/**
 * Synchronize real cloud VMs, servers, controllers, and managed hosts into NginxServer
 */
async function autoImportExistingServers() {
  // 0. Aggressively purge any racha, nacha, rachana, 44.199.21.34, or on-premise records
  try {
    await Promise.all([
      NginxServer.deleteMany({
        $or: [
          { name: { $regex: /racha|nacha|rachana/i } },
          { host: { $regex: /racha|nacha|rachana/i } },
          { host: '44.199.21.34' },
          { cloudProvider: { $regex: /premise/i } },
        ],
      } as any),
      Server.deleteMany({
        $or: [
          { name: { $regex: /racha|nacha|rachana/i } },
          { host: { $regex: /racha|nacha|rachana/i } },
          { host: '44.199.21.34' },
          { ip: '44.199.21.34' },
          { cloudProvider: { $regex: /premise/i } },
        ],
      } as any),
      AnsibleHost.deleteMany({
        $or: [
          { name: { $regex: /racha|nacha|rachana/i } },
          { ip: '44.199.21.34' },
          { provider: { $regex: /premise/i } },
        ],
      } as any),
      CloudResource.deleteMany({
        $or: [
          { name: { $regex: /racha|nacha|rachana/i } },
          { publicIp: '44.199.21.34' },
          { privateIp: '44.199.21.34' },
        ],
      } as any),
    ]);
  } catch (err: any) {
    console.warn('[NginxServersAPI] Purge warning:', err?.message);
  }

  const [servers, cloudResources, controllers, ansibleHosts] = await Promise.all([
    Server.find({
      host: { $ne: '44.199.21.34' },
      name: { $not: /racha|nacha|rachana/i },
      cloudProvider: { $nin: ['on-premise', 'other'] },
    } as any).lean(),
    CloudResource.find({
      provider: { $in: ['aws', 'azure'] },
      publicIp: { $ne: '44.199.21.34' },
      privateIp: { $ne: '44.199.21.34' },
      name: { $not: /racha|nacha|rachana/i },
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    }).lean(),
    AnsibleController.find({
      ipAddress: { $ne: '44.199.21.34' },
      name: { $not: /racha|nacha|rachana/i },
    }).lean(),
    AnsibleHost.find({
      ip: { $ne: '44.199.21.34' },
      name: { $not: /racha|nacha|rachana/i },
      provider: { $nin: ['on-premise'] },
    } as any).lean(),
  ]);

  // Index credentials from Server, Controller, and AnsibleHost
  const credsByLookup = new Map<string, any>();
  for (const s of servers as any[]) {
    if (s.encryptedAuthSecret) {
      if (s.host) credsByLookup.set(s.host.trim().toLowerCase(), s);
      if (s.ip) credsByLookup.set(s.ip.trim().toLowerCase(), s);
      if (s.name) credsByLookup.set(s.name.trim().toLowerCase(), s);
      if (s.resourceId) credsByLookup.set(s.resourceId.trim().toLowerCase(), s);
    }
  }
  for (const c of controllers as any[]) {
    if (c.encryptedAuthSecret) {
      if (c.ipAddress) credsByLookup.set(c.ipAddress.trim().toLowerCase(), c);
      if (c.name) credsByLookup.set(c.name.trim().toLowerCase(), c);
    }
  }
  for (const h of ansibleHosts as any[]) {
    if (h.encryptedAuthSecret) {
      if (h.ip) credsByLookup.set(h.ip.trim().toLowerCase(), h);
      if (h.name) credsByLookup.set(h.name.trim().toLowerCase(), h);
    }
  }

  // Fallback AWS server credentials
  const defaultAwsServer = (servers as any[]).find((s) => s.cloudProvider === 'aws' && s.encryptedAuthSecret)
    || (ansibleHosts as any[]).find((h) => h.provider === 'aws' && h.encryptedAuthSecret)
    || (controllers as any[]).find((c) => c.encryptedAuthSecret);

  // 1. Sync from Server collection
  for (const s of servers as any[]) {
    const host = (s.host || s.ip || '').trim();
    if (!host || host === '44.199.21.34') continue;
    if (s.cloudProvider === 'on-premise' || s.cloudProvider === 'on-premises') continue;
    if (/racha|nacha|rachana/i.test(s.name || '') || /racha|nacha|rachana/i.test(host)) continue;

    const matchedCr = cloudResources.find((cr: any) => {
      const crPub = (cr.publicIp || '').trim();
      const crPriv = (cr.privateIp || '').trim();
      const crName = (cr.name || '').toLowerCase().trim();
      const sName = (s.name || '').toLowerCase().trim();
      return (crPub && crPub === host) || (crPriv && crPriv === host) || (crName && crName === sName);
    });

    const isOnline = s.status === 'Online' || (matchedCr?.status && matchedCr.status.toLowerCase().includes('run'));
    const cpuP = s.metrics?.cpu?.usagePercent ?? matchedCr?.metrics?.cpuUtilization;
    const memP = s.metrics?.memory?.usagePercent ?? matchedCr?.metrics?.memoryUtilization;
    const diskP = s.metrics?.disks?.[0]?.usagePercent;

    const metricsObj: any = {};
    if (typeof cpuP === 'number') metricsObj.cpuPercent = Math.round(cpuP);
    if (typeof memP === 'number') metricsObj.memoryPercent = Math.round(memP);
    if (typeof diskP === 'number') metricsObj.diskPercent = Math.round(diskP);
    if (s.os?.uptimeFormatted) metricsObj.uptime = s.os.uptimeFormatted;

    if (s.metrics?.memory?.totalBytes && s.metrics?.memory?.usedBytes) {
      metricsObj.memoryUsedGb = Number((s.metrics.memory.usedBytes / (1024 ** 3)).toFixed(1));
      metricsObj.memoryTotalGb = Number((s.metrics.memory.totalBytes / (1024 ** 3)).toFixed(1));
    }
    if (s.metrics?.disks?.[0]?.totalBytes && s.metrics?.disks?.[0]?.usedBytes) {
      metricsObj.diskUsedGb = Number((s.metrics.disks[0].usedBytes / (1024 ** 3)).toFixed(1));
      metricsObj.diskTotalGb = Number((s.metrics.disks[0].totalBytes / (1024 ** 3)).toFixed(1));
    }

    const netRx = s.metrics?.network?.[0]?.bytesReceived;
    const netTx = s.metrics?.network?.[0]?.bytesSent;
    if (netRx) metricsObj.networkRx = `${(netRx / (1024 * 1024)).toFixed(1)} MB`;
    if (netTx) metricsObj.networkTx = `${(netTx / (1024 * 1024)).toFixed(1)} MB`;

    const updateObj: any = {
      $setOnInsert: {
        host,
        cloudProvider: (s.cloudProvider || 'aws').toLowerCase(),
        isActive: true,
      },
      $set: {
        name: s.name || `server-${host}`,
        connectionStatus: isOnline ? 'Online' : (s.status === 'Failed' ? 'Failed' : 'Offline'),
        privateIp: matchedCr?.privateIp || s.privateIp || '',
        region: s.region || matchedCr?.region || '',
        instanceId: matchedCr?.resourceId || s.resourceId || '',
        osName: s.os?.name || (matchedCr?.metadata as any)?.os || 'Linux',
        osVersion: s.os?.version || '',
        ...(Object.keys(metricsObj).length > 0 ? { metrics: metricsObj } : {}),
        lastConnectedAt: s.lastConnectedAt || new Date(),
      },
    };

    if (s.encryptedAuthSecret) {
      updateObj.$set.encryptedAuthSecret = s.encryptedAuthSecret;
      updateObj.$set.authSecretIv = s.authSecretIv || '';
      updateObj.$set.authSecretTag = s.authSecretTag || '';
      updateObj.$set.username = s.username || 'ubuntu';
      updateObj.$set.port = s.port || 22;
      updateObj.$set.authMethod = s.authMethod || 'privateKey';
    } else {
      updateObj.$setOnInsert.username = s.username || 'ubuntu';
      updateObj.$setOnInsert.port = s.port || 22;
      updateObj.$setOnInsert.authMethod = 'privateKey';
    }

    try {
      await NginxServer.findOneAndUpdate({ host }, updateObj, { upsert: true });
    } catch (err: any) {
      console.warn(`[NginxServersAPI] Failed to upsert server from Server collection (${host}):`, err.message);
    }
  }

  // 2. Sync from CloudResource (AWS EC2 & Azure VMs)
  for (const cr of cloudResources as any[]) {
    const host = (cr.publicIp && cr.publicIp !== '-' ? cr.publicIp : cr.privateIp || '').trim();
    if (!host || host === '-' || host === '44.199.21.34') continue;
    if (cr.provider === 'on-premise' || cr.provider === 'on-premises') continue;
    if (/racha|nacha|rachana/i.test(cr.name || '') || /racha|nacha|rachana/i.test(host)) continue;

    const creds =
      credsByLookup.get(host.toLowerCase()) ||
      credsByLookup.get((cr.name || '').trim().toLowerCase()) ||
      credsByLookup.get((cr.resourceId || '').trim().toLowerCase()) ||
      (cr.provider === 'aws' ? defaultAwsServer : null);

    const isAzure = cr.provider === 'azure';
    const isOnline = (cr.status || '').toLowerCase().includes('run');
    const cpuP = cr.metrics?.cpuUtilization;
    const memP = cr.metrics?.memoryUtilization;
    const metricsObj: any = {};
    if (typeof cpuP === 'number') metricsObj.cpuPercent = Math.round(cpuP);
    if (typeof memP === 'number') metricsObj.memoryPercent = Math.round(memP);

    const updateObj: any = {
      $setOnInsert: {
        host,
        cloudProvider: (cr.provider || 'aws').toLowerCase(),
        isActive: true,
      },
      $set: {
        name: cr.name || `vm-${host}`,
        connectionStatus: isOnline ? 'Online' : 'Offline',
        privateIp: cr.privateIp || '',
        region: cr.region || '',
        instanceId: cr.resourceId || '',
        osName: (cr.metadata as any)?.os || 'Linux',
        ...(Object.keys(metricsObj).length > 0 ? { metrics: metricsObj } : {}),
      },
    };

    if (creds?.encryptedAuthSecret) {
      updateObj.$set.encryptedAuthSecret = creds.encryptedAuthSecret;
      updateObj.$set.authSecretIv = creds.authSecretIv || '';
      updateObj.$set.authSecretTag = creds.authSecretTag || '';
      updateObj.$set.username = creds.username || (isAzure ? 'azureuser' : 'ubuntu');
      updateObj.$set.port = creds.port || 22;
      updateObj.$set.authMethod = creds.authMethod || 'privateKey';
    } else {
      updateObj.$setOnInsert.username = isAzure ? 'azureuser' : 'ubuntu';
      updateObj.$setOnInsert.port = 22;
      updateObj.$setOnInsert.authMethod = 'privateKey';
    }

    try {
      await NginxServer.findOneAndUpdate({ host }, updateObj, { upsert: true });
    } catch (err: any) {
      console.warn(`[NginxServersAPI] Failed to upsert server from CloudResource (${host}):`, err.message);
    }
  }

  // 3. Sync from Ansible Controllers
  for (const c of controllers as any[]) {
    const host = (c.ipAddress || '').trim();
    if (!host) continue;

    const updateObj: any = {
      $setOnInsert: {
        host,
        cloudProvider: (c.provider || 'aws').toLowerCase(),
        isActive: true,
      },
      $set: {
        name: c.name || `ctrl-${host}`,
        connectionStatus: c.status === 'Online' ? 'Online' : 'Offline',
        region: c.region || '',
        osName: c.os || 'Linux',
      },
    };

    if (c.encryptedAuthSecret) {
      updateObj.$set.encryptedAuthSecret = c.encryptedAuthSecret;
      updateObj.$set.authSecretIv = c.authSecretIv || '';
      updateObj.$set.authSecretTag = c.authSecretTag || '';
      updateObj.$set.username = c.username || 'ubuntu';
      updateObj.$set.port = c.port || 22;
      updateObj.$set.authMethod = c.authMethod || 'privateKey';
    } else {
      updateObj.$setOnInsert.username = c.username || 'ubuntu';
      updateObj.$setOnInsert.port = c.port || 22;
      updateObj.$setOnInsert.authMethod = 'privateKey';
    }

    try {
      await NginxServer.findOneAndUpdate({ host }, updateObj, { upsert: true });
    } catch (err: any) {
      console.warn(`[NginxServersAPI] Failed to upsert controller (${host}):`, err.message);
    }
  }

  // 4. Sync from AnsibleHost (Managed Nodes / Workers)
  for (const h of ansibleHosts as any[]) {
    const host = (h.ip || '').trim();
    if (!host) continue;

    const updateObj: any = {
      $setOnInsert: {
        host,
        cloudProvider: (h.provider || 'aws').toLowerCase(),
        isActive: true,
      },
      $set: {
        name: h.name || `node-${host}`,
        connectionStatus: h.status === 'Connected' ? 'Online' : 'Offline',
        privateIp: h.privateIp || '',
        region: h.region || '',
        instanceId: h.instanceId || '',
        osName: h.os || 'Linux',
      },
    };

    if (h.encryptedAuthSecret) {
      updateObj.$set.encryptedAuthSecret = h.encryptedAuthSecret;
      updateObj.$set.authSecretIv = h.authSecretIv || '';
      updateObj.$set.authSecretTag = h.authSecretTag || '';
      updateObj.$set.username = h.username || 'ubuntu';
      updateObj.$set.port = h.port || 22;
      updateObj.$set.authMethod = h.authMethod || 'privateKey';
    } else {
      updateObj.$setOnInsert.username = h.username || 'ubuntu';
      updateObj.$setOnInsert.port = h.port || 22;
      updateObj.$setOnInsert.authMethod = 'privateKey';
    }

    try {
      await NginxServer.findOneAndUpdate({ host }, updateObj, { upsert: true });
    } catch (err: any) {
      console.warn(`[NginxServersAPI] Failed to upsert ansible host (${host}):`, err.message);
    }
  }

  // 5. Purge any legacy demo "rachana" records
  try {
    await NginxServer.deleteMany({
      $or: [
        { name: { $regex: /rachana/i } },
        { host: { $regex: /rachana/i } },
      ],
    });
  } catch {}
}

/**
 * GET /api/nginx/servers
 * List all servers registered in Nginx module
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    try {
      await autoImportExistingServers();
    } catch (syncErr: any) {
      console.warn('[NginxServersAPI] Auto-sync warning:', syncErr?.message || syncErr);
    }

    const servers = await NginxServer.find({
      host: { $ne: '44.199.21.34' },
      name: { $not: /racha|nacha|rachana/i },
      cloudProvider: { $regex: /^(?!.*premise).*$/i },
    } as any)
      .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
      .sort({ createdAt: -1 })
      .lean();

    let finalServers = servers;
    if (finalServers.length === 0) {
      const fallbackServers = await Server.find({
        host: { $ne: '44.199.21.34' },
        name: { $not: /racha|nacha|rachana/i },
        cloudProvider: { $in: ['aws', 'azure'] },
      } as any).select('-encryptedAuthSecret -authSecretIv -authSecretTag').lean();
      if (fallbackServers.length > 0) {
        finalServers = fallbackServers.map((s: any) => ({
          _id: s._id,
          name: s.name,
          host: s.host || s.ip,
          port: s.port || 22,
          username: s.username || 'ubuntu',
          authMethod: s.authMethod || 'privateKey',
          cloudProvider: s.cloudProvider || 'aws',
          region: s.region || '',
          connectionStatus: s.status === 'Online' ? 'Online' : 'Offline',
          metrics: {
            cpuPercent: s.metrics?.cpu?.usagePercent || 0,
            memoryPercent: s.metrics?.memory?.usagePercent || 0,
            diskPercent: s.metrics?.disks?.[0]?.usagePercent || 0,
            uptime: s.os?.uptimeFormatted || '0m',
          },
        })) as any[];
      }
    }

    // Strict filter to guarantee no on-premise, racha, nacha, or 44.199.21.34 is ever returned
    finalServers = finalServers.filter((s: any) => {
      const host = (s.host || '').trim();
      const name = (s.name || '').toLowerCase().trim();
      const provider = (s.cloudProvider || '').toLowerCase().trim();
      if (host === '44.199.21.34') return false;
      if (provider === 'on-premise' || provider === 'on-premises' || provider === 'onpremise') return false;
      if (/racha|nacha|rachana/i.test(name) || /racha|nacha|rachana/i.test(host)) return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      servers: finalServers,
      count: finalServers.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/nginx/servers
 * Register new server (either manual or imported from CloudResource / Server)
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      name,
      host,
      port = 22,
      username = 'ubuntu',
      authMethod = 'privateKey',
      authSecret = '',
      cloudProvider = 'aws',
      instanceId = '',
      region = '',
      importFromServerId,
    } = body;

    let encryptedAuthSecret = '';
    let authSecretIv = '';
    let authSecretTag = '';

    // If importing from existing Server
    if (importFromServerId) {
      const srcServer = await Server.findById(importFromServerId).lean();
      if (!srcServer) {
        return NextResponse.json({ success: false, error: 'Source server not found' }, { status: 404 });
      }
      encryptedAuthSecret = srcServer.encryptedAuthSecret;
      authSecretIv = srcServer.authSecretIv;
      authSecretTag = srcServer.authSecretTag;
    } else if (authSecret) {
      const encrypted = encryptSecret(authSecret);
      encryptedAuthSecret = encrypted.encrypted;
      authSecretIv = encrypted.iv;
      authSecretTag = encrypted.tag;
    }

    if (!host) {
      return NextResponse.json({ success: false, error: 'Host IP is required.' }, { status: 400 });
    }

    const serverDoc = await NginxServer.create({
      name: name || host,
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      authMethod,
      encryptedAuthSecret,
      authSecretIv,
      authSecretTag,
      cloudProvider,
      instanceId,
      region,
      connectionStatus: 'Untested',
      isActive: true,
    });

    const safeDoc = serverDoc.toObject();
    delete (safeDoc as any).encryptedAuthSecret;
    delete (safeDoc as any).authSecretIv;
    delete (safeDoc as any).authSecretTag;

    return NextResponse.json({
      success: true,
      server: safeDoc,
      message: `Server "${serverDoc.name}" registered successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
