import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleController from '@/models/AnsibleController';
import { buildSSHConfig, executeRemoteSSHCommand } from '@/lib/ansible/ansibleSSH';
import { Client } from 'ssh2';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const controllerIdParam = searchParams.get('controllerId');

    let targetController: any = null;
    if (controllerIdParam && controllerIdParam !== 'all') {
      targetController = await AnsibleController.findById(controllerIdParam).lean();
    }
    if (!targetController) {
      targetController =
        (await AnsibleController.findOne({ isActive: true }).lean()) ||
        (await AnsibleController.findOne({}).lean());
    }

    const filter: any = {};
    if (targetController) {
      filter.controllerId = targetController._id;
    }

    const hosts = await AnsibleHost.find(filter);
    if (hosts.length === 0) {
      return NextResponse.json(
        { success: false, error: `No managed workers registered under controller "${targetController?.name || 'selected'}".` },
        { status: 400 }
      );
    }

    const results: Array<{ id: string; name: string; ip: string; success: boolean; error?: string }> = [];

    const setupScript = `
if command -v apt-get >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y >/dev/null 2>&1
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-apt python3-pip >/dev/null 2>&1
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y python3 python3-pip >/dev/null 2>&1
fi
python3 --version
    `.trim();

    for (const host of hosts) {
      // Inherit credentials from controller if missing on node
      if (!host.encryptedAuthSecret) {
        if (targetController && targetController.encryptedAuthSecret) {
          host.encryptedAuthSecret = targetController.encryptedAuthSecret;
          host.authSecretIv = targetController.authSecretIv || '';
          host.authSecretTag = targetController.authSecretTag || '';
          host.authMethod = targetController.authMethod || 'privateKey';
          await host.save();
        } else {
          results.push({ id: host._id.toString(), name: host.name, ip: host.ip, success: false, error: 'No SSH credentials' });
          continue;
        }
      }

      const startTime = Date.now();
      try {
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

        const client = new Client();
        await new Promise<void>((resolve, reject) => {
          client.on('ready', async () => {
            try {
              await executeRemoteSSHCommand(client, setupScript, () => {});
              client.end();
              resolve();
            } catch (err) {
              client.end();
              reject(err);
            }
          });
          client.on('error', reject);
          client.connect(sshConfig);
        });

        const latencyMs = Date.now() - startTime;
        host.status = 'Connected';
        host.lastCheckedAt = new Date();
        host.lastLatencyMs = Math.min(latencyMs, 999);
        host.lastError = null;
        await host.save();

        results.push({ id: host._id.toString(), name: host.name, ip: host.ip, success: true });
      } catch (err: any) {
        host.status = 'Authentication Failed';
        host.lastCheckedAt = new Date();
        host.lastError = err.message || 'Connection failed';
        await host.save();

        results.push({ id: host._id.toString(), name: host.name, ip: host.ip, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Setup completed: ${successCount} of ${hosts.length} workers connected for controller "${targetController?.name}".`,
      results,
      connectedCount: successCount,
      total: hosts.length,
      controllerName: targetController?.name,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
