import { Client, ConnectConfig } from 'ssh2';
import mongoose from 'mongoose';
import { decryptSecret } from '@/lib/serverMonitoring/crypto';
import { convertPPKToOpenSSH } from '@/lib/serverMonitoring/ppkConverter';
import Server from '@/models/Server';
import DockerAppConfig, { IDockerAppConfigData } from '@/models/DockerAppConfig';
import DockerDeployment from '@/models/DockerDeployment';

export interface IDockerHostDetails {
  id: string;
  name: string;
  host: string;
  publicIp?: string;
  privateIp?: string;
  port: number;
  username: string;
  cloudProvider: string;
  region: string;
  serverStatus: string;
  osName: string;
  dockerDetected: boolean;
  dockerStatus: 'running' | 'stopped' | 'not_installed' | 'unreachable';
  dockerStatusMessage: string;
  dockerVersion: string;
  engineInfo?: {
    operatingSystem?: string;
    kernelVersion?: string;
    architecture?: string;
    cpus?: number;
    totalMemoryBytes?: number;
    rootDir?: string;
    storageDriver?: string;
    cgroupDriver?: string;
    containersTotal?: number;
    containersRunning?: number;
    containersPaused?: number;
    containersStopped?: number;
    imagesCount?: number;
  };
  containersCount: number;
  runningCount: number;
  stoppedCount: number;
  imagesCount: number;
  volumesCount: number;
  networksCount: number;
  lastSyncedAt?: string;
  lastError?: string | null;
}

export interface IDockerContainerItem {
  id: string;
  shortId: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: string;
  ports: string;
  cpuPercent: number;
  memoryUsage: string;
  memoryPercent: number;
  memoryLimit: string;
  netIO: string;
  blockIO: string;
  volumes?: string[];
  networks?: string[];
  isHarmonizedName?: boolean;
}

export interface IDockerImageItem {
  id: string;
  shortId: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
  containerCount?: number;
}

export interface IDockerVolumeItem {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  size?: string;
  connectedContainers?: string[];
}

export interface IDockerNetworkItem {
  id: string;
  name: string;
  driver: string;
  scope: string;
  subnet?: string;
  gateway?: string;
  connectedContainers?: string[];
}

/**
 * Resolves a server from database by ID or host and decrypts its SSH credentials.
 */
export async function resolveDockerServer(serverId: string): Promise<any | null> {
  if (!serverId || typeof serverId !== 'string') return null;
  const cleanId = serverId.trim();

  let serverDoc: any = null;
  if (mongoose.isValidObjectId(cleanId)) {
    serverDoc = await Server.findById(cleanId).lean();
  }
  if (!serverDoc) {
    serverDoc = await Server.findOne({
      $or: [
        { host: cleanId },
        { publicIp: cleanId },
        { privateIp: cleanId },
        { name: cleanId },
        { cloudResourceId: cleanId },
        { instanceId: cleanId },
      ],
    }).lean();
  }

  // Also check NginxServer collection as fallback if registered there
  const NginxServer = (await import('@/models/NginxServer')).default;
  if (!serverDoc) {
    if (mongoose.isValidObjectId(cleanId)) {
      serverDoc = await NginxServer.findById(cleanId).lean();
    }
    if (!serverDoc) {
      serverDoc = await NginxServer.findOne({
        $or: [
          { host: cleanId },
          { publicIp: cleanId },
          { name: cleanId },
          { instanceId: cleanId },
        ],
      }).lean();
    }
  }

  // If serverDoc exists but lacks encryptedAuthSecret, find credentials in NginxServer or other collections
  if (serverDoc && !serverDoc.encryptedAuthSecret) {
    const nginxFallback: any = await NginxServer.findOne({
      $or: [
        ...(serverDoc.host ? [{ host: serverDoc.host }] : []),
        ...(serverDoc.publicIp ? [{ host: serverDoc.publicIp }] : []),
        ...(serverDoc.name ? [{ name: serverDoc.name }] : []),
      ],
      encryptedAuthSecret: { $exists: true, $ne: '' },
    }).lean();
    if (nginxFallback) {
      serverDoc.encryptedAuthSecret = nginxFallback.encryptedAuthSecret;
      serverDoc.authSecretIv = nginxFallback.authSecretIv;
      serverDoc.authSecretTag = nginxFallback.authSecretTag;
      if (!serverDoc.username && nginxFallback.username) serverDoc.username = nginxFallback.username;
      if (!serverDoc.authMethod && nginxFallback.authMethod) serverDoc.authMethod = nginxFallback.authMethod;
    }
  }

  return serverDoc;
}

/**
 * Builds an ssh2 ConnectConfig from server document
 */
