import { NextRequest, NextResponse } from 'next/server';
import { syncDevopsServers } from '@/lib/devops/devopsToolsEngine';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';

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
        trivyInstalledCount: liveServers.filter((s) => s.trivy.detected).length,
        timestamp: new Date().toISOString(),
      });
    }

    const dbServers = await Server.find().lean();
    const formatted = dbServers.map((s: any) => {
      const hostIp = s.publicIp || s.host || s.privateIp || '-';
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
        trivy: {
          detected: s.trivy?.detected || false,
          status: s.trivy?.status || 'not_installed',
          version: s.trivy?.version || '',
          installMethod: s.trivy?.installMethod || 'unknown',
          lastScanAt: s.trivy?.lastScanAt ? new Date(s.trivy.lastScanAt).toISOString() : undefined,
          lastScanTarget: s.trivy?.lastScanTarget || '',
          lastScanSummary: s.trivy?.lastScanSummary || { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
          lastSyncedAt: s.trivy?.lastSyncedAt ? new Date(s.trivy.lastSyncedAt).toISOString() : undefined,
          lastError: s.trivy?.lastError || null,
        },
      };
    });

    return NextResponse.json({
      servers: formatted,
      total: formatted.length,
      trivyInstalledCount: formatted.filter((s) => s.trivy.detected).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[TrivyServersAPI] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch Trivy servers' }, { status: 500 });
  }
}
