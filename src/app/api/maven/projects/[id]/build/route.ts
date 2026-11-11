import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MavenProject from '@/models/MavenProject';
import MavenBuild from '@/models/MavenBuild';
import { executeMavenBuild, sanitizeMavenCommand } from '@/lib/maven/mavenBuildEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const project = await MavenProject.findById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Maven project not found' },
        { status: 404 }
      );
    }

    const customCommand = body.command ? sanitizeMavenCommand(body.command) : project.mavenCommand;
    const customBranch = body.branch ? body.branch.trim() : project.branch;

    // Determine next build number
    const lastBuild = await MavenBuild.findOne({ projectId: project._id })
      .sort({ buildNumber: -1 })
      .lean();
    const buildNumber = (lastBuild?.buildNumber || 0) + 1;

    const build = await MavenBuild.create({
      projectId: project._id,
      projectName: project.name,
      buildNumber,
      repositoryUrl: project.repositoryUrl,
      branch: customBranch,
      projectFolder: project.projectFolder,
      command: customCommand,
      executionMode: project.executionMode || 'native',
      status: 'QUEUED',
      startTime: new Date(),
      durationSeconds: 0,
      logs: `[+] Enqueued build #${buildNumber} for project "${project.name}"...\n`,
      artifacts: [],
    });

    project.lastBuildStatus = 'RUNNING';
    project.lastBuildAt = new Date();
    await project.save();

    // Trigger execution asynchronously in the background
    setImmediate(() => {
      executeMavenBuild(build._id.toString()).catch((err) => {
        console.error(`[MavenAPI] Async build execution failure for ${build._id}:`, err);
      });
    });

    return NextResponse.json({
      success: true,
      buildId: build._id,
      buildNumber,
      message: `Build #${buildNumber} triggered successfully for "${project.name}".`,
    });
  } catch (err: any) {
    console.error('Error triggering Maven build:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to trigger build' },
      { status: 500 }
    );
  }
}

