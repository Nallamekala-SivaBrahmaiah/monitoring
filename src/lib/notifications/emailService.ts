import nodemailer from 'nodemailer';

export interface EmailAlertPayload {
  serverName: string;
  resourceId: string;
  ipAddress?: string;
  provider: string;
  region?: string;
  metricType: 'CPU' | 'Memory' | 'Disk';
  actualUsage: number;
  threshold: number;
  recoveryThreshold?: string | number;
  diskMount?: string;
  severity: 'critical' | 'high' | 'warning' | 'info' | string;
  triggeredTime: Date | string;
  recoveryTime?: Date | string;
  resourceLink?: string;
  escalationTier?: number;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipients?: string[];
}

/**
 * Normalizes cloud provider name:
 * AWS -> "AWS"
 * Azure -> "Azure"
 * SSH Server / Linux -> "SSH Server"
 */
export function formatCloudProvider(provider?: string): string {
  if (!provider) return 'SSH Server';
  const p = provider.toLowerCase().trim();
  if (p === 'aws' || p.includes('ec2') || p.includes('amazon')) return 'AWS';
  if (p === 'azure') return 'Azure';
  if (p === 'ssh' || p === 'server' || p === 'linux' || p.includes('ssh')) return 'SSH Server';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * Formats a timestamp into human-readable UTC string
 * Example: Nov 02, 2026, 14:15:00 UTC
 */
export function formatTimestamp(d?: Date | string): string {
  if (!d) return new Date().toUTCString();
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    return (
      dateObj.toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }) + ' UTC'
    );
  } catch {
    return String(d);
  }
}

/**
 * Determines public application base URL (avoids localhost in production emails)
 */
