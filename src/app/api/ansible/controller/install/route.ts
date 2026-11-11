import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import { buildSSHConfig, executeRemoteSSHCommand } from '@/lib/ansible/ansibleSSH';
import { inspectRemoteSSHController, getAnsibleControllerInfo } from '@/lib/ansible/ansibleController';
import { Client } from 'ssh2';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const controller = await AnsibleController.findOne({ isPrimary: true });
    if (!controller) {
      return NextResponse.json(
        { success: false, error: 'No primary controller node configured.' },
        { status: 400 }
      );
    }

    if (controller.type === 'local') {
      return NextResponse.json({
        success: false,
        error:
          'Controller is currently set to Local Machine (Windows). To install Ansible on Windows, run "pip install ansible" in PowerShell, or designate an AWS EC2 / Azure Linux instance as your primary controller.',
      });
    }

    if (!controller.encryptedAuthSecret) {
      return NextResponse.json(
        { success: false, error: 'No SSH credentials stored for controller node.' },
        { status: 400 }
      );
    }

    // Connect to controller over SSH
    const sshConfig = buildSSHConfig(
      {
        ip: controller.ipAddress,
        port: controller.port || 22,
        username: controller.username,
        authMethod: controller.authMethod,
        encryptedAuthSecret: controller.encryptedAuthSecret,
        authSecretIv: controller.authSecretIv!,
        authSecretTag: controller.authSecretTag!,
      },
      25000
    );

    const installScript = `
echo "[1/4] Detecting Linux package manager on $(hostname)..."
if command -v apt-get >/dev/null 2>&1; then
  echo "[2/4] Updating apt package repository..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
  echo "[3/4] Installing Ansible, Python3, and Pip packages..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y software-properties-common
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ansible python3-pip python3
elif command -v dnf >/dev/null 2>&1; then
  echo "[2/4] Installing Ansible via dnf..."
  sudo dnf install -y ansible python3-pip
elif command -v yum >/dev/null 2>&1; then
  echo "[2/4] Installing Ansible via yum..."
  sudo yum install -y epel-release || true
  sudo yum install -y ansible python3-pip
elif command -v pip3 >/dev/null 2>&1; then
  echo "[2/4] Installing Ansible via pip3..."
  sudo pip3 install ansible
else
  echo "[2/4] Installing Ansible via python pip..."
  python3 -m pip install --user ansible || true
fi

echo "[4/4] Verifying Ansible installation..."
ansible --version
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

      client.on('error', (err) => {
        reject(err);
      });

      client.connect(sshConfig);
    });

    // Re-inspect remote machine specs
    const inspectResult = await inspectRemoteSSHController(
      {
        ip: controller.ipAddress,
        port: controller.port || 22,
        username: controller.username,
        authMethod: controller.authMethod,
        encryptedAuthSecret: controller.encryptedAuthSecret,
        authSecretIv: controller.authSecretIv!,
        authSecretTag: controller.authSecretTag!,
      },
      8000
    );

    controller.ansibleVersion = inspectResult.ansibleVersion;
    controller.pythonVersion = inspectResult.pythonVersion;
    controller.status = inspectResult.success ? 'Online' : 'Offline';
    controller.sshStatus = inspectResult.success ? 'Connected' : 'Disconnected';
    controller.os = inspectResult.os || controller.os;
    controller.uptimeFormatted = inspectResult.uptimeFormatted || controller.uptimeFormatted;
    controller.cpuCores = inspectResult.cpuCores || controller.cpuCores;
    controller.memoryFormatted = inspectResult.memoryFormatted || controller.memoryFormatted;
    controller.lastCheckedAt = new Date();
    controller.lastLatencyMs = inspectResult.latencyMs || null;
    await controller.save();

    const updatedInfo = await getAnsibleControllerInfo(false);

    return NextResponse.json({
      success: true,
      message: `Ansible successfully installed on controller "${controller.name}" (${controller.ipAddress})!`,
      version: inspectResult.ansibleVersion,
      logs,
      controller: updatedInfo,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Failed to install Ansible on controller: ${err.message}` },
      { status: 500 }
    );
  }
}

