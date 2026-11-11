import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import AnsibleHost from '@/models/AnsibleHost';
import Server from '@/models/Server';
import AnsibleAdHocExecution, {
  IAnsibleAdHocExecution,
  IAdHocWorkerResult,
} from '@/models/AnsibleAdHocExecution';
import { buildSSHConfig, executeRemoteSSHCommand } from './ansibleSSH';
import { decryptSecret } from '@/lib/serverMonitoring/crypto';
import { Client } from 'ssh2';

// In-memory active job tracker for cancellation
interface ActiveAdHocHandle {
  sshClient?: Client;
  cancelled?: boolean;
}

const activeAdHocJobs = new Map<string, ActiveAdHocHandle>();

export const ALLOWED_ANSIBLE_MODULES = [
  'command',
  'shell',
  'apt',
  'dnf',
  'yum',
  'service',
  'package',
  'copy',
  'file',
  'user',
  'setup',
  'ping',
  'uri',
] as const;

export type AllowedAnsibleModule = typeof ALLOWED_ANSIBLE_MODULES[number];

// Security blocklist for dangerous or destructive commands
const DANGEROUS_COMMAND_PATTERNS = [
  /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f\s+(\/|\/\*|~|\$HOME)\b/i,
  /\bmkfs(\.[a-z0-9]+)?\s+/i,
  /\bfdisk\s+\/dev\//i,
  /\bdd\s+if=\/dev\/(zero|random|urandom)\s+of=\/dev\//i,
  /:()\s*\{\s*:\|\:&\s*\};\s*:/, // Fork bomb
  /\bchmod\s+-[a-zA-Z]*R\s+777\s+\/\b/i,
  /\bchown\s+-[a-zA-Z]*R\s+.*\s+\/\b/i,
  /\b(shutdown|reboot|poweroff|halt|init\s+0)\b/i,
  />\s*\/dev\/(sda|sdb|xvda|vda|nvme\d+n\d+)/i,
];

/**
 * Validates command arguments against dangerous / destructive operations
 */
export function validateCommandSafety(moduleName: string, commandArgs: string): { safe: boolean; reason?: string } {
  const trimmed = (commandArgs || '').trim();

  // Validate module
  if (!ALLOWED_ANSIBLE_MODULES.includes(moduleName as any)) {
    return {
      safe: false,
      reason: `Module "${moduleName}" is not permitted. Allowed modules: ${ALLOWED_ANSIBLE_MODULES.join(', ')}`,
    };
  }

  // Check dangerous patterns
  for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason: `Command blocked by security filter: destructive or system-critical operations are not permitted.`,
      };
    }
  }

  return { safe: true };
}

function logTime(): string {
  return `[${new Date().toISOString().replace('T', ' ').substring(0, 19)}]`;
}

/**
 * Cancel a running ad-hoc execution
 */
export async function cancelAdHocExecution(executionId: string): Promise<boolean> {
  const handle = activeAdHocJobs.get(executionId);
  if (handle) {
    handle.cancelled = true;
    if (handle.sshClient) {
      try {
        handle.sshClient.end();
      } catch {}
    }
    activeAdHocJobs.delete(executionId);

    await connectToDatabase();
    await AnsibleAdHocExecution.findByIdAndUpdate(executionId, {
      status: 'CANCELLED',
      endTime: new Date(),
      errorMessage: 'Cancelled by user',
      $set: { 'logs': '\n[CANCELLED] Execution was aborted by user.\n' },
    });
    return true;
  }
  return false;
}

/**
 * Execute an Ansible Ad-hoc command through the selected controller node
 */
