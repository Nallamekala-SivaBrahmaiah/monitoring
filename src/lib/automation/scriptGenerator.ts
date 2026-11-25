import fs from 'fs';
import path from 'path';
import { TOOL_CATALOG } from './toolCatalog';
import type { ToolDefinition } from './toolCatalog';

export interface SelectedToolRequest {
  toolId: string;
  version?: string;
}

export interface GeneratedScriptResult {
  script: string;
  toolOrder: string[];
  totalTools: number;
}

/**
 * Reads the central devops-installations.sh file.
 */
export function getBaseScriptContent(): string {
  const scriptPath = path.join(
    process.cwd(),
    'src',
    'lib',
    'automation',
    'scripts',
    'devops-installations.sh'
  );
  if (fs.existsSync(scriptPath)) {
    return fs.readFileSync(scriptPath, 'utf8');
  }
  throw new Error(`Central installation script not found at ${scriptPath}`);
}

/**
 * Extracts a specific shell function block from the centralized script.
 */
export function extractFunction(scriptContent: string, functionName: string): string {
  // Regex to match: functionName() { ... }
  const regex = new RegExp(`(^|\\n)(${functionName}\\s*\\(\\)\\s*\\{[\\s\\S]*?\\n\\})`, 'm');
  const match = scriptContent.match(regex);
  if (match) {
    return match[2].trim();
  }
  return '';
}

/**
 * Extracts the inner body of a shell function (stripped of outer signature and closing bracket).
 */
export function extractFunctionBody(scriptContent: string, functionName: string): string {
  const full = extractFunction(scriptContent, functionName);
  if (!full) return '';
  const lines = full.split('\n');
  if (lines.length > 2) {
    return lines.slice(1, -1).join('\n');
  }
  return full;
}

/**
 * Generates an isolated, safe, idempotent bash runner that ONLY contains
 * and calls the user's selected installation functions.
 */
