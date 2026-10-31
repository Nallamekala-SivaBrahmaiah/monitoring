import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
    const res = await fetch(`${backendUrl}/api/cloud/accounts`, { cache: 'no-store' });
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch (e) {
    // Backend offline
  }

  return NextResponse.json([]);
}
