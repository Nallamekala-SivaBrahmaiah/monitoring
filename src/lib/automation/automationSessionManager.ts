import { Client, ConnectConfig } from 'ssh2';
import { EventEmitter } from 'events';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import AutomationExecution, { IAutomationExecution } from '@/models/AutomationExecution';
import { decryptSecret } from '@/lib/serverMonitoring/crypto';
import { convertPPKToOpenSSH, isPuTTYKey } from '@/lib/serverMonitoring/ppkConverter';

export interface ActiveAutomationSession {
  executionId: string;
  serverId: string;
  serverName: string;
  host: string;
  client: Client;
  emitter: EventEmitter;
  buffer: string[];
  status: 'running' | 'success' | 'failed' | 'cancelled' | 'partial';
  startedAt: number;
  completedAt?: number;
  cancel: () => void;
}

// In-memory active sessions map
const activeSessions = new Map<string, ActiveAutomationSession>();

export function getActiveSession(executionId: string): ActiveAutomationSession | undefined {
  return activeSessions.get(executionId);
}

/**
 * Resolves credentials for a given server from the Server model or manual input.
 */
export async function resolveServerAuth(
  serverId: string,
  overrideAuth?: {
    host?: string;
    port?: number;
    username?: string;
    authMethod?: 'privateKey' | 'password';
    authSecret?: string;
  }
): Promise<{
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  secret: string;
  serverName: string;
  osName: string;
  environment: string;
}> {
  await connectToDatabase();

  let serverDoc: any = null;
  if (serverId && serverId !== 'manual') {
    serverDoc = await Server.findById(serverId);
    if (!serverDoc) {
      serverDoc = await Server.findOne({
        $or: [{ cloudResourceId: serverId }, { instanceId: serverId }, { name: serverId }, { host: serverId }],
      });
    }
  }

  const host = overrideAuth?.host || serverDoc?.publicIp || serverDoc?.host;
  const port = overrideAuth?.port || serverDoc?.port || 22;
  const username = overrideAuth?.username || serverDoc?.username || 'ubuntu';
  const authMethod = overrideAuth?.authMethod || serverDoc?.authMethod || 'privateKey';
  const serverName = serverDoc?.name || overrideAuth?.host || 'Remote Linux Server';
  const osName = serverDoc?.os?.name || 'Linux';
  const environment = serverDoc?.environment || 'production';

  let secret = '';
  if (overrideAuth?.authSecret) {
    secret = overrideAuth.authSecret.trim();
  } else if (serverDoc && serverDoc.encryptedAuthSecret) {
    secret = decryptSecret({
      encrypted: serverDoc.encryptedAuthSecret,
      iv: serverDoc.authSecretIv,
      tag: serverDoc.authSecretTag,
    });
  }

  if (!host) {
    throw new Error('Host IP address is required for SSH connection.');
  }
  if (!secret) {
    throw new Error(`No SSH authentication key or password found for ${serverName}. Please configure server credentials.`);
  }

  // Handle PPK conversion if provided as PuTTY format
  if (authMethod === 'privateKey' && isPuTTYKey(secret)) {
    const conv = convertPPKToOpenSSH(secret);
    if (conv.success && conv.pemKey) {
      secret = conv.pemKey;
    } else {
      throw new Error(`Failed to convert PuTTY key: ${conv.error || 'Invalid key format'}`);
    }
  }

  return {
    host,
    port,
    username,
    authMethod,
    secret,
    serverName,
    osName,
    environment,
  };
}

/**
 * Builds SSH ConnectConfig.
 */
function buildConfig(auth: {
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  secret: string;
}): ConnectConfig {
  const cfg: ConnectConfig = {
    host: auth.host,
    port: auth.port,
    username: auth.username,
    readyTimeout: 20000,
    keepaliveInterval: 10000,
    keepaliveCountMax: 5,
  };

  if (auth.authMethod === 'password') {
    cfg.password = auth.secret;
  } else {
    cfg.privateKey = auth.secret.trim();
  }

  return cfg;
}

/**
 * Executes a remote bash script over SSH with live telemetry parsing and SSE broadcasting.
 */
