import { NextRequest, NextResponse } from 'next/server';
import { cancelAdHocExecution } from '@/lib/ansible/ansibleAdHocEngine';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cancelled = await cancelAdHocExecution(id);

    return NextResponse.json({
      success: true,
      cancelled,
      message: cancelled ? 'Execution cancelled successfully' : 'Execution already completed or not running',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

