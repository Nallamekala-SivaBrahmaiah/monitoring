import { NextRequest, NextResponse } from 'next/server';
import { syncEC2DynamicPublicIP } from '@/lib/aws/syncEc2Ip';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { instanceId, serverId, name, region } = body;

    const result = await syncEC2DynamicPublicIP({
      instanceId,
      serverId,
      name,
      region,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to resolve dynamic EC2 Public IP from AWS',
          ...result,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[AWS EC2 Sync IP API Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while synchronizing EC2 IP' },
      { status: 500 }
    );
  }
}

