import { NextRequest, NextResponse } from 'next/server';
import { getKubernetesInstalledServers } from '@/lib/kubernetes/k8sServerService';

export async function GET(request: NextRequest) {
  try {
    const servers = await getKubernetesInstalledServers();
    return NextResponse.json({
      servers,
      totalCount: servers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Failed to fetch Kubernetes installed servers:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch Kubernetes servers' },
      { status: 500 }
    );
  }
}