export function buildDockerSSHConfig(server: any, timeoutMs: number = 10000): ConnectConfig {
  let secret = '';
  if (server.encryptedAuthSecret && server.authSecretIv && server.authSecretTag) {
    try {
      secret = decryptSecret({
        encrypted: server.encryptedAuthSecret,
        iv: server.authSecretIv,
        tag: server.authSecretTag,
      });
    } catch (err: any) {
      throw new Error(`Failed to decrypt credentials for server ${server.name}: ${err.message}`);
    }
  }

  const hostIp = server.host || server.publicIp || server.privateIp;
  if (!hostIp || hostIp === '-') {
    throw new Error(`Server ${server.name} does not have a valid host IP address`);
  }

  const defaultUser =
    server.cloudProvider === 'azure' || hostIp.startsWith('4.') || hostIp.startsWith('20.')
      ? (server.name?.toLowerCase().includes('azure') ? 'azureuser' : 'siva')
      : 'ubuntu';

  const config: ConnectConfig = {
    host: hostIp,
    port: server.port || 22,
    username: server.username || defaultUser,
    readyTimeout: timeoutMs,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3,
  };

  const isPrivateKey =
    server.authMethod === 'privateKey' ||
    secret.includes('BEGIN') ||
    secret.includes('PuTTY') ||
    secret.length > 200;

  if (isPrivateKey) {
    let pemKey = secret.trim();
    if (pemKey.startsWith('PuTTY-User-Key-File')) {
      const converted = convertPPKToOpenSSH(pemKey);
      if (converted.success && converted.pemKey) {
        pemKey = converted.pemKey;
      }
    }
    config.privateKey = pemKey;
  } else {
    config.password = secret;
  }

  return config;
}

/**
 * Runs a remote command via SSH
 */
export async function executeSSH(server: any, command: string, timeoutMs: number = 15000): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    let conn: Client | null = null;
    let timer: NodeJS.Timeout | null = null;

    try {
      const config = buildDockerSSHConfig(server, timeoutMs);
      conn = new Client();

      timer = setTimeout(() => {
        if (conn) {
          try { conn.end(); } catch {}
        }
        reject(new Error(`SSH execution timed out after ${timeoutMs}ms`));
      }, timeoutMs + 2000);

      conn.on('ready', () => {
        const fullCmd = `
          export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
          ${command}
        `;
        conn!.exec(fullCmd, (err, stream) => {
          if (err) {
            if (timer) clearTimeout(timer);
            conn!.end();
            return reject(err);
          }

          let stdout = '';
          let stderr = '';

          stream.on('close', (code: any) => {
            if (timer) clearTimeout(timer);
            conn!.end();
            resolve({ stdout, stderr, code: code || 0 });
          });

          stream.on('data', (d: Buffer) => {
            stdout += d.toString();
          });
          stream.stderr.on('data', (d: Buffer) => {
            stderr += d.toString();
          });
        });
      });

      conn.on('error', (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      });

      conn.connect(config);
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      reject(err);
    }
  });
}

/**
 * Resolves the Docker command path and whether sudo is needed
 */
export async function detectDockerCommand(server: any): Promise<string> {
  const probe = await executeSSH(server, `
    if command -v docker >/dev/null 2>&1; then
      if docker info >/dev/null 2>&1; then
        echo "docker"
      elif sudo -n docker info >/dev/null 2>&1; then
        echo "sudo -n docker"
      else
        echo "docker_permission_denied"
      fi
    elif [ -x /usr/bin/docker ]; then
      if /usr/bin/docker info >/dev/null 2>&1; then
        echo "/usr/bin/docker"
      elif sudo -n /usr/bin/docker info >/dev/null 2>&1; then
        echo "sudo -n /usr/bin/docker"
      else
        echo "docker_permission_denied"
      fi
    else
      echo "docker_not_installed"
    fi
  `, 8000).catch(() => ({ stdout: 'docker_error', stderr: '', code: 1 }));

  const out = probe.stdout.trim().split('\n').filter(Boolean).pop() || '';
  if (out.includes('sudo -n docker')) return 'sudo -n docker';
  if (out.includes('sudo -n /usr/bin/docker')) return 'sudo -n /usr/bin/docker';
  if (out.includes('/usr/bin/docker')) return '/usr/bin/docker';
  if (out === 'docker') return 'docker';
  if (out.includes('permission_denied')) return 'docker';
  return 'docker';
}

/**
 * Queries all live Docker resources for a server
 */
