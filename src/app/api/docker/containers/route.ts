import { NextRequest, NextResponse } from 'next/server';
import { mockDockerContainers } from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider')?.toLowerCase();
  const hostId = searchParams.get('hostId');

  let containers = [...mockDockerContainers];

  if (provider && provider !== 'all') {
    containers = containers.filter((c) => c.cloudProvider.toLowerCase() === provider);
  }

  if (hostId) {
    containers = containers.filter((c) => c.hostId === hostId);
  }

  return NextResponse.json(containers);
}
