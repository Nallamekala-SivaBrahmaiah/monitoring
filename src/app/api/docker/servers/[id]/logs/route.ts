import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { resolveDockerServer, getContainerLogs } from '@/lib/docker/dockerEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const container = searchParams.get('container') || 'all';
    const lines = parseInt(searchParams.get('lines') || '200', 10);

    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const result = await getContainerLogs(server, container, lines);
    return NextResponse.json({
      success: result.success,
      serverId: server._id?.toString() || id,
      container,
      lines,
      logs: result.logs,
      error: result.error,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

