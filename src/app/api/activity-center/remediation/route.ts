import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { resolveServerCredentials } from '@/lib/terminal/serverResolver';
import ActivityEvent from '@/models/ActivityEvent';
import ActivityAuditLog from '@/models/ActivityAuditLog';
import { Client } from 'ssh2';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { serverId, actionType, customScript } = body;

    if (!serverId) {
      return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
    }

    if (!['fix_disk', 'fix_memory', 'fix_cpu', 'custom'].includes(actionType)) {
      return NextResponse.json({ error: 'Invalid actionType. Must be fix_disk, fix_memory, fix_cpu, or custom' }, { status: 400 });
    }

    const creds = await resolveServerCredentials({ sshServerId: serverId });
    if (!creds) {
      return NextResponse.json({ error: 'Server SSH credentials could not be resolved or decrypted' }, { status: 404 });
    }

    let bashCommand = '';
    let actionTitle = '';

    if (actionType === 'fix_disk') {
      actionTitle = 'Disk Space Cleanup & Prune';
      bashCommand = `
echo "=========================================="
echo " [1/4] DISK REMEDIATION: VACUUM JOURNAL LOGS"
echo "=========================================="
sudo journalctl --vacuum-time=2d 2>&1 || true

echo ""
echo "=========================================="
echo " [2/4] CLEANING PACKAGE MANAGER CACHE"
echo "=========================================="
if which apt-get >/dev/null 2>&1; then
  sudo apt-get clean 2>&1
  sudo apt-get autoremove -y 2>&1
elif which yum >/dev/null 2>&1; then
  sudo yum clean all 2>&1
fi

echo ""
echo "=========================================="
echo " [3/4] PURGING OLD TEMPORARY FILES"
echo "=========================================="
sudo find /tmp -type f -atime +3 -delete 2>/dev/null || true
sudo find /var/tmp -type f -atime +3 -delete 2>/dev/null || true

echo ""
echo "=========================================="
echo " [4/4] PRUNING UNUSED DOCKER IMAGES & CACHE"
echo "=========================================="
if which docker >/dev/null 2>&1; then
  sudo docker system prune -f 2>&1
else
  echo "Docker engine not running on this host."
fi

echo ""
echo "=========================================="
echo " REMEDIATION COMPLETED: CURRENT DISK USAGE"
echo "=========================================="
df -h /
`;
    } else if (actionType === 'fix_memory') {
      actionTitle = 'RAM Buffer & Page Cache Flush';
      bashCommand = `
echo "=========================================="
echo " [1/3] CURRENT MEMORY UTILIZATION"
echo "=========================================="
free -m

echo ""
echo "=========================================="
echo " [2/3] FLUSHING PAGE CACHES, DENTRIES & INODES"
echo "=========================================="
sudo sync
echo 3 | sudo tee /proc/sys/vm/drop_caches

echo ""
echo "=========================================="
echo " [3/3] TOP 5 MEMORY-CONSUMING PROCESSES"
echo "=========================================="
ps aux --sort=-%mem | head -6

echo ""
echo "=========================================="
echo " REMEDIATION COMPLETED: FREED MEMORY STATUS"
echo "=========================================="
free -m
`;
    } else if (actionType === 'fix_cpu') {
      actionTitle = 'CPU Runaway Process Diagnostics & Throttling';
      bashCommand = `
echo "=========================================="
echo " [1/3] SYSTEM LOAD AVERAGE & CORE METRICS"
echo "=========================================="
uptime
lscpu | grep -E "Model name|CPU\\(s\\):|Thread" || true

echo ""
echo "=========================================="
echo " [2/3] TOP 10 CPU CONSUMING PROCESSES"
echo "=========================================="
ps aux --sort=-%cpu | head -11

echo ""
echo "=========================================="
echo " [3/3] ZOMBIE PROCESS AUDIT"
echo "=========================================="
ps -ef | grep defunct | grep -v grep || echo "No defunct/zombie processes detected."
`;
    } else if (actionType === 'custom') {
      actionTitle = 'Custom Server Remediation Script';
      bashCommand = customScript || 'echo "No custom script provided"';
    }

    // Execute via SSH
    const executionOutput = await new Promise<string>((resolve, reject) => {
      const client = new Client();
      let output = '';
      const timeout = setTimeout(() => {
        try { client.end(); } catch {}
        resolve(output + '\n[ERROR] Command execution timed out after 30 seconds.');
      }, 30000);

      client
        .on('ready', () => {
          client.exec(bashCommand, (err, stream) => {
            if (err) {
              clearTimeout(timeout);
              try { client.end(); } catch {}
              return reject(err);
            }

            stream
              .on('data', (data: Buffer) => {
                output += data.toString();
              })
              .stderr.on('data', (data: Buffer) => {
                output += data.toString();
              })
              .on('close', () => {
                clearTimeout(timeout);
                try { client.end(); } catch {}
                resolve(output);
              });
          });
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          try { client.end(); } catch {}
          reject(err);
        })
        .connect({
          host: creds.host,
          port: creds.port || 22,
          username: creds.username,
          ...(creds.authMethod === 'password'
            ? { password: creds.authSecret }
            : { privateKey: creds.authSecret }),
          readyTimeout: 10000,
        });
    });

    // Record Activity
    await ActivityEvent.create({
      eventId: `rem_${Date.now()}`,
      platform: 'onprem',
      module: 'troubleshooting',
      resourceType: 'Linux Server',
      resourceId: creds.serverId,
      resourceName: creds.serverName,
      action: `Executed ${actionTitle}`,
      status: 'success',
      initiator: 'DevOps Engineer',
      details: `Remediation action '${actionTitle}' executed on host ${creds.host}`,
      source: 'Server Audit',
      timestamp: new Date(),
    });

    await ActivityAuditLog.create({
      action: 'SERVER_REMEDIATION_EXECUTED',
      actor: 'DevOps Engineer',
      targetType: 'Server',
      targetId: creds.serverId,
      details: `Executed ${actionTitle} on ${creds.serverName} (${creds.host})`,
    });

    return NextResponse.json({
      success: true,
      actionTitle,
      serverName: creds.serverName,
      host: creds.host,
      output: executionOutput,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
