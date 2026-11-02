import { NextResponse } from 'next/server';
import { runAlertEngineTests } from '@/lib/monitoring/__tests__/alertEngine.test';

export async function GET() {
  try {
    const results = await runAlertEngineTests();
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Test run failed', stack: err.stack }, { status: 500 });
  }
}
