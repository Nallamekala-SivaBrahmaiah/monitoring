import { NextRequest, NextResponse } from 'next/server';
import { mockK8sPods } from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status')?.toLowerCase();
  const namespace = searchParams.get('namespace');
  const cluster = searchParams.get('cluster');

  let pods = [...mockK8sPods];

  if (status && status !== 'all') {
    pods = pods.filter((p) => p.status.toLowerCase() === status);
  }

  if (namespace && namespace !== 'all') {
    pods = pods.filter((p) => p.namespace === namespace);
  }

  if (cluster && cluster !== 'all') {
    pods = pods.filter((p) => p.cluster === cluster);
  }

  return NextResponse.json(pods);
}
