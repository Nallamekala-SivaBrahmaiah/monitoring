import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleExecution from '@/models/AnsibleExecution';
import { cancelAnsibleExecution } from '@/lib/ansible/ansibleEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const execution = await AnsibleExecution.findById(id);
    if (!execution) {
      return NextResponse.json({ success: false, error: 'Execution not found' }, { status: 404 });
    }

    const cancelled = cancelAnsibleExecution(id);

    execution.status = 'CANCELLED';
    execution.endTime = new Date();
    execution.logs += `\n[Ansible Engine] Execution cancelled by user.\n`;
    await execution.save();

    return NextResponse.json({
      success: true,
      cancelled,
      message: `Job ${execution.jobId} cancelled.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

