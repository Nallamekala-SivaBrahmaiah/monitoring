import { NextRequest, NextResponse } from 'next/server';
import { getAlertThresholds, updateAlertThresholds, DEFAULT_THRESHOLDS } from '@/lib/monitoring/alertEvaluationEngine';

export async function GET() {
  try {
    const thresholds = await getAlertThresholds();
    return NextResponse.json(thresholds);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get alert thresholds' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    const updates: any = {};
    if (typeof body.cpuThreshold === 'number') {
      updates.cpuThreshold = Math.max(1, Math.min(100, body.cpuThreshold));
    }
    if (typeof body.memoryThreshold === 'number') {
      updates.memoryThreshold = Math.max(1, Math.min(100, body.memoryThreshold));
    }
    if (typeof body.diskThreshold === 'number') {
      updates.diskThreshold = Math.max(1, Math.min(100, body.diskThreshold));
    }
    if (['warning', 'critical', 'info'].includes(body.defaultSeverity)) {
      updates.defaultSeverity = body.defaultSeverity;
    }
    if (typeof body.criticalEscalationThreshold === 'number') {
      updates.criticalEscalationThreshold = Math.max(1, Math.min(100, body.criticalEscalationThreshold));
    }
    if (typeof body.reminderIntervalMinutes === 'number') {
      updates.reminderIntervalMinutes = Math.max(5, body.reminderIntervalMinutes);
    }
    if (typeof body.enabled === 'boolean') {
      updates.enabled = body.enabled;
    }

    const updated = await updateAlertThresholds(updates);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update alert thresholds' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Reset to default thresholds (70%)
  try {
    const updated = await updateAlertThresholds(DEFAULT_THRESHOLDS);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reset alert thresholds' }, { status: 500 });
  }
}

