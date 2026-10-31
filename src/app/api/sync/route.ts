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

    // Calculate freshness
    let freshness = 'Never';
    if (lastStatus.lastSyncTimestamp) {
      const diffSec = Math.floor((Date.now() - new Date(lastStatus.lastSyncTimestamp).getTime()) / 1000);
      if (diffSec < 30) freshness = 'Just now';
      else if (diffSec < 60) freshness = `${diffSec}s ago`;
      else if (diffSec < 3600) freshness = `${Math.floor(diffSec / 60)}m ago`;
      else freshness = `${Math.floor(diffSec / 3600)}h ago`;
    }

    return NextResponse.json({
      lastSyncAt: lastStatus.lastSyncTimestamp,
      status: lastStatus.isSyncRunning
        ? 'syncing'
        : lastStatus.lastSyncError
        ? 'stale'
        : lastStatus.lastSyncTimestamp
        ? 'synced'
        : 'idle',
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
