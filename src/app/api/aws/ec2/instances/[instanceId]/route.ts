import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedServerInventory } from '@/lib/serverMonitoring/inventoryService';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import Metric from '@/models/Metric';
import { EC2Client, TerminateInstancesCommand } from '@aws-sdk/client-ec2';
import CloudAccount from '@/models/CloudAccount';
import { fetchEC2Metrics } from '@/lib/aws/metrics';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await context.params;
    const resources = await getUnifiedServerInventory({ provider: 'aws' });

    let r = resources.find(
      (item) => item.resourceId === instanceId || item.id === instanceId
    );

    // If not in unified list, check CloudResource directly or query AWS directly
    if (!r) {
      const cr = await CloudResource.findOne({
        provider: 'aws',
        $or: [{ resourceId: instanceId }, { name: instanceId }],
      }).lean();

      if (cr) {
        const isRun = ((cr as any).status || '').toLowerCase().includes('run');
        r = {
          id: (cr as any)._id?.toString() || instanceId,
          resourceId: (cr as any).resourceId || instanceId,
          name: (cr as any).name || instanceId,
          host: (cr as any).publicIp || (cr as any).privateIp || '-',
          publicIp: (cr as any).publicIp || '-',
          privateIp: (cr as any).privateIp || '-',
          cloudProvider: 'aws',
          region: (cr as any).region || 'ap-southeast-2',
          status: isRun ? 'Running' : 'Stopped',
          powerState: isRun ? 'Running' : 'Stopped',
          vmSize: (cr as any).size || 't3.micro',
          resourceGroup: 'default-rg',
          accountId: (cr as any).accountId || 'acc-aws-01',
          os: ((cr as any).metadata as any)?.os || 'Linux (amazon-linux-2)',
          isCloudDiscovered: true,
          isSSHConnected: Boolean((cr as any).metadata?.isSSHConnected),
          metrics: {
            cpu: (cr as any).metrics?.cpuUtilization ?? null,
            memory: (cr as any).metrics?.memoryUtilization ?? null,
            disk: (cr as any).metrics?.diskUtilization ?? null,
            networkIn: (cr as any).metrics?.networkIn ?? null,
            networkOut: (cr as any).metrics?.networkOut ?? null,
            metricSource: (cr as any).metricSource || 'Amazon CloudWatch',
          },
          docker: { detected: false, status: 'not_installed', version: '', containersCount: 0, runningCount: 0, imagesCount: 0 },
          kubernetes: { detected: false, version: '', podsCount: 0 },
        };
      }
    }

    if (!r) {
      // Query AWS directly for this instance ID
      const awsAccount = await CloudAccount.findOne({ provider: 'aws', status: 'Connected' })
        .select('+accessKeyId +secretAccessKey')
        .lean();

      if (awsAccount && (awsAccount as any).accessKeyId && (awsAccount as any).secretAccessKey) {
        const regionsToTry = ['ap-southeast-2', ...(awsAccount.selectedRegions || []), 'us-east-1'];
        for (const reg of Array.from(new Set(regionsToTry))) {
          try {
            const client = new EC2Client({
              region: reg,
              credentials: {
                accessKeyId: (awsAccount as any).accessKeyId,
                secretAccessKey: (awsAccount as any).secretAccessKey,
              },
            });
            const { DescribeInstancesCommand } = await import('@aws-sdk/client-ec2');
            const desc = await client.send(
              new DescribeInstancesCommand({
                InstanceIds: [instanceId],
              })
            );
            const inst = desc.Reservations?.[0]?.Instances?.[0];
            if (inst && inst.InstanceId) {
              const nameTag = inst.Tags?.find((t) => t.Key === 'Name');
              const name = nameTag?.Value || inst.InstanceId;
              const isRunning = (inst.State?.Name || '').toLowerCase() === 'running';

              // Upsert to CloudResource
              await CloudResource.updateOne(
                { resourceId: inst.InstanceId, provider: 'aws' },
                {
                  $set: {
                    provider: 'aws',
                    resourceType: 'ec2',
                    resourceId: inst.InstanceId,
                    name,
                    region: reg,
                    accountId: awsAccount.accountId,
                    status: isRunning ? 'Running' : 'Stopped',
                    size: inst.InstanceType || 't3.micro',
                    privateIp: inst.PrivateIpAddress,
                    publicIp: inst.PublicIpAddress,
                    isDeleted: false,
                    lastSyncAt: new Date(),
                    metadata: {
                      availabilityZone: inst.Placement?.AvailabilityZone || `${reg}b`,
                      vpcId: inst.VpcId,
                      subnetId: inst.SubnetId,
                      launchTime: inst.LaunchTime,
                      rawState: inst.State?.Name,
                    },
                  },
                },
                { upsert: true }
              );

              r = {
                id: inst.InstanceId,
                resourceId: inst.InstanceId,
                name,
                host: inst.PublicIpAddress || inst.PrivateIpAddress || '-',
                publicIp: inst.PublicIpAddress || '-',
                privateIp: inst.PrivateIpAddress || '-',
                cloudProvider: 'aws',
                region: reg,
                status: isRunning ? 'Running' : 'Stopped',
                powerState: isRunning ? 'Running' : 'Stopped',
                vmSize: inst.InstanceType || 't3.micro',
                resourceGroup: 'default-rg',
                accountId: awsAccount.accountId,
                os: 'Linux (amazon-linux-2)',
                isCloudDiscovered: true,
                isSSHConnected: false,
                metrics: {
                  cpu: null,
                  memory: null,
                  disk: null,
                  networkIn: null,
                  networkOut: null,
                  metricSource: 'Amazon CloudWatch',
                },
                docker: { detected: false, status: 'not_installed', version: '', containersCount: 0, runningCount: 0, imagesCount: 0 },
                kubernetes: { detected: false, version: '', podsCount: 0 },
              };
              break;
            }
          } catch {}
        }
      }
    }

    if (!r) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const isRunning = (r.status || '').toLowerCase().includes('run');

    const awsAccount = await CloudAccount.findOne({ provider: 'aws', status: 'Connected' })
      .select('+accessKeyId +secretAccessKey')
      .lean();
    const creds = awsAccount ? {
      accessKeyId: (awsAccount as any).accessKeyId,
      secretAccessKey: (awsAccount as any).secretAccessKey,
      region: r.region,
    } : undefined;

    let cwMetrics = null;
    if (isRunning && creds?.accessKeyId && creds?.secretAccessKey) {
      try {
        cwMetrics = await fetchEC2Metrics(r.resourceId, r.region, creds, 6);
      } catch (err: any) {
        console.warn(`[AWS EC2 Detail] CloudWatch query error: ${err.message || err}`);
      }
    }

    // Stopped instances must NEVER show running metrics
    const cpu = isRunning ? (cwMetrics?.cpuUtilization ?? r.metrics.cpu ?? null) : null;
    const memory = isRunning ? (cwMetrics?.memoryUtilization ?? r.metrics.memory ?? null) : null;
    const disk = isRunning ? (cwMetrics?.diskUtilization ?? r.metrics.disk ?? null) : null;
    const netInMB = isRunning
      ? (cwMetrics?.networkInMB ?? (typeof r.metrics.networkIn === 'number' ? Math.round((r.metrics.networkIn / (1024 * 1024)) * 100) / 100 : null))
      : null;
    const netOutMB = isRunning
      ? (cwMetrics?.networkOutMB ?? (typeof r.metrics.networkOut === 'number' ? Math.round((r.metrics.networkOut / (1024 * 1024)) * 100) / 100 : null))
      : null;

    const historicalMetrics = cwMetrics?.historicalMetrics || {
      cpu: [],
      memory: [],
      disk: [],
      network: [],
    };

    const cwAgentInstalled = Boolean(
      cwMetrics?.cwAgentInstalled ||
      memory !== null
    );
    const cwAgentStatus = cwAgentInstalled ? 'Installed & Active' : 'Agent Not Installed';

    return NextResponse.json({
      id: r.id,
      instanceId: r.resourceId,
      name: r.name,
      region: r.region,
      availabilityZone: (r.tags as any)?.availabilityZone || `${r.region}a`,
      vpcId: (r.tags as any)?.vpcId || 'vpc-0a12b34c56d78e',
      subnetId: (r.tags as any)?.subnetId || 'subnet-09f8e7d6c5b4a',
      accountId: r.accountId || 'acc-aws-01',
      instanceType: r.vmSize || 't3.micro',
      state: isRunning ? 'Running' : 'Stopped',
      status: isRunning ? 'Running' : 'Stopped',
      privateIp: r.privateIp || '-',
      publicIp: r.publicIp || r.host || '-',
      launchTime: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : new Date().toISOString(),
      uptime: isRunning ? 'Active' : 'Stopped',
      os: r.os || 'Linux (amazon-linux-2)',
      tags: r.tags || {},

      cpuUsage: cpu,
      memoryUsage: memory,
      diskUsage: disk,
      networkInMB: netInMB,
      networkOutMB: netOutMB,

      cwAgentInstalled,
      cwAgentStatus,

      isSSHConnected: r.isSSHConnected,
      sshServerId: r.sshServerId,
      sshStatus: r.sshStatus,

      metrics: {
        cpuUtilization: cpu,
        memoryUtilization: memory,
        diskUtilization: disk,
        networkIn: cwMetrics?.networkIn ?? r.metrics.networkIn,
        networkOut: cwMetrics?.networkOut ?? r.metrics.networkOut,
      },

      historicalMetrics,

      cpuStatus: isRunning ? (cpu !== null ? 'Available' : 'Unavailable') : 'Stopped',
      memoryStatus: memory !== null ? 'Available' : 'Agent Not Installed',
      diskStatus: disk !== null ? 'Available' : 'Agent Not Installed',
      metricSource: isRunning
        ? (cwAgentInstalled ? 'AWS CloudWatch (CWAgent & AWS/EC2)' : 'AWS CloudWatch (AWS/EC2)')
        : 'Stopped (No Active Telemetry)',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch EC2 instance' }, { status: 500 });
  }
}