export async function executeAnsibleAdHoc(executionId: string): Promise<void> {
  await connectToDatabase();

  const execution = await AnsibleAdHocExecution.findById(executionId);
  if (!execution) {
    throw new Error(`Execution ${executionId} not found`);
  }

  const jobHandle: ActiveAdHocHandle = {};
  activeAdHocJobs.set(executionId, jobHandle);

  const startTime = Date.now();
  execution.status = 'RUNNING';
  execution.startTime = new Date();
  execution.logs = `${logTime()} Initializing Ansible Ad-hoc Execution [Job: ${execution.jobId}]\n`;
  execution.logs += `${logTime()} Controller: ${execution.controllerName}\n`;
  execution.logs += `${logTime()} Module: ${execution.moduleName}\n`;
  if (execution.commandArgs) {
    execution.logs += `${logTime()} Arguments: ${execution.commandArgs}\n`;
  }
  await execution.save();

  try {
    // 1. Resolve & Validate Controller
    const controller = await AnsibleController.findById(execution.controllerId);
    if (!controller) {
      throw new Error(`Controller not found or no longer configured.`);
    }

    if (!controller.encryptedAuthSecret) {
      throw new Error(`Controller "${controller.name}" has no SSH credentials stored. Please configure SSH credentials.`);
    }

    // 2. Resolve & Validate Target Workers
    let targetWorkers: any[] = [];
    if (execution.targetScope === 'all') {
      targetWorkers = await AnsibleHost.find({
        $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
      }).sort({ name: 1 });
    } else {
      targetWorkers = await AnsibleHost.find({
        _id: { $in: execution.targetWorkerIds },
        $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
      }).sort({ name: 1 });
    }

    if (targetWorkers.length === 0) {
      throw new Error(
        `No valid managed workers found for controller "${controller.name}". Verify target workers are assigned to this controller.`
      );
    }

    execution.targetWorkerNames = targetWorkers.map((w) => w.name);
    execution.logs += `${logTime()} Resolved Target Workers (${targetWorkers.length}): ${targetWorkers
      .map((w) => `${w.name} (${w.ip})`)
      .join(', ')}\n\n`;
    await execution.save();

    // 3. Connect to Controller via SSH
    execution.logs += `${logTime()} Connecting to Controller Node "${controller.name}" (${controller.ipAddress}:22)...\n`;
    await execution.save();

    const controllerClient = new Client();
    jobHandle.sshClient = controllerClient;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          controllerClient.end();
        } catch {}
        reject(new Error(`SSH connection to controller "${controller.name}" timed out after 20s`));
      }, 20000);

      controllerClient.on('ready', () => {
        clearTimeout(timer);
        resolve();
      });

      controllerClient.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Controller SSH error: ${err.message}`));
      });

      try {
        const config = buildSSHConfig({
          ip: controller.ipAddress,
          port: controller.port || 22,
          username: controller.username,
          authMethod: controller.authMethod,
          encryptedAuthSecret: controller.encryptedAuthSecret!,
          authSecretIv: controller.authSecretIv || '',
          authSecretTag: controller.authSecretTag || '',
        }, 20000);
        controllerClient.connect(config);
      } catch (err: any) {
        clearTimeout(timer);
        reject(err);
      }
    });

    execution.logs += `${logTime()} Controller SSH connected successfully.\n`;

    // 4. Create Workspace and Inventory on Controller
    const safeJobId = execution.jobId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const workDir = `/tmp/ansible_adhoc_${safeJobId}`;

    execution.logs += `${logTime()} Preparing controller workspace: ${workDir}\n`;
    await executeRemoteSSHCommand(controllerClient, `mkdir -p "${workDir}" && chmod 700 "${workDir}"`);

    // Write keys and inventory entries
    let inventoryLines = ['[workers]'];
    const keyFilesToClean: string[] = [];

    for (const worker of targetWorkers) {
      let workerKey = '';

      // Decrypt worker's private key
      if (worker.encryptedAuthSecret) {
        try {
          workerKey = decryptSecret({
            encrypted: worker.encryptedAuthSecret,
            iv: worker.authSecretIv || '',
            tag: worker.authSecretTag || '',
          });
        } catch {}
      }

      // If worker doesn't have individual key, inherit from controller
      if (!workerKey && controller.encryptedAuthSecret) {
        try {
          workerKey = decryptSecret({
            encrypted: controller.encryptedAuthSecret,
            iv: controller.authSecretIv || '',
            tag: controller.authSecretTag || '',
          });
        } catch {}
      }

      // Fallback: search Server monitoring
      if (!workerKey) {
        const srv = await Server.findOne({
          $or: [{ host: worker.ip }, { ip: worker.ip }, { name: worker.name }],
          encryptedAuthSecret: { $exists: true, $ne: '' },
        }).lean();
        if (srv && srv.encryptedAuthSecret) {
          try {
            workerKey = decryptSecret({
              encrypted: srv.encryptedAuthSecret,
              iv: srv.authSecretIv || '',
              tag: srv.authSecretTag || '',
            });
          } catch {}
        }
      }

      const safeWorkerName = worker.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const keyPath = `${workDir}/key_${safeWorkerName}.pem`;

      if (workerKey && workerKey.trim()) {
        // Write key on controller with base64 to avoid shell quote corruption
        const b64Key = Buffer.from(workerKey.trim() + '\n').toString('base64');
        await executeRemoteSSHCommand(
          controllerClient,
          `echo "${b64Key}" | base64 -d > "${keyPath}" && chmod 600 "${keyPath}"`
        );
        keyFilesToClean.push(keyPath);

        const workerUser = worker.username || (worker.provider === 'azure' ? 'azureuser' : 'ubuntu');
        const workerIp = worker.ip || worker.privateIp;

        inventoryLines.push(
          `${safeWorkerName} ansible_host=${workerIp} ansible_user=${workerUser} ansible_ssh_private_key_file=${keyPath} ansible_ssh_common_args="-o StrictHostKeyChecking=no -o ConnectTimeout=10"`
        );
      } else {
        // Password or default key
        const workerUser = worker.username || (worker.provider === 'azure' ? 'azureuser' : 'ubuntu');
        const workerIp = worker.ip || worker.privateIp;
        inventoryLines.push(
          `${safeWorkerName} ansible_host=${workerIp} ansible_user=${workerUser} ansible_ssh_common_args="-o StrictHostKeyChecking=no -o ConnectTimeout=10"`
        );
      }
    }

    const inventoryContent = inventoryLines.join('\n');
    const b64Inventory = Buffer.from(inventoryContent).toString('base64');
    await executeRemoteSSHCommand(
      controllerClient,
      `echo "${b64Inventory}" | base64 -d > "${workDir}/inventory.ini"`
    );

    // Write minimal ansible.cfg to disable host key checks and speed up runs
    const ansibleCfg = `
