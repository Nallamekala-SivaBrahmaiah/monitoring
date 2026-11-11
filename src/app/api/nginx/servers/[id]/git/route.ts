import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import { discoverGitRepositories, executeGitAction } from '@/lib/nginx/nginxEngine';

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

    const repos = await discoverGitRepositories(server.toObject());
    return NextResponse.json({
      success: true,
      repos,
      count: repos.length,
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
    const { repoPath, action, param } = body;

    if (!repoPath || !action) {
      return NextResponse.json({ success: false, error: 'repoPath and action are required.' }, { status: 400 });
    }

    const validActions = ['checkout', 'fetch', 'pull', 'branch', 'status', 'log', 'commit'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, error: `Invalid action. Valid: ${validActions.join(', ')}` }, { status: 400 });
    }

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const res = await executeGitAction(server.toObject(), repoPath, action, param);
    return NextResponse.json({
      success: res.success,
      output: res.output,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
