import { NextRequest, NextResponse } from 'next/server';
import { getLiveServerClusterResources } from '@/lib/kubernetes/k8sServerService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const serverId = resolvedParams.serverId;

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true' || searchParams.get('sync') === 'true';

    const clusterData = await getLiveServerClusterResources(serverId, forceRefresh);
    return NextResponse.json(clusterData);
  } catch (err: any) {
    console.error(`Failed to fetch cluster resources for server:`, err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch cluster resources' },
      { status: 500 }
    );
  }
}

