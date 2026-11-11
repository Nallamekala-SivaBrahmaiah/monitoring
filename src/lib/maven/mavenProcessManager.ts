import path from 'path';
import fs from 'fs';
import net from 'net';
import http from 'http';
import { spawn, execSync, ChildProcess } from 'child_process';
import connectToDatabase from '@/lib/mongodb';
import MavenApp, { IMavenApp, IMavenAppData } from '@/models/MavenApp';
import MavenProject from '@/models/MavenProject';
import MavenBuild from '@/models/MavenBuild';

interface AppProcessHandle {
  process: ChildProcess;
  pid: number;
  logBuffer: string[];
  startTime: Date;
  port: number;
}

// In-memory active process registry
// Global to survive hot-reloads in Next.js development
declare global {
  // eslint-disable-next-line no-var
  var __mavenActiveApps: Map<string, AppProcessHandle> | undefined;
}

if (!global.__mavenActiveApps) {
  global.__mavenActiveApps = new Map<string, AppProcessHandle>();
}

const activeApps = global.__mavenActiveApps;

/**
 * Locate best available Java binary on host
 */
export function resolveJavaBinary(jdkVersion?: string): string {
  const candidates = [
    'C:\\Program Files\\Java\\jdk-23\\bin\\java.exe',
    'C:\\Program Files\\Java\\latest\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-11\\bin\\java.exe',
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  if (process.env.JAVA_HOME) {
    const javaInHome = path.join(
      process.env.JAVA_HOME,
      'bin',
      process.platform === 'win32' ? 'java.exe' : 'java'
    );
    if (fs.existsSync(javaInHome)) {
      return javaInHome;
    }
  }

  return process.platform === 'win32' ? 'java.exe' : 'java';
}

/**
 * Inspect a JAR or WAR file to determine if it is an executable artifact,
 * whether it's Spring Boot, and detect its Main-Class or configured port.
 */
export async function detectExecutableArtifact(
  artifactFullPath: string,
  workspaceDir?: string
): Promise<{
  isExecutable: boolean;
  framework: string;
  mainClass?: string;
  startClass?: string;
  springBootVersion?: string;
  detectedPort?: number;
  details?: string;
  error?: string;
}> {
  if (!fs.existsSync(artifactFullPath)) {
    return {
      isExecutable: false,
      framework: 'Unknown',
      error: `Artifact file not found at: ${artifactFullPath}`,
    };
  }

  const ext = path.extname(artifactFullPath).toLowerCase();
  if (ext !== '.jar' && ext !== '.war') {
    return {
      isExecutable: false,
      framework: 'Unknown',
      error: `File is neither a .jar nor a .war file (${ext})`,
    };
  }

  // 1. Check for Manifest inside the archive
  let manifestContent = '';
  try {
    // Modern Windows, Linux, and macOS have tar built-in
    manifestContent = execSync(`tar -xOf "${artifactFullPath}" META-INF/MANIFEST.MF`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch {
    // If tar fails, try reading raw bytes looking for manifest tokens
    try {
      const fd = fs.openSync(artifactFullPath, 'r');
      const buffer = Buffer.alloc(Math.min(65536, fs.statSync(artifactFullPath).size));
      fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);
      manifestContent = buffer.toString('utf-8');
    } catch {
      manifestContent = '';
    }
  }

  // 2. Parse Manifest lines
  let mainClass: string | undefined;
  let startClass: string | undefined;
  let springBootVersion: string | undefined;
  let springBootClasses = false;

  const lines = manifestContent.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('Main-Class:')) {
      mainClass = line.replace('Main-Class:', '').trim();
    } else if (line.startsWith('Start-Class:')) {
      startClass = line.replace('Start-Class:', '').trim();
    } else if (line.startsWith('Spring-Boot-Version:')) {
      springBootVersion = line.replace('Spring-Boot-Version:', '').trim();
    } else if (line.startsWith('Spring-Boot-Classes:')) {
      springBootClasses = true;
    }
  }

  // 3. Scan workspace resources for configured port (application.properties or application.yml)
  let detectedPort: number | undefined;
  if (workspaceDir && fs.existsSync(workspaceDir)) {
    const candidateFiles = [
      path.join(workspaceDir, 'src', 'main', 'resources', 'application.properties'),
      path.join(workspaceDir, 'src', 'main', 'resources', 'application.yml'),
      path.join(workspaceDir, 'src', 'main', 'resources', 'application.yaml'),
      path.join(workspaceDir, 'config', 'application.properties'),
    ];

    for (const file of candidateFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const propMatch = content.match(/server\.port\s*=\s*(\d+)/i);
          if (propMatch && propMatch[1]) {
            detectedPort = parseInt(propMatch[1], 10);
            break;
          }
          const ymlMatch = content.match(/server:\s*(?:\r?\n\s+)?port:\s*(\d+)/i);
          if (ymlMatch && ymlMatch[1]) {
            detectedPort = parseInt(ymlMatch[1], 10);
            break;
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  }

  // 4. Classify artifact executable status
  const isSpringBoot =
    Boolean(springBootVersion) ||
    springBootClasses ||
    (mainClass && mainClass.includes('springframework.boot')) ||
    Boolean(startClass);

  if (isSpringBoot) {
    return {
      isExecutable: true,
      framework: springBootVersion ? `Spring Boot ${springBootVersion}` : 'Spring Boot',
      mainClass: startClass || mainClass,
      startClass,
      springBootVersion,
      detectedPort: detectedPort || 8080,
      details: 'Executable Spring Boot Fat JAR with embedded servlet container (Tomcat/Jetty)',
    };
  }

  if (mainClass) {
    return {
      isExecutable: true,
      framework: 'Standalone Java',
      mainClass,
      detectedPort: detectedPort || 8080,
      details: `Executable JAR with Main-Class: ${mainClass}`,
    };
  }

  if (ext === '.war') {
    return {
      isExecutable: false,
      framework: 'Servlet WAR',
      detectedPort: detectedPort || 8080,
      details:
        'Standard Servlet Web Archive. Requires an external servlet container (e.g. Apache Tomcat).',
    };
  }

  return {
    isExecutable: false,
    framework: 'Standard Library JAR',
    details: 'Library JAR archive without an entry point Main-Class in META-INF/MANIFEST.MF.',
  };
}

/**
 * Check if a network port is available or already in use
 */
export async function checkPortAvailability(
  port: number,
  excludeAppId?: string
): Promise<{ available: boolean; error?: string }> {
  if (port < 1024 || port > 65535) {
    return {
      available: false,
      error: `Port ${port} is outside the valid non-privileged range (1024-65535).`,
    };
  }

  // 1. Check in MongoDB for other actively running apps on this port
  await connectToDatabase();
  const query: any = {
    port,
    status: { $in: ['STARTING', 'RUNNING'] },
  };
  if (excludeAppId) {
    query._id = { $ne: excludeAppId };
  }
  const existingApp = await MavenApp.findOne(query);
  if (existingApp) {
    return {
      available: false,
      error: `Port ${port} is currently reserved by running application "${existingApp.projectName}".`,
    };
  }

  // 2. Test actual host socket binding
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve({
          available: false,
          error: `Port ${port} is already bound and in use on this machine by another process.`,
        });
      } else {
        resolve({
          available: false,
          error: `Unable to bind to port ${port}: ${err.message}`,
        });
      }
    });

    server.once('listening', () => {
      server.close(() => {
        resolve({ available: true });
      });
    });

    server.listen(port, '0.0.0.0');
  });
}

