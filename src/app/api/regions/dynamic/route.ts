import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedServerInventory, UnifiedServerResource } from '@/lib/serverMonitoring/inventoryService';
import { ALL_AWS_REGIONS, ALL_AZURE_REGIONS } from '@/services/regionDiscoveryService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetRegion = searchParams.get('region');
    const provider = searchParams.get('provider');

    // Fetch unified inventory (merged cloud-discovered VMs and registered SSH servers)
    const allResources = await getUnifiedServerInventory({
      provider: provider && provider !== 'all' ? provider : null,
      region: targetRegion || null,
    });

    // Group resources by region
    const regionMap = new Map<string, {
      region: string;
      displayName: string;
      cloud: 'aws' | 'azure' | 'other';
      resources: any[];
    }>();

    for (const res of allResources) {
      const rawReg = res.region || 'Region Not Available';
      const regCode = rawReg.toLowerCase().replace(/[\s-_]+/g, '');

      if (!regionMap.has(regCode)) {
        let displayName = rawReg;
        let cloud: 'aws' | 'azure' | 'other' = 'other';

        if (res.cloudProvider === 'aws') {
          cloud = 'aws';
          const matched = ALL_AWS_REGIONS.find(
            (r) => r.code.toLowerCase().replace(/[\s-_]+/g, '') === regCode
          );
          if (matched) displayName = matched.name;
        } else if (res.cloudProvider === 'azure') {
          cloud = 'azure';
          const matched = ALL_AZURE_REGIONS.find(
            (r) => r.code.toLowerCase().replace(/[\s-_]+/g, '') === regCode
          );
          if (matched) displayName = matched.name;
        } else {
          cloud = 'other';
          displayName = rawReg === 'Region Not Available' ? 'Unassigned / General Location' : rawReg;
        }

        regionMap.set(regCode, {
          region: rawReg,
          displayName,
          cloud,
          resources: [],
        });
      }

      const isRunning = (res.status || '').toLowerCase().includes('run');

      const normResource = {
        id: res.id,
        resourceId: res.resourceId,
        name: res.name,
        cloudProvider: res.cloudProvider,
        region: res.region,
        status: isRunning ? 'Running' : (res.status || 'Stopped'),
        type:
          res.cloudProvider === 'aws'
            ? 'EC2 Instance'
            : res.cloudProvider === 'azure'
            ? 'Virtual Machine'
            : 'Linux Server Node',
        size: res.vmSize || 'Standard',
        privateIp: res.privateIp || '-',
        publicIp: res.publicIp || res.host || '-',
        os: res.os || 'Linux',
        creationTime: res.lastSyncedAt ? new Date(res.lastSyncedAt).toLocaleDateString() : 'Active',
        startTime: isRunning ? 'Online (Active)' : 'Stopped',
        runningDuration: isRunning ? 'Active Telemetry' : 'Offline',
        tags: res.tags || {},

        // Verification & Telemetry flags
        isSSHConnected: res.isSSHConnected,
        sshServerId: res.sshServerId,
        sshStatus: res.sshStatus,

        // Actual Metrics
        metrics: {
          cpu: res.metrics?.cpu ?? null,
          memory: res.metrics?.memory ?? null,
          disk: res.metrics?.disk ?? null,
          network:
            res.metrics?.networkIn !== null && res.metrics?.networkIn !== undefined
              ? `${res.metrics.networkIn} MB/s in / ${res.metrics.networkOut || 0} MB/s out`
              : 'N/A',
        },

        // Real Docker Telemetry
        docker: {
          detected: res.docker?.detected || false,
          status: res.docker?.status || 'not_installed',
          version: res.docker?.version || '',
          containersCount: res.docker?.containersCount || 0,
        },

        // Real Kubernetes Telemetry
        kubernetes: {
          detected: res.kubernetes?.detected || false,
          version: res.kubernetes?.version || '',
          podsCount: res.kubernetes?.podsCount || 0,
        },
      };

      regionMap.get(regCode)!.resources.push(normResource);
    }

    const summaries = Array.from(regionMap.values()).map((entry) => {
      const runningCount = entry.resources.filter((r) => r.status === 'Running').length;
      const stoppedCount = entry.resources.length - runningCount;

      return {
        region: entry.region,
        displayName: entry.displayName,
        cloud: entry.cloud,
        resourceCount: entry.resources.length,
        runningCount,
        stoppedCount,
        resources: entry.resources,
      };
    });

    // If specific region requested, return the single region details
    if (targetRegion) {
      const normTarget = targetRegion.toLowerCase().replace(/[\s-_]+/g, '');
      const found = summaries.find(
        (s) => s.region.toLowerCase().replace(/[\s-_]+/g, '') === normTarget
      );
      if (!found) {
        return NextResponse.json(
          {
            region: targetRegion,
            displayName: targetRegion,
            cloud: 'other' as const,
            resourceCount: 0,
            runningCount: 0,
            stoppedCount: 0,
            resources: [],
          },
          { status: 200 }
        );
      }
      return NextResponse.json(found);
    }

    return NextResponse.json(summaries);
  } catch (err: any) {
    console.error('Dynamic regions error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch dynamic regions' }, { status: 500 });
  }
}
