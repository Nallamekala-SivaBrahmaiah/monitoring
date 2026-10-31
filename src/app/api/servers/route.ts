import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import { encryptSecret, generateAgentToken } from '@/lib/serverMonitoring/crypto';
import { collectServerViaSSH } from '@/lib/serverMonitoring/sshCollector';

/**
 * GET /api/servers
 * List all registered servers with live metrics, environment, tags, and status.
 * NEVER returns private keys or credentials.
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const envFilter = searchParams.get('environment');
    const cloudFilter = searchParams.get('cloudProvider');

    const query: any = {};
    if (envFilter && envFilter !== 'all') {
      query.environment = envFilter;
    }
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
      environment = 'Development',
      cloudProvider = 'other',
      region = 'global',
      tags = [],
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

    const parsedPort = parseInt(port, 10) || 22;

    // Check if host+port already exists
    const existing = await Server.findOne({ host: host.trim(), port: parsedPort });
    if (existing) {
      return NextResponse.json(
        { error: `A server with address ${host}:${parsedPort} is already registered (${existing.name})` },
        { status: 409 }
      );
    }

    // 2. Initial SSH Verification & Discovery
    let initialSpecs;
    try {
      initialSpecs = await collectServerViaSSH({
        host: host.trim(),
        port: parsedPort,
        username: username.trim(),
        authMethod,
        authSecret,
        timeoutMs: 12000,
      });
    } catch (sshErr: any) {
      return NextResponse.json(
        {
          error: `SSH Authentication / Connectivity verification failed: ${sshErr.message}`,
          details: 'Please check the IP address, port, username, and private key/password.',
        },
        { status: 422 }
      );
    }

    // 3. Encrypt credentials at rest
    const encrypted = encryptSecret(authSecret);
    const agentToken = generateAgentToken();

    // 4. Save to MongoDB
    const serverDoc = await Server.create({
      name: name.trim(),
      host: host.trim(),
      port: parsedPort,
      username: username.trim(),
      authMethod,
      encryptedAuthSecret: encrypted.encrypted,
      authSecretIv: encrypted.iv,
      authSecretTag: encrypted.tag,
      environment,
      cloudProvider,
      region,
      tags: Array.isArray(tags) ? tags : [],
      status: 'Online',
      lastConnectedAt: new Date(),
      lastHeartbeatAt: new Date(),
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

    // 5. Mirror to CloudResource
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
          status: 'Running',
          metrics: {
            cpuUtilization: initialSpecs.metrics.cpu.usagePercent,
            memoryUtilization: initialSpecs.metrics.memory.usagePercent,
            diskUtilization: initialSpecs.metrics.disks[0]?.usagePercent || 0,
            networkIn: initialSpecs.metrics.network[0]?.bytesReceived || 0,
            networkOut: initialSpecs.metrics.network[0]?.bytesSent || 0,
          },
          tags: {
            environment,
            ip: serverDoc.host,
            os: `${initialSpecs.os.name} ${initialSpecs.os.version}`,
          },
          isDeleted: false,
          lastSyncedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Return sanitized server doc
    const sanitized = serverDoc.toObject();
    delete (sanitized as any).encryptedAuthSecret;
    delete (sanitized as any).authSecretIv;
    delete (sanitized as any).authSecretTag;

    return NextResponse.json(sanitized, { status: 201 });
  } catch (err: any) {
    console.error('Server registration error:', err);
    return NextResponse.json({ error: err.message || 'Server registration failed' }, { status: 500 });
  }
}
