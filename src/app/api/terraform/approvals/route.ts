import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TerraformApproval from '@/models/TerraformApproval';

export async function GET() {
  try {
    await connectToDatabase();
    const approvals = await TerraformApproval.find().sort({ requestedAt: -1 }).lean();
    return NextResponse.json({ success: true, approvals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { action, approvalId, approver = 'CTO / Lead DevOps', reason = '' } = body;

    if (action === 'request') {
      const { projectId, projectName, operation, environment, planSummary } = body;
      const approval = await TerraformApproval.create({
        projectId,
        projectName,
        operation,
        environment,
        requester: 'DevOps Engineer',
        reason,
        planSummary,
        status: 'pending',
      });
      return NextResponse.json({ success: true, approval });
    }

    if (action === 'decide') {
      const { status } = body; // 'approved' | 'rejected'
      if (!approvalId || !status) {
        return NextResponse.json({ error: 'approvalId and status required' }, { status: 400 });
      }

      const approval = await TerraformApproval.findByIdAndUpdate(
        approvalId,
        {
          status,
          approver,
          decidedAt: new Date(),
          rejectionReason: status === 'rejected' ? reason : undefined,
        },
        { new: true }
      );

      return NextResponse.json({ success: true, approval });
    }

    return NextResponse.json({ error: 'Invalid action. Supported: request, decide' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
