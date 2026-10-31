import { NextResponse } from 'next/server';
import { mockCloudAccounts } from '@/mock/monitoringData';

export async function GET() {
  return NextResponse.json(mockCloudAccounts);
}
