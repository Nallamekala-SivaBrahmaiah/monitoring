import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { resolveDockerServer, queryServerDockerResources, executeSSH, detectDockerCommand } from '@/lib/docker/dockerEngine';

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
      images: data.images,
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
    const { action, image } = body;

    if (!action || !image) {
      return NextResponse.json({ success: false, error: 'Action and image name/ID required' }, { status: 400 });
    }

    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const dockerCmd = await detectDockerCommand(server);
    let cmd = '';

    if (action === 'pull') {
      cmd = `${dockerCmd} pull ${image.trim()}`;
    } else if (action === 'remove') {
      cmd = `${dockerCmd} rmi -f ${image.trim()}`;
    } else if (action === 'inspect') {
      cmd = `${dockerCmd} inspect ${image.trim()}`;
    } else {
      return NextResponse.json({ success: false, error: `Invalid image action: ${action}` }, { status: 400 });
    }

    const res = await executeSSH(server, cmd, 45000);
    return NextResponse.json({
      success: res.code === 0,
      action,
      image,
      output: res.stdout || res.stderr || 'Action executed successfully',
      error: res.code !== 0 ? res.stderr : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

