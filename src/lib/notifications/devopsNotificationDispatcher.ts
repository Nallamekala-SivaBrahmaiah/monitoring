import nodemailer from 'nodemailer';
import connectToDatabase from '@/lib/mongodb';
import DevOpsRecipient from '@/models/DevOpsRecipient';
import Notification from '@/models/Notification';
import AlertDelivery from '@/models/AlertDelivery';
import NotificationPreferences from '@/models/NotificationPreferences';

export type DevOpsToolCategory =
  | 'server'
  | 'docker'
  | 'kubernetes'
  | 'jenkins'
  | 'sonarqube'
  | 'trivy'
  | 'ansible'
  | 'terraform'
  | 'maven';

export interface DevOpsAlertEvent {
  category: DevOpsToolCategory;
  toolName: string; // e.g. "Docker Container", "Kubernetes Pod", "Jenkins Pipeline", "Maven Build", "Terraform Apply", "Ansible Playbook", "Trivy Security Scan", "SonarQube Quality Gate", "Server OS"
  eventName: string; // e.g. "Container Stopped", "Deployment Failed", "Build Succeeded", "High CPU Usage", "Critical CVE Vulnerability"
  severity: 'critical' | 'high' | 'warning' | 'info';
  status: 'Failed' | 'Passed' | 'Stopped' | 'Active' | 'Warning' | 'Resolved';
  resourceName: string; // Container name, pod name, server name, project name
  resourceId?: string;
  serverName?: string;
  ipAddress?: string;
  provider?: string;
  region?: string;
  locationToFix?: string; // e.g. "/home/siva/monitoring" or "Namespace: default" or "Server: 4.240.105.247"
  reason: string; // Detailed explanation of WHY it happened
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    threshold?: number;
    exitCode?: number;
    vulnerabilitiesCount?: number;
    failedTasks?: number;
  };
  remediationSteps: string[]; // Step 1, Step 2, Step 3
  remediationCommands: string; // Bash / Docker / Kubectl / CLI commands to execute
  link?: string;
}

