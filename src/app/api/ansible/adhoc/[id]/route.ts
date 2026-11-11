import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import AnsibleAdHocExecution from '@/models/AnsibleAdHocExecution';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    let execution: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      execution = await AnsibleAdHocExecution.findById(id).lean();
    }
    if (!execution) {
      execution = await AnsibleAdHocExecution.findOne({ jobId: id }).lean();
    }

    if (!execution) {
      return NextResponse.json({ success: false, error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      execution: {
        ...execution,
        _id: String(execution._id),
        controllerId: String(execution.controllerId),
        targetWorkerIds: (execution.targetWorkerIds || []).map((wId: any) => String(wId)),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    let result = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await AnsibleAdHocExecution.findByIdAndDelete(id);
    } else {
      result = await AnsibleAdHocExecution.findOneAndDelete({ jobId: id });
    }

    if (!result) {
      return NextResponse.json({ success: false, error: 'Execution record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Execution record deleted successfully',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

