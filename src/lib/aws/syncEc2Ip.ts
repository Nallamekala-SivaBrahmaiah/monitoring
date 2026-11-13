import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';

export interface DynamicIpSyncResult {
  success: boolean;
  instanceId: string;
  name: string;
  publicIp: string | null;
  privateIp: string | null;
  state: string;
  isRunning: boolean;
  region: string;
  serverId?: string | null;
  username?: string;
  port?: number;
  authMethod?: 'privateKey' | 'password';
  hasSavedKey?: boolean;
  message?: string;
  error?: string;
}

/**
 * Automatically fetch the latest real-time Public IP for an AWS EC2 instance
 * directly from AWS EC2 DescribeInstances API, synchronize MongoDB Server & CloudResource,
 * and return the live connection parameters preserving existing saved PEM/PPK keys.
 */
export async function syncEC2DynamicPublicIP(params: {
  instanceId?: string;
  serverId?: string;
  name?: string;
  region?: string;
}): Promise<DynamicIpSyncResult> {
  await connectToDatabase();

  let targetInstanceId = (params.instanceId || '').trim();
  let targetRegion = (params.region || '').trim();
  let serverDoc: any = null;

  // 1. Resolve Server document if serverId or name is provided
  if (params.serverId) {
    serverDoc = await Server.findById(params.serverId);
  }
  if (!serverDoc && targetInstanceId) {
    serverDoc = await Server.findOne({
      $or: [
        { cloudResourceId: targetInstanceId },
        { instanceId: targetInstanceId },
        { name: targetInstanceId },
      ],
    });
  }
  if (!serverDoc && params.name) {
    serverDoc = await Server.findOne({ name: params.name });
  }

  // If instanceId was not explicitly passed, deduce it from server or CloudResource
  if (!targetInstanceId && serverDoc) {
    targetInstanceId = serverDoc.cloudResourceId || serverDoc.instanceId || '';
  }

  // Check CloudResource if instanceId still unknown
  if (!targetInstanceId && (serverDoc?._id || params.name)) {
    const cr = await CloudResource.findOne({
      provider: 'aws',
      $or: [
        { 'metadata.sshServerId': serverDoc?._id?.toString() },
        { 'tags.sshServerId': serverDoc?._id?.toString() },
        { name: serverDoc?.name || params.name },
      ],
    }).lean();
    if (cr && cr.resourceId && cr.resourceId.startsWith('i-')) {
      targetInstanceId = cr.resourceId;
      if (!targetRegion) targetRegion = cr.region;
    }
  }

  if (!targetInstanceId || !targetInstanceId.startsWith('i-')) {
    // If target is not an EC2 instance ID (e.g. on-premise or invalid), return current server state
    if (serverDoc) {
      return {
        success: true,
        instanceId: targetInstanceId || serverDoc._id.toString(),
        name: serverDoc.name,
        publicIp: serverDoc.publicIp || serverDoc.host || null,
        privateIp: serverDoc.privateIp || null,
        state: serverDoc.status === 'Online' ? 'running' : 'stopped',
        isRunning: serverDoc.status === 'Online',
        region: serverDoc.region || 'global',
        serverId: serverDoc._id.toString(),
        username: serverDoc.username,
        port: serverDoc.port || 22,
        authMethod: serverDoc.authMethod,
        hasSavedKey: Boolean(serverDoc.encryptedAuthSecret),
      };
    }
    return {
      success: false,
      instanceId: targetInstanceId,
      name: params.name || 'Unknown',
      publicIp: null,
      privateIp: null,
      state: 'unknown',
      isRunning: false,
      region: targetRegion || 'global',
      error: `Could not identify EC2 Instance ID for server: ${params.name || params.serverId}`,
    };
  }

  // 2. Load configured AWS account credentials
  const awsAccount = await CloudAccount.findOne({ provider: 'aws', status: 'Connected' })
    .select('+accessKeyId +secretAccessKey')
    .lean();

  if (!awsAccount || !(awsAccount as any).accessKeyId || !(awsAccount as any).secretAccessKey) {
    return {
      success: false,
      instanceId: targetInstanceId,
      name: serverDoc?.name || params.name || targetInstanceId,
      publicIp: serverDoc?.publicIp || serverDoc?.host || null,
      privateIp: serverDoc?.privateIp || null,
      state: 'unknown',
      isRunning: false,
      region: targetRegion || 'ap-southeast-2',
      error: 'AWS account credentials not found or status not Connected',
    };
  }

  const creds = {
    accessKeyId: (awsAccount as any).accessKeyId,
    secretAccessKey: (awsAccount as any).secretAccessKey,
  };

  const regionsToTry = Array.from(
    new Set([
      targetRegion,
      serverDoc?.region,
      ...(awsAccount.selectedRegions || []),
      'ap-southeast-2',
      'us-east-1',
    ].filter(Boolean))
  ) as string[];

  let liveInstance: any = null;
  let liveRegion = targetRegion || 'ap-southeast-2';

  for (const reg of regionsToTry) {
    try {
      const client = new EC2Client({ region: reg, credentials: creds });
      const res = await client.send(
        new DescribeInstancesCommand({
          InstanceIds: [targetInstanceId],
        })
      );
      const inst = res.Reservations?.[0]?.Instances?.[0];
      if (inst && inst.InstanceId === targetInstanceId) {
        liveInstance = inst;
        liveRegion = reg;
        break;
      }
    } catch {
      // Continue to next candidate region
    }
  }

  if (!liveInstance) {
    return {
      success: false,
      instanceId: targetInstanceId,
      name: serverDoc?.name || params.name || targetInstanceId,
      publicIp: serverDoc?.publicIp || serverDoc?.host || null,
      privateIp: serverDoc?.privateIp || null,
      state: 'unknown',
      isRunning: false,
      region: liveRegion,
      error: `EC2 instance ${targetInstanceId} not found in AWS DescribeInstances query`,
    };
  }

  const rawState = (liveInstance.State?.Name || '').toLowerCase();
  const isRunning = rawState === 'running';
  const publicIp = liveInstance.PublicIpAddress || null;
  const privateIp = liveInstance.PrivateIpAddress || null;
  const nameTag = liveInstance.Tags?.find((t: any) => t.Key === 'Name');
  const instanceName = nameTag?.Value || serverDoc?.name || targetInstanceId;

  // 3. Update CloudResource with the latest real-time AWS details
  await CloudResource.updateOne(
    { provider: 'aws', resourceId: targetInstanceId },
    {
      $set: {
        provider: 'aws',
        resourceType: 'ec2',
        resourceId: targetInstanceId,
        name: instanceName,
        region: liveRegion,
        accountId: awsAccount.accountId,
        status: isRunning ? 'Running' : 'Stopped',
        size: liveInstance.InstanceType || 't3.micro',
        privateIp: privateIp,
        publicIp: publicIp,
        isDeleted: false,
        lastSyncAt: new Date(),
        'metadata.availabilityZone': liveInstance.Placement?.AvailabilityZone || `${liveRegion}a`,
        'metadata.vpcId': liveInstance.VpcId,
        'metadata.subnetId': liveInstance.SubnetId,
        'metadata.rawState': liveInstance.State?.Name,
      },
    },
    { upsert: true }
  );

  // 4. Update the existing Server record in MongoDB with the latest Public IP
  // Prioritize updating by cloudResourceId / instanceId / sshServerId / name
  if (!serverDoc) {
    serverDoc = await Server.findOne({
      cloudProvider: 'aws',
      $or: [
        { cloudResourceId: targetInstanceId },
        { instanceId: targetInstanceId },
        { name: instanceName },
      ],
    });
  }

  if (serverDoc) {
    const updatedHost = publicIp || privateIp || serverDoc.host;
    await Server.updateOne(
      { _id: serverDoc._id },
      {
        $set: {
          host: updatedHost,
          publicIp: publicIp,
          privateIp: privateIp,
          cloudResourceId: targetInstanceId,
          instanceId: targetInstanceId,
          region: liveRegion,
          cloudPowerState: isRunning ? 'Running' : 'Stopped',
          ...(isRunning
            ? {}
            : { status: 'Offline', lastError: 'Instance is stopped in AWS EC2' }),
        },
      }
    );
  }

  return {
    success: true,
    instanceId: targetInstanceId,
    name: instanceName,
    publicIp: publicIp,
    privateIp: privateIp,
    state: liveInstance.State?.Name || (isRunning ? 'running' : 'stopped'),
    isRunning,
    region: liveRegion,
    serverId: serverDoc?._id?.toString() || null,
    username: serverDoc?.username || 'ubuntu',
    port: serverDoc?.port || 22,
    authMethod: serverDoc?.authMethod || 'privateKey',
    hasSavedKey: Boolean(serverDoc?.encryptedAuthSecret),
  };
}

