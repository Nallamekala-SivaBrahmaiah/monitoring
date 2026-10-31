import { NextRequest, NextResponse } from 'next/server';
import { saveAzureSubscription, getAzureSubscriptions, disconnectAzureSubscription } from '@/lib/azure/subscriptions';



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
    const subscriptionId = searchParams.get('subscriptionId');
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }
    await disconnectAzureSubscription(subscriptionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to disconnect subscription' }, { status: 500 });
  }
}
