import { NextRequest, NextResponse } from 'next/server';
import { mockAzureSubscriptions } from '@/mock/monitoringData';

let subscriptions = [...mockAzureSubscriptions];

export async function GET() {
  return NextResponse.json(subscriptions);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newSub = {
      id: `sub-azure-${Date.now()}`,
      subscriptionName: body.subscriptionName || 'Azure Subscription',
      subscriptionId: body.subscriptionId,
      tenantId: body.tenantId,
      clientId: body.clientId,
      authType: body.authType || ('client_secret' as const),
      status: 'Connected' as const,
      enabledRegions: body.enabledRegions || ['eastus', 'westeurope'],
      resourcesCount: (body.enabledRegions?.length || 2) * 3,
      lastSync: 'Just now',
    };
    subscriptions.push(newSub);
    return NextResponse.json(newSub, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create Azure subscription' }, { status: 400 });
  }
}
