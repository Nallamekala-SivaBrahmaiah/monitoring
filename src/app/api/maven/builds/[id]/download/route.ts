import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import connectToDatabase from '@/lib/mongodb';
import MavenBuild from '@/models/MavenBuild';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const requestedArtifact = searchParams.get('artifact');

    const build = await MavenBuild.findById(id).lean();
    if (!build) {
      return NextResponse.json(
        { success: false, error: 'Build not found' },
        { status: 404 }
      );
    }

    if (!build.artifacts || build.artifacts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No artifacts available for this build.' },
        { status: 404 }
      );
    }

    // Match requested artifact or pick first one
    const artifact = requestedArtifact
      ? build.artifacts.find((a: any) => a.name === requestedArtifact || a.path === requestedArtifact)
      : build.artifacts[0];

    if (!artifact) {
      return NextResponse.json(
        { success: false, error: 'Requested artifact not found in build metadata.' },
        { status: 404 }
      );
    }

    // Prevent path traversal
    const safeRelPath = path.normalize(artifact.path).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(build.workspacePath || path.join(process.cwd(), '.maven-workspaces', String(build.projectId || build._id)), safeRelPath);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, error: `Artifact file "${artifact.name}" does not exist on disk.` },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const stat = fs.statSync(fullPath);

    const contentType =
      artifact.extension === 'war' ? 'application/x-webarchive' : 'application/java-archive';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${artifact.name}"`,
        'Content-Length': stat.size.toString(),
      },
    });
  } catch (err: any) {
    console.error('Error downloading artifact:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error downloading artifact' },
      { status: 500 }
    );
  }
}

