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
      volumes: data.volumes,
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
    const { action, volume } = body;

    if (!action || !volume) {
      return NextResponse.json({ success: false, error: 'Action and volume name required' }, { status: 400 });
    }

    // Safety guard against removing core database volumes
    const protectedKeywords = ['database', 'postgres', 'mongo', 'mysql', 'pgdata', 'data'];
    const volLower = volume.toLowerCase();
    if (action === 'remove' && protectedKeywords.some((pk) => volLower.includes(pk)) && !body.confirmed) {
      return NextResponse.json(
        {
          success: false,
          error: `Volume "${volume}" contains persistent database data. Deletion requires explicit override confirmation to prevent data loss.`,
          requiresConfirmation: true,
        },
        { status: 400 }
      );
    }

    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const dockerCmd = await detectDockerCommand(server);
    let cmd = '';

    if (action === 'remove') {
      cmd = `${dockerCmd} volume rm -f ${volume.trim()}`;
    } else if (action === 'inspect') {
      cmd = `${dockerCmd} volume inspect ${volume.trim()}`;
    } else {
      return NextResponse.json({ success: false, error: `Invalid volume action: ${action}` }, { status: 400 });
    }

    const res = await executeSSH(server, cmd, 15000);
    return NextResponse.json({
      success: res.code === 0,
      action,
      volume,
      output: res.stdout || res.stderr || 'Action executed successfully',
      error: res.code !== 0 ? res.stderr : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

