import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleExecution from '@/models/AnsibleExecution';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const execution = await AnsibleExecution.findById(id).lean();
    if (!execution) {
      return NextResponse.json({ success: false, error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, execution });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const result = await AnsibleExecution.findOneAndDelete({
      $or: [{ _id: id }, { jobId: id }],
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Execution ${id} deleted successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