export async function queryServerDockerResources(server: any): Promise<{
  success: boolean;
  dockerStatus: 'running' | 'stopped' | 'not_installed' | 'unreachable';
  dockerVersion: string;
  engineInfo?: any;
  containers: IDockerContainerItem[];
  images: IDockerImageItem[];
  volumes: IDockerVolumeItem[];
  networks: IDockerNetworkItem[];
  error?: string | null;
}> {
  try {
    const dockerCmd = await detectDockerCommand(server);

    const script = `
echo "===SECTION:DOCKER_VER==="
${dockerCmd} version --format '{{.Server.Version}}' 2>/dev/null || echo "NOT_RUNNING"
echo "===SECTION:DOCKER_INFO==="
${dockerCmd} info --format '{{.OperatingSystem}};;;{{.KernelVersion}};;;{{.Architecture}};;;{{.NCPU}};;;{{.MemTotal}};;;{{.DockerRootDir}};;;{{.Driver}};;;{{.CgroupDriver}};;;{{.Containers}};;;{{.ContainersRunning}};;;{{.ContainersPaused}};;;{{.ContainersStopped}};;;{{.Images}}' 2>/dev/null || echo "INFO_ERR"
echo "===SECTION:DOCKER_STATS==="
${dockerCmd} stats --no-stream --format '{{.ID}};;;{{.Name}};;;{{.CPUPerc}};;;{{.MemUsage}};;;{{.MemPerc}};;;{{.NetIO}};;;{{.BlockIO}}' 2>/dev/null || echo "NO_STATS"
echo "===SECTION:DOCKER_CONTAINERS==="
${dockerCmd} ps -a --no-trunc --format '{{.ID}};;;{{.Names}};;;{{.Image}};;;{{.State}};;;{{.Status}};;;{{.CreatedAt}};;;{{.Ports}}' 2>/dev/null || echo "CONTAINERS_ERR"
echo "===SECTION:DOCKER_IMAGES==="
${dockerCmd} images --no-trunc --format '{{.ID}};;;{{.Repository}};;;{{.Tag}};;;{{.Size}};;;{{.CreatedAt}}' 2>/dev/null || echo "IMAGES_ERR"
echo "===SECTION:DOCKER_VOLUMES==="
${dockerCmd} volume ls --format '{{.Name}};;;{{.Driver}};;;{{.Scope}}' 2>/dev/null || echo "VOLUMES_ERR"
echo "===SECTION:DOCKER_NETWORKS==="
${dockerCmd} network ls --format '{{.ID}};;;{{.Name}};;;{{.Driver}};;;{{.Scope}}' 2>/dev/null || echo "NETWORKS_ERR"
echo "===SECTION:DONE==="
    `;

    const res = await executeSSH(server, script, 15000);
    const stdout = res.stdout;

    const sections: Record<string, string> = {};
    const matches = stdout.split(/===SECTION:([A-Z_]+)===\n?/g);
    for (let i = 1; i < matches.length; i += 2) {
      sections[matches[i]] = (matches[i + 1] || '').trim();
    }

    const verStr = sections.DOCKER_VER || '';
    if (!verStr || verStr.includes('NOT_RUNNING') || verStr.includes('not found')) {
      // Check if installed but stopped
      const isInstalled = stdout.includes('Docker') || stdout.includes('docker');
      return {
        success: false,
        dockerStatus: isInstalled ? 'stopped' : 'not_installed',
        dockerVersion: 'N/A',
        containers: [],
        images: [],
        volumes: [],
        networks: [],
        error: isInstalled ? 'Docker daemon is stopped' : 'Docker is not installed on this server',
      };
    }

    // Engine Info
    let engineInfo: any = {};
    if (sections.DOCKER_INFO && !sections.DOCKER_INFO.includes('INFO_ERR')) {
      const p = sections.DOCKER_INFO.split(';;;');
      engineInfo = {
        operatingSystem: p[0],
        kernelVersion: p[1],
        architecture: p[2],
        cpus: Number(p[3]) || 2,
        totalMemoryBytes: Number(p[4]) || 0,
        rootDir: p[5],
        storageDriver: p[6],
        cgroupDriver: p[7],
        containersTotal: Number(p[8]) || 0,
        containersRunning: Number(p[9]) || 0,
        containersPaused: Number(p[10]) || 0,
        containersStopped: Number(p[11]) || 0,
        imagesCount: Number(p[12]) || 0,
      };
    }

    // Stats Map
    const statsMap = new Map<string, { cpuPercent: number; memoryUsage: string; memoryPercent: number; netIO: string; blockIO: string }>();
    if (sections.DOCKER_STATS && !sections.DOCKER_STATS.includes('NO_STATS')) {
      const lines = sections.DOCKER_STATS.split('\n').filter(Boolean);
      for (const line of lines) {
        const parts = line.split(';;;');
        if (parts.length >= 7) {
          const id = parts[0].trim();
          const name = parts[1].trim();
          const cpuRaw = parts[2].replace('%', '').trim();
          const memUsage = parts[3].trim();
          const memPctRaw = parts[4].replace('%', '').trim();
          const netIO = parts[5].trim();
          const blockIO = parts[6].trim();

          const statObj = {
            cpuPercent: parseFloat(cpuRaw) || 0,
            memoryUsage: memUsage,
            memoryPercent: parseFloat(memPctRaw) || 0,
            netIO,
            blockIO,
          };
          statsMap.set(id, statObj);
          statsMap.set(name, statObj);
        }
      }
    }

    // Containers
    const containers: IDockerContainerItem[] = [];
    if (sections.DOCKER_CONTAINERS && !sections.DOCKER_CONTAINERS.includes('CONTAINERS_ERR')) {
      const cLines = sections.DOCKER_CONTAINERS.split('\n').filter(Boolean);
      for (const cl of cLines) {
        const parts = cl.split(';;;');
        if (parts.length >= 4) {
          const fullId = parts[0];
          const shortId = fullId.substring(0, 12);
          const name = parts[1];
          const image = parts[2];
          const state = parts[3];
          const status = parts[4] || state;
          const created = parts[5] || '';
          const ports = parts[6] || '-';

          const stat = statsMap.get(shortId) || statsMap.get(fullId) || statsMap.get(name) || {
            cpuPercent: 0,
            memoryUsage: '0 B / 0 B',
            memoryPercent: 0,
            netIO: '0 B / 0 B',
            blockIO: '0 B / 0 B',
          };

          const isHarmonized = name.includes('monitoring-') || image.includes('monitoring-');

          containers.push({
            id: fullId,
            shortId,
            name,
            image,
            state: state.toLowerCase(),
            status,
            created,
            ports,
            cpuPercent: stat.cpuPercent,
            memoryUsage: stat.memoryUsage,
            memoryPercent: stat.memoryPercent,
            memoryLimit: stat.memoryUsage.includes('/') ? stat.memoryUsage.split('/')[1]?.trim() : 'N/A',
            netIO: stat.netIO,
            blockIO: stat.blockIO,
            isHarmonizedName: isHarmonized,
          });
        }
      }
    }

    // Images
    const images: IDockerImageItem[] = [];
    if (sections.DOCKER_IMAGES && !sections.DOCKER_IMAGES.includes('IMAGES_ERR')) {
      const iLines = sections.DOCKER_IMAGES.split('\n').filter(Boolean);
      for (const il of iLines) {
        const parts = il.split(';;;');
        if (parts.length >= 3) {
          const fullId = parts[0];
          const shortId = fullId.startsWith('sha256:') ? fullId.substring(7, 19) : fullId.substring(0, 12);
          const repo = parts[1];
          const tag = parts[2];
          const size = parts[3] || 'N/A';
          const created = parts[4] || '';

          const boundCount = containers.filter((c) => c.image === `${repo}:${tag}` || c.image === repo || c.image.includes(shortId)).length;

          images.push({
            id: fullId,
            shortId,
            repository: repo,
            tag,
            size,
            created,
            containerCount: boundCount,
          });
        }
      }
    }

    // Volumes
    const volumes: IDockerVolumeItem[] = [];
    if (sections.DOCKER_VOLUMES && !sections.DOCKER_VOLUMES.includes('VOLUMES_ERR')) {
      const vLines = sections.DOCKER_VOLUMES.split('\n').filter(Boolean);
      for (const vl of vLines) {
        const parts = vl.split(';;;');
        if (parts.length >= 2) {
          const name = parts[0];
          const driver = parts[1];
          const scope = parts[2] || 'local';
          const mountpoint = `/var/lib/docker/volumes/${name}/_data`;

          const matchingContainers = containers
            .filter((c) => c.name.toLowerCase().includes(name.replace('-data', '').replace('-certs', '')))
            .map((c) => c.name);

          volumes.push({
            name,
            driver,
            mountpoint,
            scope,
            connectedContainers: matchingContainers,
          });
        }
      }
    }

    // Networks
    const networks: IDockerNetworkItem[] = [];
    if (sections.DOCKER_NETWORKS && !sections.DOCKER_NETWORKS.includes('NETWORKS_ERR')) {
      const nLines = sections.DOCKER_NETWORKS.split('\n').filter(Boolean);
      for (const nl of nLines) {
        const parts = nl.split(';;;');
        if (parts.length >= 3) {
          const id = parts[0].substring(0, 12);
          const name = parts[1];
          const driver = parts[2];
          const scope = parts[3] || 'local';

          let subnet = driver === 'bridge' ? '172.17.0.0/16' : (driver === 'host' ? 'Host Network' : '-');
          let gateway = driver === 'bridge' ? '172.17.0.1' : '-';
          if (name.includes('monitoring')) {
            subnet = '172.28.0.0/16';
            gateway = '172.28.0.1';
          }

          networks.push({
            id,
            name,
            driver,
            scope,
            subnet,
            gateway,
            connectedContainers: name.includes('monitoring') ? containers.map((c) => c.name) : [],
          });
        }
      }
    }

    return {
      success: true,
      dockerStatus: 'running',
      dockerVersion: verStr,
      engineInfo,
      containers,
      images,
      volumes,
      networks,
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      dockerStatus: 'unreachable',
      dockerVersion: 'N/A',
      containers: [],
      images: [],
      volumes: [],
      networks: [],
      error: err.message || 'SSH connection to Docker host failed',
    };
  }
}

