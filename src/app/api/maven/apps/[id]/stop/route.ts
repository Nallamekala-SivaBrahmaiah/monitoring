import { NextRequest, NextResponse } from 'next/server';
import { stopMavenApplication } from '@/lib/maven/mavenProcessManager';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const app = await stopMavenApplication(id);

    return NextResponse.json({
      success: true,
      message: `Application "${app.projectName}" stopped successfully.`,
      app,
    });
  } catch (err: any) {
    console.error('[API /api/maven/apps/[id]/stop POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to stop application' },
      { status: 500 }
    );
  }
}