[defaults]
inventory = ./inventory.ini
host_key_checking = False
timeout = 25
command_warnings = False
deprecation_warnings = False
display_skipped_hosts = True
stdout_callback = default
`.trim();
    const b64Cfg = Buffer.from(ansibleCfg).toString('base64');
    await executeRemoteSSHCommand(
      controllerClient,
      `echo "${b64Cfg}" | base64 -d > "${workDir}/ansible.cfg"`
    );

    // 5. Construct Ansible Ad-hoc Command
    const module = execution.moduleName;
    const args = execution.commandArgs.trim();

    let ansibleArgsFlag = '';
    if (args) {
      // Escape single quotes for bash safety
      const escapedArgs = args.replace(/'/g, `'\\''`);
      ansibleArgsFlag = `-a '${escapedArgs}'`;
    }

    const ansibleCmd = `cd "${workDir}" && ANSIBLE_HOST_KEY_CHECKING=False ansible all -i inventory.ini -m ${module} ${ansibleArgsFlag} -v`;

    execution.logs += `\n$ ${ansibleCmd}\n`;
    execution.logs += `--------------------------------------------------------------------------------\n`;
    await execution.save();

    let rawOutput = '';
    let lastSave = Date.now();

    const result = await executeRemoteSSHCommand(controllerClient, ansibleCmd, (chunk) => {
      rawOutput += chunk;
      execution.logs += chunk;

      // Throttle live log updates to DB (every 1.5s)
      if (Date.now() - lastSave > 1500) {
        lastSave = Date.now();
        execution.save().catch(() => {});
      }
    });

    execution.logs += `\n--------------------------------------------------------------------------------\n`;
    execution.logs += `${logTime()} Ansible ad-hoc command completed (exit code: ${result.exitCode}).\n`;

    // 6. Cleanup controller workspace securely
    await executeRemoteSSHCommand(controllerClient, `rm -rf "${workDir}"`).catch(() => {});
    try {
      controllerClient.end();
    } catch {}

    // 7. Parse per-worker results from the raw output
    const workerResults: IAdHocWorkerResult[] = [];
    const executionDuration = Date.now() - startTime;

    for (const worker of targetWorkers) {
      const safeName = worker.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const wResult = parseWorkerAdHocOutput(rawOutput, safeName, worker.name, worker.ip, executionDuration);
      workerResults.push(wResult);
    }

    execution.workerResults = workerResults;
    execution.durationMs = executionDuration;
    execution.durationFormatted = `${(executionDuration / 1000).toFixed(1)}s`;
    execution.endTime = new Date();

    // Determine overall status
    const allSuccess = workerResults.every((r) => r.status === 'SUCCESS' || r.status === 'CHANGED');
    const allFailed = workerResults.every((r) => r.status === 'FAILED' || r.status === 'UNREACHABLE');

    if (allSuccess) {
      execution.status = 'SUCCESS';
    } else if (allFailed) {
      execution.status = 'FAILED';
    } else {
      execution.status = 'PARTIAL';
    }

    execution.logs += `${logTime()} Overall Execution Status: ${execution.status} (${
      workerResults.filter((r) => r.status === 'SUCCESS' || r.status === 'CHANGED').length
    }/${workerResults.length} succeeded).\n`;

    await execution.save();
  } catch (err: any) {
    const executionDuration = Date.now() - startTime;
    execution.status = 'FAILED';
    execution.endTime = new Date();
    execution.durationMs = executionDuration;
    execution.durationFormatted = `${(executionDuration / 1000).toFixed(1)}s`;
    execution.errorMessage = err.message || 'Execution error';
    execution.logs += `\n${logTime()} [FATAL ERROR] => ${err.message}\n`;

    // Populate failed results for each target worker if empty
    if (execution.workerResults.length === 0 && execution.targetWorkerNames.length > 0) {
      execution.workerResults = execution.targetWorkerNames.map((name, idx) => ({
        workerId: execution.targetWorkerIds[idx]?.toString() || String(idx),
        workerName: name,
        workerIp: 'N/A',
        status: 'FAILED',
        stdout: '',
        stderr: err.message,
        returnCode: 1,
        durationMs: executionDuration,
        executionTime: new Date().toLocaleTimeString(),
      }));
    }

    await execution.save();
  } finally {
    activeAdHocJobs.delete(executionId);
  }
}

