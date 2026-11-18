import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import { executePipelineStep } from '@/lib/nginx/nginxEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const { repoPath, branch = 'main', gitRepoUrl, step, installCmd, buildCmd, pm2AppName, customCmd } = body;

    if (!repoPath || !step) {
      return NextResponse.json(
        { success: false, error: 'repoPath and step are required.' },
        { status: 400 }
      );
    }

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const res = await executePipelineStep(server.toObject(), {
      repoPath,
      branch,
      gitRepoUrl,
      step,
      installCmd,
      buildCmd,
      pm2AppName,
      customCmd,
    });

    return NextResponse.json({
      success: res.success,
      step,
      output: res.output,
      exitCode: res.exitCode,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

