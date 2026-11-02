import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AlertDelivery from '@/models/AlertDelivery';
import Alert from '@/models/Alert';

/**
 * GET /api/notifications/delivery-history
 * Returns real alert delivery history.
 * Never seeds fake or mock data.
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Purge any legacy dummy seed records
    await AlertDelivery.deleteMany({
      serverName: { $in: ['vm01siva', 'ec2-web', 'webserver'] },
    });

    let dateLimit = new Date();
    if (range === '24h') {
      dateLimit.setDate(dateLimit.getDate() - 1);
    } else if (range === '30d') {
      dateLimit.setDate(dateLimit.getDate() - 30);
    } else {
      // 7d default
      dateLimit.setDate(dateLimit.getDate() - 7);
    }

    // Query real delivery records from database
    const items = await AlertDelivery.find({
      deliveredAt: { $gte: dateLimit },
      serverName: { $nin: ['vm01siva', 'ec2-web', 'webserver'] },
      alertId: { $ne: 'test-alert-id' },
    })
      .sort({ deliveredAt: -1 })
      .lean();

    const existingKeys = new Set(
      items.map((i: any) => `${i.resourceId}:${(i.metricType || '').toUpperCase()}:${new Date(i.deliveredAt).getTime()}`)
    );

    // Also include any real Alert records with emailSentAt not yet in AlertDelivery
    const realAlerts = await Alert.find({
      emailSentAt: { $ne: null, $gte: dateLimit },
      resourceName: { $nin: ['test-vm-alerts', 'vm01siva', 'ec2-web', 'webserver'] },
    })
      .sort({ emailSentAt: -1 })
      .limit(20)
      .lean();

    const devOpsDocs = await (await import('@/models/DevOpsRecipient')).default.find({ enabled: { $ne: false } }).lean();
    const activeRecipients = devOpsDocs.map((d: any) => d.email).filter(Boolean);

    for (const a of (realAlerts as any[])) {
      const deliveredTime = new Date(a.emailSentAt || a.triggeredAt || a.createdAt).getTime();
      const metricType = (a.metricName || 'CPU').toUpperCase();
      const key = `${a.resourceId}:${metricType}:${deliveredTime}`;

      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        items.push({
          _id: a._id,
          metricType,
          metricValue: a.value,
          threshold: a.threshold || 70,
          severity: (a.severity || 'warning').toLowerCase(),
          serverName: a.resourceName,
          provider: (a.provider || 'azure').toLowerCase(),
          resourceId: a.resourceId,
          recipientsCount: activeRecipients.length || 1,
          recipients: activeRecipients,
          deliveryStatus: 'Delivered',
          deliveredAt: new Date(deliveredTime),
          readCount: 0,
          unreadCount: activeRecipients.length || 1,
          openedAt: null,
          openedBy: null,
          link: a.resourceType === 'Server' ? '/dashboard/servers' : '/dashboard/azure-vms',
        } as any);
      }
    }

    // Sort combined list by delivery timestamp descending
    items.sort((a: any, b: any) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime());

    const formatted = items.map((item: any) => ({
      id: item._id.toString(),
      metricType: item.metricType,
      metricValue: item.metricValue,
      threshold: item.threshold,
      severity: item.severity,
      serverName: item.serverName,
      provider: item.provider,
      resourceId: item.resourceId,
      recipientsCount: item.recipientsCount || (item.recipients ? item.recipients.length : 1),
      recipients: item.recipients || activeRecipients,
      deliveryStatus: item.deliveryStatus || 'Delivered',
      deliveredAt: item.deliveredAt,
      readCount: item.readCount || 0,
      unreadCount: item.unreadCount || 0,
      openedAt: item.openedAt || null,
      openedBy: item.openedBy || null,
      link: item.link || '/dashboard/alerts',
    }));

    return NextResponse.json({
      success: true,
      history: formatted,
      count: formatted.length,
    });
  } catch (err: any) {
    console.error('Error fetching alert delivery history:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch delivery history' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/delivery-history
 * Clear alert delivery logs
 */
export async function DELETE() {
  try {
    await connectToDatabase();
    await AlertDelivery.deleteMany({});
    return NextResponse.json({ success: true, message: 'Alert delivery history cleared.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
