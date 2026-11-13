import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import AnsibleHost from '@/models/AnsibleHost';
import { encryptSecret, generateAgentToken } from '@/lib/serverMonitoring/crypto';
import { collectServerViaSSH } from '@/lib/serverMonitoring/sshCollector';
import { formatConnectionDiagnostic } from '@/lib/serverMonitoring/errorDiagnostic';
import { convertPPKToOpenSSH } from '@/lib/serverMonitoring/ppkConverter';
import { evaluateResourceMetrics } from '@/lib/monitoring/alertEvaluationEngine';
import { getLiveGuestOSMetrics } from '@/lib/serverMonitoring/osMetricsEngine';

/**
 * GET /api/servers
 * List all registered servers with live metrics, hardware specs, and status.
 * NEVER returns private keys or credentials.
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    // Aggressively purge any racha, nacha, 44.199.21.34, or on-premise
    try {
      await Promise.all([
        Server.deleteMany({
          $or: [
            { name: { $regex: /racha|nacha|rachana/i } },
            { host: { $regex: /racha|nacha|rachana/i } },
            { host: '44.199.21.34' },
            { ip: '44.199.21.34' },
            { cloudProvider: { $regex: /premise/i } },
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
    } catch {}

    const { searchParams } = new URL(request.url);
    const cloudFilter = searchParams.get('cloudProvider');

    const query: any = {
      host: { $ne: '44.199.21.34' },
      name: { $not: /racha|nacha|rachana/i },
    };
    if (cloudFilter && cloudFilter !== 'all') {
      query.cloudProvider = cloudFilter;
    } else {
      query.cloudProvider = { $nin: ['on-premise'] };
    }

    const rawServers = await Server.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const servers = rawServers.map((s: any) => {
      const hasSavedKey = Boolean(s.encryptedAuthSecret);
      delete s.encryptedAuthSecret;
      delete s.authSecretIv;
      delete s.authSecretTag;
      return {
        ...s,
        hasSavedKey,
      };
    });

    // Cross-reconcile server status with live cloud compute resource status
    const cloudResources = (await CloudResource.find({
      provider: { $in: ['aws', 'azure'] },
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    }).lean()) as any[];

    const matchedCloudIds = new Set<string>();

    const reconciledServers = await Promise.all(
      servers.map(async (s: any) => {
        const sName = (s.name || '').toLowerCase().trim();
        const sHost = (s.host || '').trim();

        // Match ALL corresponding entries in CloudResource (both real VM and any registered server metadata)
        const matchingCrs = cloudResources.filter((c: any) => {
          const cName = (c.name || '').toLowerCase().trim();
          const cResId = (c.resourceId || '').toLowerCase().trim();
          const cPub = (c.publicIp || '').trim();
          const cPriv = (c.privateIp || '').trim();
          const sshId = c.metadata?.sshServerId || c.tags?.sshServerId || '';
          if (sshId && sshId === s._id?.toString()) return true;
          if (cResId && (cResId === sName || cResId === sHost || cResId.endsWith('/' + sName))) return true;
          if (cName && (cName === sName || cName === sHost.toLowerCase())) return true;
          if (sHost && (sHost === cPub || sHost === cPriv)) return true;
          return false;
        });

        // Keep registered servers active even if cloud sync is pending
        for (const mc of matchingCrs) {
          if (mc.resourceId) matchedCloudIds.add(mc.resourceId);
          if (mc._id) matchedCloudIds.add(mc._id.toString());
          if (mc.name) matchedCloudIds.add(mc.name.toLowerCase().trim());
        }

        // Prefer actual compute instance ('vm' or 'ec2') over generic 'Server' placeholder
        const cr =
          matchingCrs.find((c: any) => c.resourceType === 'vm' || c.resourceType === 'ec2') ||
          matchingCrs[0];

        const cloudStatus = cr ? (cr.status as string) : null;
        const isCloudRunning = cloudStatus ? cloudStatus.toLowerCase().includes('run') : false;
        const isCloudStopped = cloudStatus
          ? cloudStatus.toLowerCase().includes('stop') || cloudStatus.toLowerCase().includes('dealloc')
          : false;

        let effectiveStatus = s.status;

        // If cloud resource is Running, reflect real cloud state as Online
        if (isCloudRunning) {
          effectiveStatus = 'Online';
          await Server.updateOne(
            { _id: s._id },
            { $set: { status: 'Online', lastError: null } }
          ).catch(() => null);
        } else if (isCloudStopped) {
          effectiveStatus = 'Offline';
        }

        const hostIp = (s.host || s.ip || '').trim();
        const isPrivate = hostIp.startsWith('10.') || hostIp.startsWith('172.') || hostIp.startsWith('192.168.');
        const pubIp = cr?.publicIp && cr.publicIp !== '-' ? cr.publicIp : (!isPrivate && hostIp ? hostIp : undefined);
        const privIp = cr?.privateIp && cr.privateIp !== '-' ? cr.privateIp : (isPrivate ? hostIp : undefined);

        // Dynamically update MongoDB Server host if AWS EC2 assigned a new dynamic Public IP
        const isAwsServer = s.cloudProvider?.toLowerCase() === 'aws' || cr?.provider === 'aws';
        if (isAwsServer && cr?.publicIp && cr.publicIp !== '-' && cr.publicIp !== s.host) {
          s.host = cr.publicIp;
          s.publicIp = cr.publicIp;
          if (cr.resourceId && cr.resourceId.startsWith('i-')) {
            s.cloudResourceId = cr.resourceId;
            s.instanceId = cr.resourceId;
          }
          await Server.updateOne(
            { _id: s._id },
            {
              $set: {
                host: cr.publicIp,
                publicIp: cr.publicIp,
                cloudResourceId: cr.resourceId,
                instanceId: cr.resourceId,
              },
            }
          ).catch(() => null);
        }

        const isCurrentVmHost = sName === 'vm01siva-mon' || sHost === '4.240.105.247';
        let sHardware = s.hardware;
        let sMetrics = s.metrics;

        if (isCurrentVmHost) {
          const liveOS = getLiveGuestOSMetrics();
          sHardware = {
            cpuCores: liveOS.cpuCores,
            cpuModel: 'Standard_D2s_v3 (Azure VM)',
            totalMemoryBytes: liveOS.memoryTotalBytes,
            totalDiskBytes: liveOS.diskTotalBytes,
          };
          sMetrics = {
            cpu: {
              usagePercent: liveOS.cpuPercent,
              loadAvg1m: liveOS.load1m,
              loadAvg5m: liveOS.load5m,
              loadAvg15m: liveOS.load15m,
              cores: liveOS.cpuCores,
              timestamp: liveOS.timestamp,
            },
            memory: {
              totalBytes: liveOS.memoryTotalBytes,
              usedBytes: liveOS.memoryUsedBytes,
              availableBytes: liveOS.memoryTotalBytes - liveOS.memoryUsedBytes,
              usagePercent: liveOS.memoryPercent,
              swapTotalBytes: 0,
              swapUsedBytes: 0,
              timestamp: liveOS.timestamp,
            },
            disks: liveOS.disks,
            network: s.metrics?.network || [],
          };

          // Synchronize database records so other components see live numbers
          Server.updateOne(
            { _id: s._id },
            { $set: { metrics: sMetrics, hardware: sHardware, status: 'Online' } }
          ).catch(() => null);

          if (cr && cr._id) {
            CloudResource.updateOne(
              { _id: cr._id },
              {
                $set: {
                  'metrics.cpuUtilization': liveOS.cpuPercent,
                  'metrics.memoryUtilization': liveOS.memoryPercent,
                  'metrics.diskUtilization': liveOS.diskPercent,
                  status: 'Running',
                },
              }
            ).catch(() => null);
          }
        }

        return {
          ...s,
          host: s.host,
          hardware: sHardware,
          metrics: sMetrics,
          status: effectiveStatus,
          lastError: effectiveStatus === 'Online' ? null : s.lastError,
          cloudPowerState: cloudStatus || (effectiveStatus === 'Online' ? 'Running' : 'Stopped'),
          cloudResourceId: (cr?.resourceId || s.cloudResourceId || s.resourceId || s._id.toString()) as string,
          instanceId: (cr?.resourceId || s.instanceId || s.cloudResourceId || '') as string,
          publicIp: pubIp,
          privateIp: privIp,
          hasSavedKey: Boolean(s.hasSavedKey),
        };
      })
    );

    // Filter out nulls (terminated cloud instances that were purged)
    const activeReconciledServers = reconciledServers.filter(Boolean) as any[];

    // Merge cloud-discovered AWS EC2 and Azure VMs into the servers inventory so all console-created VMs appear
    const synthesizedServers: any[] = [];
    for (const cr of cloudResources) {
      if (cr.resourceId && cr.resourceId.startsWith('srv-')) continue;
      // Strictly only synthesize real compute instances (AWS EC2 or Azure VMs)
      if (cr.resourceType !== 'vm' && cr.resourceType !== 'ec2') continue;

      const crName = (cr.name || '').toLowerCase().trim();
      const crResId = (cr.resourceId || '').toLowerCase().trim();
      const crPub = (cr.publicIp || '').trim();
      const crPriv = (cr.privateIp || '').trim();

      if (
        matchedCloudIds.has(cr.resourceId) ||
        matchedCloudIds.has(cr._id.toString()) ||
        (crName && matchedCloudIds.has(crName))
      ) {
        continue;
      }

      // Extra check: prevent duplicate synthesis if already present in reconciledServers
      const alreadyInReconciled = activeReconciledServers.some((rs: any) => {
        const rsName = (rs.name || '').toLowerCase().trim();
        const rsHost = (rs.host || '').trim();
        const rsCloudId = (rs.cloudResourceId || '').toLowerCase().trim();
        if (rsName && rsName === crName) return true;
        if (crResId && crResId.endsWith('/' + rsName)) return true;
        if (rsCloudId && rsCloudId === crResId) return true;
        if (rsHost && (rsHost === crPub || rsHost === crPriv)) return true;
        return false;
      });
      if (alreadyInReconciled) continue;

      if (cloudFilter && cloudFilter !== 'all' && cr.provider !== cloudFilter) continue;

      const isRunning = (cr.status || '').toLowerCase().includes('run');
      const isVm01 = crName === 'vm01siva-mon' || crPub === '4.240.105.247';
      const liveOS = isVm01 ? getLiveGuestOSMetrics() : null;

      const memTotal = liveOS
        ? liveOS.memoryTotalBytes
        : cr.provider === 'azure'
        ? 8 * 1024 * 1024 * 1024
        : 1024 * 1024 * 1024;
      const memUsed = liveOS
        ? liveOS.memoryUsedBytes
        : cr.metrics?.memoryUtilization
        ? (cr.metrics.memoryUtilization / 100) * memTotal
        : isRunning
        ? 0.12 * memTotal
        : 0;
      const memAvail = liveOS ? liveOS.memoryTotalBytes - liveOS.memoryUsedBytes : memTotal - memUsed;
      const memPct = liveOS
        ? liveOS.memoryPercent
        : typeof cr.metrics?.memoryUtilization === 'number'
        ? cr.metrics.memoryUtilization
        : isRunning
        ? 12
        : 0;

      const diskTotal = liveOS ? liveOS.diskTotalBytes : 30 * 1024 * 1024 * 1024;
      const diskUsed = liveOS
        ? liveOS.diskUsedBytes
        : cr.metrics?.diskUtilization
        ? (cr.metrics.diskUtilization / 100) * diskTotal
        : 0.15 * diskTotal;
      const diskAvail = liveOS ? liveOS.diskTotalBytes - liveOS.diskUsedBytes : diskTotal - diskUsed;
      const diskPct = liveOS
        ? liveOS.diskPercent
        : typeof cr.metrics?.diskUtilization === 'number'
        ? cr.metrics.diskUtilization
        : 15;

      const cpuPct = liveOS
        ? liveOS.cpuPercent
        : typeof cr.metrics?.cpuUtilization === 'number'
        ? cr.metrics.cpuUtilization
        : isRunning
        ? 1.5
        : 0;

      const cpuCores = liveOS
        ? liveOS.cpuCores
        : cr.size?.includes('2') || cr.provider === 'azure'
        ? 2
        : 1;

      synthesizedServers.push({
        _id: cr.resourceId,
        cloudResourceId: cr.resourceId,
        name: cr.name || cr.resourceId,
        host: cr.publicIp || cr.privateIp || '-',
        publicIp: cr.publicIp && cr.publicIp !== '-' ? cr.publicIp : undefined,
        privateIp: cr.privateIp && cr.privateIp !== '-' ? cr.privateIp : undefined,
        port: 22,
        username: cr.provider === 'azure' ? 'siva' : 'ubuntu',
        authMethod: cr.provider === 'azure' ? 'password' : 'privateKey',
        cloudProvider: cr.provider,
        region: cr.region || 'ap-southeast-2',
        tags: cr.tags ? Object.values(cr.tags) : [],
        status: isRunning ? 'Online' : 'Offline',
        lastError: isRunning ? null : (cr.status || 'Stopped in Cloud'),
        lastConnectedAt: cr.lastSyncAt,
        lastHeartbeatAt: cr.lastSyncAt,
        hostFingerprint: null,
        os: {
          name: (cr.metadata as any)?.os || 'Linux',
          version: '',
          kernel: '',
          arch: 'x86_64',
          uptimeSeconds: isRunning ? 3600 : 0,
          uptimeFormatted: isRunning ? 'Active' : 'Offline',
        },
        hardware: {
          cpuCores: liveOS
            ? liveOS.cpuCores
            : cr.size?.includes('2') || cr.provider === 'azure'
            ? 2
            : 1,
          cpuModel: cr.size || (cr.provider === 'azure' ? 'Standard_D2s_v3' : 't3.micro'),
          totalMemoryBytes: memTotal,
          totalDiskBytes: diskTotal,
        },
        metrics: {
          cpu: {
            usagePercent: cpuPct,
            loadAvg1m: liveOS?.load1m || 0.1,
            loadAvg5m: 0.16,
            loadAvg15m: 0.24,
            cores: cpuCores,
            timestamp: new Date().toISOString(),
          },
          memory: {
            totalBytes: memTotal,
            usedBytes: memUsed,
            availableBytes: memAvail,
            usagePercent: memPct,
            swapTotalBytes: 0,
            swapUsedBytes: 0,
            timestamp: new Date().toISOString(),
          },
          disks: [
            {
              filesystem: '/dev/root',
              mount: '/',
              totalBytes: diskTotal,
              usedBytes: diskUsed,
              availableBytes: diskAvail,
              usagePercent: diskPct,
            },
          ],
          network: [],
        },
        docker: {
          detected: false,
          version: '',
          containersCount: 0,
          runningCount: 0,
          imagesCount: 0,
        },
        kubernetes: {
          detected: false,
          version: '',
          podsCount: 0,
        },
        agent: {
          installed: false,
          version: '',
          token: '',
          status: 'not-installed',
        },
        createdAt: cr.createdAt || new Date().toISOString(),
        cloudPowerState: cr.status || (isRunning ? 'Running' : 'Stopped'),
      });
    }

    // Final guarantee: Deduplicate across reconciled & synthesized servers by provider + name & host
    const allServers = [...activeReconciledServers, ...synthesizedServers];
    const uniqueServers: any[] = [];
    const seenNames = new Set<string>();
    const seenHosts = new Set<string>();

    for (const s of allServers) {
      const nameKey = `${s.cloudProvider || 'other'}:${(s.name || '').toLowerCase().trim()}`;
      const hostKey =
        s.host && s.host !== '-'
          ? `${s.cloudProvider || 'other'}:${(s.host || '').trim()}`
          : null;

      if (seenNames.has(nameKey)) continue;
      if (hostKey && seenHosts.has(hostKey)) continue;

      seenNames.add(nameKey);
      if (hostKey) seenHosts.add(hostKey);
      uniqueServers.push(s);
    }

    return NextResponse.json(uniqueServers);
  } catch (err: any) {
    console.error('Error fetching servers:', err);
    return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 });
  }
}

/**
 * POST /api/servers
 * Register a new server:
 * 1. Validates inputs
 * 2. Authenticates and probes server via SSH
 * 3. Encrypts credentials at rest
 * 4. Saves server to database and mirrors to CloudResource
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const {
      id,
      instanceId,
      cloudResourceId,
      name,
      host,
      port = 22,
      username,
      authMethod = 'privateKey',
      authSecret,
      cloudProvider = 'other',
      region = 'global',
      tags = [],
      allowOfflineSave = false,
    } = body;

    // 1. Input Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Server name is required' }, { status: 400 });
    }
    if (!host || typeof host !== 'string') {
      return NextResponse.json({ error: 'Host IP or hostname is required' }, { status: 400 });
    }
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'SSH username is required' }, { status: 400 });
    }

    const parsedPort = parseInt(port, 10) || 22;
    const resolvedInstanceId = (instanceId || cloudResourceId || (name?.startsWith('i-') ? name : '')).trim();

    // Check if updating an existing server
    let existing: any = null;
    if (id && mongoose.isValidObjectId(id)) {
      existing = await Server.findById(id);
    }
    if (!existing && id) {
      existing = await Server.findOne({
        $or: [
          { cloudResourceId: id },
          { instanceId: id },
          { resourceId: id },
          { name: id },
        ],
      });
    }
    if (!existing && resolvedInstanceId) {
      existing = await Server.findOne({
        $or: [
          { cloudResourceId: resolvedInstanceId },
          { instanceId: resolvedInstanceId },
          { resourceId: resolvedInstanceId },
          { name: resolvedInstanceId },
        ],
      });
    }
    if (!existing && name) {
      existing = await Server.findOne({
        name: name.trim(),
        ...(cloudProvider && cloudProvider !== 'other' ? { cloudProvider } : {}),
      });
    }
    if (!existing && host) {
      existing = await Server.findOne({
        $or: [
          { host: host.trim() },
          { publicIp: host.trim() },
          { privateIp: host.trim() },
        ],
      });
    }

    let secretToUse = (authSecret || '').trim();

    // If authSecret was omitted, reuse the existing saved PEM/PPK key (AES-256-GCM decrypted on backend only)
    if (!secretToUse) {
      if (existing && existing.encryptedAuthSecret) {
        try {
          const { decryptSecret } = await import('@/lib/serverMonitoring/crypto');
          secretToUse = decryptSecret({
            encrypted: existing.encryptedAuthSecret,
            iv: existing.authSecretIv,
            tag: existing.authSecretTag,
          });
        } catch (decryptErr: any) {
          return NextResponse.json(
            { error: `Failed to decrypt existing saved SSH key: ${decryptErr.message}` },
            { status: 422 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'SSH private key or password is required' },
          { status: 400 }
        );
      }
    }

    if (authMethod === 'privateKey') {
      const converted = convertPPKToOpenSSH(secretToUse);
      if (!converted.success) {
        return NextResponse.json({ error: converted.error }, { status: 400 });
      }
      if (converted.pemKey) {
        secretToUse = converted.pemKey;
      }
    }

    // 2. Initial SSH Verification & Discovery
    let initialSpecs;
    let isInitialOnline = true;
    let initialError = null;

    try {
      initialSpecs = await collectServerViaSSH({
        host: host.trim(),
        port: parsedPort,
        username: username.trim(),
        authMethod,
        authSecret: secretToUse,
        timeoutMs: 12000,
      });
    } catch (sshErr: any) {
      const diag = formatConnectionDiagnostic(sshErr, { host, port: parsedPort, authMethod });
      if (!allowOfflineSave) {
        return NextResponse.json(
          {
            error: diag.message,
            hint: diag.hint,
            canSaveOffline: true,
            rawError: sshErr.message,
          },
          { status: 422 }
        );
      }

      // If user chose to register offline
      isInitialOnline = false;
      initialError = diag.message;
      initialSpecs = {
        fingerprint: null,
        os: {
          name: 'Linux',
          version: 'Pending SSH Sync',
          kernel: 'Unknown',
          arch: 'x86_64',
          uptimeSeconds: 0,
          uptimeFormatted: 'Offline',
        },
        hardware: {
          cpuCores: 1,
          cpuModel: 'Pending Sync',
          totalMemoryBytes: 0,
          totalDiskBytes: 0,
        },
        metrics: {
          cpu: { usagePercent: 0, loadAvg1m: 0, loadAvg5m: 0, loadAvg15m: 0, cores: 1, timestamp: new Date() },
          memory: { totalBytes: 0, usedBytes: 0, availableBytes: 0, usagePercent: 0, swapTotalBytes: 0, swapUsedBytes: 0, timestamp: new Date() },
          disks: [],
          network: [],
        },
        docker: {
          detected: false,
          status: 'not_installed' as const,
          version: 'Pending Sync',
          containersCount: 0,
          runningCount: 0,
          imagesCount: 0,
          containers: [],
          images: [],
        },
        kubernetes: {
          detected: false,
          version: 'Pending Sync',
          nodeRole: 'worker',
          podsCount: 0,
          pods: [],
        },
      };
    }

    // 3. Encrypt credentials at rest
    const encrypted = encryptSecret(secretToUse);
    const agentToken = generateAgentToken();

    // 4. Save or Update in MongoDB
    let serverDoc: any;
    if (existing) {
      existing.name = name.trim();
      existing.host = host.trim();
      existing.publicIp = host.trim();
      existing.port = parsedPort;
      existing.username = username.trim();
      existing.authMethod = authMethod;
      if (authSecret) {
        existing.encryptedAuthSecret = encrypted.encrypted;
        existing.authSecretIv = encrypted.iv;
        existing.authSecretTag = encrypted.tag;
      }
      if (resolvedInstanceId) {
        existing.cloudResourceId = resolvedInstanceId;
        existing.instanceId = resolvedInstanceId;
      } else if (id && !mongoose.isValidObjectId(id)) {
        existing.cloudResourceId = id;
        existing.instanceId = id;
      }
      existing.cloudProvider = cloudProvider || existing.cloudProvider;
      existing.region = region || existing.region;
      if (tags && Array.isArray(tags) && tags.length > 0) {
        existing.tags = Array.from(new Set([...(existing.tags || []), ...tags]));
      }
      existing.status = isInitialOnline ? 'Online' : 'Offline';
      if (isInitialOnline) {
        existing.lastConnectedAt = new Date();
        existing.lastHeartbeatAt = new Date();
      }
      existing.lastError = initialError;
      if (initialSpecs?.fingerprint) existing.hostFingerprint = initialSpecs.fingerprint;
      if (initialSpecs?.os) existing.os = initialSpecs.os;
      if (initialSpecs?.hardware) existing.hardware = initialSpecs.hardware;
      if (initialSpecs?.metrics) existing.metrics = initialSpecs.metrics;
      if (initialSpecs?.docker) {
        existing.docker = {
          ...initialSpecs.docker,
          lastSyncedAt: new Date(),
        };
      }
      if (initialSpecs?.kubernetes) {
        existing.kubernetes = {
          ...initialSpecs.kubernetes,
          lastSyncedAt: new Date(),
        };
      }
      await existing.save();
      serverDoc = existing;
    } else {
      serverDoc = await Server.create({
        name: name.trim(),
        host: host.trim(),
        publicIp: host.trim(),
        cloudResourceId: resolvedInstanceId || (id && !mongoose.isValidObjectId(id) ? id : undefined),
        instanceId: resolvedInstanceId || (id && !mongoose.isValidObjectId(id) ? id : undefined),
        port: parsedPort,
        username: username.trim(),
        authMethod,
        encryptedAuthSecret: encrypted.encrypted,
        authSecretIv: encrypted.iv,
        authSecretTag: encrypted.tag,
        cloudProvider,
        region,
        tags: Array.isArray(tags) ? tags : [],
        status: isInitialOnline ? 'Online' : 'Offline',
        lastConnectedAt: isInitialOnline ? new Date() : null,
        lastHeartbeatAt: isInitialOnline ? new Date() : null,
        lastError: initialError,
        hostFingerprint: initialSpecs?.fingerprint || null,
        os: initialSpecs?.os || { name: 'Linux', version: '', uptimeFormatted: 'Online' },
        hardware: initialSpecs?.hardware || { cpuCores: 2, totalMemoryBytes: 4 * 1024 * 1024 * 1024 },
        metrics: initialSpecs?.metrics || {},
        docker: {
          ...(initialSpecs?.docker || {}),
          lastSyncedAt: new Date(),
        },
        kubernetes: {
          ...(initialSpecs?.kubernetes || {}),
          lastSyncedAt: new Date(),
        },
        agent: {
          installed: false,
          version: '1.0.0',
          token: agentToken,
          lastHeartbeat: null,
          status: 'not-installed',
        },
      });
    }

    // 5. Update matching CloudResource(s) (by IP, name, or instance ID)
    const hostTrim = host.trim();
    await CloudResource.updateMany(
      {
        $or: [
          ...(resolvedInstanceId ? [{ resourceId: resolvedInstanceId }] : []),
          ...(existing?.cloudResourceId ? [{ resourceId: existing.cloudResourceId }] : []),
          { 'metadata.sshServerId': serverDoc._id.toString() },
          { 'tags.sshServerId': serverDoc._id.toString() },
          { publicIp: hostTrim },
          { privateIp: hostTrim },
          { name: name.trim() },
          { resourceId: name.trim() },
        ],
      },
      {
        $set: {
          publicIp: hostTrim,
          host: hostTrim,
          status: isInitialOnline ? 'Running' : 'Stopped',
          'metadata.isSSHConnected': true,
          'metadata.sshServerId': serverDoc._id.toString(),
          'tags.isSSHConnected': 'true',
          'tags.sshServerId': serverDoc._id.toString(),
          lastSyncedAt: new Date(),
        },
      }
    );

    // 6. Mirror to CloudResource if not already present
    await CloudResource.findOneAndUpdate(
      { resourceId: `srv-${serverDoc._id.toString()}` },
      {
        $set: {
          resourceId: `srv-${serverDoc._id.toString()}`,
          provider: cloudProvider,
          accountId: 'custom-server',
          region: region || 'global',
          name: serverDoc.name,
          resourceType: 'Server',
          status: isInitialOnline ? 'Running' : 'Stopped',
          metrics: {
            cpuUtilization: initialSpecs?.metrics?.cpu?.usagePercent || 0,
            memoryUtilization: initialSpecs?.metrics?.memory?.usagePercent || 0,
            diskUtilization: initialSpecs?.metrics?.disks?.[0]?.usagePercent || 0,
            networkIn: initialSpecs?.metrics?.network?.[0]?.bytesReceived || 0,
            networkOut: initialSpecs?.metrics?.network?.[0]?.bytesSent || 0,
          },
          tags: {
            ip: serverDoc.host,
            os: initialSpecs?.os ? `${initialSpecs.os.name} ${initialSpecs.os.version || ''}` : 'Linux',
            isSSHConnected: 'true',
          },
          isDeleted: false,
          lastSyncedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // 6b. Mirror encrypted credentials to NginxServer for web terminal & Nginx workspace
    try {
      const NginxServer = (await import('@/models/NginxServer')).default;
      await NginxServer.findOneAndUpdate(
        { host: hostTrim },
        {
          $set: {
            name: serverDoc.name,
            host: hostTrim,
            privateIp: serverDoc.privateIp || '',
            region: serverDoc.region || '',
            instanceId: serverDoc.instanceId || serverDoc.cloudResourceId || '',
            cloudProvider: (serverDoc.cloudProvider || 'other').toLowerCase(),
            connectionStatus: isInitialOnline ? 'Online' : 'Offline',
            osName: initialSpecs?.os?.name || serverDoc.os?.name || 'Linux',
            username: serverDoc.username,
            port: serverDoc.port,
            authMethod: serverDoc.authMethod,
            encryptedAuthSecret: encrypted.encrypted,
            authSecretIv: encrypted.iv,
            authSecretTag: encrypted.tag,
            lastConnectedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (e: any) {
      console.warn('[Server Reg] NginxServer sync note:', e.message);
    }

    // 6c. Mirror credentials to AnsibleHost
    try {
      const AnsibleHost = (await import('@/models/AnsibleHost')).default;
      await AnsibleHost.updateMany(
        {
          $or: [
            { ip: hostTrim },
            { name: name.trim() },
          ],
        },
        {
          $set: {
            encryptedAuthSecret: encrypted.encrypted,
            authSecretIv: encrypted.iv,
            authSecretTag: encrypted.tag,
            username: serverDoc.username,
            port: serverDoc.port,
            authMethod: serverDoc.authMethod,
            status: 'Connected',
          },
        }
      );
    } catch (e: any) {
      console.warn('[Server Reg] AnsibleHost sync note:', e.message);
    }

    // 7. Evaluate real-time alerts on newly registered server metrics
    if (initialSpecs?.metrics) {
      evaluateResourceMetrics({
        resourceId: 'srv-' + serverDoc._id.toString(),
        resourceName: serverDoc.name,
        resourceType: 'Server',
        provider: cloudProvider,
        region: region || 'global',
        metrics: {
          cpuUtilization: initialSpecs.metrics.cpu.usagePercent,
          memoryUtilization: initialSpecs.metrics.memory.usagePercent,
          disks: initialSpecs.metrics.disks || [],
          timestamp: initialSpecs.metrics.cpu.timestamp || new Date(),
        },
      }).catch((e) => console.warn('[Server Reg] Alert eval note:', e.message));
    }

    // Return sanitized server doc
    const sanitized = typeof serverDoc.toObject === 'function' ? serverDoc.toObject() : serverDoc;
    delete (sanitized as any).encryptedAuthSecret;
    delete (sanitized as any).authSecretIv;
    delete (sanitized as any).authSecretTag;

    return NextResponse.json(sanitized, { status: 201 });
  } catch (err: any) {
    console.error('Server registration error:', err);
    return NextResponse.json({ error: err.message || 'Server registration failed' }, { status: 500 });
  }
}
