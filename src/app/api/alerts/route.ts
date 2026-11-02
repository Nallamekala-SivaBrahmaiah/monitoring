import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Alert from '@/models/Alert';
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
    const { id, status } = body;

    if (!id || !['acknowledged', 'resolved'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid id and status ("acknowledged" or "resolved") are required' },
        { status: 400 }
      );
    }

    const alert = await Alert.findById(id);
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const now = new Date();
    alert.status = status;
    alert.lastEvaluatedAt = now;

    if (status === 'resolved') {
      alert.resolvedAt = now;
      alert.history.push({
        timestamp: now,
        status: 'resolved',
        value: alert.value,
        message: `Alert manually marked as resolved by user.`,
      });
    } else if (status === 'acknowledged') {
      alert.acknowledgedAt = now;
      alert.history.push({
        timestamp: now,
        status: 'acknowledged',
        value: alert.value,
        message: `Alert acknowledged by user.`,
      });
    }

    await alert.save();

    return NextResponse.json({
      success: true,
      alert: {
        id: alert._id.toString(),
        status: alert.status,
        resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
        acknowledgedAt: alert.acknowledgedAt ? alert.acknowledgedAt.toISOString() : null,
      },
    });
  } catch (err: any) {
    console.error('Error updating alert status:', err);
    return NextResponse.json({ error: err.message || 'Failed to update alert' }, { status: 500 });
  }
}
