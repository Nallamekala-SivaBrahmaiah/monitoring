import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NotificationPreferences from '@/models/NotificationPreferences';
import DevOpsRecipient from '@/models/DevOpsRecipient';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * GET /api/incident-dispatcher/config
 * Retrieves integration status between normal Alert & Notifications and Incident Dispatcher
 */
export async function GET() {
  try {
    await connectToDatabase();
    let prefs = await NotificationPreferences.findOne({ userId: 'admin' }).lean() as any;

    if (!prefs) {
      prefs = await NotificationPreferences.create({
        userId: 'admin',
        incidentDispatcherConnected: false,
      });
    }

    const enabledDevOpsCount = await DevOpsRecipient.countDocuments({ enabled: true });

    return NextResponse.json(
      {
        success: true,
        connected: prefs.incidentDispatcherConnected ?? false,
        updatedAt: prefs.updatedAt || new Date(),
        enabledDevOpsCount,
        alertRecipients: prefs.alertRecipients || [],
        ignoredServers: prefs.ignoredServers || ['vm01siva-mon'],
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Failed to get incident dispatcher config:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve configuration' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/incident-dispatcher/config
 * Toggles or updates the ON/OFF connection state
 * Body: { connected: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const connected = Boolean(body.connected);

    const updated = await NotificationPreferences.findOneAndUpdate(
      { userId: 'admin' },
      { $set: { incidentDispatcherConnected: connected } },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json(
      {
        success: true,
        connected: updated.incidentDispatcherConnected,
        message: connected
          ? 'Incident Dispatcher module CONNECTED to Alerts & Notifications pipeline.'
          : 'Incident Dispatcher module DISCONNECTED. Alerts operating in standard mode.',
        updatedAt: updated.updatedAt,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Failed to update incident dispatcher config:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update configuration' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
