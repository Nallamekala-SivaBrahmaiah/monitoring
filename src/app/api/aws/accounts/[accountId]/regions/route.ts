import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import { ALL_AWS_REGIONS } from '@/services/regionDiscoveryService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  try {
    await connectToDatabase();
    const { accountId } = await context.params;

    const query: any = {};
    if (accountId.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or = [{ _id: accountId }, { accountId: accountId }];
    } else {
      query.accountId = accountId;
    }

    const account = await CloudAccount.findOne(query).lean();
    const selectedRegionsSet = new Set((account as any)?.selectedRegions || ['us-east-1', 'us-west-2', 'ap-south-1']);

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
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch account regions' }, { status: 500 });
  }
}
