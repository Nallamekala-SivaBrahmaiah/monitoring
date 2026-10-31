import { NextRequest, NextResponse } from 'next/server';
import { refreshAzureSubscription } from '@/lib/azure/subscriptions';


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await context.params;
    const result = await refreshAzureSubscription(subscriptionId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Refresh failed' }, { status: 500 });
  }
}
