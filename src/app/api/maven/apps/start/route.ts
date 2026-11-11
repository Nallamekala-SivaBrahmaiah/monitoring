import { NextRequest, NextResponse } from 'next/server';
import { startMavenApplication } from '@/lib/maven/mavenProcessManager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.projectId && !body.buildId && !body.artifactName) {
      return NextResponse.json(
        { success: false, error: 'Must specify projectId, buildId, or artifactName.' },
        { status: 400 }
      );
    }

    const app = await startMavenApplication({
      projectId: body.projectId,
      projectName: body.projectName,
      buildId: body.buildId,
      artifactName: body.artifactName,
      customPort: body.customPort ? parseInt(body.customPort, 10) : undefined,
      jvmArgs: body.jvmArgs,
      appArgs: body.appArgs,
      envVariables: body.envVariables,
    });

    return NextResponse.json({
      success: true,
      message: `Application "${app.projectName}" process initialized on port ${app.port}`,
      app,
    });
  } catch (err: any) {
    console.error('[API /api/maven/apps/start POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to start application' },
      { status: 400 }
    );
  }
}
