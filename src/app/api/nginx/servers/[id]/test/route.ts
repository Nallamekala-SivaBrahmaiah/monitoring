import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import { testNginxServerConnection } from '@/lib/nginx/nginxEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const testRes = await testNginxServerConnection(server.toObject());

    if (testRes.success) {
      server.connectionStatus = 'Online';
      server.lastConnectedAt = new Date();
      if (testRes.osInfo) server.osName = testRes.osInfo;
    } else {
      server.connectionStatus = 'Failed';
    }
    await server.save();

    return NextResponse.json({
      success: testRes.success,
      latencyMs: testRes.latencyMs,
      osInfo: testRes.osInfo,
      error: testRes.error,
      connectionStatus: server.connectionStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

