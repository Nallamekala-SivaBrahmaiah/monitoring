import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DailyReport from '@/models/DailyReport';
import { compileDailyReport } from '@/lib/activityCenter/reportService';
import ActivityAuditLog from '@/models/ActivityAuditLog';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15')));

    const reports = await DailyReport.find()
      .sort({ reportDate: -1, generatedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportDate, tomorrowPlan, notes } = body;

    const report = await compileDailyReport(reportDate, { tomorrowPlan, notes });

    await ActivityAuditLog.create({
      action: 'DAILY_REPORT_GENERATED',
      actor: 'DevOps Engineer',
      targetType: 'DailyReport',
      targetId: report.reportId,
      details: `Generated daily report for date ${report.reportDate}. Activities compiled: ${report.summary?.totalActivities || 0}`,
    });

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
