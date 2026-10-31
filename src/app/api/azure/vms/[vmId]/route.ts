import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vmId: string }> }
) {
  const { vmId } = await context.params;

  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
    const res = await fetch(`${backendUrl}/api/azure/vms/${encodeURIComponent(vmId)}`, {
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

  return NextResponse.json({ error: 'Azure VM not found' }, { status: 404 });
}
