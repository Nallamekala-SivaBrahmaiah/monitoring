import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TerraformProject from '@/models/TerraformProject';
import TerraformExecution from '@/models/TerraformExecution';
import TerraformVariable from '@/models/TerraformVariable';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const project = await TerraformProject.findById(id).lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const variables = await TerraformVariable.find({ projectId: id }).lean();
    const executions = await TerraformExecution.find({ projectId: id })
      .sort({ startedAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      project,
      variables,
      executions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const body = await req.json();

    const allowedUpdates = [
      'description',
      'region',
      'environment',
      'terraformVersion',
      'backendType',
      'backendConfig',
      'files',
      'tags',
      'currentWorkspace',
      'workspaces',
      'cloudAccountId',
      'serverId',
      'isLocked',
      'lockInfo',
    ];

    const updateData: any = {};
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    const project = await TerraformProject.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const project = await TerraformProject.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Protect infrastructure: deleting project soft-deletes or archives it, never destroys remote cloud infrastructure
    project.status = 'archived';
    await project.save();

    return NextResponse.json({
      success: true,
      message: `Project '${project.name}' archived. Note: Existing cloud resources were NOT destroyed.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
