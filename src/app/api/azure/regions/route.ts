import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import { discoverAzureRegions } from '@/lib/azure/regions';
import { ALL_AZURE_REGIONS } from '@/services/regionDiscoveryService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get('subscriptionId');

  try {
    if (subscriptionId) {
      await connectToDatabase();
      const account = await CloudAccount.findOne({ provider: 'azure', subscriptionId })
        .select('+clientSecret')
        .lean();

      if (account?.tenantId && account?.clientId && account?.clientSecret) {
        const liveRegions = await discoverAzureRegions(subscriptionId, {
          tenantId: account.tenantId,
          clientId: account.clientId,
          clientSecret: account.clientSecret,
        });
        if (liveRegions.length > 0) {
          return NextResponse.json(liveRegions);
        }
      }
    }
  } catch (err) {
    //
  }

  return NextResponse.json(
    ALL_AZURE_REGIONS.map((r) => ({
      code: r.code,
      name: r.name,
      geography: r.geography,
      status: 'Available',
    }))
  );
}
