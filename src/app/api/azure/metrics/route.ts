import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import CloudAccount from '@/models/CloudAccount';
import { getAzureCredential } from '@/lib/azure/credentials';
import { fetchAzureVMMetrics } from '@/lib/azure/metrics';



export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resourceUri = searchParams.get('resourceUri');
  const subscriptionId = searchParams.get('subscriptionId');

  if (!resourceUri) {
    return NextResponse.json({ error: 'resourceUri parameter is required' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    let account = null;

    if (subscriptionId) {
      account = await CloudAccount.findOne({ provider: 'azure', subscriptionId })
        .select('+clientSecret')
        .lean();
    } else {
      account = await CloudAccount.findOne({ provider: 'azure', status: 'Connected' })
        .select('+clientSecret')
        .lean();
    }

    if (!account?.tenantId || !account?.clientId || !account?.clientSecret) {
      // Return metric unavailable
      return NextResponse.json({
        cpuUtilization: null,
        memoryUtilization: null,
        diskUtilization: null,
        networkIn: null,
        networkOut: null,
        message: 'Metric unavailable - no active Azure credentials',
      });
    }

    const cred = getAzureCredential({
      tenantId: account.tenantId,
      clientId: account.clientId,
      clientSecret: account.clientSecret,
    });
    const token = await cred.getToken('https://management.azure.com/.default');

    const metrics = await fetchAzureVMMetrics(resourceUri, token.token);

    // Update resource in MongoDB
    await CloudResource.updateOne(
      { resourceId: resourceUri },
      { $set: { metrics: { ...metrics, lastUpdated: new Date() } } }
    );

    return NextResponse.json(metrics);
  } catch (err: any) {
    return NextResponse.json(
      {
        cpuUtilization: null,
        memoryUtilization: null,
        diskUtilization: null,
        networkIn: null,
        networkOut: null,
        error: err.message || 'Metric unavailable',
      },
      { status: 200 }
    );
  }
}
