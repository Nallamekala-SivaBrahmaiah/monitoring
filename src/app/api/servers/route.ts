import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import { encryptSecret, generateAgentToken } from '@/lib/serverMonitoring/crypto';
import { collectServerViaSSH } from '@/lib/serverMonitoring/sshCollector';
import { formatConnectionDiagnostic } from '@/lib/serverMonitoring/errorDiagnostic';
import { convertPPKToOpenSSH } from '@/lib/serverMonitoring/ppkConverter';
import { evaluateResourceMetrics } from '@/lib/monitoring/alertEvaluationEngine';

/**
 * GET /api/servers
 * List all registered servers with live metrics, hardware specs, and status.
 * NEVER returns private keys or credentials.
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const cloudFilter = searchParams.get('cloudProvider');

    const query: any = {};
    if (cloudFilter && cloudFilter !== 'all') {
      query.cloudProvider = cloudFilter;
    }

    const servers = await Server.find(query)
      .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(servers);
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
    if (!authSecret || typeof authSecret !== 'string') {
      return NextResponse.json({ error: 'SSH private key or password is required' }, { status: 400 });
    }

    let secretToUse = authSecret;
    if (authMethod === 'privateKey') {
      const converted = convertPPKToOpenSSH(authSecret);
      if (!converted.success) {
        return NextResponse.json({ error: converted.error }, { status: 400 });
      }
      if (converted.pemKey) {
        secretToUse = converted.pemKey;
      }
    }

    const parsedPort = parseInt(port, 10) || 22;

    // Check if host+port already exists
    const existing = await Server.findOne({ host: host.trim(), port: parsedPort });

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
      existing.username = username.trim();
      existing.authMethod = authMethod;
      existing.encryptedAuthSecret = encrypted.encrypted;
      existing.authSecretIv = encrypted.iv;
      existing.authSecretTag = encrypted.tag;
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
      existing.hostFingerprint = initialSpecs.fingerprint || existing.hostFingerprint;
      existing.os = initialSpecs.os;
      existing.hardware = initialSpecs.hardware;
      existing.metrics = initialSpecs.metrics;
      existing.docker = {
        ...initialSpecs.docker,
        lastSyncedAt: new Date(),
      };
      existing.kubernetes = {
        ...initialSpecs.kubernetes,
        lastSyncedAt: new Date(),
      };
      await existing.save();
      serverDoc = existing;
    } else {
      serverDoc = await Server.create({
        name: name.trim(),
        host: host.trim(),
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
        hostFingerprint: initialSpecs.fingerprint,
        os: initialSpecs.os,
        hardware: initialSpecs.hardware,
        metrics: initialSpecs.metrics,
        docker: {
          ...initialSpecs.docker,
          lastSyncedAt: new Date(),
        },
        kubernetes: {
          ...initialSpecs.kubernetes,
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

    // 5. Update matching CloudResource(s) (by IP or name)
    const hostTrim = host.trim();
    await CloudResource.updateMany(
      {
        $or: [
          { publicIp: hostTrim },
          { privateIp: hostTrim },
          { name: name.trim() },
        ],
      },
      {
        $set: {
          metrics: {
            cpuUtilization: initialSpecs.metrics.cpu.usagePercent,
            memoryUtilization: initialSpecs.metrics.memory.usagePercent,
            diskUtilization: initialSpecs.metrics.disks[0]?.usagePercent || 0,
            networkIn: initialSpecs.metrics.network[0]?.bytesReceived || 0,
            networkOut: initialSpecs.metrics.network[0]?.bytesSent || 0,
          },
          status: isInitialOnline ? 'Running' : 'Stopped',
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
            cpuUtilization: initialSpecs.metrics.cpu.usagePercent,
            memoryUtilization: initialSpecs.metrics.memory.usagePercent,
            diskUtilization: initialSpecs.metrics.disks[0]?.usagePercent || 0,
            networkIn: initialSpecs.metrics.network[0]?.bytesReceived || 0,
            networkOut: initialSpecs.metrics.network[0]?.bytesSent || 0,
          },
          tags: {
            ip: serverDoc.host,
            os: `${initialSpecs.os.name} ${initialSpecs.os.version}`,
            isSSHConnected: 'true',
          },
          isDeleted: false,
          lastSyncedAt: new Date(),
        },
      },
      { upsert: true }
    );

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
