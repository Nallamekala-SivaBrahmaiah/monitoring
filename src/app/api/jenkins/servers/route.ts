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
      jenkinsInstalledCount: servers.filter((s) => s.jenkins.detected).length,
      jenkinsRunningCount: servers.filter((s) => s.jenkins.status === 'running').length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[JenkinsServersAPI] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch Jenkins servers' }, { status: 500 });
  }
}
