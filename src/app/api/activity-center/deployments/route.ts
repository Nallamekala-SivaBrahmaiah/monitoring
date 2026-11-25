import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DeploymentRecord from '@/models/DeploymentRecord';
import { logActivity } from '@/lib/activityCenter/activityService';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const env = searchParams.get('environment');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));

    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (env && env !== 'all') query.environment = env;

    const deployments = await DeploymentRecord.find(query)
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, deployments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const deploymentId =
      body.deploymentId ||
      `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const doc = await DeploymentRecord.create({
      ...body,
      deploymentId,
      startTime: body.startTime ? new Date(body.startTime) : new Date(),
    });

    // Also auto-log activity event
    await logActivity({
      platform: body.platform || 'onprem',
      module: 'deployment',
      resourceType: 'Deployment',
      resourceId: deploymentId,
      resourceName: `${body.appName} (${body.environment || 'production'})`,
      action: `Deployed ${body.appName} (${body.buildVersion || 'latest'})`,
      status: body.status === 'successful' ? 'success' : body.status === 'failed' ? 'failed' : 'in_progress',
      details: `Target: ${body.targetServer}. Git commit: ${body.commitId || 'N/A'}. Duration: ${body.durationSeconds || 0}s`,
      initiator: body.initiatingUser || 'DevOps Engineer',
      source: 'Application Event',
    });

    return NextResponse.json({ success: true, deployment: doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
