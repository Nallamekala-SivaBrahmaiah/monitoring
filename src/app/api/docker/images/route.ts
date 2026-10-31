import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const query: any = {};
    if (provider && provider !== 'all') {
      query.cloudProvider = provider;
    }

    const servers = await Server.find(query).lean();
    const imageList: any[] = [];

    for (const server of servers) {
      const docker = server.docker;
      if (!docker || !docker.images || docker.images.length === 0) continue;

      for (const img of docker.images) {
        const fullId = img.id || '';
        const shortId = fullId.replace(/^sha256:/, '').substring(0, 12);
        const fullTag = `${img.repository}:${img.tag}`;

        // Real count of active containers on this host using this image
        const activeCount = (docker.containers || []).filter(
          (c) => c.image === img.repository || c.image === fullTag || c.image === shortId
        ).length;

        // Calculate approximate bytes from human size
        let sizeBytes = 0;
        const sizeStr = img.size || '0MB';
        const num = parseFloat(sizeStr) || 0;
        if (sizeStr.includes('GB') || sizeStr.includes('GiB')) sizeBytes = Math.round(num * 1024 * 1024 * 1024);
        else if (sizeStr.includes('MB') || sizeStr.includes('MiB')) sizeBytes = Math.round(num * 1024 * 1024);
        else if (sizeStr.includes('KB') || sizeStr.includes('kB') || sizeStr.includes('KiB')) sizeBytes = Math.round(num * 1024);
        else sizeBytes = Math.round(num);

        imageList.push({
          id: (img as any)._id ? (img as any)._id.toString() : `img-${shortId}`,
          imageId: fullId,
          shortId,
          repository: img.repository,
          tag: img.tag,
          fullTag,
          hostInstance: server.name,
          hostId: server._id.toString(),
          hostIp: server.host,
          cloudProvider: (server.cloudProvider === 'azure' ? 'azure' : server.cloudProvider === 'aws' ? 'aws' : 'other') as 'aws' | 'azure' | 'other',
          region: server.region || 'centralindia',
          size: img.size,
          sizeBytes,
          activeContainers: activeCount,
          created: img.created || 'recently',
          metricSource: 'Direct SSH (Docker Engine)',
          lastUpdated: docker.lastSyncedAt ? new Date(docker.lastSyncedAt).toISOString() : new Date().toISOString(),
          dockerVersion: docker.version || 'Docker Engine',
        });
      }
    }

    return NextResponse.json(imageList);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Docker images' }, { status: 500 });
  }
}
