import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { executeUnifiedPowerAction, PowerAction } from '@/lib/cloudPowerService';

interface RouteContext {
  params: Promise<{ vmId: string }>;
}

/**
 * POST /api/azure/vms/[vmId]/power
 * Dispatches real Azure Virtual Machine Start / Stop / Restart commands to Azure Cloud
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { vmId } = await context.params;
    const body = await request.json();
    const action = body?.action as PowerAction;

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: start, stop, restart' },
        { status: 400 }
      );
    }

    const result = await executeUnifiedPowerAction(vmId, action);

    return NextResponse.json({
      success: true,
      action: result.action,
      status: result.status,
      message: result.message,
      provider: 'azure',
      vmId,
    });
  } catch (err: any) {
    console.error('Azure VM power action error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to execute power action on Azure VM' },
      { status: 500 }
    );
  }
}

