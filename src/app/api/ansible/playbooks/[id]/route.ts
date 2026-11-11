import { NextRequest, NextResponse } from 'next/server';
import yaml from 'js-yaml';
import connectToDatabase from '@/lib/mongodb';
import AnsiblePlaybook from '@/models/AnsiblePlaybook';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const playbook = await AnsiblePlaybook.findById(id).lean();
    if (!playbook) {
      return NextResponse.json({ success: false, error: 'Playbook not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, playbook });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const playbook = await AnsiblePlaybook.findById(id);
    if (!playbook) {
      return NextResponse.json({ success: false, error: 'Playbook not found' }, { status: 404 });
    }

    if (body.content) {
      try {
        yaml.load(body.content);
      } catch (parseErr: any) {
        return NextResponse.json(
          { success: false, error: `Invalid YAML syntax: ${parseErr.message}` },
          { status: 400 }
        );
      }
      playbook.content = body.content.trim();
    }

    if (body.title) playbook.title = body.title.trim();
    if (body.description !== undefined) playbook.description = body.description.trim();
    if (body.category) playbook.category = body.category.trim();
    if (body.targetHostsPattern) playbook.targetHostsPattern = body.targetHostsPattern.trim();
    if (body.defaultExtraVars !== undefined) playbook.defaultExtraVars = body.defaultExtraVars.trim();

    await playbook.save();

    return NextResponse.json({
      success: true,
      playbook,
      message: `Playbook "${playbook.name}" updated successfully.`,
    });
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

    const playbook = await AnsiblePlaybook.findByIdAndDelete(id);
    if (!playbook) {
      return NextResponse.json({ success: false, error: 'Playbook not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Playbook "${playbook.name}" deleted.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

