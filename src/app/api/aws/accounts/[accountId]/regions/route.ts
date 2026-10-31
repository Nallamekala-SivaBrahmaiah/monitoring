import { NextRequest, NextResponse } from 'next/server';
import { ALL_AWS_REGIONS } from '@/services/regionDiscoveryService';
import { mockAwsAccounts } from '@/mock/monitoringData';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const account = mockAwsAccounts.find((a) => a.id === accountId || a.accountId === accountId);

  const selectedRegionsSet = new Set(account?.enabledRegions || ['us-east-1', 'us-west-2', 'ap-south-1']);

  const regions = ALL_AWS_REGIONS.map((r) => ({
    ...r,
    enabled: selectedRegionsSet.has(r.code),
  }));

  return NextResponse.json({
    success: true,
    accountId,
    totalRegions: regions.length,
    selectedCount: selectedRegionsSet.size,
    regions,
  });
}
