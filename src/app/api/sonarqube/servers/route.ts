import { NextRequest, NextResponse } from 'next/server';
import { syncDevopsServers } from '@/lib/devops/devopsToolsEngine';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doSync = searchParams.get('sync') === 'true';

    await connectToDatabase();

    if (doSync) {
      const liveServers = await syncDevopsServers();
      return NextResponse.json({
        servers: liveServers,
        total: liveServers.length,
        sonarInstalledCount: liveServers.filter((s) => s.sonarqube.detected).length,
        sonarRunningCount: liveServers.filter((s) => s.sonarqube.status === 'running').length,
        timestamp: new Date().toISOString(),
      });
    }

    const dbServers = await Server.find().lean();
    const formatted = dbServers.map((s: any) => {
      const hostIp = s.publicIp || s.host || s.privateIp || '-';
      const port = s.sonarqube?.port || 9000;
      return {
        id: String(s._id),
        name: s.name,
        host: hostIp,
        publicIp: s.publicIp,
        privateIp: s.privateIp,
        cloudProvider: s.cloudProvider || 'other',
        region: s.region || 'global',
        osName: s.os?.name || 'Linux',
        status: s.status,
        sonarqube: {
          detected: s.sonarqube?.detected || false,
          status: s.sonarqube?.status || 'not_installed',
          version: s.sonarqube?.version || '',
          port,
          url: s.sonarqube?.detected ? (s.sonarqube?.url || `http://${hostIp}:${port}`) : '',
          mode: s.sonarqube?.mode || 'unknown',
          containerId: s.sonarqube?.containerId || '',
          healthStatus: s.sonarqube?.healthStatus || 'UNKNOWN',
          lastSyncedAt: s.sonarqube?.lastSyncedAt ? new Date(s.sonarqube.lastSyncedAt).toISOString() : undefined,
          lastError: s.sonarqube?.lastError || null,
        },
      };
    });

    return NextResponse.json({
      servers: formatted,
      total: formatted.length,
      sonarInstalledCount: formatted.filter((s) => s.sonarqube.detected).length,
      sonarRunningCount: formatted.filter((s) => s.sonarqube.status === 'running').length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[SonarQubeServersAPI] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch SonarQube servers' }, { status: 500 });
  }
}
