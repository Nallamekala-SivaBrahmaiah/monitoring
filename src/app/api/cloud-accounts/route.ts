import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import { validateAzureCredentials } from '@/lib/azure/credentials';
import { discoverAzureRegions } from '@/lib/azure/regions';
import { saveAzureSubscription } from '@/lib/azure/subscriptions';
import { validateAWSCredentials } from '@/lib/aws/credentials';
import { discoverAWSRegions } from '@/lib/aws/regions';



export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const query: any = {};
    if (provider && provider !== 'all') {
      query.provider = provider;
    }

    const accounts = await CloudAccount.find(query).lean();

    return NextResponse.json(
      accounts.map((acc: any) => ({
        id: acc._id.toString(),
        accountName: acc.accountName,
        accountId: acc.accountId || acc.subscriptionId,
        subscriptionId: acc.subscriptionId,
        tenantId: acc.tenantId,
        clientId: acc.clientId,
        provider: acc.provider,
        authType: acc.authType,
        status: acc.status,
        availableRegions: acc.availableRegions || [],
        selectedRegions: acc.selectedRegions || [],
        enabledRegions: acc.selectedRegions || [],
        resourcesCount: acc.resourcesCount || 0,
        lastSync: acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleTimeString() : 'Never',
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch cloud accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { provider } = body;

    if (provider === 'azure') {
      const { subscriptionName, subscriptionId, tenantId, clientId, clientSecret, regions } = body;
      if (!subscriptionId || !tenantId || !clientId || !clientSecret) {
        return NextResponse.json({ error: 'All Azure credentials are required' }, { status: 400 });
      }

      const saved = await saveAzureSubscription({
        subscriptionName,
        subscriptionId,
        tenantId,
        clientId,
        clientSecret,
        selectedRegions: regions,
      });

      return NextResponse.json(saved, { status: 201 });
    }

    if (provider === 'aws') {
      const { accountName, accountId, accessKeyId, secretAccessKey, roleArn, regions } = body;
      if (!accountName || (!roleArn && (!accessKeyId || !secretAccessKey))) {
        return NextResponse.json({ error: 'AWS credentials or Role ARN are required' }, { status: 400 });
      }

      let callerAccount = accountId;
      if (accessKeyId && secretAccessKey) {
        const val = await validateAWSCredentials({ accessKeyId, secretAccessKey });
        if (!val.success) {
          return NextResponse.json({ error: val.error || 'AWS verification failed' }, { status: 400 });
        }
        callerAccount = callerAccount || val.accountId || 'aws-account';
      }

      const discoveredRegs = await discoverAWSRegions(
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined
      );
      const allCodes = discoveredRegs.map((r) => r.code);
      const enabled = regions && regions.length > 0 ? regions : allCodes.length > 0 ? allCodes : ['us-east-1'];

      const account = await CloudAccount.findOneAndUpdate(
        { provider: 'aws', accountId: callerAccount },
        {
          provider: 'aws',
          accountName,
          accountId: callerAccount,
          roleArn,
          accessKeyId,
          secretAccessKey,
          authType: roleArn ? 'iam_role' : 'access_keys',
          status: 'Connected',
          availableRegions: allCodes,
          selectedRegions: enabled,
          lastSyncAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json(
        {
          id: account._id.toString(),
          accountName: account.accountName,
          accountId: account.accountId,
          roleArn: account.roleArn,
          status: account.status,
          enabledRegions: account.selectedRegions,
          resourcesCount: account.resourcesCount,
          lastSync: 'Just now',
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: 'Unsupported cloud provider' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save cloud account' }, { status: 500 });
  }
}
