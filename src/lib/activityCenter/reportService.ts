import nodemailer from 'nodemailer';
import connectToDatabase from '@/lib/mongodb';
import DailyReport, { IDailyReport } from '@/models/DailyReport';
import ReportRecipient from '@/models/ReportRecipient';
import WorkSession from '@/models/WorkSession';
import ActivityEvent from '@/models/ActivityEvent';
import DeploymentRecord from '@/models/DeploymentRecord';
import TroubleshootingRecord from '@/models/TroubleshootingRecord';
import { getOrCreateSettings, getKolkataDateString } from './activityService';

/**
 * Creates or retrieves a Nodemailer transporter based on settings or environment variables.
 */
export async function getEmailTransporter() {
  const settings = await getOrCreateSettings();

  const host = settings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(settings.smtpPort || process.env.SMTP_PORT || 587);
  const secure = Boolean(settings.smtpSecure || process.env.SMTP_SECURE === 'true');
  const user = settings.smtpUser || process.env.GMAIL_USER || '';
  const pass = settings.smtpPassword || process.env.GMAIL_APP_PASSWORD || '';

  if (!user || !pass) {
    throw new Error('SMTP credentials are not configured. Please set GMAIL_USER/GMAIL_APP_PASSWORD or configure SMTP in Report Settings.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return { transporter, user, senderName: settings.senderName || 'Multi-Cloud DevOps Center' };
}

/**
 * Compiles a complete Daily DevOps Activity Report for the given date.
 */
export async function compileDailyReport(dateStr?: string, options?: { tomorrowPlan?: string; notes?: string }) {
  await connectToDatabase();
  const targetDate = dateStr || getKolkataDateString();

  const startOfDay = new Date(`${targetDate}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999+05:30`);

  // 1. Fetch work session
  const session = await WorkSession.findOne({ workDate: targetDate }).sort({ createdAt: -1 });

  // 2. Fetch all events for this date
  const events = await ActivityEvent.find({
    timestamp: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ timestamp: 1 }).lean();

  const awsActivities = events.filter((e) => e.platform === 'aws');
  const azureActivities = events.filter((e) => e.platform === 'azure');
  const onPremActivities = events.filter((e) => e.platform === 'onprem');
  const appActivities = events.filter((e) => e.platform === 'application');
  const successfulActivities = events.filter((e) => e.status === 'success');
  const failedActivities = events.filter((e) => e.status === 'failed');

  // 3. Fetch deployments
  const deployments = await DeploymentRecord.find({
    startTime: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ startTime: -1 }).lean();

  // 4. Fetch troubleshooting
  const troubleshooting = await TroubleshootingRecord.find({
    startedAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ startedAt: -1 }).lean();

  // 5. Fetch pending tasks
  const pendingTasks = await TroubleshootingRecord.find({
    status: { $in: ['Open', 'In Progress', 'Unresolved'] },
  }).lean();

  // 6. Active Recipients
  const recipientsList = await ReportRecipient.find({ isActive: true }).lean();

  const employeeName = session?.userName || 'DevOps Engineer';
  const employeeId = session?.userId || 'devops-01';
  const activeMinutes = session?.totalActiveMinutes || 0;
  const hours = Math.floor(activeMinutes / 60);
  const mins = activeMinutes % 60;
  const activeDurationStr = `${hours}h ${mins}m`;

  const reportId = `report_${targetDate.replace(/-/g, '')}_${Math.random().toString(36).substring(2, 6)}`;

  const summary = {
    totalActivities: events.length,
    successfulActivities: successfulActivities.length,
    failedActivities: failedActivities.length,
    awsActivities: awsActivities.length,
    azureActivities: azureActivities.length,
    onPremActivities: onPremActivities.length,
    appActivities: appActivities.length,
    deploymentsCount: deployments.length,
    troubleshootingCount: troubleshooting.length,
    resolvedCount: troubleshooting.filter((t) => t.status === 'Resolved').length,
    pendingCount: pendingTasks.length,
  };

  const sections = {
    awsActivities,
    azureActivities,
    onPremActivities,
    appActivities,
    deployments,
    troubleshooting,
    pendingTasks,
  };

  const tomorrowPlan = options?.tomorrowPlan || 'Continue cloud infrastructure optimization, monitor CI/CD pipelines, and resolve open alerts.';

  // Build clean corporate HTML
  const htmlContent = generateCorporateEmailHtml({
    reportDate: targetDate,
    employeeName,
    employeeId,
    project: session?.project || 'Multi-Cloud Infrastructure',
    startTime: session?.startTime ? new Date(session.startTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : '09:30 AM',
    endTime: session?.endTime ? new Date(session.endTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : '06:30 PM',
    activeDurationStr,
    dailyObjective: session?.dailyObjective || 'Multi-Cloud cluster maintenance and server provisioning.',
    tomorrowPlan,
    summary,
    sections,
  });

  // Upsert or save report record in database
  let report = await DailyReport.findOne({ reportDate: targetDate });
  if (!report) {
    report = new DailyReport({
      reportId,
      reportDate: targetDate,
      employeeName,
      employeeId,
      workSessionId: session?._id.toString() || null,
      startTime: session?.startTime || null,
      endTime: session?.endTime || null,
      activeMinutes,
      dailyObjective: session?.dailyObjective || '',
      tomorrowPlan,
      summary,
      sections,
      recipients: recipientsList.map((r) => ({
        email: r.email,
        name: r.name,
        preference: r.deliveryPreference || 'TO',
        status: 'pending',
      })),
      deliveryStatus: 'draft',
      deliveryMode: 'automatic',
      htmlContent,
      pdfAvailable: true,
      generatedAt: new Date(),
    });
  } else {
    report.summary = summary;
    report.sections = sections;
    report.htmlContent = htmlContent;
    report.tomorrowPlan = tomorrowPlan;
    report.activeMinutes = activeMinutes;
    report.generatedAt = new Date();
  }

  await report.save();
  return report;
}

/**
 * Sends a compiled daily report via email to configured active recipients.
 */
export async function sendDailyReportEmail(reportId: string) {
  await connectToDatabase();
  const report = await DailyReport.findOne({ reportId });
  if (!report) {
    throw new Error(`Report ${reportId} not found.`);
  }

  const { transporter, user, senderName } = await getEmailTransporter();

  // Load recipients
  const activeRecipients = await ReportRecipient.find({ isActive: true }).lean();
  if (activeRecipients.length === 0) {
    throw new Error('No active email recipients configured. Please add recipients in Email Recipients tab.');
  }

  const toList = activeRecipients.filter((r) => r.deliveryPreference === 'TO').map((r) => r.email);
  const ccList = activeRecipients.filter((r) => r.deliveryPreference === 'CC').map((r) => r.email);
  const bccList = activeRecipients.filter((r) => r.deliveryPreference === 'BCC').map((r) => r.email);

  if (toList.length === 0 && activeRecipients.length > 0) {
    toList.push(activeRecipients[0].email);
  }

  const mailOptions = {
    from: `"${senderName}" <${user}>`,
    to: toList.join(', '),
    cc: ccList.length > 0 ? ccList.join(', ') : undefined,
    bcc: bccList.length > 0 ? bccList.join(', ') : undefined,
    subject: `Daily DevOps Activity Report – ${report.employeeName} – ${report.reportDate}`,
    html: report.htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    report.deliveryStatus = 'sent';
    report.sentAt = new Date();
    report.deliveryError = '';

    // Update recipients delivery status
    report.recipients = activeRecipients.map((r) => ({
      email: r.email,
      name: r.name,
      preference: r.deliveryPreference || 'TO',
      status: 'delivered',
    }));

    await report.save();

    // Update last email sent date on recipients
    await ReportRecipient.updateMany(
      { email: { $in: activeRecipients.map((r) => r.email) } },
      { lastEmailSentAt: new Date() }
    );

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      recipientsCount: toList.length + ccList.length + bccList.length,
    };
  } catch (err: any) {
    report.deliveryStatus = 'failed';
    report.deliveryError = err.message || 'SMTP delivery failed';
    await report.save();
    throw err;
  }
}

/**
 * Sends a single test email to verify SMTP connectivity and recipient formatting.
 */
export async function sendTestEmail(targetEmail: string) {
  const { transporter, user, senderName } = await getEmailTransporter();

  const testHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1329; color: #e2e8f0; padding: 24px; border-radius: 12px; border: 1px solid #06b6d4;">
    <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
      <h2 style="color: #38bdf8; margin: 0; font-size: 20px;">Multi-Cloud Monitoring Platform</h2>
      <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">DevOps Activity Center • SMTP Connectivity Test</p>
    </div>
    <div style="background: #111a2e; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0; color: #10b981; font-weight: bold; font-size: 14px;">✓ SMTP Connection Verified Successfully</p>
      <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 13px;">This test email confirms that your reporting pipeline is active and ready to deliver Daily DevOps Activity Reports to designated managers and leads.</p>
    </div>
    <table style="width: 100%; font-size: 12px; color: #94a3b8; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; font-weight: bold;">Sender:</td><td style="color: #f1f5f9;">${user}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: bold;">Recipient:</td><td style="color: #f1f5f9;">${targetEmail}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: bold;">Timestamp:</td><td style="color: #f1f5f9;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td></tr>
    </table>
  </div>
  `;

  const info = await transporter.sendMail({
    from: `"${senderName}" <${user}>`,
    to: targetEmail,
    subject: `[TEST] DevOps Activity Center Email Verification – ${new Date().toLocaleDateString()}`,
    html: testHtml,
  });

  return { success: true, messageId: info.messageId };
}

/**
 * Generates the clean executive HTML template for daily email delivery.
 */
function generateCorporateEmailHtml(data: {
  reportDate: string;
  employeeName: string;
  employeeId: string;
  project: string;
  startTime: string;
  endTime: string;
  activeDurationStr: string;
  dailyObjective: string;
  tomorrowPlan: string;
  summary: any;
  sections: any;
}): string {
  const { reportDate, employeeName, project, startTime, endTime, activeDurationStr, dailyObjective, tomorrowPlan, summary, sections } = data;

  const renderActivityRow = (act: any) => `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 8px 10px; font-family: monospace; font-size: 11px; color: #38bdf8;">
        ${new Date(act.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
      </td>
      <td style="padding: 8px 10px; font-weight: bold; font-size: 12px; color: #f8fafc;">
        ${act.action}
      </td>
      <td style="padding: 8px 10px; font-size: 12px; color: #cbd5e1;">
        ${act.resourceName || act.resourceId}
      </td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: center;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; text-transform: uppercase; ${
          act.status === 'success'
            ? 'background: #064e3b; color: #34d399; border: 1px solid #059669;'
            : act.status === 'failed'
            ? 'background: #4c0519; color: #fb7185; border: 1px solid #e11d48;'
            : 'background: #1e1b4b; color: #a5b4fc; border: 1px solid #6366f1;'
        }">
          ${act.status}
        </span>
      </td>
      <td style="padding: 8px 10px; font-size: 11px; color: #94a3b8;">
        ${act.source || 'Application Event'}
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Daily DevOps Activity Report – ${employeeName} – ${reportDate}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #050b1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <div style="max-width: 860px; margin: 0 auto; background: #0c1427; border: 1px solid #0891b2; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #083344 0%, #0f172a 100%); padding: 28px 32px; border-bottom: 1px solid #164e63;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td>
            <div style="display: inline-block; padding: 4px 10px; background: rgba(6, 182, 212, 0.15); border: 1px solid #06b6d4; border-radius: 20px; color: #22d3ee; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
              Multi-Cloud Platform • Daily Report
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Daily DevOps Activity Report</h1>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Official enterprise activity summary, cloud operations, deployment logs, and troubleshooting status.</p>
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <div style="font-family: monospace; font-size: 14px; font-weight: bold; color: #38bdf8; background: #0b1528; padding: 8px 14px; border-radius: 8px; border: 1px solid #1e293b; display: inline-block;">
              ${reportDate}
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div style="padding: 28px 32px;">
      
      <!-- Section A: Employee Details -->
      <div style="background: #111a2e; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 14px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #06b6d4;">
          A. Employee & Work Session Details
        </h3>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #94a3b8; width: 25%;">Employee Name:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: bold;">${employeeName}</td>
            <td style="padding: 6px 0; color: #94a3b8; width: 25%;">Report Date:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: bold;">${reportDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;">Primary Project:</td>
            <td style="padding: 6px 0; color: #ffffff;">${project}</td>
            <td style="padding: 6px 0; color: #94a3b8;">Active Duration:</td>
            <td style="padding: 6px 0; color: #10b981; font-weight: bold;">${activeDurationStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;">Working Hours:</td>
            <td style="padding: 6px 0; color: #ffffff;">${startTime} – ${endTime} (IST)</td>
            <td style="padding: 6px 0; color: #94a3b8;">Timezone:</td>
            <td style="padding: 6px 0; color: #cbd5e1;">Asia/Kolkata (IST)</td>
          </tr>
        </table>
        ${
          dailyObjective
            ? `<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #1e293b;">
                <span style="font-size: 11px; text-transform: uppercase; color: #06b6d4; font-weight: bold;">Daily Objective:</span>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #e2e8f0; line-height: 1.5;">${dailyObjective}</p>
              </div>`
            : ''
        }
      </div>

      <!-- Section B: Daily Summary Stat Cards -->
      <h3 style="margin: 0 0 14px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #06b6d4;">
        B. Executive Daily Summary
      </h3>
      <table style="width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 24px;">
        <tr>
          <td style="background: #111a2e; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; text-align: center; width: 25%;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Total Activities</div>
            <div style="font-size: 22px; font-weight: 800; color: #38bdf8; margin-top: 4px;">${summary.totalActivities}</div>
          </td>
          <td style="background: #111a2e; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; text-align: center; width: 25%;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Success Rate</div>
            <div style="font-size: 22px; font-weight: 800; color: #10b981; margin-top: 4px;">
              ${summary.totalActivities > 0 ? Math.round((summary.successfulActivities / summary.totalActivities) * 100) : 100}%
            </div>
          </td>
          <td style="background: #111a2e; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; text-align: center; width: 25%;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Deployments</div>
            <div style="font-size: 22px; font-weight: 800; color: #a855f7; margin-top: 4px;">${summary.deploymentsCount}</div>
          </td>
          <td style="background: #111a2e; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; text-align: center; width: 25%;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Troubleshooting</div>
            <div style="font-size: 22px; font-weight: 800; color: #f59e0b; margin-top: 4px;">${summary.troubleshootingCount}</div>
          </td>
        </tr>
      </table>

      <!-- Section C: AWS Activities -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #f59e0b;">
          C. AWS Cloud Operations (${sections.awsActivities.length})
        </h3>
        ${
          sections.awsActivities.length > 0
            ? `<table style="width: 100%; border-collapse: collapse; background: #111a2e; border-radius: 10px; overflow: hidden; border: 1px solid #1e293b;">
                <thead>
                  <tr style="background: #090f1d; color: #94a3b8; font-size: 11px; text-transform: uppercase; text-align: left;">
                    <th style="padding: 10px;">Time</th>
                    <th style="padding: 10px;">Operation</th>
                    <th style="padding: 10px;">Resource</th>
                    <th style="padding: 10px; text-align: center;">Status</th>
                    <th style="padding: 10px;">Source</th>
                  </tr>
                </thead>
                <tbody>
                  ${sections.awsActivities.map(renderActivityRow).join('')}
                </tbody>
              </table>`
            : `<div style="padding: 14px; background: #111a2e; border: 1px solid #1e293b; border-radius: 8px; color: #94a3b8; font-size: 12px;">No AWS cloud modifications performed today.</div>`
        }
      </div>

      <!-- Section D: Azure Activities -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #0284c7;">
          D. Azure Cloud Operations (${sections.azureActivities.length})
        </h3>
        ${
          sections.azureActivities.length > 0
            ? `<table style="width: 100%; border-collapse: collapse; background: #111a2e; border-radius: 10px; overflow: hidden; border: 1px solid #1e293b;">
                <thead>
                  <tr style="background: #090f1d; color: #94a3b8; font-size: 11px; text-transform: uppercase; text-align: left;">
                    <th style="padding: 10px;">Time</th>
                    <th style="padding: 10px;">Operation</th>
                    <th style="padding: 10px;">Resource</th>
                    <th style="padding: 10px; text-align: center;">Status</th>
                    <th style="padding: 10px;">Source</th>
                  </tr>
                </thead>
                <tbody>
                  ${sections.azureActivities.map(renderActivityRow).join('')}
                </tbody>
              </table>`
            : `<div style="padding: 14px; background: #111a2e; border: 1px solid #1e293b; border-radius: 8px; color: #94a3b8; font-size: 12px;">No Azure virtual machine or network modifications performed today.</div>`
        }
      </div>

      <!-- Section E: On-Premises & Server Operations -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #10b981;">
          E. On-Premises & Linux Server Operations (${sections.onPremActivities.length})
        </h3>
        ${
          sections.onPremActivities.length > 0
            ? `<table style="width: 100%; border-collapse: collapse; background: #111a2e; border-radius: 10px; overflow: hidden; border: 1px solid #1e293b;">
                <thead>
                  <tr style="background: #090f1d; color: #94a3b8; font-size: 11px; text-transform: uppercase; text-align: left;">
                    <th style="padding: 10px;">Time</th>
                    <th style="padding: 10px;">Operation</th>
                    <th style="padding: 10px;">Server / Node</th>
                    <th style="padding: 10px; text-align: center;">Status</th>
                    <th style="padding: 10px;">Source</th>
                  </tr>
                </thead>
                <tbody>
                  ${sections.onPremActivities.map(renderActivityRow).join('')}
                </tbody>
              </table>`
            : `<div style="padding: 14px; background: #111a2e; border: 1px solid #1e293b; border-radius: 8px; color: #94a3b8; font-size: 12px;">No remote SSH commands or on-premises server changes logged today.</div>`
        }
      </div>

      <!-- Section F: Application Activities -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #8b5cf6;">
          F. Application Module Activities (${sections.appActivities.length})
        </h3>
        ${
          sections.appActivities.length > 0
            ? `<table style="width: 100%; border-collapse: collapse; background: #111a2e; border-radius: 10px; overflow: hidden; border: 1px solid #1e293b;">
                <thead>
                  <tr style="background: #090f1d; color: #94a3b8; font-size: 11px; text-transform: uppercase; text-align: left;">
                    <th style="padding: 10px;">Time</th>
                    <th style="padding: 10px;">Action</th>
                    <th style="padding: 10px;">Component</th>
                    <th style="padding: 10px; text-align: center;">Status</th>
                    <th style="padding: 10px;">Source</th>
                  </tr>
                </thead>
                <tbody>
                  ${sections.appActivities.map(renderActivityRow).join('')}
                </tbody>
              </table>`
            : `<div style="padding: 14px; background: #111a2e; border: 1px solid #1e293b; border-radius: 8px; color: #94a3b8; font-size: 12px;">No pipeline or container build actions performed in modules today.</div>`
        }
      </div>

      <!-- Section G: Deployments -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #ec4899;">
          G. Deployment Details (${sections.deployments.length})
        </h3>
        ${
          sections.deployments.length > 0
            ? `<table style="width: 100%; border-collapse: collapse; background: #111a2e; border-radius: 10px; overflow: hidden; border: 1px solid #1e293b;">
                <thead>
                  <tr style="background: #090f1d; color: #94a3b8; font-size: 11px; text-transform: uppercase; text-align: left;">
                    <th style="padding: 10px;">Application</th>
                    <th style="padding: 10px;">Target Server</th>
                    <th style="padding: 10px;">Env</th>
                    <th style="padding: 10px;">Version / Commit</th>
                    <th style="padding: 10px; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${sections.deployments
                    .map(
                      (d: any) => `
                    <tr style="border-bottom: 1px solid #1e293b;">
                      <td style="padding: 8px 10px; font-weight: bold; color: #fff;">${d.appName}</td>
                      <td style="padding: 8px 10px; font-family: monospace; font-size: 12px; color: #cbd5e1;">${d.targetServer}</td>
                      <td style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #38bdf8;">${d.environment}</td>
                      <td style="padding: 8px 10px; font-family: monospace; font-size: 11px; color: #94a3b8;">${d.buildVersion} ${d.commitId ? `(${d.commitId.substring(0, 7)})` : ''}</td>
                      <td style="padding: 8px 10px; text-align: center;">
                        <span style="padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase; ${
                          d.status === 'successful' ? 'background: #064e3b; color: #34d399;' : 'background: #4c0519; color: #fb7185;'
                        }">${d.status}</span>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>`
            : `<div style="padding: 14px; background: #111a2e; border: 1px solid #1e293b; border-radius: 8px; color: #94a3b8; font-size: 12px;">No production or staging deployments triggered today.</div>`
        }
      </div>

      <!-- Section H: Troubleshooting & Resolved Issues -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #eab308;">
          H. Troubleshooting & Issue Resolutions (${sections.troubleshooting.length})
        </h3>
        ${
          sections.troubleshooting.length > 0
            ? sections.troubleshooting
                .map(
                  (t: any) => `
                <div style="background: #111a2e; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: bold; font-size: 14px; color: #f8fafc;">${t.title}</span>
                    <span style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${
                      t.status === 'Resolved' ? 'background: #064e3b; color: #34d399;' : 'background: #78350f; color: #fde047;'
                    }">${t.status}</span>
                  </div>
                  <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">
                    <strong style="color: #94a3b8;">Resource:</strong> ${t.serverOrResource} &bull; <strong style="color: #94a3b8;">Duration:</strong> ${t.durationMinutes} mins
                  </div>
                  <div style="background: #090f1d; border-radius: 6px; padding: 8px 12px; font-family: monospace; font-size: 11px; color: #f43f5e; margin-bottom: 8px;">
                    ${t.errorMessage}
                  </div>
                  ${t.rootCause ? `<div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;"><strong style="color: #cbd5e1;">Root Cause:</strong> ${t.rootCause}</div>` : ''}
                  ${t.resolutionSteps ? `<div style="font-size: 12px; color: #94a3b8;"><strong style="color: #10b981;">Resolution:</strong> ${t.resolutionSteps}</div>` : ''}
                </div>
              `
                )
                .join('')
            : `<div style="padding: 14px; background: #111a2e; border: 1px solid #1e293b; border-radius: 8px; color: #94a3b8; font-size: 12px;">Zero critical incidents or manual troubleshooting tasks required today. All systems operational.</div>`
        }
      </div>

      <!-- Section I & J: Pending Tasks & Tomorrow's Plan -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 12px; margin-bottom: 24px;">
        <tr>
          <td style="background: #111a2e; border: 1px solid #1e293b; border-radius: 12px; padding: 18px; vertical-align: top; width: 50%;">
            <h4 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #f43f5e; letter-spacing: 0.05em;">
              I. Pending Tasks & Unresolved Items (${sections.pendingTasks.length})
            </h4>
            ${
              sections.pendingTasks.length > 0
                ? `<ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
                    ${sections.pendingTasks.map((p: any) => `<li><strong>${p.title}</strong> (${p.serverOrResource})</li>`).join('')}
                  </ul>`
                : `<p style="margin: 0; font-size: 12px; color: #10b981;">✓ All daily assigned tasks and incidents have been resolved.</p>`
            }
          </td>
          <td style="background: #111a2e; border: 1px solid #1e293b; border-radius: 12px; padding: 18px; vertical-align: top; width: 50%;">
            <h4 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #06b6d4; letter-spacing: 0.05em;">
              J. Tomorrow's Planned Work
            </h4>
            <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
              ${tomorrowPlan}
            </p>
          </td>
        </tr>
      </table>

      <!-- Section K: Report Footer -->
      <div style="border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0;">
          Report Generated: <strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</strong> &bull; Platform: Multi-Cloud Monitoring & DevOps Automation Engine
        </p>
        <p style="margin: 4px 0 0 0;">
          All activities and operation metrics compiled directly from authenticated database telemetry and authorized audit sources.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `;
}
