import { Client, ConnectConfig } from 'ssh2';
import mongoose from 'mongoose';
import { decryptSecret } from '@/lib/serverMonitoring/crypto';
import { convertPPKToOpenSSH } from '@/lib/serverMonitoring/ppkConverter';
import Server from '@/models/Server';
import TrivyScanResult, { ITrivyVulnerability } from '@/models/TrivyScanResult';
import connectToDatabase from '@/lib/mongodb';

export interface IDevopsServerInfo {
  id: string;
  name: string;
  host: string;
  publicIp?: string;
  privateIp?: string;
  cloudProvider: string;
  region: string;
  osName: string;
  status: string;
  jenkins: {
    detected: boolean;
    status: 'running' | 'stopped' | 'not_installed' | 'unreachable';
    version: string;
    port: number;
    url: string;
    installDate?: string;
    serviceName?: string;
    lastSyncedAt?: string;
    lastError?: string | null;
  };
  sonarqube: {
    detected: boolean;
    status: 'running' | 'stopped' | 'not_installed' | 'unreachable';
    version: string;
    port: number;
    url: string;
    mode: 'docker' | 'service' | 'standalone' | 'unknown';
    containerId?: string;
    healthStatus?: string;
    lastSyncedAt?: string;
    lastError?: string | null;
  };
  trivy: {
    detected: boolean;
    status: 'installed' | 'not_installed' | 'unreachable';
    version: string;
    installMethod?: string;
    lastScanAt?: string;
    lastScanTarget?: string;
    lastScanSummary?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      unknown: number;
    };
    lastSyncedAt?: string;
    lastError?: string | null;
  };
}

/**
 * Resolves server and its decrypted SSH credentials
 */
export async function resolveServer(serverId: string): Promise<any | null> {
  if (!serverId || typeof serverId !== 'string') return null;
  const cleanId = serverId.trim();

  await connectToDatabase();
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
        { instanceId: cleanId },
      ],
    }).lean();
  }

  // Also check CloudResource (AWS EC2 instances / cloud VMs)
  if (!serverDoc) {
    try {
      const CloudResource = (await import('@/models/CloudResource')).default;
      let cr: any = null;
      if (mongoose.isValidObjectId(cleanId)) {
        cr = await CloudResource.findById(cleanId).lean();
      }
      if (!cr) {
        cr = await CloudResource.findOne({
          $or: [
            { resourceId: cleanId },
            { name: cleanId },
            { publicIp: cleanId },
            { privateIp: cleanId },
          ],
        }).lean();
      }
      if (cr) {
        serverDoc = {
          _id: cr._id,
          id: cr._id.toString(),
          name: cr.name,
          host: cr.publicIp || cr.privateIp || '-',
          publicIp: cr.publicIp,
          privateIp: cr.privateIp,
          cloudProvider: cr.provider || 'aws',
          region: cr.region || 'global',
          os: { name: 'Linux' },
          status: cr.status || 'Online',
          jenkins: cr.metadata?.jenkins,
          sonarqube: cr.metadata?.sonarqube,
          trivy: cr.metadata?.trivy,
        };
      }
    } catch { }
  }

  // Fallback to NginxServer if credentials stored there
  if (!serverDoc || !serverDoc.encryptedAuthSecret) {
    try {
      const NginxServer = (await import('@/models/NginxServer')).default;
      let nginxFallback: any = null;
      if (mongoose.isValidObjectId(cleanId)) {
        nginxFallback = await NginxServer.findById(cleanId).lean();
      }
      if (!nginxFallback) {
        nginxFallback = await NginxServer.findOne({
          $or: [
            { host: cleanId },
            { publicIp: cleanId },
            { name: cleanId },
            { name: serverDoc?.name },
            { host: serverDoc?.host },
          ],
        }).lean();
      }
      if (nginxFallback) {
        if (!serverDoc) {
          serverDoc = nginxFallback;
        } else {
          serverDoc.encryptedAuthSecret = nginxFallback.encryptedAuthSecret;
          serverDoc.authSecretIv = nginxFallback.authSecretIv;
          serverDoc.authSecretTag = nginxFallback.authSecretTag;
          if (!serverDoc.username && nginxFallback.username) serverDoc.username = nginxFallback.username;
          if (!serverDoc.authMethod && nginxFallback.authMethod) serverDoc.authMethod = nginxFallback.authMethod;
        }
      }
    } catch { }
  }

  return serverDoc;
}

/**
 * Builds an ssh2 ConnectConfig from server document
 */
