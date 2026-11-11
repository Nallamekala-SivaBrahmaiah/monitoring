import { Client, ConnectConfig } from 'ssh2';
import { decryptSecret } from '@/lib/serverMonitoring/crypto';
import { convertPPKToOpenSSH } from '@/lib/serverMonitoring/ppkConverter';
import { INginxServerData } from '@/models/NginxServer';
import NginxDeployment, { INginxDeploymentDocument } from '@/models/NginxDeployment';
import path from 'path';

export interface SSHCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  output: string;
}

export interface DiscoveredApp {
  name: string;
  type: 'nextjs' | 'nextjs-standalone' | 'vite' | 'react' | 'nodejs' | 'express' | 'maven' | 'gradle' | 'docker' | 'custom';
  frameworkName?: string;
  directory: string;
  port?: number;
  pm2Name?: string;
  pm2Status?: string;
  domain?: string;
  proxyPass?: string;
  runtimeVersion?: string;
  packageManager?: string;
  buildConfig?: string;
  lastModified?: string;
}

export interface ReverseProxySite {
  fileName: string;
  serverName: string;
  listenPort: number | string;
  proxyPass?: string;
  rootPath?: string;
  ssl: boolean;
  enabled: boolean;
  rawConfig: string;
}

export interface GitRepoInfo {
  name: string;
  path: string;
  remoteUrl: string;
  provider?: 'GitHub' | 'GitLab' | 'Bitbucket' | 'Azure DevOps' | 'Self-Hosted' | 'Local';
  currentBranch: string;
  localBranches: string[];
  remoteBranches: string[];
  latestCommit: {
    hash: string;
    author: string;
    relativeDate: string;
    message: string;
  };
  workingTreeStatus: string;
  isClean: boolean;
}

/**
 * Decrypts server credentials and builds an ssh2 ConnectConfig
 */
export function buildNginxSSHConfig(server: INginxServerData, timeoutMs: number = 10000): ConnectConfig {
  let secret = '';
  if (server.encryptedAuthSecret && server.authSecretIv && server.authSecretTag) {
    try {
      secret = decryptSecret({
        encrypted: server.encryptedAuthSecret,
        iv: server.authSecretIv,
        tag: server.authSecretTag,
      });
    } catch (err: any) {
      throw new Error(`Failed to decrypt SSH credentials for "${server.name}": ${err.message}`);
    }
  }

  const config: ConnectConfig = {
    host: server.host,
    port: server.port || 22,
    username: server.username || 'ubuntu',
    readyTimeout: timeoutMs,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3,
  };

  if (server.authMethod === 'password') {
    config.password = secret;
  } else {
    // Process private key
    let pemKey = secret.trim();
    if (pemKey.startsWith('PuTTY-User-Key-File')) {
      const converted = convertPPKToOpenSSH(pemKey);
      if (converted.success && converted.pemKey) {
        pemKey = converted.pemKey;
      }
    }
    config.privateKey = pemKey;
  }

  return config;
}

/**
 * Execute command over a new SSH connection and return full output
 */
export async function executeSSH(
  server: INginxServerData,
  command: string,
  timeoutMs: number = 25000
): Promise<SSHCommandResult> {
  const config = buildNginxSSHConfig(server, timeoutMs);

  return new Promise((resolve, reject) => {
    let client: Client | null = null;
    let timer: NodeJS.Timeout | null = null;
    let finished = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (client) {
        try {
          client.end();
        } catch {}
      }
    };

    timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve({
          exitCode: 124,
          stdout: '',
          stderr: `Execution timed out after ${timeoutMs / 1000}s`,
          output: `Execution timed out after ${timeoutMs / 1000}s`,
        });
      }
    }, timeoutMs);

    try {
      client = new Client();

      client.on('ready', () => {
        client!.exec(command, (err, stream) => {
          if (err) {
            finished = true;
            cleanup();
            return reject(err);
          }

          let stdout = '';
          let stderr = '';

          stream.on('data', (d: Buffer) => {
            stdout += d.toString();
          });

          stream.stderr.on('data', (d: Buffer) => {
            stderr += d.toString();
          });

          stream.on('close', (code: number) => {
            if (!finished) {
              finished = true;
              cleanup();
              resolve({
                exitCode: code ?? 0,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                output: (stdout + '\n' + stderr).trim(),
              });
            }
          });
        });
      });

      client.on('error', (err) => {
        if (!finished) {
          finished = true;
          cleanup();
          reject(new Error(`SSH Connection failed: ${err.message}`));
        }
      });

      client.connect(config);
    } catch (err: any) {
      cleanup();
      reject(err);
    }
  });
}

/**
 * Test real SSH connection and verify server details
 */
