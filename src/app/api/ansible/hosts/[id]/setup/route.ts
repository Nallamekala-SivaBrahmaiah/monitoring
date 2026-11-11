import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleController from '@/models/AnsibleController';
import { buildSSHConfig, executeRemoteSSHCommand } from '@/lib/ansible/ansibleSSH';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';
import { Client } from 'ssh2';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const host = await AnsibleHost.findById(id);
    if (!host) {
      return NextResponse.json({ success: false, error: 'Managed node not found.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    // If custom secret was passed directly in the setup modal
    if (body.authSecret && typeof body.authSecret === 'string' && body.authSecret.trim()) {
      const encrypted = encryptSecret(body.authSecret.trim());
      host.encryptedAuthSecret = encrypted.encrypted;
      host.authSecretIv = encrypted.iv;
      host.authSecretTag = encrypted.tag;
      if (body.authMethod) host.authMethod = body.authMethod;
      if (body.username) host.username = body.username.trim();
      await host.save();
    } else if (!host.encryptedAuthSecret) {
      // Inherit credentials from assigned Ansible Controller if available
      const assignedController =
        (host.controllerId ? await AnsibleController.findById(host.controllerId).lean() : null) ||
        (await AnsibleController.findOne({ isActive: true }).lean()) ||
        (await AnsibleController.findOne({}).lean());
      if (assignedController && assignedController.encryptedAuthSecret) {
        host.encryptedAuthSecret = assignedController.encryptedAuthSecret;
        host.authSecretIv = assignedController.authSecretIv || '';
        host.authSecretTag = assignedController.authSecretTag || '';
        host.authMethod = assignedController.authMethod || 'privateKey';
        await host.save();
      }
    }

    if (!host.encryptedAuthSecret) {
      return NextResponse.json(
        {
          success: false,
          error: `No SSH credentials stored for managed node "${host.name}". Please provide an SSH Private Key (.pem).`,
        },
        { status: 400 }
      );
    }

    const sshConfig = buildSSHConfig(
      {
        ip: host.ip,
        port: host.port || 22,
        username: host.username,
        authMethod: host.authMethod,
        encryptedAuthSecret: host.encryptedAuthSecret,
        authSecretIv: host.authSecretIv,
        authSecretTag: host.authSecretTag,
      },
      25000
    );

    const setupScript = `
echo "[1/3] Checking host $(hostname)..."
if command -v apt-get >/dev/null 2>&1; then
  echo "[2/3] Verifying/installing Python3 prerequisites on Ubuntu/Debian..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-apt python3-pip
elif command -v dnf >/dev/null 2>&1; then
  echo "[2/3] Verifying/installing Python3 prerequisites on Amazon Linux / RHEL..."
  sudo dnf install -y python3 python3-pip
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y python3 python3-pip
fi

echo "[3/3] Inspecting Python environment..."
python3 --version || python --version
uptime -p 2>/dev/null || uptime
echo "Managed node is ready for Ansible execution!"
    `.trim();

    const startTime = Date.now();
    const client = new Client();
    let logs = '';

    await new Promise<void>((resolve, reject) => {
      client.on('ready', async () => {
        try {
          await executeRemoteSSHCommand(client, setupScript, (chunk) => {
            logs += chunk;
          });
          client.end();
          resolve();
        } catch (err) {
          client.end();
          reject(err);
        }
      });

      client.on('error', (err) => {
        reject(err);
      });

      client.connect(sshConfig);
    });

    const latencyMs = Date.now() - startTime;

    host.status = 'Connected';
    host.lastCheckedAt = new Date();
    host.lastLatencyMs = Math.min(latencyMs, 999);
    host.lastError = null;

    // Detect OS from output if possible
    if (logs.includes('Ubuntu')) {
      host.os = 'Ubuntu Linux';
    } else if (logs.includes('Amazon Linux')) {
      host.os = 'Amazon Linux';
    }

    await host.save();

    return NextResponse.json({
      success: true,
      message: `Managed node "${host.name}" (${host.ip}) successfully configured and connected!`,
      status: host.status,
      latencyMs: host.lastLatencyMs,
      logs,
      host,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Failed to setup managed node: ${err.message}` },
      { status: 500 }
    );
  }
}
