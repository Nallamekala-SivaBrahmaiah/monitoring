import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { AWSCredentials } from './credentials';
import { fetchEC2Metrics } from './metrics';

export interface DiscoveredEC2Instance {
  resourceId: string;
  name: string;
  region: string;
  instanceType: string;
  status: string;
  privateIp?: string;
  publicIp?: string;
  metrics: {
    cpuUtilization: number | null;
    memoryUtilization: number | null;
    diskUtilization: number | null;
    networkIn: number | null;
    networkOut: number | null;
    lastUpdated: Date;
  };
}

export async function discoverEC2InstancesInRegion(
  region: string,
  creds?: AWSCredentials
): Promise<DiscoveredEC2Instance[]> {
  const instances: DiscoveredEC2Instance[] = [];

  try {
    const client = new EC2Client({
      region,
      credentials:
        creds?.accessKeyId && creds?.secretAccessKey
          ? { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey }
          : undefined,
    });

    const command = new DescribeInstancesCommand({});
    const response = await client.send(command);

    if (!response.Reservations) return [];

    for (const res of response.Reservations) {
      for (const inst of res.Instances || []) {
        if (!inst.InstanceId) continue;

        const nameTag = inst.Tags?.find((t) => t.Key === 'Name');
        const name = nameTag?.Value || inst.InstanceId;

        const status = inst.State?.Name === 'running' ? 'Running' : 'Stopped';
        const instanceMetrics = await fetchEC2Metrics(inst.InstanceId, region, creds);

        instances.push({
          resourceId: inst.InstanceId,
          name,
          region,
          instanceType: inst.InstanceType || 'unknown',
          status,
          privateIp: inst.PrivateIpAddress,
          publicIp: inst.PublicIpAddress,
          metrics: {
            cpuUtilization: instanceMetrics.cpuUtilization,
            memoryUtilization: null, // EC2 CloudWatch guest memory requires CloudWatch Agent
            diskUtilization: null,
            networkIn: instanceMetrics.networkIn,
            networkOut: instanceMetrics.networkOut,
            lastUpdated: new Date(),
          },
        });
      }
    }
  } catch (err) {
    console.warn(`[AWS EC2] Discovery note in ${region}:`, err);
  }

  return instances;
}
