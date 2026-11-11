import connectToDatabase from '@/lib/mongodb';
import ServerSchedule, { IServerSchedule } from '@/models/ServerSchedule';
import ScheduleExecutionHistory from '@/models/ScheduleExecutionHistory';
import Notification from '@/models/Notification';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import { executeUnifiedPowerAction, PowerAction } from '@/lib/cloudPowerService';

/**
 * Helper to compute local time components in any IANA timezone
 */
export function getLocalTimeInTimezone(date: Date, timezone: string = 'Asia/Kolkata') {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    parts.forEach((p) => {
      partMap[p.type] = p.value;
    });

    const hours = parseInt(partMap.hour || '0', 10);
    const minutes = parseInt(partMap.minute || '0', 10);
    const weekday = partMap.weekday || 'Mon'; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;

    return {
      weekday,
      hours,
      minutes,
      minuteOfDay: hours * 60 + minutes,
      dateStr,
    };
  } catch (err) {
    // Fallback to UTC if timezone is invalid
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      weekday: days[date.getUTCDay()],
      hours,
      minutes,
      minuteOfDay: hours * 60 + minutes,
      dateStr: date.toISOString().split('T')[0],
    };
  }
}

/**
 * Calculates next scheduled action and timestamp for a given schedule
 */
export function calculateNextAction(schedule: IServerSchedule, now: Date = new Date()): {
  nextAction: 'START' | 'STOP' | 'NONE';
  nextActionAt: Date | null;
} {
  if (!schedule.enabled || schedule.isPaused) {
    return { nextAction: 'NONE', nextActionAt: null };
  }

  const [startH, startM] = (schedule.startTime || '09:00').split(':').map(Number);
  const [stopH, stopM] = (schedule.stopTime || '19:00').split(':').map(Number);
  const startMinute = startH * 60 + startM;
  const stopMinute = stopH * 60 + stopM;

  const local = getLocalTimeInTimezone(now, schedule.timezone);
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentDayIndex = dayOrder.indexOf(local.weekday);

  let earliestAction: 'START' | 'STOP' = 'NONE' as any;
  let earliestTime: Date | null = null;

  // Scan upcoming 7 days to find the mathematically earliest scheduled event (START or STOP)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = dayOrder[(currentDayIndex + dayOffset) % 7];
    const isDayActive = (schedule.daysOfWeek || []).includes(day);
    if (!isDayActive) continue;

    // Check Start event
    const startMinsOffset = dayOffset * 1440 + startMinute - local.minuteOfDay;
    if (startMinsOffset > 0) {
      const candidateTime = new Date(now.getTime() + startMinsOffset * 60000);
      if (!earliestTime || candidateTime < earliestTime) {
        earliestTime = candidateTime;
        earliestAction = 'START';
      }
    }

    // Check Stop event
    const stopMinsOffset = dayOffset * 1440 + stopMinute - local.minuteOfDay;
    if (stopMinsOffset > 0) {
      const candidateTime = new Date(now.getTime() + stopMinsOffset * 60000);
      if (!earliestTime || candidateTime < earliestTime) {
        earliestTime = candidateTime;
        earliestAction = 'STOP';
      }
    }

    if (earliestTime && dayOffset > 0) {
      break;
    }
  }

  if (earliestTime) {
    return { nextAction: earliestAction, nextActionAt: earliestTime };
  }

  return { nextAction: 'NONE', nextActionAt: null };
}

/**
 * Execute real cloud action for a schedule (either automated or manual)
 */
