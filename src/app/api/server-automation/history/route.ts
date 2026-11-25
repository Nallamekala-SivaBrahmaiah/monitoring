import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AutomationExecution from '@/models/AutomationExecution';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const query: any = {};
    if (serverId && serverId !== 'all') {
      query.serverId = serverId;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const executions = await AutomationExecution.find(query)
      .select('-logOutput') // exclude heavy log string for list view
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const totalCount = await AutomationExecution.countDocuments(query);
    const successCount = await AutomationExecution.countDocuments({ status: 'success' });
    const failedCount = await AutomationExecution.countDocuments({ status: { $in: ['failed', 'partial'] } });

    return NextResponse.json({
      success: true,
      executions,
      totalCount,
      metrics: {
        total: totalCount,
        success: successCount,
        failed: failedCount,
        successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
