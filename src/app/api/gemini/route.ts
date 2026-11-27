import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface GeminiMessage {
  role: 'user' | 'assistant' | 'model';
  text: string;
}

interface DashboardContext {
  cloudFilter?: string;
  activeAlertsCount?: number;
  recentAlerts?: Array<{ title?: string; severity?: string; status?: string; source?: string }>;
  ec2Summary?: { total?: number; running?: number; stopped?: number };
  azureVMSummary?: { total?: number; running?: number; stopped?: number };
  serverHealth?: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your server-side environment variables (.env.local) to enable real-time Gemini AI queries.',
          isConfigMissing: true,
        },
        { status: 200 }
      );
    }

    const body = await request.json();
    const { prompt, history = [], context = {} } = body as {
      prompt: string;
      history?: GeminiMessage[];
      context?: DashboardContext;
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'A valid text prompt is required.' },
        { status: 400 }
      );
    }

    // Build comprehensive multi-cloud DevOps system context
    const contextSummaryLines: string[] = [
      `Current Platform Time: ${new Date().toISOString()}`,
      `Selected Cloud Filter: ${context.cloudFilter || 'All Clouds (AWS & Azure)'}`,
    ];

    if (context.ec2Summary) {
      contextSummaryLines.push(
        `AWS EC2 Fleet: ${context.ec2Summary.total ?? 0} total (${context.ec2Summary.running ?? 0} running, ${context.ec2Summary.stopped ?? 0} stopped)`
      );
    }
    if (context.azureVMSummary) {
      contextSummaryLines.push(
        `Azure VM Fleet: ${context.azureVMSummary.total ?? 0} total (${context.azureVMSummary.running ?? 0} running, ${context.azureVMSummary.stopped ?? 0} stopped)`
      );
    }
    if (context.activeAlertsCount !== undefined) {
      contextSummaryLines.push(`Active Infrastructure Alerts: ${context.activeAlertsCount}`);
    }
    if (context.recentAlerts && context.recentAlerts.length > 0) {
      const alertSnippets = context.recentAlerts
        .slice(0, 5)
        .map(
          (a) => `• [${a.severity?.toUpperCase() || 'INFO'}] ${a.title || 'Alert'} (${a.source || 'system'}, status: ${a.status || 'active'})`
        )
        .join('\n');
      contextSummaryLines.push(`Top Recent Alerts:\n${alertSnippets}`);
    }

    const systemInstruction = `You are the Gemini AI DevOps & Multi-Cloud Architecture Assistant embedded in the Multi-Cloud Monitoring Platform (https://multicloudwithsiva.online).
You specialize in:
- AWS Infrastructure (EC2, VPC, CloudWatch, S3, IAM, EKS, Security Groups)
- Azure Cloud (Azure VMs, Virtual Networks, NSGs, Azure Monitor, AKS, Storage Accounts)
- Linux Server Administration, CPU/RAM/Disk metrics, Systemd services, Kernel troubleshooting
- Containerization & Orchestration (Docker, Docker Compose, Kubernetes Pods, Services, Ingress, Deployments)
- Web Servers & Proxies (Nginx reverse proxies, SSL/TLS certificates, Upstream load balancing)
- CI/CD & Automation (Jenkins pipelines, Maven builds, SonarQube quality gates, Trivy vulnerability scans)
- Infrastructure as Code & Configuration Management (Terraform HCL plans/applies, Ansible playbooks)

LIVE INFRASTRUCTURE TELEMETRY CONTEXT:
${contextSummaryLines.join('\n')}

GUIDELINES:
1. Base your answers on the live telemetry context provided whenever relevant.
2. Provide concise, production-ready, security-hardened commands and explanations.
3. Use formatted markdown with clear headings, bullet points, and syntax-highlighted code blocks (e.g. \`\`\`bash, \`\`\`terraform, \`\`\`nginx, \`\`\`yaml).
4. If a problem or alert is mentioned, explain the root cause, immediate remediation commands, verification steps, and long-term prevention.
5. Answer in English, Telugu, or Hindi if the user queries in that language.`;

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

    const targetModel = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';
    let responseText = '';
    let finalModel = targetModel;

    try {
      const result = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: {
          systemInstruction,
        },
      });

      responseText = result.text || '';
    } catch (primaryErr: any) {
      console.warn(`[Gemini API] Primary model ${targetModel} encountered:`, primaryErr?.message || primaryErr);

      // If the primary model is unavailable or throws a 404/not found, fallback to gemini-2.5-flash
      if (
        primaryErr?.message?.includes('not found') ||
        primaryErr?.status === 404 ||
        targetModel === 'gemini-4-hydrogen'
      ) {
        try {
          const fallbackModel = 'gemini-2.5-flash';
          const fallbackResult = await ai.models.generateContent({
            model: fallbackModel,
            contents,
            config: {
              systemInstruction,
            },
          });
          responseText = fallbackResult.text || '';
          finalModel = fallbackModel;
        } catch (fallbackErr: any) {
          throw primaryErr; // rethrow primary error if fallback also fails
        }
      } else {
        throw primaryErr;
      }
    }

    return NextResponse.json({
      success: true,
      text: responseText,
      model: finalModel,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Gemini Route Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An error occurred while generating response from Gemini API.',
      },
      { status: 500 }
    );
  }
}
