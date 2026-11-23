import { NextRequest, NextResponse } from 'next/server';
import { resolveServer, executeTrivyAction } from '@/lib/devops/devopsToolsEngine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, target, severity } = body;

    if (!action || !['install', 'uninstall', 'scan_image', 'scan_fs', 'version', 'detect'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 });
    }

    const server = await resolveServer(id);
    if (!server) {
      return NextResponse.json({ error: `Server not found with ID ${id}` }, { status: 404 });
    }

    const result = await executeTrivyAction(server, action, { target, severity });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[TrivyActionAPI] Error:', err);
    return NextResponse.json({ error: err.message || 'Action execution failed' }, { status: 500 });
  }
}