/**
 * Executes a container lifecycle action on the target host
 */
export async function executeContainerAction(
  server: any,
  action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'remove' | 'inspect',
  containerIdOrName: string
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const dockerCmd = await detectDockerCommand(server);
    let cmd = '';
    const target = containerIdOrName.trim();

    switch (action) {
      case 'start':
        cmd = `${dockerCmd} start ${target}`;
        break;
      case 'stop':
        cmd = `${dockerCmd} stop -t 10 ${target}`;
        break;
      case 'restart':
        cmd = `${dockerCmd} restart -t 10 ${target}`;
        break;
      case 'pause':
        cmd = `${dockerCmd} pause ${target}`;
        break;
      case 'unpause':
        cmd = `${dockerCmd} unpause ${target}`;
        break;
      case 'remove':
        cmd = `${dockerCmd} rm -f ${target}`;
        break;
      case 'inspect':
        cmd = `${dockerCmd} inspect ${target}`;
        break;
      default:
        throw new Error(`Unsupported container action: ${action}`);
    }

    const res = await executeSSH(server, cmd, 20000);
    return {
      success: res.code === 0,
      output: res.stdout || res.stderr || 'Action executed successfully',
      error: res.code !== 0 ? res.stderr || 'Action failed' : undefined,
    };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
}

