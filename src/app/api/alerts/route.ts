import { NextRequest, NextResponse } from 'next/server';
import { mockRecentAlerts } from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity')?.toLowerCase();
  const provider = searchParams.get('provider')?.toLowerCase();

  let alerts = [...mockRecentAlerts];
  if (provider && provider !== 'all') {
    alerts = alerts.filter((a) => a.provider === provider);
  }
  if (severity && severity !== 'all') {
    alerts = alerts.filter((a) => a.severity.toLowerCase() === severity);
  }

  return NextResponse.json(alerts);
}
