import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
    const qs = searchParams.toString();
    const res = await fetch(`${backendUrl}/api/resources${qs ? `?${qs}` : ''}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const resources = data.resources || [];

      // Compute actual distribution from real resources
      const azureCount = resources.filter((r: any) => r.provider === 'azure').length;
      const awsCount = resources.filter((r: any) => r.provider === 'aws').length;

      const cloudDistribution = [];
      if (awsCount > 0) cloudDistribution.push({ name: 'AWS', value: awsCount, color: '#FF9900' });
      if (azureCount > 0) cloudDistribution.push({ name: 'Azure', value: azureCount, color: '#0089D6' });

      return NextResponse.json({
        success: true,
        count: resources.length,
        provider: data.provider || 'all',
        resources,
        cloudDistribution,
        serverStatus: [],
        topRegions: [],
        runningServices: [],
      });
    }
  } catch (err) {
    // Backend offline
  }

  return NextResponse.json({
    success: true,
    count: 0,
    provider: searchParams.get('provider') || 'all',
    resources: [],
    cloudDistribution: [],
    serverStatus: [],
    topRegions: [],
    runningServices: [],
  });
}