/**
 * DELETE /api/aws/ec2/instances/[instanceId]
 * Permanently removes an EC2 instance from monitoring and database,
 * with optional cloud termination if terminateInAWS is specified.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ instanceId: string }> }
) {
  try {
    await connectToDatabase();
    const { instanceId } = await context.params;
    const { searchParams } = new URL(request.url);
    const terminateInAWS = searchParams.get('terminate') === 'true';

    // Find instance metadata first
    const cr = await CloudResource.findOne({ resourceId: instanceId, provider: 'aws' }).lean();

    // Optionally terminate in AWS EC2
    if (terminateInAWS && cr) {
      try {
        const awsAcc = await CloudAccount.findOne({ provider: 'aws', status: 'Connected' })
          .select('+accessKeyId +secretAccessKey')
          .lean();

        if (awsAcc && (awsAcc as any).accessKeyId && (awsAcc as any).secretAccessKey) {
          const client = new EC2Client({
            region: cr.region || 'ap-southeast-2',
            credentials: {
              accessKeyId: (awsAcc as any).accessKeyId,
              secretAccessKey: (awsAcc as any).secretAccessKey,
            },
          });
          await client.send(new TerminateInstancesCommand({ InstanceIds: [instanceId] }));
        }
      } catch (termErr: any) {
        console.warn(`[AWS EC2] Direct termination note:`, termErr.message);
      }
    }

    // 1. Delete from CloudResource
    const resCloud = await CloudResource.deleteMany({
      $or: [
        { resourceId: instanceId },
        { name: instanceId },
        ...(cr ? [{ name: cr.name }, { publicIp: cr.publicIp }] : []),
      ],
    });

    // 2. Delete from Server
    const resServer = await Server.deleteMany({
      cloudProvider: 'aws',
      $or: [
        { name: instanceId },
        { host: instanceId },
        { tags: instanceId },
        ...(cr ? [{ name: cr.name }, { host: cr.publicIp }, { host: cr.privateIp }] : []),
      ],
    });

    // 3. Delete metrics
    await Metric.deleteMany({
      $or: [
        { resourceId: instanceId },
        ...(cr ? [{ resourceId: cr.name }] : []),
      ],
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: `EC2 instance ${instanceId} removed successfully`,
      deletedCloudResources: resCloud.deletedCount,
      deletedServers: resServer.deletedCount,
    });
  } catch (err: any) {
    console.error('Failed to delete EC2 instance:', err);
    return NextResponse.json({ error: err.message || 'Failed to remove EC2 instance' }, { status: 500 });
  }
}
