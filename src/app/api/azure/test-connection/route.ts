import { NextRequest, NextResponse } from 'next/server';
import { validateAzureCredentials } from '@/lib/azure/credentials';



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

    const result = await validateAzureCredentials(subscriptionId, tenantId, clientId, clientSecret);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Azure credentials and subscription verified successfully',
      subscription: {
        subscriptionId,
        displayName: result.displayName,
        state: result.state,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Azure validation failed' }, { status: 400 });
  }
}
