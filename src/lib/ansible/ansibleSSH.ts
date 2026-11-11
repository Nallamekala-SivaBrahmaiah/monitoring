import { Client, ConnectConfig } from 'ssh2';
import { decryptSecret } from '@/lib/serverMonitoring/crypto';

export interface SSHConnectionTestResult {
  success: boolean;
  latencyMs: number;
  banner?: string;
  osInfo?: string;
  error?: string;
}

export interface SSHHostAuth {
  ip: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  encryptedAuthSecret: string;
  authSecretIv: string;
  authSecretTag: string;
}

/**
 * Build ConnectConfig from encrypted credentials
 */
export function buildSSHConfig(host: SSHHostAuth, timeoutMs: number = 10000): ConnectConfig {
  let secret = '';
  try {
    secret = decryptSecret({
      encrypted: host.encryptedAuthSecret,
      iv: host.authSecretIv,
      tag: host.authSecretTag,
    });
  } catch (err: any) {
    throw new Error(`Failed to decrypt SSH credentials: ${err.message}`);
  }

  const config: ConnectConfig = {
    host: host.ip,
    port: host.port || 22,
    username: host.username,
    readyTimeout: timeoutMs,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3,
  };

  if (host.authMethod === 'password') {
    config.password = secret;
  } else {
    // Clean key formatting if needed
    config.privateKey = secret.trim();
  }

  return config;
}

/**
 * Test real SSH connection to a host
 */
export async function testSSHConnection(
  host: SSHHostAuth,
  timeoutMs: number = 8000
): Promise<SSHConnectionTestResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    let client: Client | null = null;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      if (client) {
        try {
          client.end();
        } catch {}
      }
      resolve({
        success: false,
        latencyMs: Date.now() - startTime,
        error: `Connection timed out after ${timeoutMs / 1000}s`,
      });
    }, timeoutMs);

    try {
      client = new Client();
      const config = buildSSHConfig(host, timeoutMs);

      client.on('ready', () => {
        if (timedOut) return;
        const latencyMs = Date.now() - startTime;

        // Run a lightweight command to query OS details
        client!.exec('uname -srm; cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | head -n 1', (err, stream) => {
          if (err) {
            clearTimeout(timer);
            client!.end();
            resolve({
              success: true,
              latencyMs,
              banner: 'SSH Connected',
              osInfo: 'Linux',
            });
            return;
          }

          let output = '';
          stream.on('data', (d: Buffer) => {
            output += d.toString();
          });

          stream.on('close', () => {
            clearTimeout(timer);
            client!.end();

            let osInfo = 'Linux';
            const prettyLine = output.split('\n').find((l) => l.includes('PRETTY_NAME='));
            if (prettyLine) {
              osInfo = prettyLine.replace(/PRETTY_NAME=|"/g, '').trim();
            } else if (output.trim()) {
              osInfo = output.split('\n')[0].trim();
            }

            resolve({
              success: true,
              latencyMs,
              banner: 'SSH Connection Established',
              osInfo,
            });
          });
        });
      });

      client.on('error', (err) => {
        if (timedOut) return;
        clearTimeout(timer);
        resolve({
          success: false,
          latencyMs: Date.now() - startTime,
          error: err.message || 'SSH authentication / connection failed',
        });
      });

      client.connect(config);
    } catch (e: any) {
      if (timedOut) return;
      clearTimeout(timer);
      resolve({
        success: false,
        latencyMs: Date.now() - startTime,
        error: e.message || 'SSH configuration error',
      });
    }
  });
}

/**
 * Execute a single remote command over SSH with streaming stdout/stderr
 */
export function executeRemoteSSHCommand(
  client: Client,
  cmd: string,
  onOutput?: (chunk: string) => void
): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve, reject) => {
    client.exec(cmd, (err, stream) => {
      if (err) return reject(err);

      let fullOutput = '';

      stream.on('data', (data: Buffer) => {
        const text = data.toString();
        fullOutput += text;
        if (onOutput) onOutput(text);
      });

      stream.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        fullOutput += text;
        if (onOutput) onOutput(text);
      });

      stream.on('close', (code: number) => {
        resolve({ exitCode: code ?? 0, output: fullOutput });
      });
    });
  });
}

