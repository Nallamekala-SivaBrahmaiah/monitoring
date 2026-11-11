import { NextRequest, NextResponse } from 'next/server';
import yaml from 'js-yaml';
import connectToDatabase from '@/lib/mongodb';
import AnsiblePlaybook from '@/models/AnsiblePlaybook';
import { ensurePlaybookTemplates } from '@/lib/ansible/ansibleEngine';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await ensurePlaybookTemplates();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const query: any = {};
    if (category && category !== 'all') {
      query.category = category;
    }

    const playbooks = await AnsiblePlaybook.find(query).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ success: true, playbooks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      name,
      title,
      description = '',
      content,
      category = 'Custom',
      targetHostsPattern = 'all',
      defaultExtraVars = '',
    } = body;

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: 'Playbook file name and YAML content are required.' },
        { status: 400 }
      );
    }

    // Validate YAML syntax
    try {
      yaml.load(content);
    } catch (parseErr: any) {
      return NextResponse.json(
        { success: false, error: `Invalid YAML syntax: ${parseErr.message}` },
        { status: 400 }
      );
    }

    let fileName = name.trim();
    if (!fileName.endsWith('.yml') && !fileName.endsWith('.yaml')) {
      fileName += '.yml';
    }

    const existing = await AnsiblePlaybook.findOne({ name: fileName });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A playbook with name "${fileName}" already exists.` },
        { status: 400 }
      );
    }

    const playbook = await AnsiblePlaybook.create({
      name: fileName,
      title: title?.trim() || fileName,
      description: description.trim(),
      content: content.trim(),
      category: category.trim(),
      isTemplate: false,
      targetHostsPattern: targetHostsPattern.trim(),
      defaultExtraVars: defaultExtraVars.trim(),
    });

    return NextResponse.json({
      success: true,
      playbook,
      message: `Playbook "${fileName}" created successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

