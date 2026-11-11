import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import connectToDatabase from '@/lib/mongodb';
import MavenProject from '@/models/MavenProject';
import MavenBuild from '@/models/MavenBuild';
import { isValidGitUrl, sanitizeMavenCommand } from '@/lib/maven/mavenBuildEngine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const project = await MavenProject.findById(id).lean();
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Maven project not found' },
        { status: 404 }
      );
    }

    const sanitized = {
      ...project,
      envVariables: ((project as any).envVariables || []).map((ev: any) => ({
        key: ev.key,
        value: ev.isSecret ? '••••••••' : ev.value,
        isSecret: Boolean(ev.isSecret),
      })),
    };

    return NextResponse.json({ success: true, project: sanitized });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error fetching project' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const project = await MavenProject.findById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Maven project not found' },
        { status: 404 }
      );
    }

    if (body.name !== undefined) project.name = body.name.trim();
    if (body.repositoryUrl !== undefined) {
      if (!isValidGitUrl(body.repositoryUrl)) {
        return NextResponse.json(
          { success: false, error: 'Invalid repository URL' },
          { status: 400 }
        );
      }
      project.repositoryUrl = body.repositoryUrl.trim();
    }
    if (body.branch !== undefined) project.branch = body.branch.trim();
    if (body.projectFolder !== undefined) project.projectFolder = body.projectFolder.trim();
    if (body.mavenVersion !== undefined) project.mavenVersion = body.mavenVersion;
    if (body.jdkVersion !== undefined) project.jdkVersion = body.jdkVersion;
    if (body.mavenCommand !== undefined) {
      project.mavenCommand = sanitizeMavenCommand(body.mavenCommand);
    }
    if (body.envVariables !== undefined && Array.isArray(body.envVariables)) {
      project.envVariables = body.envVariables;
    }
    if (body.executionMode !== undefined) project.executionMode = body.executionMode;

    await project.save();

    return NextResponse.json({
      success: true,
      project,
      message: 'Project updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error updating project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const project = await MavenProject.findByIdAndDelete(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Maven project not found' },
        { status: 404 }
      );
    }

    // Delete associated build logs
    await MavenBuild.deleteMany({ projectId: id });

    // Clean up local project workspace directory
    try {
      const workspaceDir = path.join(process.cwd(), '.maven-workspaces', id);
      if (fs.existsSync(workspaceDir)) {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      }
    } catch (wsErr) {
      console.warn('[MavenAPI] Workspace cleanup note:', wsErr);
    }

    return NextResponse.json({
      success: true,
      message: `Project "${project.name}" and build history deleted successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error deleting project' },
      { status: 500 }
    );
  }
}

