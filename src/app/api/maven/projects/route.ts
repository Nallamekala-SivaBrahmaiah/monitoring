import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MavenProject from '@/models/MavenProject';
import MavenBuild from '@/models/MavenBuild';
import { isValidGitUrl, sanitizeMavenCommand } from '@/lib/maven/mavenBuildEngine';

export async function GET() {
  try {
    await connectToDatabase();

    const projects = await MavenProject.find({}).sort({ updatedAt: -1 }).lean();

    // Mask secrets before returning to client
    const sanitizedProjects = projects.map((p: any) => ({
      ...p,
      envVariables: (p.envVariables || []).map((ev: any) => ({
        key: ev.key,
        value: ev.isSecret ? '••••••••' : ev.value,
        isSecret: Boolean(ev.isSecret),
      })),
    }));

    // Calculate Summary Metrics
    const totalProjects = projects.length;
    const allBuilds = await MavenBuild.find({}).lean();
    const successfulBuilds = allBuilds.filter(
      (b: any) => (b.status || '').toUpperCase() === 'SUCCESS'
    ).length;
    const failedBuilds = allBuilds.filter(
      (b: any) => (b.status || '').toUpperCase() === 'FAILED'
    ).length;
    const runningBuilds = allBuilds.filter(
      (b: any) => ['RUNNING', 'QUEUED'].includes((b.status || '').toUpperCase())
    ).length;
    const totalArtifacts = allBuilds.reduce((acc, b) => acc + (b.artifacts?.length || 0), 0);

    return NextResponse.json({
      success: true,
      projects: sanitizedProjects,
      summary: {
        totalProjects,
        successfulBuilds,
        failedBuilds,
        runningBuilds,
        totalArtifacts,
      },
    });
  } catch (err: any) {
    console.error('Error fetching Maven projects:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      name,
      repositoryUrl,
      branch = 'main',
      projectFolder = '.',
      mavenVersion = '3.9',
      jdkVersion = 'Java 21',
      mavenCommand = 'mvn clean package',
      envVariables = [],
      executionMode = 'auto',
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Project name is required.' },
        { status: 400 }
      );
    }

    if (!repositoryUrl || !isValidGitUrl(repositoryUrl)) {
      return NextResponse.json(
        { success: false, error: 'A valid Git repository URL (HTTPS or SSH) is required.' },
        { status: 400 }
      );
    }

    let sanitizedCmd = 'mvn clean package';
    try {
      sanitizedCmd = sanitizeMavenCommand(mavenCommand);
    } catch (cmdErr: any) {
      return NextResponse.json(
        { success: false, error: cmdErr.message },
        { status: 400 }
      );
    }

    const newProject = await MavenProject.create({
      name: name.trim(),
      repositoryUrl: repositoryUrl.trim(),
      branch: (branch || 'main').trim(),
      projectFolder: (projectFolder || '.').trim(),
      mavenVersion,
      jdkVersion,
      mavenCommand: sanitizedCmd,
      envVariables: Array.isArray(envVariables) ? envVariables : [],
      executionMode,
      totalBuilds: 0,
      lastBuildStatus: 'NONE',
    });

    return NextResponse.json({
      success: true,
      project: newProject,
      message: `Maven project "${name}" created successfully.`,
    });
  } catch (err: any) {
    console.error('Error creating Maven project:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create Maven project' },
      { status: 500 }
    );
  }
}
