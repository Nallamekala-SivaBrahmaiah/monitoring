import { NextRequest, NextResponse } from 'next/server';
import { getDevopsServers } from '@/lib/devops/devopsToolsEngine';
import connectToDatabase from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doSync = searchParams.get('sync') === 'true';

    await connectToDatabase();

    const servers = await getDevopsServers(doSync);
    return NextResponse.json({
      servers,
      total: servers.length,
      trivyInstalledCount: servers.filter((s) => s.trivy.detected).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[TrivyServersAPI] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch Trivy servers' }, { status: 500 });
  }
}