export async function executeScheduleAction({
  schedule,
  action,
  triggerType = 'SCHEDULED',
  scheduledTime = new Date(),
}: {
  schedule: IServerSchedule;
  action: 'START' | 'STOP';
  triggerType?: 'SCHEDULED' | 'MANUAL';
  scheduledTime?: Date;
}): Promise<{
  success: boolean;
  message: string;
  previousState: string;
  newState: string;
  error?: string;
}> {
  const startTimeMs = Date.now();
  let previousState = schedule.currentState || 'Unknown';
  let newState = action === 'START' ? 'Running' : 'Stopped';

  // 1. Detect latest real cloud state from MongoDB CloudResource or Server
  try {
    const cr = await CloudResource.findOne({
      $or: [
        { resourceId: schedule.resourceId },
        { name: schedule.resourceId },
        { name: schedule.serverName },
      ],
    }).lean();

    if (cr) {
      const anyCr = cr as any;
      const isRun =
        (anyCr.status || '').toLowerCase().includes('run') ||
        (anyCr.metadata?.powerState || '').toLowerCase().includes('run') ||
        (anyCr.tags?.powerState || '').toLowerCase().includes('run');
      previousState = isRun ? 'Running' : 'Stopped';
    } else {
      const srv = await Server.findOne({
        $or: [
          { name: schedule.serverName },
          { host: schedule.resourceId },
        ],
      }).lean();
      if (srv && srv.status) {
        previousState = srv.status === 'Online' ? 'Running' : 'Stopped';
      }
    }
  } catch (err) {
    console.warn(`[ScheduleEngine] State lookup note for ${schedule.serverName}:`, err);
  }

  // 2. Perform actual AWS or Azure power dispatch
  let isSuccess = false;
  let errorMsg: string | null = null;

  try {
    console.log(
      `[ScheduleEngine] ⚡ Executing ${triggerType} ${action} on ${schedule.provider.toUpperCase()} resource: ${schedule.serverName} (${schedule.resourceId})`
    );

    const powerAction: PowerAction = action === 'START' ? 'start' : 'stop';
    const result = await executeUnifiedPowerAction(schedule.resourceId, powerAction);

    isSuccess = result.success;
    newState = action === 'START' ? 'Running' : 'Stopped';
  } catch (err: any) {
    isSuccess = false;
    errorMsg = err.message || 'Cloud power execution failed';
    newState = previousState;
    console.error(
      `[ScheduleEngine] ❌ Cloud execution error on ${schedule.serverName}:`,
      errorMsg
    );
  }

  const durationMs = Date.now() - startTimeMs;

  // 3. Record Execution History in MongoDB
  try {
    await ScheduleExecutionHistory.create({
      scheduleId: schedule._id,
      scheduleName: schedule.name,
      serverName: schedule.serverName,
      resourceId: schedule.resourceId,
      provider: schedule.provider,
      region: schedule.region,
      action,
      triggerType,
      scheduledExecutionTime: scheduledTime,
      actualExecutionTime: new Date(),
      previousState,
      newState,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      errorDetails: errorMsg,
      durationMs,
    });
  } catch (histErr) {
    console.error('[ScheduleEngine] Failed to save execution history:', histErr);
  }

  // 4. Update the Schedule Document
  const { nextAction, nextActionAt } = calculateNextAction(schedule, new Date());
  schedule.currentState = newState as 'Running' | 'Stopped';
  schedule.lastAction = action;
  schedule.lastActionAt = new Date();
  schedule.lastActionStatus = isSuccess ? 'Success' : 'Failed';
  schedule.nextAction = nextAction;
  schedule.nextActionAt = nextActionAt;

  if (isSuccess) {
    schedule.failureCount = 0;
    schedule.lastError = null;
  } else {
    schedule.failureCount = (schedule.failureCount || 0) + 1;
    schedule.lastError = errorMsg;
    // Clear keys so the scheduler can safely retry
    schedule.lastActionKey = null;
    if (action === 'START') {
      schedule.lastStartKey = null;
    } else {
      schedule.lastStopKey = null;
    }
  }

  await schedule.save();

  // 5. Create In-App Notification
  try {
    await Notification.create({
      userId: 'admin',
      title: `Server ${action === 'START' ? 'Started' : 'Stopped'}: ${schedule.serverName}`,
      message: `${triggerType === 'MANUAL' ? 'Manual trigger' : 'Automated schedule'} executed ${action} for ${schedule.serverName} (${schedule.resourceId}) in ${schedule.region}. Status: ${isSuccess ? 'Success' : 'Failed'}${errorMsg ? ` - ${errorMsg}` : ''}.`,
      severity: isSuccess ? 'info' : 'critical',
      provider: schedule.provider,
      resourceName: schedule.serverName,
      resourceId: schedule.resourceId,
      metricName: 'schedule_automation',
      value: 0,
      threshold: 0,
      type: 'system',
      read: false,
    });
  } catch (notifErr) {
    console.warn('[ScheduleEngine] Notification creation note:', notifErr);
  }

  return {
    success: isSuccess,
    message: isSuccess
      ? `Server ${schedule.serverName} ${action === 'START' ? 'started' : 'stopped'} successfully.`
      : `Failed to ${action.toLowerCase()} server ${schedule.serverName}: ${errorMsg}`,
    previousState,
    newState,
    error: errorMsg || undefined,
  };
}

/**
 * Main Scheduler Cycle Runner:
 * Evaluates all enabled schedules across AWS & Azure and triggers due actions.
 */
