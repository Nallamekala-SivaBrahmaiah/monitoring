import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AutomationExecution from '@/models/AutomationExecution';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const execution = await AutomationExecution.findById(id).lean();

    if (!execution) {
      return NextResponse.json({ error: 'Execution record not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download');

    if (download === 'true') {
      const filename = `automation-${(execution as any).serverName || 'server'}-${(execution as any)._id}.log`;
      return new Response((execution as any).logOutput || 'No output recorded.', {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ success: true, execution });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
