import { NextRequest, NextResponse } from 'next/server';
import { fetchResources } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const vms = await fetchResources({ resourceType: 'vm' });
    const azureVm = vms.find((v) => v.provider === 'azure');
    const hostName = azureVm?.name || 'vm01siva';
    const region = azureVm?.region || 'centralindia';

    const images = [
      {
        id: 'img-1',
        imageId: 'sha256:9a81c4e1291b',
        shortId: '9a81c4e1291b',
        repository: 'nginx',
        tag: 'alpine',
        fullTag: 'nginx:alpine',
        hostInstance: hostName,
        cloudProvider: 'azure',
        region: region,
        size: '23.4 MB',
        sizeBytes: 24536678,
        activeContainers: 1,
        created: '3 weeks ago',
      },
      {
        id: 'img-2',
        imageId: 'sha256:78cb0132df4a',
        shortId: '78cb0132df4a',
        repository: 'monitoring-backend',
        tag: 'latest',
        fullTag: 'monitoring-backend:latest',
        hostInstance: hostName,
        cloudProvider: 'azure',
        region: region,
        size: '184.2 MB',
        sizeBytes: 193146880,
        activeContainers: 1,
        created: '38 minutes ago',
      },
      {
        id: 'img-3',
        imageId: 'sha256:41ee8905b0c7',
        shortId: '41ee8905b0c7',
        repository: 'monitoring-frontend',
        tag: 'latest',
        fullTag: 'monitoring-frontend:latest',
        hostInstance: hostName,
        cloudProvider: 'azure',
        region: region,
        size: '215.8 MB',
        sizeBytes: 226282496,
        activeContainers: 1,
        created: '38 minutes ago',
      },
      {
        id: 'img-4',
        imageId: 'sha256:5b2901a88df1',
        shortId: '5b2901a88df1',
        repository: 'certbot/certbot',
        tag: 'latest',
        fullTag: 'certbot/certbot:latest',
        hostInstance: hostName,
        cloudProvider: 'azure',
        region: region,
        size: '48.7 MB',
        sizeBytes: 51065600,
        activeContainers: 1,
        created: '2 months ago',
      },
      {
        id: 'img-5',
        imageId: 'sha256:291bc41a9901',
        shortId: '291bc41a9901',
        repository: 'mongo',
        tag: '7.0',
        fullTag: 'mongo:7.0',
        hostInstance: hostName,
        cloudProvider: 'azure',
        region: region,
        size: '682.0 MB',
        sizeBytes: 715128832,
        activeContainers: 0,
        created: '1 month ago',
      },
    ];

    const filtered = provider && provider !== 'all'
      ? images.filter((img) => img.cloudProvider === provider)
      : images;

    return NextResponse.json(filtered);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Docker images' }, { status: 500 });
  }
}
