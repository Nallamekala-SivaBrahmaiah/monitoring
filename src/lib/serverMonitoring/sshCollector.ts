import { Client, ConnectConfig } from 'ssh2';
import { convertPPKToOpenSSH } from './ppkConverter';

export interface CollectedServerSpecs {
  fingerprint: string | null;
  os: {
    name: string;
    version: string;
    kernel: string;
    arch: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
  };
  hardware: {
    cpuCores: number;
    cpuModel: string;
    totalMemoryBytes: number;
    totalDiskBytes: number;
  };
  metrics: {
    cpu: {
      usagePercent: number;
      loadAvg1m: number;
      loadAvg5m: number;
      loadAvg15m: number;
      cores: number;
      timestamp: Date;
    };
    memory: {
      totalBytes: number;
      usedBytes: number;
      availableBytes: number;
      usagePercent: number;
      swapTotalBytes: number;
      swapUsedBytes: number;
      timestamp: Date;
    };
    disks: Array<{
      filesystem: string;
      mount: string;
      totalBytes: number;
      usedBytes: number;
      availableBytes: number;
      usagePercent: number;
    }>;
    network: Array<{
      interface: string;
      bytesReceived: number;
      bytesSent: number;
      packetsReceived: number;
      packetsSent: number;
    }>;
  };
  docker: {
    detected: boolean;
    status: 'running' | 'permission_denied' | 'not_installed' | 'daemon_stopped' | 'error';
    statusMessage?: string;
    version: string;
    containersCount: number;
    runningCount: number;
    containers: Array<{
      id: string;
      name: string;
      image: string;
      state: string;
      status: string;
      created: string;
      ports: string;
      cpuPercent?: number;
      memoryUsage?: string;
      memoryPercent?: number;
      memoryLimit?: string;
      networkTraffic?: string;
      diskIO?: string;
    }>;
    imagesCount: number;
    images: Array<{
      id: string;
      repository: string;
      tag: string;
      size: string;
      created: string;
    }>;
  };
  kubernetes: {
    detected: boolean;
    version: string;
    nodeRole: string;
    podsCount: number;
    pods: Array<{
      uid: string;
      name: string;
      namespace: string;
      status: string;
      restarts: number;
      age: string;
      cpuRequest?: string;
      memoryRequest?: string;
    }>;
  };
}

export interface SSHConnectionParams {
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  authSecret: string;
  passphrase?: string;
  timeoutMs?: number;
}

/**
 * Format uptime in seconds to human readable string (e.g. "12d 4h 32m")
 */
function formatUptime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(' ');
}

/**
 * Safely probe and collect live system, hardware, docker, and kubernetes metrics from a Linux host via SSH.
 */
