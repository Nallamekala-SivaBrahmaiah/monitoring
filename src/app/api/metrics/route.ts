import { NextRequest, NextResponse } from 'next/server';
import { mockPerformanceMetrics } from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'CPU';

  const data = mockPerformanceMetrics[type] || mockPerformanceMetrics['CPU'];
  return NextResponse.json(data);
}
