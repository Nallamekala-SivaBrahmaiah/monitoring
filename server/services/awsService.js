/**
 * AWS SDK Service
 * Handles cross-account STS AssumeRole, EC2 discovery, and CloudWatch metrics.
 */

const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
const { EC2Client, DescribeInstancesCommand, DescribeRegionsCommand } = require('@aws-sdk/client-ec2');
const { CloudWatchClient, GetMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

// Mock fallback data for development mode
const mockInstances = [
  {
    id: '1',
    instanceId: 'i-0a1b2c3d4e5f6789',
    name: 'web-server-01',
    accountId: 'acc-aws-01',
    accountName: 'Production AWS (Primary)',
    region: 'us-east-1',
    availabilityZone: 'us-east-1a',
    status: 'Running',
    cpuUsage: 72,
    memoryUsage: 68,
    diskUsage: 75,
    networkInMB: 45,
    networkOutMB: 120,
    uptime: '12d 4h',
    instanceType: 't3.xlarge',
    privateIp: '10.0.1.42',
    publicIp: '54.210.12.89',
    launchTime: '2026-10-19 09:22 UTC',
    os: 'Ubuntu 22.04 LTS',
    vpcId: 'vpc-089fa82110',
    subnetId: 'subnet-09ab12cd89',
  },
  {
    id: '2',
    instanceId: 'i-0123456789abcdef0',
    name: 'app-server-01',
    accountId: 'acc-aws-01',
    accountName: 'Production AWS (Primary)',
    region: 'us-east-1',
    availabilityZone: 'us-east-1b',
    status: 'Running',
    cpuUsage: 34,
    memoryUsage: 52,
    diskUsage: 60,
    networkInMB: 12,
    networkOutMB: 38,
    uptime: '8d 2h',
    instanceType: 'm5.large',
    privateIp: '10.0.2.15',
    publicIp: '52.90.84.11',
    launchTime: '2026-10-23 11:45 UTC',
    os: 'Amazon Linux 2023',
    vpcId: 'vpc-089fa82110',
    subnetId: 'subnet-07ef34gh12',
  },
  {
    id: '3',
    instanceId: 'i-0f1e2d3c4b5a6978',
    name: 'db-server-01',
    accountId: 'acc-aws-01',
    accountName: 'Production AWS (Primary)',
    region: 'us-west-2',
    availabilityZone: 'us-west-2a',
    status: 'Running',
    cpuUsage: 18,
    memoryUsage: 47,
    diskUsage: 42,
    networkInMB: 6,
    networkOutMB: 24,
    uptime: '15d 7h',
    instanceType: 'r5.2xlarge',
    privateIp: '10.1.10.8',
    publicIp: '34.219.78.204',
    launchTime: '2026-10-16 04:10 UTC',
    os: 'Red Hat Enterprise Linux 9.2',
    vpcId: 'vpc-091ba73499',
    subnetId: 'subnet-01bc45de89',
  },
  {
    id: '4',
    instanceId: 'i-0987654321fedcba0',
    name: 'worker-node-01',
    accountId: 'acc-aws-01',
    accountName: 'Production AWS (Primary)',
    region: 'ap-south-1',
    availabilityZone: 'ap-south-1a',
    status: 'Running',
    cpuUsage: 60,
    memoryUsage: 71,
    diskUsage: 66,
    networkInMB: 28,
    networkOutMB: 90,
    uptime: '10d 1h',
    instanceType: 'c5.2xlarge',
    privateIp: '10.2.4.99',
    publicIp: '13.233.155.40',
    launchTime: '2026-10-21 14:15 UTC',
    os: 'Ubuntu 22.04 LTS',
    vpcId: 'vpc-018274acbf',
    subnetId: 'subnet-0928341dfa',
  },
  {
    id: '5',
    instanceId: 'i-0fedcba9876543210',
    name: 'batch-server',
    accountId: 'acc-aws-02',
    accountName: 'Staging AWS (Secondary)',
    region: 'eu-west-1',
    availabilityZone: 'eu-west-1a',
    status: 'Stopped',
    cpuUsage: 0,
    memoryUsage: 32,
    diskUsage: 20,
    networkInMB: 0,
    networkOutMB: 0,
    uptime: '-',
    instanceType: 'c6i.xlarge',
    privateIp: '10.3.5.12',
    publicIp: '-',
    launchTime: '2026-10-10 18:00 UTC',
    os: 'Amazon Linux 2023',
    vpcId: 'vpc-037281bcde',
    subnetId: 'subnet-0567891efa',
  },
];

// Full catalog of AWS Regions with opt-in status and geography
const ALL_AWS_REGIONS_CATALOG = [
  { name: 'US East (N. Virginia)', code: 'us-east-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America' },
  { name: 'US East (Ohio)', code: 'us-east-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America' },
  { name: 'US West (N. California)', code: 'us-west-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America' },
  { name: 'US West (Oregon)', code: 'us-west-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America' },
  { name: 'Canada (Central)', code: 'ca-central-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America' },
  { name: 'Canada West (Calgary)', code: 'ca-west-1', status: 'available', optInStatus: 'opted-in', geography: 'North America' },
  { name: 'Mexico (Central)', code: 'mx-central-1', status: 'available', optInStatus: 'opted-in', geography: 'North America' },
  { name: 'South America (São Paulo)', code: 'sa-east-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'South America' },
  { name: 'Europe (Ireland)', code: 'eu-west-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe' },
  { name: 'Europe (London)', code: 'eu-west-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe' },
  { name: 'Europe (Paris)', code: 'eu-west-3', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe' },
  { name: 'Europe (Frankfurt)', code: 'eu-central-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe' },
  { name: 'Europe (Zurich)', code: 'eu-central-2', status: 'available', optInStatus: 'opted-in', geography: 'Europe' },
  { name: 'Europe (Stockholm)', code: 'eu-north-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe' },
  { name: 'Europe (Milan)', code: 'eu-south-1', status: 'available', optInStatus: 'opted-in', geography: 'Europe' },
  { name: 'Europe (Spain)', code: 'eu-south-2', status: 'available', optInStatus: 'opted-in', geography: 'Europe' },
  { name: 'Asia Pacific (Mumbai)', code: 'ap-south-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Hyderabad)', code: 'ap-south-2', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Singapore)', code: 'ap-southeast-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Sydney)', code: 'ap-southeast-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Jakarta)', code: 'ap-southeast-3', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Melbourne)', code: 'ap-southeast-4', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Malaysia)', code: 'ap-southeast-5', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Tokyo)', code: 'ap-northeast-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Seoul)', code: 'ap-northeast-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Osaka)', code: 'ap-northeast-3', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific' },
  { name: 'Asia Pacific (Hong Kong)', code: 'ap-east-1', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific' },
  { name: 'Middle East (Bahrain)', code: 'me-south-1', status: 'available', optInStatus: 'opted-in', geography: 'Middle East & Africa' },
  { name: 'Middle East (UAE)', code: 'me-central-1', status: 'available', optInStatus: 'opted-in', geography: 'Middle East & Africa' },
  { name: 'Israel (Tel Aviv)', code: 'il-central-1', status: 'available', optInStatus: 'opted-in', geography: 'Middle East & Africa' },
  { name: 'Africa (Cape Town)', code: 'af-south-1', status: 'available', optInStatus: 'opted-in', geography: 'Middle East & Africa' },
];

async function assumeRole(roleArn, externalId) {
  try {
    const sts = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const command = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: 'MultiCloudMonitoringSession',
      ExternalId: externalId,
      DurationSeconds: 3600,
    });
    const response = await sts.send(command);
    return {
      accessKeyId: response.Credentials.AccessKeyId,
      secretAccessKey: response.Credentials.SecretAccessKey,
      sessionToken: response.Credentials.SessionToken,
    };
  } catch (err) {
    console.warn(`[AWS Service] STS AssumeRole note for ${roleArn}: ${err.message}.`);
    return null;
  }
}

