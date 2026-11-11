import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import connectToDatabase from '@/lib/mongodb';
import MavenBuild, { IMavenBuild, IMavenArtifact } from '@/models/MavenBuild';
import MavenProject, { IMavenProject } from '@/models/MavenProject';

const WORKSPACE_BASE = path.join(process.cwd(), '.maven-workspaces');
const activeProcesses = new Map<string, ChildProcess>();

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validates repository URL for security
 */
export function isValidGitUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://github.com/') ||
    trimmed.startsWith('https://gitlab.com/') ||
    trimmed.startsWith('https://bitbucket.org/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('git@')
  );
}

/**
 * Validates Maven command for security (disallowing shell injection)
 */
export function sanitizeMavenCommand(cmd: string): string {
  const trimmed = (cmd || 'mvn clean package').trim();
  // Disallow shell operators and chaining
  if (/[;&|`$><]/.test(trimmed)) {
    throw new Error('Invalid Maven command: shell operators and chaining are prohibited.');
  }

  // Ensure starts with mvn or clean/package/test
  const parts = trimmed.split(/\s+/);
  if (parts[0] !== 'mvn' && parts[0] !== 'mvnw') {
    return `mvn ${trimmed}`;
  }
  return trimmed;
}

/**
 * Locate best available Java Home on host
 */
function resolveJavaHome(jdkVersion?: string): string | undefined {
  const candidates = [
    'C:\\Program Files\\Java\\jdk-23',
    'C:\\Program Files\\Java\\latest',
    'C:\\Program Files\\Java\\jdk-21',
    'C:\\Program Files\\Java\\jdk-17',
    'C:\\Program Files\\Java\\jdk-11',
    process.env.JAVA_HOME,
  ];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return c;
    }
  }
  return process.env.JAVA_HOME;
}

/**
 * Locate best available Maven executable on host
 */
function resolveMavenBinary(workspaceDir: string, rootDir?: string): { cmd: string; isWrapper: boolean } {
  // 1. Prefer Maven Wrapper (mvnw.cmd on Windows, mvnw on Linux) when available
  const dirs = [workspaceDir];
  if (rootDir && rootDir !== workspaceDir) {
    dirs.push(rootDir);
  }

  for (const dir of dirs) {
    if (process.platform === 'win32') {
      const mvnwCmd = path.join(dir, 'mvnw.cmd');
      if (fs.existsSync(mvnwCmd)) {
        return { cmd: mvnwCmd, isWrapper: true };
      }
    } else {
      const mvnw = path.join(dir, 'mvnw');
      if (fs.existsSync(mvnw)) {
        try {
          fs.chmodSync(mvnw, 0o755);
        } catch {
          // Ignore chmod errors if permissions are restricted
        }
        return { cmd: mvnw, isWrapper: true };
      }
    }
  }

  // 2. Check known installed Maven installation path
  const knownMvn = 'C:\\Program Files\\apache-maven-3.9.9-bin\\apache-maven-3.9.9\\bin\\mvn.cmd';
  if (process.platform === 'win32' && fs.existsSync(knownMvn)) {
    return { cmd: knownMvn, isWrapper: false };
  }

  // 3. Check MAVEN_HOME or M2_HOME environment variables
  if (process.env.MAVEN_HOME) {
    const candidate = path.join(
      process.env.MAVEN_HOME,
      'bin',
      process.platform === 'win32' ? 'mvn.cmd' : 'mvn'
    );
    if (fs.existsSync(candidate)) {
      return { cmd: candidate, isWrapper: false };
    }
  }
  if (process.env.M2_HOME) {
    const candidate = path.join(
      process.env.M2_HOME,
      'bin',
      process.platform === 'win32' ? 'mvn.cmd' : 'mvn'
    );
    if (fs.existsSync(candidate)) {
      return { cmd: candidate, isWrapper: false };
    }
  }

  // 4. Support system-installed Maven as a fallback
  return { cmd: process.platform === 'win32' ? 'mvn.cmd' : 'mvn', isWrapper: false };
}

/**
 * Search workspace target directory recursively for compiled artifacts (.jar, .war)
 */
function scanForArtifacts(dir: string, baseWorkspace: string): IMavenArtifact[] {
  const artifacts: IMavenArtifact[] = [];

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Avoid scanning node_modules, .git, or embedded caches
          if (entry.name !== '.git' && entry.name !== 'node_modules') {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ext === '.jar' || ext === '.war') {
            // Filter out source/javadoc or tiny maven wrapper jars if standard target jars exist
            const lowerName = entry.name.toLowerCase();
            if (lowerName.includes('-sources') || lowerName.includes('-javadoc')) {
              continue;
            }

            const stats = fs.statSync(fullPath);
            const relPath = path.relative(baseWorkspace, fullPath).replace(/\\/g, '/');

            artifacts.push({
              name: entry.name,
              path: relPath,
              sizeBytes: stats.size,
              sizeFormatted: formatBytes(stats.size),
              extension: ext.replace('.', ''),
              createdAt: stats.mtime,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[MavenEngine] Artifact scan warning:', err);
    }
  }

  walk(dir);
  return artifacts;
}

/**
 * Main Build Execution Function
 */
export async function executeMavenBuild(buildId: string): Promise<void> {
  await connectToDatabase();

  const build = await MavenBuild.findById(buildId);
  if (!build) {
    console.error(`[MavenEngine] Build ${buildId} not found.`);
    return;
  }

  const startTime = new Date();
  build.status = 'RUNNING';
  build.startTime = startTime;
  build.logs = `[+] [${startTime.toISOString()}] Initializing autonomous Maven build #${build.buildNumber} for project "${build.projectName}"...\n`;
  await build.save();

  // Create isolated project workspace directory
  const projectKey = build.projectId ? String(build.projectId) : `adhoc-${build._id}`;
  const workspaceDir = path.join(WORKSPACE_BASE, projectKey);

  try {
    if (!fs.existsSync(WORKSPACE_BASE)) {
      fs.mkdirSync(WORKSPACE_BASE, { recursive: true });
    }
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    build.workspacePath = workspaceDir;

    // Load Project details for environment variables & settings if available
    let project: IMavenProject | null = null;
    if (build.projectId) {
      project = await MavenProject.findById(build.projectId);
    }

    // Step 1: Git Clone / Fetch
    build.logs += `[+] Target workspace: ${workspaceDir}\n`;
    build.logs += `[+] Syncing repository: ${build.repositoryUrl} (branch: ${build.branch})\n`;
    await build.save();

    const isGitRepo = fs.existsSync(path.join(workspaceDir, '.git'));
    if (!isGitRepo) {
      build.logs += `[+] Cloning remote repository into clean workspace...\n`;
      await runSubprocess(
        'git',
        ['clone', '--branch', build.branch, '--depth', '1', build.repositoryUrl, '.'],
        workspaceDir,
        (data) => {
          build.logs += data;
        }
      );
    } else {
      build.logs += `[+] Pulling latest branch revisions...\n`;
      try {
        await runSubprocess(
          'git',
          ['fetch', 'origin', build.branch],
          workspaceDir,
          (data) => {
            build.logs += data;
          }
        );
        await runSubprocess(
          'git',
          ['checkout', build.branch],
          workspaceDir,
          (data) => {
            build.logs += data;
          }
        );
        await runSubprocess(
          'git',
          ['reset', '--hard', `origin/${build.branch}`],
          workspaceDir,
          (data) => {
            build.logs += data;
          }
        );
      } catch (gitErr: any) {
        build.logs += `[!] Fast git fetch encountered error (${gitErr.message}). Re-cloning workspace...\n`;
        fs.rmSync(workspaceDir, { recursive: true, force: true });
        fs.mkdirSync(workspaceDir, { recursive: true });
        await runSubprocess(
          'git',
          ['clone', '--branch', build.branch, '--depth', '1', build.repositoryUrl, '.'],
          workspaceDir,
          (data) => {
            build.logs += data;
          }
        );
      }
    }

    // Step 2: Determine Working Folder (e.g. root or subfolder like backend/src)
    const effectiveProjectFolder = (build.projectFolder || '.').trim();
    const buildCwd =
      effectiveProjectFolder === '.' || effectiveProjectFolder === ''
        ? workspaceDir
        : path.join(workspaceDir, effectiveProjectFolder);

    if (!fs.existsSync(buildCwd)) {
      throw new Error(`Configured project folder "${effectiveProjectFolder}" does not exist in the repository.`);
    }

    // Step 3: Resolve Environment (JAVA_HOME, PATH, Env Vars)
    const javaHome = resolveJavaHome(project?.jdkVersion);
    const env: NodeJS.ProcessEnv = { ...process.env };

    if (javaHome) {
      env.JAVA_HOME = javaHome;
      const extraPaths = [path.join(javaHome, 'bin')];
      if (process.platform === 'win32') {
        extraPaths.push('C:\\Program Files\\apache-maven-3.9.9-bin\\apache-maven-3.9.9\\bin');
      }
      env.PATH = `${extraPaths.join(path.delimiter)}${path.delimiter}${env.PATH || ''}`;
      build.logs += `[+] Using JAVA_HOME: ${javaHome}\n`;
    }

    // Set MAVEN_BASEDIR to avoid mvn.cmd directory traversal permissions warnings on Windows
    env.MAVEN_BASEDIR = buildCwd;

    // Inject custom project environment variables & secrets
    if (project?.envVariables && Array.isArray(project.envVariables)) {
      for (const ev of project.envVariables) {
        if (ev.key && ev.value) {
          env[ev.key] = ev.value;
          build.logs += `[+] Set custom env var: ${ev.key}=${ev.isSecret ? '********' : ev.value}\n`;
        }
      }
    }

    // Step 4: Resolve Maven Executable
    const mavenBin = resolveMavenBinary(buildCwd, workspaceDir);
    build.logs += `[+] Selected Maven executable: ${mavenBin.cmd} (${mavenBin.isWrapper ? 'Maven Wrapper' : 'System Maven'})\n`;

    const sanitizedCmd = sanitizeMavenCommand(build.command);
    const cmdTokens = sanitizedCmd.split(/\s+/);
    // Remove leading 'mvn' or 'mvnw' since we supply the binary directly
    const goalsAndArgs = cmdTokens.filter(
      (tok, idx) => !(idx === 0 && (tok === 'mvn' || tok === 'mvnw'))
    );

    build.logs += `[+] Executing: ${mavenBin.cmd} ${goalsAndArgs.join(' ')}\n`;
    build.logs += `[+] Build started at ${new Date().toLocaleTimeString()}\n`;
    build.logs += `--------------------------------------------------------------------------------\n`;
    await build.save();

    // Step 5: Execute Build Process
    const exitCode = await runSubprocess(
      mavenBin.cmd,
      goalsAndArgs,
      buildCwd,
      async (chunk) => {
        build.logs += chunk;
      },
      env,
      build._id.toString()
    );

    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    build.endTime = endTime;
    build.durationSeconds = durationSeconds;

    if (exitCode === 0) {
      build.status = 'SUCCESS';
      build.logs += `\n--------------------------------------------------------------------------------\n`;
      build.logs += `[INFO] BUILD SUCCESS\n`;
      build.logs += `[INFO] Total time: ${durationSeconds} s\n`;
      build.logs += `[+] Scanning workspace for generated artifacts (.jar / .war)...\n`;

      // Scan target folder
      const targetDir = path.join(buildCwd, 'target');
      const artifacts = scanForArtifacts(targetDir, workspaceDir);
      build.artifacts = artifacts;

      if (artifacts.length > 0) {
        build.logs += `[+] Detected ${artifacts.length} build artifact(s):\n`;
        artifacts.forEach((a) => {
          build.logs += `    -> ${a.name} (${a.sizeFormatted})\n`;
        });
      } else {
        build.logs += `[!] Note: No .jar or .war files detected in target directory.\n`;
      }
    } else {
      build.status = 'FAILED';
      build.errorMessage = `Maven process exited with code ${exitCode}`;
      build.logs += `\n--------------------------------------------------------------------------------\n`;
      build.logs += `[ERROR] BUILD FAILED (exit code: ${exitCode})\n`;
    }

    await build.save();

    // Update Project Status
    if (project) {
      project.lastBuildStatus = build.status;
      project.lastBuildAt = endTime;
      project.lastBuildDuration = durationSeconds;
      project.totalBuilds = (project.totalBuilds || 0) + 1;
      await project.save();
    }
  } catch (err: any) {
    console.error('[MavenEngine] Build execution error:', err);
    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    build.status = 'FAILED';
    build.endTime = endTime;
    build.durationSeconds = durationSeconds;
    build.errorMessage = err.message || 'Build execution exception';
    build.logs += `\n[FATAL ERROR] ${err.message || 'An unexpected error occurred during build execution.'}\n`;
    await build.save();

    if (build.projectId) {
      await MavenProject.findByIdAndUpdate(build.projectId, {
        $set: {
          lastBuildStatus: 'FAILED',
          lastBuildAt: endTime,
          lastBuildDuration: durationSeconds,
        },
        $inc: { totalBuilds: 1 },
      });
    }
  } finally {
    activeProcesses.delete(buildId);
  }
}

/**
 * Runs a child process with streaming output capture and PID registration.
 * Correctly handles Windows CMD argument quoting and paths containing spaces,
 * while preserving clean standard argument array execution on Linux/macOS.
 */
function runSubprocess(
  cmd: string,
  args: string[],
  cwd: string,
  onData: (data: string) => void,
  env?: NodeJS.ProcessEnv,
  buildId?: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const isWin = process.platform === 'win32';
      const isBatch = isWin && /\.(cmd|bat)$/i.test(cmd);

      let executable: string;
      let spawnArgs: string[];
      let windowsVerbatim = false;

      if (isBatch) {
        // On Windows, .cmd and .bat files must be executed through cmd.exe.
        // We use cmd.exe /d /s /c call "<cmd>" arg1 arg2 with windowsVerbatimArguments: true.
        // The 'call' prefix ensures cmd.exe does not strip quotes from the executable path,
        // correctly handling paths with spaces (e.g. "C:\Program Files\...\mvn.cmd")
        // without triggering the "'C:\Program' is not recognized" failure.
        executable = process.env.ComSpec || 'cmd.exe';
        const formattedArgs = args.map((arg) => {
          if (arg.includes(' ') && !arg.startsWith('"') && !arg.endsWith('"')) {
            return `"${arg}"`;
          }
          return arg;
        });
        spawnArgs = ['/d', '/s', '/c', 'call', `"${cmd}"`, ...formattedArgs];
        windowsVerbatim = true;
      } else {
        // Direct executable (.exe, git, java, or Linux/macOS binary)
        executable = cmd;
        spawnArgs = args;
      }

      const child = spawn(executable, spawnArgs, {
        cwd,
        env: env || process.env,
        shell: false,
        windowsVerbatimArguments: windowsVerbatim,
      });

      if (buildId) {
        activeProcesses.set(buildId, child);
      }

      child.stdout.on('data', (d) => {
        onData(d.toString());
      });

      child.stderr.on('data', (d) => {
        onData(d.toString());
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        resolve(code ?? 0);
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Cancel an active build process
 */
export function cancelActiveMavenBuild(buildId: string): boolean {
  const proc = activeProcesses.get(buildId);
  if (proc) {
    try {
      proc.kill('SIGTERM');
      activeProcesses.delete(buildId);
      return true;
    } catch (err) {
      console.warn('[MavenEngine] Error killing build process:', err);
    }
  }
  return false;
}

