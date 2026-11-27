import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'ssh2';
import connectToDatabase from '@/lib/mongodb';
import { resolveServerCredentials } from '@/lib/terminal/serverResolver';
import AiRemediationLog from '@/models/AiRemediationLog';

// Strict safety blocklist of destructive Linux system commands
const BLOCKED_COMMAND_PATTERNS = [
  /rm\s+-rf\s+(\/|\/\*)/i,
  /mkfs/i,
  /dd\s+if=/i,
  />\s*\/dev\/(sda|hda|nvme)/i,
  /shutdown/i,
  /reboot/i,
  /init\s+0/i,
  /poweroff/i,
  /:(){ :|:& };:/i, // Fork bomb
  /chmod\s+-R\s+777\s+\//i,
];

function isCommandDangerous(cmd: string): { dangerous: boolean; pattern?: string } {
  for (const pattern of BLOCKED_COMMAND_PATTERNS) {
    if (pattern.test(cmd)) {
      return { dangerous: true, pattern: pattern.toString() };
    }
  }
  return { dangerous: false };
}

/**
 * Runs a command on remote server via SSH
 */
async function runCommandOverSSH(
  creds: any,
  command: string,
  timeoutMs: number = 30000
): Promise<{ output: string; exitCode: number }> {
  return new Promise((resolve) => {
    const client = new Client();
    let output = '';

    const timer = setTimeout(() => {
      try { client.end(); } catch {}
      resolve({ output: output + '\n[ERROR] Command timed out after ' + timeoutMs / 1000 + 's.', exitCode: 124 });
    }, timeoutMs);

    const connectConfig: any = {
      host: creds.host,
      port: creds.port || 22,
      username: creds.username,
      readyTimeout: 10000,
    };

    if (creds.authMethod === 'privateKey') {
      connectConfig.privateKey = creds.authSecret;
    } else {
      connectConfig.password = creds.authSecret;
    }

    client
      .on('ready', () => {
        client.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timer);
            try { client.end(); } catch {}
            return resolve({ output: `SSH Exec Error: ${err.message}`, exitCode: 1 });
          }
          stream
            .on('data', (d: Buffer) => {
              output += d.toString('utf-8');
            })
            .stderr.on('data', (d: Buffer) => {
              output += d.toString('utf-8');
            })
            .on('close', (code: number) => {
              clearTimeout(timer);
              try { client.end(); } catch {}
              resolve({ output, exitCode: code ?? 0 });
            });
        });
      })
      .on('error', (err) => {
        clearTimeout(timer);
        resolve({ output: `SSH Connection Error: ${err.message}`, exitCode: 1 });
      })
      .connect(connectConfig);
  });
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { logId, action, customCommand } = body as {
      logId: string;
      action: 'approve' | 'rollback' | 'reject';
      customCommand?: string;
    };

    if (!logId) {
      return NextResponse.json({ success: false, error: 'logId is required.' }, { status: 400 });
    }

    const log = await AiRemediationLog.findById(logId);
    if (!log) {
      return NextResponse.json({ success: false, error: 'Remediation log record not found.' }, { status: 404 });
    }

    // 1. User Rejected Action
    if (action === 'reject') {
      log.decision = 'rejected';
      log.executionStatus = 'failed';
      await log.save();
      return NextResponse.json({
        success: true,
        message: 'Action rejected by user. No commands were executed on the server.',
        decision: 'rejected',
      });
    }

    // Resolve server credentials
    const creds = await resolveServerCredentials({
      sshServerId: log.serverId,
      host: log.host,
      name: log.serverName,
    });

    if (!creds) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not resolve SSH credentials for server "${log.serverName || log.host || 'Unknown'}". Please configure SSH in server inventory.`,
        },
        { status: 404 }
      );
    }

    // 2. Manual User Rollback Request
    if (action === 'rollback') {
      const rollbackCmd = log.rollbackCommand || 'echo "No rollback command defined."';
      const checkDangerous = isCommandDangerous(rollbackCmd);
      if (checkDangerous.dangerous) {
        return NextResponse.json(
          { success: false, error: `Rollback command blocked by security policy: matches forbidden pattern ${checkDangerous.pattern}` },
          { status: 403 }
        );
      }

      const rbResult = await runCommandOverSSH(creds, rollbackCmd);
      const isSuccess = rbResult.exitCode === 0;

      log.rollbackExecuted = true;
      log.rollbackOutput = rbResult.output;
      log.rollbackSuccess = isSuccess;
      log.executionStatus = 'rolled_back';
      await log.save();

      return NextResponse.json({
        success: isSuccess,
        action: 'rollback',
        output: rbResult.output,
        exitCode: rbResult.exitCode,
        message: isSuccess
          ? 'Rollback executed successfully. Server restored to safe state.'
          : 'Rollback encountered errors. Check terminal output for details.',
      });
    }

    // 3. User Approved Fix Execution
    if (action === 'approve') {
      const commandToRun = (customCommand || log.fixCommand || '').trim();
      if (!commandToRun) {
        return NextResponse.json({ success: false, error: 'No fix command specified to execute.' }, { status: 400 });
      }

      // Security Check
      const checkDangerous = isCommandDangerous(commandToRun);
      if (checkDangerous.dangerous) {
        log.decision = 'rejected';
        log.executionStatus = 'failed';
        log.executionOutput = `[SECURITY BLOCK] Command execution halted. Matched forbidden destructive pattern: ${checkDangerous.pattern}`;
        await log.save();
        return NextResponse.json(
          {
            success: false,
            error: `Command blocked by platform security guardrail: ${checkDangerous.pattern}. Destructive operations are strictly prohibited.`,
          },
          { status: 403 }
        );
      }

      log.decision = customCommand ? 'modified' : 'approved';
      log.executionStatus = 'running';
      log.executedAt = new Date();
      await log.save();

      // Step A: Run Fix Command
      const fixResult = await runCommandOverSSH(creds, commandToRun);
      log.executionOutput = fixResult.output;
      log.executionSuccess = fixResult.exitCode === 0;

      let verifyResult = { output: '', exitCode: 0 };
      let rollbackTriggered = false;
      let rollbackResult = { output: '', exitCode: 0 };

      // Step B: If Fix Command Succeeded, Run Verify Command
      if (fixResult.exitCode === 0 && log.verifyCommand) {
        verifyResult = await runCommandOverSSH(creds, log.verifyCommand);
        log.verifyOutput = verifyResult.output;
        log.verifySuccess = verifyResult.exitCode === 0;
      }

      // Step C: If Fix failed OR Verify failed, trigger AUTO-ROLLBACK!
      if (fixResult.exitCode !== 0 || (log.verifyCommand && verifyResult.exitCode !== 0)) {
        if (log.rollbackCommand && log.rollbackCommand.trim() && log.rollbackCommand !== 'echo "No rollback required"') {
          rollbackTriggered = true;
          rollbackResult = await runCommandOverSSH(creds, log.rollbackCommand);
          log.rollbackExecuted = true;
          log.rollbackOutput = rollbackResult.output;
          log.rollbackSuccess = rollbackResult.exitCode === 0;
          log.executionStatus = 'rolled_back';
        } else {
          log.executionStatus = 'failed';
        }
      } else {
        log.executionStatus = 'success';
      }

      await log.save();

      return NextResponse.json({
        success: log.executionStatus === 'success',
        executionStatus: log.executionStatus,
        fixOutput: fixResult.output,
        fixExitCode: fixResult.exitCode,
        verifyOutput: verifyResult.output,
        verifyExitCode: verifyResult.exitCode,
        rollbackTriggered,
        rollbackOutput: rollbackResult.output,
        rollbackSuccess: rollbackResult.exitCode === 0,
        message:
          log.executionStatus === 'success'
            ? 'Fix executed and verified successfully! Server health restored.'
            : rollbackTriggered
            ? 'Verification failed after applying fix. Safe automatic rollback was triggered and applied.'
            : 'Fix command returned errors. No changes verified.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action provided.' }, { status: 400 });
  } catch (error: any) {
    console.error('[Gemini Execute Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An error occurred while executing the remediation action.',
      },
      { status: 500 }
    );
  }
}
