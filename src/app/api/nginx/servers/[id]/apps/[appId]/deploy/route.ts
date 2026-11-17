import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import NginxApp from '@/models/NginxApp';
import { deployOneClickApp } from '@/lib/nginx/nginxEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  try {
    await connectToDatabase();
    const { id, appId } = await params;
    const body = await req.json().catch(() => ({}));
    const { branch, skipBuild } = body;

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const app = await NginxApp.findOne({ _id: appId, serverId: id });
    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    // Set status to building
    app.status = 'Building';
    await app.save();

    const result = await deployOneClickApp(
      server.toObject(),
      app.toObject(),
      { branch, skipBuild }
    );

    // Update app record with deployment outcome
    const durationFormatted = result.durationSeconds >= 60
      ? `${Math.floor(result.durationSeconds / 60)}m ${result.durationSeconds % 60}s`
      : `${result.durationSeconds}s`;

    app.status = result.success ? 'Deployed' : result.rolledBack ? 'Failed' : 'Failed';
    app.healthStatus = result.success ? 'Healthy' : 'Down';
    app.lastDeployedAt = new Date();
    app.lastDeploymentDuration = durationFormatted;
    if (result.previousCommit) {
      app.lastSuccessfulCommit = result.previousCommit;
    }
    if (result.deployedCommit) {
      app.currentCommit = result.deployedCommit;
    }
    if (branch) {
      app.gitBranch = branch;
    }
    await app.save();

    return NextResponse.json({
      success: result.success,
      deploymentId: result.deploymentId,
      durationSeconds: result.durationSeconds,
      durationFormatted,
      logs: result.logs,
      previousCommit: result.previousCommit,
      deployedCommit: result.deployedCommit,
      rolledBack: result.rolledBack,
      error: result.error,
      app: app.toObject(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
