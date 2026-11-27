import { NextRequest, NextResponse } from 'next/server';
import { removeAccount } from '@/lib/storage';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await context.params;
    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
    }
    await removeAccount('azure', subscriptionId);
    return NextResponse.json({ success: true, message: `Subscription ${subscriptionId} removed` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove subscription' }, { status: 500 });
  }
}
