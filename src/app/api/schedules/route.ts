import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ServerSchedule from '@/models/ServerSchedule';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import { calculateNextAction } from '@/lib/scheduling/serverSchedulerEngine';

export async function GET() {
  try {
    await connectToDatabase();

    const schedules = await ServerSchedule.find({}).sort({ createdAt: -1 });

    const now = new Date();
    let nextUpcoming: { label: string; date: Date } | null = null;

    // Recalculate nextAction dynamically for active schedules
    const enriched = await Promise.all(
      schedules.map(async (sched) => {
        // Also check if current cloud state has changed
        let liveState = sched.currentState;
        try {
          const cr = await CloudResource.findOne({
            $or: [
              { resourceId: sched.resourceId },
              { name: sched.resourceId },
              { name: sched.serverName },
            ],
          }).lean();

          if (cr) {
            const anyCr = cr as any;
            const isRun =
              (anyCr.status || '').toLowerCase().includes('run') ||
              (anyCr.metadata?.powerState || '').toLowerCase().includes('run') ||
              (anyCr.tags?.powerState || '').toLowerCase().includes('run');
            liveState = isRun ? 'Running' : 'Stopped';
          }
        } catch {}

        const { nextAction, nextActionAt } = calculateNextAction(sched, now);
        sched.currentState = liveState;
        sched.nextAction = nextAction;
        sched.nextActionAt = nextActionAt;

        if (nextActionAt && nextActionAt > now) {
          if (!nextUpcoming || nextActionAt < nextUpcoming.date) {
            const diffMins = Math.round((nextActionAt.getTime() - now.getTime()) / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            const timeDiffStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            nextUpcoming = {
              label: `${nextAction} ${sched.serverName} in ${timeDiffStr}`,
              date: nextActionAt,
            };
          }
        }

        return sched;
      })
    );

    const totalScheduledServers = enriched.length;
    const currentlyRunning = enriched.filter((s) => s.currentState === 'Running').length;
    const currentlyStopped = enriched.filter((s) => s.currentState === 'Stopped').length;
    const schedulingFailures = enriched.reduce((acc, s) => acc + (s.failureCount || 0), 0);

    return NextResponse.json({
      success: true,
      schedules: enriched,
      summary: {
        totalScheduledServers,
        currentlyRunning,
        currentlyStopped,
        nextScheduledAction: (nextUpcoming as any)?.label || 'No upcoming action',
        schedulingFailures,
      },
    });
  } catch (err: any) {
    console.error('Error fetching schedules:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      name,
      provider,
      resourceId,
      serverName,
      region = 'ap-southeast-2',
      startTime = '09:00',
      stopTime = '19:00',
      timezone = 'Asia/Kolkata',
      daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      enabled = true,
      startDate = null,
      endDate = null,
    } = body;

    if (!name || !provider || !resourceId || !serverName) {
      return NextResponse.json(
        { success: false, error: 'Name, provider, resourceId, and serverName are required.' },
        { status: 400 }
      );
    }

    // Resolve canonical resource identity from CloudResource
    let canonicalResourceId = resourceId.trim();
    let canonicalRegion = region;
    let canonicalProvider: 'aws' | 'azure' = provider === 'aws' ? 'aws' : 'azure';
    let canonicalServerName = serverName.trim();
    let currentState: 'Running' | 'Stopped' | 'Unknown' = 'Unknown';

    try {
      const cr = await CloudResource.findOne({
        $or: [
          { resourceId: canonicalResourceId },
          { name: canonicalResourceId },
          { name: canonicalServerName },
        ],
      }).lean();

      if (cr) {
        canonicalResourceId = cr.resourceId || canonicalResourceId;
        canonicalRegion = cr.region || canonicalRegion;
        canonicalProvider = cr.provider === 'aws' ? 'aws' : 'azure';
        if (cr.name) canonicalServerName = cr.name;

        const isRun =
          (cr.status || '').toLowerCase().includes('run') ||
          ((cr as any).metadata?.powerState || '').toLowerCase().includes('run');
        currentState = isRun ? 'Running' : 'Stopped';
      }
    } catch {}

    // Deduplication check: prevent duplicate active schedule for the same resource
    const existingSched = await ServerSchedule.findOne({
      provider: canonicalProvider,
      resourceId: canonicalResourceId,
    });

    if (existingSched) {
      return NextResponse.json(
        {
          success: false,
          error: `An automated schedule already exists for "${canonicalServerName}" (${canonicalResourceId}). Please edit the existing schedule instead.`,
        },
        { status: 409 }
      );
    }

    const newSchedule = new ServerSchedule({
      name: name.trim(),
      provider: canonicalProvider,
      resourceId: canonicalResourceId,
      serverName: canonicalServerName,
      region: canonicalRegion,
      startTime,
      stopTime,
      timezone,
      daysOfWeek,
      enabled,
      isPaused: false,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      currentState,
      failureCount: 0,
    });

    const { nextAction, nextActionAt } = calculateNextAction(newSchedule, new Date());
    newSchedule.nextAction = nextAction;
    newSchedule.nextActionAt = nextActionAt;

    await newSchedule.save();

    return NextResponse.json({
      success: true,
      schedule: newSchedule,
      message: `Schedule "${name}" created successfully.`,
    });
  } catch (err: any) {
    console.error('Error creating schedule:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
