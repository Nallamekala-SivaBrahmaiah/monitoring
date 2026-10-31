import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';



export async function GET() {
  try {
    await connectToDatabase();
    const accounts = await CloudAccount.find().lean();

    return NextResponse.json(
      accounts.map((acc: any) => ({
        id: acc._id.toString(),
        accountName: acc.accountName,
        accountId: acc.accountId || acc.subscriptionId,
        provider: acc.provider,
        status: acc.status,
        resourcesCount: acc.resourcesCount || 0,
        lastSync: acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleTimeString() : 'Never',
      }))
    );
  } catch (err: any) {
    return NextResponse.json([], { status: 200 });
  }
}
