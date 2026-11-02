import { WebSocketServer, WebSocket } from 'ws';
import {
  createTerminalSession,
  writeToTerminalSession,
  resizeTerminalSession,
  closeTerminalSession,
  subscribeToTerminalSession,
  getSession,
} from './terminalSessionManager';
import { resolveServerCredentials } from './serverResolver';
import { verifySessionToken } from '@/lib/auth';

let wssInstance: WebSocketServer | null = null;

export function startTerminalWebSocketServer(port = 3001): WebSocketServer | null {
  if (wssInstance) {
    return wssInstance;
  }

  const wsPort = parseInt(process.env.TERMINAL_WS_PORT || `${port}`, 10) || 3001;

  try {
    const wss = new WebSocketServer({ port: wsPort });
    wssInstance = wss;

    wss.on('listening', () => {
      console.log(`[SSH Terminal] WebSocket server successfully listening on port ${wsPort}`);
    });

    wss.on('connection', (ws: WebSocket) => {
      let activeSessionId: string | null = null;
      let unsubscribe: (() => void) | null = null;

      ws.on('message', async (rawMessage: any) => {
        try {
          const msg = JSON.parse(rawMessage.toString());

          // 1. Initialize or Attach Session
          if (msg.type === 'init') {
            // Verify authentication if token provided
            if (msg.token) {
              const session = verifySessionToken(msg.token);
              if (!session) {
                ws.send(
                  JSON.stringify({
                    type: 'error',
                    error: 'Authentication failed. Please log in to access terminal.',
                  })
                );
                ws.close();
                return;
              }
            }

            let sId = msg.sessionId;

            // If existing session ID provided, attach to it
            if (sId && getSession(sId)) {
              activeSessionId = sId;
            } else {
              // Otherwise, resolve credentials and establish new session
              const creds = await resolveServerCredentials({
                sshServerId: msg.sshServerId,
                vmId: msg.vmId,
                resourceId: msg.resourceId,
                name: msg.name,
                host: msg.host,
              });

              if (!creds) {
                ws.send(
                  JSON.stringify({
                    type: 'error',
                    error:
                      'No saved SSH credentials found for this server. Please configure SSH credentials in the server settings first.',
                  })
                );
                ws.close();
                return;
              }

              const termSession = await createTerminalSession({
                host: creds.host,
                port: creds.port,
                username: creds.username,
                authMethod: creds.authMethod,
                authSecret: creds.authSecret,
                serverName: creds.serverName,
                cols: msg.cols || 80,
                rows: msg.rows || 24,
              });

              sId = termSession.id;
              activeSessionId = sId;
            }

            // Subscribe to shell stream
            unsubscribe = subscribeToTerminalSession(
              sId,
              (data) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'data', data }));
                }
              },
              (reason) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'status',
                      status: 'disconnected',
                      message: reason || 'Session disconnected',
                    })
                  );
                }
              }
            );

            ws.send(
              JSON.stringify({
                type: 'status',
                status: 'connected',
                sessionId: sId,
                message: `Connected to ${msg.name || 'VM'}`,
              })
            );
            return;
          }

          // 2. Interactive Shell Input
          if (msg.type === 'input') {
            const sid = msg.sessionId || activeSessionId;
            if (sid && msg.data) {
              writeToTerminalSession(sid, msg.data);
            }
            return;
          }

          // 3. Terminal Resize
          if (msg.type === 'resize') {
            const sid = msg.sessionId || activeSessionId;
            if (sid && msg.cols && msg.rows) {
              resizeTerminalSession(sid, msg.cols, msg.rows);
            }
            return;
          }

          // 4. Disconnect
          if (msg.type === 'disconnect') {
            const sid = msg.sessionId || activeSessionId;
            if (sid) {
              closeTerminalSession(sid);
            }
            if (unsubscribe) unsubscribe();
            ws.close();
            return;
          }
        } catch (err: any) {
          console.error('[SSH Terminal WS Error]:', err);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', error: err.message || 'Terminal error' }));
          }
        }
      });

      ws.on('close', () => {
        if (unsubscribe) unsubscribe();
        if (activeSessionId) {
          closeTerminalSession(activeSessionId);
        }
      });

      ws.on('error', (err) => {
        console.error('[SSH Terminal WS Client Error]:', err);
      });
    });

    wss.on('error', (err: any) => {
      console.warn('[SSH Terminal WS Server Note]:', err.message);
    });

    return wss;
  } catch (e: any) {
    console.warn('[SSH Terminal WS Startup Note]: Could not bind port', wsPort, e.message);
    return null;
  }
}
