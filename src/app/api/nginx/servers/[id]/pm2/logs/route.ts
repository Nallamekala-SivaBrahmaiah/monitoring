import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { fetchPM2LogOutput, resolveServerForNginx } from '@/lib/nginx/nginxEngine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const appName = searchParams.get('app') || undefined;
    const lines = parseInt(searchParams.get('lines') || '200', 10);

    const server = await resolveServerForNginx(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const res = await fetchPM2LogOutput(server, appName, lines);
    return NextResponse.json({
      success: res.success,
      serverId: server._id?.toString() || id,
      serverName: server.name,
      output: res.output,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
