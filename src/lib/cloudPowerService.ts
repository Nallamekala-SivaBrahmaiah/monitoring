import {
  EC2Client,
  StopInstancesCommand,
  StartInstancesCommand,
  RebootInstancesCommand,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import { ClientSecretCredential } from '@azure/identity';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import { syncSingleServer } from '@/lib/serverMonitoring/serverSync';

export type PowerAction = 'start' | 'stop' | 'restart';

export interface PowerActionResult {
  success: boolean;
  action: PowerAction;
  status: 'Online' | 'Offline' | 'Starting' | 'Stopping' | 'Running' | 'Stopped';
  message: string;
  provider?: 'aws' | 'azure' | 'other';
  resourceId?: string;
  details?: any;
}

/**
 * Retrieve active AWS credentials from CloudAccount
 */
async function getAWSCredentials(accountId?: string) {
  const query: any = { provider: 'aws', status: 'Connected' };
  if (accountId) query.accountId = accountId;

  const account = await CloudAccount.findOne(query).select('+accessKeyId +secretAccessKey').lean();
  if (account && (account as any).accessKeyId && (account as any).secretAccessKey) {
    return {
      accessKeyId: (account as any).accessKeyId as string,
      secretAccessKey: (account as any).secretAccessKey as string,
      account,
    };
  }

  // Fallback to any connected AWS account
  const fallback = await CloudAccount.findOne({ provider: 'aws' })
    .select('+accessKeyId +secretAccessKey')
    .lean();
  if (fallback && (fallback as any).accessKeyId && (fallback as any).secretAccessKey) {
    return {
      accessKeyId: (fallback as any).accessKeyId as string,
      secretAccessKey: (fallback as any).secretAccessKey as string,
      account: fallback,
    };
  }

  return null;
}

/**
 * Retrieve active Azure credentials from CloudAccount
 */
async function getAzureCredentials(subscriptionId?: string) {
  const query: any = { provider: 'azure', status: 'Connected' };
  if (subscriptionId) query.subscriptionId = subscriptionId;

  const account = await CloudAccount.findOne(query).select('+clientSecret').lean();
  if (account && (account as any).clientSecret && account.tenantId && account.clientId) {
    return {
      tenantId: account.tenantId,
      clientId: account.clientId,
      clientSecret: (account as any).clientSecret as string,
      subscriptionId: account.subscriptionId || subscriptionId,
      account,
    };
  }

  // Fallback to any Azure account
  const fallback = await CloudAccount.findOne({ provider: 'azure' })
    .select('+clientSecret')
    .lean();
  if (fallback && (fallback as any).clientSecret && fallback.tenantId && fallback.clientId) {
    return {
      tenantId: fallback.tenantId,
      clientId: fallback.clientId,
      clientSecret: (fallback as any).clientSecret as string,
      subscriptionId: fallback.subscriptionId || subscriptionId,
      account: fallback,
    };
  }

  return null;
}

/**
 * Execute real AWS EC2 power action (Start / Stop / Reboot)
 */
export async function executeAWSPowerAction({
  instanceId,
  region,
  action,
  accountId,
}: {
  instanceId: string;
  region?: string;
  action: PowerAction;
  accountId?: string;
}): Promise<PowerActionResult> {
  const creds = await getAWSCredentials(accountId);
  if (!creds) {
    throw new Error('No active AWS Cloud Account credentials found in database to execute EC2 command.');
  }

  const targetRegion = region || creds.account.selectedRegions?.[0] || 'ap-southeast-2';

  const client = new EC2Client({
    region: targetRegion,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });

  let awsResult: any = null;
  let newStatus: 'Online' | 'Offline' | 'Starting' | 'Stopping' | 'Running' | 'Stopped' = 'Online';
  let message = '';

  try {
    if (action === 'stop') {
      const cmd = new StopInstancesCommand({
        InstanceIds: [instanceId],
        Force: false,
      });
      awsResult = await client.send(cmd);
      newStatus = 'Offline';
      message = `AWS EC2 Instance "${instanceId}" stopping command sent successfully.`;
    } else if (action === 'start') {
      const cmd = new StartInstancesCommand({
        InstanceIds: [instanceId],
      });
      awsResult = await client.send(cmd);
      newStatus = 'Online';
      message = `AWS EC2 Instance "${instanceId}" start command dispatched successfully.`;
    } else if (action === 'restart') {
      const cmd = new RebootInstancesCommand({
        InstanceIds: [instanceId],
      });
      awsResult = await client.send(cmd);
      newStatus = 'Online';
      message = `AWS EC2 Instance "${instanceId}" reboot command executed successfully.`;
    }
  } catch (awsErr: any) {
    const errCode = awsErr.Code || awsErr.name || 'AWS_ERROR';
    const errMsg = awsErr.message || 'Unknown AWS error';
    if (errCode === 'AuthFailure') {
      throw new Error(`AWS Authentication Failed: The Access Key ID or Secret Access Key stored in Cloud Accounts is not valid or has expired. (${errMsg})`);
    }
    if (errCode === 'UnauthorizedOperation') {
      throw new Error(`AWS IAM Permission Denied: The IAM user/role lacks ec2:${action === 'stop' ? 'StopInstances' : action === 'start' ? 'StartInstances' : 'RebootInstances'} permissions.`);
    }
    throw new Error(`AWS EC2 Error (${errCode}): ${errMsg}`);
  }

  // Update CloudResource in MongoDB
  const cloudStatus = action === 'stop' ? 'Stopped' : 'Running';
  const powerStateStr = action === 'stop' ? 'VM stopped' : 'VM running';

  await CloudResource.updateMany(
    {
      $or: [
        { resourceId: instanceId, provider: 'aws' },
        { name: instanceId, provider: 'aws' },
      ],
    },
    {
      $set: {
        status: cloudStatus,
        'metadata.powerState': powerStateStr,
        'tags.powerState': powerStateStr,
        lastSyncAt: new Date(),
      },
    }
  );

  // Update any linked Registered Server
  await Server.updateMany(
    {
      $or: [
        { name: instanceId },
        { host: instanceId },
        { 'tags': instanceId },
      ],
    },
    {
      $set: {
        status: newStatus,
        lastError: action === 'stop' ? 'Server stopped by operator' : null,
      },
    }
  );

  return {
    success: true,
    action,
    status: newStatus,
    message,
    provider: 'aws',
    resourceId: instanceId,
    details: awsResult,
  };
}

/**
 * Dynamically resolves the real Resource Group for an Azure Virtual Machine
 * by querying Azure ARM compute API across the subscription or searching all resource groups.
 */
async function resolveAzureVMResourceGroup(
  vmName: string,
  token: string,
  subscriptionId: string
): Promise<{ resourceGroup: string; fullId: string; location?: string } | null> {
  const cleanVmName = (vmName || '').trim().toLowerCase();
  if (!cleanVmName || !subscriptionId || !token) return null;

  try {
    // 1. Query all virtual machines in the subscription directly from Azure ARM
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Compute/virtualMachines?api-version=2023-09-01`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const vms = data.value || [];
      const matched = vms.find(
        (v: any) =>
          (v.name || '').trim().toLowerCase() === cleanVmName ||
          (v.id || '').trim().toLowerCase().endsWith(`/${cleanVmName}`)
      );

      if (matched && matched.id) {
        const rgMatch = matched.id.match(/\/resourcegroups\/([^\/]+)/i);
        if (rgMatch && rgMatch[1]) {
          return {
            resourceGroup: rgMatch[1],
            fullId: matched.id,
            location: matched.location,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[PowerService] Azure subscription VM lookup note:`, err.message);
  }

  // 2. Fallback: Search all resource groups in the subscription
  try {
    const rgListUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`;
    const rgRes = await fetch(rgListUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (rgRes.ok) {
      const rgData = await rgRes.json();
      const rgs = rgData.value || [];
      for (const rgObj of rgs) {
        const rgName = rgObj.name;
        if (!rgName) continue;
        const checkUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rgName}/providers/Microsoft.Compute/virtualMachines/${vmName}?api-version=2023-09-01`;
        const checkRes = await fetch(checkUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (checkRes.ok) {
          const vmData = await checkRes.json();
          return {
            resourceGroup: rgName,
            fullId: vmData.id,
            location: vmData.location,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[PowerService] Resource groups iteration note:`, err.message);
  }

  return null;
}

/**
 * Execute real Azure Virtual Machine power action (Deallocate / Start / Restart)
 */
export async function executeAzurePowerAction({
  vmName,
  resourceGroup,
  subscriptionId,
  action,
}: {
  vmName: string;
  resourceGroup?: string;
  subscriptionId?: string;
  action: PowerAction;
}): Promise<PowerActionResult> {
  const creds = await getAzureCredentials(subscriptionId);
  if (!creds || !creds.subscriptionId) {
    throw new Error('No active Azure Cloud Account credentials found in database to execute VM power command.');
  }

  const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
  const tokenResponse = await credential.getToken('https://management.azure.com/.default');

  if (!tokenResponse || !tokenResponse.token) {
    throw new Error('Failed to acquire Azure AD OAuth2 access token for Azure Resource Manager.');
  }

  let targetRg = (resourceGroup || '').trim();

  // If resourceGroup is missing, placeholder 'default-rg', or empty string, dynamically resolve real RG from Azure ARM
  if (!targetRg || targetRg === 'default-rg') {
    const resolved = await resolveAzureVMResourceGroup(vmName, tokenResponse.token, creds.subscriptionId);
    if (resolved?.resourceGroup) {
      targetRg = resolved.resourceGroup;
      console.log(`[PowerService] 🔍 Auto-discovered real Azure resource group for "${vmName}": "${targetRg}"`);

      // Persist real resourceGroup to CloudResource and Server in MongoDB
      await CloudResource.updateMany(
        { provider: 'azure', $or: [{ name: vmName }, { resourceId: new RegExp(`${vmName}$`, 'i') }] },
        { $set: { resourceGroup: targetRg } }
      );
    }
  }

  // Azure Compute endpoints
  // stop -> deallocate (releases compute reservation & stops billing)
  const operation = action === 'stop' ? 'deallocate' : action === 'start' ? 'start' : 'restart';
  let url = `https://management.azure.com/subscriptions/${creds.subscriptionId}/resourceGroups/${targetRg || 'default-rg'}/providers/Microsoft.Compute/virtualMachines/${vmName}/${operation}?api-version=2023-09-01`;

  let res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenResponse.token}`,
      'Content-Type': 'application/json',
    },
  });

  // If 404 or resource group not found, attempt auto-resolution recovery
  if (res.status === 404 || (!res.ok && res.status !== 202 && res.status !== 200 && res.status !== 204)) {
    const errorBody = await res.clone().json().catch(() => ({}));
    const errMsg = (errorBody?.error?.message || '').toLowerCase();
    if (errMsg.includes('resource group') || errMsg.includes('could not be found') || res.status === 404) {
      console.log(`[PowerService] ⚠️ Resource group "${targetRg}" failed for ${vmName}. Resolving subscription-wide...`);
      const resolved = await resolveAzureVMResourceGroup(vmName, tokenResponse.token, creds.subscriptionId);
      if (resolved?.resourceGroup && resolved.resourceGroup !== targetRg) {
        targetRg = resolved.resourceGroup;
        console.log(`[PowerService] 🔄 Retrying Azure VM ${operation} with discovered resource group "${targetRg}"...`);
        url = `https://management.azure.com/subscriptions/${creds.subscriptionId}/resourceGroups/${targetRg}/providers/Microsoft.Compute/virtualMachines/${vmName}/${operation}?api-version=2023-09-01`;
        res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenResponse.token}`,
            'Content-Type': 'application/json',
          },
        });

        // Persist newly discovered resource group
        await CloudResource.updateMany(
          { provider: 'azure', $or: [{ name: vmName }, { resourceId: new RegExp(`${vmName}$`, 'i') }] },
          { $set: { resourceGroup: targetRg } }
        );
      }
    }
  }

  // Azure typically returns 200 OK or 202 Accepted for async power operations
  if (!res.ok && res.status !== 202 && res.status !== 200 && res.status !== 204) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message ||
        `Azure VM ${operation} failed with status ${res.status}: ${res.statusText}`
    );
  }

  const newStatus: 'Online' | 'Offline' = action === 'stop' ? 'Offline' : 'Online';
  const cloudStatus = action === 'stop' ? 'Stopped' : 'Running';
  const powerStateStr = action === 'stop' ? 'VM deallocated' : 'VM running';

  // Update CloudResource in MongoDB
  await CloudResource.updateMany(
    {
      provider: 'azure',
      $or: [
        { name: vmName },
        { resourceId: new RegExp(`${vmName}$`, 'i') },
      ],
    },
    {
      $set: {
        status: cloudStatus,
        'metadata.powerState': powerStateStr,
        'tags.powerState': powerStateStr,
        resourceGroup: targetRg,
        lastSyncAt: new Date(),
      },
    }
  );

  // Update any linked Registered Server
  await Server.updateMany(
    {
      $or: [
        { name: vmName },
        { host: vmName },
      ],
    },
    {
      $set: {
        status: newStatus,
        lastError: action === 'stop' ? 'Server stopped by operator' : null,
      },
    }
  );

  return {
    success: true,
    action,
    status: newStatus,
    message: `Azure VM "${vmName}" ${action} request accepted by Azure ARM in resource group "${targetRg}".`,
    provider: 'azure',
    resourceId: vmName,
    details: { resourceGroup: targetRg },
  };
}

/**
 * Unified Power Action Dispatcher:
 * Accepts any identifier: Server _id, EC2 Instance ID (i-xxx), Azure VM name, or CloudResource ID.
 * Finds the corresponding real cloud resource and dispatches actual AWS / Azure power commands.
 */
export async function executeUnifiedPowerAction(
  targetId: string,
  action: PowerAction
): Promise<PowerActionResult> {
  await connectToDatabase();

  const cleanTarget = (targetId || '').trim();
  if (!cleanTarget) {
    throw new Error('Target identifier is required for power action.');
  }

  // 1. Check if target is an EC2 Instance ID directly (starts with 'i-')
  if (/^i-[0-9a-f]{8,17}$/i.test(cleanTarget)) {
    // Look up matching CloudResource for region & account
    const cr = await CloudResource.findOne({ resourceId: cleanTarget, provider: 'aws' }).lean();
    return await executeAWSPowerAction({
      instanceId: cleanTarget,
      region: cr?.region,
      accountId: cr?.accountId,
      action,
    });
  }

  // 2. Check if target is a Registered Server by MongoDB _id, host, or name
  let server = null;
  try {
    server = await Server.findById(cleanTarget);
  } catch {
    // Not a valid ObjectId
  }

  if (!server) {
    server = await Server.findOne({
      $or: [{ name: cleanTarget }, { host: cleanTarget }],
    });
  }

  if (server) {
    // Case A: AWS EC2 Server (e.g. siva-vm, web01, gsr-server)
    if (server.cloudProvider === 'aws') {
      // Find matching AWS CloudResource to obtain real EC2 InstanceId (e.g. i-0a31a2b4bf4f02b39)
      const hostTrim = (server.host || '').trim();
      const serverNameTrim = (server.name || '').trim();

      let cr = await CloudResource.findOne({
        provider: 'aws',
        $or: [
          { resourceId: serverNameTrim },
          { name: serverNameTrim },
          { publicIp: hostTrim },
          { privateIp: hostTrim },
          { 'metadata.sshServerId': server._id.toString() },
          { 'tags.sshServerId': server._id.toString() },
        ],
      }).lean();

      let ec2InstanceId = (cr?.resourceId && cr.resourceId.startsWith('i-')) ? cr.resourceId : undefined;
      let targetRegion = cr?.region || server.region || 'ap-southeast-2';

      // Check if instance ID is stored in server tags or metadata
      if (!ec2InstanceId) {
        const tagInstanceId = server.tags?.find((t: string) => /^i-[0-9a-f]{8,17}$/i.test(t));
        if (tagInstanceId) ec2InstanceId = tagInstanceId;
      }

      // If not yet resolved, query AWS directly to discover the instance matching name or IP
      if (!ec2InstanceId) {
        const creds = await getAWSCredentials();
        if (creds) {
          const regionsToSearch = server.region
            ? [server.region]
            : creds.account.selectedRegions?.length
            ? creds.account.selectedRegions
            : ['ap-southeast-2', 'us-east-1'];

          for (const reg of regionsToSearch) {
            try {
              const client = new EC2Client({
                region: reg,
                credentials: {
                  accessKeyId: creds.accessKeyId,
                  secretAccessKey: creds.secretAccessKey,
                },
              });

              const desc = await client.send(
                new DescribeInstancesCommand({
                  Filters: [
                    {
                      Name: 'tag:Name',
                      Values: [serverNameTrim],
                    },
                  ],
                })
              );

              const inst = desc.Reservations?.[0]?.Instances?.[0];
              if (inst && inst.InstanceId) {
                ec2InstanceId = inst.InstanceId;
                targetRegion = reg;
                break;
              }
            } catch (err) {
              console.warn(`[PowerService] Discovery note in ${reg}:`, err);
            }
          }
        }
      }

      if (!ec2InstanceId && serverNameTrim.startsWith('i-')) {
        ec2InstanceId = serverNameTrim;
      }

      if (ec2InstanceId) {
        console.log(`[PowerService] Executing AWS EC2 ${action} for ${server.name} (${ec2InstanceId}) in ${targetRegion}`);
        const result = await executeAWSPowerAction({
          instanceId: ec2InstanceId,
          region: targetRegion,
          accountId: cr?.accountId,
          action,
        });

        // Mirror to server document
        server.status = action === 'stop' ? 'Offline' : 'Online';
        server.lastError = action === 'stop' ? 'Server stopped by operator' : null;
        await server.save();

        if (action === 'start') {
          syncSingleServer(server._id.toString()).catch(() => null);
        }

        return {
          ...result,
          message: `Server "${server.name}" (${ec2InstanceId}) ${action === 'stop' ? 'stopped' : 'started'} in AWS EC2 successfully.`,
        };
      }
    }

    // Case B: Azure Virtual Machine Server (e.g. vm01, vm02, vm03, vm01-schule)
    if (server.cloudProvider === 'azure') {
      const hostTrim = (server.host || '').trim();
      const serverNameTrim = (server.name || '').trim();

      const cr = await CloudResource.findOne({
        provider: 'azure',
        $or: [
          { name: serverNameTrim },
          { publicIp: hostTrim },
          { privateIp: hostTrim },
          { 'metadata.sshServerId': server._id.toString() },
          { resourceId: new RegExp(`${serverNameTrim}$`, 'i') },
        ],
      }).lean();

      const vmName = cr?.name || serverNameTrim;
      let resourceGroup = cr?.resourceGroup;
      if (!resourceGroup || resourceGroup === 'default-rg') {
        const extracted = (cr?.resourceId || '').match(/\/resourcegroups\/([^\/]+)/i)?.[1];
        if (extracted) resourceGroup = extracted;
      }
      const subscriptionId = cr?.subscriptionId;

      console.log(`[PowerService] Executing Azure VM ${action} for ${vmName} (Target RG: "${resourceGroup || 'auto-resolving'}")`);
      const result = await executeAzurePowerAction({
        vmName,
        resourceGroup,
        subscriptionId,
        action,
      });

      server.status = action === 'stop' ? 'Offline' : 'Online';
      server.lastError = action === 'stop' ? 'Server stopped by operator' : null;
      await server.save();

      if (action === 'start') {
        syncSingleServer(server._id.toString()).catch(() => null);
      }

      return {
        ...result,
        message: `Azure VM "${server.name}" ${action === 'stop' ? 'stopped' : 'started'} in Azure successfully.`,
      };
    }

    // Case C: Standard registered Linux host without direct cloud API
    server.status = action === 'stop' ? 'Offline' : 'Online';
    server.lastError = action === 'stop' ? 'Server stopped by operator' : null;
    await server.save();

    if (action === 'start') {
      syncSingleServer(server._id.toString()).catch(() => null);
    }

    return {
      success: true,
      action,
      status: server.status,
      message: `Server "${server.name}" status updated to ${server.status}.`,
      provider: 'other',
      resourceId: server._id.toString(),
    };
  }

  // 3. Check if target is a CloudResource directly (by MongoDB _id or resourceId)
  let cloudRes = null;
  try {
    cloudRes = await CloudResource.findById(cleanTarget).lean();
  } catch {
    // Not an ObjectId
  }

  if (!cloudRes) {
    cloudRes = await CloudResource.findOne({
      $or: [
        { resourceId: cleanTarget },
        { name: cleanTarget },
      ],
    }).lean();
  }

  if (cloudRes) {
    if (cloudRes.provider === 'aws') {
      return await executeAWSPowerAction({
        instanceId: cloudRes.resourceId,
        region: cloudRes.region,
        accountId: cloudRes.accountId,
        action,
      });
    }

    if (cloudRes.provider === 'azure') {
      let rg = cloudRes.resourceGroup;
      if (!rg || rg === 'default-rg') {
        const extracted = (cloudRes.resourceId || '').match(/\/resourcegroups\/([^\/]+)/i)?.[1];
        if (extracted) rg = extracted;
      }
      return await executeAzurePowerAction({
        vmName: cloudRes.name,
        resourceGroup: rg,
        subscriptionId: cloudRes.subscriptionId,
        action,
      });
    }
  }

  throw new Error(`Unable to resolve resource or server with identifier: "${cleanTarget}"`);
}
