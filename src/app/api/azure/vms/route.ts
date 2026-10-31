import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const subscriptionId = searchParams.get('subscriptionId');
  const region = searchParams.get('region');
  const status = searchParams.get('status')?.toLowerCase();

  // Try proxying to backend which has live Azure SDK discoveries
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
    const qs = searchParams.toString();
    const res = await fetch(`${backendUrl}/api/azure/vms${qs ? `?${qs}` : ''}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const liveVMs = await res.json();
      return NextResponse.json(liveVMs);
    }
  } catch (err) {
    // Backend offline or unreachable
  }

  // Fallback to empty real state
  return NextResponse.json([]);
}
