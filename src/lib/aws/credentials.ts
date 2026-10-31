import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

export interface AWSCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

export function getSTSClient(creds?: AWSCredentials): STSClient {
  return new STSClient({
    region: creds?.region || 'us-east-1',
    credentials:
      creds?.accessKeyId && creds?.secretAccessKey
        ? {
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
          }
        : undefined,
  });
}

export async function validateAWSCredentials(
  creds: { accessKeyId: string; secretAccessKey: string; region?: string }
): Promise<{ success: boolean; accountId?: string; arn?: string; userId?: string; error?: string }> {
  try {
    const client = getSTSClient(creds);
    const command = new GetCallerIdentityCommand({});
    const response = await client.send(command);

    return {
      success: true,
      accountId: response.Account,
      arn: response.Arn,
      userId: response.UserId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'AWS credential verification failed (STS GetCallerIdentity)',
    };
  }
}
