import { NextRequest, NextResponse } from 'next/server';
import { getApplicationLogs } from '@/lib/maven/mavenProcessManager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getApplicationLogs(id);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error('[API /api/maven/apps/[id]/logs GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to get logs' },
      { status: 404 }
    );
  }
}