export function getAppBaseUrl(): string {
  const envUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return (envUrl || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Generates direct resource details link for notifications
 */
export function getResourceDetailsUrl(
  provider?: string,
  resourceType?: string,
  resourceId?: string,
  customLink?: string
): string {
  const baseUrl = getAppBaseUrl();
  if (customLink && customLink.startsWith('http')) {
    return customLink;
  }
  if (customLink) {
    return `${baseUrl}${customLink.startsWith('/') ? '' : '/'}${customLink}`;
  }

  const p = (provider || '').toLowerCase();
  const rType = (resourceType || '').toLowerCase();

  if (p === 'aws' || rType.includes('ec2')) {
    return `${baseUrl}/dashboard/ec2`;
  }
  if (p === 'azure' || rType.includes('azure')) {
    return `${baseUrl}/dashboard/azure-vms`;
  }
  if (p === 'ssh' || p.includes('server') || rType.includes('server')) {
    return `${baseUrl}/dashboard/servers`;
  }
  return `${baseUrl}/dashboard/alerts`;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.GMAIL_USER || 'nallasiva552@gmail.com';
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!pass) {
    throw new Error('GMAIL_APP_PASSWORD is not configured in the environment.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Resolves recipient list: prioritizes custom array, falls back to enabled DevOps recipients in database,
 * and finally to ALERT_EMAIL_TO / GMAIL_USER.
 */
export async function resolveRecipients(customRecipients?: string[]): Promise<string[]> {
  if (Array.isArray(customRecipients) && customRecipients.length > 0) {
    const valid = customRecipients.filter((e) => typeof e === 'string' && e.trim().length > 0);
    if (valid.length > 0) return valid;
  }
  try {
    const DevOpsRecipient = (await import('@/models/DevOpsRecipient')).default;
    const docs = await DevOpsRecipient.find({ enabled: { $ne: false } }).lean();
    const recipients = docs.map((d: any) => d.email).filter(Boolean);
    if (recipients.length > 0) {
      return recipients;
    }
  } catch (err) {
    // If DB error, fallback
  }
  const defaultTo = process.env.ALERT_EMAIL_TO || process.env.GMAIL_USER || '';
  return defaultTo
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Verify SMTP connection
 */
export async function verifySmtpConnection(): Promise<{
  success: boolean;
  status: 'Connected' | 'Disconnected' | 'Error';
  error?: string;
  host: string;
  port: number;
  secure: boolean;
  service: string;
}> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const service = `${host}:${port} (${secure ? 'SSL' : 'STARTTLS'})`;

  try {
    const transporter = getTransporter();
    await transporter.verify();
    return {
      success: true,
      status: 'Connected',
      host,
      port,
      secure,
      service,
    };
  } catch (err: any) {
    console.error('[EmailService] SMTP verification failed:', err.message);
    return {
      success: false,
      status: 'Error',
      error: err.message || 'SMTP connection failed',
      host,
      port,
      secure,
      service,
    };
  }
}

/**
 * Send an alert email when a threshold is exceeded
 */
export async function sendAlertEmail(
  payload: EmailAlertPayload,
  recipients?: string[]
): Promise<EmailResult> {
  const toList = await resolveRecipients(recipients);
  if (toList.length === 0) {
    return { success: false, error: 'No enabled recipients configured', recipients: [] };
  }
  const sender = process.env.GMAIL_USER || 'nallasiva552@gmail.com';

  const rawSeverity = (payload.severity || 'warning').toLowerCase();
  const severityUpper =
    rawSeverity === 'critical' ? 'CRITICAL' : rawSeverity === 'high' ? 'HIGH' : 'WARNING';
  const severityTitle =
    severityUpper === 'CRITICAL' ? 'Critical' : severityUpper === 'HIGH' ? 'High' : 'Warning';
  const severityColor =
    severityUpper === 'CRITICAL' ? '#EF4444' : severityUpper === 'HIGH' ? '#F97316' : '#F59E0B';

  const subject = `[${severityUpper}] ${payload.metricType} Usage ${payload.actualUsage}% - ${payload.serverName}`;

  const formattedTime = formatTimestamp(payload.triggeredTime);
  const directLink = getResourceDetailsUrl(
    payload.provider,
    undefined,
    payload.resourceId,
    payload.resourceLink
  );

  const providerFormatted = formatCloudProvider(payload.provider);
  const hostId = payload.resourceId || payload.ipAddress || payload.serverName;
  const regionDisplay = payload.region || 'global';
  const isDisk = payload.metricType === 'Disk';
  const mountPoint = payload.diskMount || '/';

  // Plain-text formatted email
  const textContent = `
${severityUpper} ALERT — Multi-Cloud Monitoring

### ${payload.metricType} usage on ${payload.serverName} reached ${payload.actualUsage}%

The measured **${payload.metricType} utilization** on **${payload.serverName}** has exceeded the configured warning threshold of **${payload.threshold}%.**

| Field | Value |
|---|---|
| Server / VM Name | ${payload.serverName} |
| Current Usage | ${payload.actualUsage}% |
| Configured Threshold | ${payload.threshold}% |
${isDisk ? `| Disk Mount | ${mountPoint} |\n` : ''}| Cloud Provider | ${providerFormatted} |
| Region / Location | ${regionDisplay} |
| Resource / Host ID | ${hostId} |
| Alert Severity | ${severityTitle} |
| Alert Status | Active |
| Triggered Time | ${formattedTime} |

[Inspect Resource in Monitoring Console →](${directLink})

You are receiving this email because you are a configured DevOps alert recipient.

Multi-Cloud Infrastructure Monitoring Platform • Automated Real-Time Alerting
`.trim();

  // HTML formatted email
  const diskMountRowHtml = isDisk
    ? `
      <tr style="border-bottom: 1px solid #1E293B;">
        <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Disk Mount</td>
        <td style="padding: 10px 16px; color: #FFFFFF; font-weight: 600; font-family: monospace;">${mountPoint}</td>
      </tr>`
    : '';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B1120; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #111A2E; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 28px; background-color: #0F172A; border-bottom: 2px solid ${severityColor};">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 5px 12px; background-color: ${severityColor}20; color: ${severityColor}; border: 1px solid ${severityColor}40; border-radius: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${severityUpper} ALERT — Multi-Cloud Monitoring
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <h2 style="margin: 0; font-size: 21px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                      ${payload.metricType} usage on <span style="color: #60A5FA;">${payload.serverName}</span> reached <span style="color: ${severityColor};">${payload.actualUsage}%</span>
                    </h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 22px 0; font-size: 15px; line-height: 1.6; color: #CBD5E1;">
                The measured <strong>${payload.metricType} utilization</strong> on <strong>${payload.serverName}</strong> has exceeded the configured warning threshold of <strong>${payload.threshold}%</strong>.
              </p>

              <!-- Metrics Table -->
              <table width="100%" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; background-color: #0D1526; border: 1px solid #1E293B; border-radius: 8px; margin-bottom: 26px; overflow: hidden; font-size: 13px;">
                <thead>
                  <tr style="background-color: #162036; border-bottom: 1px solid #22324F;">
                    <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; width: 44%;">Field</th>
                    <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Server / VM Name</td>
                    <td style="padding: 10px 16px; color: #FFFFFF; font-weight: 600;">${payload.serverName}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Current Usage</td>
                    <td style="padding: 10px 16px; color: ${severityColor}; font-weight: 700; font-size: 15px; font-family: monospace;">${payload.actualUsage}%</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Configured Threshold</td>
                    <td style="padding: 10px 16px; color: #CBD5E1; font-family: monospace;">${payload.threshold}%</td>
                  </tr>
                  ${diskMountRowHtml}
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Cloud Provider</td>
                    <td style="padding: 10px 16px; color: #FFFFFF; font-weight: 600;">${providerFormatted}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Region / Location</td>
                    <td style="padding: 10px 16px; color: #FFFFFF;">${regionDisplay}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Resource / Host ID</td>
                    <td style="padding: 10px 16px; color: #CBD5E1; font-family: monospace; font-size: 12px;">${hostId}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Alert Severity</td>
                    <td style="padding: 10px 16px; color: ${severityColor}; font-weight: 700;">${severityTitle}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Alert Status</td>
                    <td style="padding: 10px 16px; color: #EF4444; font-weight: 700;">Active</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Triggered Time</td>
                    <td style="padding: 10px 16px; color: #CBD5E1;">${formattedTime}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Action Button -->
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <a href="${directLink}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 30px; border-radius: 8px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      Inspect Resource in Monitoring Console &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color: #0A0F1D; border-top: 1px solid #1E293B; font-size: 12px; line-height: 1.6; color: #64748B; text-align: center;">
              You are receiving this email because you are a configured DevOps alert recipient.
              <br>
              Multi-Cloud Infrastructure Monitoring Platform &bull; Automated Real-Time Alerting
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  let attempt = 0;
  const maxAttempts = 2;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: `"Cloud Infrastructure Monitor" <${sender}>`,
        to: toList,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(
        `[EmailService] ✉️ Alert email successfully delivered for ${payload.serverName} (attempt ${attempt}/${maxAttempts}, messageId: ${info.messageId}) to [${toList.join(', ')}]`
      );
      return { success: true, messageId: info.messageId, recipients: toList };
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[EmailService] ⚠️ Attempt ${attempt}/${maxAttempts} failed to send alert email for ${payload.serverName}: ${err.message}`
      );
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  console.error(
    `[EmailService] ❌ All ${maxAttempts} attempts failed to deliver alert email for ${payload.serverName}: ${lastError?.message}`
  );
  return { success: false, error: lastError?.message || 'SMTP delivery failed after retries', recipients: toList };
}

/**
 * Send a resolution / recovery email when usage falls back below threshold
 */
export async function sendResolvedEmail(
  payload: EmailAlertPayload,
  recipients?: string[]
): Promise<EmailResult> {
  const toList = await resolveRecipients(recipients);
  if (toList.length === 0) {
    return { success: false, error: 'No enabled recipients configured', recipients: [] };
  }
  const sender = process.env.GMAIL_USER || 'nallasiva552@gmail.com';

  const subject = `[RECOVERY] ${payload.metricType} Usage ${payload.actualUsage}% - ${payload.serverName}`;

  const formattedRecoveryTime = formatTimestamp(payload.recoveryTime || new Date());
  const directLink = getResourceDetailsUrl(
    payload.provider,
    undefined,
    payload.resourceId,
    payload.resourceLink
  );

  const providerFormatted = formatCloudProvider(payload.provider);
  const hostId = payload.resourceId || payload.ipAddress || payload.serverName;
  const regionDisplay = payload.region || 'global';
  const isDisk = payload.metricType === 'Disk';
  const mountPoint = payload.diskMount || '/';
  const recoveryThresholdDisplay = payload.recoveryThreshold || `< ${payload.threshold}%`;

  // Plain-text formatted email
  const textContent = `
RECOVERY NOTICE — Multi-Cloud Monitoring

### ${payload.metricType} usage on ${payload.serverName} has returned to normal

The measured **${payload.metricType} utilization** on **${payload.serverName}** has dropped below the configured recovery threshold. This alert is now resolved.

| Field | Value |
|---|---|
| Server / VM Name | ${payload.serverName} |
| Current Usage | ${payload.actualUsage}% |
| Alert Threshold | ${payload.threshold}% |
| Recovery Threshold | ${recoveryThresholdDisplay} |
${isDisk ? `| Disk Mount | ${mountPoint} |\n` : ''}| Cloud Provider | ${providerFormatted} |
| Region / Location | ${regionDisplay} |
| Resource / Host ID | ${hostId} |
| Alert Severity | Recovered |
| Alert Status | Resolved |
| Recovery Time | ${formattedRecoveryTime} |

[Inspect Resource in Monitoring Console →](${directLink})

You are receiving this email because you are a configured DevOps alert recipient.

Multi-Cloud Infrastructure Monitoring Platform • Automated Real-Time Alerting
`.trim();

  // HTML formatted email
  const diskMountRowHtml = isDisk
    ? `
      <tr style="border-bottom: 1px solid #1E293B;">
        <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Disk Mount</td>
        <td style="padding: 10px 16px; color: #FFFFFF; font-weight: 600; font-family: monospace;">${mountPoint}</td>
      </tr>`
    : '';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B1120; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #111A2E; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 28px; background-color: #0F172A; border-bottom: 2px solid #10B981;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 5px 12px; background-color: #10B98120; color: #10B981; border: 1px solid #10B98140; border-radius: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                      RECOVERY NOTICE — Multi-Cloud Monitoring
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <h2 style="margin: 0; font-size: 21px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                      ${payload.metricType} usage on <span style="color: #60A5FA;">${payload.serverName}</span> has returned to normal
                    </h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 22px 0; font-size: 15px; line-height: 1.6; color: #CBD5E1;">
                The measured <strong>${payload.metricType} utilization</strong> on <strong>${payload.serverName}</strong> has dropped below the configured recovery threshold. This alert is now resolved.
              </p>

              <!-- Metrics Table -->
              <table width="100%" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; background-color: #0D1526; border: 1px solid #1E293B; border-radius: 8px; margin-bottom: 26px; overflow: hidden; font-size: 13px;">
                <thead>
                  <tr style="background-color: #162036; border-bottom: 1px solid #22324F;">
                    <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; width: 44%;">Field</th>
                    <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Server / VM Name</td>
                    <td style="padding: 10px 16px; color: #FFFFFF; font-weight: 600;">${payload.serverName}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Current Usage</td>
                    <td style="padding: 10px 16px; color: #10B981; font-weight: 700; font-size: 15px; font-family: monospace;">${payload.actualUsage}%</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Alert Threshold</td>
                    <td style="padding: 10px 16px; color: #CBD5E1; font-family: monospace;">${payload.threshold}%</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Recovery Threshold</td>
                    <td style="padding: 10px 16px; color: #10B981; font-family: monospace; font-weight: 600;">${recoveryThresholdDisplay}</td>
                  </tr>
                  ${diskMountRowHtml}
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Cloud Provider</td>
                    <td style="padding: 10px 16px; color: #FFFFFF; font-weight: 600;">${providerFormatted}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Region / Location</td>
                    <td style="padding: 10px 16px; color: #FFFFFF;">${regionDisplay}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Resource / Host ID</td>
                    <td style="padding: 10px 16px; color: #CBD5E1; font-family: monospace; font-size: 12px;">${hostId}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Alert Severity</td>
                    <td style="padding: 10px 16px; color: #10B981; font-weight: 700;">Recovered</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1E293B;">
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Alert Status</td>
                    <td style="padding: 10px 16px; color: #10B981; font-weight: 700;">Resolved</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; color: #94A3B8; font-weight: 500;">Recovery Time</td>
                    <td style="padding: 10px 16px; color: #CBD5E1;">${formattedRecoveryTime}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Action Button -->
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <a href="${directLink}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 30px; border-radius: 8px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      Inspect Resource in Monitoring Console &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color: #0A0F1D; border-top: 1px solid #1E293B; font-size: 12px; line-height: 1.6; color: #64748B; text-align: center;">
              You are receiving this email because you are a configured DevOps alert recipient.
              <br>
              Multi-Cloud Infrastructure Monitoring Platform &bull; Automated Real-Time Alerting
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  let attempt = 0;
  const maxAttempts = 2;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: `"Cloud Infrastructure Monitor" <${sender}>`,
        to: toList,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(
        `[EmailService] ✉️ Resolved/Recovery email sent for ${payload.serverName} (attempt ${attempt}/${maxAttempts}, messageId: ${info.messageId}) to [${toList.join(', ')}]`
      );
      return { success: true, messageId: info.messageId, recipients: toList };
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[EmailService] ⚠️ Attempt ${attempt}/${maxAttempts} failed to send resolved email for ${payload.serverName}: ${err.message}`
      );
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  console.error(
    `[EmailService] ❌ Failed to deliver resolved email for ${payload.serverName}: ${lastError?.message}`
  );
  return { success: false, error: lastError?.message || 'SMTP delivery failed', recipients: toList };
}

/**
 * Send a verification test email to one or multiple recipients
 */
export async function sendTestEmail(targetRecipient?: string | string[]): Promise<EmailResult> {
  const recipientsList = Array.isArray(targetRecipient)
    ? targetRecipient
    : typeof targetRecipient === 'string' && targetRecipient.trim()
    ? [targetRecipient.trim()]
    : undefined;

  const toList = await resolveRecipients(recipientsList);
  if (toList.length === 0) {
    return { success: false, error: 'No enabled DevOps recipients configured for test email', recipients: [] };
  }
  const sender = process.env.GMAIL_USER || 'nallasiva552@gmail.com';

  const subject = `[TEST] Multi-Cloud Monitoring SMTP Alert Verification`;
  const textContent = `
This is a test notification confirming that Gmail SMTP email alerting is correctly configured and working.

SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}
SMTP Port: ${process.env.SMTP_PORT || '587'}
Delivered To: ${toList.join(', ')}
Timestamp: ${new Date().toISOString()}

All CPU, Memory, and Disk usage threshold alerts (>= 70%) will be automatically delivered to this address.
--
You are receiving this email because you are a configured DevOps alert recipient.
Multi-Cloud Infrastructure Monitoring Platform • Automated Real-Time Alerting
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B1120; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #111A2E; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 24px 28px; background-color: #0F172A; border-bottom: 2px solid #3B82F6;">
              <span style="display: inline-block; padding: 4px 10px; background-color: #3B82F620; color: #60A5FA; border: 1px solid #3B82F640; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                SMTP TEST SUCCESSFUL
              </span>
              <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #FFFFFF;">
                Gmail Alert System is Active &amp; Ready
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                This test email confirms that your Gmail App Password and SMTP connection are configured correctly.
              </p>
              <div style="background-color: #0D1526; border: 1px solid #1E293B; border-radius: 8px; padding: 14px 18px; font-size: 12px; font-family: monospace; color: #94A3B8; margin-bottom: 20px;">
                <div>SMTP Server: <strong style="color: #FFFFFF;">${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || '587'}</strong></div>
                <div>Notification Service: <strong style="color: #60A5FA;">Multi-Cloud Alert System</strong></div>
                <div>Delivered To: <strong style="color: #10B981;">${toList.join(', ')}</strong></div>
                <div>Timestamp: ${new Date().toISOString()}</div>
              </div>
              <p style="margin: 0; font-size: 13px; color: #94A3B8;">
                Real-time alerts for CPU, Memory, or Disk usage exceeding 70% will be sent to this inbox automatically.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background-color: #0A0F1D; border-top: 1px solid #1E293B; font-size: 11px; color: #64748B; text-align: center;">
              You are receiving this email because you are a configured DevOps alert recipient.
              <br>Multi-Cloud Infrastructure Monitoring Platform &bull; Automated Real-Time Alerting
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Cloud Infrastructure Monitor" <${sender}>`,
      to: toList,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId, recipients: toList };
  } catch (err: any) {
    console.error('[EmailService] Test email failed:', err.message);
    return { success: false, error: err.message, recipients: toList };
  }
}