export function generateSelectedInstallationScript(
  selectedTools: SelectedToolRequest[],
  options?: {
    stopOnError?: boolean;
    serverName?: string;
    customPackages?: (ToolDefinition & { installScript?: string })[];
  }
): GeneratedScriptResult {
  const baseContent = getBaseScriptContent();
  const stopOnError = options?.stopOnError ?? false;
  const serverName = options?.serverName || 'Remote Server';
  const fullCatalog: (ToolDefinition & { installScript?: string })[] = [
    ...TOOL_CATALOG,
    ...(options?.customPackages || []),
  ];

  // 1. Resolve and validate selected tools
  const validatedTools: { tool: ToolDefinition & { installScript?: string }; version: string }[] = [];
  const toolIds = new Set<string>();

  for (const item of selectedTools) {
    const def = fullCatalog.find((t) => t.id === item.toolId);
    if (!def) continue;

    // Check dependencies (e.g. Jenkins or Maven requires Java)
    if (def.dependencies) {
      for (const depId of def.dependencies) {
        if (!toolIds.has(depId)) {
          const depDef = fullCatalog.find((t) => t.id === depId);
          if (depDef && !selectedTools.some((s) => s.toolId === depId)) {
            validatedTools.unshift({
              tool: depDef,
              version: depDef.defaultVersion || '17',
            });
            toolIds.add(depId);
          }
        }
      }
    }

    if (!toolIds.has(def.id)) {
      validatedTools.push({
        tool: def,
        version: item.version || def.defaultVersion || '',
      });
      toolIds.add(def.id);
    }
  }

  // 2. Extract shared boilerplate (colors, logging, OS detection, package manager helpers)
  const headerEnd = baseContent.indexOf('# 1. PROGRAMMING LANGUAGES');
  const sharedBoilerplate = headerEnd !== -1
    ? baseContent.substring(0, headerEnd).trim()
    : baseContent.split('\n').slice(0, 80).join('\n');

  // 3. Extract or construct required function definitions
  const functionDefinitions: string[] = [];
  for (const item of validatedTools) {
    if (item.tool.installScript) {
      // User-defined custom package installation function
      const customFnCode = `
# ==============================================================================
# Custom User Package: ${item.tool.name} (${item.tool.id})
# ==============================================================================
${item.tool.functionName}() {
  local ver="\${1:-${item.tool.defaultVersion || 'latest'}}"
  log_step "Installing ${item.tool.name} (Version: \${ver})"

${item.tool.installScript}
}
`.trim();
      functionDefinitions.push(customFnCode);
    } else {
      const fnCode = extractFunction(baseContent, item.tool.functionName);
      if (fnCode) {
        functionDefinitions.push(fnCode);
      } else {
        console.warn(`Function ${item.tool.functionName} not found in central script.`);
      }
    }
  }

  // 4. Build the execution blocks with telemetry markers
  const executionCalls = validatedTools.map(({ tool, version }) => {
    const arg = version ? `"${version}"` : '';
    return `
# ----------------------------------------------------------------------
# Tool: ${tool.name} (${tool.id})
# ----------------------------------------------------------------------
echo "###AGY_TOOL_START:${tool.id}:${tool.name}###"
START_TS=$(date +%s)

${tool.functionName} ${arg}
EXIT_CODE=$?

END_TS=$(date +%s)
DURATION=$((END_TS - START_TS))

if [ $EXIT_CODE -eq 0 ]; then
  echo "###AGY_TOOL_SUCCESS:${tool.id}:$DURATION###"
else
  echo "###AGY_TOOL_FAILED:${tool.id}:$EXIT_CODE:$DURATION###"
  FAILED_COUNT=$((FAILED_COUNT + 1))
  ${stopOnError ? 'echo -e "\\${C_RED}[FATAL] Execution halted due to failure in ' + tool.name + '\\${C_RESET}" && exit $EXIT_CODE' : ''}
fi
`;
  });

  // 5. Construct full dynamic script
  const fullScript = `#!/usr/bin/env bash
# ==============================================================================
# Multi-Cloud Automation Engine - Dynamic Remote Runner
# Generated for: ${serverName}
# Selected Tools (${validatedTools.length}): ${validatedTools.map((t) => t.tool.id).join(', ')}
# Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ==============================================================================

${sharedBoilerplate}

# --- EXTRACTED TOOL FUNCTIONS (ONLY SELECTED TOOLS INCLUDED) ---
${functionDefinitions.join('\n\n')}

# ==============================================================================
# MAIN AUTOMATION RUNNER
# ==============================================================================
FAILED_COUNT=0
TOTAL_TOOLS=${validatedTools.length}

echo "###AGY_EXECUTION_START:${validatedTools.length}###"
echo -e "\${C_BOLD}\${C_CYAN}Starting automated deployment for ${validatedTools.length} selected tool(s) on ${serverName}...\${C_RESET}"

detect_os

${executionCalls.join('\n')}

echo -e "\n\${C_BOLD}\${C_WHITE}======================================================================\${C_RESET}"
if [ $FAILED_COUNT -eq 0 ]; then
  echo -e "\${C_BOLD}\${C_GREEN}  All $TOTAL_TOOLS tool(s) installed successfully!\${C_RESET}"
  echo "###AGY_EXECUTION_SUMMARY:SUCCESS:$TOTAL_TOOLS:0###"
  exit 0
else
  echo -e "\${C_BOLD}\${C_YELLOW}  Installation finished with $FAILED_COUNT failure(s) out of $TOTAL_TOOLS tool(s).\${C_RESET}"
  echo "###AGY_EXECUTION_SUMMARY:PARTIAL:$TOTAL_TOOLS:$FAILED_COUNT###"
  exit 1
fi
`;

  return {
    script: fullScript,
    toolOrder: validatedTools.map((t) => t.tool.id),
    totalTools: validatedTools.length,
  };
}

/**
 * Built-in production DevOps automation scripts for custom script repository.
 */
