import { EC2Client, DescribeInstancesCommand, DescribeRegionsCommand } from '@aws-sdk/client-ec2';
import { AWSCredentials } from './credentials';
import { fetchEC2Metrics } from './metrics';

export interface DiscoveredEC2Instance {
  resourceId: string;
  name: string;
  region: string;
  availabilityZone: string;
  instanceType: string;
  status: string;
  rawState: string;
  privateIp?: string;
  publicIp?: string;
  vpcId?: string;
  subnetId?: string;
  launchTime?: Date;
  tags?: Record<string, string>;
  metrics: {
    cpuUtilization: number | null;
    memoryUtilization: number | null;
    diskUtilization: number | null;
    networkIn: number | null;
    networkOut: number | null;
    lastUpdated: Date;
  };
}

export interface EC2DiscoveryResult {
  region: string;
  success: boolean;
  instances: DiscoveredEC2Instance[];
  error?: string;
}

// Standard AWS regions that are enabled by default (do not require manual account opt-in)
const STANDARD_DEFAULT_REGIONS = new Set([
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ca-central-1',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-south-1',
  'sa-east-1',
]);

// In-memory cache of non-working or policy-denied regions (SCP denied, opt-in required, or AuthFailure)
const inaccessibleRegions = new Set<string>();

let cachedEnabledRegions: string[] | null = null;
let cachedEnabledRegionsTimestamp = 0;

export function isInaccessibleRegion(region: string): boolean {
  return inaccessibleRegions.has(region);
}

export function markRegionInaccessible(region: string): void {
  inaccessibleRegions.add(region);
  if (cachedEnabledRegions) {
    cachedEnabledRegions = cachedEnabledRegions.filter((r) => r !== region);
  }
}

/**
 * Discovers all enabled AWS regions for the connected account dynamically,
 * using DescribeRegions with opt-in status filters and 15-minute in-memory caching.
 */
export async function getEnabledAWSRegions(
  creds?: AWSCredentials,
  fallbackRegions: string[] = [],
  forceRefresh = false
): Promise<string[]> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedEnabledRegions &&
    cachedEnabledRegions.length > 0 &&
    now - cachedEnabledRegionsTimestamp < 15 * 60 * 1000
  ) {
    return cachedEnabledRegions;
  }

  const regionsSet = new Set<string>();
  fallbackRegions.filter(Boolean).forEach((r) => {
    if (!inaccessibleRegions.has(r)) regionsSet.add(r);
  });

  const probeRegion = creds?.region || 'ap-southeast-2';

  try {
    const client = new EC2Client({
      region: probeRegion,
      maxAttempts: 1,
      credentials:
        creds?.accessKeyId && creds?.secretAccessKey
          ? { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey }
          : undefined,
    });

    const command = new DescribeRegionsCommand({
      AllRegions: false,
      Filters: [
        {
          Name: 'opt-in-status',
          Values: ['opt-in-not-required', 'opted-in'],
        },
      ],
    });

    const response = await client.send(command, {
      abortSignal: AbortSignal.timeout(3000),
    });

    if (response.Regions && response.Regions.length > 0) {
      for (const reg of response.Regions) {
        if (reg.RegionName && STANDARD_DEFAULT_REGIONS.has(reg.RegionName) && !inaccessibleRegions.has(reg.RegionName)) {
          regionsSet.add(reg.RegionName);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[AWS EC2] DescribeRegions probe note: ${err?.message || err}`);
  }

  // Ensure primary active region is always present
  if (regionsSet.size === 0) {
    regionsSet.add('ap-southeast-2');
  }

  const result = Array.from(regionsSet);
  cachedEnabledRegions = result;
  cachedEnabledRegionsTimestamp = now;
  return result;
}

/**
 * Discovers EC2 instances in a single AWS region.
 * Handles NextToken pagination and returns clear success/error status.
 * Terminated and shutting-down instances are excluded from active inventory.
 */
export async function discoverEC2InstancesInRegion(
  region: string,
  creds?: AWSCredentials
): Promise<EC2DiscoveryResult> {
  if (inaccessibleRegions.has(region)) {
    return {
      region,
      success: false,
      instances: [],
      error: `Region ${region} is not accessible under current account policies`,
    };
  }

  const instances: DiscoveredEC2Instance[] = [];

  try {
    const client = new EC2Client({
      region,
      maxAttempts: 1,
      credentials:
        creds?.accessKeyId && creds?.secretAccessKey
          ? { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey }
          : undefined,
    });

    let nextToken: string | undefined = undefined;

    do {
      const command: DescribeInstancesCommand = new DescribeInstancesCommand({
        NextToken: nextToken,
      });
      const response = await client.send(command, {
        abortSignal: AbortSignal.timeout(8000),
      });

      if (response.Reservations) {
        for (const res of response.Reservations) {
          for (const inst of res.Instances || []) {
            if (!inst.InstanceId) continue;

            const stateName = (inst.State?.Name || '').toLowerCase();
            // Skip terminated or shutting-down EC2 instances so they disappear completely from active inventory
            if (stateName === 'terminated' || stateName === 'shutting-down') {
              continue;
            }

            const nameTag = inst.Tags?.find((t) => t.Key === 'Name');
            const name = nameTag?.Value || inst.InstanceId;

            // Accurate state (Stopped is preserved, Running is marked Running)
            const status = stateName === 'running' ? 'Running' : 'Stopped';

            // Convert tags to record
            const tagsRecord: Record<string, string> = {};
            if (inst.Tags) {
              for (const tag of inst.Tags) {
                if (tag.Key && tag.Value) {
                  tagsRecord[tag.Key] = tag.Value;
                }
              }
            }

            instances.push({
              resourceId: inst.InstanceId,
              name,
              region,
              availabilityZone: inst.Placement?.AvailabilityZone || `${region}a`,
              instanceType: inst.InstanceType || 't3.micro',
              status,
              rawState: stateName,
              privateIp: inst.PrivateIpAddress,
              publicIp: inst.PublicIpAddress,
              vpcId: inst.VpcId,
              subnetId: inst.SubnetId,
              launchTime: inst.LaunchTime,
              tags: tagsRecord,
              metrics: {
                cpuUtilization: null,
                memoryUtilization: null,
                diskUtilization: null,
                networkIn: null,
                networkOut: null,
                lastUpdated: new Date(),
              },
            });
          }
        }
      }

      nextToken = response.NextToken;
    } while (nextToken);

    // Fetch CloudWatch metrics in parallel with rapid timeout so instance inventory is never blocked
    if (instances.length > 0) {
      await Promise.allSettled(
        instances.map(async (item) => {
          try {
            const m = await fetchEC2Metrics(item.resourceId, region, creds);
            if (m.cpuUtilization !== null) item.metrics.cpuUtilization = m.cpuUtilization;
            if (m.networkIn !== null) item.metrics.networkIn = m.networkIn;
            if (m.networkOut !== null) item.metrics.networkOut = m.networkOut;
          } catch {}
        })
      );
    }

    return {
      region,
      success: true,
      instances,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    // Mark region as inaccessible if SCP denied, AuthFailure, or unreachable
    if (
      msg.includes('service control policy') ||
      msg.includes('UnauthorizedOperation') ||
      msg.includes('AuthFailure') ||
      msg.includes('validate the provided access credentials') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('aborted') ||
      err?.name === 'AbortError' ||
      err?.name === 'TimeoutError'
    ) {
      markRegionInaccessible(region);
    }
    console.warn(`[AWS EC2] Discovery note in ${region}: ${msg}`);
    return {
      region,
      success: false,
      instances: [],
      error: msg,
    };
  }
}
