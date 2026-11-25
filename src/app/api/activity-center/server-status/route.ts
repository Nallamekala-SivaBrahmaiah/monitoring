import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import { resolveServerCredentials } from '@/lib/terminal/serverResolver';
import { Client } from 'ssh2';

export interface ServerStatusItem {
  id: string;
  name: string;
  host: string;
  port: number;
  provider: 'aws' | 'azure' | 'onprem' | 'other';
  os: string;
  status: 'running' | 'failed' | 'stopped' | 'unknown';
  latencyMs?: number;
  uptime?: string;
  lastChecked?: string;
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
  };
}

// Quick SSH ping helper with short timeout
async function pingServerSSH(serverId: string): Promise<{
  status: 'running' | 'failed' | 'stopped';
  latencyMs: number;
  uptime?: string;
  errorMessage?: string;
}> {
  const start = Date.now();
  try {
    const creds = await resolveServerCredentials({ sshServerId: serverId });
    if (!creds) {
      return { status: 'failed', latencyMs: Date.now() - start, errorMessage: 'Credentials could not be resolved' };
    }

    return await new Promise((resolve) => {
      let settled = false;
      const client = new Client();
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          try { client.end(); } catch {}
          resolve({ status: 'failed', latencyMs: Date.now() - start, errorMessage: 'SSH connection timed out (5s)' });
        }
      }, 5000);

      client
        .on('ready', () => {
          client.exec('uptime -p || uptime', (err, stream) => {
            if (err) {
              clearTimeout(timeout);
              try { client.end(); } catch {}
              if (!settled) {
                settled = true;
                return resolve({ status: 'running', latencyMs: Date.now() - start });
              }
            }
            let out = '';
            stream
              .on('data', (d: any) => { out += d.toString(); })
              .on('close', () => {
                clearTimeout(timeout);
                try { client.end(); } catch {}
                if (!settled) {
                  settled = true;
                  resolve({
                    status: 'running',
                    latencyMs: Date.now() - start,
                    uptime: out.trim().replace(/^up\s+/, ''),
                  });
                }
              });
          });
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          if (!settled) {
            settled = true;
            try { client.end(); } catch {}
            resolve({ status: 'failed', latencyMs: Date.now() - start, errorMessage: err.message });
          }
        })
        .connect({
          host: creds.host,
          port: creds.port || 22,
          username: creds.username,
          ...(creds.authMethod === 'password'
            ? { password: creds.authSecret }
            : { privateKey: creds.authSecret }),
          readyTimeout: 4500,
        });
    });
  } catch (err: any) {
    return { status: 'failed', latencyMs: Date.now() - start, errorMessage: err.message };
  }
}

export async function GET() {
  try {
    await connectToDatabase();

    const [servers, cloudVms] = await Promise.all([
      Server.find().lean(),
      CloudResource.find({
        resourceType: { $in: ['vm', 'ec2'] },
      }).lean(),
    ]);

    const result: ServerStatusItem[] = [];

    // Map registered servers
    for (const s of servers) {
      const isOnline = s.status === 'Online';
      const isStopped = s.status === 'Offline';
      const diskPct = s.metrics?.disks && s.metrics.disks.length > 0 ? s.metrics.disks[0].usagePercent : undefined;

      result.push({
        id: (s._id as any).toString(),
        name: s.name,
        host: s.host,
        port: s.port || 22,
        provider: s.cloudProvider === 'aws' ? 'aws' : s.cloudProvider === 'azure' ? 'azure' : 'onprem',
        os: s.os?.name ? `${s.os.name} ${s.os.version || ''}`.trim() : 'Linux',
        status: isOnline ? 'running' : isStopped ? 'stopped' : 'failed',
        latencyMs: undefined,
        uptime: s.os?.uptimeFormatted || undefined,
        lastChecked: s.lastHeartbeatAt ? new Date(s.lastHeartbeatAt).toISOString() : new Date().toISOString(),
        metrics: {
          cpu: s.metrics?.cpu?.usagePercent ?? undefined,
          memory: s.metrics?.memory?.usagePercent ?? undefined,
          disk: diskPct,
        },
      });
    }

    // Merge cloud resources not already in Server collection
    for (const vm of cloudVms) {
      const exists = result.some(
        (r) => r.name === vm.name || (vm.publicIp && r.host === vm.publicIp) || (vm.privateIp && r.host === vm.privateIp)
      );
      if (!exists) {
        const isRunning = vm.status?.toLowerCase().includes('running');
        result.push({
          id: (vm._id as any).toString(),
          name: vm.name,
          host: vm.publicIp || vm.privateIp || '-',
          port: 22,
          provider: vm.provider === 'aws' ? 'aws' : 'azure',
          os: 'Linux Cloud VM',
          status: isRunning ? 'running' : 'stopped',
          lastChecked: vm.metrics?.lastUpdated ? new Date(vm.metrics.lastUpdated).toISOString() : new Date().toISOString(),
          metrics: {
            cpu: vm.metrics?.cpuUtilization ?? undefined,
            memory: vm.metrics?.memoryUtilization ?? undefined,
            disk: vm.metrics?.diskUtilization ?? undefined,
          },
        });
      }
    }

    return NextResponse.json({ success: true, servers: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { serverId, checkAll } = body;

    if (checkAll) {
      const servers = await Server.find().lean();
      const checkResults = await Promise.all(
        servers.map(async (srv) => {
          const sId = (srv._id as any).toString();
          const res = await pingServerSSH(sId);
          await Server.findByIdAndUpdate(srv._id, {
            status: res.status === 'running' ? 'Online' : 'Offline',
            lastHeartbeatAt: new Date(),
          });
          return {
            serverId: sId,
            name: srv.name,
            status: res.status,
            latencyMs: res.latencyMs,
            uptime: res.uptime,
            error: res.errorMessage,
          };
        })
      );
      return NextResponse.json({ success: true, results: checkResults });
    }

    if (!serverId) {
      return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
    }

    const srv = await Server.findById(serverId).lean();
    if (!srv) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    const sId = (srv._id as any).toString();
    const pingResult = await pingServerSSH(sId);
    await Server.findByIdAndUpdate(srv._id, {
      status: pingResult.status === 'running' ? 'Online' : 'Offline',
      lastHeartbeatAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      serverId: sId,
      name: srv.name,
      status: pingResult.status,
      latencyMs: pingResult.latencyMs,
      uptime: pingResult.uptime,
      error: pingResult.errorMessage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
