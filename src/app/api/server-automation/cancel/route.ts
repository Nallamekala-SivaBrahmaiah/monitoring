import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AutomationExecution from '@/models/AutomationExecution';
import { getActiveSession } from '@/lib/automation/automationSessionManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId } = body;

    if (!executionId) {
      return NextResponse.json({ error: 'executionId is required' }, { status: 400 });
    }

    const active = getActiveSession(executionId);
    if (active && active.status === 'running') {
      active.cancel();
      return NextResponse.json({
        success: true,
        message: 'Cancellation signal sent to remote execution.',
      });
    }

    await connectToDatabase();
    await AutomationExecution.findByIdAndUpdate(executionId, {
      status: 'cancelled',
      completedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Execution marked as cancelled.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
