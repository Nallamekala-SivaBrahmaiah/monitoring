import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { executeUnifiedPowerAction, PowerAction } from '@/lib/cloudPowerService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/servers/[id]/power
 * Dispatches real cloud power operations across AWS EC2, Azure VMs, and fleet servers.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const body = await request.json();
    const action = body?.action as PowerAction;

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: start, stop, restart' },
        { status: 400 }
      );
    }

    const result = await executeUnifiedPowerAction(id, action);

    return NextResponse.json({
      success: true,
      action: result.action,
      status: result.status,
      message: result.message,
      provider: result.provider,
      resourceId: result.resourceId,
    });
  } catch (err: any) {
    console.error('Server power action error:', err);
    return NextResponse.json(
      { error: err.message || 'Power action failed to execute on cloud infrastructure' },
      { status: 500 }
    );
  }
}
