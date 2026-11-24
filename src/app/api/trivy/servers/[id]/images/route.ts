import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { resolveServer, executeSSH } from '@/lib/devops/devopsToolsEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const server = await resolveServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: `Server not found with ID ${id}` }, { status: 404 });
    }

    const sStatus = (server.status || '').toLowerCase();
    if (sStatus.includes('stop') || sStatus === 'offline') {
      return NextResponse.json({
        success: false,
        error: 'Target server is currently stopped.',
        serverStatus: server.status,
        images: [],
      });
    }

    const cmd = `
if command -v docker >/dev/null 2>&1; then
  DOCKER_CMD="docker"
  if ! docker ps >/dev/null 2>&1 && sudo -n docker ps >/dev/null 2>&1; then
    DOCKER_CMD="sudo -n docker"
  fi
  $DOCKER_CMD images --no-trunc --format '{{.Repository}}:{{.Tag}};;;{{.ID}};;;{{.Size}};;;{{.CreatedAt}}' 2>/dev/null
fi
    `;

    const res = await executeSSH(server, cmd, 15000);
    const lines = (res.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const images = lines
      .map((line) => {
        const [fullTag, id, size, createdAt] = line.split(';;;');
        const [repo, tag] = (fullTag || '').split(':');
        return {
          fullTag: fullTag || '',
          repository: repo || '',
          tag: tag || 'latest',
          id: (id || '').slice(0, 12),
          size: size || '',
          createdAt: createdAt || '',
        };
      })
      .filter((img) => img.fullTag && !img.fullTag.includes('<none>'));

    return NextResponse.json({
      success: true,
      serverId: server._id?.toString() || id,
      serverName: server.name,
      serverHost: server.publicIp || server.host,
      images,
      count: images.length,
    });
  } catch (err: any) {
    console.error('[TrivyImagesAPI:GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch images' }, { status: 500 });
  }
}
