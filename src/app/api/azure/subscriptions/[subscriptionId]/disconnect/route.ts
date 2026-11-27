import { NextRequest, NextResponse } from 'next/server';
import { updateAccountStatus } from '@/lib/storage';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await context.params;
    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
    }
    await updateAccountStatus('azure', subscriptionId, 'Disconnected');
    return NextResponse.json({ success: true, message: `Subscription ${subscriptionId} disconnected` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to disconnect subscription' }, { status: 500 });
  }
}
