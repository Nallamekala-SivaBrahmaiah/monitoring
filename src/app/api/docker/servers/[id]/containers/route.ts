import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { resolveDockerServer, queryServerDockerResources, executeContainerAction } from '@/lib/docker/dockerEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const data = await queryServerDockerResources(server);
    return NextResponse.json({
      success: data.success,
      serverId: server._id?.toString() || id,
      containers: data.containers,
      dockerStatus: data.dockerStatus,
      dockerVersion: data.dockerVersion,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { action, container } = body;

    if (!action || !container) {
      return NextResponse.json(
        { success: false, error: 'Action and container identifier are required' },
        { status: 400 }
      );
    }

    const validActions = ['start', 'stop', 'restart', 'pause', 'unpause', 'remove', 'inspect'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const result = await executeContainerAction(server, action, container);
    return NextResponse.json({
      success: result.success,
      action,
      container,
      output: result.output,
      error: result.error,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