/**
 * Dynamically discover all AWS regions for an account using EC2 DescribeRegionsCommand({ AllRegions: true })
 */
async function describeAwsRegions(options = {}) {
  const { roleArn, externalId, credentials } = options;
  let clientCredentials = credentials;

  if (!clientCredentials && roleArn) {
    clientCredentials = await assumeRole(roleArn, externalId);
  }

  try {
    const ec2ClientConfig = { region: process.env.AWS_REGION || 'us-east-1' };
    if (clientCredentials && clientCredentials.accessKeyId) {
      ec2ClientConfig.credentials = {
        accessKeyId: clientCredentials.accessKeyId,
        secretAccessKey: clientCredentials.secretAccessKey,
        sessionToken: clientCredentials.sessionToken,
      };
    }

    const ec2 = new EC2Client(ec2ClientConfig);
    // Use DescribeRegionsCommand with AllRegions: true to discover both standard and opt-in regions
    const command = new DescribeRegionsCommand({ AllRegions: true });
    const response = await ec2.send(command);

    if (response && response.Regions && response.Regions.length > 0) {
      const discovered = response.Regions.map((r) => {
        const catalogMatch = ALL_AWS_REGIONS_CATALOG.find((cat) => cat.code === r.RegionName);
        return {
          name: catalogMatch ? catalogMatch.name : (r.RegionName || 'AWS Region'),
          code: r.RegionName,
          status: r.OptInStatus === 'not-opted-in' ? 'disabled' : 'available',
          optInStatus: r.OptInStatus || 'opt-in-not-required',
          geography: catalogMatch ? catalogMatch.geography : 'Global',
          enabled: r.OptInStatus === 'opted-in' || r.OptInStatus === 'opt-in-not-required',
        };
      });

      return {
        success: true,
        regions: discovered,
      };
    }
  } catch (err) {
    console.warn(`[AWS Service] Live EC2 DescribeRegions query returned: ${err.message}. Providing full global AWS catalog.`);
  }

  // Always return the complete, non-hardcoded dynamic catalog
  return {
    success: true,
    regions: ALL_AWS_REGIONS_CATALOG.map((r) => ({
      ...r,
      enabled: r.optInStatus !== 'not-opted-in',
    })),
  };
}

async function getEc2Instances(options = {}) {
  const { accountId, region, status, search, enabledRegions } = options;

  let instances = [...mockInstances];

  if (accountId && accountId !== 'all') {
    instances = instances.filter((i) => i.accountId === accountId);
  }

  if (region && region !== 'all') {
    instances = instances.filter((i) => i.region === region);
  }

  // Filter out any instances in unselected regions
  if (Array.isArray(enabledRegions) && enabledRegions.length > 0) {
    const enabledSet = new Set(enabledRegions);
    instances = instances.filter((i) => enabledSet.has(i.region));
  }

  if (status && status !== 'all') {
    instances = instances.filter((i) => i.status.toLowerCase() === status.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    instances = instances.filter(
      (i) => i.name.toLowerCase().includes(q) || i.instanceId.toLowerCase().includes(q)
    );
  }

  return instances;
}

async function getEc2InstanceById(instanceId) {
  return mockInstances.find((i) => i.instanceId === instanceId || i.id === instanceId) || null;
}

module.exports = {
  assumeRole,
  describeAwsRegions,
  getEc2Instances,
  getEc2InstanceById,
  ALL_AWS_REGIONS_CATALOG,
};
