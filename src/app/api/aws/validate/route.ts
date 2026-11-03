import { NextRequest, NextResponse } from 'next/server';
import { validateAWSCredentials } from '@/lib/aws/credentials';
import { discoverAWSRegions } from '@/lib/aws/regions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessKeyId, secretAccessKey, region } = body;

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { success: false, error: 'Both AWS Access Key ID and Secret Access Key are required.' },
        { status: 400 }
      );
    }

    const validation = await validateAWSCredentials({
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      region: region || 'us-east-1',
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'AWS authentication failed. Please check your Access Key and Secret Key.',
        },
        { status: 400 }
      );
    }

    // Discover accessible regions
    const regions = await discoverAWSRegions({
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      region: region || 'us-east-1',
    });

    return NextResponse.json({
      success: true,
      accountId: validation.accountId,
      arn: validation.arn,
      userId: validation.userId,
      regionsCount: regions.length,
      regions,
      message: `Successfully connected to AWS Account ${validation.accountId || ''}! Discovered ${regions.length} regions.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error validating AWS credentials' },
      { status: 500 }
    );
  }
}

