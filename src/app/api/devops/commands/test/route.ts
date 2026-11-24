import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { resolveServer, executeSSH } from '@/lib/devops/devopsToolsEngine';
import { DevopsToolConfig, DevopsToolName } from '@/models/DevopsToolConfig';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { tool, serverId, testCommand } = body;

    if (!serverId) {
      return NextResponse.json({ error: 'Please select a target server to test the command on' }, { status: 400 });
    }

    if (!testCommand || typeof testCommand !== 'string' || !testCommand.trim()) {
      return NextResponse.json({ error: 'Test command cannot be empty' }, { status: 400 });
    }

    const server = await resolveServer(serverId);
    if (!server) {
      return NextResponse.json({ error: `Server not found with ID ${serverId}` }, { status: 404 });
    }

    const hostIp = server.publicIp || server.host || server.privateIp;
    const serverStatus = (server.status || '').toLowerCase();
    if (serverStatus.includes('stop') || serverStatus === 'offline') {
      return NextResponse.json(
        {
          error: `Target server "${server.name}" (${hostIp}) is currently STOPPED. Please start the server to test commands.`,
        },
        { status: 400 }
      );
    }

    // Execute through SSH with bash -s wrapper
    const res = await executeSSH(server, testCommand.trim(), 45000);
    const isSuccess = res.code === 0;

    // Persist test execution log into DevopsToolConfig if valid tool given
    if (tool && ['jenkins', 'sonarqube', 'trivy'].includes(tool)) {
      try {
        await DevopsToolConfig.updateOne(
          { tool: tool as DevopsToolName },
          {
            $set: {
              lastExecutionAt: new Date(),
              lastExecutionStatus: isSuccess ? 'success' : 'failed',
              lastExecutionServerName: server.name || hostIp,
              lastExecutionServerHost: hostIp,
              lastExecutionAction: 'test',
              lastExecutionExitCode: res.code,
              lastExecutionLog: (res.stdout + (res.stderr ? '\n' + res.stderr : '')).trim(),
            },
          }
        );
      } catch (logErr) {
        console.warn('[CommandsTestAPI] Failed to update execution log:', logErr);
      }
    }

    return NextResponse.json({
      success: isSuccess,
      exitCode: res.code,
      stdout: res.stdout,
      stderr: res.stderr,
      serverName: server.name || hostIp,
      serverHost: hostIp,
      message: isSuccess
        ? `Command executed successfully on ${server.name} (exit code 0)`
        : `Command failed on ${server.name} (exit code ${res.code})`,
    });
  } catch (err: any) {
    console.error('[CommandsTestAPI] Error:', err);
    return NextResponse.json(
      {
        error: err.message || 'Execution error during command test',
        success: false,
      },
      { status: 500 }
    );
  }
}
