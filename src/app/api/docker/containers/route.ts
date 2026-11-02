import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import { syncAllRegisteredServers } from '@/lib/serverMonitoring/serverSync';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const autoSync = searchParams.get('sync') === 'true';

    // 1. If explicit sync requested, run live sync across connected SSH servers
    if (autoSync) {
      try {
        await syncAllRegisteredServers();
      } catch (syncErr) {
        console.warn('[Docker Containers API] Live sync note:', syncErr);
      }
    }

    const query: any = {};
    if (provider && provider !== 'all') {
      query.cloudProvider = provider;
    }

    let servers = await Server.find(query).lean();

    const containerList: any[] = [];

    for (const server of servers) {
      const docker = server.docker;
      if (!docker || !docker.containers || docker.containers.length === 0) continue;

      for (const c of docker.containers) {
        const stateLower = (c.state || '').toLowerCase();
        let normalizedStatus: 'Running' | 'Stopped' | 'Restarting' | 'Paused' | 'Exited' = 'Stopped';
        if (stateLower.includes('run')) normalizedStatus = 'Running';
        else if (stateLower.includes('restart')) normalizedStatus = 'Restarting';
        else if (stateLower.includes('pause')) normalizedStatus = 'Paused';
        else if (stateLower.includes('exit')) normalizedStatus = 'Stopped';

        const shortId = (c.id || '').substring(0, 12);

        // Memory usage: if numeric percent available use it, otherwise show used/limit
        let cpuVal: number | null = null;
        if (c.cpuPercent !== undefined && c.cpuPercent !== null) {
          cpuVal = c.cpuPercent;
        }

        let memVal: number | null = null;
        if (c.memoryPercent !== undefined && c.memoryPercent !== null && c.memoryPercent > 0) {
          memVal = c.memoryPercent;
        }

        containerList.push({
          id: (c as any)._id ? (c as any)._id.toString() : shortId,
          containerId: shortId,
          fullContainerId: c.id,
          name: c.name,
          image: c.image,
          hostInstance: server.name,
          hostId: server._id.toString(),
          hostIp: server.host,
          cloudProvider: (server.cloudProvider === 'azure' ? 'azure' : server.cloudProvider === 'aws' ? 'aws' : 'other') as 'aws' | 'azure' | 'other',
          region: server.region || 'centralindia',
          status: normalizedStatus,
          cpuUsage: cpuVal,
          memoryUsage: memVal,
          memoryLimit: c.memoryLimit || (c.memoryUsage ? c.memoryUsage.split('/')[1]?.trim() : 'Available'),
          diskIO: c.diskIO || '0 B',
          networkTraffic: c.networkTraffic || '0 B',
          restartCount: 0,
          uptime: c.status || (normalizedStatus === 'Running' ? 'Up' : 'Exited'),
          created: c.created || 'recently',
          publishedPorts: c.ports || '-',
          healthStatus: 'Healthy',
          metricSource: 'Direct SSH (Docker Engine)',
          lastUpdated: docker.lastSyncedAt ? new Date(docker.lastSyncedAt).toISOString() : new Date().toISOString(),
          dockerDaemonStatus: docker.status || (docker.detected ? 'running' : 'not_installed'),
          dockerDaemonMessage: docker.statusMessage || (docker.detected ? 'Docker Engine Running' : 'Docker: Not Installed'),
          dockerVersion: docker.version || 'Docker Engine',
        });
      }
    }

    return NextResponse.json(containerList);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch containers' }, { status: 500 });
  }
}
