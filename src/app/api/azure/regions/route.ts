import { NextRequest, NextResponse } from 'next/server';
import { ALL_AZURE_REGIONS } from '@/services/regionDiscoveryService';

let regions = [...ALL_AZURE_REGIONS];

export async function GET() {
  return NextResponse.json({
    success: true,
    totalCount: regions.length,
    regions,
  });
}

export async function PUT(request: NextRequest) {
  try {
    const { regionCode, enabled } = await request.json();
    regions = regions.map((r) => (r.code === regionCode ? { ...r, enabled } : r));
    return NextResponse.json({ success: true, regions });
  } catch {
    return NextResponse.json({ error: 'Failed to update region state' }, { status: 400 });
  }
}
