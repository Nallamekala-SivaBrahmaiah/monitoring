import { NextRequest, NextResponse } from 'next/server';
import { getOverviewStats, getOrCreateSettings } from '@/lib/activityCenter/activityService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;

    const [stats, settings] = await Promise.all([
      getOverviewStats(date),
      getOrCreateSettings(),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      settings: {
        trackingEnabled: settings.trackingEnabled,
        autoReportEnabled: settings.autoReportEnabled,
        deliveryMode: settings.deliveryMode,
        reportSendTime: settings.reportSendTime,
        timezone: settings.timezone,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
