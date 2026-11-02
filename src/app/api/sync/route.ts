
import { NextRequest, NextResponse } from 'next/server';
import { runFullInfrastructureReconciliation, getLastSyncStatus } from '@/lib/sync/reconciliationEngine';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';

export async function GET() {
  try {
    await connectToDatabase();

    const lastStatus = getLastSyncStatus();

    // Query active counts by provider & type
    const activeAzureVms = await CloudResource.countDocuments({
      provider: 'azure',
      resourceType: 'vm',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    });

    const activeAwsEc2 = await CloudResource.countDocuments({
      provider: 'aws',
      resourceType: 'ec2',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    });

    const activeContainers = await CloudResource.countDocuments({
      resourceType: 'container',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    });

    const activeClusters = await CloudResource.countDocuments({
      resourceType: 'k8s_cluster',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    });

    const activePods = await CloudResource.countDocuments({
      resourceType: 'k8s_pod',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    });

    // Calculate real-time freshness
    let effectiveLastSync: Date | null = lastStatus.lastSyncTimestamp ? new Date(lastStatus.lastSyncTimestamp) : null;
    if (!effectiveLastSync) {
      const latestResource = await CloudResource.findOne().sort({ updatedAt: -1 }).select('updatedAt lastSyncAt').lean();
      if (latestResource) {
        effectiveLastSync = (latestResource as any).lastSyncAt
          ? new Date((latestResource as any).lastSyncAt)
          : (latestResource as any).updatedAt
          ? new Date((latestResource as any).updatedAt)
          : null;
      }
    }
    if (!effectiveLastSync) {
      effectiveLastSync = new Date();
    }

    const diffSec = Math.max(0, Math.floor((Date.now() - effectiveLastSync.getTime()) / 1000));
    let freshness = 'Just now';
    if (diffSec < 2) freshness = 'Just now';
    else if (diffSec < 60) freshness = `${diffSec}s ago`;
    else if (diffSec < 3600) freshness = `${Math.floor(diffSec / 60)}m ago`;
    else freshness = `${Math.floor(diffSec / 3600)}h ago`;

    return NextResponse.json({
      lastSyncAt: effectiveLastSync.toISOString(),
      status: lastStatus.isSyncRunning
        ? 'syncing'
        : lastStatus.lastSyncError
        ? 'stale'
        : 'synced',
      freshness,
      error: lastStatus.lastSyncError,
      resourcesCount: {
        aws: activeAwsEc2,
        azure: activeAzureVms,
        docker: activeContainers,
        kubernetes: activeClusters + activePods,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await runFullInfrastructureReconciliation();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to trigger reconciliation' },
      { status: 500 }
    );
  }
}
