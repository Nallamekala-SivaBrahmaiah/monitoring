import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TrivyScanResult from '@/models/TrivyScanResult';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    await connectToDatabase();

    const query: any = {};
    if (serverId) {
      query.serverId = serverId;
    }

    const scans = await TrivyScanResult.find(query)
      .sort({ scannedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      scans,
      total: scans.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[TrivyScansAPI] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch Trivy scans' }, { status: 500 });
  }
}
