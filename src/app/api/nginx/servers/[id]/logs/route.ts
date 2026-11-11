import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import { fetchNginxLogFile } from '@/lib/nginx/nginxEngine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const type = (searchParams.get('type') || 'access') as 'access' | 'error';
    const lines = parseInt(searchParams.get('lines') || '200', 10);
    const filter = searchParams.get('filter') || '';

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const logRes = await fetchNginxLogFile(server.toObject(), type, lines, filter);

    return NextResponse.json({
      success: logRes.success,
      type,
      lines: logRes.logLines,
      raw: logRes.raw,
      error: logRes.error,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

