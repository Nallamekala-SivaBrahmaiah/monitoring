import { NextRequest, NextResponse } from 'next/server';
import { ALL_AZURE_REGIONS } from '@/services/regionDiscoveryService';
import { mockAzureSubscriptions } from '@/mock/monitoringData';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ subscriptionId: string }> }
) {
  const { subscriptionId } = await context.params;
  const sub = mockAzureSubscriptions.find(
    (s) => s.id === subscriptionId || s.subscriptionId === subscriptionId
  );

  const selectedRegionsSet = new Set(sub?.enabledRegions || ['eastus', 'westeurope']);

  const regions = ALL_AZURE_REGIONS.map((r) => ({
    ...r,
    enabled: selectedRegionsSet.has(r.code),
  }));

  return NextResponse.json({
    success: true,
    subscriptionId,
    totalRegions: regions.length,
    selectedCount: selectedRegionsSet.size,
    regions,
  });
}
