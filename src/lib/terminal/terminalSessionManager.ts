import { Client, ConnectConfig } from 'ssh2';
import crypto from 'crypto';

export interface TerminalSessionInfo {
  id: string;
  serverName: string;
  host: string;
  port: number;
  username: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  createdAt: number;
  lastActivity: number;
  error?: string | null;
}

interface ActiveSession {
  id: string;
  client: Client;
  stream: any;
  serverInfo: {
    name: string;
    host: string;
    port: number;
    username: string;
  };
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  buffer: string[];
  maxBufferSize: number;
  listeners: Set<(data: string) => void>;
  closeListeners: Set<(reason?: string) => void>;
  createdAt: number;
  lastActivity: number;
  isClosed: boolean;
  error?: string | null;
}

// Global active sessions map
const sessions = new Map<string, ActiveSession>();

// Cleanup interval: auto-close sessions inactive for > 20 minutes
if (!(global as any).__terminalCleanupInterval) {
  (global as any).__terminalCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastActivity > 20 * 60 * 1000) {
        try {
          session.stream?.end();
          session.client?.end();
        } catch {
          // ignore
        }
        sessions.delete(id);
      }
    }
  }, 60000);
}

export function generateSessionId(): string {
  return 'term_' + crypto.randomBytes(16).toString('hex');
}

export async function createTerminalSession(params: {
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  authSecret: string;
  serverName: string;
  cols?: number;
  rows?: number;
}): Promise<TerminalSessionInfo> {
  const sessionId = generateSessionId();
  const cols = params.cols || 80;
  const rows = params.rows || 24;

  return new Promise<TerminalSessionInfo>((resolve, reject) => {
    const client = new Client();
    let hasResolved = false;

    const timeoutTimer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        try {
          client.end();
        } catch {}
        reject(
          new Error(
            `Connection timed out to ${params.username}@${params.host}:${params.port} (exceeded 15 seconds). Verify network security group (NSG) port 22.`
          )
        );
      }
    }, 15000);

    const sessionObj: ActiveSession = {
      id: sessionId,
      client,
      stream: null,
      serverInfo: {
        name: params.serverName,
        host: params.host,
        port: params.port,
        username: params.username,
      },
      status: 'connecting',
      buffer: [],
      maxBufferSize: 200,
      listeners: new Set(),
      closeListeners: new Set(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isClosed: false,
    };

    sessions.set(sessionId, sessionObj);

    client.on('ready', () => {
      client.shell(
        {
          term: 'xterm-256color',
          cols,
          rows,
        },
        (err, stream) => {
          if (err) {
            clearTimeout(timeoutTimer);
            sessionObj.status = 'error';
            sessionObj.error = err.message || 'Failed to open interactive shell';
            if (!hasResolved) {
              hasResolved = true;
              client.end();
              sessions.delete(sessionId);
              return reject(err);
            }
            return;
          }

          clearTimeout(timeoutTimer);
          sessionObj.stream = stream;
          sessionObj.status = 'connected';
          sessionObj.lastActivity = Date.now();

          // Handle incoming data from shell
          stream.on('data', (chunk: Buffer) => {
            sessionObj.lastActivity = Date.now();
            const text = chunk.toString('utf-8');

            if (sessionObj.buffer.length >= sessionObj.maxBufferSize) {
              sessionObj.buffer.shift();
            }
            sessionObj.buffer.push(text);

            for (const listener of sessionObj.listeners) {
              try {
                listener(text);
              } catch (e) {
                console.error('Error in terminal data listener:', e);
              }
            }
          });

          stream.stderr?.on('data', (chunk: Buffer) => {
            sessionObj.lastActivity = Date.now();
            const text = chunk.toString('utf-8');
            for (const listener of sessionObj.listeners) {
              try {
                listener(text);
              } catch {}
            }
          });

          stream.on('close', () => {
            sessionObj.status = 'disconnected';
            sessionObj.isClosed = true;
            for (const closeListener of sessionObj.closeListeners) {
              try {
                closeListener('Remote shell closed');
              } catch {}
            }
            client.end();
            sessions.delete(sessionId);
          });

          if (!hasResolved) {
            hasResolved = true;
            resolve({
              id: sessionId,
              serverName: params.serverName,
              host: params.host,
              port: params.port,
              username: params.username,
              status: 'connected',
              createdAt: sessionObj.createdAt,
              lastActivity: sessionObj.lastActivity,
            });
          }
        }
      );
    });

    client.on('error', (err: any) => {
      clearTimeout(timeoutTimer);
      const errMsg = err.message || 'SSH connection error';
      sessionObj.status = 'error';
      sessionObj.error = errMsg;
      sessionObj.isClosed = true;

      for (const closeListener of sessionObj.closeListeners) {
        try {
          closeListener(errMsg);
        } catch {}
      }

      sessions.delete(sessionId);

      if (!hasResolved) {
        hasResolved = true;
        reject(
          new Error(
            errMsg.includes('authentication')
              ? `SSH Authentication Failed for ${params.username}@${params.host}. Please verify private key or password.`
              : errMsg
          )
        );
      }
    });

    client.on('close', () => {
      sessionObj.status = 'disconnected';
      sessionObj.isClosed = true;
      for (const closeListener of sessionObj.closeListeners) {
        try {
          closeListener('Connection closed');
        } catch {}
      }
      sessions.delete(sessionId);
    });

    // Build SSH ConnectConfig
    const connectConfig: ConnectConfig = {
      host: params.host,
      port: params.port,
      username: params.username,
      readyTimeout: 14000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
    };

    if (params.authMethod === 'password') {
      connectConfig.password = params.authSecret;
    } else {
      connectConfig.privateKey = params.authSecret;
    }

    try {
      client.connect(connectConfig);
    } catch (connectErr: any) {
      clearTimeout(timeoutTimer);
      sessions.delete(sessionId);
      if (!hasResolved) {
        hasResolved = true;
        reject(connectErr);
      }
    }
  });
}

export function getSession(sessionId: string): ActiveSession | null {
  return sessions.get(sessionId) || null;
}

export function writeToTerminalSession(sessionId: string, data: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || !session.stream || session.isClosed) {
    return false;
  }
  session.lastActivity = Date.now();
  try {
    session.stream.write(data);
    return true;
  } catch (err) {
    console.error('Error writing to terminal session:', err);
    return false;
  }
}

export function resizeTerminalSession(sessionId: string, cols: number, rows: number): boolean {
  const session = sessions.get(sessionId);
  if (!session || !session.stream || session.isClosed) {
    return false;
  }
  session.lastActivity = Date.now();
  try {
    session.stream.setWindow(rows, cols, 0, 0);
    return true;
  } catch (err) {
    console.error('Error resizing terminal window:', err);
    return false;
  }
}

export function closeTerminalSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.isClosed = true;
  session.status = 'disconnected';
  try {
    session.stream?.end();
    session.client?.end();
  } catch {
    // ignore
  }
  sessions.delete(sessionId);
  return true;
}

export function subscribeToTerminalSession(
  sessionId: string,
  onData: (data: string) => void,
  onClose: (reason?: string) => void
): (() => void) | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Replay buffered initial output so client gets prompt immediately
  for (const chunk of session.buffer) {
    try {
      onData(chunk);
    } catch {}
  }

  session.listeners.add(onData);
  session.closeListeners.add(onClose);

  return () => {
    session.listeners.delete(onData);
    session.closeListeners.delete(onClose);
  };
}
