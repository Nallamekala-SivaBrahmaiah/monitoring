import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import NginxApp from '@/models/NginxApp';
import { rollbackAppToCommit } from '@/lib/nginx/nginxEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  try {
    await connectToDatabase();
    const { id, appId } = await params;
    const body = await req.json().catch(() => ({}));
    const { targetCommit } = body;

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const app = await NginxApp.findOne({ _id: appId, serverId: id });
    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const commitToRestore = targetCommit || app.lastSuccessfulCommit;
    if (!commitToRestore || commitToRestore === 'UNKNOWN') {
      return NextResponse.json(
        { success: false, error: 'No previous working commit recorded for rollback.' },
        { status: 400 }
      );
    }

    const result = await rollbackAppToCommit(server.toObject(), app.toObject(), commitToRestore);

    if (result.success) {
      app.currentCommit = commitToRestore;
      app.status = 'Deployed';
      app.healthStatus = 'Healthy';
      await app.save();
    }

    return NextResponse.json({
      success: result.success,
      output: result.output,
      commitRestored: commitToRestore,
      app: app.toObject(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
