import { NextRequest, NextResponse } from 'next/server';
import { mockEC2Instances } from '@/mock/monitoringData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const accountId = searchParams.get('accountId');
  const region = searchParams.get('region');
  const status = searchParams.get('status')?.toLowerCase();

  let instances = [...mockEC2Instances];

  if (accountId && accountId !== 'all') {
    instances = instances.filter((inst) => inst.accountId === accountId || (accountId === '1234-5678-9012' && inst.accountId === 'acc-aws-01'));
  }

  if (search) {
    instances = instances.filter(
      (inst) =>
        inst.name.toLowerCase().includes(search) ||
        inst.instanceId.toLowerCase().includes(search)
    );
  }

  if (region && region !== 'all') {
    instances = instances.filter((inst) => inst.region === region);
  }

  if (status && status !== 'all') {
    instances = instances.filter((inst) => inst.status.toLowerCase() === status);
  }

  return NextResponse.json(instances);
}