function getAppBaseUrl(): string {
  const envUrl = process.env.NEXTAUTH_URL || process.env.APP_URL;
  if (envUrl && envUrl.startsWith('http')) return envUrl.replace(/\/$/, '');
  return 'https://multicloudwithsiva.online';
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.GMAIL_USER || 'nallasiva552@gmail.com';
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!pass) {
    throw new Error('GMAIL_APP_PASSWORD is not configured.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

/**
 * Resolves active enabled DevOps email recipients from MongoDB
 */
async function getEnabledRecipients(): Promise<string[]> {
  try {
    await connectToDatabase();
    const [enabledDocs, disabledDocs] = await Promise.all([
      DevOpsRecipient.find({ enabled: { $ne: false } }).lean(),
      DevOpsRecipient.find({ enabled: false }).lean(),
    ]);

    const disabledSet = new Set(
      disabledDocs.map((d: any) => (d.email || '').toLowerCase().trim())
    );
    const enabledList = enabledDocs
      .map((d: any) => (d.email || '').toLowerCase().trim())
      .filter((e: string) => Boolean(e) && !disabledSet.has(e));

    if (enabledList.length > 0) {
      return Array.from(new Set(enabledList));
    }

    const prefs = await NotificationPreferences.findOne({ userId: 'admin' }).lean();
    if (prefs && Array.isArray(prefs.alertRecipients)) {
      const pList = prefs.alertRecipients
        .map((e: string) => e.toLowerCase().trim())
        .filter((e: string) => Boolean(e) && !disabledSet.has(e));
      if (pList.length > 0) return Array.from(new Set(pList));
    }

    // Only fallback if NO recipients configured at all in DB, and fallback is not disabled
    const totalCount = await DevOpsRecipient.countDocuments({});
    if (totalCount === 0) {
      const fallback = (process.env.ALERT_EMAIL_TO || process.env.GMAIL_USER || '').toLowerCase().trim();
      if (fallback && !disabledSet.has(fallback)) {
        return [fallback];
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Dispatches an A-to-Z DevOps lifecycle alert or notification across Email and In-App Notifications Feed
 */
export async function dispatchDevOpsAlert(event: DevOpsAlertEvent): Promise<{
  success: boolean;
  recipientsCount: number;
  recipients: string[];
  messageId?: string;
  error?: string;
}> {
  try {
    await connectToDatabase();

    const recipients = await getEnabledRecipients();
    if (recipients.length === 0) {
      return { success: false, recipientsCount: 0, recipients: [], error: 'No recipients configured' };
    }

    const sender = process.env.GMAIL_USER || 'nallasiva552@gmail.com';
    const baseUrl = getAppBaseUrl();
    const directLink = event.link
      ? event.link.startsWith('http')
        ? event.link
        : `${baseUrl}${event.link.startsWith('/') ? '' : '/'}${event.link}`
      : `${baseUrl}/dashboard/notifications`;

    const isCritical = event.severity === 'critical';
    const isWarning = event.severity === 'warning';
    const isSuccess = event.status === 'Passed' || event.status === 'Resolved';

    const severityColor = isSuccess
      ? '#10B981' // Green
      : isCritical
      ? '#EF4444' // Red
      : isWarning
      ? '#F59E0B' // Amber
      : '#3B82F6'; // Blue

    const statusBadgeBg = isSuccess
      ? '#064E3B'
      : isCritical
      ? '#7F1D1D'
      : isWarning
      ? '#78350F'
      : '#1E3A8A';

    const subject = `[${event.severity.toUpperCase()}] ${event.toolName}: ${event.eventName} — ${event.resourceName}`;
    const timestampFormatted = new Date().toUTCString();

    // Plain text email content
    const textContent = `
[${event.severity.toUpperCase()}] DEVOPS ALERT — ${event.toolName}

EVENT: ${event.eventName}
RESOURCE: ${event.resourceName}
STATUS: ${event.status}
SEVERITY: ${event.severity.toUpperCase()}
TIME: ${timestampFormatted}

SERVER / CLOUD INFO:
- Host Server: ${event.serverName || 'vm01siva-mon'}
- IP Address: ${event.ipAddress || '4.240.105.247'}
- Cloud Provider: ${event.provider || 'Azure'} (${event.region || 'centralindia'})
- Where To Fix: ${event.locationToFix || 'Host Server'}

WHY DID THIS HAPPEN (ROOT CAUSE):
${event.reason}

STEP-BY-STEP REMEDIATION:
${event.remediationSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

COMMANDS TO RUN & SOLVE:
${event.remediationCommands}

Open in Multi-Cloud Console:
${directLink}
    `.trim();

    // Rich HTML email content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B1120; padding: 28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 640px; background-color: #111A2E; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 24px 28px; background-color: #0F172A; border-bottom: 2px solid ${severityColor};">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 5px 12px; background-color: ${statusBadgeBg}; color: ${severityColor}; border: 1px solid ${severityColor}40; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
                      ${event.toolName} &bull; ${event.severity.toUpperCase()}
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #94A3B8; font-family: monospace;">
                      ${event.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 14px;">
                    <h1 style="margin: 0; font-size: 21px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                      ${event.eventName}: <span style="color: ${severityColor};">${event.resourceName}</span>
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 26px 28px;">
              
              <!-- Infrastructure Specs Table -->
              <table width="100%" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; background-color: #0D1526; border: 1px solid #1E293B; border-radius: 8px; margin-bottom: 22px; font-size: 13px;">
                <thead>
                  <tr style="background-color: #162036; border-bottom: 1px solid #22324F;">
                    <th align="left" style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; width: 40%;">Parameter</th>
                    <th align="left" style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8;">Component / Target</td>
                    <td style="padding: 10px 16px; color: #FFFFFF; font-weight: 600; font-family: monospace;">${event.resourceName}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8;">Host Server / Node</td>
                    <td style="padding: 10px 16px; color: #60A5FA; font-weight: 600;">${event.serverName || 'vm01siva-mon'} (${event.ipAddress || '4.240.105.247'})</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8;">Cloud &amp; Region</td>
                    <td style="padding: 10px 16px; color: #CBD5E1;">${event.provider || 'Azure'} &bull; ${event.region || 'centralindia'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8;">Where To Fix / Location</td>
                    <td style="padding: 10px 16px; color: #F59E0B; font-weight: 600; font-family: monospace; font-size: 12px;">${event.locationToFix || 'Server Terminal / Workspace'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; color: #94A3B8;">Detected At</td>
                    <td style="padding: 10px 16px; color: #CBD5E1; font-family: monospace; font-size: 12px;">${timestampFormatted}</td>
                  </tr>
                </tbody>
              </table>

              <!-- ROOT CAUSE BOX: WHY DID IT HAPPEN -->
              <div style="background-color: #0A1324; border: 1px solid #1E3A8A; border-radius: 8px; padding: 18px; margin-bottom: 22px;">
                <div style="font-size: 13px; font-weight: 700; color: #60A5FA; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">
                  &#128065; Why Did This Issue Happen (Root Cause Analysis):
                </div>
                <div style="font-size: 13px; line-height: 1.6; color: #E2E8F0;">
                  ${event.reason}
                </div>
              </div>

              <!-- REMEDIATION STEPS: HOW TO SOLVE -->
              <div style="background-color: #0D1B2A; border: 1px solid #10B98140; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #34D399; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px;">
                  &#128295; Step-by-Step Resolution Guide:
                </div>
                <ol style="margin: 0 0 14px 18px; padding: 0; font-size: 13px; line-height: 1.6; color: #CBD5E1;">
                  ${event.remediationSteps.map((step) => `<li style="margin-bottom: 6px;">${step}</li>`).join('')}
                </ol>
                <div style="font-size: 12px; font-weight: 700; color: #38BDF8; margin-bottom: 6px;">
                  Run These Commands in Server Terminal:
                </div>
                <pre style="margin: 0; padding: 12px; background-color: #020617; border: 1px solid #1E293B; border-radius: 6px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #38BDF8; overflow-x: auto; white-space: pre-wrap;">${event.remediationCommands}</pre>
              </div>

              <!-- Action Link -->
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${directLink}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      Open in Monitoring &amp; Action Console &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 28px; background-color: #0A0F1D; border-top: 1px solid #1E293B; font-size: 11px; line-height: 1.6; color: #64748B; text-align: center;">
              Dispatched automatically to ${recipients.length} DevOps on-call recipients: [${recipients.join(', ')}]
              <br>
              Multi-Cloud Infrastructure &bull; Docker &bull; K8s &bull; Jenkins &bull; SonarQube &bull; Trivy &bull; Ansible &bull; Terraform &bull; Maven
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // 1. Dispatch Email via Gmail SMTP
    const transporter = getTransporter();
    const sendResults = await Promise.allSettled(
      recipients.map((recipientEmail) =>
        transporter.sendMail({
          from: `"Multi-Cloud DevOps Center" <${sender}>`,
          to: recipientEmail,
          subject,
          text: textContent,
          html: htmlContent,
        })
      )
    );

    const fulfilled = sendResults.filter(
      (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled'
    );
    const messageId = fulfilled[0]?.value?.messageId || 'devops-msg-' + Date.now();

    // 2. Record In-App Notification in MongoDB
    await Notification.create({
      userId: 'admin',
      alertId: 'devops-' + Date.now(),
      title: `[${event.toolName}] ${event.eventName}: ${event.resourceName}`,
      message: `${event.reason} Location: ${event.locationToFix || 'Host Server'}.`,
      severity: event.severity === 'critical' ? 'critical' : event.severity === 'high' ? 'high' : 'warning',
      provider: event.provider || 'azure',
      resourceName: event.resourceName,
      resourceId: event.resourceId || event.serverName || 'vm01siva-mon',
      metricName: event.category,
      value: event.metrics?.cpu || event.metrics?.exitCode || 1,
      threshold: event.metrics?.threshold || 0,
      type: 'system',
      read: false,
      link: event.link || '/dashboard/notifications',
      emailDeliveryStatus: fulfilled.length > 0 ? 'sent' : 'failed',
      emailDeliveryError: null,
    }).catch(() => null);

    // 3. Record in AlertDelivery History
    await AlertDelivery.create({
      alertId: 'devops-' + Date.now(),
      metricType: `${event.toolName} (${event.category})`,
      metricValue: event.metrics?.cpu || event.metrics?.exitCode || 1,
      threshold: 0,
      severity: event.severity,
      serverName: event.serverName || 'vm01siva-mon',
      provider: (event.provider || 'azure').toLowerCase(),
      resourceId: event.resourceId || event.resourceName,
      recipientsCount: recipients.length,
      recipients,
      deliveryStatus: fulfilled.length > 0 ? 'Delivered' : 'Failed',
      deliveredAt: new Date(),
      readCount: 0,
      unreadCount: recipients.length,
      link: directLink,
      isTestEmail: false,
      attemptCount: 1,
      smtpResponse: messageId,
      error: null,
    }).catch(() => null);

    return {
      success: fulfilled.length > 0,
      recipientsCount: fulfilled.length,
      recipients,
      messageId,
    };
  } catch (err: any) {
    console.error('[DevOpsAlertDispatcher] Error:', err);
    return {
      success: false,
      recipientsCount: 0,
      recipients: [],
      error: err.message || 'Failed to dispatch DevOps alert',
    };
  }
}
