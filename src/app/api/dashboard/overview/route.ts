import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Try proxying to backend overview which computes from real Azure SDK resources
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
    const qs = searchParams.toString();
    const res = await fetch(`${backendUrl}/api/dashboard/overview${qs ? `?${qs}` : ''}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    // Backend offline
  }

  // Pure zero real state when no accounts are connected
  return NextResponse.json({
    awsResources: {
      total: 0,
      changeText: '0 new',
      trend: [],
    },
    azureResources: {
      total: 0,
      changeText: '0 new',
      trend: [],
    },
    totalServers: {
      total: 0,
      runningText: '0 running',
      trend: [],
    },
    dockerContainers: {
      total: 0,
      runningText: '0 running',
      trend: [],
    },
    k8sClusters: {
      total: 0,
      healthyText: '0 healthy',
      trend: [],
    },
    activeAlerts: {
      total: 0,
      newText: '0 new',
      trend: [],
    },
  });
}