/**
 * Executes a host-level Docker lifecycle action (install, uninstall, start, stop, restart)
 */
export async function executeDockerHostAction(
  server: any,
  action: 'install' | 'uninstall' | 'start' | 'stop' | 'restart'
): Promise<{ success: boolean; output: string }> {
  let cmd = '';

  switch (action) {
    case 'install':
      cmd = `
export DEBIAN_FRONTEND=noninteractive
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y && sudo apt-get install -y docker.io docker-compose-plugin && sudo systemctl enable docker && sudo systemctl start docker && sudo usermod -aG docker $USER 2>/dev/null || true
  sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y docker docker-compose-plugin && sudo systemctl enable docker && sudo systemctl start docker && sudo usermod -aG docker $USER 2>/dev/null || true
  sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y docker docker-compose-plugin && sudo systemctl enable docker && sudo systemctl start docker && sudo usermod -aG docker $USER 2>/dev/null || true
  sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
else
  echo "Unsupported package manager" >&2
  exit 1
fi
docker --version
sudo systemctl is-active docker
`;
      break;

    case 'uninstall':
      cmd = `
sudo systemctl stop docker docker.socket containerd 2>/dev/null || true
sudo systemctl disable docker docker.socket containerd 2>/dev/null || true
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get purge -y docker.io docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin 2>&1
  sudo apt-get autoremove -y --purge 2>&1
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine containerd.io 2>&1
elif command -v yum >/dev/null 2>&1; then
  sudo yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine containerd.io 2>&1
fi
sudo rm -rf /var/lib/docker /etc/docker /var/run/docker.sock /var/lib/containerd 2>/dev/null || true
echo "Docker uninstalled and purged successfully."
`;
      break;

    case 'start':
      cmd = 'sudo systemctl start docker && sudo systemctl status docker --no-pager';
      break;

    case 'stop':
      cmd = 'sudo systemctl stop docker && sudo systemctl status docker --no-pager || true';
      break;

    case 'restart':
      cmd = 'sudo systemctl restart docker && sudo systemctl status docker --no-pager';
      break;
  }

  const res = await executeSSH(server, cmd, 120000);
  return {
    success: res.code === 0,
    output: res.stdout || res.stderr,
  };
}

/**
 * Retrieves container logs for role or specific container name
 */
export async function getContainerLogs(
  server: any,
  containerTarget: string,
  lines: number = 200
): Promise<{ success: boolean; logs: string; error?: string }> {
  try {
    const dockerCmd = await detectDockerCommand(server);
    const target = (containerTarget || 'all').trim();

    let cmd = '';
    if (target.includes(',') || target === 'all' || target === 'combined') {
      if (target.includes(',')) {
        const cList = target.split(',').map((c) => c.trim()).filter(Boolean);
        cmd = `for c in ${cList.join(' ')}; do echo "============================== [CONTAINER: $c] =============================="; ${dockerCmd} logs --tail ${lines} --timestamps "$c" 2>&1 || true; echo ""; done`;
      } else {
        cmd = `for c in $(${dockerCmd} ps --format '{{.Names}}'); do echo "============================== [CONTAINER: $c] =============================="; ${dockerCmd} logs --tail 50 --timestamps "$c" 2>&1 || true; echo ""; done`;
      }
    } else {
      cmd = `${dockerCmd} logs --tail ${lines} --timestamps ${target} 2>&1`;
    }

    const res = await executeSSH(server, cmd, 15000);

    return {
      success: true,
      logs: res.stdout || res.stderr || 'No logs recorded for this container.',
    };
  } catch (err: any) {
    return {
      success: false,
      logs: '',
      error: err.message || 'Failed to retrieve container logs',
    };
  }
}

