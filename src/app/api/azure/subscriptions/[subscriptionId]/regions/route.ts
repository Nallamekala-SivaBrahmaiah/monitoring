import { NextRequest, NextResponse } from 'next/server';
import { ALL_AZURE_REGIONS } from '@/services/regionDiscoveryService';

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
