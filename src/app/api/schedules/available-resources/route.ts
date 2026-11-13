import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import { runFullInfrastructureReconciliation } from '@/lib/sync/reconciliationEngine';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // If explicit refresh is requested, trigger background reconciliation first
    if (forceRefresh) {
      await runFullInfrastructureReconciliation().catch((err) => {
        console.warn('[available-resources] Background sync warning during refresh:', err);
      });
    }

    // 1. Query only valid compute resources from CloudResource (EC2 instances and Azure VMs)
    // Exclude deleted, terminated, or non-compute records
    let cloudResources: any[] = await CloudResource.find({
      provider: { $in: ['aws', 'azure'] },
      $or: [
        { resourceType: { $in: ['ec2', 'vm'] } },
        { resourceId: /^i-[0-9a-f]{8,17}$/i },
        { resourceId: /\/virtualMachines\//i },
      ],
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    }).lean();

    // If no compute resources found and not refreshed yet, attempt auto-reconciliation
    if (cloudResources.length === 0 && !forceRefresh) {
      try {
        await runFullInfrastructureReconciliation();
        cloudResources = await CloudResource.find({
          provider: { $in: ['aws', 'azure'] },
          $or: [
            { resourceType: { $in: ['ec2', 'vm'] } },
            { resourceId: /^i-[0-9a-f]{8,17}$/i },
            { resourceId: /\/virtualMachines\//i },
          ],
          isDeleted: { $ne: true },
          status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
        }).lean();
      } catch (e) {
        console.warn('[available-resources] Auto-reconciliation fallback failed:', e);
      }
    }

    // 2. Query registered servers to merge SSH telemetry and link identifiers
    const servers = await Server.find().lean();

    const availableResources: Array<{
      id: string;
      name: string;
      resourceId: string;
      provider: 'aws' | 'azure';
      region: string;
      currentState: 'Running' | 'Stopped' | 'Deallocated';
      ipAddress?: string;
      sshServerId?: string;
      isSSHConnected?: boolean;
    }> = [];

    // Track unique keys to guarantee zero duplicates
    const seenKeys = new Set<string>();

    for (const cr of cloudResources) {
      const isAws = cr.provider === 'aws';
      const isAzure = cr.provider === 'azure';
      if (!isAws && !isAzure) continue;

      // Determine the permanent canonical resourceId
      // For AWS: EC2 Instance ID (e.g. i-0d2fe8a59e80b3f5b)
      // For Azure: Full Azure Resource ID (/subscriptions/.../virtualMachines/vmName)
      let canonicalResourceId = (cr.resourceId || '').trim();
      if (!canonicalResourceId) {
        canonicalResourceId = (cr.name || '').trim();
      }
      if (!canonicalResourceId) continue;

      // Deduplication key:
      // AWS: provider + region + instanceId
      // Azure: provider + lowercase(azureResourceId)
      const dedupKey = isAws
        ? `aws:${(cr.region || 'default').toLowerCase()}:${canonicalResourceId.toLowerCase()}`
        : `azure:${canonicalResourceId.toLowerCase()}`;

      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);

      // Match corresponding SSH Server document
      const crName = (cr.name || '').toLowerCase().trim();
      const crPublicIp = (cr.publicIp || '').trim();
      const crPrivateIp = (cr.privateIp || '').trim();
      const existingSshId = cr.metadata?.sshServerId || cr.tags?.sshServerId;

      const matchingServer = servers.find((s: any) => {
        if (existingSshId && s._id?.toString() === existingSshId) return true;
        if (isAws) {
          if (s.instanceId && s.instanceId.toLowerCase() === canonicalResourceId.toLowerCase()) return true;
          if (s.cloudResourceId && s.cloudResourceId.toLowerCase() === canonicalResourceId.toLowerCase()) return true;
          if (s.cloudProvider === 'aws') {
            const sName = (s.name || '').toLowerCase().trim();
            if (sName === crName || sName === canonicalResourceId.toLowerCase()) return true;
            const sHost = (s.host || '').trim();
            if (sHost && (sHost === crPublicIp || sHost === crPrivateIp)) return true;
          }
        } else if (isAzure) {
          if (s.cloudResourceId && s.cloudResourceId.toLowerCase() === canonicalResourceId.toLowerCase()) return true;
          if (s.cloudProvider === 'azure') {
            const sName = (s.name || '').toLowerCase().trim();
            if (sName === crName) return true;
            const sHost = (s.host || '').trim();
            if (sHost && (sHost === crPublicIp || sHost === crPrivateIp)) return true;
          }
        }
        return false;
      });

      // Synchronize database link in the background if unset (Requirement 6)
      if (matchingServer) {
        const needsLinkUpdate = isAws
          ? !matchingServer.instanceId || !matchingServer.cloudResourceId
          : !matchingServer.cloudResourceId || matchingServer.instanceId !== cr.name;

        if (needsLinkUpdate) {
          const updateFields: any = isAws
            ? { instanceId: canonicalResourceId, cloudResourceId: canonicalResourceId }
            : { cloudResourceId: canonicalResourceId, instanceId: cr.name };

          if (crPublicIp) updateFields.publicIp = crPublicIp;
          if (crPrivateIp) updateFields.privateIp = crPrivateIp;

          Server.updateOne({ _id: matchingServer._id }, { $set: updateFields }).catch(() => null);
        }
      }

      // Compute operational status: Running, Stopped, or Deallocated (Requirement 7)
      const rawStatus = (cr.status || '').toLowerCase();
      const rawPower = (cr.metadata?.powerState || cr.tags?.powerState || '').toLowerCase();

      let currentState: 'Running' | 'Stopped' | 'Deallocated' = 'Stopped';
      if (rawStatus.includes('run') || rawPower.includes('run') || rawStatus === 'online') {
        currentState = 'Running';
      } else if (rawStatus.includes('dealloc') || rawPower.includes('dealloc')) {
        currentState = 'Deallocated';
      } else {
        currentState = 'Stopped';
      }

      const defaultRegion = isAws ? 'ap-southeast-2' : 'centralindia';

      availableResources.push({
        id: cr._id.toString(),
        name: cr.name || canonicalResourceId,
        resourceId: canonicalResourceId,
        provider: isAws ? 'aws' : 'azure',
        region: cr.region || defaultRegion,
        currentState,
        ipAddress: cr.publicIp || cr.privateIp || matchingServer?.host,
        sshServerId: matchingServer?._id?.toString(),
        isSSHConnected: Boolean(matchingServer && (matchingServer.status === 'Online' || matchingServer.encryptedAuthSecret)),
      });
    }

    // Sort alphabetically by server name
    availableResources.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      resources: availableResources,
    });
  } catch (err: any) {
    console.error('Error fetching available resources for scheduling:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
