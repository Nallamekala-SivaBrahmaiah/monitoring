import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveWorkSession,
  startWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  endWorkSession,
} from '@/lib/activityCenter/activityService';
import ActivityAuditLog from '@/models/ActivityAuditLog';

export async function GET() {
  try {
    const session = await getActiveWorkSession();
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, dailyObjective, project, sessionNotes, userName } = body;

    let updatedSession = null;

    if (action === 'start') {
      updatedSession = await startWorkSession({
        userName,
        dailyObjective,
        project,
      });

      await ActivityAuditLog.create({
        action: 'WORK_SESSION_STARTED',
        actor: userName || 'DevOps Engineer',
        targetType: 'WorkSession',
        targetId: updatedSession?._id ? updatedSession._id.toString() : '',
        details: `Started daily work session: "${dailyObjective || 'No objective specified'}"`,
      });
    } else if (action === 'pause') {
      if (!sessionId) throw new Error('sessionId is required to pause');
      updatedSession = await pauseWorkSession(sessionId);

      await ActivityAuditLog.create({
        action: 'WORK_SESSION_PAUSED',
        actor: userName || 'DevOps Engineer',
        targetType: 'WorkSession',
        targetId: sessionId,
        details: 'Paused work session.',
      });
    } else if (action === 'resume') {
      if (!sessionId) throw new Error('sessionId is required to resume');
      updatedSession = await resumeWorkSession(sessionId);

      await ActivityAuditLog.create({
        action: 'WORK_SESSION_RESUMED',
        actor: userName || 'DevOps Engineer',
        targetType: 'WorkSession',
        targetId: sessionId,
        details: 'Resumed active work session.',
      });
    } else if (action === 'end') {
      if (!sessionId) throw new Error('sessionId is required to end');
      updatedSession = await endWorkSession(sessionId, sessionNotes);

      await ActivityAuditLog.create({
        action: 'WORK_SESSION_ENDED',
        actor: userName || 'DevOps Engineer',
        targetType: 'WorkSession',
        targetId: sessionId,
        details: `Ended work session. Total duration: ${updatedSession?.totalActiveMinutes || 0} minutes.`,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action. Supported: start, pause, resume, end' }, { status: 400 });
    }

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
