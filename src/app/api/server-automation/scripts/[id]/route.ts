import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AutomationScript from '@/models/AutomationScript';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const script = await AutomationScript.findById(id).lean();
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, script });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { name, description, category, content, tags } = body;

    const script = await AutomationScript.findById(id);
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    if (name) script.name = name.trim();
    if (description !== undefined) script.description = description.trim();
    if (category) script.category = category;
    if (content) script.content = content;
    if (tags) script.tags = tags;

    await script.save();
    return NextResponse.json({ success: true, script });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const script = await AutomationScript.findById(id);

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    if (script.isBuiltIn) {
      return NextResponse.json(
        { error: 'Built-in system scripts cannot be deleted.' },
        { status: 400 }
      );
    }

    await AutomationScript.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Script deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
