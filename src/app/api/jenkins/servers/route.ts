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
        jenkinsInstalledCount: liveServers.filter((s) => s.jenkins.detected).length,
        jenkinsRunningCount: liveServers.filter((s) => s.jenkins.status === 'running').length,
        timestamp: new Date().toISOString(),
      });
    }

    // Fast read from database
    const dbServers = await Server.find().lean();
    const formatted = dbServers.map((s: any) => {
      const hostIp = s.publicIp || s.host || s.privateIp || '-';
      const port = s.jenkins?.port || 8080;
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
        jenkins: {
          detected: s.jenkins?.detected || false,
          status: s.jenkins?.status || 'not_installed',
          version: s.jenkins?.version || '',
          port,
          url: s.jenkins?.detected ? (s.jenkins?.url || `http://${hostIp}:${port}`) : '',
          installDate: s.jenkins?.installDate || '',
          serviceName: s.jenkins?.serviceName || 'jenkins',
          lastSyncedAt: s.jenkins?.lastSyncedAt ? new Date(s.jenkins.lastSyncedAt).toISOString() : undefined,
          lastError: s.jenkins?.lastError || null,
        },
      };
    });

    return NextResponse.json({
      servers: formatted,
      total: formatted.length,
      jenkinsInstalledCount: formatted.filter((s) => s.jenkins.detected).length,
      jenkinsRunningCount: formatted.filter((s) => s.jenkins.status === 'running').length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[JenkinsServersAPI] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch Jenkins servers' }, { status: 500 });
  }
}
