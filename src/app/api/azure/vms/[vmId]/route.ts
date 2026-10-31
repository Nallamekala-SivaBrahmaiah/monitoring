import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vmId: string }> }
) {
  const { vmId } = await context.params;

  try {
    await connectToDatabase();
    const vm = await CloudResource.findOne({
      provider: 'azure',
      resourceType: 'vm',
      $or: [{ resourceId: vmId }, { _id: vmId.match(/^[0-9a-fA-F]{24}$/) ? vmId : undefined }],
    }).lean();

    if (!vm) {
      return NextResponse.json({ error: 'Azure Virtual Machine not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: vm._id.toString(),
      vmId: vm.resourceId,
      name: vm.name,
      resourceGroup: vm.resourceGroup || 'default-rg',
      subscriptionId: vm.subscriptionId,
      region: vm.region,
      vmSize: vm.size || 'Standard_B2s',
      powerState: vm.status,
      privateIp: vm.privateIp || '-',
      publicIp: vm.publicIp || '-',
      cpuUtilization: vm.metrics?.cpuUtilization,
      memoryUtilization: vm.metrics?.memoryUtilization,
      diskUtilization: vm.metrics?.diskUtilization,
      networkIn: vm.metrics?.networkIn,
      networkOut: vm.metrics?.networkOut,
      tags: vm.metadata?.tags || {},
      metadata: vm.metadata,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch VM details' }, { status: 500 });
  }
}
