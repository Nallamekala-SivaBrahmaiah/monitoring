import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import connectToDatabase from '@/lib/mongodb';
import MavenBuild from '@/models/MavenBuild';
import MavenProject from '@/models/MavenProject';
import { detectExecutableArtifact, findNextAvailablePort } from '@/lib/maven/mavenProcessManager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectToDatabase();

    let workspacePath = '';
    let artifactFile = body.artifactName;

    if (body.buildId) {
      const build = await MavenBuild.findById(body.buildId);
      if (build?.workspacePath) {
        workspacePath = build.workspacePath;
      }
    }

    if (!workspacePath && body.projectId) {
      workspacePath = path.join(process.cwd(), '.maven-workspaces', body.projectId);
    }

    if (!workspacePath) {
      // Check default workspaces folder
      const baseDir = path.join(process.cwd(), '.maven-workspaces');
      if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir);
        if (dirs.length > 0) {
          workspacePath = path.join(baseDir, dirs[0]);
        }
      }
    }

    if (!workspacePath || !fs.existsSync(workspacePath)) {
      return NextResponse.json(
        { success: false, error: 'No workspace found for project or build.' },
        { status: 404 }
      );
    }

    // Locate target artifact
    const targetDir = path.join(workspacePath, 'target');
    let artifactFullPath = '';

    if (artifactFile && fs.existsSync(path.join(targetDir, artifactFile))) {
      artifactFullPath = path.join(targetDir, artifactFile);
    } else if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      const candidate = files.find(
        (f) =>
          (f.endsWith('.jar') || f.endsWith('.war')) &&
          !f.endsWith('.original') &&
          !f.includes('-sources') &&
          !f.includes('-javadoc')
      );
      if (candidate) {
        artifactFile = candidate;
        artifactFullPath = path.join(targetDir, candidate);
      }
    }

    if (!artifactFullPath || !fs.existsSync(artifactFullPath)) {
      return NextResponse.json(
        { success: false, error: 'No compiled .jar or .war artifact found in workspace target folder.' },
        { status: 404 }
      );
    }

    const detection = await detectExecutableArtifact(artifactFullPath, workspacePath);
    const suggestedPort = await findNextAvailablePort(detection.detectedPort || 8080);

    return NextResponse.json({
      success: true,
      artifactName: artifactFile,
      artifactFullPath,
      workspacePath,
      detection,
      suggestedPort,
    });
  } catch (err: any) {
    console.error('[API /api/maven/apps/detect POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Detection failed' },
      { status: 500 }
    );
  }
}
