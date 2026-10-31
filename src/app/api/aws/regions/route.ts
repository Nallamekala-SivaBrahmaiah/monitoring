import { NextResponse } from 'next/server';
import { discoverAWSRegions } from '@/lib/aws/regions';
import { ALL_AWS_REGIONS } from '@/services/regionDiscoveryService';

export async function GET() {
  try {
    const live = await discoverAWSRegions();
    if (live && live.length > 0) {
      return NextResponse.json(live);
    }
  } catch (err) {
    //
  }

  return NextResponse.json(
    ALL_AWS_REGIONS.map((r) => ({
      code: r.code,
      name: r.name,
      geography: r.geography,
      status: 'Available',
    }))
  );
}
