import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ReportRecipient from '@/models/ReportRecipient';
import ActivityCenterSettings from '@/models/ActivityCenterSettings';
import ActivityAuditLog from '@/models/ActivityAuditLog';
import ActivityEvent from '@/models/ActivityEvent';
import DeploymentRecord from '@/models/DeploymentRecord';
import TroubleshootingRecord from '@/models/TroubleshootingRecord';
import ServerIncident from '@/models/ServerIncident';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import MavenBuild from '@/models/MavenBuild';
import AnsibleExecution from '@/models/AnsibleExecution';
import DockerDeployment from '@/models/DockerDeployment';
import { DevopsToolConfig } from '@/models/DevopsToolConfig';
import { syncExistingActivities } from '@/lib/activityCenter/activityService';
import nodemailer from 'nodemailer';

// GET: Auto-fetch all today's DevOps activities (deployments, troubleshooting, server statuses, events)
export async function GET() {
  try {
    await connectToDatabase();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Sync all historical and live tool operations into ActivityEvent
    await syncExistingActivities();

    const [
      deployments,
      troubleshooting,
      remediations,
      incidents,
      activities,
      servers,
      cloudVms,
      reportRecipients,
      mavenBuilds,
      ansibleExecs,
      dockerDeps,
      devopsTools,
    ] = await Promise.all([
      DeploymentRecord.find({ createdAt: { $gte: startOfDay } }).sort({ createdAt: -1 }).lean(),
      TroubleshootingRecord.find({ createdAt: { $gte: startOfDay } }).sort({ startedAt: -1 }).lean(),
      ActivityEvent.find({ module: 'troubleshooting', createdAt: { $gte: startOfDay } }).sort({ timestamp: -1 }).lean(),
      ServerIncident.find({ createdAt: { $gte: startOfDay } }).sort({ startedAt: -1 }).lean(),
      ActivityEvent.find({ createdAt: { $gte: startOfDay } }).sort({ timestamp: -1 }).limit(100).lean(),
      Server.find().lean(),
      CloudResource.find({ resourceType: { $in: ['vm', 'ec2'] } }).lean(),
      ReportRecipient.find({ $or: [{ status: 'active' }, { isActive: true }] }).lean(),
      MavenBuild.find().sort({ createdAt: -1 }).limit(10).lean(),
      AnsibleExecution.find().sort({ createdAt: -1 }).limit(10).lean(),
      DockerDeployment.find().sort({ createdAt: -1 }).limit(10).lean(),
      DevopsToolConfig.find().lean(),
    ]);

    let disabledSet = new Set<string>();
    try {
      const { default: DevOpsRecipient } = await import('@/models/DevOpsRecipient');
      const disabledDocs = await DevOpsRecipient.find({ enabled: false }).lean();
      disabledSet = new Set(disabledDocs.map((d: any) => (d.email || '').toLowerCase().trim()));
    } catch {}

    const configuredEmails = new Set<string>();
    reportRecipients.forEach((r: any) => {
      const clean = (r.email || '').trim().toLowerCase();
      if (clean && !disabledSet.has(clean)) configuredEmails.add(clean);
    });

    try {
      const { default: DevOpsRecipient } = await import('@/models/DevOpsRecipient');
      const devopsList = await DevOpsRecipient.find({ enabled: true }).lean();
      devopsList.forEach((d: any) => {
        const clean = (d.email || '').trim().toLowerCase();
        if (clean && !disabledSet.has(clean)) configuredEmails.add(clean);
      });
    } catch {}

    const configuredRecipientsList = Array.from(configuredEmails);

    const runningServers = servers.filter((s) => s.status === 'Online').length +
      cloudVms.filter((v) => v.status?.toLowerCase().includes('running')).length;
    const totalServers = servers.length + cloudVms.length;
    const failedServers = totalServers - runningServers;

    const successfulDeploys = deployments.filter((d) => d.status === 'successful').length;
    const failedDeploys = deployments.filter((d) => d.status === 'failed' || d.status === 'rolled_back').length;

    const resolvedIncidents = incidents.filter((i) => i.status === 'resolved' || i.status === 'recovery_verified');
    const activeIncidents = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'recovery_verified');

    // Generate 100% automated summary text (no manual typing required)
    let autoSummary = `=== DAILY DEVOPS ACTIVITY DIGEST (${now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}) ===\n\n`;

    autoSummary += `1. SERVER INFRASTRUCTURE FLEET STATUS:\n`;
    autoSummary += `   • Total Server Fleet: ${totalServers} nodes\n`;
    autoSummary += `   • Running & Healthy: ${runningServers} nodes\n`;
    autoSummary += `   • Failed / Offline / Stopped: ${failedServers} nodes\n\n`;

    autoSummary += `2. APPLICATION RELEASES & DEPLOYMENTS TODAY:\n`;
    autoSummary += `   • Total Releases Today: ${deployments.length}\n`;
    autoSummary += `   • Successful: ${successfulDeploys} | Failed/Rollbacks: ${failedDeploys}\n`;
    if (deployments.length > 0) {
      deployments.forEach((d) => {
        autoSummary += `     - [${d.status.toUpperCase()}] ${d.appName} (${d.environment}) • Git: ${d.branch || 'main'} • Tag: ${d.dockerImage || 'latest'}\n`;
      });
    } else {
      autoSummary += `     - No manual releases deployed today.\n`;
    }
    autoSummary += `\n`;

    autoSummary += `3. WHAT WAS FIXED & SOLVED TODAY (AUTOMATICALLY AUDITED):\n`;
    autoSummary += `   • Total Incidents Resolved & Verified: ${resolvedIncidents.length}\n`;
    autoSummary += `   • Active / Under Observation: ${activeIncidents.length}\n`;
    autoSummary += `   • Resource Remediation Routines Executed: ${remediations.length}\n`;

    if (incidents.length > 0 || troubleshooting.length > 0 || remediations.length > 0) {
      incidents.forEach((inc) => {
        const fixInfo = inc.executedFixTitle ? ` (Fix: ${inc.executedFixTitle})` : '';
        const recov = inc.recoveryMessage ? ` [Verified: ${inc.recoveryMessage}]` : '';
        autoSummary += `     - [${inc.status.toUpperCase()}] ${inc.serverName}: ${inc.title}${fixInfo}${recov}\n`;
      });
      troubleshooting.forEach((t) => {
        autoSummary += `     - [${t.status.toUpperCase()}] ${t.serverOrResource}: ${t.title} (Root Cause: ${t.rootCause || 'Investigated'})\n`;
      });
      remediations.forEach((r) => {
        autoSummary += `     - [REMEDIATION] ${r.resourceName}: ${r.action} (${r.details})\n`;
      });
    } else {
      autoSummary += `     - Zero critical outages reported. Server resources maintained nominal thresholds.\n`;
    }
    autoSummary += `\n`;

    autoSummary += `4. CI/CD & DEVOPS AUTOMATION TOOLS (MAVEN, ANSIBLE, DOCKER, KUBERNETES, JENKINS, SONARQUBE, TRIVY):\n`;
    let toolsRan = false;
    if (mavenBuilds && mavenBuilds.length > 0) {
      toolsRan = true;
      autoSummary += `   • Maven Builds (${mavenBuilds.length} total):\n`;
      mavenBuilds.slice(0, 3).forEach((b) => {
        autoSummary += `     - [${b.status}] ${b.projectName} #${b.buildNumber} (${b.command || 'mvn clean package'}) • ${b.durationSeconds || 0}s\n`;
      });
    }
    if (ansibleExecs && ansibleExecs.length > 0) {
      toolsRan = true;
      autoSummary += `   • Ansible Playbooks (${ansibleExecs.length} total):\n`;
      ansibleExecs.slice(0, 3).forEach((a) => {
        autoSummary += `     - [${a.status}] ${a.playbookName} on ${a.hostName || a.hostIp} (OK: ${a.recap?.ok || 0}, Changed: ${a.recap?.changed || 0})\n`;
      });
    }
    if (dockerDeps && dockerDeps.length > 0) {
      toolsRan = true;
      autoSummary += `   • Docker Deployments (${dockerDeps.length} total):\n`;
      dockerDeps.slice(0, 3).forEach((d) => {
        autoSummary += `     - [${d.status}] ${d.appName} on ${d.serverName} (Commit: ${(d.gitCommit || 'HEAD').substring(0, 7)})\n`;
      });
    }
    if (devopsTools && devopsTools.length > 0) {
      const activeDevopsTools = devopsTools.filter((t) => !!t.lastExecutionAt);
      if (activeDevopsTools.length > 0) {
        toolsRan = true;
        activeDevopsTools.forEach((t) => {
          autoSummary += `   • ${t.tool.toUpperCase()}: ${t.lastExecutionAction || 'Executed'} on ${t.lastExecutionServerName || 'Host'} - Status: ${t.lastExecutionStatus?.toUpperCase() || 'SUCCESS'}\n`;
        });
      }
    }
    if (!toolsRan) {
      autoSummary += `   • All automated tool pipelines (Jenkins, SonarQube, Trivy, Maven, Ansible, Docker, Kubernetes) active and monitored.\n`;
    }
    autoSummary += `\n`;

    autoSummary += `5. TOTAL OPERATIONAL EVENTS AUDITED: ${activities.length} events logged.\n`;

    return NextResponse.json({
      success: true,
      stats: {
        totalServers,
        runningServers,
        failedServers,
        deploymentsCount: deployments.length,
        successfulDeploys,
        failedDeploys,
        troubleshootingCount: troubleshooting.length,
        remediationsCount: remediations.length,
        incidentsCount: incidents.length,
        resolvedIncidentsCount: resolvedIncidents.length,
        activeIncidentsCount: activeIncidents.length,
        totalActivities: activities.length,
        mavenCount: mavenBuilds.length,
        ansibleCount: ansibleExecs.length,
        dockerCount: dockerDeps.length,
        devopsToolsCount: devopsTools.filter((t) => !!t.lastExecutionAt).length,
      },
      deployments,
      troubleshooting,
      remediations,
      incidents,
      activities,
      configuredRecipients: configuredRecipientsList,
      devopsTools: {
        maven: mavenBuilds,
        ansible: ansibleExecs,
        docker: dockerDeps,
        tools: devopsTools,
      },
      autoSummary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Send Notification to custom email and/or selected roles with all activities attached
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const {
      recipientEmail = '',
      targetRoles = [],
      subject = 'DevOps Executive Activity Report',
      message = '',
      includeDeployments = true,
      includeTroubleshooting = true,
      includeServerStatus = true,
      includeActivities = true,
      scheduledTime = '',
      broadcastWebhooks = true,
      aiBriefing = '',
    } = body;

    // Collect emails
    const targetEmailSet = new Set<string>();

    // 1. Add direct custom emails if typed by user (supports comma-separated)
    if (recipientEmail && typeof recipientEmail === 'string') {
      const parts = recipientEmail.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
      parts.forEach((e) => {
        if (e.includes('@')) targetEmailSet.add(e);
      });
    }

    // 2. Add recipients from directory matching selected roles if passed
    if (Array.isArray(targetRoles) && targetRoles.length > 0) {
      const dbRecipients = await ReportRecipient.find({
        group: { $in: targetRoles },
        isActive: true,
      }).lean();
      dbRecipients.forEach((r) => {
        if (r.email) targetEmailSet.add(r.email.trim().toLowerCase());
      });

      try {
        const { default: DevOpsRecipient } = await import('@/models/DevOpsRecipient');
        const roleRegexList = targetRoles.map((r: string) => new RegExp(r, 'i'));
        const devopsList = await DevOpsRecipient.find({
          enabled: true,
          $or: [
            { role: { $in: targetRoles } },
            ...roleRegexList.map((rx: RegExp) => ({ role: rx })),
          ],
        }).lean();
        devopsList.forEach((d: any) => {
          if (d.email) targetEmailSet.add(d.email.trim().toLowerCase());
        });
      } catch {}
    }

    // 3. If no specific email or role passed, automatically deliver to ALL configured active recipients
    if (targetEmailSet.size === 0) {
      const allReportRecipients = await ReportRecipient.find({
        $or: [{ status: 'active' }, { isActive: true }],
      }).lean();
      allReportRecipients.forEach((r) => {
        if (r.email) targetEmailSet.add(r.email.trim().toLowerCase());
      });

      try {
        const { default: DevOpsRecipient } = await import('@/models/DevOpsRecipient');
        const devopsList = await DevOpsRecipient.find({ enabled: true }).lean();
        devopsList.forEach((d: any) => {
          if (d.email) targetEmailSet.add(d.email.trim().toLowerCase());
        });
      } catch {}

      if (targetEmailSet.size === 0) {
        targetEmailSet.add(process.env.SMTP_USER || process.env.GMAIL_USER || 'nallasiva552@gmail.com');
      }
    }

    const allRecipients = Array.from(targetEmailSet);

    // Fetch live activities for the email body
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const [
      deployments,
      troubleshooting,
      remediations,
      servers,
      cloudVms,
      activities,
      emailMavenBuilds,
      emailAnsibleExecs,
      emailDockerDeps,
      emailDevopsTools,
    ] = await Promise.all([
      DeploymentRecord.find({ createdAt: { $gte: startOfDay } }).lean(),
      TroubleshootingRecord.find({ createdAt: { $gte: startOfDay } }).lean(),
      ActivityEvent.find({ module: 'troubleshooting', createdAt: { $gte: startOfDay } }).lean(),
      Server.find().lean(),
      CloudResource.find({ resourceType: { $in: ['vm', 'ec2'] } }).lean(),
      ActivityEvent.find({ createdAt: { $gte: startOfDay } }).sort({ timestamp: -1 }).limit(25).lean(),
      MavenBuild.find().sort({ createdAt: -1 }).limit(5).lean(),
      AnsibleExecution.find().sort({ createdAt: -1 }).limit(5).lean(),
      DockerDeployment.find().sort({ createdAt: -1 }).limit(5).lean(),
      DevopsToolConfig.find().lean(),
    ]);

    const runningServers = servers.filter((s) => s.status === 'Online').length +
      cloudVms.filter((v) => v.status?.toLowerCase().includes('running')).length;
    const totalServers = servers.length + cloudVms.length;
    const failedServers = totalServers - runningServers;

    // SMTP Config
    const settings = await ActivityCenterSettings.findOne().lean();
    const host = settings?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = settings?.smtpPort || parseInt(process.env.SMTP_PORT || '587');
    const user = settings?.smtpUser || process.env.GMAIL_USER || process.env.SMTP_USER;
    const pass = settings?.smtpPassword || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

    if (!user || !pass) {
      return NextResponse.json({
        success: false,
        error: 'SMTP credentials not configured. Please configure SMTP in Settings or environment variables.',
      }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const dateStr = now.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
    });

    // Build Corporate HTML Email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background:#070C18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <div style="max-width:680px;margin:0 auto;background:#0D1526;border:1px solid #06b6d4;border-radius:16px;padding:32px;box-shadow:0 12px 30px rgba(0,0,0,0.6);">
    
    <!-- Header -->
    <div style="border-bottom:2px solid #1e293b;padding-bottom:16px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:between;">
        <span style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#06b6d4;text-transform:uppercase;">MultiCloud Monitoring • DevOps Activity Center</span>
      </div>
      <h1 style="color:#ffffff;margin:8px 0 4px 0;font-size:22px;font-weight:800;">${subject}</h1>
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Official Operations & Activity Digest • ${dateStr} • Asia/Kolkata (IST)
      </p>
    </div>

    <!-- Stakeholder Roles & Recipients -->
    <div style="background:#131D35;border-radius:12px;padding:12px 16px;margin-bottom:24px;border:1px solid rgba(6,182,212,0.2);">
      <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:6px;text-transform:uppercase;font-weight:bold;">Delivered To Stakeholders:</span>
      <div>
        ${allRecipients.map((em) => `<span style="display:inline-block;padding:3px 10px;margin:3px;background:rgba(6,182,212,0.15);color:#38bdf8;border:1px solid rgba(6,182,212,0.3);border-radius:12px;font-size:11px;font-family:monospace;">${em}</span>`).join(' ')}
      </div>
    </div>

    <!-- Executive Summary / Notes -->
    <div style="background:#080D1A;padding:18px;border-radius:12px;margin-bottom:24px;border:1px solid #1e293b;">
      <h3 style="color:#38bdf8;margin:0 0 8px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Executive Notes & Highlights</h3>
      <p style="color:#cbd5e1;font-size:13px;line-height:1.6;margin:0;white-space:pre-wrap;">${message || 'All primary infrastructure operations, server maintenance, and deployments evaluated normally today.'}</p>
    </div>

    <!-- Server Status Section -->
    ${includeServerStatus ? `
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 10px 0;font-size:14px;border-bottom:1px solid #1e293b;padding-bottom:6px;">
        🖥️ Server Infrastructure Health (${runningServers}/${totalServers} Running)
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
        <tr style="background:#131D35;color:#94a3b8;text-align:left;">
          <th style="padding:8px 12px;border:1px solid #1e293b;">Server Name</th>
          <th style="padding:8px 12px;border:1px solid #1e293b;">Host / Port</th>
          <th style="padding:8px 12px;border:1px solid #1e293b;">Provider</th>
          <th style="padding:8px 12px;border:1px solid #1e293b;">Status</th>
        </tr>
        ${servers.slice(0, 10).map((s) => `
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px;color:#ffffff;font-weight:bold;">${s.name}</td>
          <td style="padding:8px 12px;font-family:monospace;color:#94a3b8;">${s.host}:${s.port || 22}</td>
          <td style="padding:8px 12px;text-transform:uppercase;color:#38bdf8;">${s.cloudProvider || 'onprem'}</td>
          <td style="padding:8px 12px;">
            <span style="color:${s.status === 'Online' ? '#34d399' : '#f87171'};font-weight:bold;">
              ${s.status === 'Online' ? '● RUNNING' : '■ FAILED / STOPPED'}
            </span>
          </td>
        </tr>
        `).join('')}
      </table>
    </div>
    ` : ''}

    <!-- Deployments Section -->
    ${includeDeployments ? `
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 10px 0;font-size:14px;border-bottom:1px solid #1e293b;padding-bottom:6px;">
        🚀 Applications & Deployments (${deployments.length} today)
      </h3>
      ${deployments.length === 0 ? `
        <p style="color:#64748b;font-size:12px;margin:8px 0;">No new code deployments recorded today.</p>
      ` : `
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
          <tr style="background:#131D35;color:#94a3b8;text-align:left;">
            <th style="padding:8px 12px;border:1px solid #1e293b;">Application</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Env</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Branch / Commit</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Result</th>
          </tr>
          ${deployments.map((d) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#ffffff;font-weight:bold;">${d.appName}</td>
            <td style="padding:8px 12px;color:#38bdf8;">${d.environment}</td>
            <td style="padding:8px 12px;font-family:monospace;color:#94a3b8;">${d.branch || 'main'} (${(d.commitId || '').substring(0, 7) || 'HEAD'})</td>
            <td style="padding:8px 12px;">
              <span style="color:${d.status === 'successful' ? '#34d399' : '#f87171'};font-weight:bold;">
                ${d.status.toUpperCase()}
              </span>
            </td>
          </tr>
          `).join('')}
        </table>
      `}
    </div>
    ` : ''}

    <!-- Troubleshooting & Server Resource Fixes -->
    ${includeTroubleshooting ? `
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 10px 0;font-size:14px;border-bottom:1px solid #1e293b;padding-bottom:6px;">
        🛠️ Troubleshooting & Server Resource Remediations (${troubleshooting.length + remediations.length} records)
      </h3>
      ${troubleshooting.length === 0 && remediations.length === 0 ? `
        <p style="color:#64748b;font-size:12px;margin:8px 0;">No active incidents or resource bottlenecks required manual remediation today.</p>
      ` : `
        <div style="space-y:8px;">
          ${troubleshooting.map((t) => `
          <div style="background:#131D35;padding:10px 14px;border-radius:8px;margin-bottom:8px;border-left:3px solid #f59e0b;">
            <strong style="color:#ffffff;font-size:12px;">${t.title}</strong> on <span style="color:#38bdf8;">${t.serverOrResource}</span>
            <p style="color:#cbd5e1;font-size:11px;margin:4px 0 0 0;">Resolution: ${t.resolutionSteps || t.investigationSteps || 'Resolved'}</p>
          </div>
          `).join('')}
          ${remediations.map((r) => `
          <div style="background:#131D35;padding:10px 14px;border-radius:8px;margin-bottom:8px;border-left:3px solid #10b981;">
            <strong style="color:#34d399;font-size:12px;">[RESOURCE FIX] ${r.action}</strong> on <span style="color:#38bdf8;">${r.resourceName}</span>
            <p style="color:#94a3b8;font-size:11px;margin:4px 0 0 0;">${r.details}</p>
          </div>
          `).join('')}
        </div>
      `}
    </div>
    ` : ''}

    <!-- CI/CD & DevOps Automation Tools Section (Maven, Ansible, Docker, Kubernetes, Jenkins, SonarQube, Trivy) -->
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 10px 0;font-size:14px;border-bottom:1px solid #1e293b;padding-bottom:6px;">
        ⚙️ CI/CD & DevOps Automation Tools (Maven, Ansible, Docker, Kubernetes, Jenkins, SonarQube, Trivy)
      </h3>
      ${emailMavenBuilds.length === 0 && emailAnsibleExecs.length === 0 && emailDockerDeps.length === 0 && emailDevopsTools.filter((t) => !!t.lastExecutionAt).length === 0 ? `
        <p style="color:#64748b;font-size:12px;margin:8px 0;">Automated tool monitoring active across Jenkins, SonarQube, Trivy, Maven, Ansible, Docker, and Kubernetes.</p>
      ` : `
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
          <tr style="background:#131D35;color:#94a3b8;text-align:left;">
            <th style="padding:8px 12px;border:1px solid #1e293b;">Tool</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Action / Operation</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Target / Project</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Status</th>
          </tr>
          ${emailMavenBuilds.map((b) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#c084fc;font-weight:bold;">📦 MAVEN</td>
            <td style="padding:8px 12px;color:#ffffff;">Build #${b.buildNumber} (${b.command || 'mvn clean package'})</td>
            <td style="padding:8px 12px;color:#38bdf8;">${b.projectName} (${b.branch || 'main'})</td>
            <td style="padding:8px 12px;font-weight:bold;color:${b.status === 'SUCCESS' ? '#34d399' : '#f87171'};">${b.status}</td>
          </tr>
          `).join('')}
          ${emailAnsibleExecs.map((a) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#fb923c;font-weight:bold;">📜 ANSIBLE</td>
            <td style="padding:8px 12px;color:#ffffff;">Playbook: ${a.playbookName}</td>
            <td style="padding:8px 12px;color:#38bdf8;">${a.hostName || a.hostIp}</td>
            <td style="padding:8px 12px;font-weight:bold;color:${a.status === 'SUCCESS' ? '#34d399' : '#f87171'};">${a.status}</td>
          </tr>
          `).join('')}
          ${emailDockerDeps.map((d) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#38bdf8;font-weight:bold;">🐳 DOCKER</td>
            <td style="padding:8px 12px;color:#ffffff;">Container: ${d.appName}</td>
            <td style="padding:8px 12px;color:#38bdf8;">${d.serverName}</td>
            <td style="padding:8px 12px;font-weight:bold;color:${d.status === 'SUCCESS' ? '#34d399' : '#f87171'};">${d.status}</td>
          </tr>
          `).join('')}
          ${emailDevopsTools.filter((t) => !!t.lastExecutionAt).map((t) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#4ade80;font-weight:bold;">⚙️ ${t.tool.toUpperCase()}</td>
            <td style="padding:8px 12px;color:#ffffff;">${t.tool === 'jenkins' ? 'CI Pipeline Job' : t.tool === 'sonarqube' ? 'Quality Gate Audit' : 'Security Vulnerability Scan'}</td>
            <td style="padding:8px 12px;color:#38bdf8;">${t.lastExecutionServerName || 'Host Node'}</td>
            <td style="padding:8px 12px;font-weight:bold;color:${t.lastExecutionStatus === 'success' ? '#34d399' : '#f87171'};">${(t.lastExecutionStatus || 'SUCCESS').toUpperCase()}</td>
          </tr>
          `).join('')}
        </table>
      `}
    </div>

    <!-- Activity Timeline -->
    ${includeActivities && activities.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 10px 0;font-size:14px;border-bottom:1px solid #1e293b;padding-bottom:6px;">
        📋 Operational Audit Log Summary (${activities.length} recent events)
      </h3>
      <div style="font-size:11px;font-family:monospace;color:#94a3b8;background:#050811;padding:12px;border-radius:8px;max-height:160px;overflow-y:auto;">
        ${activities.map((a) => `
        <div style="margin-bottom:6px;">
          <span style="color:#38bdf8;">[${new Date(a.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}]</span>
          <span style="color:#e2e8f0;"> ${a.action}</span>
          <span style="color:#64748b;"> (${a.resourceName || a.module})</span>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="border-top:1px solid #1e293b;padding-top:16px;margin-top:28px;font-size:11px;color:#64748b;text-align:center;">
      This email was compiled and dispatched from <strong>MultiCloud Monitoring Platform — DevOps Activity Center</strong>.<br />
      Delivered to: ${allRecipients.join(', ')}
    </div>
  </div>
</body>
</html>
`;

    await transporter.sendMail({
      from: `"DevOps Activity Center" <${user}>`,
      to: allRecipients.join(', '),
      subject,
      html: htmlContent,
    });

    // Multi-Channel Webhook Broadcast (Slack, Teams, Discord, Telegram)
    let webhookResults: any[] = [];
    if (broadcastWebhooks && settings) {
      try {
        const { broadcastToWebhooks } = await import('@/lib/notifications/webhookBroadcaster');
        webhookResults = await broadcastToWebhooks(settings, {
          title: subject,
          summary: `Executive DevOps Notification dispatched to ${allRecipients.length} recipients. Fleet: ${runningServers}/${totalServers} online. Releases today: ${deployments.length}.`,
          severity: failedServers > 0 ? 'warning' : 'success',
          serversCount: totalServers,
          deploymentsCount: deployments.length,
          aiBriefing: aiBriefing || undefined,
        });
      } catch (webhookErr: any) {
        console.warn('Webhook broadcast non-fatal error:', webhookErr.message);
      }
    }

    // Record Audit
    await ActivityAuditLog.create({
      action: 'NOTIFICATION_SENT',
      actor: 'DevOps Engineer',
      targetType: 'Notification',
      details: `Dispatched full activity notification '${subject}' to ${allRecipients.length} recipients (${allRecipients.join(', ')})`,
    });

    return NextResponse.json({
      success: true,
      sentCount: allRecipients.length,
      recipients: allRecipients,
      webhookResults,
      message: `Successfully dispatched activity email to ${allRecipients.length} recipients${
        webhookResults.length > 0 ? ` and broadcasted to ${webhookResults.filter((w) => w.success).length} webhooks` : ''
      }!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
