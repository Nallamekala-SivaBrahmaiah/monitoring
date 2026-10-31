import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, tenantId, clientId, clientSecret } = body;

    if (!subscriptionId || !tenantId || !clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Subscription ID, Tenant ID, Client ID, and Client Secret are required.' },
        { status: 400 }
      );
    }

    // First attempt: delegate to Express backend which uses Azure SDK
    try {
      const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
      const backendRes = await fetch(`${backendUrl}/api/azure/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data);
      } else {
        const errData = await backendRes.json().catch(() => ({}));
        if (errData.error) {
          return NextResponse.json({ success: false, error: errData.error }, { status: backendRes.status });
        }
      }
    } catch {
      // Backend not reached, fall back to direct Azure REST authentication
    }

    // Direct Azure REST validation
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
      return NextResponse.json(
        { success: false, error: err.error_description || 'Invalid Azure credentials (authentication failed).' },
        { status: 401 }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Verify subscription access
    const subRes = await fetch(`https://management.azure.com/subscriptions/${subscriptionId}?api-version=2020-01-01`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!subRes.ok) {
      const subErr = await subRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: subErr.error?.message || `Subscription ${subscriptionId} is not accessible with provided credentials.` },
        { status: subRes.status }
      );
    }

    const subData = await subRes.json();
    return NextResponse.json({
      success: true,
      message: 'Azure credentials and subscription verified successfully',
      subscription: {
        subscriptionId: subData.subscriptionId,
        displayName: subData.displayName,
        state: subData.state,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Azure validation failed' }, { status: 400 });
  }
}
