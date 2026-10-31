import { NextRequest, NextResponse } from 'next/server';
import { fetchResourceById } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vmId: string }> }
) {
  const { vmId } = await context.params;

  try {
    const vm = await fetchResourceById(vmId);

    if (!vm) {
      return NextResponse.json({ error: 'Azure Virtual Machine not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: vm._id ? vm._id.toString() : vm.resourceId,
      vmId: vm.resourceId,
      name: vm.name,
      resourceGroup: vm.resourceGroup || 'default-rg',
      subscriptionId: vm.subscriptionId,
      region: vm.region,
      vmSize: vm.size || 'Standard_B2s',
      powerState: vm.status,
      privateIp: vm.privateIp || '-',
      publicIp: vm.publicIp || '-',
      cpuUtilization: vm.metrics?.cpuUtilization !== undefined ? vm.metrics.cpuUtilization : null,
      memoryUtilization: vm.metrics?.memoryUtilization !== undefined ? vm.metrics.memoryUtilization : null,
      diskUtilization: vm.metrics?.diskUtilization !== undefined ? vm.metrics.diskUtilization : null,
      networkIn: vm.metrics?.networkIn !== undefined ? vm.metrics.networkIn : null,
      networkOut: vm.metrics?.networkOut !== undefined ? vm.metrics.networkOut : null,
      tags: vm.metadata?.tags || {},
      metadata: vm.metadata,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch VM details' }, { status: 500 });
  }
}