export async function testNginxServerConnection(
  server: INginxServerData
): Promise<{ success: boolean; latencyMs: number; osInfo?: string; error?: string }> {
  const start = Date.now();
  try {
    const res = await executeSSH(server, 'uname -srm; cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | head -n 1', 8000);
    const latencyMs = Date.now() - start;

    let osInfo = 'Linux';
    const lines = res.stdout.split('\n');
    const pretty = lines.find((l) => l.includes('PRETTY_NAME='));
    if (pretty) {
      osInfo = pretty.replace(/PRETTY_NAME=|"/g, '').trim();
    } else if (lines[0]) {
      osInfo = lines[0].trim();
    }

    return {
      success: res.exitCode === 0,
      latencyMs,
      osInfo,
    };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

/**
 * Query real Nginx & PM2 & System status from the remote server
 */
export async function queryServerDetails(server: INginxServerData) {
  // Aggregate multi-check script
  const script = `
echo "===NGINX_INSTALLED==="
which nginx 2>/dev/null || command -v nginx 2>/dev/null || echo "NOT_FOUND"

echo "===NGINX_VERSION==="
nginx -v 2>&1 || true

echo "===NGINX_STATUS==="
systemctl is-active nginx 2>/dev/null || service nginx status 2>/dev/null || echo "UNKNOWN"

echo "===NGINX_WORKERS==="
pgrep -c nginx 2>/dev/null || echo "0"

echo "===NGINX_PORTS==="
(ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null) | grep -i nginx | awk '{print $5}' | sort -u || true

echo "===NGINX_TEST==="
sudo nginx -t 2>&1 || true

echo "===PM2_INSTALLED==="
which pm2 2>/dev/null || command -v pm2 2>/dev/null || echo "NOT_FOUND"

echo "===PM2_JLIST==="
pm2 jlist 2>/dev/null || echo "[]"

echo "===METRICS_MEM==="
free -m 2>/dev/null || true

echo "===METRICS_DISK==="
df -h / 2>/dev/null || true

echo "===METRICS_UPTIME==="
uptime -p 2>/dev/null || uptime 2>/dev/null || echo "Unknown"
`;

  try {
    const res = await executeSSH(server, script, 20000);
    const out = res.stdout;

    const getSection = (marker: string) => {
      const startTag = `===${marker}===`;
      const idx = out.indexOf(startTag);
      if (idx === -1) return '';
      const after = out.slice(idx + startTag.length);
      const nextIdx = after.indexOf('===');
      return (nextIdx === -1 ? after : after.slice(0, nextIdx)).trim();
    };

    // 1. Nginx
    const nginxInstalledRaw = getSection('NGINX_INSTALLED');
    const nginxInstalled = nginxInstalledRaw !== 'NOT_FOUND' && nginxInstalledRaw.length > 0;
    const nginxVersionRaw = getSection('NGINX_VERSION');
    const nginxVersionMatch = nginxVersionRaw.match(/nginx\/([\d.]+)/i);
    const nginxVersion = nginxVersionMatch ? nginxVersionMatch[1] : '';

    const nginxStatusRaw = getSection('NGINX_STATUS');
    let nginxStatus: 'RUNNING' | 'STOPPED' | 'FAILED' | 'NOT_INSTALLED' | 'UNKNOWN' = 'UNKNOWN';
    if (!nginxInstalled) {
      nginxStatus = 'NOT_INSTALLED';
    } else if (nginxStatusRaw === 'active' || nginxStatusRaw.includes('is running')) {
      nginxStatus = 'RUNNING';
    } else if (nginxStatusRaw === 'inactive' || nginxStatusRaw.includes('is stopped')) {
      nginxStatus = 'STOPPED';
    } else if (nginxStatusRaw === 'failed') {
      nginxStatus = 'FAILED';
    }

    const nginxWorkers = parseInt(getSection('NGINX_WORKERS') || '0', 10) || 0;
    const nginxPorts = getSection('NGINX_PORTS')
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    const nginxTestOutput = getSection('NGINX_TEST');

    // 2. PM2
    const pm2InstalledRaw = getSection('PM2_INSTALLED');
    const pm2Installed = pm2InstalledRaw !== 'NOT_FOUND' && pm2InstalledRaw.length > 0;
    const pm2JsonRaw = getSection('PM2_JLIST');
    let pm2List: any[] = [];
    try {
      if (pm2JsonRaw.startsWith('[') && pm2JsonRaw.endsWith(']')) {
        pm2List = JSON.parse(pm2JsonRaw);
      }
    } catch {}

    const pm2Count = pm2List.length;
    const pm2RunningCount = pm2List.filter((p) => p.pm2_env?.status === 'online').length;
    const pm2FailedCount = pm2List.filter(
      (p) => p.pm2_env?.status === 'errored' || p.pm2_env?.status === 'stopped'
    ).length;

    // 3. Metrics
    const memRaw = getSection('METRICS_MEM');
    let memoryPercent = 0;
    if (memRaw) {
      const memLines = memRaw.split('\n');
      const memLine = memLines.find((l) => l.startsWith('Mem:'));
      if (memLine) {
        const parts = memLine.split(/\s+/);
        const total = parseFloat(parts[1]) || 1;
        const used = parseFloat(parts[2]) || 0;
        memoryPercent = Math.min(100, Math.round((used / total) * 100));
      }
    }

    const diskRaw = getSection('METRICS_DISK');
    let diskPercent = 0;
    if (diskRaw) {
      const diskLines = diskRaw.split('\n');
      if (diskLines.length > 1) {
        const parts = diskLines[1].split(/\s+/);
        const pcentStr = parts[4] || '0%';
        diskPercent = parseInt(pcentStr.replace('%', ''), 10) || 0;
      }
    }

    const uptime = getSection('METRICS_UPTIME').replace('up ', '');

    return {
      success: true,
      connectionStatus: 'Online' as const,
      nginxInstalled,
      nginxVersion,
      nginxStatus,
      nginxWorkerCount: nginxWorkers,
      nginxPorts,
      nginxTestOutput,
      pm2Installed,
      pm2Count,
      pm2RunningCount,
      pm2FailedCount,
      pm2Processes: pm2List.map((p) => ({
        name: p.name,
        pmId: p.pm_id,
        pid: p.pid,
        status: p.pm2_env?.status || 'unknown',
        cpu: p.monit?.cpu || 0,
        memoryBytes: p.monit?.memory || 0,
        restarts: p.pm2_env?.restart_time || 0,
        uptimeSeconds: p.pm2_env?.pm_uptime ? Math.floor((Date.now() - p.pm2_env.pm_uptime) / 1000) : 0,
        script: p.pm2_env?.pm_exec_path || '',
        port: p.pm2_env?.env?.PORT || undefined,
      })),
      metrics: {
        memoryPercent,
        diskPercent,
        cpuPercent: 0,
        uptime,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      connectionStatus: 'Failed' as const,
      error: err.message,
    };
  }
}

/**
 * Execute Nginx lifecycle commands
 */
export async function executeNginxServiceAction(
  server: INginxServerData,
  action: 'install' | 'start' | 'stop' | 'restart' | 'reload' | 'test'
): Promise<{ success: boolean; output: string }> {
  let cmd = '';

  switch (action) {
    case 'install':
      cmd = `
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y && sudo apt-get install -y nginx && sudo systemctl enable nginx && sudo systemctl start nginx
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y nginx && sudo systemctl enable nginx && sudo systemctl start nginx
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y nginx && sudo systemctl enable nginx && sudo systemctl start nginx
else
  echo "Unsupported package manager" >&2
  exit 1
fi
sudo systemctl status nginx --no-pager
`;
      break;

    case 'start':
      cmd = 'sudo systemctl start nginx && sudo systemctl status nginx --no-pager';
      break;

    case 'stop':
      cmd = 'sudo systemctl stop nginx && sudo systemctl status nginx --no-pager || true';
      break;

    case 'restart':
      cmd = 'sudo nginx -t && sudo systemctl restart nginx && sudo systemctl status nginx --no-pager';
      break;

    case 'reload':
      cmd = 'sudo nginx -t && sudo systemctl reload nginx && sudo systemctl status nginx --no-pager';
      break;

    case 'test':
      cmd = 'sudo nginx -t 2>&1';
      break;
  }

  const res = await executeSSH(server, cmd, 90000);
  return {
    success: res.exitCode === 0,
    output: res.output,
  };
}

/**
 * Retrieve Nginx access or error logs
 */
export async function fetchNginxLogFile(
  server: INginxServerData,
  type: 'access' | 'error',
  lines: number = 200,
  filter?: string
): Promise<{ success: boolean; logLines: string[]; raw: string; error?: string }> {
  const filePath = type === 'access' ? '/var/log/nginx/access.log' : '/var/log/nginx/error.log';
  const grepClause = filter ? `| grep -i "${filter.replace(/"/g, '')}"` : '';
  const cmd = `if [ -f ${filePath} ]; then sudo tail -n ${lines} ${filePath} ${grepClause}; else echo "Log file ${filePath} does not exist"; fi`;

  try {
    const res = await executeSSH(server, cmd, 15000);
    const logLines = res.stdout ? res.stdout.split('\n').filter(Boolean) : [];
    return {
      success: true,
      logLines,
      raw: res.stdout,
    };
  } catch (err: any) {
    return {
      success: false,
      logLines: [],
      raw: '',
      error: err.message,
    };
  }
}

/**
 * PM2 Management
 */
export async function executePM2Action(
  server: INginxServerData,
  action: 'install' | 'start' | 'stop' | 'restart' | 'reload' | 'delete' | 'clear',
  target: string = 'all'
): Promise<{ success: boolean; output: string }> {
  let cmd = '';

  if (action === 'install') {
    cmd = 'sudo npm install -g pm2 && pm2 --version';
  } else if (action === 'clear') {
    cmd = 'pm2 flush';
  } else {
    cmd = `pm2 ${action} ${target}`;
  }

  const res = await executeSSH(server, cmd, 60000);
  return {
    success: res.exitCode === 0,
    output: res.output,
  };
}

/**
 * PM2 Logs
 */
export async function fetchPM2LogOutput(
  server: INginxServerData,
  appName?: string,
  lines: number = 200
): Promise<{ success: boolean; output: string }> {
  const target = appName ? `"${appName}"` : '';
  const cmd = `pm2 logs ${target} --lines ${lines} --nostream 2>&1 || cat ~/.pm2/logs/*.log 2>/dev/null | tail -n ${lines} || true`;

  const res = await executeSSH(server, cmd, 15000);
  return {
    success: res.exitCode === 0,
    output: res.output || 'No PM2 logs found for this application.',
  };
}

/**
 * Discover deployed applications across PM2, /var/www, /opt, /home, /srv, and Nginx configurations
 */
export async function discoverApplications(server: INginxServerData): Promise<DiscoveredApp[]> {
  const script = `
# 1. PM2 JSON
echo "===PM2_APPS==="
pm2 jlist 2>/dev/null || echo "[]"

# 2. Search for project configuration files in application directories
echo "===APP_MARKERS==="
find /var/www /opt /home /srv -maxdepth 4 \\( -name "package.json" -o -name "pom.xml" -o -name "build.gradle" -o -name "Dockerfile" \\) 2>/dev/null | head -n 40 || true

# 3. System Runtimes
echo "===RUNTIMES==="
echo -n "NODE:" && (node -v 2>/dev/null || echo "not installed")
echo -n "JAVA:" && (java -version 2>&1 | head -n 1 || echo "not installed")
echo -n "DOCKER:" && (docker -v 2>/dev/null || echo "not installed")
`;

  try {
    const res = await executeSSH(server, script, 20000);
    const out = res.stdout;

    const apps: DiscoveredApp[] = [];
    const seenDirs = new Set<string>();

    const getSection = (startMarker: string, endMarker?: string) => {
      const startIdx = out.indexOf(`===${startMarker}===`);
      if (startIdx === -1) return '';
      const after = out.slice(startIdx + startMarker.length + 6);
      if (!endMarker) return after.trim();
      const endIdx = after.indexOf(`===${endMarker}===`);
      return (endIdx === -1 ? after : after.slice(0, endIdx)).trim();
    };

    const pm2Json = getSection('PM2_APPS', 'APP_MARKERS');
    const markersRaw = getSection('APP_MARKERS', 'RUNTIMES');
    const runtimesRaw = getSection('RUNTIMES');

    let nodeVer = '';
    let javaVer = '';
    const nodeMatch = runtimesRaw.match(/NODE:v?([0-9.]+)/i);
    if (nodeMatch) nodeVer = `Node.js v${nodeMatch[1]}`;
    const javaMatch = runtimesRaw.match(/JAVA:(?:openjdk|java)\s+(?:version\s+)?"?([0-9._]+)/i);
    if (javaMatch) javaVer = `Java ${javaMatch[1]}`;

    // 1. Parse PM2 Apps
    try {
      if (pm2Json.startsWith('[') && pm2Json.endsWith(']')) {
        const pm2List = JSON.parse(pm2Json);
        for (const p of pm2List) {
          const dir = p.pm2_env?.pm_cwd || path.dirname(p.pm2_env?.pm_exec_path || '/var/www');
          seenDirs.add(dir);

          let appType: DiscoveredApp['type'] = 'nodejs';
          let frameworkName = 'Node.js App';
          const nameLower = (p.name || '').toLowerCase();
          const scriptLower = (p.pm2_env?.pm_exec_path || '').toLowerCase();

          if (scriptLower.includes('standalone') || scriptLower.includes('server.js')) {
            appType = 'nextjs-standalone';
            frameworkName = 'Next.js (Standalone)';
          } else if (nameLower.includes('next') || scriptLower.includes('next')) {
            appType = 'nextjs';
            frameworkName = 'Next.js';
          } else if (nameLower.includes('vite')) {
            appType = 'vite';
            frameworkName = 'Vite';
          } else if (nameLower.includes('express')) {
            appType = 'express';
            frameworkName = 'Express.js';
          }

          apps.push({
            name: p.name,
            type: appType,
            frameworkName,
            directory: dir,
            port: p.pm2_env?.env?.PORT || undefined,
            pm2Name: p.name,
            pm2Status: p.pm2_env?.status || 'unknown',
            runtimeVersion: nodeVer,
            packageManager: 'npm',
            buildConfig: p.pm2_env?.pm_exec_path || 'npm start',
          });
        }
      }
    } catch {}

    // 2. Parse Discovered Application directories
    if (markersRaw) {
      const markerLines = markersRaw.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const mPath of markerLines) {
        const dir = path.dirname(mPath);
        if (seenDirs.has(dir)) continue;
        seenDirs.add(dir);

        const fileName = path.basename(mPath);
        const dirBase = path.basename(dir);

        if (fileName === 'pom.xml') {
          apps.push({
            name: dirBase,
            type: 'maven',
            frameworkName: 'Maven / Java',
            directory: dir,
            packageManager: 'Maven',
            runtimeVersion: javaVer || 'Java Runtime',
            buildConfig: 'mvn clean package',
          });
        } else if (fileName === 'build.gradle') {
          apps.push({
            name: dirBase,
            type: 'gradle',
            frameworkName: 'Gradle / Java',
            directory: dir,
            packageManager: 'Gradle',
            runtimeVersion: javaVer || 'Java Runtime',
            buildConfig: 'gradle build',
          });
        } else if (fileName === 'Dockerfile') {
          apps.push({
            name: dirBase,
            type: 'docker',
            frameworkName: 'Docker Containerized App',
            directory: dir,
            packageManager: 'Docker',
            buildConfig: 'docker build -t app .',
          });
        } else if (fileName === 'package.json') {
          // Check if Vite or Next.js
          const isNext = dirBase.toLowerCase().includes('next');
          const isVite = dirBase.toLowerCase().includes('vite');

          apps.push({
            name: dirBase,
            type: isNext ? 'nextjs' : isVite ? 'vite' : 'nodejs',
            frameworkName: isNext ? 'Next.js' : isVite ? 'Vite' : 'Node.js',
            directory: dir,
            packageManager: 'npm / pnpm',
            runtimeVersion: nodeVer || 'Node.js',
            buildConfig: 'npm run build',
          });
        }
      }
    }

    return apps;
  } catch {
    return [];
  }
}

/**
 * Discover Nginx Reverse Proxy Configurations
 */
export async function discoverReverseProxies(server: INginxServerData): Promise<ReverseProxySite[]> {
  const script = `
for f in /etc/nginx/sites-available/* /etc/nginx/conf.d/*.conf; do
  if [ -f "$f" ]; then
    echo "===SITE_FILE:$f==="
    cat "$f"
    echo "===ENABLED==="
    bn=$(basename "$f")
    if [ -L "/etc/nginx/sites-enabled/$bn" ] || [ -f "/etc/nginx/conf.d/$bn" ]; then
      echo "YES"
    else
      echo "NO"
    fi
  fi
done
`;

  try {
    const res = await executeSSH(server, script, 20000);
    const sites: ReverseProxySite[] = [];

    const blocks = res.stdout.split('===SITE_FILE:');
    for (const b of blocks) {
      if (!b.trim()) continue;
      const fileEnd = b.indexOf('===');
      if (fileEnd === -1) continue;

      const filePath = b.slice(0, fileEnd).trim();
      const content = b.slice(fileEnd + 3);
      const enabledIdx = content.indexOf('===ENABLED===');

      const rawConfig = enabledIdx === -1 ? content : content.slice(0, enabledIdx);
      const isEnabled = enabledIdx !== -1 && content.slice(enabledIdx).includes('YES');

      // Parse server_name, listen, proxy_pass, root
      const serverNameMatch = rawConfig.match(/server_name\s+([^;]+);/i);
      const listenMatch = rawConfig.match(/listen\s+(\d+)/i);
      const proxyMatch = rawConfig.match(/proxy_pass\s+([^;]+);/i);
      const rootMatch = rawConfig.match(/root\s+([^;]+);/i);
      const ssl = /ssl\b/i.test(rawConfig);

      sites.push({
        fileName: path.basename(filePath),
        serverName: serverNameMatch ? serverNameMatch[1].trim() : '_',
        listenPort: listenMatch ? parseInt(listenMatch[1], 10) : 80,
        proxyPass: proxyMatch ? proxyMatch[1].trim() : undefined,
        rootPath: rootMatch ? rootMatch[1].trim() : undefined,
        ssl,
        enabled: isEnabled,
        rawConfig: rawConfig.trim(),
      });
    }

    return sites;
  } catch {
    return [];
  }
}

/**
 * Create or Update Nginx Reverse Proxy / Static site configuration
 */
export async function configureNginxSite(
  server: INginxServerData,
  site: {
    domain: string;
    listenPort?: number;
    proxyPass?: string;
    rootPath?: string;
    isStatic?: boolean;
    spaFallback?: boolean;
  }
): Promise<{ success: boolean; message: string; output?: string }> {
  const domain = site.domain.trim() || 'default';
  const fileName = `${domain.replace(/[^a-zA-Z0-9.-]/g, '_')}.conf`;
  const listenPort = site.listenPort || 80;

  let siteBlock = '';
  if (site.isStatic && site.rootPath) {
    siteBlock = `server {
    listen ${listenPort};
    server_name ${domain === 'default' ? '_' : domain};

    root ${site.rootPath};
    index index.html index.htm;

    location / {
        ${site.spaFallback !== false ? 'try_files $uri $uri/ /index.html;' : 'try_files $uri $uri/ =404;'}
    }

    access_log /var/log/nginx/${domain}_access.log;
    error_log /var/log/nginx/${domain}_error.log;
}
`;
  } else {
    siteBlock = `server {
    listen ${listenPort};
    server_name ${domain === 'default' ? '_' : domain};

    location / {
        proxy_pass ${site.proxyPass || 'http://127.0.0.1:3000'};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    access_log /var/log/nginx/${domain}_access.log;
    error_log /var/log/nginx/${domain}_error.log;
}
`;
  }

  // Safe application script with backup and rollback
  const b64 = Buffer.from(siteBlock).toString('base64');
  const script = `
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d /var/log/nginx
echo "${b64}" | base64 -d | sudo tee /etc/nginx/sites-available/${fileName} >/dev/null
sudo ln -sf /etc/nginx/sites-available/${fileName} /etc/nginx/sites-enabled/${fileName}
if sudo nginx -t; then
  sudo systemctl reload nginx
  echo "SUCCESS"
else
  sudo rm -f /etc/nginx/sites-enabled/${fileName}
  echo "VALIDATION_FAILED" >&2
  exit 1
fi
`;

  try {
    const res = await executeSSH(server, script, 20000);
    if (res.exitCode === 0 && res.output.includes('SUCCESS')) {
      return { success: true, message: `Nginx reverse proxy for "${domain}" applied and reloaded successfully!` };
    }
    return { success: false, message: 'Nginx configuration test failed', output: res.output };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Delete Nginx Site configuration
 */
export async function removeNginxSite(
  server: INginxServerData,
  fileName: string
): Promise<{ success: boolean; message: string }> {
  const safeName = path.basename(fileName);
  const script = `
sudo rm -f /etc/nginx/sites-enabled/${safeName}
sudo rm -f /etc/nginx/sites-available/${safeName}
sudo rm -f /etc/nginx/conf.d/${safeName}
sudo nginx -t && sudo systemctl reload nginx
`;

  try {
    const res = await executeSSH(server, script, 15000);
    return {
      success: res.exitCode === 0,
      message: res.exitCode === 0 ? `Site ${safeName} removed successfully.` : res.output,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Discover Git Repositories on Server
 */
export async function discoverGitRepositories(server: INginxServerData): Promise<GitRepoInfo[]> {
  const script = `
find /var/www /opt /home /srv -maxdepth 4 -name ".git" -type d 2>/dev/null | while read gitdir; do
  repo=$(dirname "$gitdir")
  echo "===REPO:$repo==="
  cd "$repo" 2>/dev/null || continue
  git config --get remote.origin.url 2>/dev/null || echo "No remote"
  echo "---BRANCH---"
  git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
  echo "---STATUS---"
  git status --short 2>/dev/null || true
  echo "---COMMIT---"
  git log -1 --pretty=format:"%h||%an||%ar||%s" 2>/dev/null || echo "none"
  echo "---LOCAL_BRANCHES---"
  git branch 2>/dev/null || true
  echo "---REMOTE_BRANCHES---"
  git branch -r 2>/dev/null || true
done
`;

  try {
    const res = await executeSSH(server, script, 25000);
    const repos: GitRepoInfo[] = [];

    const blocks = res.stdout.split('===REPO:');
    for (const b of blocks) {
      if (!b.trim()) continue;
      const pathEnd = b.indexOf('===');
      if (pathEnd === -1) continue;

      const repoPath = b.slice(0, pathEnd).trim();
      const content = b.slice(pathEnd + 3);

      const [remotePart, branchPart, statusPart, commitPart, localBranchPart, remoteBranchPart] =
        content.split(/---(?:BRANCH|STATUS|COMMIT|LOCAL_BRANCHES|REMOTE_BRANCHES)---/);

      const rawRemote = (remotePart || '').trim();
      const sanitizedRemote = rawRemote.replace(/(https?:\/\/)[^@]+@/, '$1');
      const currentBranch = (branchPart || '').trim();
      const statusText = (statusPart || '').trim();
      const commitRaw = (commitPart || '').trim();
      const commitParts = commitRaw.split('||');

      let provider: GitRepoInfo['provider'] = 'Local';
      if (sanitizedRemote.includes('github.com')) provider = 'GitHub';
      else if (sanitizedRemote.includes('gitlab.com')) provider = 'GitLab';
      else if (sanitizedRemote.includes('bitbucket.org')) provider = 'Bitbucket';
      else if (sanitizedRemote.includes('azure.com') || sanitizedRemote.includes('visualstudio.com')) provider = 'Azure DevOps';
      else if (sanitizedRemote.startsWith('http') || sanitizedRemote.startsWith('git@')) provider = 'Self-Hosted';

      const localBranches = (localBranchPart || '')
        .split('\n')
        .map((br) => br.replace('*', '').trim())
        .filter(Boolean);

      const remoteBranches = (remoteBranchPart || '')
        .split('\n')
        .map((br) => br.trim())
        .filter(Boolean);

      repos.push({
        name: path.basename(repoPath),
        path: repoPath,
        remoteUrl: sanitizedRemote,
        provider,
        currentBranch,
        localBranches,
        remoteBranches,
        latestCommit: {
          hash: commitParts[0] || '',
          author: commitParts[1] || '',
          relativeDate: commitParts[2] || '',
          message: commitParts[3] || '',
        },
        workingTreeStatus: statusText || 'Clean working tree',
        isClean: statusText.length === 0,
      });
    }

    return repos;
  } catch {
    return [];
  }
}

/**
 * Execute Git operations (checkout branch, fetch remotes, git pull, git branch, git status, git log)
 */
export async function executeGitAction(
  server: INginxServerData,
  repoPath: string,
  action: 'checkout' | 'fetch' | 'pull' | 'branch' | 'status' | 'log' | 'commit',
  param?: string
): Promise<{ success: boolean; output: string }> {
  const safePath = path.normalize(repoPath).replace(/\\/g, '/');

  let cmd = '';
  switch (action) {
    case 'checkout':
      if (!param || !/^[a-zA-Z0-9._\-/]+$/.test(param.trim())) {
        throw new Error('Invalid branch name.');
      }
      cmd = `cd "${safePath}" && git checkout "${param.trim()}" 2>&1`;
      break;
    case 'fetch':
      cmd = `cd "${safePath}" && git fetch --all --prune 2>&1`;
      break;
    case 'pull': {
      const branch = (param || 'main').trim();
      if (!/^[a-zA-Z0-9._\-/]+$/.test(branch)) {
        throw new Error('Invalid branch name for git pull.');
      }
      cmd = `cd "${safePath}" && git pull origin "${branch}" 2>&1`;
      break;
    }
    case 'branch':
      cmd = `cd "${safePath}" && git branch -a 2>&1`;
      break;
    case 'status':
      cmd = `cd "${safePath}" && git status 2>&1`;
      break;
    case 'commit':
      cmd = `cd "${safePath}" && git log -1 --stat --pretty=fuller 2>&1`;
      break;
    case 'log':
      cmd = `cd "${safePath}" && git log -n 12 --pretty=format:"%h - %an, %ar : %s" 2>&1`;
      break;
    default:
      throw new Error(`Unsupported Git action: ${action}`);
  }

  const res = await executeSSH(server, cmd, 45000);
  return {
    success: res.exitCode === 0,
    output: res.output,
  };
}

/**
 * Execute direct application deployment step on the server
 */
export async function executePipelineStep(
  server: INginxServerData,
  options: {
    repoPath: string;
    branch?: string;
    step: 'git-pull' | 'install' | 'build' | 'pm2-restart' | 'pm2-flush' | 'pm2-logs' | 'full-deploy';
    installCmd?: string;
    buildCmd?: string;
    pm2AppName?: string;
  }
): Promise<{ success: boolean; output: string; exitCode?: number }> {
  const safePath = path.normalize(options.repoPath).replace(/\\/g, '/');
  const branch = (options.branch || 'main').trim().replace(/[^a-zA-Z0-9._\-/]/g, '');
  const pm2App = (options.pm2AppName || '').trim().replace(/[^a-zA-Z0-9._\-]/g, '');

  let cmd = '';
  let timeoutMs = 90000;

  switch (options.step) {
    case 'git-pull':
      cmd = `cd "${safePath}" && git fetch --all && git checkout "${branch}" && git pull origin "${branch}" 2>&1`;
      break;
    case 'install': {
      const installCmd = options.installCmd?.trim() || 'npm install';
      cmd = `cd "${safePath}" && ${installCmd} 2>&1`;
      timeoutMs = 180000;
      break;
    }
    case 'build': {
      const buildCmd = options.buildCmd?.trim() || 'npm run build';
      cmd = `cd "${safePath}" && ${buildCmd} 2>&1`;
      timeoutMs = 240000;
      break;
    }
    case 'pm2-restart':
      if (!pm2App) throw new Error('PM2 application name is required.');
      cmd = `pm2 restart "${pm2App}" 2>&1 || pm2 start npm --name "${pm2App}" -- start 2>&1`;
      break;
    case 'pm2-flush':
      cmd = `pm2 flush 2>&1`;
      break;
    case 'pm2-logs':
      if (!pm2App) throw new Error('PM2 application name is required.');
      cmd = `pm2 logs "${pm2App}" --lines 40 --nostream 2>&1`;
      break;
    case 'full-deploy': {
      const installCmd = options.installCmd?.trim() || 'npm install';
      const buildCmd = options.buildCmd?.trim() || 'npm run build';
      timeoutMs = 300000;
      cmd = `
cd "${safePath}" || { echo "Directory not found: ${safePath}" >&2; exit 1; }
echo ">>> [1/4] Git Pull (${branch})..."
git fetch --all && git checkout "${branch}" && git pull origin "${branch}" || exit 1

echo ">>> [2/4] Installing dependencies (${installCmd})..."
${installCmd} || exit 1

echo ">>> [3/4] Building application (${buildCmd})..."
${buildCmd} || exit 1

if [ -n "${pm2App}" ]; then
  echo ">>> [4/4] Restarting PM2 process (${pm2App})..."
  pm2 restart "${pm2App}" || pm2 start npm --name "${pm2App}" -- start
  echo ">>> PM2 Status:"
  pm2 list
else
  echo ">>> [4/4] No PM2 process specified. Build completed."
fi
echo ">>> Deployment completed successfully."
`;
      break;
    }
    default:
      throw new Error(`Unsupported pipeline step: ${options.step}`);
  }

  const res = await executeSSH(server, cmd, timeoutMs);
  return {
    success: res.exitCode === 0,
    output: res.output,
    exitCode: res.exitCode,
  };
}

/**
 * File browser restricted to authorized directories
 */
export async function browseServerPath(server: INginxServerData, reqPath: string = '/var/www') {
  // Validate path traversal security
  const normalized = path.normalize(reqPath).replace(/\\/g, '/');
  const blockedPaths = ['/etc/shadow', '/etc/gshadow', '/etc/sudoers', '/root/.ssh', '/proc', '/sys'];
  if (blockedPaths.some((b) => normalized.startsWith(b))) {
    throw new Error('Access denied to protected system directory.');
  }

  const script = `
if [ -d "${normalized}" ]; then
  ls -la --time-style=long-iso "${normalized}"
else
  echo "DIR_NOT_FOUND" >&2
  exit 1
fi
`;

  const res = await executeSSH(server, script, 10000);
  if (res.exitCode !== 0) {
    throw new Error(res.output || 'Directory not found');
  }

  const lines = res.stdout.split('\n').slice(1); // skip total
  const items = lines
    .map((l) => {
      const parts = l.split(/\s+/);
      if (parts.length < 8) return null;
      const permissions = parts[0];
      const owner = `${parts[2]} ${parts[3]}`;
      const isDir = permissions.startsWith('d');
      const sizeBytes = parseInt(parts[4], 10) || 0;
      const modTime = `${parts[5]} ${parts[6]}`;
      const name = parts.slice(7).join(' ');

      if (name === '.' || name === '..') return null;

      // Mask sensitive files from browser
      const sensitive = ['.env', 'id_rsa', 'id_ed25519', '.pem', '.ppk', 'shadow', 'sudoers'];
      if (sensitive.some((s) => name.toLowerCase().includes(s))) {
        return null;
      }

      return {
        name,
        isDir,
        sizeBytes,
        permissions,
        owner,
        modTime,
        fullPath: normalized === '/' ? `/${name}` : `${normalized.replace(/\/$/, '')}/${name}`,
      };
    })
    .filter(Boolean);

  return {
    path: normalized,
    items,
  };
}

/**
 * Read permitted configuration/code file content
 */
export async function readPermittedFile(server: INginxServerData, filePath: string) {
  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  const allowedExts = ['.json', '.js', '.ts', '.conf', '.txt', '.log', '.html', '.css', '.md'];
  const ext = path.extname(normalized).toLowerCase();

  // Block sensitive files
  const base = path.basename(normalized).toLowerCase();
  if (base.includes('.env') || base.includes('id_rsa') || base.includes('.pem') || base.includes('.ppk')) {
    throw new Error('Access to sensitive security files is strictly forbidden.');
  }

  if (!allowedExts.includes(ext) && !normalized.includes('/nginx/')) {
    throw new Error('Unsupported or restricted file type.');
  }

  const script = `sudo head -n 500 "${normalized}"`;
  const res = await executeSSH(server, script, 10000);
  return {
    path: normalized,
    content: res.stdout,
  };
}

/**
 * Upload and deploy build archive (ZIP) via SFTP
 */
export async function deployBuildArchive(
  server: INginxServerData,
  deployment: INginxDeploymentDocument,
  zipBuffer: Buffer
): Promise<{ success: boolean; error?: string }> {
  const config = buildNginxSSHConfig(server, 30000);
  const client = new Client();
  const startTime = Date.now();

  let logBuffer = `[Deployment Engine] Starting deployment "${deployment.deploymentId}" for "${deployment.appName}" on ${server.name} (${server.host})...\n`;

  const appendLog = async (msg: string) => {
    logBuffer += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
    deployment.logs = logBuffer;
    await deployment.save();
  };

  return new Promise((resolve) => {
    client.on('ready', async () => {
      try {
        await appendLog('SSH connection verified successfully.');

        // 1. Open SFTP session to upload the archive
        client.sftp(async (err, sftp) => {
          if (err) {
            await appendLog(`SFTP initialization failed: ${err.message}`);
            deployment.status = 'FAILED';
            deployment.errorMessage = err.message;
            deployment.endTime = new Date();
            deployment.durationSeconds = Math.round((Date.now() - startTime) / 1000);
            await deployment.save();
            client.end();
            return resolve({ success: false, error: err.message });
          }

          const remoteZipPath = `/tmp/${deployment.deploymentId}.zip`;
          await appendLog(`Uploading build package (${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB) to remote server...`);

          const writeStream = sftp.createWriteStream(remoteZipPath);

          writeStream.on('close', async () => {
            await appendLog('Build archive uploaded cleanly via SFTP.');

            // 2. Prepare deployment commands
            const deployDir = deployment.deployDir || `/var/www/${deployment.appName}`;
            const backupDir = `/var/www/backups/${deployment.appName}_${Date.now()}`;
            deployment.backupDir = backupDir;

            await appendLog(`Target deployment path: ${deployDir}`);
            await appendLog(`Creating backup at: ${backupDir}...`);

            const isStatic = deployment.deploymentMode === 'static';
            const port = deployment.appPort || 3000;
            const pm2Name = deployment.pm2ProcessName || deployment.appName;

            // Script handles: backup, extract, permissions, start PM2 if node/next, reload Nginx
            const deployScript = `
set -e
echo "STEP: PREPARING DIRS"
sudo mkdir -p /var/www/backups "${deployDir}"

if [ -d "${deployDir}" ] && [ "$(ls -A ${deployDir} 2>/dev/null)" ]; then
  echo "STEP: BACKING UP"
  sudo cp -r "${deployDir}" "${backupDir}"
fi

echo "STEP: EXTRACTING ARCHIVE"
# Check if unzip is installed
if ! command -v unzip >/dev/null 2>&1; then
  sudo apt-get update -y && sudo apt-get install -y unzip || sudo yum install -y unzip || sudo dnf install -y unzip
fi

sudo unzip -o "${remoteZipPath}" -d "${deployDir}"
sudo rm -f "${remoteZipPath}"
sudo chown -R ${server.username}:${server.username} "${deployDir}"

${
  !isStatic
    ? `
echo "STEP: MANAGING PM2"
cd "${deployDir}"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "${pm2Name}" >/dev/null 2>&1; then
    echo "Reloading existing PM2 process ${pm2Name}..."
    pm2 reload "${pm2Name}" --update-env || pm2 restart "${pm2Name}"
  else
    echo "Starting new PM2 process ${pm2Name} on port ${port}..."
    PORT=${port} pm2 start "${deployment.startCommand || 'npm start'}" --name "${pm2Name}"
  fi
  pm2 save || true
fi
`
    : `echo "STEP: STATIC HOSTING (no PM2 needed)"`
}

echo "STEP: VERIFYING NGINX"
if command -v nginx >/dev/null 2>&1; then
  sudo nginx -t && sudo systemctl reload nginx || true
fi

echo "DEPLOY_COMPLETE"
`;

            client.exec(deployScript, async (execErr, stream) => {
              if (execErr) {
                await appendLog(`Deployment execution failed: ${execErr.message}`);
                deployment.status = 'FAILED';
                deployment.errorMessage = execErr.message;
                deployment.endTime = new Date();
                deployment.durationSeconds = Math.round((Date.now() - startTime) / 1000);
                await deployment.save();
                client.end();
                return resolve({ success: false, error: execErr.message });
              }

              stream.on('data', (d: Buffer) => {
                const text = d.toString();
                appendLog(text.trim());
              });

              stream.stderr.on('data', (d: Buffer) => {
                const text = d.toString();
                appendLog(`[STDERR] ${text.trim()}`);
              });

              stream.on('close', async (code: number) => {
                const durationSeconds = Math.round((Date.now() - startTime) / 1000);
                deployment.durationSeconds = durationSeconds;
                deployment.endTime = new Date();

                if (code === 0) {
                  await appendLog(`Deployment completed successfully in ${durationSeconds}s!`);
                  deployment.status = 'SUCCESS';
                  deployment.rollbackAvailable = true;

                  if (deployment.domain) {
                    deployment.appUrl = `http://${deployment.domain}`;
                  } else {
                    deployment.appUrl = `http://${server.host}:${port}`;
                  }
                  await deployment.save();
                  client.end();
                  resolve({ success: true });
                } else {
                  await appendLog(`Deployment script exited with non-zero code: ${code}.`);
                  deployment.status = 'FAILED';
                  deployment.errorMessage = `Deployment script exited with exit code ${code}.`;
                  await deployment.save();
                  client.end();
                  resolve({ success: false, error: `Exited with code ${code}` });
                }
              });
            });
          });

          writeStream.on('error', async (uploadErr: any) => {
            await appendLog(`File upload error: ${uploadErr.message}`);
            deployment.status = 'FAILED';
            deployment.errorMessage = uploadErr.message;
            deployment.endTime = new Date();
            await deployment.save();
            client.end();
            resolve({ success: false, error: uploadErr.message });
          });

          writeStream.end(zipBuffer);
        });
      } catch (e: any) {
        await appendLog(`Deployment exception: ${e.message}`);
        deployment.status = 'FAILED';
        deployment.errorMessage = e.message;
        deployment.endTime = new Date();
        await deployment.save();
        client.end();
        resolve({ success: false, error: e.message });
      }
    });

    client.on('error', async (err) => {
      await appendLog(`SSH failure: ${err.message}`);
      deployment.status = 'FAILED';
      deployment.errorMessage = err.message;
      deployment.endTime = new Date();
      await deployment.save();
      resolve({ success: false, error: err.message });
    });

    client.connect(config);
  });
}

/**
 * Rollback deployment to previously saved backup
 */
export async function rollbackDeployment(
  server: INginxServerData,
  deployment: INginxDeploymentDocument
): Promise<{ success: boolean; message: string }> {
  if (!deployment.backupDir) {
    return { success: false, message: 'No backup directory found for this deployment.' };
  }

  const script = `
if [ -d "${deployment.backupDir}" ]; then
  sudo rm -rf "${deployment.deployDir}"
  sudo cp -r "${deployment.backupDir}" "${deployment.deployDir}"
  sudo chown -R ${server.username}:${server.username} "${deployment.deployDir}"
  if command -v pm2 >/dev/null 2>&1 && [ -n "${deployment.pm2ProcessName}" ]; then
    pm2 reload "${deployment.pm2ProcessName}" || pm2 restart "${deployment.pm2ProcessName}" || true
  fi
  if command -v nginx >/dev/null 2>&1; then
    sudo nginx -t && sudo systemctl reload nginx || true
  fi
  echo "ROLLBACK_SUCCESS"
else
  echo "BACKUP_DIR_NOT_FOUND" >&2
  exit 1
fi
`;

  try {
    const res = await executeSSH(server, script, 30000);
    if (res.exitCode === 0 && res.output.includes('ROLLBACK_SUCCESS')) {
      deployment.status = 'ROLLED_BACK';
      await deployment.save();
      return { success: true, message: `Successfully rolled back to backup: ${deployment.backupDir}` };
    }
    return { success: false, message: res.output || 'Rollback script failed' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Deploy application directly from GitHub / Git repository via SSH
 */
export async function deployGitRepository(
  server: INginxServerData,
  deployment: INginxDeploymentDocument,
  gitOptions: {
    repoUrl: string;
    branch?: string;
    installCommand?: string;
    buildCommand?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const config = buildNginxSSHConfig(server, 60000);
  const client = new Client();
  const startTime = Date.now();
  const branch = gitOptions.branch?.trim() || 'main';
  const installCmd = gitOptions.installCommand?.trim() || 'npm install';
  const buildCmd = gitOptions.buildCommand?.trim() || '';
  const deployDir = deployment.deployDir || `/var/www/${deployment.appName}`;
  const backupDir = `/var/www/backups/${deployment.appName}_${Date.now()}`;
  deployment.backupDir = backupDir;

  let logBuffer = `[Deployment Engine] Starting GitHub deployment "${deployment.deploymentId}" for "${deployment.appName}" on ${server.name} (${server.host})...\n`;
  logBuffer += `[Deployment Engine] Repository: ${gitOptions.repoUrl} (Branch: ${branch})\n`;
  logBuffer += `[Deployment Engine] Deploy Directory: ${deployDir}\n\n`;

  const appendLog = async (msg: string) => {
    logBuffer += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
    deployment.logs = logBuffer;
    await deployment.save();
  };

  return new Promise((resolve) => {
    client.on('ready', async () => {
      try {
        await appendLog('SSH connection verified. Initializing Git deployment on remote server...');

        const isStatic = deployment.deploymentMode === 'static';
        const port = deployment.appPort || 3000;
        const pm2Name = deployment.pm2ProcessName || deployment.appName;

        const gitDeployScript = `
set -e
echo "=== STEP 1: PREPARING DIRS & BACKUP ==="
sudo mkdir -p /var/www/backups

if [ -d "${deployDir}" ] && [ "$(ls -A ${deployDir} 2>/dev/null)" ]; then
  echo "Backing up existing files to ${backupDir}..."
  sudo cp -r "${deployDir}" "${backupDir}" || true
fi

echo "=== STEP 2: VERIFYING GIT & NODE RUNTIMES ==="
if ! command -v git >/dev/null 2>&1; then
  echo "Installing Git..."
  sudo apt-get update -y && sudo apt-get install -y git || sudo yum install -y git || sudo dnf install -y git || true
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found, installing Node.js LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs || sudo yum install -y nodejs || true
fi

if ! command -v pm2 >/dev/null 2>&1 && [ "${isStatic}" != "true" ]; then
  echo "Installing PM2 globally..."
  sudo npm install -g pm2 || true
fi

echo "=== STEP 3: CLONING / PULLING REPOSITORY ==="
sudo mkdir -p "${deployDir}"
sudo chown -R ${server.username}:${server.username} "${deployDir}"

cd "${deployDir}"
if [ -d ".git" ]; then
  echo "Existing Git repository found. Fetching and checking out branch ${branch}..."
  git remote set-url origin "${gitOptions.repoUrl}" 2>/dev/null || true
  git fetch origin
  git checkout "${branch}" || git checkout -b "${branch}" "origin/${branch}"
  git pull origin "${branch}"
else
  echo "Cloning branch ${branch} from ${gitOptions.repoUrl}..."
  cd ..
  sudo rm -rf "${deployDir}"
  git clone -b "${branch}" --depth 1 "${gitOptions.repoUrl}" "${deployDir}"
  sudo chown -R ${server.username}:${server.username} "${deployDir}"
  cd "${deployDir}"
fi

echo "=== STEP 4: INSTALLING DEPENDENCIES ==="
echo "Executing: ${installCmd}"
${installCmd}

${
  buildCmd
    ? `
echo "=== STEP 5: BUILDING APPLICATION ==="
echo "Executing: ${buildCmd}"
${buildCmd}
`
    : `
if grep -q '"build":' package.json 2>/dev/null; then
  echo "=== STEP 5: RUNNING BUILD SCRIPT ==="
  npm run build || true
fi
`
}

${
  !isStatic
    ? `
echo "=== STEP 6: MANAGING PM2 PROCESS ==="
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "${pm2Name}" >/dev/null 2>&1; then
    echo "Reloading existing PM2 process ${pm2Name}..."
    pm2 reload "${pm2Name}" --update-env || pm2 restart "${pm2Name}"
  else
    echo "Starting new PM2 process ${pm2Name} on port ${port}..."
    PORT=${port} pm2 start "${deployment.startCommand || 'npm start'}" --name "${pm2Name}"
  fi
  pm2 save || true
fi
`
    : `echo "=== STEP 6: STATIC HOSTING (no PM2 needed) ==="`
}

echo "=== STEP 7: NGINX CONFIGURATION TEST & RELOAD ==="
if command -v nginx >/dev/null 2>&1; then
  sudo nginx -t && sudo systemctl reload nginx || true
fi

echo "GIT_DEPLOY_COMPLETE"
`;

        client.exec(gitDeployScript, async (execErr, stream) => {
          if (execErr) {
            await appendLog(`Execution error: ${execErr.message}`);
            deployment.status = 'FAILED';
            deployment.errorMessage = execErr.message;
            deployment.endTime = new Date();
            deployment.durationSeconds = Math.round((Date.now() - startTime) / 1000);
            await deployment.save();
            client.end();
            return resolve({ success: false, error: execErr.message });
          }

          stream.on('data', (d: Buffer) => {
            const text = d.toString();
            appendLog(text.trim());
          });

          stream.stderr.on('data', (d: Buffer) => {
            const text = d.toString();
            appendLog(`[STDERR] ${text.trim()}`);
          });

          stream.on('close', async (code: number) => {
            const durationSeconds = Math.round((Date.now() - startTime) / 1000);
            deployment.durationSeconds = durationSeconds;
            deployment.endTime = new Date();

            if (code === 0) {
              await appendLog(`Deployment completed successfully in ${durationSeconds}s!`);
              deployment.status = 'SUCCESS';
              deployment.rollbackAvailable = true;

              if (deployment.domain) {
                deployment.appUrl = `http://${deployment.domain}`;
              } else {
                deployment.appUrl = `http://${server.host}:${port}`;
              }
              await deployment.save();
              client.end();
              resolve({ success: true });
            } else {
              await appendLog(`Git deployment script exited with code ${code}.`);
              deployment.status = 'FAILED';
              deployment.errorMessage = `Deployment script exited with error code ${code}.`;
              await deployment.save();
              client.end();
              resolve({ success: false, error: `Exited with code ${code}` });
            }
          });
        });
      } catch (e: any) {
        await appendLog(`Deployment error: ${e.message}`);
        deployment.status = 'FAILED';
        deployment.errorMessage = e.message;
        deployment.endTime = new Date();
        await deployment.save();
        client.end();
        resolve({ success: false, error: e.message });
      }
    });

    client.on('error', async (err) => {
      await appendLog(`SSH connection failure: ${err.message}`);
      deployment.status = 'FAILED';
      deployment.errorMessage = err.message;
      deployment.endTime = new Date();
      await deployment.save();
      resolve({ success: false, error: err.message });
    });

    client.connect(config);
  });
}
