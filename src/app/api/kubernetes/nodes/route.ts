import { NextRequest, NextResponse } from 'next/server';
import { mockK8sNodes } from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cluster = searchParams.get('cluster');

  let nodes = [...mockK8sNodes];
  if (cluster) {
    nodes = nodes.filter((n) => n.cluster === cluster);
  }

  return NextResponse.json(nodes);
}