export async function executeAutomationSession(params: {
  executionId: string;
  serverId: string;
  scriptContent: string;
  overrideAuth?: any;
}): Promise<void> {
  const { executionId, serverId, scriptContent, overrideAuth } = params;

  await connectToDatabase();
  const executionDoc = await AutomationExecution.findById(executionId);
  if (!executionDoc) {
    throw new Error(`Automation execution record not found: ${executionId}`);
  }

  const auth = await resolveServerAuth(serverId, overrideAuth);
  const config = buildConfig(auth);

  const emitter = new EventEmitter();
  const buffer: string[] = [];
  const client = new Client();
  const startTime = Date.now();

  let isCancelled = false;
  let remoteStream: any = null;

  const cancelFn = () => {
    isCancelled = true;
    if (remoteStream) {
      try {
        remoteStream.signal('INT');
        remoteStream.signal('KILL');
        remoteStream.close();
      } catch {}
    }
    try {
      client.end();
    } catch {}
    emitter.emit('event', {
      type: 'cancelled',
      message: 'Execution aborted by user.',
      timestamp: new Date().toISOString(),
    });
  };

  const sessionObj: ActiveAutomationSession = {
    executionId,
    serverId,
    serverName: auth.serverName,
    host: auth.host,
    client,
    emitter,
    buffer,
    status: 'running',
    startedAt: startTime,
    cancel: cancelFn,
  };

  activeSessions.set(executionId, sessionObj);

  // Update DB status to running
  executionDoc.status = 'running';
  executionDoc.startedAt = new Date();
  await executionDoc.save();

  return new Promise((resolve, reject) => {
    client.on('ready', () => {
      emitter.emit('event', {
        type: 'connected',
        serverName: auth.serverName,
        host: auth.host,
        timestamp: new Date().toISOString(),
      });

      // Execute on remote host via bash stdin
      client.exec('bash -s', (err, stream) => {
        if (err) {
          activeSessions.delete(executionId);
          client.end();
          executionDoc.status = 'failed';
          executionDoc.errorMessage = err.message;
          executionDoc.save().catch(console.error);
          emitter.emit('event', { type: 'error', error: err.message });
          return reject(err);
        }

        remoteStream = stream;

        // Pipe the full generated script to remote bash stdin
        stream.write(scriptContent);
        stream.end();

        let fullLogs = '';

        const handleDataChunk = (chunk: Buffer) => {
          const text = chunk.toString();
          fullLogs += text;
          buffer.push(text);

          // Parse telemetry tokens from script
          const lines = text.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();

            // 1. Tool Start
            if (trimmed.startsWith('###AGY_TOOL_START:')) {
              const parts = trimmed.split(':');
              const toolId = parts[1];
              const toolName = parts[2]?.replace('###', '') || toolId;

              emitter.emit('event', {
                type: 'tool_start',
                toolId,
                toolName,
                timestamp: new Date().toISOString(),
              });

              // Update in executionDoc
              const toolEntry = executionDoc.selectedTools.find((t) => t.toolId === toolId);
              if (toolEntry) {
                toolEntry.status = 'installing';
                toolEntry.startedAt = new Date();
              }
              executionDoc.save().catch(console.error);
            }

            // 2. Tool Success
            else if (trimmed.startsWith('###AGY_TOOL_SUCCESS:')) {
              const parts = trimmed.split(':');
              const toolId = parts[1];
              const dur = parseInt(parts[2]?.replace('###', '') || '0', 10);

              emitter.emit('event', {
                type: 'tool_complete',
                toolId,
                status: 'success',
                exitCode: 0,
                durationSeconds: dur,
                timestamp: new Date().toISOString(),
              });

              const toolEntry = executionDoc.selectedTools.find((t) => t.toolId === toolId);
              if (toolEntry) {
                toolEntry.status = 'success';
                toolEntry.exitCode = 0;
                toolEntry.durationSeconds = dur;
                toolEntry.completedAt = new Date();
              }
              executionDoc.save().catch(console.error);
            }

            // 3. Tool Failed
            else if (trimmed.startsWith('###AGY_TOOL_FAILED:')) {
              const parts = trimmed.split(':');
              const toolId = parts[1];
              const code = parseInt(parts[2] || '1', 10);
              const dur = parseInt(parts[3]?.replace('###', '') || '0', 10);

              emitter.emit('event', {
                type: 'tool_complete',
                toolId,
                status: 'failed',
                exitCode: code,
                durationSeconds: dur,
                timestamp: new Date().toISOString(),
              });

              const toolEntry = executionDoc.selectedTools.find((t) => t.toolId === toolId);
              if (toolEntry) {
                toolEntry.status = 'failed';
                toolEntry.exitCode = code;
                toolEntry.durationSeconds = dur;
                toolEntry.completedAt = new Date();
              }
              executionDoc.save().catch(console.error);
            }
          }

          // Emit raw terminal stdout/stderr chunk
          emitter.emit('event', {
            type: 'stdout',
            data: text,
            timestamp: new Date().toISOString(),
          });
        };

        stream.on('data', handleDataChunk);
        stream.stderr.on('data', handleDataChunk);

        stream.on('close', async (code: number) => {
          client.end();
          const duration = Math.round((Date.now() - startTime) / 1000);
          sessionObj.completedAt = Date.now();

          let finalStatus: 'success' | 'failed' | 'partial' | 'cancelled' = 'success';
          if (isCancelled) {
            finalStatus = 'cancelled';
          } else if (code === 0) {
            finalStatus = 'success';
          } else {
            // Check if any tool succeeded
            const anySucceeded = executionDoc.selectedTools.some((t) => t.status === 'success');
            finalStatus = anySucceeded ? 'partial' : 'failed';
          }

          sessionObj.status = finalStatus;

          executionDoc.status = finalStatus;
          executionDoc.exitCode = code ?? (isCancelled ? 130 : 0);
          executionDoc.completedAt = new Date();
          executionDoc.durationSeconds = duration;
          executionDoc.logOutput = fullLogs;
          await executionDoc.save();

          emitter.emit('event', {
            type: 'finished',
            status: finalStatus,
            exitCode: code ?? 0,
            durationSeconds: duration,
            timestamp: new Date().toISOString(),
          });

          // Clean up session after 10 minutes to free memory
          setTimeout(() => {
            activeSessions.delete(executionId);
          }, 10 * 60 * 1000);

          resolve();
        });
      });
    });

    client.on('error', async (err) => {
      activeSessions.delete(executionId);
      const duration = Math.round((Date.now() - startTime) / 1000);

      executionDoc.status = 'failed';
      executionDoc.errorMessage = err.message;
      executionDoc.completedAt = new Date();
      executionDoc.durationSeconds = duration;
      executionDoc.logOutput += `\n[SSH Client Connection Error]: ${err.message}\n`;
      await executionDoc.save().catch(console.error);

      emitter.emit('event', {
        type: 'error',
        error: err.message,
        timestamp: new Date().toISOString(),
      });
      reject(err);
    });

    client.connect(config);
  });
}
