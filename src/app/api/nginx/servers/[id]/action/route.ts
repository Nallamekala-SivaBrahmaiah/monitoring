import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import { executeNginxServiceAction, queryServerDetails } from '@/lib/nginx/nginxEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const validActions = ['install', 'start', 'stop', 'restart', 'reload', 'test'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const res = await executeNginxServiceAction(server.toObject(), action);

    // Refresh server status in background
    queryServerDetails(server.toObject()).then(async (details) => {
      if (details.success) {
        server.nginxStatus = details.nginxStatus;
        server.nginxInstalled = details.nginxInstalled;
        server.nginxVersion = details.nginxVersion || '';
        await server.save();
      }
    }).catch(() => {});

    return NextResponse.json({
      success: res.success,
      action,
      output: res.output,
      message: res.success
        ? `Nginx action "${action}" completed successfully.`
        : `Nginx action "${action}" reported an issue.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

