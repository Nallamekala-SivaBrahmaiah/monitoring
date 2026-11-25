import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AutomationScript from '@/models/AutomationScript';
import AutomationExecution from '@/models/AutomationExecution';
import { executeAutomationSession, resolveServerAuth } from '@/lib/automation/automationSessionManager';

export async function POST(
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

    const body = await request.json();
    const { serverId, overrideAuth } = body;

    if (!serverId && !overrideAuth?.host) {
      return NextResponse.json({ error: 'Target server is required' }, { status: 400 });
    }

    const auth = await resolveServerAuth(serverId, overrideAuth);

    // Create execution record
    const execution = new AutomationExecution({
      serverId: serverId || 'manual',
      serverName: auth.serverName,
      serverHost: auth.host,
      serverOs: auth.osName,
      environment: auth.environment,
      executionType: 'custom-script',
      scriptId: script._id.toString(),
      scriptName: script.name,
      selectedTools: [],
      status: 'queued',
      logOutput: '',
      startedAt: new Date(),
    });

    await execution.save();

    // Increment script stats
    script.lastExecutedAt = new Date();
    script.executionCount = (script.executionCount || 0) + 1;
    await script.save();

    // Execute script via background automation session
    executeAutomationSession({
      executionId: execution._id.toString(),
      serverId: serverId || 'manual',
      scriptContent: script.content,
      overrideAuth,
    }).catch((err) => {
      console.error(`Script execution error for ${execution._id}:`, err);
    });

    return NextResponse.json({
      success: true,
      executionId: execution._id.toString(),
      serverName: auth.serverName,
      scriptName: script.name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
