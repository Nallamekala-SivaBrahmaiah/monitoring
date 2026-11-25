import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ActivityEvent from '@/models/ActivityEvent';
import { logActivity } from '@/lib/activityCenter/activityService';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const platform = searchParams.get('platform');
    const moduleName = searchParams.get('module');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateStr = searchParams.get('date');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (platform && platform !== 'all') {
      query.platform = platform;
    }
    if (moduleName && moduleName !== 'all') {
      query.module = moduleName;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    if (dateStr) {
      const startOfDay = new Date(`${dateStr}T00:00:00.000+05:30`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);
      query.timestamp = { $gte: startOfDay, $lte: endOfDay };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { action: regex },
        { resourceName: regex },
        { resourceId: regex },
        { details: regex },
        { initiator: regex },
      ];
    }

    const [events, total] = await Promise.all([
      ActivityEvent.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      ActivityEvent.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = await logActivity(body);

    if (!event) {
      return NextResponse.json(
        { error: 'Tracking is disabled or duplicate event rejected.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
