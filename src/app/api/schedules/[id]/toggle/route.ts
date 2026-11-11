import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ServerSchedule from '@/models/ServerSchedule';
import { calculateNextAction } from '@/lib/scheduling/serverSchedulerEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const schedule = await ServerSchedule.findById(id);
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    if (body.field === 'enabled') {
      schedule.enabled = body.value !== undefined ? Boolean(body.value) : !schedule.enabled;
    } else if (body.field === 'isPaused') {
      schedule.isPaused = body.value !== undefined ? Boolean(body.value) : !schedule.isPaused;
    } else {
      // Toggle enabled by default
      schedule.enabled = !schedule.enabled;
    }

    const { nextAction, nextActionAt } = calculateNextAction(schedule, new Date());
    schedule.nextAction = nextAction;
    schedule.nextActionAt = nextActionAt;

    await schedule.save();

    return NextResponse.json({
      success: true,
      schedule,
      message: `Schedule status updated.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

