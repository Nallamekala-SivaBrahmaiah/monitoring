import { NextRequest, NextResponse } from 'next/server';
import { mockK8sClusters } from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider')?.toLowerCase();

  let clusters = [...mockK8sClusters];
  if (provider && provider !== 'all') {
    clusters = clusters.filter((c) => c.cloudProvider.toLowerCase() === provider);
  }

  return NextResponse.json(clusters);
}
