import { NextRequest, NextResponse } from 'next/server';
import { mockAzureVMs } from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const subscriptionId = searchParams.get('subscriptionId');
  const region = searchParams.get('region');
  const status = searchParams.get('status')?.toLowerCase();

  let vms = [...mockAzureVMs];

  if (subscriptionId && subscriptionId !== 'all') {
    vms = vms.filter((v) => v.subscriptionId === subscriptionId);
  }

  if (region && region !== 'all') {
    vms = vms.filter((v) => v.region === region);
  }

  if (status && status !== 'all') {
    vms = vms.filter((v) => v.powerState.toLowerCase() === status);
  }

  if (search) {
    vms = vms.filter(
      (v) =>
        v.name.toLowerCase().includes(search) ||
        v.resourceGroup.toLowerCase().includes(search) ||
        v.vmId.toLowerCase().includes(search)
    );
  }

  return NextResponse.json(vms);
}
