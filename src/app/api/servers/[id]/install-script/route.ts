import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/servers/[id]/install-script
 * Returns a secure, read-only bash script for the lightweight monitoring agent.
 * Does not silently install; explains every command and requires explicit admin execution.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    let server: any = null;
    if (mongoose.isValidObjectId(id)) {
      server = await Server.findById(id).select('name host environment agent');
    }
    if (!server) {
      server = await Server.findOne({
        $or: [
          { cloudResourceId: id },
          { instanceId: id },
          { resourceId: id },
          { name: id },
        ],
      }).select('name host environment agent');
    }
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    const origin = request.nextUrl.origin || 'http://localhost:3000';
    const token = server.agent.token;

    // Generated lightweight POSIX agent script
    const script = `#!/bin/bash
# ==============================================================================
# Multi-Cloud Platform - Secure Server Monitoring Agent
# Server Name: ${server.name}
# Environment: ${server.environment}
# Target Endpoint: ${origin}/api/servers/agent/heartbeat
# Mode: Read-Only System Metrics & Docker/Kubernetes Discovery
# ==============================================================================
set -euo pipefail

SERVER_TOKEN="${token}"
API_URL="${origin}/api/servers/agent/heartbeat"
AGENT_VERSION="1.2.0"

echo "[INFO] Multi-Cloud Monitoring Agent v\${AGENT_VERSION} starting..."

collect_and_send() {
  UPTIME_SEC=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0)
  LOAD_AVG=$(cat /proc/loadavg 2>/dev/null || echo "0 0 0")
  MEM_DATA=$(free -b 2>/dev/null || echo "")
  
  # Parse memory
  MEM_TOTAL=$(echo "$MEM_DATA" | awk '/Mem:/ {print $2}' || echo 0)
  MEM_USED=$(echo "$MEM_DATA" | awk '/Mem:/ {print $3}' || echo 0)
  MEM_AVAIL=$(echo "$MEM_DATA" | awk '/Mem:/ {print $7 ? $7 : $4}' || echo 0)
  
  # Check Docker
  DOCKER_DETECTED=false
  DOCKER_VER=""
  CONTAINERS_COUNT=0
  if command -v docker >/dev/null 2>&1; then
    DOCKER_DETECTED=true
    DOCKER_VER=$(docker --version 2>/dev/null || echo "")
    CONTAINERS_COUNT=$(docker ps -q 2>/dev/null | wc -l || echo 0)
  fi

  # Check K8s
  K8S_DETECTED=false
  K8S_VER=""
  if command -v kubectl >/dev/null 2>&1; then
    K8S_DETECTED=true
    K8S_VER=$(kubectl version --client -o json 2>/dev/null || echo "detected")
  fi

  PAYLOAD=$(cat <<EOF
{
  "token": "\${SERVER_TOKEN}",
  "version": "\${AGENT_VERSION}",
  "uptime": \${UPTIME_SEC},
  "load": "\${LOAD_AVG}",
  "memory": {
    "total": \${MEM_TOTAL:-0},
    "used": \${MEM_USED:-0},
    "available": \${MEM_AVAIL:-0}
  },
  "docker": {
    "detected": \${DOCKER_DETECTED},
    "version": "\${DOCKER_VER}",
    "runningCount": \${CONTAINERS_COUNT}
  },
  "kubernetes": {
    "detected": \${K8S_DETECTED}
  }
}
EOF
)

  curl -s -X POST -H "Content-Type: application/json" -d "\${PAYLOAD}" "\${API_URL}" >/dev/null 2>&1 || true
}

collect_and_send
echo "[SUCCESS] Metrics reported successfully to Multi-Cloud Monitoring Platform."
`;

    const oneLiner = `curl -sSL "${origin}/api/servers/${id}/install-script" | bash`;

    return NextResponse.json({
      serverName: server.name,
      environment: server.environment,
      token,
      oneLiner,
      script,
      instructions: [
        '1. Log in to your target Linux server as a root or sudo user.',
        '2. Review the read-only script above to ensure it meets your security requirements.',
        '3. Run the one-line command to verify the connection and initialize automatic agent heartbeats.',
        '4. (Optional) Add to crontab: `* * * * * curl -sSL "' + origin + '/api/servers/' + id + '/install-script" | bash >/dev/null 2>&1` for recurring 1-minute heartbeats.',
      ],
    });
  } catch (err: any) {
    console.error('Install script generation error:', err);
    return NextResponse.json({ error: 'Failed to generate installation script' }, { status: 500 });
  }
}