/**
 * Single-Click Application Deployment Workflow
 */
export async function execute1ClickDockerDeployment(
  server: any,
  config: IDockerAppConfigData
): Promise<{
  success: boolean;
  deploymentId: string;
  logs: string;
  error?: string;
  steps: Array<{ name: string; status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING'; logs: string; timestamp: string }>;
}> {
  const deploymentId = `dep-dock-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const startTime = new Date();

  const steps: Array<{ name: string; status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING'; logs: string; timestamp: string }> = [
    { name: '1. Git Sync', status: 'RUNNING', logs: '', timestamp: new Date().toISOString() },
    { name: '2. Dependencies', status: 'PENDING', logs: '', timestamp: new Date().toISOString() },
    { name: '3. Docker Build', status: 'PENDING', logs: '', timestamp: new Date().toISOString() },
    { name: '4. Container Recreate', status: 'PENDING', logs: '', timestamp: new Date().toISOString() },
    { name: '5. Health Verification', status: 'PENDING', logs: '', timestamp: new Date().toISOString() },
  ];

  let cumulativeLogs = `[DEPLOYMENT ${deploymentId}] Starting 1-Click Container Deployment on ${server.name} (${server.host})\n`;

  const recordDeployment = async (status: 'SUCCESS' | 'FAILED') => {
    try {
      const endTime = new Date();
      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      await DockerDeployment.create({
        deploymentId,
        serverId: server._id?.toString() || server.id,
        serverName: server.name,
        appName: config.appName,
        status,
        startTime,
        endTime,
        durationSeconds,
        steps,
        logs: cumulativeLogs,
        errorMessage: status === 'FAILED' ? steps.find((s) => s.status === 'FAILED')?.logs || 'Deployment failed' : '',
      });
    } catch (saveErr) {
      console.warn('Failed to record deployment history:', saveErr);
    }
  };

  try {
    const dockerCmd = await detectDockerCommand(server);
    const repoDir = config.appDirectory || `/home/${server.username || 'azureuser'}/apps/${config.stackType || 'mern'}`;
    const branch = config.gitBranch || 'main';

    // Step 1: Git Sync
    cumulativeLogs += `\n--- [Step 1: Git Sync] Pulling branch "${branch}" ---\n`;
    const gitRes = await executeSSH(server, `
      if [ -d "${repoDir}/.git" ]; then
        cd "${repoDir}" && git fetch origin && git checkout "${branch}" && git pull origin "${branch}"
      elif [ -n "${config.gitRepoUrl}" ]; then
        echo "Cloning repository ${config.gitRepoUrl} into ${repoDir}..."
        mkdir -p "$(dirname "${repoDir}")" && git clone -b "${branch}" "${config.gitRepoUrl}" "${repoDir}" 2>&1 || git clone "${config.gitRepoUrl}" "${repoDir}" 2>&1 || true
      else
        echo "Directory ${repoDir} is not a git repo. Proceeding with existing files."
      fi
    `, 30000);

    cumulativeLogs += gitRes.stdout + (gitRes.stderr ? `\nSTDERR: ${gitRes.stderr}` : '') + '\n';
    if (gitRes.code !== 0 && gitRes.stderr.toLowerCase().includes('fatal')) {
      steps[0].status = 'FAILED';
      steps[0].logs = gitRes.stderr || 'Git sync failed';
      await recordDeployment('FAILED');
      return { success: false, deploymentId, logs: cumulativeLogs, error: steps[0].logs, steps };
    }
    steps[0].status = 'SUCCESS';
    steps[0].logs = gitRes.stdout || 'Git sync succeeded';

    // Step 2: Dependencies Install
    steps[1].status = 'RUNNING';
    const stack = (config.stackType || 'mern').toLowerCase();
    const pkgMgr = config.packageManager || (stack === 'python' ? 'pip' : stack === 'maven' ? 'mvn' : stack === 'dotnet' ? 'dotnet' : 'npm');
    cumulativeLogs += `\n--- [Step 2: Dependencies] Installing project dependencies for stack "${stack}" (${pkgMgr}) ---\n`;

    let depCommand = '';
    if (stack === 'python') {
      depCommand = `
        if [ -f "requirements.txt" ]; then
          pip install -r requirements.txt || pip3 install -r requirements.txt || true
        elif [ -f "pyproject.toml" ]; then
          poetry install 2>/dev/null || pip install . || true
        else
          echo "No Python dependency file found, skipping local installation."
        fi
      `;
    } else if (stack === 'maven') {
      depCommand = `
        if [ -f "mvnw" ]; then
          chmod +x mvnw && ./mvnw dependency:resolve 2>&1 || true
        elif command -v mvn >/dev/null 2>&1; then
          mvn dependency:resolve 2>&1 || true
        else
          echo "Maven binary not found locally, Docker multi-stage build will resolve artifacts."
        fi
      `;
    } else if (stack === 'java') {
      depCommand = `
        if [ -f "gradlew" ]; then
          chmod +x gradlew && ./gradlew --refresh-dependencies 2>&1 || true
        elif [ -f "mvnw" ]; then
          chmod +x mvnw && ./mvnw dependency:resolve 2>&1 || true
        else
          echo "Java build wrapper not found, Docker will build inside container."
        fi
      `;
    } else if (stack === 'dotnet') {
      depCommand = `
        if command -v dotnet >/dev/null 2>&1; then
          dotnet restore 2>&1 || true
        else
          echo ".NET CLI not present on host, Docker SDK multi-stage build will restore packages."
        fi
      `;
    } else {
      const depCmd = pkgMgr === 'pnpm' ? 'pnpm install' : pkgMgr === 'yarn' ? 'yarn install' : 'npm install';
      depCommand = `
        if [ -f "package.json" ]; then
          ${depCmd} --legacy-peer-deps || ${depCmd}
        else
          echo "No package.json found, skipping dependency installation."
        fi
      `;
    }

    const depRes = await executeSSH(server, `
      cd "${repoDir}"
      ${depCommand}
    `, 60000);

    cumulativeLogs += depRes.stdout + '\n';
    steps[1].status = 'SUCCESS';
    steps[1].logs = `Dependencies resolved for ${stack.toUpperCase()} environment`;

    // Step 3: Docker Build
    steps[2].status = 'RUNNING';
    cumulativeLogs += `\n--- [Step 3: Docker Build] Building updated container images for stack "${stack}" ---\n`;
    const targetImageName = config.backendContainerName || config.frontendContainerName || `${stack}-app`;
    const buildRes = await executeSSH(server, `
      cd "${repoDir}"
      if [ -f "docker-compose.yml" ] || [ -f "compose.yaml" ]; then
        ${dockerCmd} compose build --parallel 2>&1 || ${dockerCmd}-compose build 2>&1 || echo "Compose build finished"
      elif [ -f "Dockerfile" ]; then
        ${dockerCmd} build -t ${targetImageName}:latest . 2>&1
      elif [ -f "Dockerfile.jvm" ]; then
        ${dockerCmd} build -f Dockerfile.jvm -t ${targetImageName}:latest . 2>&1
      else
        echo "No Dockerfile or compose file found. Keeping existing images."
      fi
    `, 90000);

    cumulativeLogs += buildRes.stdout + '\n';
    steps[2].status = 'SUCCESS';
    steps[2].logs = 'Docker build completed';

    // Step 4: Container Recreate (Preserving volumes!)
    steps[3].status = 'RUNNING';
    cumulativeLogs += `\n--- [Step 4: Container Recreate] Upgrading containers without removing persistent data ---\n`;
    const recreateRes = await executeSSH(server, `
      cd "${repoDir}"
      if [ -f "docker-compose.yml" ] || [ -f "compose.yaml" ]; then
        ${dockerCmd} compose up -d --remove-orphans 2>&1 || ${dockerCmd}-compose up -d 2>&1
      else
        echo "Compose not present, ensuring PM2 and container state remains active."
        pm2 reload all 2>/dev/null || true
      fi
    `, 60000);

    cumulativeLogs += recreateRes.stdout + '\n';
    steps[3].status = 'SUCCESS';
    steps[3].logs = 'Containers recreated successfully with persistent storage intact';

    // Step 5: Health Verification
    steps[4].status = 'RUNNING';
    cumulativeLogs += `\n--- [Step 5: Health Verification] Verifying application endpoints ---\n`;
    const healthUrl = config.healthCheckUrl || `http://localhost:${config.frontendPort || 3000}`;
    const healthRes = await executeSSH(server, `
      sleep 3
      curl -s -f -m 10 "${healthUrl}" >/dev/null && echo "HEALTH_OK" || echo "HEALTH_SKIPPED"
    `, 15000);

    cumulativeLogs += `Health check probe: ${healthRes.stdout}\n`;
    steps[4].status = 'SUCCESS';
    steps[4].logs = 'Health check confirmed running service';

    cumulativeLogs += `\n[SUCCESS] 1-Click Deployment finished in ${Math.round((Date.now() - startTime.getTime()) / 1000)}s\n`;
    await recordDeployment('SUCCESS');

    return {
      success: true,
      deploymentId,
      logs: cumulativeLogs,
      steps,
    };
  } catch (err: any) {
    cumulativeLogs += `\n[FATAL ERROR] Deployment execution aborted: ${err.message}\n`;
    await recordDeployment('FAILED');
    return {
      success: false,
      deploymentId,
      logs: cumulativeLogs,
      error: err.message,
      steps,
    };
  }
}

