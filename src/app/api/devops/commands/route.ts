import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { DevopsToolConfig, DEFAULT_DEVOPS_COMMANDS, DevopsToolName } from '@/models/DevopsToolConfig';

const VALID_TOOLS: DevopsToolName[] = ['jenkins', 'sonarqube', 'trivy'];

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const toolParam = searchParams.get('tool') as DevopsToolName | null;

    if (toolParam && !VALID_TOOLS.includes(toolParam)) {
      return NextResponse.json({ error: `Invalid tool name "${toolParam}"` }, { status: 400 });
    }

    const query = toolParam ? { tool: toolParam } : {};
    const existing = await DevopsToolConfig.find(query).lean();

    // Ensure all requested tools have configs (fall back to defaults if not yet customized)
    const toolsToReturn = toolParam ? [toolParam] : VALID_TOOLS;
    const configs = toolsToReturn.map((t) => {
      const found = existing.find((e) => e.tool === t);
      if (found) return found;

      const def = DEFAULT_DEVOPS_COMMANDS[t];
      return {
        tool: t,
        installCommands: def.installCommands,
        uninstallCommands: def.uninstallCommands,
        verificationCommands: def.verificationCommands,
        serviceName: def.serviceName,
        port: def.port,
        healthCheckCommand: def.healthCheckCommand,
        lastExecutionAt: null,
        lastExecutionStatus: null,
        lastExecutionServerName: '',
        lastExecutionServerHost: '',
        lastExecutionAction: null,
        lastExecutionLog: '',
        lastExecutionExitCode: null,
      };
    });

    return NextResponse.json({
      configs: toolParam ? configs[0] : configs,
      success: true,
    });
  } catch (err: any) {
    console.error('[DevopsCommandsAPI:GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch commands' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const {
      tool,
      installCommands,
      uninstallCommands,
      verificationCommands,
      serviceName,
      port,
      healthCheckCommand,
    } = body;

    if (!tool || !VALID_TOOLS.includes(tool)) {
      return NextResponse.json(
        { error: `Invalid or missing tool. Must be one of: ${VALID_TOOLS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!installCommands || typeof installCommands !== 'string' || !installCommands.trim()) {
      return NextResponse.json({ error: 'Install commands cannot be empty' }, { status: 400 });
    }

    if (!uninstallCommands || typeof uninstallCommands !== 'string' || !uninstallCommands.trim()) {
      return NextResponse.json({ error: 'Uninstall commands cannot be empty' }, { status: 400 });
    }

    const updated = await DevopsToolConfig.findOneAndUpdate(
      { tool },
      {
        $set: {
          tool,
          installCommands: installCommands.trim(),
          uninstallCommands: uninstallCommands.trim(),
          verificationCommands: (verificationCommands || '').trim(),
          serviceName: (serviceName || '').trim(),
          port: typeof port === 'number' ? port : parseInt(port, 10) || 0,
          healthCheckCommand: (healthCheckCommand || '').trim(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({
      success: true,
      message: `Custom commands for ${tool.toUpperCase()} saved successfully`,
      config: updated,
    });
  } catch (err: any) {
    console.error('[DevopsCommandsAPI:POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save commands' }, { status: 500 });
  }
}
