import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MavenApp from '@/models/MavenApp';
import { stopMavenApplication } from '@/lib/maven/mavenProcessManager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const app = await MavenApp.findById(id);
    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, app });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    // If still running, stop process first
    try {
      await stopMavenApplication(id);
    } catch {
      // Ignore if already stopped
    }

    await MavenApp.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Application record removed successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