/**
 * Parses individual worker output from standard Ansible ad-hoc output
 */
function parseWorkerAdHocOutput(
  rawOutput: string,
  safeWorkerName: string,
  originalWorkerName: string,
  workerIp: string,
  totalDurationMs: number
): IAdHocWorkerResult {
  const result: IAdHocWorkerResult = {
    workerId: originalWorkerName,
    workerName: originalWorkerName,
    workerIp,
    status: 'SUCCESS',
    stdout: '',
    stderr: '',
    returnCode: 0,
    durationMs: totalDurationMs,
    executionTime: new Date().toLocaleTimeString(),
  };

  if (!rawOutput) {
    result.status = 'UNREACHABLE';
    result.stderr = 'No response received from target host.';
    result.returnCode = 255;
    return result;
  }

  // Look for worker header in output: e.g. "ansible-worker-01 | CHANGED | rc=0 >>" or "ansible-worker-01 | SUCCESS =>"
  const patterns = [
    new RegExp(`(?:^|\\n)(${safeWorkerName}|${originalWorkerName})\\s*\\|\\s*(CHANGED|SUCCESS|FAILED|UNREACHABLE)(?:!|\\s*\\|\\s*rc=([0-9]+))?\\s*(?:>>|=>)([\\s\\S]*?)(?=(?:\\n[a-zA-Z0-9_-]+\\s*\\|\\s*(?:CHANGED|SUCCESS|FAILED|UNREACHABLE))|$)`, 'i'),
  ];

  let matched = false;

  for (const regex of patterns) {
    const match = rawOutput.match(regex);
    if (match) {
      matched = true;
      const statusStr = (match[2] || '').toUpperCase();
      const rcStr = match[3];
      const body = (match[4] || '').trim();

      if (statusStr.includes('FAILED')) {
        result.status = 'FAILED';
        result.returnCode = rcStr ? parseInt(rcStr, 10) : 1;
        result.stderr = body;
      } else if (statusStr.includes('UNREACHABLE')) {
        result.status = 'UNREACHABLE';
        result.returnCode = 255;
        result.stderr = body || 'Host unreachable over SSH';
      } else if (statusStr.includes('CHANGED')) {
        result.status = 'CHANGED';
        result.returnCode = rcStr ? parseInt(rcStr, 10) : 0;
        result.stdout = body;
      } else {
        result.status = 'SUCCESS';
        result.returnCode = rcStr ? parseInt(rcStr, 10) : 0;
        result.stdout = body;
      }
      break;
    }
  }

  // Fallback if regex didn't isolate the worker
  if (!matched) {
    if (rawOutput.toLowerCase().includes('unreachable') || rawOutput.toLowerCase().includes('connection refused')) {
      result.status = 'UNREACHABLE';
      result.returnCode = 255;
      result.stderr = rawOutput.slice(0, 500);
    } else if (rawOutput.toLowerCase().includes('failed')) {
      result.status = 'FAILED';
      result.returnCode = 1;
      result.stderr = rawOutput.slice(0, 500);
    } else {
      result.status = 'SUCCESS';
      result.stdout = rawOutput.trim();
    }
  }

  // Clean json formatting if output is json
  if (result.stdout.startsWith('{') && result.stdout.endsWith('}')) {
    try {
      const parsed = JSON.parse(result.stdout);
      if (parsed.stdout) result.stdout = parsed.stdout;
      if (parsed.stderr) result.stderr = parsed.stderr;
      if (typeof parsed.rc === 'number') result.returnCode = parsed.rc;
      if (parsed.ping === 'pong') result.stdout = 'SUCCESS (ping: pong)';
    } catch {}
  }

  return result;
}