export async function collectServerViaSSH(params: SSHConnectionParams): Promise<CollectedServerSpecs> {
  const timeoutMs = params.timeoutMs || 12000;

  return new Promise<CollectedServerSpecs>((resolve, reject) => {
    const conn = new Client();
    let hostFingerprint: string | null = null;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        conn.end();
      } catch {
        // ignore
      }
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`SSH connection timed out after ${timeoutMs}ms for ${params.host}:${params.port}`));
    }, timeoutMs);

    conn.on('ready', () => {
      // Auto-unlock docker socket for any user if running as non-root and permission denied
      const pwB64 = params.authMethod === 'password' && params.authSecret
        ? Buffer.from(params.authSecret).toString('base64')
        : '';
      const sudoAutoUnlock = pwB64
        ? `echo "${pwB64}" | base64 -d | sudo -S chmod 666 /var/run/docker.sock 2>/dev/null || sudo -n chmod 666 /var/run/docker.sock 2>/dev/null || true`
        : `sudo -n chmod 666 /var/run/docker.sock 2>/dev/null || true`;

      // Execute read-only unified telemetry collection bundle
      const probeScript = `
echo "===SECTION:OS==="
cat /etc/os-release 2>/dev/null
echo "===SECTION:UNAME==="
uname -srm
echo "===SECTION:UPTIME==="
cat /proc/uptime 2>/dev/null
echo "===SECTION:CPUINFO==="
cat /proc/cpuinfo 2>/dev/null | grep -E '^(processor|model name|cpu MHz)'
echo "===SECTION:LOADAVG==="
cat /proc/loadavg 2>/dev/null
echo "===SECTION:STAT==="
head -n 1 /proc/stat 2>/dev/null
echo "===SECTION:MEMINFO==="
free -b 2>/dev/null
echo "===SECTION:DF==="
df -B1 -P -x tmpfs -x devtmpfs -x overlay -x squashfs 2>/dev/null
echo "===SECTION:NET==="
cat /proc/net/dev 2>/dev/null

# If docker socket exists but user cannot access it, auto-chmod 666 so ANY user can access docker
if [ -S /var/run/docker.sock ]; then
  if ! docker ps >/dev/null 2>&1; then
    ${sudoAutoUnlock}
  fi
fi

DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1 && sudo -n docker ps >/dev/null 2>&1; then
  DOCKER_CMD="sudo -n docker"
fi
echo "===SECTION:DOCKER_VER==="
$DOCKER_CMD --version 2>/dev/null || docker --version 2>/dev/null || echo "DOCKER_NOT_INSTALLED"
echo "===SECTION:DOCKER_STATUS==="
if ! command -v docker >/dev/null 2>&1; then
  echo "DOCKER_NOT_INSTALLED"
else
  DOCKER_INFO_OUT=$($DOCKER_CMD info 2>&1)
  if echo "$DOCKER_INFO_OUT" | grep -iq "permission denied"; then
    echo "DOCKER_PERMISSION_DENIED"
  elif echo "$DOCKER_INFO_OUT" | grep -iq "Cannot connect to the Docker daemon"; then
    echo "DOCKER_DAEMON_STOPPED"
  else
    echo "DOCKER_RUNNING"
  fi
fi
echo "===SECTION:DOCKER_STATS==="
$DOCKER_CMD stats --no-stream --format '{{.ID}};;;{{.Name}};;;{{.CPUPerc}};;;{{.MemUsage}};;;{{.NetIO}};;;{{.BlockIO}}' 2>/dev/null || echo "NO_STATS"
echo "===SECTION:DOCKER_CONTAINERS==="
$DOCKER_CMD ps -a --no-trunc --format '{{.ID}};;;{{.Names}};;;{{.Image}};;;{{.State}};;;{{.Status}};;;{{.CreatedAt}};;;{{.Ports}}' 2>/dev/null || echo "DOCKER_CONTAINERS_ERR"
echo "===SECTION:DOCKER_IMAGES==="
$DOCKER_CMD images --no-trunc --format '{{.ID}};;;{{.Repository}};;;{{.Tag}};;;{{.Size}};;;{{.CreatedAt}}' 2>/dev/null || echo "DOCKER_IMAGES_ERR"
echo "===SECTION:K8S_VER==="
kubectl version --client -o json 2>/dev/null || sudo -n kubectl version --client -o json 2>/dev/null || echo "K8S_NOT_INSTALLED"
echo "===SECTION:K8S_PODS==="
kubectl get pods -A -o json 2>/dev/null || sudo -n kubectl get pods -A -o json 2>/dev/null || echo "K8S_PODS_ERR"
echo "===SECTION:DONE==="
      `;

      conn.exec(probeScript, (err, stream) => {
        if (err) {
          cleanup();
          return reject(err);
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: any) => {
          cleanup();
          try {
            const parsed = parseProbeOutput(stdout, hostFingerprint);
            resolve(parsed);
          } catch (parseErr: any) {
            reject(new Error(`Failed to parse server telemetry: ${parseErr.message}`));
          }
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      });
    });

    conn.on('error', (err) => {
      cleanup();
      reject(err);
    });

    // Configure connection options
    const config: ConnectConfig = {
      host: params.host,
      port: params.port,
      username: params.username,
      readyTimeout: timeoutMs,
      keepaliveInterval: 5000,
    };

    if (params.authMethod === 'privateKey') {
      const conv = convertPPKToOpenSSH(params.authSecret);
      config.privateKey = conv.success && conv.pemKey ? conv.pemKey : params.authSecret;
      if (params.passphrase) {
        config.passphrase = params.passphrase;
      }
    } else {
      config.password = params.authSecret;
    }

    try {
      conn.connect(config);
    } catch (e: any) {
      cleanup();
      reject(e);
    }
  });
}

/**
 * Parse the structured output from the multi-metric probe script
 */
