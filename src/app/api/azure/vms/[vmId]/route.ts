import { NextRequest, NextResponse } from 'next/server';
import { fetchResourceById } from '@/lib/storage';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import CloudAccount from '@/models/CloudAccount';
import Metric from '@/models/Metric';
import { ClientSecretCredential } from '@azure/identity';

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

    await connectToDatabase();
    // Look up if this VM corresponds to a registered SSH server
    const publicIp = (vm.publicIp || '').trim();
    const privateIp = (vm.privateIp || '').trim();
    const vmName = (vm.name || '').trim().toLowerCase();

    const matchingServer = await Server.findOne({
      $or: [
        { host: publicIp },
        { host: privateIp },
        { name: new RegExp(`^${vmName}$`, 'i') },
      ],
    }).lean();

    const isRunning = (vm.status || '').toLowerCase().includes('run');

    if (matchingServer) {
      const s = matchingServer as any;
      return NextResponse.json({
        id: vm._id ? vm._id.toString() : vm.resourceId,
        vmId: vm.resourceId,
        name: vm.name,
        resourceGroup: vm.resourceGroup || 'default-rg',
        subscriptionId: vm.subscriptionId,
        region: vm.region,
        vmSize: vm.size || 'Standard_D2s_v3',
        powerState: s.status === 'Online' ? 'Running' : (vm.status || 'Stopped'),
        privateIp: vm.privateIp || '-',
        publicIp: vm.publicIp || s.host || '-',

        // Verified SSH linkage
        isSSHConnected: true,
        sshServerId: s._id.toString(),
        sshStatus: s.status,

        // Real In-Guest Telemetry
        cpuUsage: s.metrics?.cpu?.usagePercent ?? (vm.metrics?.cpuUtilization ?? null),
        cpuUtilization: s.metrics?.cpu?.usagePercent ?? (vm.metrics?.cpuUtilization ?? null),
        cpuStatus: 'Available',

        memoryUsage: s.metrics?.memory?.usagePercent ?? null,
        memoryUtilization: s.metrics?.memory?.usagePercent ?? null,
        memoryStatus: 'Available',

        diskUsage: s.metrics?.disks?.[0]?.usagePercent ?? null,
        diskUtilization: s.metrics?.disks?.[0]?.usagePercent ?? null,
        diskStatus: 'Available',

        networkInMB: s.metrics?.network?.[0]?.bytesReceived
          ? Math.round((s.metrics.network[0].bytesReceived / (1024 * 1024)) * 10) / 10
          : (vm.metrics?.networkIn ?? null),
        networkIn: s.metrics?.network?.[0]?.bytesReceived
          ? Math.round((s.metrics.network[0].bytesReceived / (1024 * 1024)) * 10) / 10
          : (vm.metrics?.networkIn ?? null),
        networkOutMB: s.metrics?.network?.[0]?.bytesSent
          ? Math.round((s.metrics.network[0].bytesSent / (1024 * 1024)) * 10) / 10
          : (vm.metrics?.networkOut ?? null),
        networkOut: s.metrics?.network?.[0]?.bytesSent
          ? Math.round((s.metrics.network[0].bytesSent / (1024 * 1024)) * 10) / 10
          : (vm.metrics?.networkOut ?? null),

        uptime: s.status === 'Online' ? 'Running (SSH Telemetry Active)' : 'Offline',
        os: `${s.os?.name || 'Linux'} ${s.os?.version || ''}`.trim(),
        tags: vm.metadata?.tags || {},
        metadata: vm.metadata,
        metricSource: 'SSH Agent / In-Guest Telemetry (Verified Mapping)',

        // Docker & K8s
        docker: s.docker,
        kubernetes: s.kubernetes,
      });
    }

    // Cloud Discovered Only (Not connected via SSH)
    const cpu =
      vm.metrics?.cpuUtilization !== null && vm.metrics?.cpuUtilization !== undefined
        ? vm.metrics.cpuUtilization
        : null;
    const netIn =
      vm.metrics?.networkIn !== null && vm.metrics?.networkIn !== undefined
        ? vm.metrics.networkIn
        : null;
    const netOut =
      vm.metrics?.networkOut !== null && vm.metrics?.networkOut !== undefined
        ? vm.metrics.networkOut
        : null;

    return NextResponse.json({
      id: vm._id ? vm._id.toString() : vm.resourceId,
      vmId: vm.resourceId,
      name: vm.name,
      resourceGroup: vm.resourceGroup || 'default-rg',
      subscriptionId: vm.subscriptionId,
      region: vm.region,
      vmSize: vm.size || 'Standard_D2s_v3',
      powerState: isRunning ? 'Running' : (vm.status || 'Stopped'),
      privateIp: vm.privateIp || '-',
      publicIp: vm.publicIp || '-',

      isSSHConnected: false,

      cpuUsage: cpu,
      cpuUtilization: cpu,
      cpuStatus: cpu !== null ? 'Available' : 'Unavailable',
      memoryUsage: null,
      memoryUtilization: null,
      memoryStatus: 'Unavailable',
      memoryExplanation: 'Guest memory requires Azure Monitor Agent (AMA) extension on Linux host or direct SSH registration',
      diskUsage: null,
      diskUtilization: null,
      diskStatus: 'Unavailable',
      diskExplanation: 'Guest disk space requires Azure Monitor Agent (AMA) extension / Data Collection Rule or direct SSH registration',
      networkInMB: netIn,
      networkIn: netIn,
      networkOutMB: netOut,
      networkOut: netOut,
      uptime: isRunning ? 'Running' : 'Stopped / Deallocated',
      os: vm.metadata?.os || 'Linux (ubuntu 22.04)',
      vnet: vm.metadata?.vnet || 'vnet-centralindia-1',
      subnet: vm.metadata?.subnet || 'default',
      tags: vm.metadata?.tags || {},
      metadata: vm.metadata,
      metricSource: 'Azure Monitor (Microsoft.Insights Platform Only)',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch VM details' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ vmId: string }> }
) {
  try {
    const { vmId } = await context.params;
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const deleteInAzure = searchParams.get('delete') === 'true';

    // Find VM in CloudResource first
    const cr = await CloudResource.findOne({
      provider: 'azure',
      $or: [{ resourceId: vmId }, { name: vmId }],
    }).lean();

    // Optionally delete from Azure cloud infrastructure
    if (deleteInAzure && cr) {
      try {
        const azAcc = await CloudAccount.findOne({ provider: 'azure', status: 'Connected' })
          .select('+clientSecret')
          .lean();

        if (azAcc && (azAcc as any).clientSecret && azAcc.tenantId && azAcc.clientId) {
          const cred = new ClientSecretCredential(azAcc.tenantId, azAcc.clientId, (azAcc as any).clientSecret);
          const tokenRes = await cred.getToken('https://management.azure.com/.default');
          if (tokenRes && tokenRes.token) {
            const subId = cr.subscriptionId || azAcc.subscriptionId;
            const rg = cr.resourceGroup || 'default-rg';
            const url = `https://management.azure.com/subscriptions/${subId}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines/${cr.name}?api-version=2023-09-01`;
            await fetch(url, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${tokenRes.token}` },
            });
          }
        }
      } catch (azErr: any) {
        console.warn(`[Azure VM] Direct ARM deletion note:`, azErr.message);
      }
    }

    const query: any[] = [
      { resourceId: vmId },
      { name: vmId },
      ...(cr ? [{ name: cr.name }, { publicIp: cr.publicIp }] : []),
    ];

    const res = await CloudResource.deleteMany({
      $or: query,
    });

    // Also remove from Server collection so deleted VMs do not linger as ghost servers
    const serverRes = await Server.deleteMany({
      cloudProvider: 'azure',
      $or: query,
    });

    // Clean up metrics
    await Metric.deleteMany({
      $or: [
        { resourceId: vmId },
        ...(cr ? [{ resourceId: cr.name }] : []),
      ],
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: `Azure VM ${vmId} removed successfully`,
      deletedCloudResources: res.deletedCount,
      deletedServers: serverRes.deletedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove VM' }, { status: 500 });
  }
}
