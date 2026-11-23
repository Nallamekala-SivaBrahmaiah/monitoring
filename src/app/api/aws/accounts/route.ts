import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';

export async function GET() {
  try {
    await connectToDatabase();
    const accounts = await CloudAccount.find({ provider: 'aws' }).lean();
    return NextResponse.json(
      accounts.map((acc: any) => ({
        id: acc._id.toString(),
        accountName: acc.accountName,
        accountId: acc.accountId || acc._id.toString(),
        roleArn: acc.roleArn || '',
        status: acc.status || 'Connected',
        enabledRegions: acc.selectedRegions || acc.availableRegions || [],
        resourcesCount: acc.resourcesCount || 0,
        lastSync: acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleTimeString() : 'Never',
      }))
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch AWS accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const accountName = body.accountName || 'AWS Account';
    const accountId = body.accountId?.trim() || `aws-${Date.now()}`;
    const roleArn = body.roleArn?.trim();
    const enabledRegions = body.enabledRegions || ['us-east-1', 'us-west-2'];

    const newAccount: any = await CloudAccount.create({
      provider: 'aws',
      accountName,
      accountId,
      roleArn,
      authType: roleArn ? 'iam_role' : 'access_keys',
      status: 'Connected',
      selectedRegions: enabledRegions,
      availableRegions: enabledRegions,
      resourcesCount: 0,
      lastSyncAt: new Date(),
    });

    return NextResponse.json(
      {
        id: newAccount._id.toString(),
        accountName: newAccount.accountName,
        accountId: newAccount.accountId,
        roleArn: newAccount.roleArn,
        status: newAccount.status,
        enabledRegions: newAccount.selectedRegions,
        resourcesCount: newAccount.resourcesCount,
        lastSync: 'Just now',
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create AWS account' }, { status: 400 });
  }
}
