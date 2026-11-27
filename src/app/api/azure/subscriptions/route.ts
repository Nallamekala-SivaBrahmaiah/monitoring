import { NextRequest, NextResponse } from 'next/server';
import { saveAzureSubscription, getAzureSubscriptions, disconnectAzureSubscription } from '@/lib/azure/subscriptions';
import { removeAccount } from '@/lib/storage';

export async function GET() {
  try {
    const subscriptions = await getAzureSubscriptions();
    return NextResponse.json(subscriptions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionName, subscriptionId, tenantId, clientId, clientSecret, selectedRegions } = body;

    if (!subscriptionId || !tenantId || !clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing required Azure credentials' }, { status: 400 });
    }

    const saved = await saveAzureSubscription({
      subscriptionName,
      subscriptionId,
      tenantId,
      clientId,
      clientSecret,
      selectedRegions,
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save Azure subscription' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId') || searchParams.get('id');
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }
    await removeAccount('azure', subscriptionId);
    await disconnectAzureSubscription(subscriptionId).catch(() => {});
    return NextResponse.json({ success: true, message: `Subscription ${subscriptionId} removed` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to remove subscription' }, { status: 500 });
  }
}
