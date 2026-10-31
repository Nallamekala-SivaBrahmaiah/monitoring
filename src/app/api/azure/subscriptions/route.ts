import { NextRequest, NextResponse } from 'next/server';

interface StoredSubscription {
  id: string;
  subscriptionName: string;
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  authType: string;
  status: 'Connected' | 'Connection Failed' | 'Disconnected';
  availableRegions: string[];
  selectedRegions: string[];
  enabledRegions: string[];
  resourcesCount: number;
  lastSync: string;
}

let inMemorySubscriptions: StoredSubscription[] = [];

export async function GET() {
  // Delegate to Express backend (connected to MongoDB)
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
    const res = await fetch(`${backendUrl}/api/azure/subscriptions`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fallback
  }

  const sanitized = inMemorySubscriptions.map(({ clientSecret, ...rest }) => rest);
  return NextResponse.json(sanitized);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionName, subscriptionId, tenantId, clientId, clientSecret, selectedRegions } = body;

    if (!subscriptionId || !tenantId || !clientId) {
      return NextResponse.json({ error: 'Missing required Azure credentials' }, { status: 400 });
    }

    // Try Express backend first
    try {
      const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
      const backendRes = await fetch(`${backendUrl}/api/azure/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      if (backendRes.ok) {
        const saved = await backendRes.json();
        return NextResponse.json(saved, { status: 201 });
      }
    } catch {
      // Backend unavailable, fallback to REST
    }

    // Acquire Azure Token
    let accessToken = '';
    if (clientSecret) {
      const tokenParams = new URLSearchParams();
      tokenParams.append('client_id', clientId);
      tokenParams.append('client_secret', clientSecret);
      tokenParams.append('grant_type', 'client_credentials');
      tokenParams.append('scope', 'https://management.azure.com/.default');

      const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        return NextResponse.json({ error: err.error_description || 'Azure authentication failed' }, { status: 400 });
      }

      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
    }

    // Fetch supported locations from Azure Resource Manager
    let discoveredRegions: string[] = [];
    if (accessToken) {
      try {
        const locRes = await fetch(`https://management.azure.com/subscriptions/${subscriptionId}/locations?api-version=2022-12-01`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (locRes.ok) {
          const locData = await locRes.json();
          if (Array.isArray(locData.value)) {
            discoveredRegions = locData.value.map((l: any) => l.name);
          }
        }
      } catch (e) {
        console.warn('Location discovery error:', e);
      }
    }

    // Default: select and enable all discovered regions
    const enabled = selectedRegions && selectedRegions.length > 0 ? selectedRegions : discoveredRegions;

    const newSub: StoredSubscription = {
      id: `sub-azure-${Date.now()}`,
      subscriptionName: subscriptionName || 'Azure Subscription',
      subscriptionId,
      tenantId,
      clientId,
      clientSecret,
      authType: body.authType || 'client_secret',
      status: 'Connected',
      availableRegions: discoveredRegions,
      selectedRegions: enabled,
      enabledRegions: enabled,
      resourcesCount: 0,
      lastSync: 'Just now',
    };

    inMemorySubscriptions = inMemorySubscriptions.filter((s) => s.subscriptionId !== subscriptionId);
    inMemorySubscriptions.push(newSub);

    const { clientSecret: _, ...clientResponse } = newSub;
    return NextResponse.json(clientResponse, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save Azure subscription' }, { status: 400 });
  }
}
