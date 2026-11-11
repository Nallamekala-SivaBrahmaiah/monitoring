import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ScheduleExecutionHistory from '@/models/ScheduleExecutionHistory';
import ServerSchedule from '@/models/ServerSchedule';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const provider = searchParams.get('provider');
    const server = searchParams.get('server');
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const query: any = {};
    if (provider && provider !== 'all') {
      query.provider = provider;
    }
    if (server) {
      query.$or = [
        { serverName: { $regex: server, $options: 'i' } },
        { resourceId: { $regex: server, $options: 'i' } },
      ];
    }
    if (action && action !== 'all') {
      query.action = action.toUpperCase();
    }
    if (status && status !== 'all') {
      query.status = status.toUpperCase();
    }

    const total = await ScheduleExecutionHistory.countDocuments(query);
    const history = await ScheduleExecutionHistory.find(query)
      .sort({ actualExecutionTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('scheduleId');
    const resetFailures = searchParams.get('resetFailures') !== 'false';

    const query: any = {};
    if (scheduleId) {
      query.scheduleId = scheduleId;
    }

    const result = await ScheduleExecutionHistory.deleteMany(query);

    // Also reset failure count on schedules when clearing logs so KPIs update cleanly
    if (!scheduleId || resetFailures) {
      await ServerSchedule.updateMany(
        scheduleId ? { _id: scheduleId } : {},
        { $set: { failureCount: 0, lastError: null } }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully cleared ${result.deletedCount} execution history and audit log record(s).`,
    });
  } catch (err: any) {
    console.error('Failed to clear execution history:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to clear execution history' },
      { status: 500 }
    );
  }
}

