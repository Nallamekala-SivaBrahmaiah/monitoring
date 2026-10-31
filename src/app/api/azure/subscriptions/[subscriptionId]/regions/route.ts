import { NextRequest, NextResponse } from 'next/server';
import { ALL_AZURE_REGIONS } from '@/services/regionDiscoveryService';
import { updateAzureSubscriptionRegions } from '@/lib/azure/subscriptions';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ subscriptionId: string }> }
) {
  const { subscriptionId } = await context.params;

  // By default, discover all supported Azure locations and enable ALL of them
  const regions = ALL_AZURE_REGIONS.map((r) => ({
    ...r,
    enabled: true, // Selected by default
  }));

  return NextResponse.json({
    success: true,
    subscriptionId,
    totalCount: regions.length,
    selectedCount: regions.length,
    regions,
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await context.params;
    const body = await request.json();
    const { regions } = body;

    const result = await updateAzureSubscriptionRegions(subscriptionId, regions || []);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update regions' }, { status: 400 });
  }
}
