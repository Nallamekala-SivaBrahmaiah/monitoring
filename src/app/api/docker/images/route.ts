import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import { syncDockerResources } from '@/lib/docker/sync';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    // Run sync or query containers to see images
    const containers = await CloudResource.find({
      resourceType: 'container',
      isDeleted: { $ne: true },
    }).lean();

    // Collect distinct images from active containers
    const imageMap = new Map<string, any>();
    for (const c of containers) {
      const img = c.metadata?.image;
      if (!img) continue;

      if (!imageMap.has(img)) {
        const parts = img.split(':');
        const repo = parts[0];
        const tag = parts[1] || 'latest';
        imageMap.set(img, {
          id: `img-${img.replace(/[^a-zA-Z0-9]/g, '-')}`,
          imageId: `sha256:${Buffer.from(img).toString('hex').slice(0, 12)}`,
          shortId: Buffer.from(img).toString('hex').slice(0, 12),
          repository: repo,
          tag,
          fullTag: img,
          hostInstance: c.metadata?.host || 'vm01siva',
          cloudProvider: c.provider,
          region: c.region || 'centralindia',
          size: '882 MB',
          sizeBytes: 882 * 1024 * 1024,
          activeContainers: 1,
          created: c.metadata?.created || 'recently',
        });
      } else {
        const existing = imageMap.get(img);
        existing.activeContainers += 1;
      }
    }

    let images = Array.from(imageMap.values());
    if (provider && provider !== 'all') {
      images = images.filter((img) => img.cloudProvider === provider);
    }

    return NextResponse.json(images);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Docker images' }, { status: 500 });
  }
}
