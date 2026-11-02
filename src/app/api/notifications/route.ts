import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Notification from '@/models/Notification';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const userId = searchParams.get('userId') || 'admin';

    const query: any = { userId };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, unreadCount, totalCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ userId, read: false }),
      Notification.countDocuments({ userId }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n: any) => ({
        id: n._id.toString(),
        alertId: n.alertId,
        title: n.title,
        message: n.message,
        severity: n.severity,
        provider: n.provider,
        resourceName: n.resourceName,
        resourceId: n.resourceId,
        metricName: n.metricName,
        filesystem: n.filesystem,
        value: n.value,
        threshold: n.threshold,
        type: n.type,
        read: n.read,
        link: n.link || '/dashboard/alerts',
        emailDeliveryStatus: n.emailDeliveryStatus,
        emailDeliveryError: n.emailDeliveryError,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
      })),
      unreadCount,
      totalCount,
    });
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, markAll, read = true, userId = 'admin' } = body;

    if (markAll) {
      await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    } else if (id) {
      await Notification.updateOne({ _id: id, userId }, { $set: { read } });
    } else {
      return NextResponse.json({ error: 'id or markAll: true is required' }, { status: 400 });
    }

    const unreadCount = await Notification.countDocuments({ userId, read: false });

    return NextResponse.json({ success: true, unreadCount });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearRead = searchParams.get('clearRead') === 'true';
    const userId = searchParams.get('userId') || 'admin';

    if (id) {
      await Notification.deleteOne({ _id: id, userId });
    } else if (clearRead) {
      await Notification.deleteMany({ userId, read: true });
    } else {
      return NextResponse.json({ error: 'id or clearRead=true required' }, { status: 400 });
    }

    const unreadCount = await Notification.countDocuments({ userId, read: false });
    return NextResponse.json({ success: true, unreadCount });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}

