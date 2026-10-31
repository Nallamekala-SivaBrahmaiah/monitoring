import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
    const qs = searchParams.toString();
    const res = await fetch(`${backendUrl}/api/dashboard/metrics${qs ? `?${qs}` : ''}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {
    // Backend offline
  }

  return NextResponse.json([]);
}
