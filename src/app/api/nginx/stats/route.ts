import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import NginxDeployment from '@/models/NginxDeployment';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get('serverId');

    const serverFilter: any = {};
    const deployFilter: any = {};
    if (serverId && serverId !== 'all') {
      serverFilter._id = serverId;
      deployFilter.serverId = serverId;
    }

    const [
      totalServers,
      servers,
      totalDeployments,
      successfulDeployments,
      failedDeployments,
      lastDeployment,
    ] = await Promise.all([
      NginxServer.countDocuments(serverFilter),
      NginxServer.find(serverFilter).lean(),
      NginxDeployment.countDocuments(deployFilter),
      NginxDeployment.countDocuments({ ...deployFilter, status: 'SUCCESS' }),
      NginxDeployment.countDocuments({ ...deployFilter, status: 'FAILED' }),
      NginxDeployment.findOne(deployFilter)
        .sort({ createdAt: -1 })
        .select('deploymentId appName status createdAt durationSeconds')
        .lean(),
    ]);

    let nginxInstalled = 0;
    let nginxRunning = 0;
    let nginxStopped = 0;
    let totalPM2Apps = 0;
    let runningPM2Apps = 0;
    let failedPM2Apps = 0;

    for (const s of servers) {
      if (s.nginxInstalled) nginxInstalled++;
      if (s.nginxStatus === 'RUNNING') nginxRunning++;
      if (s.nginxStatus === 'STOPPED') nginxStopped++;
      totalPM2Apps += s.pm2Count || 0;
      runningPM2Apps += s.pm2RunningCount || 0;
      failedPM2Apps += s.pm2FailedCount || 0;
    }

    let lastDeploymentDisplay = 'Never';
    if (lastDeployment && (lastDeployment as any).createdAt) {
      const diffSec = Math.floor((Date.now() - new Date((lastDeployment as any).createdAt).getTime()) / 1000);
      if (diffSec < 60) lastDeploymentDisplay = `${diffSec}s ago`;
      else if (diffSec < 3600) lastDeploymentDisplay = `${Math.floor(diffSec / 60)}m ago`;
      else if (diffSec < 86400) lastDeploymentDisplay = `${Math.floor(diffSec / 3600)}h ago`;
      else lastDeploymentDisplay = `${Math.floor(diffSec / 86400)}d ago`;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalServers,
        nginxInstalled,
        nginxRunning,
        nginxStopped,
        totalPM2Apps,
        runningPM2Apps,
        failedPM2Apps,
        totalDeployments,
        successfulDeployments,
        failedDeployments,
        lastDeploymentDisplay,
        lastDeployment,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