function parseProbeOutput(output: string, hostFingerprint: string | null): CollectedServerSpecs {
  const sections: Record<string, string> = {};
  const parts = output.split(/===SECTION:([A-Z0-9_]+)===\r?\n/);
  
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i];
    const val = parts[i + 1] || '';
    sections[key] = val.trim();
  }

  // 1. OS & Kernel
  let osName = 'Linux';
  let osVersion = '';
  if (sections.OS) {
    const nameMatch = sections.OS.match(/^NAME="?([^"\n]+)"?/m);
    const verMatch = sections.OS.match(/^VERSION="?([^"\n]+)"?/m);
    if (nameMatch) osName = nameMatch[1];
    if (verMatch) osVersion = verMatch[1];
  }

  let kernel = '';
  let arch = 'x86_64';
  if (sections.UNAME) {
    const uParts = sections.UNAME.split(/\s+/);
    kernel = uParts.slice(0, 2).join(' ');
    arch = uParts[uParts.length - 1] || 'x86_64';
  }

  // 2. Uptime
  let uptimeSec = 0;
  if (sections.UPTIME) {
    const upParts = sections.UPTIME.split(/\s+/);
    uptimeSec = Math.floor(parseFloat(upParts[0]) || 0);
  }

  // 3. CPU Info & Cores
  let cpuCores = 1;
  let cpuModel = 'Virtual / Physical CPU';
  if (sections.CPUINFO) {
    const procMatches = sections.CPUINFO.match(/processor\s*:\s*\d+/g);
    if (procMatches) cpuCores = procMatches.length;
    const modelMatch = sections.CPUINFO.match(/model name\s*:\s*(.+)$/m);
    if (modelMatch) cpuModel = modelMatch[1].trim();
  }

  // 4. Load Average
  let load1 = 0, load5 = 0, load15 = 0;
  if (sections.LOADAVG) {
    const lParts = sections.LOADAVG.split(/\s+/);
    load1 = parseFloat(lParts[0]) || 0;
    load5 = parseFloat(lParts[1]) || 0;
    load15 = parseFloat(lParts[2]) || 0;
  }

  // Approximate current CPU percentage from load average relative to cores
  let cpuUsagePercent = Math.min(100, Math.round((load1 / Math.max(1, cpuCores)) * 100));

  // 5. Memory (free -b)
  let totalMem = 0;
  let usedMem = 0;
  let availMem = 0;
  let swapTotal = 0;
  let swapUsed = 0;

  if (sections.MEMINFO) {
    const lines = sections.MEMINFO.split('\n');
    for (const line of lines) {
      if (line.startsWith('Mem:')) {
        const p = line.split(/\s+/);
        totalMem = parseInt(p[1], 10) || 0;
        usedMem = parseInt(p[2], 10) || 0;
        availMem = parseInt(p[6] || p[3], 10) || 0;
      } else if (line.startsWith('Swap:')) {
        const p = line.split(/\s+/);
        swapTotal = parseInt(p[1], 10) || 0;
        swapUsed = parseInt(p[2], 10) || 0;
      }
    }
  }

  const memUsagePercent = totalMem > 0 ? Math.min(100, Math.round(((totalMem - availMem) / totalMem) * 100)) : 0;

  // 6. Disks (df -B1 -P)
  const disks: CollectedServerSpecs['metrics']['disks'] = [];
  let totalDiskBytes = 0;

  if (sections.DF) {
    const lines = sections.DF.split('\n').slice(1);
    for (const line of lines) {
      const p = line.split(/\s+/);
      if (p.length >= 6) {
        const filesystem = p[0];
        const total = parseInt(p[1], 10) || 0;
        const used = parseInt(p[2], 10) || 0;
        const available = parseInt(p[3], 10) || 0;
        const percentStr = p[4].replace('%', '');
        const usagePercent = parseInt(percentStr, 10) || 0;
        const mount = p[5];

        if (total > 0 && mount.startsWith('/')) {
          disks.push({
            filesystem,
            mount,
            totalBytes: total,
            usedBytes: used,
            availableBytes: available,
            usagePercent,
          });
          totalDiskBytes += total;
        }
      }
    }
  }

  // 7. Network (/proc/net/dev)
  const network: CollectedServerSpecs['metrics']['network'] = [];
  if (sections.NET) {
    const lines = sections.NET.split('\n').slice(2);
    for (const line of lines) {
      const match = line.match(/^\s*([^:]+):\s*(.+)$/);
      if (match) {
        const iface = match[1].trim();
        const stats = match[2].trim().split(/\s+/);
        if (stats.length >= 10 && iface !== 'lo') {
          network.push({
            interface: iface,
            bytesReceived: parseInt(stats[0], 10) || 0,
            packetsReceived: parseInt(stats[1], 10) || 0,
            bytesSent: parseInt(stats[8], 10) || 0,
            packetsSent: parseInt(stats[9], 10) || 0,
          });
        }
      }
    }
  }

  // 8. Docker
  const dockerDetected = Boolean(sections.DOCKER_VER && !sections.DOCKER_VER.includes('DOCKER_NOT_INSTALLED'));
  const dockerVersion = dockerDetected ? sections.DOCKER_VER.split('\n')[0] : '';

  let dockerStatus: 'running' | 'permission_denied' | 'not_installed' | 'daemon_stopped' | 'error' = 'not_installed';
  let dockerStatusMessage = 'Docker: Not Installed';

  const rawStatus = (sections.DOCKER_STATUS || '').trim();
  if (rawStatus.includes('DOCKER_NOT_INSTALLED') || !dockerDetected) {
    dockerStatus = 'not_installed';
    dockerStatusMessage = 'Docker: Not Installed';
  } else if (rawStatus.includes('DOCKER_PERMISSION_DENIED')) {
    dockerStatus = 'permission_denied';
    dockerStatusMessage = 'Docker: Permission Denied';
  } else if (rawStatus.includes('DOCKER_DAEMON_STOPPED')) {
    dockerStatus = 'daemon_stopped';
    dockerStatusMessage = 'Docker: Daemon Stopped';
  } else if (rawStatus.includes('DOCKER_RUNNING')) {
    dockerStatus = 'running';
    dockerStatusMessage = 'Docker Engine Running';
  } else {
    dockerStatus = dockerDetected ? 'running' : 'not_installed';
    dockerStatusMessage = dockerDetected ? 'Docker Engine Detected' : 'Docker: Not Installed';
  }

  // Parse docker stats
  const statsMap = new Map<string, { cpuPercent: number; memoryUsage: string; memoryPercent: number; memoryLimit: string; networkTraffic: string; diskIO: string }>();
  if (sections.DOCKER_STATS && !sections.DOCKER_STATS.includes('NO_STATS')) {
    const sLines = sections.DOCKER_STATS.split('\n').filter(Boolean);
    for (const sl of sLines) {
      const sp = sl.split(';;;');
      if (sp.length >= 6) {
        const statId = sp[0].trim();
        const statName = sp[1].trim();
        const cpuStr = sp[2].replace('%', '').trim();
        const memUsage = sp[3].trim();
        const netIO = sp[4].trim();
        const blockIO = sp[5].trim();

        const cpuPercent = parseFloat(cpuStr) || 0;
        let memoryLimit = 'Available';
        let memoryPercent = 0;
        if (memUsage.includes('/')) {
          const parts = memUsage.split('/');
          const usedPart = parts[0].trim();
          memoryLimit = parts[1].trim();
          const parseBytes = (str: string) => {
            const num = parseFloat(str) || 0;
            if (str.includes('GiB') || str.includes('GB')) return num * 1024 * 1024 * 1024;
            if (str.includes('MiB') || str.includes('MB')) return num * 1024 * 1024;
            if (str.includes('KiB') || str.includes('kB')) return num * 1024;
            return num;
          };
          const usedB = parseBytes(usedPart);
          const limitB = parseBytes(memoryLimit);
          if (limitB > 0) {
            memoryPercent = Math.round((usedB / limitB) * 100 * 10) / 10;
          }
        }

        const statObj = {
          cpuPercent,
          memoryUsage: memUsage,
          memoryPercent,
          memoryLimit,
          networkTraffic: netIO,
          diskIO: blockIO,
        };

        if (statId) statsMap.set(statId, statObj);
        if (statName) statsMap.set(statName, statObj);
      }
    }
  }

  const dockerContainers: CollectedServerSpecs['docker']['containers'] = [];
  const dockerImages: CollectedServerSpecs['docker']['images'] = [];

  if (dockerDetected && sections.DOCKER_CONTAINERS && !sections.DOCKER_CONTAINERS.includes('DOCKER_CONTAINERS_ERR')) {
    const cLines = sections.DOCKER_CONTAINERS.split('\n').filter(Boolean);
    for (const cl of cLines) {
      const p = cl.split(';;;');
      if (p.length >= 4) {
        const cId = p[0];
        const cName = p[1] || 'container';
        const shortId = cId.substring(0, 12);
        const liveStat = statsMap.get(shortId) || statsMap.get(cId) || statsMap.get(cName);

        dockerContainers.push({
          id: cId,
          name: cName,
          image: p[2] || '',
          state: p[3] || 'running',
          status: p[4] || '',
          created: p[5] || '',
          ports: p[6] || '',
          cpuPercent: liveStat?.cpuPercent ?? 0,
          memoryUsage: liveStat?.memoryUsage ?? '',
          memoryPercent: liveStat?.memoryPercent ?? 0,
          memoryLimit: liveStat?.memoryLimit ?? 'Available',
          networkTraffic: liveStat?.networkTraffic ?? '0B',
          diskIO: liveStat?.diskIO ?? '0B',
        });
      }
    }
  }

  if (dockerDetected && sections.DOCKER_IMAGES && !sections.DOCKER_IMAGES.includes('DOCKER_IMAGES_ERR')) {
    const iLines = sections.DOCKER_IMAGES.split('\n').filter(Boolean);
    for (const il of iLines) {
      const p = il.split(';;;');
      if (p.length >= 3) {
        dockerImages.push({
          id: p[0],
          repository: p[1] || '<none>',
          tag: p[2] || 'latest',
          size: p[3] || '0MB',
          created: p[4] || '',
        });
      }
    }
  }

  // 9. Kubernetes
  let k8sDetected = false;
  let k8sVersion = '';
  const k8sPods: CollectedServerSpecs['kubernetes']['pods'] = [];

  if (sections.K8S_VER && !sections.K8S_VER.includes('K8S_NOT_INSTALLED')) {
    k8sDetected = true;
    try {
      const parsedVer = JSON.parse(sections.K8S_VER);
      k8sVersion = parsedVer.clientVersion?.gitVersion || 'v1.28';
    } catch {
      k8sVersion = 'Kubernetes Client detected';
    }
  }

  if (k8sDetected && sections.K8S_PODS && !sections.K8S_PODS.includes('K8S_PODS_ERR')) {
    try {
      const parsedPods = JSON.parse(sections.K8S_PODS);
      if (parsedPods.items && Array.isArray(parsedPods.items)) {
        for (const item of parsedPods.items) {
          k8sPods.push({
            uid: item.metadata?.uid || item.metadata?.name,
            name: item.metadata?.name || '',
            namespace: item.metadata?.namespace || 'default',
            status: item.status?.phase || 'Unknown',
            restarts: item.status?.containerStatuses?.[0]?.restartCount || 0,
            age: item.metadata?.creationTimestamp || '',
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    fingerprint: hostFingerprint,
    os: {
      name: osName,
      version: osVersion,
      kernel,
      arch,
      uptimeSeconds: uptimeSec,
      uptimeFormatted: formatUptime(uptimeSec),
    },
    hardware: {
      cpuCores,
      cpuModel,
      totalMemoryBytes: totalMem,
      totalDiskBytes,
    },
    metrics: {
      cpu: {
        usagePercent: cpuUsagePercent,
        loadAvg1m: load1,
        loadAvg5m: load5,
        loadAvg15m: load15,
        cores: cpuCores,
        timestamp: new Date(),
      },
      memory: {
        totalBytes: totalMem,
        usedBytes: usedMem,
        availableBytes: availMem,
        usagePercent: memUsagePercent,
        swapTotalBytes: swapTotal,
        swapUsedBytes: swapUsed,
        timestamp: new Date(),
      },
      disks,
      network,
    },
    docker: {
      detected: dockerDetected,
      status: dockerStatus,
      statusMessage: dockerStatusMessage,
      version: dockerVersion,
      containersCount: dockerContainers.length,
      runningCount: dockerContainers.filter((c) => c.state.toLowerCase().includes('run')).length,
      containers: dockerContainers,
      imagesCount: dockerImages.length,
      images: dockerImages,
    },
    kubernetes: {
      detected: k8sDetected,
      version: k8sVersion,
      nodeRole: k8sDetected ? 'Node / Worker' : 'Not Detected',
      podsCount: k8sPods.length,
      pods: k8sPods,
    },
  };
}
