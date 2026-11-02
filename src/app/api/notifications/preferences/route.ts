import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NotificationPreferences from '@/models/NotificationPreferences';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'admin';

    let prefs = await NotificationPreferences.findOne({ userId }).lean();
    if (!prefs) {
      prefs = (await NotificationPreferences.create({
        userId,
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
        alertRecipients: ['nallasiva552@gmail.com'],
        notifyOnResolved: true,
        reminderIntervalMinutes: 60,
        minSeverity: 'warning',
      })) as any;
    }

    return NextResponse.json(prefs);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const userId = body.userId || 'admin';

    const updates: any = {};
    if (typeof body.emailNotificationsEnabled === 'boolean') {
      updates.emailNotificationsEnabled = body.emailNotificationsEnabled;
    }
    if (typeof body.inAppNotificationsEnabled === 'boolean') {
      updates.inAppNotificationsEnabled = body.inAppNotificationsEnabled;
    }
    if (Array.isArray(body.alertRecipients)) {
      updates.alertRecipients = body.alertRecipients
        .map((r: string) => r.trim())
        .filter((r: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
    }
    if (typeof body.notifyOnResolved === 'boolean') {
      updates.notifyOnResolved = body.notifyOnResolved;
    }
    if (typeof body.reminderIntervalMinutes === 'number') {
      updates.reminderIntervalMinutes = Math.max(5, body.reminderIntervalMinutes);
    }
    if (['warning', 'critical', 'info'].includes(body.minSeverity)) {
      updates.minSeverity = body.minSeverity;
    }

    const updated = await NotificationPreferences.findOneAndUpdate(
      { userId },
      { $set: updates },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

