import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TerraformVariable from '@/models/TerraformVariable';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const workspace = searchParams.get('workspace');

    const filter: any = {};
    if (projectId) filter.projectId = projectId;
    if (workspace) filter.$or = [{ workspace: 'all' }, { workspace }];

    const variables = await TerraformVariable.find(filter).sort({ key: 1 }).lean();
    return NextResponse.json({ success: true, variables });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      projectId,
      workspace = 'all',
      key,
      value = '',
      type = 'string',
      category = 'terraform',
      description = '',
      sensitive = false,
      required = false,
    } = body;

    if (!projectId || !key) {
      return NextResponse.json({ error: 'Project ID and key are required' }, { status: 400 });
    }

    const variable = await TerraformVariable.findOneAndUpdate(
      { projectId, key: key.trim(), workspace },
      {
        value,
        type,
        category,
        description,
        sensitive,
        required,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, variable });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Variable ID is required' }, { status: 400 });
    }

    await TerraformVariable.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Variable deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
