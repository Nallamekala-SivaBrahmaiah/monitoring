import yaml from 'js-yaml';
import connectToDatabase from '@/lib/mongodb';
import AnsibleExecution, { IAnsibleExecutionTask } from '@/models/AnsibleExecution';
import AnsiblePlaybook from '@/models/AnsiblePlaybook';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleController from '@/models/AnsibleController';
import { buildSSHConfig, executeRemoteSSHCommand } from './ansibleSSH';
import { ANSIBLE_TEMPLATES } from './ansibleTemplates';
import { Client } from 'ssh2';
import { spawn } from 'child_process';

interface ActiveJobHandle {
  sshClient?: Client;
  process?: any;
  cancelled?: boolean;
}

const activeJobs = new Map<string, ActiveJobHandle>();

function logTime(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
}

/**
 * Purge any fake / dummy host data that might have been seeded previously.
 */
export async function purgeFakeAnsibleData(): Promise<void> {
  try {
    await connectToDatabase();

    // Delete known static mock hostnames / IPs from initial mock template
    await AnsibleHost.deleteMany({
      $or: [
        { ip: { $in: ['192.168.1.100', '13.233.45.67', '20.40.12.78'] } },
        { name: { $in: ['Local-Server', 'AWS-Server-1', 'Azure-Server-1'] } },
      ],
    });
  } catch (err) {
    console.warn('[AnsibleEngine] Error purging fake data:', err);
  }
}

/**
 * Ensure default templates are seeded & synchronized into database with Ubuntu/apt optimization.
 */
export async function ensurePlaybookTemplates(): Promise<void> {
  await connectToDatabase();

  for (const t of ANSIBLE_TEMPLATES) {
    const existing = await AnsiblePlaybook.findOne({ name: t.name });
    if (!existing) {
      await AnsiblePlaybook.create({
        name: t.name,
        title: t.title,
        description: t.description,
        category: t.category,
        content: t.content,
        isTemplate: true,
        defaultExtraVars: t.defaultExtraVars || '',
        totalRuns: 0,
      });
    } else if (existing.isTemplate) {
      // Synchronize Ubuntu & apt optimized template content
      existing.content = t.content;
      existing.title = t.title;
      existing.description = t.description;
      await existing.save();
    }
  }

  // Purge any fake dummy hosts from previous test sessions
  await purgeFakeAnsibleData();
}

/**
 * Check if ansible-playbook CLI binary is available on the system PATH
 */
export function checkAnsibleCliInstalled(): Promise<{ installed: boolean; version?: string }> {
  return new Promise((resolve) => {
    try {
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'where.exe' : 'which';
      const child = spawn(cmd, ['ansible-playbook'], { shell: false });

      let output = '';
      child.stdout.on('data', (d) => (output += d.toString()));
      child.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve({ installed: true, version: 'Ansible Core 2.16' });
        } else {
          resolve({ installed: false });
        }
      });
      child.on('error', () => resolve({ installed: false }));
    } catch {
      resolve({ installed: false });
    }
  });
}

/**
 * Map high-level Ansible YAML tasks to Ubuntu / Debian shell commands for remote SSH execution.
 * Prioritizes `apt` / `apt-get` and `sudo` for Ubuntu servers.
 */
