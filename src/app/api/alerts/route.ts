import { NextRequest, NextResponse } from 'next/server';
import { getActiveAlerts } from '@/lib/monitoring/alerts';



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity')?.toLowerCase();
    const provider = searchParams.get('provider')?.toLowerCase();

    let alerts = await getActiveAlerts(provider || 'all');

    if (severity && severity !== 'all') {
      alerts = alerts.filter((a: any) => a.severity.toLowerCase() === severity);
    }

    return NextResponse.json(
      alerts.map((a: any) => ({
        id: a._id.toString(),
        resourceId: a.resourceId,
        resourceName: a.resourceName,
        severity: a.severity.charAt(0).toUpperCase() + a.severity.slice(1),
        title: a.title,
        message: a.message,
        region: a.region,
        cloud: a.provider,
        provider: a.provider,
        status: a.status,
        timestamp: a.timestamp ? new Date(a.timestamp).toISOString() : new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch alerts' }, { status: 500 });
  }
}
