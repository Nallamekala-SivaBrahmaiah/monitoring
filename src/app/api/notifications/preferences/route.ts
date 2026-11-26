import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NotificationPreferences from '@/models/NotificationPreferences';
import DevOpsRecipient from '@/models/DevOpsRecipient';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'admin';

    let prefs: any = await NotificationPreferences.findOne({ userId }).lean();
    if (!prefs) {
      prefs = (await NotificationPreferences.create({
        userId,
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
        alertRecipients: ['nallasiva552@gmail.com'],
        phoneNumbers: [],
        smsEnabled: true,
        audioEnabled: true,
        pushEnabled: true,
        webhookEnabled: false,
        webhookUrl: '',
        smsOnlyP1: true,
        notifyOnResolved: true,
        reminderIntervalMinutes: 60,
        minSeverity: 'warning',
      })) as any;
    }

    // Sync in any recipients from DevOpsRecipient if alertRecipients is empty
    if (!prefs.alertRecipients || prefs.alertRecipients.length === 0) {
      const devOpsDocs = await DevOpsRecipient.find({ enabled: { $ne: false } }).lean();
      if (devOpsDocs.length > 0) {
        prefs.alertRecipients = devOpsDocs.map((d: any) => d.email).filter(Boolean);
      } else {
        prefs.alertRecipients = ['nallasiva552@gmail.com'];
      }
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
      const validEmails = body.alertRecipients
        .map((r: string) => r.trim().toLowerCase())
        .filter((r: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

      updates.alertRecipients = validEmails.length > 0 ? validEmails : ['nallasiva552@gmail.com'];

      // Synchronize with DevOpsRecipient collection
      for (const email of updates.alertRecipients) {
        await DevOpsRecipient.updateOne(
          { email },
          { $set: { email, enabled: true, role: 'DevOps Engineer' } },
          { upsert: true }
        );
      }
    }
    if (Array.isArray(body.phoneNumbers)) {
      updates.phoneNumbers = body.phoneNumbers
        .map((p: string) => p.trim())
        .filter((p: string) => p.length >= 8);
    }
    if (typeof body.smsEnabled === 'boolean') {
      updates.smsEnabled = body.smsEnabled;
    }
    if (typeof body.audioEnabled === 'boolean') {
      updates.audioEnabled = body.audioEnabled;
    }
    if (typeof body.pushEnabled === 'boolean') {
      updates.pushEnabled = body.pushEnabled;
    }
    if (typeof body.webhookEnabled === 'boolean') {
      updates.webhookEnabled = body.webhookEnabled;
    }
    if (typeof body.webhookUrl === 'string') {
      updates.webhookUrl = body.webhookUrl.trim();
    }
    if (typeof body.smsOnlyP1 === 'boolean') {
      updates.smsOnlyP1 = body.smsOnlyP1;
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