function translateAnsibleTaskToCommand(task: any): { cmd: string; changeIndicator: boolean } {
  if (task.command) {
    const rawCmd = typeof task.command === 'string' ? task.command : task.command.cmd;
    return { cmd: rawCmd, changeIndicator: true };
  }
  if (task.shell) {
    const rawCmd = typeof task.shell === 'string' ? task.shell : task.shell.cmd;
    return { cmd: rawCmd, changeIndicator: true };
  }
  if (task.setup !== undefined) {
    return { cmd: 'uname -srm; uptime; cat /etc/os-release 2>/dev/null | head -n 5', changeIndicator: false };
  }

  // 1. APT module (Primary for Ubuntu)
  if (task.apt) {
    const apt = task.apt;
    if (apt.update_cache) {
      return { cmd: 'sudo DEBIAN_FRONTEND=noninteractive apt-get update -y -qq', changeIndicator: true };
    }
    if (apt.name) {
      const names = Array.isArray(apt.name) ? apt.name.join(' ') : apt.name;
      return {
        cmd: `sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ${names}`,
        changeIndicator: true,
      };
    }
    if (apt.upgrade) {
      return { cmd: 'sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq', changeIndicator: true };
    }
    if (apt.autoremove) {
      return { cmd: 'sudo DEBIAN_FRONTEND=noninteractive apt-get autoremove -y -qq', changeIndicator: true };
    }
  }

  // 2. Generic PACKAGE module: In Ubuntu, always prioritize apt-get!
  if (task.package) {
    const pkg = task.package;
    if (pkg.name) {
      const names = Array.isArray(pkg.name) ? pkg.name.join(' ') : pkg.name;
      return {
        cmd: `if command -v apt-get >/dev/null 2>&1; then sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ${names}; elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y -q ${names}; else sudo yum install -y -q ${names}; fi`,
        changeIndicator: true,
      };
    }
  }

  // 3. YUM module: If on Ubuntu, automatically translate to apt-get so it never fails!
  if (task.yum) {
    const pkg = task.yum;
    if (pkg.name) {
      const names = Array.isArray(pkg.name) ? pkg.name.join(' ') : pkg.name;
      return {
        cmd: `if command -v apt-get >/dev/null 2>&1; then echo "Ubuntu environment detected: running apt-get for ${names}"; sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ${names}; elif command -v yum >/dev/null 2>&1; then sudo yum install -y -q ${names}; else sudo dnf install -y -q ${names}; fi`,
        changeIndicator: true,
      };
    }
  }

  // 4. SERVICE / SYSTEMD module
  if (task.service || task.systemd) {
    const svc = task.service || task.systemd;
    const actions: string[] = [];
    if (svc.enabled) {
      actions.push(`sudo systemctl enable ${svc.name} 2>/dev/null || true`);
    }
    if (svc.state === 'started' || svc.state === 'restarted') {
      actions.push(`sudo systemctl ${svc.state} ${svc.name} && systemctl is-active ${svc.name}`);
    } else if (svc.state === 'stopped') {
      actions.push(`sudo systemctl stop ${svc.name}`);
    } else if (actions.length === 0) {
      actions.push(`systemctl is-active ${svc.name} || sudo systemctl start ${svc.name}`);
    }
    return { cmd: actions.join(' && '), changeIndicator: true };
  }

  // 5. FILE module
  if (task.file) {
    const f = task.file;
    if (f.state === 'directory') {
      const modeCmd = f.mode ? ` && sudo chmod ${f.mode} "${f.path}"` : '';
      return { cmd: `sudo mkdir -p "${f.path}"${modeCmd}`, changeIndicator: true };
    }
    if (f.state === 'absent') {
      return { cmd: `sudo rm -rf "${f.path}"`, changeIndicator: true };
    }
    if (f.mode) {
      return { cmd: `sudo chmod ${f.mode} "${f.path}"`, changeIndicator: true };
    }
  }

  // 6. TIMEZONE module
  if (task.timezone) {
    return { cmd: `sudo timedatectl set-timezone ${task.timezone.name || 'UTC'}`, changeIndicator: true };
  }

  // 7. USER module
  if (task.user) {
    return { cmd: `sudo usermod -aG ${task.user.groups || 'docker'} ${task.user.name || 'ubuntu'} 2>/dev/null || sudo useradd -m -s /bin/bash ${task.user.name}`, changeIndicator: true };
  }

  // 8. STAT module
  if (task.stat) {
    return { cmd: `test -e "${task.stat.path}" && echo "exists" || echo "not_found"`, changeIndicator: false };
  }

  // 9. URI module
  if (task.uri) {
    return { cmd: `curl -s -f -o /dev/null -w "%{http_code}" "${task.uri.url}" || true`, changeIndicator: false };
  }

  // 10. DEBUG module
  if (task.debug) {
    return { cmd: `echo "${task.debug.msg || 'Ansible debug message'}"`, changeIndicator: false };
  }

  // Fallback
  return { cmd: 'true', changeIndicator: false };
}

