import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import { queryServerDetails, executePM2Action } from '@/lib/nginx/nginxEngine';

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
    return NextResponse.json({
      success: true,
      pm2Installed: details.pm2Installed,
      pm2Count: details.pm2Count,
      pm2RunningCount: details.pm2RunningCount,
      pm2FailedCount: details.pm2FailedCount,
      processes: details.pm2Processes || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { action, target = 'all' } = body;

    const validActions = ['install', 'start', 'stop', 'restart', 'reload', 'delete', 'clear'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid PM2 action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const res = await executePM2Action(server.toObject(), action, target);
    return NextResponse.json({
      success: res.success,
      action,
      target,
      output: res.output,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

