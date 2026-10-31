import { EC2Client, DescribeRegionsCommand } from '@aws-sdk/client-ec2';
import { AWSCredentials } from './credentials';

export async function discoverAWSRegions(
  creds?: AWSCredentials
): Promise<{ code: string; name: string }[]> {
  try {
    const client = new EC2Client({
      region: creds?.region || 'us-east-1',
      credentials:
        creds?.accessKeyId && creds?.secretAccessKey
          ? {
              accessKeyId: creds.accessKeyId,
              secretAccessKey: creds.secretAccessKey,
            }
          : undefined,
    });

    const command = new DescribeRegionsCommand({ AllRegions: true });
    const response = await client.send(command);

    if (!response.Regions) return [];

    return response.Regions.filter((r) => r.RegionName && r.OptInStatus !== 'not-opted-in').map((r) => ({
      code: r.RegionName!,
      name: r.RegionName!,
    }));
  } catch (err) {
    console.warn('[AWS] Region discovery fallback note:', err);
    return [];
  }
}
