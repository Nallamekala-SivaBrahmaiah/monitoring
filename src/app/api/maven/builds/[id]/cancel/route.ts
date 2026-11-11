import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MavenBuild from '@/models/MavenBuild';
import MavenProject from '@/models/MavenProject';
import { cancelActiveMavenBuild } from '@/lib/maven/mavenBuildEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const build = await MavenBuild.findById(id);
    if (!build) {
      return NextResponse.json(
        { success: false, error: 'Build not found' },
        { status: 404 }
      );
    }

    if (build.status !== 'RUNNING' && build.status !== 'QUEUED') {
      return NextResponse.json(
        { success: false, error: 'Build is not currently active.' },
        { status: 400 }
      );
    }

    cancelActiveMavenBuild(id);

    build.status = 'CANCELLED';
    build.endTime = new Date();
    build.logs += `\n[!] Build was cancelled by operator at ${new Date().toLocaleTimeString()}.\n`;
    await build.save();

    if (build.projectId) {
      await MavenProject.findByIdAndUpdate(build.projectId, {
        $set: { lastBuildStatus: 'FAILED' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Build #${build.buildNumber} cancelled.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error cancelling build' },
      { status: 500 }
    );
  }
}

