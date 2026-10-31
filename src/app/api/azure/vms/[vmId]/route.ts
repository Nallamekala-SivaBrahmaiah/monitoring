import { NextRequest, NextResponse } from 'next/server';
import { mockAzureVMs } from '@/mock/monitoringData';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vmId: string }> }
) {
  const { vmId } = await context.params;
  const vm = mockAzureVMs.find((v) => v.vmId === vmId || v.id === vmId);

  if (!vm) {
    return NextResponse.json({ error: 'Azure VM not found' }, { status: 404 });
  }

  return NextResponse.json(vm);
}
