import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { resolveDockerServer, queryServerDockerResources } from '@/lib/docker/dockerEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Docker host server not found' }, { status: 404 });
    }

    const resources = await queryServerDockerResources(server);

    return NextResponse.json({
      ...resources,
      serverId: server._id?.toString() || id,
      serverName: server.name,
      serverHost: server.host,
      cloudProvider: server.cloudProvider,
      region: server.region,
      osName: server.os?.name ? `${server.os.name} ${server.os.version || ''}`.trim() : 'Linux',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

