import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const servers = await Server.find()
      .select('name host port cloudProvider region status lastError lastConnectedAt docker')
      .lean();

    const hosts = servers.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      host: s.host,
      port: s.port,
      cloudProvider: s.cloudProvider,
      region: s.region,
      serverStatus: s.status,
      dockerDetected: Boolean(s.docker?.detected),
      dockerStatus: s.docker?.status || (s.docker?.detected ? 'running' : 'not_installed'),
      dockerStatusMessage: s.docker?.statusMessage || (s.docker?.detected ? 'Docker Engine Running' : 'Docker: Not Installed'),
      dockerVersion: s.docker?.version || 'N/A',
      containersCount: s.docker?.containersCount || s.docker?.containers?.length || 0,
      runningCount: s.docker?.runningCount || (s.docker?.containers || []).filter((c: any) => (c.state || '').toLowerCase().includes('run')).length,
      imagesCount: s.docker?.imagesCount || s.docker?.images?.length || 0,
      lastSyncedAt: s.docker?.lastSyncedAt,
      lastError: s.docker?.lastError || s.lastError,
    }));

    return NextResponse.json(hosts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Docker hosts' }, { status: 500 });
  }
}
