import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DailyReport from '@/models/DailyReport';
import { sendDailyReportEmail } from '@/lib/activityCenter/reportService';
import ActivityAuditLog from '@/models/ActivityAuditLog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const report = await DailyReport.findOne({
      $or: [{ reportId: id }, { _id: id }],
    }).lean();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action || 'send';

    if (action === 'send') {
      const result = await sendDailyReportEmail(id);

      await ActivityAuditLog.create({
        action: 'DAILY_REPORT_SENT',
        actor: 'DevOps Engineer',
        targetType: 'DailyReport',
        targetId: id,
        details: `Dispatched daily report via email to ${result.recipientsCount} recipient(s). SMTP Message ID: ${result.messageId}`,
      });

      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
