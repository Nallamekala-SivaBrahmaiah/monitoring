import { NextRequest, NextResponse } from 'next/server';
import { mockPerformanceMetrics } from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'CPU';
  const provider = searchParams.get('provider')?.toLowerCase();

  let data = mockPerformanceMetrics[type] || mockPerformanceMetrics['CPU'];

  if (provider === 'aws') {
    data = data.map((d) => ({ time: d.time, aws: d.aws, azure: 0 }));
  } else if (provider === 'azure') {
    data = data.map((d) => ({ time: d.time, aws: 0, azure: d.azure }));
  }

  return NextResponse.json(data);
}