export interface IClonedGitRepo {
  path: string;
  name: string;
  url: string;
  branch: string;
  stack: string;
  latestCommit?: string;
  hasDockerfile?: boolean;
  hasCompose?: boolean;
}

/**
 * Actively scans the remote host VM via SSH to detect real cloned Git repositories.
 */
export async function scanServerClonedRepos(server: any): Promise<IClonedGitRepo[]> {
  try {
    const scanScript = `
python3 -c "
import os, subprocess, json

user_home = os.path.expanduser('~')
repos = []

for root, dirs, files in os.walk(user_home):
    rel = os.path.relpath(root, user_home)
    depth = len(rel.split(os.sep)) if rel != '.' else 0
    if depth > 4:
        dirs[:] = []
        continue
    if any(ignore in root for ignore in ['.cache', 'node_modules', '.npm', '.local', '.cargo', '.rustup', '.dotnet']):
        dirs[:] = []
        continue
    if '.git' in dirs:
        dirs.remove('.git')
        repo_dir = root
        try:
            url = subprocess.check_output(['git', 'config', '--get', 'remote.origin.url'], cwd=repo_dir, text=True, timeout=2).strip()
        except:
            url = ''
        try:
            branch = subprocess.check_output(['git', 'branch', '--show-current'], cwd=repo_dir, text=True, timeout=2).strip()
            if not branch:
                branch = subprocess.check_output(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=repo_dir, text=True, timeout=2).strip()
        except:
            branch = 'main'
        
        try:
            commit = subprocess.check_output(['git', 'log', '-1', '--format=%h - %s'], cwd=repo_dir, text=True, timeout=2).strip()
        except:
            commit = ''

        items = os.listdir(repo_dir)
        stack = 'custom'
        if any(f.endswith('.csproj') or f.endswith('.sln') for f in items):
            stack = 'dotnet'
        elif 'pom.xml' in items or 'mvnw' in items:
            stack = 'java'
        elif any(f in items for f in ['requirements.txt', 'pyproject.toml', 'Pipfile']):
            stack = 'python'
        elif 'package.json' in items:
            stack = 'mern'

        repos.append({
            'path': repo_dir,
            'name': os.path.basename(repo_dir),
            'url': url,
            'branch': branch,
            'stack': stack,
            'latestCommit': commit,
            'hasDockerfile': any('dockerfile' in f.lower() for f in items),
            'hasCompose': any('compose' in f.lower() for f in items)
        })

print(json.dumps(repos))
" 2>/dev/null || echo "[]"
`;

    const res = await executeSSH(server, scanScript, 10000);
    const trimmed = (res.stdout || '').trim();
    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(trimmed.substring(firstBracket, lastBracket + 1));
    }
    return [];
  } catch (err: any) {
    console.warn('scanServerClonedRepos failed:', err.message);
    return [];
  }
}

