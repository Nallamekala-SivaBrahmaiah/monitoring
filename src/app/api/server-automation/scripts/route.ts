import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AutomationScript from '@/models/AutomationScript';
import { BUILT_IN_AUTOMATION_SCRIPTS } from '@/lib/automation/scriptGenerator';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Check if built-in scripts exist in DB, if not seed them
    const count = await AutomationScript.countDocuments();
    if (count === 0) {
      for (const b of BUILT_IN_AUTOMATION_SCRIPTS) {
        await AutomationScript.create({
          name: b.name,
          description: b.description,
          category: b.category as any,
          content: b.content,
          isBuiltIn: true,
          author: 'System',
        });
      }
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const query: any = {};
    if (category && category !== 'all') {
      query.category = category;
    }

    const scripts = await AutomationScript.find(query).sort({ isBuiltIn: -1, createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      scripts,
      totalCount: scripts.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { name, description = '', category = 'custom', content, tags = [] } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Script name is required' }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Script content is required' }, { status: 400 });
    }

    const script = new AutomationScript({
      name: name.trim(),
      description: description.trim(),
      category,
      content,
      isBuiltIn: false,
      author: 'User',
      tags,
    });

    await script.save();
    return NextResponse.json({ success: true, script });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