/**
 * Find the next available TCP port starting from a preferred port
 */
export async function findNextAvailablePort(preferredPort: number = 8080): Promise<number> {
  let port = preferredPort;
  for (let i = 0; i < 50; i++) {
    const check = await checkPortAvailability(port);
    if (check.available) {
      return port;
    }
    port++;
  }
  return preferredPort;
}

export interface StartMavenAppParams {
  projectId?: string;
  projectName?: string;
  buildId?: string;
  artifactName?: string;
  customPort?: number;
  jvmArgs?: string;
  appArgs?: string;
  envVariables?: { key: string; value: string }[];
}

/**
 * Start a Java application from a built Maven artifact
 */
export async function startMavenApplication(params: StartMavenAppParams): Promise<IMavenApp> {
  await connectToDatabase();

  // 1. Resolve project and workspace
  let project: any = null;
  let workspacePath = '';

  if (params.projectId) {
    project = await MavenProject.findById(params.projectId);
    if (project) {
      workspacePath = path.join(process.cwd(), '.maven-workspaces', String(project._id));
    }
  }

  // 2. Resolve build & artifact
  let build: any = null;
  if (params.buildId) {
    build = await MavenBuild.findById(params.buildId);
    if (build && build.workspacePath) {
      workspacePath = build.workspacePath;
    }
  }

  if (!workspacePath) {
    // Check fallback for any active workspace
    const baseWorkspaces = path.join(process.cwd(), '.maven-workspaces');
    if (fs.existsSync(baseWorkspaces)) {
      const dirs = fs.readdirSync(baseWorkspaces);
      if (dirs.length > 0) {
        workspacePath = path.join(baseWorkspaces, dirs[0]);
      }
    }
  }

  if (!workspacePath || !fs.existsSync(workspacePath)) {
    throw new Error('Project workspace directory not found. Please build the project first.');
  }

  // Locate the artifact file
  let artifactFile = params.artifactName;
  let artifactFullPath = '';

  if (artifactFile) {
    // Check target folder
    const targetPath = path.join(workspacePath, 'target', artifactFile);
    if (fs.existsSync(targetPath)) {
      artifactFullPath = targetPath;
    } else {
      const directPath = path.join(workspacePath, artifactFile);
      if (fs.existsSync(directPath)) {
        artifactFullPath = directPath;
      }
    }
  }

  // If no artifact file specified or found, auto-detect from target directory
  if (!artifactFullPath) {
    const targetDir = path.join(workspacePath, 'target');
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      // Prefer non-original, non-sources jar
      const candidate = files.find(
        (f) =>
          f.endsWith('.jar') &&
          !f.endsWith('.original') &&
          !f.includes('-sources') &&
          !f.includes('-javadoc')
      );
      if (candidate) {
        artifactFile = candidate;
        artifactFullPath = path.join(targetDir, candidate);
      }
    }
  }

  if (!artifactFullPath || !fs.existsSync(artifactFullPath)) {
    throw new Error(
      `Executable artifact (.jar/.war) could not be found in workspace. Build the project first.`
    );
  }

  // 3. Inspect artifact for executability
  const detection = await detectExecutableArtifact(artifactFullPath, workspacePath);
  if (!detection.isExecutable) {
    throw new Error(
      `The artifact "${artifactFile}" is not an executable application. ${detection.details || ''}`
    );
  }

  // 4. Determine target port
  let targetPort = params.customPort || detection.detectedPort || 8080;
  const portCheck = await checkPortAvailability(targetPort);
  if (!portCheck.available) {
    if (params.customPort) {
      throw new Error(
        `Port conflict: ${portCheck.error} Please choose a different port.`
      );
    } else {
      // Auto-assign next free port
      targetPort = await findNextAvailablePort(targetPort);
    }
  }

  // 5. Resolve Java binary
  const javaBin = resolveJavaBinary(project?.jdkVersion);

  // 6. Build command line tokens
  const jvmArgsList = (params.jvmArgs || '').trim().split(/\s+/).filter(Boolean);
  const customAppArgs = (params.appArgs || '').trim().split(/\s+/).filter(Boolean);

  const commandTokens = [
    ...jvmArgsList,
    '-jar',
    artifactFullPath,
    `--server.port=${targetPort}`,
    ...customAppArgs,
  ];

  const fullRunCommand = `"${javaBin}" ${commandTokens.join(' ')}`;
  const projectName = params.projectName || project?.name || build?.projectName || path.basename(workspacePath);

  // 7. Check if an app record already exists for this project/artifact, or create new
  let app = await MavenApp.findOne({
    workspacePath,
    artifactName: artifactFile,
  });

  const appUrl = `http://localhost:${targetPort}`;
  const now = new Date();

  if (!app) {
    app = new MavenApp({
      projectId: project?._id,
      projectName,
      buildId: build?._id,
      artifactName: artifactFile,
      artifactPath: path.relative(workspacePath, artifactFullPath).replace(/\\/g, '/'),
      workspacePath,
      port: targetPort,
      customPort: params.customPort || targetPort,
      appUrl,
      proxyUrl: `/api/maven/apps/pending/proxy`,
      runCommand: fullRunCommand,
      jvmArgs: params.jvmArgs || '',
      appArgs: params.appArgs || '',
      envVariables: params.envVariables || [],
      logs: `[+] [${now.toISOString()}] Initializing application runtime...\n`,
      isExecutable: true,
      framework: detection.framework,
      mainClass: detection.mainClass,
      status: 'STARTING',
      healthStatus: 'STARTING',
      startTime: now,
    });
    await app.save();
    app.proxyUrl = `/api/maven/apps/${app._id}/proxy`;
    await app.save();
  } else {
    // If previous process is still in memory, kill it first
    if (app.pid) {
      await stopMavenApplication(String(app._id));
    }
    app.projectName = projectName;
    app.port = targetPort;
    app.customPort = params.customPort || targetPort;
    app.appUrl = appUrl;
    app.proxyUrl = `/api/maven/apps/${app._id}/proxy`;
    app.runCommand = fullRunCommand;
    app.jvmArgs = params.jvmArgs || '';
    app.appArgs = params.appArgs || '';
    app.framework = detection.framework;
    app.mainClass = detection.mainClass;
    app.status = 'STARTING';
    app.healthStatus = 'STARTING';
    app.startTime = now;
    app.stopTime = null;
    app.errorMessage = null;
    app.logs = `[+] [${now.toISOString()}] Starting application "${projectName}" on port ${targetPort}...\n`;
    await app.save();
  }

  // 8. Spawn child process
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (params.envVariables && Array.isArray(params.envVariables)) {
    for (const ev of params.envVariables) {
      if (ev.key) env[ev.key] = ev.value;
    }
  }

  const appIdStr = String(app._id);
  const child = spawn(javaBin, commandTokens, {
    cwd: workspacePath,
    env,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const pid = child.pid;
  if (!pid) {
    app.status = 'FAILED';
    app.errorMessage = 'Failed to spawn Java child process.';
    await app.save();
    throw new Error('Failed to spawn Java child process.');
  }

  app.pid = pid;
  await app.save();

  // Register in memory handle
  const handle: AppProcessHandle = {
    process: child,
    pid,
    logBuffer: [`[+] Process spawned with PID ${pid}\n`],
    startTime: now,
    port: targetPort,
  };
  activeApps.set(appIdStr, handle);

  // 9. Stream stdout and stderr
  const appendLog = (chunk: string) => {
    handle.logBuffer.push(chunk);
    if (handle.logBuffer.length > 3000) {
      handle.logBuffer.splice(0, 500); // keep ring buffer capped
    }

    // Check for startup indicators
    if (
      chunk.includes('Tomcat started on port') ||
      chunk.includes('Started PetClinicApplication') ||
      chunk.includes('Started ') ||
      chunk.includes('Netty started on port') ||
      chunk.includes('Jetty started on port')
    ) {
      MavenApp.findByIdAndUpdate(appIdStr, {
        $set: {
          status: 'RUNNING',
          healthStatus: 'HEALTHY',
          errorMessage: null,
        },
      }).catch(console.error);
    }

    // Check for failure indicators
    if (
      chunk.includes('APPLICATION FAILED TO START') ||
      chunk.includes('Port ') && chunk.includes('already in use') ||
      chunk.includes('Address already in use')
    ) {
      MavenApp.findByIdAndUpdate(appIdStr, {
        $set: {
          status: 'FAILED',
          healthStatus: 'UNHEALTHY',
          errorMessage: chunk.substring(0, 300),
        },
      }).catch(console.error);
    }
  };

  child.stdout?.on('data', (d) => appendLog(d.toString()));
  child.stderr?.on('data', (d) => appendLog(d.toString()));

  child.on('error', (err) => {
    appendLog(`[ERROR] Process error: ${err.message}\n`);
    MavenApp.findByIdAndUpdate(appIdStr, {
      $set: {
        status: 'FAILED',
        healthStatus: 'UNHEALTHY',
        errorMessage: err.message,
      },
    }).catch(console.error);
  });

  child.on('exit', (code, signal) => {
    const exitMsg = `[!] Process exited with code: ${code}, signal: ${signal}\n`;
    appendLog(exitMsg);
    activeApps.delete(appIdStr);

    MavenApp.findById(appIdStr).then((current) => {
      if (current && current.status !== 'STOPPED') {
        current.status = code === 0 ? 'STOPPED' : 'FAILED';
        current.healthStatus = 'UNHEALTHY';
        current.stopTime = new Date();
        current.pid = null;
        if (code !== 0 && !current.errorMessage) {
          current.errorMessage = `Process exited with code ${code}`;
        }
        current.logs = (current.logs || '') + '\n' + handle.logBuffer.join('');
        current.save().catch(console.error);
      }
    });
  });

  return app;
}

/**
 * Stop a running application process
 */
export async function stopMavenApplication(appId: string): Promise<IMavenApp> {
  await connectToDatabase();
  const app = await MavenApp.findById(appId);
  if (!app) {
    throw new Error(`Application ${appId} not found.`);
  }

  const handle = activeApps.get(appId);
  const targetPid = handle?.pid || app.pid;

  if (targetPid) {
    try {
      if (process.platform === 'win32') {
        // Force terminate process tree on Windows
        execSync(`taskkill /pid ${targetPid} /T /F`, { stdio: 'ignore' });
      } else {
        process.kill(targetPid, 'SIGTERM');
      }
    } catch {
      // Process may already have terminated
    }
  }

  if (handle?.process) {
    try {
      handle.process.kill();
    } catch {
      // Ignore
    }
  }

  activeApps.delete(appId);

  // Flush remaining logs
  if (handle?.logBuffer?.length) {
    app.logs = (app.logs || '') + '\n' + handle.logBuffer.join('');
  }

  const stopTime = new Date();
  app.status = 'STOPPED';
  app.healthStatus = 'UNKNOWN';
  app.stopTime = stopTime;
  app.pid = null;
  if (app.startTime) {
    app.uptimeSeconds = Math.round((stopTime.getTime() - new Date(app.startTime).getTime()) / 1000);
  }
  await app.save();

  return app;
}

/**
 * Synchronize all applications state with host OS processes.
 * Cleans up orphan processes after server restarts.
 */
export async function syncAllApplications(): Promise<IMavenAppData[]> {
  await connectToDatabase();

  const apps = await MavenApp.find();
  const synced: IMavenAppData[] = [];

  for (const app of apps) {
    if (app.status === 'RUNNING' || app.status === 'STARTING') {
      const handle = activeApps.get(String(app._id));
      const pid = handle?.pid || app.pid;

      let isAlive = false;
      if (pid) {
        try {
          if (process.platform === 'win32') {
            const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'ignore'],
            });
            isAlive = out.includes(String(pid));
          } else {
            // Unix test
            process.kill(pid, 0);
            isAlive = true;
          }
        } catch {
          isAlive = false;
        }
      }

      if (!isAlive) {
        app.status = 'STOPPED';
        app.healthStatus = 'UNHEALTHY';
        app.pid = null;
        app.stopTime = new Date();
        await app.save();
      } else {
        // Check socket responsiveness
        const pingSuccess = await pingHttpPort(app.port);
        if (pingSuccess && app.status === 'STARTING') {
          app.status = 'RUNNING';
          app.healthStatus = 'HEALTHY';
          await app.save();
        }
      }
    }

    synced.push(app.toObject() as unknown as IMavenAppData);
  }

  return synced;
}

/**
 * Simple HTTP ping to verify if application HTTP server is responding
 */
function pingHttpPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, { timeout: 1500 }, (res) => {
      resolve(Boolean(res.statusCode));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Retrieve aggregated startup and live runtime logs for an application
 */
export async function getApplicationLogs(appId: string): Promise<{
  logs: string;
  status: string;
  port: number;
  pid: number | null;
  appUrl: string;
  proxyUrl: string;
}> {
  await connectToDatabase();
  const app = await MavenApp.findById(appId);
  if (!app) {
    throw new Error('Application not found');
  }

  const handle = activeApps.get(appId);
  const liveLogs = handle ? handle.logBuffer.join('') : '';
  const fullLogs = (app.logs || '') + (liveLogs ? '\n' + liveLogs : '');

  return {
    logs: fullLogs,
    status: app.status,
    port: app.port,
    pid: handle?.pid ?? app.pid ?? null,
    appUrl: app.appUrl,
    proxyUrl: app.proxyUrl,
  };
}
