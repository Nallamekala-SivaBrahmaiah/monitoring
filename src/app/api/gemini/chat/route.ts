import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Client } from 'ssh2';
import connectToDatabase from '@/lib/mongodb';
import { resolveServerCredentials } from '@/lib/terminal/serverResolver';
import AiRemediationLog from '@/models/AiRemediationLog';

interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  text: string;
}

interface ServerTarget {
  id?: string;
  name?: string;
  host?: string;
  provider?: string;
}

interface ActionProposal {
  title: string;
  tool: string;
  problem: string;
  root_cause: string;
  fix_command: string;
  verify_command: string;
  rollback_command: string;
}

/**
 * Executes a non-destructive read-only telemetry inspection over SSH
 */
async function inspectLiveServerOverSSH(creds: any): Promise<string> {
  return new Promise<string>((resolve) => {
    const client = new Client();
    let output = '';

    const inspectionScript = `
echo "=== SYSTEM UPTIME & LOAD ==="
uptime 2>&1
echo "=== RAM & DISK ==="
free -m 2>&1
df -h / 2>&1
echo "=== FAILED SYSTEMD SERVICES ==="
systemctl --failed --no-pager 2>&1 | head -n 12
echo "=== TOP PROCESSES BY CPU & RAM ==="
ps aux --sort=-%cpu | head -n 6
ps aux --sort=-%mem | head -n 6
echo "=== DOCKER STATUS ==="
if which docker >/dev/null 2>&1; then
  docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" 2>&1 | head -n 15
  LATEST_ID=$(docker ps -q -l 2>/dev/null)
  if [ -n "$LATEST_ID" ]; then
    echo "--- Latest Docker Container Logs ($LATEST_ID) ---"
    docker logs --tail 35 "$LATEST_ID" 2>&1 | head -n 35
  fi
else
  echo "Docker binary not found"
fi
echo "=== KUBERNETES / KUBECTL ==="
if which kubectl >/dev/null 2>&1; then
  kubectl get pods -A --field-selector status.phase!=Running 2>&1 | head -n 15
  kubectl get events --sort-by=.metadata.creationTimestamp 2>&1 | tail -n 12
else
  echo "Kubectl binary not found"
fi
echo "=== NGINX WEB SERVER ==="
if which nginx >/dev/null 2>&1; then
  nginx -t 2>&1 || true
  systemctl status nginx --no-pager 2>&1 | head -n 12
else
  echo "Nginx binary not found"
fi
`;

    const timer = setTimeout(() => {
      try { client.end(); } catch {}
      resolve(output + '\n[NOTICE] Live SSH probe completed after 10s timeout.');
    }, 10000);

    const connectConfig: any = {
      host: creds.host,
      port: creds.port || 22,
      username: creds.username,
      readyTimeout: 10000,
    };

    if (creds.authMethod === 'privateKey') {
      connectConfig.privateKey = creds.authSecret;
    } else {
      connectConfig.password = creds.authSecret;
    }

    client
      .on('ready', () => {
        client.exec(inspectionScript, (err, stream) => {
          if (err) {
            clearTimeout(timer);
            try { client.end(); } catch {}
            return resolve(`SSH Exec Error: ${err.message}`);
          }
          stream
            .on('data', (d: Buffer) => {
              output += d.toString('utf-8');
            })
            .stderr.on('data', (d: Buffer) => {
              output += d.toString('utf-8');
            })
            .on('close', () => {
              clearTimeout(timer);
              try { client.end(); } catch {}
              resolve(output);
            });
        });
      })
      .on('error', (err) => {
        clearTimeout(timer);
        resolve(`SSH Connection Failed: ${err.message}`);
      })
      .connect(connectConfig);
  });
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your server-side environment variables (.env.local) to enable real-time Gemini AI assistance.',
          isConfigMissing: true,
        },
        { status: 200 }
      );
    }

    await connectToDatabase();
    const body = await request.json();
    const { prompt, server, history = [], context = {}, model } = body as {
      prompt: string;
      server?: ServerTarget;
      history?: ChatMessage[];
      context?: any;
      model?: string;
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'A valid text prompt is required.' },
        { status: 400 }
      );
    }

    let liveServerProbeOutput = '';
    let resolvedCreds: any = null;

    // 1. If target server is specified, inspect it live over SSH
    if (server && (server.id || server.host || server.name)) {
      try {
        resolvedCreds = await resolveServerCredentials({
          sshServerId: server.id,
          host: server.host,
          name: server.name,
        });

        if (resolvedCreds) {
          liveServerProbeOutput = await inspectLiveServerOverSSH(resolvedCreds);
        } else {
          liveServerProbeOutput = `Server credentials for "${server.name || server.host}" are not configured in inventory. Proceeding with general infrastructure analysis.`;
        }
      } catch (err: any) {
        liveServerProbeOutput = `Live inspection attempt on server encountered: ${err.message}`;
      }
    }

    // 2. Build system instruction
    const serverDetails = server
      ? `TARGET SERVER UNDER DIAGNOSIS:
- Name: ${server.name || 'Unnamed'}
- Host / IP: ${server.host || 'N/A'}
- Provider: ${server.provider?.toUpperCase() || 'MULTI-CLOUD'}
- Live SSH Probe Output:
${liveServerProbeOutput || 'No active SSH probe available.'}`
      : 'NO SPECIFIC TARGET SERVER SELECTED. User is asking a multi-cloud architecture or troubleshooting question.';

    const systemInstruction = `You are the Gemini AI DevOps Copilot & Auto-Remediation Engine for the Multi-Cloud Monitoring Platform (AWS & Azure).
You specialize in real-time root cause analysis, live server telemetry diagnosis, and safe infrastructure remediation across:
- Docker Containers & Compose
- Kubernetes Pods, Deployments & Events
- Nginx Reverse Proxies & SSL Certificates
- CI/CD Pipelines (Jenkins, Maven, SonarQube, Trivy)
- Infrastructure as Code & Configuration (Terraform, Ansible)
- Linux Operating System (systemd, load, memory, disk, network)

${serverDetails}

CONVERSATIONAL WORKFLOW RULES:
1. Explain the problem, symptoms, and exact root cause clearly like a Senior DevOps/SRE Engineer.
2. Specify which tool/service is affected (Docker, Kubernetes, Maven, Ansible, Jenkins, SonarQube, Trivy, Terraform, Nginx, or OS).
3. If an actionable fix is appropriate, you MUST propose a safe fix and ALWAYS ask the user for permission before anything is executed.
4. When proposing a fix, format the proposal in a valid JSON block enclosed in \`\`\`json:action_proposal ... \`\`\` with the exact fields:
{
  "title": "Short title of the proposed fix",
  "tool": "Docker | Kubernetes | Nginx | Jenkins | Maven | Ansible | Terraform | SonarQube | Trivy | OS",
  "problem": "One sentence summary of the issue",
  "root_cause": "Exact technical root cause",
  "fix_command": "Exact bash command to resolve the issue safely",
  "verify_command": "Exact bash command to verify health after fix",
  "rollback_command": "Exact bash command to revert the change if verify fails"
}
5. In your conversational text, explicitly remind the user:
"Please review the proposed action and commands in the Action Approval Card below. Click **Approve & Run Fix** to authorize execution, or **Modify** to adjust the command."
6. NEVER include dangerous commands (e.g. \`rm -rf /\`, \`mkfs\`, \`shutdown\`, \`dd\`). Ensure all commands are safe and appropriate for production.`;

    const ai = new GoogleGenAI({ apiKey });

    // Format chat contents
    const contents: any[] = [];

    // Append prior conversation history if provided
    for (const msg of history) {
      if (msg.text && msg.text.trim()) {
        contents.push({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        });
      }
    }

    // Append current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt.trim() }],
    });

    const targetModel = model || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    let responseText = '';
    let finalModel = targetModel;

    // Bulletproof candidate fallback list of verified models
    const candidateModels = Array.from(new Set([
      targetModel,
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-4-hydrogen',
      'gemini-3.8-flash',
    ]));

    let lastError: any = null;

    for (const tryModel of candidateModels) {
      try {
        const result = await ai.models.generateContent({
          model: tryModel,
          contents,
          config: { systemInstruction },
        });
        if (result && result.text) {
          responseText = result.text;
          finalModel = tryModel;
          lastError = null;
          break;
        }
      } catch (err: any) {
        console.warn(`[Gemini API] Model ${tryModel} attempt failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('All Gemini model candidates failed to generate content.');
    }

    // Parse action proposal JSON if present
    let actionProposal: ActionProposal | null = null;
    const proposalMatch = responseText.match(/```(?:json:action_proposal|json)\s*([\s\S]*?)```/);
    if (proposalMatch && proposalMatch[1]) {
      try {
        const parsed = JSON.parse(proposalMatch[1]);
        if (parsed.fix_command) {
          actionProposal = {
            title: parsed.title || 'Remediation Action',
            tool: parsed.tool || 'DevOps',
            problem: parsed.problem || 'Identified infrastructure issue',
            root_cause: parsed.root_cause || 'Detected abnormality',
            fix_command: parsed.fix_command,
            verify_command: parsed.verify_command || 'echo "Verification complete"',
            rollback_command: parsed.rollback_command || 'echo "No rollback required"',
          };
        }
      } catch {}
    }

    // Create MongoDB Audit Log
    let logDoc = null;
    try {
      logDoc = await AiRemediationLog.create({
        serverId: server?.id || (resolvedCreds ? resolvedCreds.serverId : undefined),
        serverName: server?.name || (resolvedCreds ? resolvedCreds.serverName : undefined),
        host: server?.host || (resolvedCreds ? resolvedCreds.host : undefined),
        provider: server?.provider || 'custom',
        userMessage: prompt,
        diagnosis: responseText,
        toolAffected: actionProposal?.tool || 'General',
        proposedAction: actionProposal?.title,
        fixCommand: actionProposal?.fix_command,
        verifyCommand: actionProposal?.verify_command,
        rollbackCommand: actionProposal?.rollback_command,
        decision: 'pending',
        executionStatus: 'idle',
        aiModel: finalModel,
        timestamp: new Date(),
      });
    } catch (dbErr) {
      console.error('[MongoDB AiRemediationLog Error]:', dbErr);
    }

    return NextResponse.json({
      success: true,
      text: responseText,
      model: finalModel,
      serverInspection: liveServerProbeOutput ? true : false,
      actionProposal,
      logId: logDoc ? logDoc._id.toString() : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Gemini Chat Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An error occurred during Gemini AI diagnosis.',
      },
      { status: 500 }
    );
  }
}
