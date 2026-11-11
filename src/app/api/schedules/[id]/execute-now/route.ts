import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ServerSchedule from '@/models/ServerSchedule';
import { executeScheduleAction } from '@/lib/scheduling/serverSchedulerEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const action = body.action as 'START' | 'STOP';
    if (!action || (action !== 'START' && action !== 'STOP')) {
      return NextResponse.json(
        { success: false, error: 'Valid action (START or STOP) is required.' },
        { status: 400 }
      );
    }

    const schedule = await ServerSchedule.findById(id);
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    const result = await executeScheduleAction({
      schedule,
      action,
      triggerType: 'MANUAL',
      scheduledTime: new Date(),
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      previousState: result.previousState,
      newState: result.newState,
      error: result.error,
      schedule,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

