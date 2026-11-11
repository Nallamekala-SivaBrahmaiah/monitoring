import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MavenBuild from '@/models/MavenBuild';
import MavenProject from '@/models/MavenProject';
import { executeMavenBuild, isValidGitUrl, sanitizeMavenCommand } from '@/lib/maven/mavenBuildEngine';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const query: any = {};
    if (projectId && projectId !== 'all') {
      query.projectId = projectId;
    }
    if (status && status !== 'all') {
      query.status = status.toUpperCase();
    }

    const total = await MavenBuild.countDocuments(query);
    const builds = await MavenBuild.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-logs') // omit massive log payload from list query for high performance
      .lean();

    return NextResponse.json({
      success: true,
      builds,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch builds' },
      { status: 500 }
    );
  }
}

/**
 * Ad-hoc Quick Run Build (directly from the Build Configuration card)
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      repositoryUrl,
      branch = 'main',
      projectFolder = '.',
      mavenCommand = 'mvn clean package',
      projectName,
      executionMode = 'native',
    } = body;

    if (!repositoryUrl || !isValidGitUrl(repositoryUrl)) {
      return NextResponse.json(
        { success: false, error: 'A valid GitHub/Git repository URL is required.' },
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

    // Derive or use project name from repo URL if not provided
    const repoSlug = repositoryUrl.split('/').pop()?.replace('.git', '') || 'maven-project';
    const effectiveName = projectName?.trim() || repoSlug;

    // Check if an existing project matches this repo
    let project = await MavenProject.findOne({ repositoryUrl: repositoryUrl.trim() });
    if (!project) {
      project = await MavenProject.create({
        name: effectiveName,
        repositoryUrl: repositoryUrl.trim(),
        branch: branch.trim(),
        projectFolder: projectFolder.trim(),
        mavenCommand: sanitizedCmd,
        executionMode,
        totalBuilds: 0,
      });
    }

    const lastBuild = await MavenBuild.findOne({ projectId: project._id })
      .sort({ buildNumber: -1 })
      .lean();
    const buildNumber = (lastBuild?.buildNumber || 0) + 1;

    const build = await MavenBuild.create({
      projectId: project._id,
      projectName: project.name,
      buildNumber,
      repositoryUrl: repositoryUrl.trim(),
      branch: branch.trim(),
      projectFolder: projectFolder.trim(),
      command: sanitizedCmd,
      executionMode,
      status: 'QUEUED',
      startTime: new Date(),
      durationSeconds: 0,
      logs: `[+] Enqueued ad-hoc build #${buildNumber} for repository "${repositoryUrl}"...\n`,
      artifacts: [],
    });

    project.lastBuildStatus = 'RUNNING';
    project.lastBuildAt = new Date();
    await project.save();

    // Spawn async background build
    setImmediate(() => {
      executeMavenBuild(build._id.toString()).catch((err) => {
        console.error(`[MavenAPI] Async ad-hoc build failure for ${build._id}:`, err);
      });
    });

    return NextResponse.json({
      success: true,
      buildId: build._id,
      buildNumber,
      projectName: project.name,
      message: `Maven build #${buildNumber} started successfully.`,
    });
  } catch (err: any) {
    console.error('Error starting ad-hoc Maven build:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to start Maven build' },
      { status: 500 }
    );
  }
}

