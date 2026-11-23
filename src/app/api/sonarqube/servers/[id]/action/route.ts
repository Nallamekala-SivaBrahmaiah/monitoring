import { NextRequest, NextResponse } from 'next/server';
import { resolveServer, executeSonarQubeAction } from '@/lib/devops/devopsToolsEngine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, preserveData, port } = body;

    if (!action || !['start', 'stop', 'restart', 'install', 'uninstall', 'detect'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 });
    }

    const server = await resolveServer(id);
    if (!server) {
      return NextResponse.json({ error: `Server not found with ID ${id}` }, { status: 404 });
    }

    const result = await executeSonarQubeAction(server, action, { preserveData, port });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[SonarQubeActionAPI] Error:', err);
    return NextResponse.json({ error: err.message || 'Action execution failed' }, { status: 500 });
  }
}