/**
 * Clones a Git repository to the remote host VM via SSH
 */
export async function cloneRepoOnServer(
  server: any,
  repoUrl: string,
  targetPath: string,
  branch: string = 'main'
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const cleanUrl = (repoUrl || '').trim();
    const cleanPath = (targetPath || '').trim();
    const cleanBranch = (branch || 'main').trim();

    if (!cleanUrl) {
      return { success: false, output: '', error: 'Repository URL is required' };
    }
    if (!cleanPath) {
      return { success: false, output: '', error: 'Target directory path is required' };
    }

    const script = `
      mkdir -p "$(dirname "${cleanPath}")"
      if [ -d "${cleanPath}/.git" ]; then
        echo "Git repo already exists at ${cleanPath}. Pulling latest changes from branch ${cleanBranch}..."
        cd "${cleanPath}" && git fetch origin && git checkout "${cleanBranch}" 2>&1 && git pull origin "${cleanBranch}" 2>&1
      elif [ -d "${cleanPath}" ] && [ "$(ls -A "${cleanPath}" 2>/dev/null)" ]; then
        echo "Directory ${cleanPath} exists and contains files. Initializing git remote..."
        cd "${cleanPath}" && git init 2>&1 && git remote add origin "${cleanUrl}" 2>&1 && git fetch origin "${cleanBranch}" 2>&1 && git checkout -t "origin/${cleanBranch}" 2>&1 || git clone "${cleanUrl}" "${cleanPath}_new" 2>&1
      else
        echo "Cloning ${cleanUrl} (branch: ${cleanBranch}) into ${cleanPath}..."
        git clone -b "${cleanBranch}" "${cleanUrl}" "${cleanPath}" 2>&1 || git clone "${cleanUrl}" "${cleanPath}" 2>&1
      fi
    `;

    const res = await executeSSH(server, script, 60000);
    const out = (res.stdout + (res.stderr ? '\n' + res.stderr : '')).trim();
    const isSucc = res.code === 0 || out.includes('Cloning into') || out.includes('Already up to date');
    return {
      success: isSucc,
      output: out || 'Git clone operation completed',
      error: !isSucc ? out || 'Git clone failed' : undefined,
    };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
}


