import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TerraformExecution from '@/models/TerraformExecution';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const projectId = searchParams.get('projectId');
    const provider = searchParams.get('provider');
    const operation = searchParams.get('operation');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const filter: any = {};
    if (projectId) filter.projectId = projectId;
    if (provider) filter.provider = provider;
    if (operation) filter.operation = operation;
    if (status) filter.status = status;

    const executions = await TerraformExecution.find(filter)
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, executions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
