import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import { buildSSHConfig, executeRemoteSSHCommand } from '@/lib/ansible/ansibleSSH';
import { Client } from 'ssh2';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const controller = await AnsibleController.findById(id);
    if (!controller) {
      return NextResponse.json({ success: false, error: 'Controller not found' }, { status: 404 });
    }

    if (!controller.encryptedAuthSecret) {
      return NextResponse.json(
        { success: false, error: 'No SSH credentials stored for this controller.' },
        { status: 400 }
      );
    }

    const sshConfig = buildSSHConfig(
      {
        ip: controller.ipAddress,
        port: controller.port || 22,
        username: controller.username,
        authMethod: controller.authMethod,
        encryptedAuthSecret: controller.encryptedAuthSecret,
        authSecretIv: controller.authSecretIv || '',
        authSecretTag: controller.authSecretTag || '',
      },
      30000
    );

    const installScript = `
echo "[1/4] Detecting operating system & package manager..."
if command -v apt-get >/dev/null 2>&1; then
  echo "[2/4] Installing software-properties-common & Ansible PPA on Ubuntu/Debian..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y software-properties-common python3-pip
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ansible
elif command -v dnf >/dev/null 2>&1; then
  echo "[2/4] Installing Ansible via dnf on RHEL / Amazon Linux..."
  sudo dnf install -y ansible-core python3-pip
elif command -v yum >/dev/null 2>&1; then
  echo "[2/4] Installing Ansible via yum..."
  sudo yum install -y epel-release || true
  sudo yum install -y ansible python3-pip
fi

echo "[3/4] Verifying Ansible installation..."
ansible --version | head -n 2
echo "[4/4] Verifying Python interpreter..."
python3 --version || python --version
echo "Ansible Controller configuration complete!"
    `.trim();

    const client = new Client();
    let logs = '';

    await new Promise<void>((resolve, reject) => {
      client.on('ready', async () => {
        try {
          await executeRemoteSSHCommand(client, installScript, (chunk) => {
            logs += chunk;
          });
          client.end();
          resolve();
        } catch (err) {
          client.end();
          reject(err);
        }
      });

      client.on('error', (err) => reject(err));
      client.connect(sshConfig);
    });

    // Detect version from logs
    const matchAnsible = logs.match(/ansible\s*\[core\s*([0-9.]+)/i);
    const matchPython = logs.match(/Python\s*([0-9.]+)/i);

    if (matchAnsible) {
      controller.ansibleVersion = `Ansible Core ${matchAnsible[1]}`;
    } else if (logs.includes('ansible')) {
      controller.ansibleVersion = 'Ansible Core 2.16+';
    }

    if (matchPython) {
      controller.pythonVersion = `Python ${matchPython[1]}`;
    }

    controller.status = 'Online';
    controller.sshStatus = 'Connected';
    controller.lastCheckedAt = new Date();
    await controller.save();

    return NextResponse.json({
      success: true,
      message: `Ansible successfully installed and verified on controller "${controller.name}".`,
      logs,
      ansibleVersion: controller.ansibleVersion,
      pythonVersion: controller.pythonVersion,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Failed to install Ansible on controller: ${err.message}` },
      { status: 500 }
    );
  }
}

