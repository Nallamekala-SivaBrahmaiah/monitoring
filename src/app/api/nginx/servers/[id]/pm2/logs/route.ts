import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import { fetchPM2LogOutput } from '@/lib/nginx/nginxEngine';

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

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const res = await fetchPM2LogOutput(server.toObject(), appName, lines);
    return NextResponse.json({
      success: res.success,
      output: res.output,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

