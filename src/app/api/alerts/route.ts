import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Alert from '@/models/Alert';
import { getUnifiedServerInventory } from '@/lib/serverMonitoring/inventoryService';
import { evaluateAllMonitoredResources } from '@/lib/monitoring/alertEvaluationEngine';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status')?.toLowerCase() || 'all';
    const severity = searchParams.get('severity')?.toLowerCase();
    const provider = searchParams.get('provider')?.toLowerCase();
    const metric = searchParams.get('metric')?.toLowerCase();
    const search = searchParams.get('search')?.toLowerCase().trim();
    const autoEval = searchParams.get('evaluate');

    // Run quick evaluation on demand if requested
    if (autoEval === 'true') {
      await evaluateAllMonitoredResources().catch((e) =>
        console.warn('[Alerts API] Evaluation note:', e.message)
      );
    }

    // 1. Fetch active server inventory to strictly validate real resources
    const inventory = await getUnifiedServerInventory();
    const activeNames = new Set(
      inventory.map((s) => (s.name || '').toLowerCase().trim()).filter(Boolean)
    );
    const activeIds = new Set(
      inventory
        .flatMap((s) => [s.resourceId, s.id, s.sshServerId, s.publicIp, s.host])
        .filter(Boolean)
        .map((x) => x!.toLowerCase().trim())
    );

    // 2. Automatically purge any orphaned alerts for deleted/decommissioned resources (e.g. old vm01, vm02, vm03)
    if (inventory.length > 0) {
      await Alert.deleteMany({
        $and: [
          {
            resourceName: {
              $nin: Array.from(activeNames).map((n) => new RegExp(`^${n}$`, 'i')),
            },
          },
          {
            resourceId: {
              $nin: Array.from(activeIds),
            },
          },
        ],
      });
    }

    const query: any = {};

    if (statusParam && statusParam !== 'all') {
      query.status = statusParam;
    }

    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    if (provider && provider !== 'all') {
      query.provider = provider;
    }

    if (metric && metric !== 'all') {
      query.metricName = metric;
    }

    if (search) {
      query.$or = [
        { resourceName: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { resourceId: { $regex: search, $options: 'i' } },
      ];
    }

    const alerts = await Alert.find(query).sort({ timestamp: -1 }).limit(200).lean();

    return NextResponse.json(
      alerts.map((a: any) => {
        let displayValue = typeof a.value === 'number' ? a.value : 0;
        let peakVal = typeof a.peakValue === 'number' ? a.peakValue : null;

        if (a.status === 'resolved') {
          // If value is still at exceeded/threshold level, resolve from last history entry or message
          const lastResolved =
            Array.isArray(a.history) && a.history.length > 0
              ? a.history[a.history.length - 1]
              : null;

          if (
            lastResolved &&
            typeof lastResolved.value === 'number' &&
            lastResolved.value < (a.threshold || 70)
          ) {
            if (!peakVal) peakVal = a.value;
            displayValue = lastResolved.value;
          } else {
            const match = (a.message || '').match(/returned to (\d+(\.\d+)?)%/i);
            if (match) {
              if (!peakVal) peakVal = a.value;
              displayValue = parseFloat(match[1]);
            }
          }
        } else if (Array.isArray(a.history) && a.history.length > 0) {
          if (!peakVal) {
            peakVal = Math.max(...a.history.map((h: any) => h.value || 0), a.value);
          }
        }

        return {
          id: a._id.toString(),
          alertKey: a.alertKey,
          resourceId: a.resourceId,
          resourceName: a.resourceName || 'Unknown Resource',
          resourceType: a.resourceType || 'Server',
          severity:
            a.status === 'resolved'
              ? 'Recovered'
              : a.severity
              ? a.severity.charAt(0).toUpperCase() + a.severity.slice(1)
              : 'Warning',
          metricName: a.metricName || 'cpu',
          filesystem: a.filesystem || '',
          value: displayValue,
          peakValue: peakVal,
          threshold: typeof a.threshold === 'number' ? a.threshold : 70,
          title: a.title,
          message: a.message,
          region: a.region || 'global',
          cloud: a.provider || 'other',
          provider: a.provider || 'other',
          status: a.status || 'active',
          timestamp: a.timestamp ? new Date(a.timestamp).toISOString() : new Date().toISOString(),
          triggeredAt: a.triggeredAt
            ? new Date(a.triggeredAt).toISOString()
            : a.timestamp
            ? new Date(a.timestamp).toISOString()
            : new Date().toISOString(),
          lastEvaluatedAt: a.lastEvaluatedAt
            ? new Date(a.lastEvaluatedAt).toISOString()
            : new Date().toISOString(),
          resolvedAt: a.resolvedAt ? new Date(a.resolvedAt).toISOString() : null,
          acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt).toISOString() : null,
          history: Array.isArray(a.history)
            ? a.history.map((h: any) => ({
                timestamp: h.timestamp ? new Date(h.timestamp).toISOString() : new Date().toISOString(),
                status: h.status,
                value: h.value,
                message: h.message,
              }))
            : [],
        };
      })
    );
  } catch (err: any) {
    console.error('Error fetching alerts:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, status, resolveAll } = body;

    if (resolveAll) {
      const now = new Date();
      await Alert.updateMany(
        { status: 'active' },
        {
          $set: {
            status: 'resolved',
            resolvedAt: now,
            lastEvaluatedAt: now,
          },
        }
      );
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    const alert = await Alert.findById(id);
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const now = new Date();
    if (status === 'acknowledged') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = now;
      alert.history.push({
        timestamp: now,
        status: 'acknowledged',
        value: alert.value,
        message: 'Alert acknowledged by DevOps engineer.',
      });
    } else if (status === 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = now;
      alert.lastEvaluatedAt = now;
      alert.history.push({
        timestamp: now,
        status: 'resolved',
        value: alert.value,
        message: 'Alert manually marked as resolved by DevOps engineer.',
      });
    }

    await alert.save();
    return NextResponse.json({ success: true, alert });
  } catch (err: any) {
    console.error('Error updating alert status:', err);
    return NextResponse.json({ error: err.message || 'Failed to update alert' }, { status: 500 });
  }
}