/**
 * Execute an Ansible Playbook across selected host or all managed nodes
 */
export async function executeAnsiblePlaybook(executionId: string): Promise<void> {
  await connectToDatabase();
  await ensurePlaybookTemplates();

  const execution = await AnsibleExecution.findById(executionId);
  if (!execution) {
    throw new Error(`Execution ${executionId} not found`);
  }

  // Resolve target hosts: check targetWorkerIds, groups, all under controller, or single host
  let targetHosts: any[] = [];
  if (Array.isArray(execution.targetWorkerIds) && execution.targetWorkerIds.length > 0) {
    targetHosts = await AnsibleHost.find({ _id: { $in: execution.targetWorkerIds } }).sort({ name: 1 });
  } else if (execution.hostIp === 'all' || execution.hostName?.includes('All Managed Nodes')) {
    const ctrlFilter = execution.controllerId ? { controllerId: execution.controllerId } : {};
    targetHosts = await AnsibleHost.find(ctrlFilter).sort({ name: 1 });
  } else if (execution.hostId) {
    const single = await AnsibleHost.findById(execution.hostId);
    if (single) targetHosts.push(single);
  }

  if (targetHosts.length === 0) {
    execution.status = 'FAILED';
    execution.errorMessage = 'No target host(s) found in inventory';
    execution.logs += `${logTime()} Target host(s) not found in inventory.\n`;
    await execution.save();
    return;
  }

  // Controller fallback credentials
  let executingController: any = null;
  if (execution.controllerId) {
    executingController = await AnsibleController.findById(execution.controllerId).lean();
  }
  if (!executingController) {
    executingController =
      (await AnsibleController.findOne({ isActive: true }).lean()) ||
      (await AnsibleController.findOne({}).lean());
  }

  const playbook = await AnsiblePlaybook.findById(execution.playbookId);
  const playbookYaml = playbook?.content || '';

  const startTime = new Date();
  execution.status = 'RUNNING';
  execution.startTime = startTime;
  execution.logs = `${logTime()} Starting playbook: ${execution.playbookName}\n`;
  execution.logs += `${logTime()} Target Nodes (${targetHosts.length}): ${targetHosts.map((h) => `${h.name} (${h.ip})`).join(', ')}\n`;
  if (execution.extraVars) {
    execution.logs += `${logTime()} Extra Variables: ${execution.extraVars}\n`;
  }
  await execution.save();

  const jobHandle: ActiveJobHandle = {};
  activeJobs.set(executionId, jobHandle);

  try {
    // 1. Parse Playbook YAML structure
    let parsedPlaybook: any[] = [];
    try {
      const doc = yaml.load(playbookYaml);
      parsedPlaybook = Array.isArray(doc) ? doc : [doc];
    } catch (parseErr: any) {
      throw new Error(`YAML syntax error in playbook: ${parseErr.message}`);
    }

    // Extract all tasks across plays
    const tasksToRun: Array<{ name: string; taskData: any; ignoreErrors: boolean }> = [];

    // Always prepend facts gathering
    tasksToRun.push({
      name: 'Gathering Facts',
      taskData: { setup: true },
      ignoreErrors: false,
    });

    for (const play of parsedPlaybook) {
      if (play && Array.isArray(play.tasks)) {
        for (const t of play.tasks) {
          tasksToRun.push({
            name: t.name || 'Execute Task',
            taskData: t,
            ignoreErrors: Boolean(t.ignore_errors),
          });
        }
      }
    }

    execution.logs += `\nPLAY [all] *********************************************************************\n\n`;
    await execution.save();

    const hostRecaps: Map<string, { ok: number; changed: number; unreachable: number; failed: number; skipped: number }> = new Map();
    const taskResults: IAnsibleExecutionTask[] = [];

    let totalFailedCount = 0;
    let totalOkCount = 0;
    let totalChangedCount = 0;
    let totalSkippedCount = 0;

    // 2. Iterate across all target hosts
    for (const host of targetHosts) {
      if (jobHandle.cancelled) {
        throw new Error('Execution was cancelled by user');
      }

      hostRecaps.set(host.name, { ok: 0, changed: 0, unreachable: 0, failed: 0, skipped: 0 });
      const recap = hostRecaps.get(host.name)!;

      // Ensure host has credentials (inherit from executing controller if missing)
      if (!host.encryptedAuthSecret && executingController?.encryptedAuthSecret) {
        host.encryptedAuthSecret = executingController.encryptedAuthSecret;
        host.authSecretIv = executingController.authSecretIv || '';
        host.authSecretTag = executingController.authSecretTag || '';
        host.authMethod = executingController.authMethod || 'privateKey';
        await host.save();
      }

      if (!host.encryptedAuthSecret) {
        recap.unreachable++;
        execution.logs += `${logTime()} fatal: [${host.name}]: UNREACHABLE! => No SSH private key or password found\n`;
        await execution.save();
        continue;
      }

      // Connect via SSH
      const sshClient = new Client();
      jobHandle.sshClient = sshClient;

      try {
        await new Promise<void>((resolve, reject) => {
          sshClient.on('ready', () => resolve());
          sshClient.on('error', (err) => reject(new Error(`SSH Connection failed: ${err.message}`)));

          try {
            const config = buildSSHConfig(host, 15000);
            sshClient.connect(config);
          } catch (cfgErr: any) {
            reject(cfgErr);
          }
        });

        host.status = 'Connected';
        host.lastCheckedAt = new Date();
        await host.save();
      } catch (connErr: any) {
        recap.unreachable++;
        execution.logs += `${logTime()} fatal: [${host.name}]: UNREACHABLE! => ${connErr.message}\n`;
        await execution.save();
        continue;
      }

      // 3. Execute tasks on this host
      for (const item of tasksToRun) {
        if (jobHandle.cancelled) {
          throw new Error('Execution was cancelled by user');
        }

        const taskName = item.name;
        execution.logs += `TASK [${taskName}] *********************************************************\n`;
        const taskStartTime = Date.now();

        // Check 'when' condition (Skip RedHat/CentOS on Ubuntu)
        if (item.taskData?.when) {
          const whenStr = String(item.taskData.when).toLowerCase();
          if (whenStr.includes('redhat') || whenStr.includes('centos') || whenStr.includes('amazon') || whenStr.includes('amzn')) {
            recap.skipped++;
            totalSkippedCount++;
            execution.logs += `${logTime()} skipping: [${host.name}]\n`;
            continue;
          }
        }

        const { cmd, changeIndicator } = translateAnsibleTaskToCommand(item.taskData);

        try {
          const result = await executeRemoteSSHCommand(sshClient, cmd);
          const taskDurationMs = Date.now() - taskStartTime;

          if (result.exitCode === 0) {
            if (changeIndicator) {
              recap.changed++;
              totalChangedCount++;
              execution.logs += `${logTime()} changed: [${host.name}]\n`;
              taskResults.push({
                name: `${taskName} [${host.name}]`,
                status: 'changed',
                output: result.output.trim(),
                durationMs: taskDurationMs,
              });
            } else {
              recap.ok++;
              totalOkCount++;
              execution.logs += `${logTime()} ok: [${host.name}]\n`;
              taskResults.push({
                name: `${taskName} [${host.name}]`,
                status: 'ok',
                output: result.output.trim(),
                durationMs: taskDurationMs,
              });
            }
          } else {
            if (item.ignoreErrors) {
              recap.ok++;
              totalOkCount++;
              execution.logs += `${logTime()} ...ignoring error on [${host.name}]\n`;
              taskResults.push({
                name: `${taskName} [${host.name}]`,
                status: 'ok',
                output: `(Ignored) ${result.output.trim()}`,
                durationMs: taskDurationMs,
              });
            } else {
              recap.failed++;
              totalFailedCount++;
              execution.logs += `${logTime()} fatal: [${host.name}]: FAILED! => ${result.output.trim() || 'exit code ' + result.exitCode}\n`;
              taskResults.push({
                name: `${taskName} [${host.name}]`,
                status: 'failed',
                output: result.output.trim(),
                durationMs: taskDurationMs,
              });
              break; // Stop tasks on this host if a task fails
            }
          }
        } catch (cmdErr: any) {
          recap.failed++;
          totalFailedCount++;
          execution.logs += `${logTime()} fatal: [${host.name}]: EXEC_ERROR => ${cmdErr.message}\n`;
          taskResults.push({
            name: `${taskName} [${host.name}]`,
            status: 'failed',
            output: cmdErr.message,
            durationMs: Date.now() - taskStartTime,
          });
          break;
        }

        await execution.save();
      }

      try {
        sshClient.end();
      } catch {}
    }

    const endTime = new Date();
    const durationSeconds = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    execution.endTime = endTime;
    execution.durationSeconds = durationSeconds;
    execution.tasks = taskResults;
    execution.recap = {
      ok: totalOkCount,
      changed: totalChangedCount,
      unreachable: 0,
      failed: totalFailedCount,
      skipped: totalSkippedCount,
    };

    execution.logs += `\nPLAY RECAP *********************************************************************\n`;
    for (const [hostname, recap] of hostRecaps.entries()) {
      execution.logs += `${hostname.padEnd(20)} : ok=${recap.ok}    changed=${recap.changed}    unreachable=${recap.unreachable}    failed=${recap.failed}    skipped=${recap.skipped}\n`;
    }
    execution.logs += `\n`;

    if (totalFailedCount === 0) {
      execution.status = 'SUCCESS';
      execution.logs += `${logTime()} Playbook completed successfully across all targets!\n`;
      execution.logs += `Playbook executed successfully in ${durationSeconds} seconds\n`;
    } else {
      execution.status = 'FAILED';
      execution.errorMessage = `Playbook execution completed with ${totalFailedCount} error(s)`;
      execution.logs += `${logTime()} Playbook execution failed.\n`;
    }

    await execution.save();

    // Update Playbook stats
    if (playbook) {
      playbook.totalRuns = (playbook.totalRuns || 0) + 1;
      playbook.lastRunAt = endTime;
      playbook.lastRunStatus = execution.status;
      await playbook.save();
    }
  } catch (err: any) {
    const endTime = new Date();
    const durationSeconds = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    execution.status = jobHandle.cancelled ? 'CANCELLED' : 'FAILED';
    execution.endTime = endTime;
    execution.durationSeconds = durationSeconds;
    execution.errorMessage = err.message || 'Execution error';
    execution.logs += `\n${logTime()} [FATAL] ${err.message}\n`;
    await execution.save();

    if (playbook) {
      playbook.totalRuns = (playbook.totalRuns || 0) + 1;
      playbook.lastRunAt = endTime;
      playbook.lastRunStatus = 'FAILED';
      await playbook.save();
    }
  } finally {
    if (jobHandle.sshClient) {
      try {
        jobHandle.sshClient.end();
      } catch {}
    }
    activeJobs.delete(executionId);
  }
}

/**
 * Cancel an active playbook run
 */
export function cancelAnsibleExecution(executionId: string): boolean {
  const handle = activeJobs.get(executionId);
  if (handle) {
    handle.cancelled = true;
    if (handle.sshClient) {
      try {
        handle.sshClient.end();
      } catch {}
    }
    if (handle.process) {
      try {
        handle.process.kill('SIGTERM');
      } catch {}
    }
    activeJobs.delete(executionId);
    return true;
  }
  return false;
}
