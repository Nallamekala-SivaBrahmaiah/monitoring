import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MavenBuild from '@/models/MavenBuild';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const build = await MavenBuild.findById(id).lean();
    if (!build) {
      return NextResponse.json(
        { success: false, error: 'Build not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, build });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error fetching build' },
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

    const build = await MavenBuild.findByIdAndDelete(id);
    if (!build) {
      return NextResponse.json(
        { success: false, error: 'Build not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Build #${build.buildNumber} deleted successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error deleting build' },
      { status: 500 }
    );
  }
}

