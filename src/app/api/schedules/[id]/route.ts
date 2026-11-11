import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ServerSchedule from '@/models/ServerSchedule';
import { calculateNextAction } from '@/lib/scheduling/serverSchedulerEngine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const schedule = await ServerSchedule.findById(id);
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    const { nextAction, nextActionAt } = calculateNextAction(schedule, new Date());
    schedule.nextAction = nextAction;
    schedule.nextActionAt = nextActionAt;

    return NextResponse.json({ success: true, schedule });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    if (body.name !== undefined) schedule.name = body.name;
    if (body.startTime !== undefined) schedule.startTime = body.startTime;
    if (body.stopTime !== undefined) schedule.stopTime = body.stopTime;
    if (body.timezone !== undefined) schedule.timezone = body.timezone;
    if (body.daysOfWeek !== undefined) schedule.daysOfWeek = body.daysOfWeek;
    if (body.enabled !== undefined) schedule.enabled = body.enabled;
    if (body.isPaused !== undefined) schedule.isPaused = body.isPaused;
    if (body.startDate !== undefined) schedule.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) schedule.endDate = body.endDate ? new Date(body.endDate) : null;

    if (body.startTime !== undefined || body.stopTime !== undefined || body.daysOfWeek !== undefined) {
      schedule.lastActionKey = null;
      schedule.lastStartKey = null;
      schedule.lastStopKey = null;
      schedule.failureCount = 0;
      schedule.lastError = null;
    }

    const { nextAction, nextActionAt } = calculateNextAction(schedule, new Date());
    schedule.nextAction = nextAction;
    schedule.nextActionAt = nextActionAt;

    await schedule.save();

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Schedule updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const deleted = await ServerSchedule.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Schedule "${deleted.name}" deleted successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

