import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import { getUnifiedServerInventory } from '@/lib/serverMonitoring/inventoryService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/on-premises/cloud-servers
 * Dedicated endpoint for On-Premises module to manage servers via configured cloud accounts.
 * Strictly filters servers by selected account(s) and provider(s).
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const providerFilter = (searchParams.get('provider') || 'all').toLowerCase();
    const accountIdsParam = searchParams.get('accountIds') || searchParams.get('accountId') || '';
    const regionParam = searchParams.get('region') || 'all';
    const searchParam = searchParams.get('search')?.toLowerCase() || '';

    // 1. Fetch all currently connected cloud accounts
    const accountQuery: any = { status: 'Connected' };
    if (providerFilter === 'aws' || providerFilter === 'azure') {
      accountQuery.provider = providerFilter;
    }

    const connectedAccounts = await CloudAccount.find(accountQuery).lean();

    // Map account IDs to Account Details
    const accountMap = new Map<string, { accountName: string; provider: string; regions: string[] }>();
    const availableAccounts = connectedAccounts.map((acc: any) => {
      const accId = (acc.accountId || acc.subscriptionId || acc._id.toString()).trim();
      const info = {
        id: acc._id.toString(),
        accountId: acc.accountId || acc.subscriptionId || '',
        subscriptionId: acc.subscriptionId || '',
        accountName: acc.accountName || `${acc.provider.toUpperCase()} Account`,
        provider: acc.provider as 'aws' | 'azure',
        regions: Array.from(new Set([...(acc.selectedRegions || []), ...(acc.availableRegions || [])])),
        status: acc.status,
      };
      if (accId) accountMap.set(accId, { accountName: info.accountName, provider: acc.provider, regions: info.regions });
      if (acc.accountId) accountMap.set(acc.accountId, { accountName: info.accountName, provider: acc.provider, regions: info.regions });
      if (acc.subscriptionId) accountMap.set(acc.subscriptionId, { accountName: info.accountName, provider: acc.provider, regions: info.regions });
      return info;
    });

    // 2. Parse selected account filter
    const selectedAccountIds = accountIdsParam
      ? accountIdsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // STRICT FILTER: If no accounts are selected, return empty server list (Requirement 2)
    if (selectedAccountIds.length === 0) {
      return NextResponse.json({
        accounts: availableAccounts,
        selectedAccountIds: [],
        servers: [],
        message: 'No cloud accounts selected. Select an AWS or Azure account to display associated servers.',
      });
    }

    // Filter connected accounts to only those explicitly selected
    const activeSelectedAccounts = availableAccounts.filter(
      (a) =>
        selectedAccountIds.includes(a.id) ||
        selectedAccountIds.includes(a.accountId) ||
        selectedAccountIds.includes(a.subscriptionId)
    );

    const activeAwsAccountIds = activeSelectedAccounts
      .filter((a) => a.provider === 'aws')
      .map((a) => a.accountId)
      .filter(Boolean);

    const activeAzureSubIds = activeSelectedAccounts
      .filter((a) => a.provider === 'azure')
      .map((a) => a.subscriptionId || a.accountId)
      .filter(Boolean);

    // Build resource queries strictly scoped to selected accounts
    const resourceQueries: any[] = [];

    if (activeAwsAccountIds.length > 0 && (providerFilter === 'all' || providerFilter === 'aws')) {
      const awsQ: any = {
        provider: 'aws',
        resourceType: 'ec2',
        accountId: { $in: activeAwsAccountIds },
        isDeleted: { $ne: true },
      };
      if (regionParam && regionParam !== 'all') awsQ.region = regionParam;
      resourceQueries.push(awsQ);
    }

    if (activeAzureSubIds.length > 0 && (providerFilter === 'all' || providerFilter === 'azure')) {
      const azQ: any = {
        provider: 'azure',
        resourceType: 'vm',
        subscriptionId: { $in: activeAzureSubIds },
        isDeleted: { $ne: true },
      };
      if (regionParam && regionParam !== 'all') azQ.region = regionParam;
      resourceQueries.push(azQ);
    }

    if (resourceQueries.length === 0) {
      return NextResponse.json({
        accounts: availableAccounts,
        selectedAccountIds,
        servers: [],
      });
    }

    const resources = await CloudResource.find({ $or: resourceQueries }).lean();

    // Map CloudResources to standardized Server representation
    const servers = resources
      .map((r: any) => {
        const rawStatus = (r.status || 'running').toLowerCase();
        const isRunning = rawStatus.includes('run') || rawStatus === 'online';
        const isStopping = rawStatus.includes('stopping') || rawStatus.includes('deallocating');
        const isStarting = rawStatus.includes('starting') || rawStatus.includes('pending');
        const isStopped =
          rawStatus.includes('stopped') ||
          rawStatus.includes('deallocated') ||
          rawStatus === 'offline';

        const displayStatus = isStopping
          ? 'Stopping'
          : isStarting
          ? 'Starting'
          : isRunning
          ? 'Running'
          : isStopped
          ? 'Stopped'
          : r.status || 'Unknown';

        const accDetails =
          accountMap.get(r.accountId || r.subscriptionId || '') ||
          accountMap.get(r.subscriptionId || '') ||
          accountMap.get(r.accountId || '');

        const accountName = accDetails?.accountName || (r.provider === 'aws' ? 'AWS Account' : 'Azure Subscription');

        return {
          id: r._id.toString(),
          resourceId: r.resourceId,
          name: r.name || r.resourceId,
          cloudProvider: r.provider as 'aws' | 'azure',
          accountName,
          accountId: r.accountId || r.subscriptionId || '',
          subscriptionId: r.subscriptionId || '',
          resourceGroup: r.resourceGroup || 'default-rg',
          region: r.region || 'global',
          publicIp: r.publicIp && r.publicIp !== '-' ? r.publicIp : null,
          privateIp: r.privateIp && r.privateIp !== '-' ? r.privateIp : null,
          host: r.publicIp || r.privateIp || '-',
          os:
            r.metadata?.osName ||
            (typeof r.metadata?.os === 'string' ? r.metadata.os : null) ||
            (r.provider === 'azure' ? 'Ubuntu 24.04.5 LTS' : 'Linux / Amazon Linux'),
          status: displayStatus,
          powerState: displayStatus,
          cpuUsage: typeof r.metrics?.cpuUtilization === 'number' ? Math.round(r.metrics.cpuUtilization) : null,
          memoryUsage: typeof r.metrics?.memoryUtilization === 'number' ? Math.round(r.metrics.memoryUtilization) : null,
          diskUsage: typeof r.metrics?.diskUtilization === 'number' ? Math.round(r.metrics.diskUtilization) : null,
          lastConnected: r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleString() : 'Recently',
          lastSyncedAt: r.lastSyncAt,
          detailUrl:
            r.provider === 'aws'
              ? `/dashboard/ec2/${encodeURIComponent(r.resourceId)}`
              : `/dashboard/azure-vms/${encodeURIComponent(r.name || r.resourceId)}`,
          isSSHConnected: Boolean(r.metadata?.sshServerId || r.isSSHConnected),
        };
      })
      .filter((srv: any) => {
        if (!searchParam) return true;
        return (
          srv.name.toLowerCase().includes(searchParam) ||
          srv.resourceId.toLowerCase().includes(searchParam) ||
          srv.accountName.toLowerCase().includes(searchParam) ||
          srv.region.toLowerCase().includes(searchParam) ||
          (srv.publicIp && srv.publicIp.toLowerCase().includes(searchParam)) ||
          (srv.privateIp && srv.privateIp.toLowerCase().includes(searchParam))
        );
      });

    return NextResponse.json({
      accounts: availableAccounts,
      selectedAccountIds,
      servers,
    });
  } catch (err: any) {
    console.error('Error fetching on-premises cloud servers:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch cloud account servers' },
      { status: 500 }
    );
  }
}