export async function runServerSchedulingCycle(): Promise<{
  evaluated: number;
  executed: number;
  failures: number;
}> {
  await connectToDatabase();

  const now = new Date();
  // Fetch active, unpaused schedules
  const allSchedules = await ServerSchedule.find({});
  const schedules = (allSchedules as unknown as IServerSchedule[]).filter(
    (s: any) => s.enabled !== false && s.isPaused !== true
  );
  console.log(`[ScheduleEngine:RUN] Found ${schedules.length} active schedules in database.`);

  let executedCount = 0;
  let failureCount = 0;

  for (const schedule of schedules) {
    try {
      // 1. Date window validity check (optional startDate & endDate)
      if (schedule.startDate && now < new Date(schedule.startDate)) {
        continue;
      }
      if (schedule.endDate && now > new Date(schedule.endDate)) {
        continue;
      }

      // 2. Local time evaluation in target timezone
      const local = getLocalTimeInTimezone(now, schedule.timezone);
      const isDayActive = (schedule.daysOfWeek || []).includes(local.weekday);

      const [startH, startM] = (schedule.startTime || '09:00').split(':').map(Number);
      const [stopH, stopM] = (schedule.stopTime || '19:00').split(':').map(Number);
      const startMinute = startH * 60 + startM;
      const stopMinute = stopH * 60 + stopM;

      console.log(
        `[ScheduleEngine:TICK] Sched: "${schedule.serverName}" (${schedule.provider}) ` +
        `enabled=${schedule.enabled} paused=${schedule.isPaused} ` +
        `Local: ${local.weekday} ${local.dateStr} ${String(local.hours).padStart(2, '0')}:${String(local.minutes).padStart(2, '0')} (min=${local.minuteOfDay}) ` +
        `Configured: start=${schedule.startTime} (min=${startMinute}) stop=${schedule.stopTime} (min=${stopMinute}) activeDay=${isDayActive} ` +
        `lastActionKey="${schedule.lastActionKey}" currentState="${schedule.currentState}"`
      );

      let actionToRun: 'START' | 'STOP' | null = null;
      let actionKey: string = '';

      // 1. Check for START action:
      // Active day + current minute within [startMinute, startMinute + 1]
      // AND this specific start action has not already run today
      const startKey = `${local.dateStr}:START:${schedule.startTime}`;
      if (
        isDayActive &&
        local.minuteOfDay >= startMinute &&
        local.minuteOfDay <= startMinute + 1 &&
        (schedule as any).lastStartKey !== startKey
      ) {
        actionToRun = 'START';
        actionKey = startKey;
      }

      // 2. Check for STOP action:
      // Active day + current minute within [stopMinute, stopMinute + 1]
      // AND this specific stop action has not already run today
      const stopKey = `${local.dateStr}:STOP:${schedule.stopTime}`;
      if (
        !actionToRun &&
        isDayActive &&
        local.minuteOfDay >= stopMinute &&
        local.minuteOfDay <= stopMinute + 1 &&
        (schedule as any).lastStopKey !== stopKey
      ) {
        actionToRun = 'STOP';
        actionKey = stopKey;
      }

      // 3. Weekend / Inactive Day Auto-Stop Safety:
      // If server is Running on an inactive day (e.g. Sat/Sun), ensure it is kept stopped
      const weekendKey = `${local.dateStr}:WEEKEND_STOP`;
      if (
        !actionToRun &&
        !isDayActive &&
        schedule.currentState === 'Running' &&
        (schedule as any).lastStopKey !== weekendKey
      ) {
        actionToRun = 'STOP';
        actionKey = weekendKey;
      }

      if (actionToRun && actionKey) {
        const updateFields: any = {
          lastActionKey: actionKey,
          lastActionStatus: 'Pending',
        };
        const queryFilter: any = { _id: schedule._id };

        if (actionToRun === 'START') {
          queryFilter.lastStartKey = { $ne: actionKey };
          updateFields.lastStartKey = actionKey;
        } else {
          queryFilter.lastStopKey = { $ne: actionKey };
          updateFields.lastStopKey = actionKey;
        }

        // Atomic claim to avoid concurrent execution from multiple instances
        const claimed = await ServerSchedule.findOneAndUpdate(
          queryFilter,
          { $set: updateFields },
          { new: true }
        );

        if (!claimed) {
          // Already claimed by another worker tick
          continue;
        }

        console.log(
          `[ScheduleEngine] ⏰ Triggering scheduled ${actionToRun} for ${schedule.serverName} (${schedule.resourceId})`
        );

        const execResult = await executeScheduleAction({
          schedule: claimed,
          action: actionToRun,
          triggerType: 'SCHEDULED',
          scheduledTime: now,
        });

        executedCount++;
        if (!execResult.success) {
          failureCount++;
        }
      }
    } catch (schedErr: any) {
      console.error(`[ScheduleEngine] Error evaluating schedule ${schedule.name}:`, schedErr.message);
      failureCount++;
    }
  }

  return {
    evaluated: schedules.length,
    executed: executedCount,
    failures: failureCount,
  };
}
