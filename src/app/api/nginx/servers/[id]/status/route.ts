import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import { queryServerDetails } from '@/lib/nginx/nginxEngine';

export async function GET(
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

    const details = await queryServerDetails(server.toObject());

    if (details.success) {
      server.connectionStatus = 'Online';
      server.lastConnectedAt = new Date();
      server.nginxInstalled = details.nginxInstalled;
      server.nginxVersion = details.nginxVersion || '';
      server.nginxStatus = details.nginxStatus;
      server.nginxPorts = details.nginxPorts || [];
      server.nginxWorkerCount = details.nginxWorkerCount || 0;
      server.pm2Installed = details.pm2Installed;
      server.pm2Count = details.pm2Count || 0;
      server.pm2RunningCount = details.pm2RunningCount || 0;
      server.pm2FailedCount = details.pm2FailedCount || 0;
      if (details.metrics) {
        server.metrics = details.metrics;
      }
      await server.save();
    } else {
      server.connectionStatus = 'Failed';
      await server.save();
    }

    return NextResponse.json({
      success: details.success,
      details,
      server: {
        _id: server._id,
        name: server.name,
        host: server.host,
        status: server.connectionStatus,
        nginxStatus: server.nginxStatus,
        pm2Status: server.pm2Installed ? 'INSTALLED' : 'NOT_INSTALLED',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

