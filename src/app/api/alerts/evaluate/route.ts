import { NextResponse } from 'next/server';
import { runMonitoringCycle, getSchedulerStatus, startMonitoringScheduler } from '@/lib/monitoring/scheduler';

export async function GET() {
  try {
    startMonitoringScheduler();
    const status = getSchedulerStatus();
    return NextResponse.json({
      success: true,
      scheduler: status,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    startMonitoringScheduler();
    const cycleResult = await runMonitoringCycle();
    const status = getSchedulerStatus();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cycle: cycleResult,
      scheduler: status,
    });
  } catch (err: any) {
    console.error('Manual alert evaluation error:', err);
    return NextResponse.json(
      { error: err.message || 'Alert evaluation cycle failed' },
      { status: 500 }
    );
  }
}