export const BUILT_IN_AUTOMATION_SCRIPTS = [
  {
    name: 'Full Linux System Update & Hygiene',
    description: 'Updates package indices, upgrades security patches, removes orphaned dependencies, and cleans package caches.',
    category: 'system',
    isBuiltIn: true,
    content: `#!/usr/bin/env bash
set -e
echo "Starting comprehensive system update and maintenance..."

if [ -f /etc/debian_version ]; then
  sudo apt-get update -y
  sudo env DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
  sudo apt-get autoremove -y
  sudo apt-get clean
elif [ -f /etc/redhat-release ] || [ -f /etc/system-release ]; then
  if command -v dnf &>/dev/null; then
    sudo dnf upgrade -y
    sudo dnf autoremove -y
    sudo dnf clean all
  else
    sudo yum update -y
    sudo yum autoremove -y
    sudo yum clean all
  fi
fi

echo "System update and cleanup completed successfully!"
uptime
free -h
df -h /
`,
  },
  {
    name: 'Swap Memory 4GB Setup',
    description: 'Safely creates, mounts, and permanently configures a 4GB virtual swap memory file for build workloads.',
    category: 'system',
    isBuiltIn: true,
    content: `#!/usr/bin/env bash
set -e
SWAP_FILE="/swapfile"
SWAP_SIZE="4G"

if grep -q "$SWAP_FILE" /proc/swaps; then
  echo "Swapfile $SWAP_FILE is already active!"
  swapon --show
  exit 0
fi

echo "Allocating $SWAP_SIZE swapfile at $SWAP_FILE..."
if command -v fallocate &>/dev/null; then
  sudo fallocate -l "$SWAP_SIZE" "$SWAP_FILE" || sudo dd if=/dev/zero of="$SWAP_FILE" bs=1M count=4096 status=progress
else
  sudo dd if=/dev/zero of="$SWAP_FILE" bs=1M count=4096 status=progress
fi

sudo chmod 600 "$SWAP_FILE"
sudo mkswap "$SWAP_FILE"
sudo swapon "$SWAP_FILE"

if ! grep -q "$SWAP_FILE" /etc/fstab; then
  echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab
fi

# Set optimal swappiness for DevOps builds
sudo sysctl vm.swappiness=15
echo "vm.swappiness=15" | sudo tee -a /etc/sysctl.d/99-swappiness.conf

echo "Swap configuration successful:"
swapon --show
free -h
`,
  },
  {
    name: 'UFW Firewall Standard Hardening',
    description: 'Enforces safe default firewall rules: allows SSH (port 22), HTTP (80), HTTPS (443), and enables UFW.',
    category: 'security',
    isBuiltIn: true,
    content: `#!/usr/bin/env bash
set -e
if ! command -v ufw &>/dev/null; then
  if [ -f /etc/debian_version ]; then
    sudo apt-get update && sudo apt-get install -y ufw
  else
    echo "UFW is designed for Debian/Ubuntu hosts."
    exit 1
  fi
fi

echo "Configuring UFW rules..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH Port'
sudo ufw allow 80/tcp comment 'HTTP Web'
sudo ufw allow 443/tcp comment 'HTTPS Secure'
sudo ufw allow 8080/tcp comment 'Jenkins CI/CD'
sudo ufw allow 9000/tcp comment 'SonarQube'

echo "y" | sudo ufw enable
sudo ufw status verbose
echo "UFW Firewall configured successfully!"
`,
  },
  {
    name: 'Docker Daemon Optimization & Log Rotation',
    description: 'Configures /etc/docker/daemon.json with max-size log rotation (10m, 3 files) and live-restore for stability.',
    category: 'docker',
    isBuiltIn: true,
    content: `#!/usr/bin/env bash
set -e
if ! command -v docker &>/dev/null; then
  echo "Docker is not installed on this host."
  exit 1
fi

sudo mkdir -p /etc/docker
cat <<EOF | sudo tee /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
EOF

echo "Reloading Docker configuration..."
sudo systemctl daemon-reload
sudo systemctl restart docker
docker info | grep -i "Logging Driver"
echo "Docker daemon optimized with automated log rotation!"
`,
  },
  {
    name: 'DevOps Health & Diagnostic Audit',
    description: 'Performs comprehensive server audit: CPU, RAM, disk, listening ports, Docker container health, and uptime.',
    category: 'devops',
    isBuiltIn: true,
    content: `#!/usr/bin/env bash
echo "=== SYSTEM INFORMATION ==="
uname -a
cat /etc/os-release | grep -E "^(NAME|VERSION)="

echo -e "\n=== CPU & MEMORY USAGE ==="
top -bn1 | head -n 5
free -h

echo -e "\n=== DISK MOUNTS ==="
df -h -x tmpfs -x devtmpfs

echo -e "\n=== LISTENING NETWORK PORTS ==="
if command -v ss &>/dev/null; then
  sudo ss -tulpn | head -n 15
elif command -v netstat &>/dev/null; then
  sudo netstat -tulpn | head -n 15
fi

echo -e "\n=== DOCKER STATUS ==="
if command -v docker &>/dev/null; then
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
  echo "Docker is not running on this host."
fi

echo -e "\n=== SECURITY / FAILED LOGIN AUDIT ==="
if [ -f /var/log/auth.log ]; then
  grep "Failed password" /var/log/auth.log | tail -n 5 || echo "No recent failed logins."
elif [ -f /var/log/secure ]; then
  grep "Failed password" /var/log/secure | tail -n 5 || echo "No recent failed logins."
fi

echo -e "\nDiagnostic audit completed!"
`,
  },
];
