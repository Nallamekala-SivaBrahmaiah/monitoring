import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ServerSchedule from '@/models/ServerSchedule';
import {
  runDedicatedServerSchedulingCycle,
  startDedicatedServerScheduler,
  getServerSchedulerStatus,
} from '@/lib/monitoring/scheduler';
import { getLocalTimeInTimezone } from '@/lib/scheduling/serverSchedulerEngine';

export async function GET() {
  try {
    await connectToDatabase();
    startDedicatedServerScheduler();

    const status = getServerSchedulerStatus();
    const rawSchedules = await ServerSchedule.find({}).lean();
    const schedules = (rawSchedules as any[]).filter(
      (s) => s.enabled !== false && s.isPaused !== true
    );

    const now = new Date();
    const evaluatedSchedules = schedules.map((s: any) => {
      const local = getLocalTimeInTimezone(now, s.timezone || 'Asia/Kolkata');
      const isDayActive = (s.daysOfWeek || []).includes(local.weekday);
      const [startH, startM] = (s.startTime || '09:00').split(':').map(Number);
      const [stopH, stopM] = (s.stopTime || '19:00').split(':').map(Number);
      const startMinute = startH * 60 + startM;
      const stopMinute = stopH * 60 + stopM;

      return {
        id: s._id,
        name: s.name,
        serverName: s.serverName,
        resourceId: s.resourceId,
        provider: s.provider,
        currentState: s.currentState,
        startTime: s.startTime,
        stopTime: s.stopTime,
        timezone: s.timezone,
        daysOfWeek: s.daysOfWeek,
        localWeekday: local.weekday,
        localTime: `${String(local.hours).padStart(2, '0')}:${String(local.minutes).padStart(2, '0')}`,
        localMinuteOfDay: local.minuteOfDay,
        startMinute,
        stopMinute,
        isDayActive,
        isStartDue: isDayActive && local.minuteOfDay >= startMinute && local.minuteOfDay <= startMinute + 2,
        isStopDue: isDayActive && local.minuteOfDay >= stopMinute && local.minuteOfDay <= stopMinute + 2,
        lastAction: s.lastAction,
        lastActionKey: s.lastActionKey,
        nextAction: s.nextAction,
        nextActionAt: s.nextActionAt,
      };
    });

    return NextResponse.json({
      success: true,
      scheduler: status,
      currentTimeUtc: now.toISOString(),
      currentTimeIst: new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(now),
      activeSchedulesCount: schedules.length,
      schedules: evaluatedSchedules,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Evaluation status failed' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await connectToDatabase();
    startDedicatedServerScheduler();

    const result = await runDedicatedServerSchedulingCycle();

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Manual evaluation trigger failed' },
      { status: 500 }
    );
  }
}
