import { NextRequest, NextResponse } from 'next/server';
import { mockAwsAccounts } from '@/mock/monitoringData';

let accounts = [...mockAwsAccounts];

export async function GET() {
  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newAccount = {
      id: `acc-aws-${Date.now()}`,
      accountName: body.accountName || 'AWS Account',
      accountId: body.accountId || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      roleArn: body.roleArn,
      externalId: body.externalId,
      status: 'Connected' as const,
      enabledRegions: body.enabledRegions || ['us-east-1', 'us-west-2'],
      resourcesCount: (body.enabledRegions?.length || 2) * 4,
      lastSync: 'Just now',
    };
    accounts.push(newAccount);
    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create AWS account connection' }, { status: 400 });
  }
}
