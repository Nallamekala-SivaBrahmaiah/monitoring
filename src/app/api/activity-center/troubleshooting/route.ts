import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TroubleshootingRecord from '@/models/TroubleshootingRecord';
import { logActivity } from '@/lib/activityCenter/activityService';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');

    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (platform && platform !== 'all') query.platform = platform;

    const records = await TroubleshootingRecord.find(query)
      .sort({ startedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, records });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const issueId =
      body.issueId ||
      `ts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const doc = await TroubleshootingRecord.create({
      ...body,
      issueId,
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
    });

    // Auto-log activity event
    await logActivity({
      platform: body.platform || 'onprem',
      module: 'troubleshooting',
      resourceType: 'Incident / Task',
      resourceId: issueId,
      resourceName: body.title,
      action: `Troubleshot: ${body.title}`,
      status: body.status === 'Resolved' ? 'success' : body.status === 'Unresolved' ? 'failed' : 'in_progress',
      details: `Resource: ${body.serverOrResource}. Error: ${body.errorMessage}. Fix: ${body.resolutionSteps || 'Under investigation'}`,
      source: 'Manual User Note',
    });

    return NextResponse.json({ success: true, record: doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
