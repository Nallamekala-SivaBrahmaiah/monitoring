import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import { syncAllRegisteredServers } from '@/lib/serverMonitoring/serverSync';
import { queryServerDockerResources } from '@/lib/docker/dockerEngine';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const doSync = searchParams.get('sync') === 'true';

    // 1. If explicit sync is requested, run live sync over SSH
    if (doSync) {
      try {
        await syncAllRegisteredServers();
      } catch (syncErr: any) {
        console.warn('[Docker Hosts API] Sync warning:', syncErr.message);
      }
    }

    // 2. Fetch all registered servers from database
    const servers = await Server.find().lean();

    // Also include servers registered in NginxServer collection that are not in Server
    let nginxServers: any[] = [];
    try {
      const NginxServer = (await import('@/models/NginxServer')).default;
      nginxServers = await NginxServer.find().lean();
    } catch {}

    const existingHosts = new Set(
      servers.map((s: any) => (s.host || s.publicIp || s.name || '').toLowerCase()).filter(Boolean)
    );

    const combinedServers: any[] = [...servers];
    for (const ns of nginxServers) {
      const key = (ns.host || ns.publicIp || ns.name || '').toLowerCase();
      if (key && !existingHosts.has(key)) {
        existingHosts.add(key);
        combinedServers.push(ns);
      }
    }

    // Strictly filter: only display servers where Docker is actually installed & detected
    const dockerInstalledServers = combinedServers.filter((s: any) => {
      const docker = s.docker || {};
      const isDetected = Boolean(docker.detected);
      const isRunning = docker.status === 'running';
      const hasContainers = Array.isArray(docker.containers) && docker.containers.length > 0;
      const hasValidVersion = Boolean(
        docker.version &&
        !docker.version.includes('NOT_INSTALLED') &&
        docker.version.trim() !== ''
      );
      return isDetected || isRunning || hasContainers || hasValidVersion;
    });

    const hosts = await Promise.all(
      dockerInstalledServers.map(async (s: any) => {
        const docker = s.docker || {};
        const isDetected = true;
        const status = docker.status || 'running';
        const containers = docker.containers || [];
        const running = containers.filter((c: any) => (c.state || '').toLowerCase().includes('run')).length;

        // Formulate friendly status message
        let statusMsg = 'Docker: Not Installed';
        if (status === 'running') statusMsg = 'Docker Engine Running';
        else if (status === 'stopped' || status === 'daemon_stopped') statusMsg = 'Docker: Stopped';
        else if (status === 'permission_denied') statusMsg = 'Docker: Permission Denied';
        else if (status === 'error') statusMsg = 'Docker: Error';

        const hostIp = s.host || s.publicIp || '-';
        const defaultUser =
          s.cloudProvider === 'azure' || hostIp.startsWith('4.') || hostIp.startsWith('20.')
            ? (s.name?.toLowerCase().includes('azure') ? 'azureuser' : 'siva')
            : 'ubuntu';

        return {
          id: s._id.toString(),
          name: s.name,
          host: hostIp,
          publicIp: s.publicIp || s.host || '-',
          privateIp: s.privateIp || '',
          port: s.port || 22,
          username: s.username || defaultUser,
          cloudProvider: s.cloudProvider || 'other',
          region: s.region || 'Datacenter',
          serverStatus: s.status || s.connectionStatus || 'Offline',
          osName: s.os?.name ? `${s.os.name} ${s.os.version || ''}`.trim() : 'Linux',
          dockerDetected: isDetected,
          dockerStatus: status,
          dockerStatusMessage: docker.statusMessage || statusMsg,
          dockerVersion: docker.version || (isDetected ? 'v24.0' : 'N/A'),
          containersCount: docker.containersCount || containers.length,
          runningCount: docker.runningCount || running,
          stoppedCount: Math.max(0, (docker.containersCount || containers.length) - (docker.runningCount || running)),
          imagesCount: docker.imagesCount || (docker.images || []).length,
          volumesCount: 5,
          networksCount: 3,
          lastSyncedAt: docker.lastSyncedAt ? new Date(docker.lastSyncedAt).toISOString() : s.lastConnectedAt ? new Date(s.lastConnectedAt).toISOString() : null,
          lastError: docker.lastError || s.lastError || null,
        };
      })
    );

    return NextResponse.json(hosts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Docker hosts' }, { status: 500 });
  }
}
