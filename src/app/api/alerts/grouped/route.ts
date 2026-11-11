import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { getUnifiedServerInventory } from '@/lib/serverMonitoring/inventoryService';
import { getAlertThresholds } from '@/lib/monitoring/alertEvaluationEngine';
import Alert from '@/models/Alert';

export interface GroupedServerMetric {
  current: number | null;
  threshold: number;
  peak: number | null;
  mount?: string;
  status: 'critical' | 'high' | 'warning' | 'normal' | 'na';
}

export interface GroupedServerCardItem {
  id: string;
  serverName: string;
  provider: string; // 'AWS', 'Azure', 'SSH Server'
  rawProvider: string;
  region: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  host: string;
  status: 'active' | 'resolved' | 'healthy';
  activeSeverity?: 'Critical' | 'High' | 'Warning';
  activeAlertsCount: number;
  cpu: GroupedServerMetric;
  memory: GroupedServerMetric;
  disk: GroupedServerMetric;
  alerts: Array<{
    id: string;
    title: string;
    metricName: string;
    status: 'active' | 'acknowledged' | 'resolved';
    severity: string;
    message: string;
    value: number;
    peakValue?: number | null;
    timestamp: string;
  }>;
  lastUpdated: string;
}

function normalizeProviderName(provider?: string): string {
  if (!provider) return 'SSH Server';
  const p = provider.toLowerCase().trim();
  if (p === 'aws' || p.includes('ec2') || p.includes('amazon')) return 'AWS';
  if (p === 'azure') return 'Azure';
  if (p === 'ssh' || p === 'server' || p === 'linux' || p.includes('ssh')) return 'SSH Server';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function calculateMetricStatus(
  current: number | null,
  threshold: number
): 'critical' | 'high' | 'warning' | 'normal' | 'na' {
  if (current === null || current === undefined || isNaN(current)) return 'na';
  if (current >= 90) return 'critical';
  if (current >= 80) return 'high';
  if (current >= threshold) return 'warning';
  return 'normal';
}

/**
 * GET /api/alerts/grouped
 * Returns server cards grouped by unique server, containing side-by-side
 * live metrics (CPU, Memory, Disk), configured thresholds, and actual recorded peaks.
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || null;
    const providerFilter = searchParams.get('provider')?.toLowerCase() || 'all';
    const statusFilter = searchParams.get('status')?.toLowerCase() || 'all';

    const thresholds = await getAlertThresholds();
    const inventory = await getUnifiedServerInventory();
    const allAlerts = await Alert.find().sort({ timestamp: -1 }).lean();

    const groupedCards: GroupedServerCardItem[] = [];
    const matchedAlertIds = new Set<string>();

    for (const s of inventory) {
      const serverName = s.name || 'Unknown Server';
      const rawProvider = (s.cloudProvider || 'other').toLowerCase();
      const provider = normalizeProviderName(rawProvider);
      const region = s.region || 'global';
      const ipAddress = s.publicIp || s.host || s.privateIp || '-';

      // Provider filter check
      if (providerFilter !== 'all') {
        if (providerFilter === 'azure' && rawProvider !== 'azure') continue;
        if (providerFilter === 'aws' && rawProvider !== 'aws') continue;
        if (providerFilter === 'other' && (rawProvider === 'azure' || rawProvider === 'aws')) continue;
      }

      // Search filter check
      if (search) {
        const matchName = serverName.toLowerCase().includes(search);
        const matchIp = ipAddress.toLowerCase().includes(search);
        const matchRegion = region.toLowerCase().includes(search);
        if (!matchName && !matchIp && !matchRegion) continue;
      }

      // Find all alerts associated with this server
      const serverAlerts = (allAlerts as any[]).filter((a) => {
        const aName = (a.resourceName || '').toLowerCase();
        const aResId = (a.resourceId || '').toLowerCase();
        const sNameLower = serverName.toLowerCase();
        const sResIdLower = (s.resourceId || '').toLowerCase();
        const sshIdLower = (s.sshServerId || '').toLowerCase();

        return (
          aName === sNameLower ||
          aResId === sResIdLower ||
          (sshIdLower && aResId === sshIdLower) ||
          (s.publicIp && aResId.includes(s.publicIp.toLowerCase()))
        );
      });

      // Mark matched alerts
      serverAlerts.forEach((a) => matchedAlertIds.add(a._id.toString()));

      // Current live metrics from collector (strictly live telemetry - never overwritten by old alert numbers)
      const currentCpu =
        typeof s.metrics?.cpu === 'number' && !isNaN(s.metrics.cpu)
          ? Math.round(s.metrics.cpu * 10) / 10
          : null;
      const currentMem =
        typeof s.metrics?.memory === 'number' && !isNaN(s.metrics.memory)
          ? Math.round(s.metrics.memory * 10) / 10
          : null;
      const currentDisk =
        typeof s.metrics?.disk === 'number' && !isNaN(s.metrics.disk)
          ? Math.round(s.metrics.disk * 10) / 10
          : null;

      // Reconcile active alerts against live telemetry:
      // If live metrics for this server are below threshold, auto-resolve any stale active alerts
      for (const alert of serverAlerts) {
        if (alert.status === 'active') {
          const m = (alert.metricName || '').toLowerCase();
          const currentVal = m === 'cpu' ? currentCpu : m === 'memory' ? currentMem : currentDisk;
          const thresh =
            m === 'cpu'
              ? thresholds.cpuThreshold
              : m === 'memory'
              ? thresholds.memoryThreshold
              : thresholds.diskThreshold;

          if (currentVal !== null && currentVal < thresh) {
            // Asynchronously mark resolved in MongoDB
            Alert.updateOne(
              { _id: alert._id, status: 'active' },
              {
                $set: {
                  status: 'resolved',
                  resolvedAt: new Date(),
                  lastEvaluatedAt: new Date(),
                  value: currentVal,
                },
                $push: {
                  history: {
                    timestamp: new Date(),
                    status: 'resolved',
                    value: currentVal,
                    message: `${alert.metricName || 'Metric'} returned to ${currentVal}% (below threshold ${thresh}%). Auto-resolved.`,
                  },
                },
              }
            ).exec().catch(() => null);
            alert.status = 'resolved';
          }
        }
      }

      // Active vs resolved check
      const activeAlerts = serverAlerts.filter((a) => a.status === 'active');
      const hasActive = activeAlerts.length > 0;
      const hasResolved = !hasActive && serverAlerts.some((a) => a.status === 'resolved');

      let overallStatus: 'active' | 'resolved' | 'healthy' = 'healthy';
      if (hasActive) overallStatus = 'active';
      else if (hasResolved) overallStatus = 'resolved';

      // Status filter check
      if (statusFilter === 'active' && overallStatus !== 'active') continue;
      if (statusFilter === 'resolved' && overallStatus !== 'resolved') continue;

      let highestSeverity: 'Critical' | 'High' | 'Warning' | undefined = undefined;
      if (hasActive) {
        if (activeAlerts.some((a) => (a.severity || '').toLowerCase() === 'critical')) {
          highestSeverity = 'Critical';
        } else if (activeAlerts.some((a) => (a.severity || '').toLowerCase() === 'high')) {
          highestSeverity = 'High';
        } else {
          highestSeverity = 'Warning';
        }
      }

      // Find recorded peak values from alerts
      const cpuAlerts = serverAlerts.filter((a) => (a.metricName || '').toLowerCase() === 'cpu');
      const memAlerts = serverAlerts.filter((a) => (a.metricName || '').toLowerCase() === 'memory');
      const diskAlerts = serverAlerts.filter((a) => (a.metricName || '').toLowerCase() === 'disk');

      const getPeak = (alertsList: any[]): number | null => {
        const peaks = alertsList
          .map((a) => (typeof a.peakValue === 'number' ? a.peakValue : null))
          .filter((v): v is number => v !== null);
        if (peaks.length > 0) return Math.max(...peaks);
        return null;
      };

      const cpuPeak = getPeak(cpuAlerts);
      const memPeak = getPeak(memAlerts);
      const diskPeak = getPeak(diskAlerts);

      const diskMount = diskAlerts[0]?.filesystem || '/';

      groupedCards.push({
        id: s.id || s.resourceId,
        serverName,
        provider,
        rawProvider,
        region,
        resourceType: s.cloudProvider === 'azure' ? 'AzureVM' : s.cloudProvider === 'aws' ? 'EC2Instance' : 'Server',
        resourceId: s.resourceId || s.id,
        ipAddress,
        host: s.host || ipAddress,
        status: overallStatus,
        activeSeverity: highestSeverity,
        activeAlertsCount: activeAlerts.length,
        cpu: {
          current: currentCpu,
          threshold: thresholds.cpuThreshold,
          peak: cpuPeak,
          status: calculateMetricStatus(currentCpu, thresholds.cpuThreshold),
        },
        memory: {
          current: currentMem,
          threshold: thresholds.memoryThreshold,
          peak: memPeak,
          status: calculateMetricStatus(currentMem, thresholds.memoryThreshold),
        },
        disk: {
          current: currentDisk,
          mount: diskMount,
          threshold: thresholds.diskThreshold,
          peak: diskPeak,
          status: calculateMetricStatus(currentDisk, thresholds.diskThreshold),
        },
        alerts: serverAlerts.map((a) => ({
          id: a._id.toString(),
          title: a.title,
          metricName: a.metricName,
          status: a.status,
          severity: a.severity,
          message: a.message,
          value: a.value,
          peakValue: a.peakValue,
          timestamp: new Date(a.timestamp || a.triggeredAt || a.createdAt).toISOString(),
        })),
        lastUpdated: (s.lastSyncedAt || s.lastConnectedAt || new Date()).toISOString(),
      });
    }

    // Purge any orphan alerts that do not belong to any server in active inventory
    const unmatchedAlertIds = (allAlerts as any[])
      .filter((a) => !matchedAlertIds.has(a._id.toString()))
      .map((a) => a._id);

    if (unmatchedAlertIds.length > 0) {
      await Alert.deleteMany({ _id: { $in: unmatchedAlertIds } }).catch(() => {});
    }

    return NextResponse.json(groupedCards);
  } catch (err: any) {
    console.error('[Grouped Alerts API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch grouped server alerts' }, { status: 500 });
  }
}
