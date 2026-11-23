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
      sonarInstalledCount: servers.filter((s) => s.sonarqube.detected).length,
      sonarRunningCount: servers.filter((s) => s.sonarqube.status === 'running').length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[SonarServersAPI] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch SonarQube servers' }, { status: 500 });
  }
}
