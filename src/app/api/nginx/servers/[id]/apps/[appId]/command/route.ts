import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import NginxApp from '@/models/NginxApp';
import { executeAppQuickCommand } from '@/lib/nginx/nginxEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  try {
    await connectToDatabase();
    const { id, appId } = await params;
    const body = await req.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json({ success: false, error: 'Command key is required.' }, { status: 400 });
    }

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const app = await NginxApp.findOne({ _id: appId, serverId: id });
    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const result = await executeAppQuickCommand(server.toObject(), app.toObject(), command);

    return NextResponse.json({
      success: result.success,
      command,
      output: result.output,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
