import { NextRequest, NextResponse } from 'next/server';
import { mockEC2Instances } from '@/mock/monitoringData';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await context.params;
  const instance = mockEC2Instances.find(
    (item) => item.instanceId === instanceId || item.id === instanceId
  );

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
  }

  return NextResponse.json(instance);
}
