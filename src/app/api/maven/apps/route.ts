import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MavenApp from '@/models/MavenApp';
import { syncAllApplications, startMavenApplication } from '@/lib/maven/mavenProcessManager';

// GET /api/maven/apps - List all applications and runtime metrics
export async function GET() {
  try {
    await connectToDatabase();

    // Reconcile DB state with OS processes
    const apps = await syncAllApplications();

    const running = apps.filter((a) => a.status === 'RUNNING').length;
    const starting = apps.filter((a) => a.status === 'STARTING').length;
    const stopped = apps.filter((a) => a.status === 'STOPPED').length;
    const failed = apps.filter((a) => a.status === 'FAILED').length;
    const activePorts = apps
      .filter((a) => a.status === 'RUNNING' || a.status === 'STARTING')
      .map((a) => a.port);

    return NextResponse.json({
      success: true,
      apps,
      metrics: {
        totalApps: apps.length,
        runningApps: running + starting,
        activeRunning: running,
        startingApps: starting,
        stoppedApps: stopped,
        failedApps: failed,
        activePorts,
      },
    });
  } catch (err: any) {
    console.error('[API /api/maven/apps GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to list Maven applications' },
      { status: 500 }
    );
  }
}

// POST /api/maven/apps - Start/Deploy an application
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const app = await startMavenApplication(body);

    return NextResponse.json({
      success: true,
      message: `Application "${app.projectName}" starting on port ${app.port}`,
      app,
    });
  } catch (err: any) {
    console.error('[API /api/maven/apps POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to start application' },
      { status: 400 }
    );
  }
}