export function buildSSHConfig(server: any, timeoutMs: number = 10000): ConnectConfig {
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
 * Persists DevOps tool telemetry synchronously to Server and CloudResource documents
 */
export async function updateDevopsMetadata(serverId: any, updateFields: Record<string, any>) {
  try {
    const CloudResource = (await import('@/models/CloudResource')).default;
    const crFields: Record<string, any> = {};
    for (const [k, v] of Object.entries(updateFields)) {
      if (k === 'jenkins' || k.startsWith('jenkins.')) crFields[`metadata.${k}`] = v;
      else if (k === 'sonarqube' || k.startsWith('sonarqube.')) crFields[`metadata.${k}`] = v;
      else if (k === 'trivy' || k.startsWith('trivy.')) crFields[`metadata.${k}`] = v;
      else crFields[k] = v;
    }
    await Promise.allSettled([
      Server.updateOne({ _id: serverId }, { $set: updateFields }),
      CloudResource.updateOne({ _id: serverId }, { $set: crFields }),
    ]);
  } catch (err: any) {
    console.warn('[updateDevopsMetadata] Warning:', err?.message);
  }
}

/**
 * Runs a remote command via SSH with full stdout/stderr capture
 */
export async function executeSSH(
  server: any,
  command: string,
  timeoutMs: number = 25000
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    let conn: Client | null = null;
    let timer: NodeJS.Timeout | null = null;

    try {
      const config = buildSSHConfig(server, timeoutMs);
      conn = new Client();

      timer = setTimeout(() => {
        if (conn) {
          try { conn.end(); } catch { }
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
 * Comprehensive probe detecting Jenkins, SonarQube, and Trivy in a single fast SSH session
 */
export async function probeDevopsTools(server: any): Promise<{
  jenkins: IDevopsServerInfo['jenkins'];
  sonarqube: IDevopsServerInfo['sonarqube'];
  trivy: IDevopsServerInfo['trivy'];
}> {
  const hostIp = server.publicIp || server.host || server.privateIp;

  const script = `
# 1. Jenkins Probe
JENKINS_INSTALLED=0
JENKINS_STATUS="not_installed"
JENKINS_VERSION=""
JENKINS_PORT=8080
JENKINS_INSTALL_DATE=""

IS_DEB_INSTALLED=0
if dpkg -s jenkins 2>/dev/null | grep -q 'Status: install ok installed'; then
  IS_DEB_INSTALLED=1
fi

if [ "$IS_DEB_INSTALLED" -eq 1 ] || [ -f /usr/share/java/jenkins.war ] || (command -v jenkins >/dev/null 2>&1 && [ -x /usr/bin/jenkins ]); then
  JENKINS_INSTALLED=1
  JENKINS_VERSION=$(jenkins --version 2>/dev/null || (unzip -p /usr/share/java/jenkins.war META-INF/MANIFEST.MF 2>/dev/null | grep -i 'Jenkins-Version' | awk '{print $2}' | tr -d '\\r') || (dpkg -s jenkins 2>/dev/null | grep -i '^Version:' | awk '{print $2}') || echo "")
  
  if systemctl is-active jenkins >/dev/null 2>&1; then
    JENKINS_STATUS="running"
  elif pgrep -f '/usr/share/java/jenkins\\.war' >/dev/null 2>&1 || pgrep -f 'jenkins\\.model\\.Jenkins' >/dev/null 2>&1; then
    JENKINS_STATUS="running"
  else
    JENKINS_STATUS="stopped"
  fi
  
  LIVE_PORT=$(ss -tulpn 2>/dev/null | grep -E ':(8080|8081|8888|[0-9]{4,5})\\b' | grep -i 'java' | grep -oE ':[0-9]+' | tr -d ':' | head -n 1)
  if [ -n "$LIVE_PORT" ]; then
    JENKINS_PORT=$LIVE_PORT
  else
    CONF_PORT=$(grep -E '^(HTTP_PORT|JENKINS_PORT)=' /etc/default/jenkins 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" || grep -oE '\\--httpPort=[0-9]+' /lib/systemd/system/jenkins.service /etc/systemd/system/jenkins.service /usr/lib/systemd/system/jenkins.service 2>/dev/null | cut -d'=' -f2 | head -n 1)
    if [ -n "$CONF_PORT" ]; then
      JENKINS_PORT=$CONF_PORT
    fi
  fi
  
  JENKINS_INSTALL_DATE=$(stat -c %y /var/lib/jenkins 2>/dev/null | cut -d'.' -f1 || stat -c %y /usr/share/java/jenkins.war 2>/dev/null | cut -d'.' -f1 || echo "")
fi

echo "===SECTION:JENKINS==="
echo "INSTALLED:$JENKINS_INSTALLED"
echo "STATUS:$JENKINS_STATUS"
echo "VERSION:$JENKINS_VERSION"
echo "PORT:$JENKINS_PORT"
echo "INSTALL_DATE:$JENKINS_INSTALL_DATE"

# 2. SonarQube Probe
SONAR_INSTALLED=0
SONAR_STATUS="not_installed"
SONAR_VERSION=""
SONAR_PORT=9000
SONAR_MODE="unknown"
SONAR_CONTAINER_ID=""
SONAR_HEALTH="UNKNOWN"

if command -v docker >/dev/null 2>&1; then
  DOCKER_CMD="docker"
  if ! docker ps >/dev/null 2>&1 && sudo -n docker ps >/dev/null 2>&1; then
    DOCKER_CMD="sudo -n docker"
  fi
  
  SONAR_DOCKER_OUT=$($DOCKER_CMD ps -a --filter "ancestor=sonarqube" --format '{{.ID}};;;{{.Names}};;;{{.State}};;;{{.Ports}};;;{{.Image}}' 2>/dev/null)
  if [ -z "$SONAR_DOCKER_OUT" ]; then
    SONAR_DOCKER_OUT=$($DOCKER_CMD ps -a --format '{{.ID}};;;{{.Names}};;;{{.State}};;;{{.Ports}};;;{{.Image}}' 2>/dev/null | grep -i 'sonarqube' | head -n 1)
  fi
  
  if [ -n "$SONAR_DOCKER_OUT" ]; then
    SONAR_INSTALLED=1
    SONAR_MODE="docker"
    SONAR_CONTAINER_ID=$(echo "$SONAR_DOCKER_OUT" | awk -F';;;' '{print $1}')
    CONTAINER_STATE=$(echo "$SONAR_DOCKER_OUT" | awk -F';;;' '{print $3}')
    CONTAINER_PORTS=$(echo "$SONAR_DOCKER_OUT" | awk -F';;;' '{print $4}')
    CONTAINER_IMAGE=$(echo "$SONAR_DOCKER_OUT" | awk -F';;;' '{print $5}')
    
    if [ "$CONTAINER_STATE" = "running" ]; then
      SONAR_STATUS="running"
    else
      SONAR_STATUS="stopped"
    fi
    
    DETECTED_PORT=$(echo "$CONTAINER_PORTS" | grep -oE '0\\.0\\.0\\.0:[0-9]+' | cut -d':' -f2 | head -n 1)
    if [ -n "$DETECTED_PORT" ]; then
      SONAR_PORT=$DETECTED_PORT
    fi
    
    IMAGE_TAG=$(echo "$CONTAINER_IMAGE" | cut -d':' -f2)
    if [ -n "$IMAGE_TAG" ] && [ "$IMAGE_TAG" != "latest" ]; then
      SONAR_VERSION=$IMAGE_TAG
    fi
  fi
fi

if [ "$SONAR_INSTALLED" -eq 0 ]; then
  if [ -d /opt/sonarqube ] || systemctl list-unit-files 2>/dev/null | grep -qE 'sonar(qube)?\\.service' || [ -f /etc/systemd/system/sonar.service ] || [ -f /etc/systemd/system/sonarqube.service ]; then
    SONAR_INSTALLED=1
    SONAR_MODE="service"
    if systemctl is-active sonar >/dev/null 2>&1 || systemctl is-active sonarqube >/dev/null 2>&1 || pgrep -f 'sonar' >/dev/null 2>&1; then
      SONAR_STATUS="running"
    else
      SONAR_STATUS="stopped"
    fi
    
    CONF_PORT=$(grep -E '^\\s*sonar\\.web\\.port=' /opt/sonarqube/conf/sonar.properties 2>/dev/null | cut -d'=' -f2 | tr -d ' ' | head -n 1)
    if [ -n "$CONF_PORT" ]; then
      SONAR_PORT=$CONF_PORT
    fi
  fi
fi

if [ "$SONAR_STATUS" = "running" ]; then
  API_VER=$(curl -s --connect-timeout 2 http://localhost:\${SONAR_PORT}/api/server/version 2>/dev/null | tr -d '\\r\\n')
  if [ -n "$API_VER" ] && [[ "$API_VER" =~ ^[0-9] ]]; then
    SONAR_VERSION=$API_VER
  fi
  
  HEALTH_STATUS=$(curl -s --connect-timeout 2 http://localhost:\${SONAR_PORT}/api/system/status 2>/dev/null | grep -oE '"status":"[^"]+"' | cut -d':' -f2 | tr -d '"')
  if [ -n "$HEALTH_STATUS" ]; then
    SONAR_HEALTH=$HEALTH_STATUS
  else
    SONAR_HEALTH="UP"
  fi
fi

echo "===SECTION:SONARQUBE==="
echo "INSTALLED:$SONAR_INSTALLED"
echo "STATUS:$SONAR_STATUS"
echo "VERSION:$SONAR_VERSION"
echo "PORT:$SONAR_PORT"
echo "MODE:$SONAR_MODE"
echo "CONTAINER_ID:$SONAR_CONTAINER_ID"
echo "HEALTH:$SONAR_HEALTH"

# 3. Trivy Probe
TRIVY_INSTALLED=0
TRIVY_STATUS="not_installed"
TRIVY_VERSION=""
TRIVY_METHOD="unknown"

TRIVY_BIN=$(command -v trivy 2>/dev/null || which trivy 2>/dev/null || ( [ -x /usr/local/bin/trivy ] && echo "/usr/local/bin/trivy" ) || ( [ -x /usr/bin/trivy ] && echo "/usr/bin/trivy" ))

if [ -n "$TRIVY_BIN" ]; then
  TRIVY_INSTALLED=1
  TRIVY_STATUS="installed"
  TRIVY_VERSION=$($TRIVY_BIN --version 2>/dev/null | head -n 1 | awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9]+\\.[0-9]+/) print $i}')
  if [ -z "$TRIVY_VERSION" ]; then
    TRIVY_VERSION=$($TRIVY_BIN --version 2>/dev/null | head -n 1)
  fi
  
  if dpkg -l trivy >/dev/null 2>&1; then
    TRIVY_METHOD="apt"
  elif rpm -q trivy >/dev/null 2>&1; then
    TRIVY_METHOD="rpm"
  elif [ "$TRIVY_BIN" = "/usr/local/bin/trivy" ]; then
    TRIVY_METHOD="binary"
  else
    TRIVY_METHOD="system"
  fi
fi

echo "===SECTION:TRIVY==="
echo "INSTALLED:$TRIVY_INSTALLED"
echo "STATUS:$TRIVY_STATUS"
echo "VERSION:$TRIVY_VERSION"
echo "METHOD:$TRIVY_METHOD"
`;

  try {
    const { stdout } = await executeSSH(server, script, 15000);

    const parseSection = (sectionName: string) => {
      const match = stdout.match(new RegExp(`===SECTION:${sectionName}===\\s*([\\s\\S]*?)(?:===SECTION:|$)`));
      if (!match) return {};
      const lines = match[1].trim().split('\n');
      const res: Record<string, string> = {};
      for (const line of lines) {
        const [k, ...v] = line.split(':');
        if (k) res[k.trim()] = v.join(':').trim();
      }
      return res;
    };

    const j = parseSection('JENKINS');
    const s = parseSection('SONARQUBE');
    const t = parseSection('TRIVY');

    const jenkinsPort = parseInt(j.PORT, 10) || 8080;
    const sonarqubePort = parseInt(s.PORT, 10) || 9000;

    const jenkins: IDevopsServerInfo['jenkins'] = {
      detected: j.INSTALLED === '1',
      status: (j.STATUS as any) || 'not_installed',
      version: j.VERSION || '',
      port: jenkinsPort,
      url: j.INSTALLED === '1' ? `http://${hostIp}:${jenkinsPort}` : '',
      installDate: j.INSTALL_DATE || '',
      serviceName: 'jenkins',
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    };

    const sonarqube: IDevopsServerInfo['sonarqube'] = {
      detected: s.INSTALLED === '1',
      status: (s.STATUS as any) || 'not_installed',
      version: s.VERSION || '',
      port: sonarqubePort,
      url: s.INSTALLED === '1' ? `http://${hostIp}:${sonarqubePort}` : '',
      mode: (s.MODE as any) || 'unknown',
      containerId: s.CONTAINER_ID || '',
      healthStatus: s.HEALTH || 'UNKNOWN',
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    };

    const trivy: IDevopsServerInfo['trivy'] = {
      detected: t.INSTALLED === '1',
      status: (t.STATUS as any) || 'not_installed',
      version: t.VERSION || '',
      installMethod: t.METHOD || 'unknown',
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    };

    return { jenkins, sonarqube, trivy };
  } catch (err: any) {
    return {
      jenkins: {
        detected: false,
        status: 'unreachable',
        version: '',
        port: 8080,
        url: '',
        lastSyncedAt: new Date().toISOString(),
        lastError: err.message,
      },
      sonarqube: {
        detected: false,
        status: 'unreachable',
        version: '',
        port: 9000,
        url: '',
        mode: 'unknown',
        healthStatus: 'DOWN',
        lastSyncedAt: new Date().toISOString(),
        lastError: err.message,
      },
      trivy: {
        detected: false,
        status: 'unreachable',
        version: '',
        lastSyncedAt: new Date().toISOString(),
        lastError: err.message,
      },
    };
  }
}

/**
 * Synchronize all registered servers and cloud instances, storing real Jenkins, SonarQube, and Trivy telemetry in MongoDB
 */
export async function getDevopsServers(doSync: boolean = false): Promise<IDevopsServerInfo[]> {
  await connectToDatabase();

  const CloudResource = (await import('@/models/CloudResource')).default;
  const NginxServer = (await import('@/models/NginxServer')).default;

  const [dbServers, awsResources, nginxServers] = await Promise.all([
    Server.find().lean(),
    CloudResource.find({
      provider: 'aws',
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
    }).lean(),
    NginxServer.find().lean(),
  ]);

  const serverNames = new Set(dbServers.map((s: any) => (s.name || '').toLowerCase().trim()));
  const serverHosts = new Set(dbServers.map((s: any) => (s.host || s.publicIp || '').trim()).filter(Boolean));

  const allCandidateServers: any[] = [...dbServers];

  for (const cr of awsResources) {
    if (cr.resourceId && cr.resourceId.startsWith('srv-')) continue;
    const crPub = (cr.publicIp || '').trim();
    const crPriv = (cr.privateIp || '').trim();
    if (!crPub && !crPriv) continue;

    const crName = (cr.name || '').toLowerCase().trim();
    const crHost = crPub || crPriv;

    if (serverNames.has(crName) || (crHost && serverHosts.has(crHost))) {
      continue;
    }

    const matchedNginx = nginxServers.find((n: any) => {
      const nName = (n.name || '').toLowerCase().trim();
      const nHost = (n.host || n.publicIp || '').trim();
      return (nName && nName === crName) || (crHost && nHost === crHost);
    });

    const isRunning = (cr.status || '').toLowerCase().includes('run');

    const synthServer: any = {
      _id: cr._id,
      id: cr._id.toString(),
      name: cr.name,
      host: crPub || crPriv || '-',
      publicIp: crPub || undefined,
      privateIp: crPriv || undefined,
      cloudProvider: 'aws',
      region: cr.region || 'ap-southeast-2',
      os: { name: 'Linux' },
      status: isRunning ? 'Online' : 'Stopped',
      encryptedAuthSecret: matchedNginx?.encryptedAuthSecret,
      authSecretIv: matchedNginx?.authSecretIv,
      authSecretTag: matchedNginx?.authSecretTag,
      username: matchedNginx?.username || 'ubuntu',
      authMethod: matchedNginx?.authMethod || 'password',
      jenkins: cr.metadata?.jenkins || { detected: false, status: 'not_installed', version: '', port: 8080 },
      sonarqube: cr.metadata?.sonarqube || { detected: false, status: 'not_installed', version: '', port: 9000 },
      trivy: cr.metadata?.trivy || { detected: false, status: 'not_installed', version: '' },
    };

    allCandidateServers.push(synthServer);
  }

  const results: IDevopsServerInfo[] = [];

  for (const s of allCandidateServers) {
    const hostIp = s.publicIp || s.host || s.privateIp || '-';
    let toolState: {
      jenkins: IDevopsServerInfo['jenkins'];
      sonarqube: IDevopsServerInfo['sonarqube'];
      trivy: IDevopsServerInfo['trivy'];
    };

    const isStopped = (s.status || '').toLowerCase().includes('stop') || s.status === 'Offline';

    if (doSync && !isStopped && s.encryptedAuthSecret && s.host && s.host !== '-') {
      toolState = await probeDevopsTools(s);

      try {
        await Server.updateOne(
          { _id: s._id },
          {
            $set: {
              jenkins: { ...toolState.jenkins, lastSyncedAt: new Date() },
              sonarqube: { ...toolState.sonarqube, lastSyncedAt: new Date() },
              trivy: { ...toolState.trivy, lastSyncedAt: new Date() },
            },
          }
        );
      } catch { }
    } else {
      toolState = {
        jenkins: {
          detected: s.jenkins?.detected || false,
          status: s.jenkins?.status || (isStopped ? 'not_installed' : 'unreachable'),
          version: s.jenkins?.version || '',
          port: s.jenkins?.port || 8080,
          url: s.jenkins?.url || (s.jenkins?.detected ? `http://${hostIp}:${s.jenkins?.port || 8080}` : ''),
          installDate: s.jenkins?.installDate || '',
          serviceName: s.jenkins?.serviceName || 'jenkins',
          lastSyncedAt: s.jenkins?.lastSyncedAt ? new Date(s.jenkins.lastSyncedAt).toISOString() : undefined,
          lastError: isStopped ? 'Server is Stopped' : (s.jenkins?.lastError || null),
        },
        sonarqube: {
          detected: s.sonarqube?.detected || false,
          status: s.sonarqube?.status || (isStopped ? 'not_installed' : 'unreachable'),
          version: s.sonarqube?.version || '',
          port: s.sonarqube?.port || 9000,
          url: s.sonarqube?.url || '',
          mode: (s.sonarqube?.mode as any) || 'unknown',
          containerId: s.sonarqube?.containerId || '',
          healthStatus: isStopped ? 'STOPPED' : (s.sonarqube?.healthStatus || 'UNKNOWN'),
          lastSyncedAt: s.sonarqube?.lastSyncedAt ? new Date(s.sonarqube.lastSyncedAt).toISOString() : undefined,
          lastError: isStopped ? 'Server is Stopped' : (s.sonarqube?.lastError || null),
        },
        trivy: {
          detected: s.trivy?.detected || false,
          status: s.trivy?.status || (isStopped ? 'not_installed' : 'unreachable'),
          version: s.trivy?.version || '',
          installMethod: s.trivy?.installMethod || 'unknown',
          lastSyncedAt: s.trivy?.lastSyncedAt ? new Date(s.trivy.lastSyncedAt).toISOString() : undefined,
          lastError: isStopped ? 'Server is Stopped' : (s.trivy?.lastError || null),
        },
      };
    }

    results.push({
      id: String(s._id),
      name: s.name,
      host: hostIp,
      publicIp: s.publicIp,
      privateIp: s.privateIp,
      cloudProvider: s.cloudProvider || 'other',
      region: s.region || 'global',
      osName: s.os?.name || 'Linux',
      status: s.status,
      ...toolState,
    });
  }

  return results;
}

export async function syncDevopsServers(): Promise<IDevopsServerInfo[]> {
  return getDevopsServers(true);
}

/**
 * Execute Jenkins management actions
 */
export async function executeJenkinsAction(
  server: any,
  action: 'start' | 'stop' | 'restart' | 'install' | 'uninstall' | 'detect',
  options: { preserveData?: boolean; port?: number } = {}
): Promise<{ success: boolean; message: string; output: string }> {
  const jenkinsPort = options.port || 8080;

  const sStatus = (server.status || '').toLowerCase();
  const isStopped = sStatus.includes('stop') || sStatus === 'offline';
  if (isStopped && action !== 'detect') {
    return {
      success: false,
      message: `Cannot execute "${action}" on "${server.name}" because the server is currently STOPPED. Please start the host server first.`,
      output: `Server status is "${server.status}". Host must be running to execute commands via SSH.`,
    };
  }

  switch (action) {
    case 'detect': {
      const probe = await probeDevopsTools(server);
      await Server.updateOne(
        { _id: server._id },
        { $set: { jenkins: { ...probe.jenkins, lastSyncedAt: new Date() } } }
      );
      return {
        success: true,
        message: probe.jenkins.detected
          ? `Jenkins detected: ${probe.jenkins.version || 'Version detected'} (${probe.jenkins.status}) on port ${probe.jenkins.port}`
          : 'Jenkins is not installed on this server',
        output: JSON.stringify(probe.jenkins, null, 2),
      };
    }

    case 'start': {
      const cmd = `sudo systemctl start jenkins && sleep 2 && systemctl is-active jenkins`;
      const res = await executeSSH(server, cmd, 20000);
      const isRunning = res.stdout.trim() === 'active';
      if (isRunning) {
        await updateDevopsMetadata(
          server._id,
          { 'jenkins.status': 'running', 'jenkins.lastSyncedAt': new Date() }
        );
        return { success: true, message: 'Jenkins service started successfully', output: res.stdout };
      }
      return { success: false, message: `Failed to start Jenkins: ${res.stderr || res.stdout}`, output: res.stderr || res.stdout };
    }

    case 'stop': {
      const cmd = `sudo systemctl stop jenkins && sleep 1 && (systemctl is-active jenkins || true)`;
      const res = await executeSSH(server, cmd, 20000);
      await updateDevopsMetadata(
        server._id,
        { 'jenkins.status': 'stopped', 'jenkins.lastSyncedAt': new Date() }
      );
      return { success: true, message: 'Jenkins service stopped successfully', output: res.stdout };
    }

    case 'restart': {
      const cmd = `sudo systemctl restart jenkins && sleep 2 && systemctl is-active jenkins`;
      const res = await executeSSH(server, cmd, 25000);
      const isRunning = res.stdout.trim() === 'active';
      if (isRunning) {
        await updateDevopsMetadata(
          server._id,
          { 'jenkins.status': 'running', 'jenkins.lastSyncedAt': new Date() }
        );
        return { success: true, message: 'Jenkins restarted successfully', output: res.stdout };
      }
      return { success: false, message: `Failed to restart Jenkins: ${res.stderr || res.stdout}`, output: res.stderr || res.stdout };
    }

    case 'install': {
      // 1. Check if already installed
      const check = await executeSSH(server, `(command -v jenkins || [ -f /usr/share/java/jenkins.war ]) >/dev/null 2>&1 && echo "ALREADY_INSTALLED" || echo "MISSING"`);
      if (check.stdout.includes('ALREADY_INSTALLED')) {
        return { success: true, message: 'Jenkins is already installed on this server', output: check.stdout };
      }

      // 2. Safe official Debian/Ubuntu Jenkins installation with OpenJDK 21 (required by modern Jenkins 2.500+)
      const installScript = `
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

echo "Updating package indices..."
sudo apt-get update -y || true

echo "Installing OpenJDK 21 and essential prerequisites..."
sudo apt-get install -y fontconfig openjdk-21-jre openjdk-21-jdk wget curl gnupg

# Set Java 21 as default alternative if multiple exist
sudo update-java-alternatives --set java-1.21.0-openjdk-amd64 2>/dev/null || true

echo "Setting up Jenkins official repository key..."
sudo mkdir -p /etc/apt/keyrings
sudo chmod 755 /etc/apt/keyrings

# Download official Jenkins 2026 key (or fallback to 2023 key / keyserver)
if ! curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key | sudo tee /etc/apt/keyrings/jenkins-keyring.asc > /dev/null; then
  curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /etc/apt/keyrings/jenkins-keyring.asc > /dev/null
fi
sudo chmod 644 /etc/apt/keyrings/jenkins-keyring.asc

echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

echo "Updating package index with Jenkins repo..."
sudo apt-get update -y

echo "Installing Jenkins..."
sudo apt-get install -y jenkins

${jenkinsPort !== 8080 ? `
echo "Configuring Jenkins HTTP port to ${jenkinsPort}..."
sudo mkdir -p /etc/systemd/system/jenkins.service.d
echo -e "[Service]\\nEnvironment=\\"JENKINS_PORT=${jenkinsPort}\\"" | sudo tee /etc/systemd/system/jenkins.service.d/override.conf > /dev/null
` : ''}

echo "Enabling and starting Jenkins service..."
sudo systemctl daemon-reload
sudo systemctl reset-failed jenkins 2>/dev/null || true
sudo systemctl enable jenkins
sudo systemctl restart jenkins

# Wait for Jenkins JVM to start and initialize
for i in $(seq 1 30); do
  if systemctl is-active --quiet jenkins; then
    break
  fi
  sleep 1
done
systemctl is-active jenkins
jenkins --version || true
      `;

      const res = await executeSSH(server, installScript, 240000); // 4 minute timeout for package download
      const probe = await probeDevopsTools(server);
      await updateDevopsMetadata(
        server._id,
        { jenkins: { ...probe.jenkins, lastSyncedAt: new Date() } }
      );

      return {
        success: probe.jenkins.detected,
        message: probe.jenkins.detected
          ? `Jenkins successfully installed (v${probe.jenkins.version}) on port ${probe.jenkins.port}`
          : `Installation encountered an issue: ${res.stderr || res.stdout}`,
        output: res.stdout + (res.stderr ? '\n' + res.stderr : ''),
      };
    }

    case 'uninstall': {
      const preserve = options.preserveData !== false;
      const uninstallScript = preserve
        ? `
sudo systemctl stop jenkins 2>/dev/null || true
sudo systemctl disable jenkins 2>/dev/null || true
sudo pkill -9 -f 'jenkins.war' 2>/dev/null || true
sudo apt-get remove -y jenkins 2>/dev/null || true
sudo rm -f /usr/share/java/jenkins.war /usr/bin/jenkins /etc/apt/sources.list.d/jenkins.list /etc/apt/keyrings/jenkins-keyring.asc /usr/share/keyrings/jenkins-keyring.asc
sudo rm -rf /etc/systemd/system/jenkins.service.d
echo "Jenkins removed. Configurations in /var/lib/jenkins preserved."
        `
        : `
sudo systemctl stop jenkins 2>/dev/null || true
sudo systemctl disable jenkins 2>/dev/null || true
sudo pkill -9 -f 'jenkins.war' 2>/dev/null || true
sudo apt-get purge -y jenkins 2>/dev/null || true
sudo rm -rf /var/lib/jenkins /etc/default/jenkins /usr/share/java/jenkins.war /usr/bin/jenkins /etc/apt/sources.list.d/jenkins.list /etc/apt/keyrings/jenkins-keyring.asc /usr/share/keyrings/jenkins-keyring.asc /etc/systemd/system/jenkins.service.d
echo "Jenkins completely purged."
        `;

      const res = await executeSSH(server, uninstallScript, 60000);
      const probe = await probeDevopsTools(server);
      await updateDevopsMetadata(
        server._id,
        {
          jenkins: {
            ...probe.jenkins,
            lastSyncedAt: new Date(),
          },
        }
      );

      return {
        success: !probe.jenkins.detected,
        message: !probe.jenkins.detected
          ? 'Jenkins successfully uninstalled'
          : 'Warning: Jenkins components may still be detected',
        output: res.stdout + (res.stderr ? '\n' + res.stderr : ''),
      };
    }
  }
}

/**
 * Execute SonarQube management actions
 */
export async function executeSonarQubeAction(
  server: any,
  action: 'start' | 'stop' | 'restart' | 'install' | 'uninstall' | 'detect',
  options: { preserveData?: boolean; port?: number } = {}
): Promise<{ success: boolean; message: string; output: string }> {
  const port = options.port || 9000;

  const sStatus = (server.status || '').toLowerCase();
  const isStopped = sStatus.includes('stop') || sStatus === 'offline';
  if (isStopped && action !== 'detect') {
    return {
      success: false,
      message: `Cannot execute "${action}" on "${server.name}" because the server is currently STOPPED. Please start the host server first.`,
      output: `Server status is "${server.status}". Host must be running to execute commands via SSH.`,
    };
  }

  switch (action) {
    case 'detect': {
      const probe = await probeDevopsTools(server);
      await Server.updateOne(
        { _id: server._id },
        { $set: { sonarqube: { ...probe.sonarqube, lastSyncedAt: new Date() } } }
      );
      return {
        success: true,
        message: probe.sonarqube.detected
          ? `SonarQube detected: ${probe.sonarqube.version || 'Community'} (${probe.sonarqube.status}) on port ${probe.sonarqube.port}`
          : 'SonarQube is not installed on this server',
        output: JSON.stringify(probe.sonarqube, null, 2),
      };
    }

    case 'start': {
      const cmd = `
if command -v docker >/dev/null 2>&1 && (docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q 'sonarqube'); then
  docker start sonarqube 2>/dev/null || sudo -n docker start sonarqube
elif systemctl list-unit-files 2>/dev/null | grep -qE 'sonar(qube)?\\.service'; then
  sudo systemctl start sonar 2>/dev/null || sudo systemctl start sonarqube
else
  echo "NO_SONAR_INSTANCE"
  exit 1
fi
      `;
      const res = await executeSSH(server, cmd, 20000);
      const probe = await probeDevopsTools(server);
      await Server.updateOne(
        { _id: server._id },
        { $set: { 'sonarqube.status': probe.sonarqube.status, 'sonarqube.lastSyncedAt': new Date() } }
      );
      return {
        success: probe.sonarqube.status === 'running',
        message: probe.sonarqube.status === 'running' ? 'SonarQube started successfully' : 'Failed to start SonarQube',
        output: res.stdout + (res.stderr ? '\n' + res.stderr : ''),
      };
    }

    case 'stop': {
      const cmd = `
if command -v docker >/dev/null 2>&1 && (docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q 'sonarqube'); then
  docker stop sonarqube 2>/dev/null || sudo -n docker stop sonarqube
elif systemctl list-unit-files 2>/dev/null | grep -qE 'sonar(qube)?\\.service'; then
  sudo systemctl stop sonar 2>/dev/null || sudo systemctl stop sonarqube
fi
      `;
      const res = await executeSSH(server, cmd, 20000);
      await Server.updateOne(
        { _id: server._id },
        { $set: { 'sonarqube.status': 'stopped', 'sonarqube.lastSyncedAt': new Date() } }
      );
      return { success: true, message: 'SonarQube stopped successfully', output: res.stdout };
    }

    case 'restart': {
      const cmd = `
if command -v docker >/dev/null 2>&1 && (docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q 'sonarqube'); then
  docker restart sonarqube 2>/dev/null || sudo -n docker restart sonarqube
elif systemctl list-unit-files 2>/dev/null | grep -qE 'sonar(qube)?\\.service'; then
  sudo systemctl restart sonar 2>/dev/null || sudo systemctl restart sonarqube
fi
      `;
      const res = await executeSSH(server, cmd, 25000);
      const probe = await probeDevopsTools(server);
      await Server.updateOne(
        { _id: server._id },
        { $set: { 'sonarqube.status': probe.sonarqube.status, 'sonarqube.lastSyncedAt': new Date() } }
      );
      return {
        success: probe.sonarqube.status === 'running',
        message: probe.sonarqube.status === 'running' ? 'SonarQube restarted successfully' : 'Failed to restart SonarQube',
        output: res.stdout + (res.stderr ? '\n' + res.stderr : ''),
      };
    }

    case 'install': {
      // 1. Verify Docker is available
      const checkDocker = await executeSSH(server, `command -v docker >/dev/null 2>&1 && echo "DOCKER_OK" || echo "NO_DOCKER"`);
      if (!checkDocker.stdout.includes('DOCKER_OK')) {
        return {
          success: false,
          message: 'Docker is required to install SonarQube. Please install Docker first from the Docker module.',
          output: 'Docker binary not found on host',
        };
      }

      // 2. Configure kernel sysctl for Elasticsearch and run official sonarqube container
      const installScript = `
set -e
echo "Configuring kernel sysctl parameters for SonarQube Elasticsearch..."
sudo sysctl -w vm.max_map_count=524288 || true
sudo sysctl -w fs.file-max=131072 || true
echo "vm.max_map_count=524288" | sudo tee /etc/sysctl.d/99-sonarqube.conf > /dev/null
echo "fs.file-max=131072" | sudo tee -a /etc/sysctl.d/99-sonarqube.conf > /dev/null

DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1 && sudo -n docker ps >/dev/null 2>&1; then
  DOCKER_CMD="sudo -n docker"
fi

if $DOCKER_CMD ps -a --format '{{.Names}}' 2>/dev/null | grep -q '^sonarqube$'; then
  echo "Existing SonarQube container found. Starting it..."
  $DOCKER_CMD start sonarqube
else
  echo "Deploying SonarQube Community container on port ${port}..."
  $DOCKER_CMD run -d \\
    --name sonarqube \\
    -p ${port}:9000 \\
    --restart always \\
    -v sonarqube_data:/opt/sonarqube/data \\
    -v sonarqube_extensions:/opt/sonarqube/extensions \\
    -v sonarqube_logs:/opt/sonarqube/logs \\
    sonarqube:community
fi

sleep 5
$DOCKER_CMD ps --filter "name=sonarqube"
      `;

      const res = await executeSSH(server, installScript, 120000);
      const probe = await probeDevopsTools(server);
      await Server.updateOne(
        { _id: server._id },
        { $set: { sonarqube: { ...probe.sonarqube, lastSyncedAt: new Date() } } }
      );

      return {
        success: probe.sonarqube.detected,
        message: probe.sonarqube.detected
          ? `SonarQube installed and starting on port ${probe.sonarqube.port}`
          : `Installation encountered an issue: ${res.stderr || res.stdout}`,
        output: res.stdout + (res.stderr ? '\n' + res.stderr : ''),
      };
    }

    case 'uninstall': {
      const preserve = options.preserveData !== false;
      const uninstallScript = `
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1 && sudo -n docker ps >/dev/null 2>&1; then
  DOCKER_CMD="sudo -n docker"
fi

if $DOCKER_CMD ps -a --format '{{.Names}}' 2>/dev/null | grep -q '^sonarqube$'; then
  echo "Stopping and removing SonarQube container..."
  $DOCKER_CMD stop sonarqube 2>/dev/null || true
  $DOCKER_CMD rm sonarqube 2>/dev/null || true
fi

${!preserve
          ? `echo "Purging persistent Docker volumes..."
       $DOCKER_CMD volume rm sonarqube_data sonarqube_extensions sonarqube_logs 2>/dev/null || true`
          : `echo "Persistent volumes sonarqube_data preserved."`
        }

if systemctl list-unit-files 2>/dev/null | grep -qE 'sonar(qube)?\\.service'; then
  sudo systemctl stop sonar 2>/dev/null || sudo systemctl stop sonarqube 2>/dev/null || true
  sudo rm -f /etc/systemd/system/sonar.service /etc/systemd/system/sonarqube.service
fi
      `;

      const res = await executeSSH(server, uninstallScript, 60000);
      const probe = await probeDevopsTools(server);
      await Server.updateOne(
        { _id: server._id },
        { $set: { sonarqube: { ...probe.sonarqube, lastSyncedAt: new Date() } } }
      );

      return {
        success: !probe.sonarqube.detected,
        message: !probe.sonarqube.detected
          ? `SonarQube uninstalled successfully ${preserve ? '(data volumes preserved)' : '(data volumes purged)'}`
          : 'Warning: SonarQube components may still be active',
        output: res.stdout + (res.stderr ? '\n' + res.stderr : ''),
      };
    }
  }
}

/**
 * Execute Trivy management actions & vulnerability scans
 */
export async function executeTrivyAction(
  server: any,
  action: 'install' | 'uninstall' | 'scan_image' | 'scan_fs' | 'version' | 'detect',
  options: { target?: string; severity?: string } = {}
): Promise<{ success: boolean; message: string; output: string; scanResult?: any }> {
  const sStatus = (server.status || '').toLowerCase();
  const isStopped = sStatus.includes('stop') || sStatus === 'offline';
  if (isStopped && action !== 'detect') {
    return {
      success: false,
      message: `Cannot execute Trivy "${action}" on "${server.name}" because the server is currently STOPPED. Please start the host server first.`,
      output: `Server status is "${server.status}". Host must be running to execute Trivy via SSH.`,
    };
  }
  switch (action) {
    case 'detect':
    case 'version': {
      const probe = await probeDevopsTools(server);
      await Server.updateOne(
        { _id: server._id },
        { $set: { trivy: { ...probe.trivy, lastSyncedAt: new Date() } } }
      );
      return {
        success: probe.trivy.detected,
        message: probe.trivy.detected
          ? `Trivy installed: ${probe.trivy.version} (${probe.trivy.installMethod})`
          : 'Trivy is not installed on this server',
        output: JSON.stringify(probe.trivy, null, 2),
      };
    }

    case 'install': {
      // 1. Check if already installed
      const check = await executeSSH(server, `(command -v trivy || [ -x /usr/local/bin/trivy ] || [ -x /usr/bin/trivy ]) >/dev/null 2>&1 && echo "ALREADY_INSTALLED" || echo "MISSING"`);
      if (check.stdout.includes('ALREADY_INSTALLED')) {
        return { success: true, message: 'Trivy is already installed on this server', output: check.stdout };
      }

      // 2. Install Trivy via official repository with dual automatic fallbacks
      const installScript = `
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

echo "Installing prerequisites..."
sudo apt-get update -y || true
sudo apt-get install -y wget apt-transport-https gnupg lsb-release curl

INSTALLED=0

# Method A: Official Aqua Security debian repository
sudo mkdir -p /etc/apt/keyrings
sudo chmod 755 /etc/apt/keyrings
if wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor --batch --yes | sudo tee /etc/apt/keyrings/trivy.gpg > /dev/null; then
  sudo chmod 644 /etc/apt/keyrings/trivy.gpg
  CODENAME=$(lsb_release -sc 2>/dev/null || echo 'noble')
  echo "deb [signed-by=/etc/apt/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb \${CODENAME} main" | sudo tee /etc/apt/sources.list.d/trivy.list > /dev/null
  if sudo apt-get update -y && sudo apt-get install -y trivy; then
    echo "Trivy installed successfully via apt repository."
    INSTALLED=1
  fi
fi

# Method B: Official Aqua automatic installer script fallback
if [ "$INSTALLED" -eq 0 ] && ! command -v trivy >/dev/null 2>&1; then
  echo "Trying Aqua official installation script..."
  if curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin; then
    echo "Trivy installed successfully via official script."
    sudo ln -sf /usr/local/bin/trivy /usr/bin/trivy 2>/dev/null || true
    INSTALLED=1
  fi
fi

# Method C: Direct binary release fallback
if [ "$INSTALLED" -eq 0 ] && ! command -v trivy >/dev/null 2>&1; then
  echo "Apt repository failed, falling back to direct binary release installation..."
  ARCH=$(uname -m)
  [ "$ARCH" = "x86_64" ] && TRIVY_ARCH="64bit" || TRIVY_ARCH="ARM64"
  wget -q https://github.com/aquasecurity/trivy/releases/download/v0.71.2/trivy_0.71.2_Linux-\${TRIVY_ARCH}.tar.gz -O /tmp/trivy.tar.gz || \
  wget -q https://github.com/aquasecurity/trivy/releases/download/v0.59.1/trivy_0.59.1_Linux-\${TRIVY_ARCH}.tar.gz -O /tmp/trivy.tar.gz
  sudo tar -xzf /tmp/trivy.tar.gz -C /usr/local/bin trivy
  sudo chmod +x /usr/local/bin/trivy
  sudo ln -sf /usr/local/bin/trivy /usr/bin/trivy 2>/dev/null || true
  rm -f /tmp/trivy.tar.gz
fi

which trivy || /usr/local/bin/trivy --version
      `;

      const res = await executeSSH(server, installScript, 180000); // 3 minute timeout
      const probe = await probeDevopsTools(server);
      await updateDevopsMetadata(
        server._id,
        { trivy: { ...probe.trivy, lastSyncedAt: new Date() } }
      );

      return {
        success: probe.trivy.detected,
        message: probe.trivy.detected
          ? `Trivy installed successfully (${probe.trivy.version})`
          : `Installation failed: ${res.stderr || res.stdout}`,
        output: res.stdout + (res.stderr ? '\n' + res.stderr : ''),
      };
    }

    case 'uninstall': {
      const uninstallScript = `
sudo apt-get remove -y trivy 2>/dev/null || true
sudo rm -f /usr/local/bin/trivy /usr/bin/trivy /etc/apt/sources.list.d/trivy.list /etc/apt/keyrings/trivy.gpg /usr/share/keyrings/trivy.gpg
echo "Trivy CLI removed successfully."
      `;
      const res = await executeSSH(server, uninstallScript, 30000);
      const probe = await probeDevopsTools(server);
      await updateDevopsMetadata(
        server._id,
        { trivy: { ...probe.trivy, lastSyncedAt: new Date() } }
      );

      return {
        success: !probe.trivy.detected,
        message: !probe.trivy.detected ? 'Trivy uninstalled successfully' : 'Warning: Trivy binary still exists',
        output: res.stdout,
      };
    }

    case 'scan_image': {
      const targetImage = (options.target || '').trim();
      if (!targetImage) {
        return { success: false, message: 'Target container image name is required (e.g. nginx:latest, alpine:3.18)', output: '' };
      }

      // Check trivy binary
      const probe = await probeDevopsTools(server);
      if (!probe.trivy.detected) {
        return { success: false, message: 'Trivy is not installed on this server. Please install Trivy first.', output: '' };
      }

      const scanCmd = `trivy image --quiet --format json ${targetImage}`;
      const startTime = Date.now();
      const res = await executeSSH(server, scanCmd, 90000); // 90s for image vulnerability download & scan
      const durationMs = Date.now() - startTime;

      let summary = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0, total: 0 };
      const vulns: ITrivyVulnerability[] = [];

      try {
        const json = JSON.parse(res.stdout);
        const results = json.Results || [];
        for (const r of results) {
          const list = r.Vulnerabilities || [];
          for (const v of list) {
            const sev = (v.Severity || 'UNKNOWN').toUpperCase();
            if (sev === 'CRITICAL') summary.critical++;
            else if (sev === 'HIGH') summary.high++;
            else if (sev === 'MEDIUM') summary.medium++;
            else if (sev === 'LOW') summary.low++;
            else summary.unknown++;
            summary.total++;

            vulns.push({
              vulnerabilityId: v.VulnerabilityID || 'N/A',
              pkgName: v.PkgName || 'N/A',
              installedVersion: v.InstalledVersion || '',
              fixedVersion: v.FixedVersion || 'None',
              severity: sev as any,
              title: v.Title || v.PkgName || '',
              description: v.Description || '',
              primaryUrl: v.PrimaryURL || '',
            });
          }
        }
      } catch (jsonErr: any) {
        // Output might be text or failed
      }

      // Persist in TrivyScanResult collection
      const hostIp = server.publicIp || server.host || server.privateIp;
      const scanDoc = await TrivyScanResult.create({
        serverId: String(server._id),
        serverName: server.name,
        serverHost: hostIp,
        scanType: 'image',
        target: targetImage,
        status: res.code === 0 ? 'SUCCESS' : 'FAILED',
        summary,
        vulnerabilities: vulns.slice(0, 200), // Cap at top 200 vulnerabilities
        rawOutput: res.stdout.slice(0, 5000),
        durationMs,
        scannedAt: new Date(),
      });

      // Update server summary
      await Server.updateOne(
        { _id: server._id },
        {
          $set: {
            'trivy.lastScanAt': new Date(),
            'trivy.lastScanTarget': targetImage,
            'trivy.lastScanSummary': summary,
          },
        }
      );

      return {
        success: true,
        message: `Scanned image "${targetImage}": Found ${summary.total} vulnerabilities (${summary.critical} Critical, ${summary.high} High)`,
        output: res.stdout,
        scanResult: scanDoc,
      };
    }

    case 'scan_fs': {
      const targetPath = (options.target || '/var/www').trim();
      const probe = await probeDevopsTools(server);
      if (!probe.trivy.detected) {
        return { success: false, message: 'Trivy is not installed on this server. Please install Trivy first.', output: '' };
      }

      const scanCmd = `trivy fs --quiet --format json ${targetPath}`;
      const startTime = Date.now();
      const res = await executeSSH(server, scanCmd, 90000);
      const durationMs = Date.now() - startTime;

      let summary = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0, total: 0 };
      const vulns: ITrivyVulnerability[] = [];

      try {
        const json = JSON.parse(res.stdout);
        const results = json.Results || [];
        for (const r of results) {
          const list = r.Vulnerabilities || [];
          for (const v of list) {
            const sev = (v.Severity || 'UNKNOWN').toUpperCase();
            if (sev === 'CRITICAL') summary.critical++;
            else if (sev === 'HIGH') summary.high++;
            else if (sev === 'MEDIUM') summary.medium++;
            else if (sev === 'LOW') summary.low++;
            else summary.unknown++;
            summary.total++;

            vulns.push({
              vulnerabilityId: v.VulnerabilityID || 'N/A',
              pkgName: v.PkgName || 'N/A',
              installedVersion: v.InstalledVersion || '',
              fixedVersion: v.FixedVersion || 'None',
              severity: sev as any,
              title: v.Title || v.PkgName || '',
              description: v.Description || '',
              primaryUrl: v.PrimaryURL || '',
            });
          }
        }
      } catch { }

      const hostIp = server.publicIp || server.host || server.privateIp;
      const scanDoc = await TrivyScanResult.create({
        serverId: String(server._id),
        serverName: server.name,
        serverHost: hostIp,
        scanType: 'fs',
        target: targetPath,
        status: res.code === 0 ? 'SUCCESS' : 'FAILED',
        summary,
        vulnerabilities: vulns.slice(0, 200),
        rawOutput: res.stdout.slice(0, 5000),
        durationMs,
        scannedAt: new Date(),
      });

      await Server.updateOne(
        { _id: server._id },
        {
          $set: {
            'trivy.lastScanAt': new Date(),
            'trivy.lastScanTarget': targetPath,
            'trivy.lastScanSummary': summary,
          },
        }
      );

      return {
        success: true,
        message: `Scanned path "${targetPath}": Found ${summary.total} vulnerabilities (${summary.critical} Critical, ${summary.high} High)`,
        output: res.stdout,
        scanResult: scanDoc,
      };
    }
  }
}
