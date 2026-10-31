import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { AWSCredentials } from './credentials';

export interface AWSMetricsResult {
  cpuUtilization: number | null;
  networkIn: number | null;
  networkOut: number | null;
}

export async function fetchEC2Metrics(
  instanceId: string,
  region: string,
  creds?: AWSCredentials
): Promise<AWSMetricsResult> {
  const result: AWSMetricsResult = {
    cpuUtilization: null,
    networkIn: null,
    networkOut: null,
  };

  try {
    const client = new CloudWatchClient({
      region,
      credentials:
        creds?.accessKeyId && creds?.secretAccessKey
          ? { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey }
          : undefined,
    });

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 3600 * 1000);

    const command = new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: [
        {
          Id: 'cpu',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
            },
            Period: 300,
            Stat: 'Average',
          },
        },
      ],
    });

    const response = await client.send(command);
    const cpuResults = response.MetricDataResults?.find((r) => r.Id === 'cpu');
    if (cpuResults?.Values && cpuResults.Values.length > 0) {
      result.cpuUtilization = Math.round(cpuResults.Values[0] * 10) / 10;
    }
  } catch (err) {
    // CloudWatch metrics unavailable or permission not granted
  }

  return result;
}
