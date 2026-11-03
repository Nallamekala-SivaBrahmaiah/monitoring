import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { executeUnifiedPowerAction, PowerAction } from '@/lib/cloudPowerService';

interface RouteContext {
  params: Promise<{ instanceId: string }>;
}

/**
 * POST /api/aws/ec2/instances/[instanceId]/power
 * Dispatches real AWS EC2 Start / Stop / Reboot commands to AWS Cloud
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { instanceId } = await context.params;
    const body = await request.json();
    const action = body?.action as PowerAction;

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: start, stop, restart' },
        { status: 400 }
      );
    }

    const result = await executeUnifiedPowerAction(instanceId, action);

    return NextResponse.json({
      success: true,
      action: result.action,
      status: result.status,
      message: result.message,
      provider: 'aws',
      instanceId,
    });
  } catch (err: any) {
    console.error('AWS EC2 power action error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to execute power action on AWS EC2' },
      { status: 500 }
    );
  }
}

