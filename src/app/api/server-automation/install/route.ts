import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AutomationExecution from '@/models/AutomationExecution';
import AutomationPackage from '@/models/AutomationPackage';
import Server from '@/models/Server';
import { TOOL_CATALOG } from '@/lib/automation/toolCatalog';
import { generateSelectedInstallationScript } from '@/lib/automation/scriptGenerator';
import { executeAutomationSession, resolveServerAuth } from '@/lib/automation/automationSessionManager';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { serverId, selectedTools, stopOnError = false, overrideAuth } = body;

    if (!serverId && !overrideAuth?.host) {
      return NextResponse.json(
        { error: 'A target Linux server must be selected.' },
        { status: 400 }
      );
    }

    if (!selectedTools || !Array.isArray(selectedTools) || selectedTools.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one tool to install.' },
        { status: 400 }
      );
    }

    // Resolve server details
    const auth = await resolveServerAuth(serverId, overrideAuth);

    // Fetch custom packages from DB
    const customDocs = await AutomationPackage.find().lean();
    const customTools: any[] = customDocs.map((doc: any) => ({
      id: doc.packageId,
      name: doc.name,
      category: doc.category,
      description: doc.description,
      badge: doc.badge || 'Custom',
      functionName: doc.functionName,
      defaultVersion: doc.defaultVersion,
      supportedVersions: doc.supportedVersions,
      port: doc.port,
      dependencies: doc.dependencies,
      verificationCommand: doc.verificationCommand,
      installScript: doc.installScript,
      isCustom: true,
    }));

    const fullCatalog = [...TOOL_CATALOG, ...customTools];

    // Validate tools
    const toolProgressList = selectedTools
      .map((item: { toolId: string; version?: string }) => {
        const def = fullCatalog.find((t) => t.id === item.toolId);
        if (!def) return null;
        return {
          toolId: def.id,
          toolName: def.name,
          version: item.version || def.defaultVersion || '',
          status: 'pending' as const,
          durationSeconds: 0,
        };
      })
      .filter(Boolean);

    if (toolProgressList.length === 0) {
      return NextResponse.json(
        { error: 'None of the selected tools matched valid catalog entries.' },
        { status: 400 }
      );
    }

    // Generate isolated bash script containing ONLY the selected functions
    const { script, toolOrder } = generateSelectedInstallationScript(selectedTools, {
      stopOnError,
      serverName: auth.serverName,
      customPackages: customTools,
    });

    // Create execution record in DB
    const execution = new AutomationExecution({
      serverId: serverId || 'manual',
      serverName: auth.serverName,
      serverHost: auth.host,
      serverOs: auth.osName,
      environment: auth.environment,
      executionType: 'tool-installation',
      selectedTools: toolProgressList,
      status: 'queued',
      logOutput: '',
      startedAt: new Date(),
    });

    await execution.save();

    // Kick off remote SSH execution in background
    executeAutomationSession({
      executionId: execution._id.toString(),
      serverId: serverId || 'manual',
      scriptContent: script,
      overrideAuth,
    }).catch((err) => {
      console.error(`Background automation execution error for ${execution._id}:`, err);
    });

    return NextResponse.json({
      success: true,
      executionId: execution._id.toString(),
      serverName: auth.serverName,
      serverHost: auth.host,
      totalTools: toolProgressList.length,
      toolOrder,
    });
  } catch (err: any) {
    console.error('Failed to initiate tool installation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to start automation process.' },
      { status: 500 }
    );
  }
}
