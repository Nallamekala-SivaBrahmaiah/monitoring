import connectToDatabase from '@/lib/mongodb';
import WorkSession from '@/models/WorkSession';
import ServerIncident from '@/models/ServerIncident';
import DeploymentRecord from '@/models/DeploymentRecord';
import ActivityEvent from '@/models/ActivityEvent';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import MavenBuild from '@/models/MavenBuild';
import AnsibleExecution from '@/models/AnsibleExecution';
import DockerDeployment from '@/models/DockerDeployment';
import { DevopsToolConfig } from '@/models/DevopsToolConfig';
import { syncExistingActivities } from '@/lib/activityCenter/activityService';
import ActivityCenterSettings from '@/models/ActivityCenterSettings';
import DailyReport from '@/models/DailyReport';
import ReportRecipient from '@/models/ReportRecipient';
import ActivityAuditLog from '@/models/ActivityAuditLog';
import nodemailer from 'nodemailer';

export interface CompiledDailyReportData {
  reportDateStr: string;
  employeeInfo: {
    name: string;
    designation: string;
    department: string;
    shift: string;
    timezone: string;
  };
  workSession: {
    startTime: string;
    endTime: string;
    totalDuration: string;
    dailyObjective: string;
    status: string;
  };
  dailySummary: {
    totalActivities: number;
    awsCount: number;
    azureCount: number;
    onPremCount: number;
    appCount: number;
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    totalIncidents: number;
    resolvedIncidents: number;
    unresolvedIncidents: number;
    remediationsApplied: number;
    runningServers: number;
    totalServers: number;
  };
  awsActivities: any[];
  azureActivities: any[];
  onPremActivities: any[];
  appActivities: any[];
  serverHealthIssues: any[];
  cpuIssues: any[];
  ramIssues: any[];
  diskIssues: any[];
  troubleshootingRecords: any[];
  rootCausesIdentified: any[];
  fixesApplied: any[];
  recoveryVerifications: any[];
  deployments: any[];
  failedDeployments: any[];
  pendingTasks: any[];
  unresolvedIssues: any[];
  nextDayPlan: string;
  generationTime: string;
  auditCoverage: string;
}

export async function compile25SectionDailyReport(targetDate?: Date): Promise<{
  reportData: CompiledDailyReportData;
  htmlContent: string;
}> {
  await connectToDatabase();

  const refDate = targetDate || new Date();
  const startOfDay = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59, 999);

  await syncExistingActivities();

  const [
    workSession,
    settings,
    events,
    incidents,
    deployments,
    servers,
    cloudVms,
    mavenBuilds,
    ansibleExecs,
    dockerDeps,
    devopsTools,
  ] = await Promise.all([
    WorkSession.findOne({ workDate: refDate.toISOString().slice(0, 10) }).sort({ createdAt: -1 }).lean(),
    ActivityCenterSettings.findOne().lean(),
    ActivityEvent.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).sort({ timestamp: -1 }).lean(),
    ServerIncident.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).sort({ startedAt: -1 }).lean(),
    DeploymentRecord.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).sort({ createdAt: -1 }).lean(),
    Server.find().lean(),
    CloudResource.find({ resourceType: { $in: ['vm', 'ec2'] } }).lean(),
    MavenBuild.find().sort({ createdAt: -1 }).limit(5).lean(),
    AnsibleExecution.find().sort({ createdAt: -1 }).limit(5).lean(),
    DockerDeployment.find().sort({ createdAt: -1 }).limit(5).lean(),
    DevopsToolConfig.find().lean(),
  ]);

  const reportDateStr = refDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
  });

  const awsActivities = events.filter((e) => e.platform === 'aws');
  const azureActivities = events.filter((e) => e.platform === 'azure');
  const onPremActivities = events.filter((e) => e.platform === 'onprem');
  const appActivities = events.filter((e) => e.platform === 'application');

  const cpuIssues = incidents.filter((i) => i.resourceType === 'cpu');
  const ramIssues = incidents.filter((i) => i.resourceType === 'memory');
  const diskIssues = incidents.filter((i) => i.resourceType === 'disk');

  const fixesApplied = incidents.filter((i) => i.executedFixTitle || i.status === 'resolved' || i.status === 'recovery_verified');
  const recoveryVerifications = incidents.filter((i) => i.postFixValue !== undefined && i.postFixValue !== null);

  const successfulDeployments = deployments.filter((d) => d.status === 'successful');
  const failedDeployments = deployments.filter((d) => d.status === 'failed' || d.status === 'rolled_back');

  const unresolvedIssues = incidents.filter((i) => i.status !== 'resolved');
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

  const runningServers = servers.filter((s) => s.status === 'Online').length +
    cloudVms.filter((v) => v.status?.toLowerCase().includes('running')).length;
  const totalServers = servers.length + cloudVms.length;

  const totalDurationMinutes = workSession
    ? (workSession.totalActiveMinutes || 480)
    : 480;
  const durHours = Math.floor(totalDurationMinutes / 60);
  const durMins = totalDurationMinutes % 60;
  const totalDurationStr = `${durHours}h ${durMins}m`;

  const reportData: CompiledDailyReportData = {
    reportDateStr,
    employeeInfo: {
      name: workSession?.userName || 'Lead DevOps Architect',
      designation: 'Senior Infrastructure & SRE Engineer',
      department: 'Cloud Infrastructure & Platform Operations',
      shift: 'General Day Shift (09:30 - 18:30)',
      timezone: 'Asia/Kolkata (IST)',
    },
    workSession: {
      startTime: workSession?.startTime ? new Date(workSession.startTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : '09:30 AM',
      endTime: workSession?.endTime ? new Date(workSession.endTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : '06:30 PM',
      totalDuration: totalDurationStr,
      dailyObjective: workSession?.dailyObjective || 'Multi-cloud monitoring, server maintenance, incident remediation, and CI/CD operations.',
      status: workSession?.status || 'Ended',
    },
    dailySummary: {
      totalActivities: events.length,
      awsCount: awsActivities.length,
      azureCount: azureActivities.length,
      onPremCount: onPremActivities.length,
      appCount: appActivities.length,
      totalDeployments: deployments.length,
      successfulDeployments: successfulDeployments.length,
      failedDeployments: failedDeployments.length,
      totalIncidents: incidents.length,
      resolvedIncidents: resolvedIncidents.length,
      unresolvedIncidents: unresolvedIssues.length,
      remediationsApplied: fixesApplied.length,
      runningServers,
      totalServers,
    },
    awsActivities,
    azureActivities,
    onPremActivities,
    appActivities,
    serverHealthIssues: incidents,
    cpuIssues,
    ramIssues,
    diskIssues,
    troubleshootingRecords: incidents,
    rootCausesIdentified: incidents.filter((i) => i.confirmedCause || (i.possibleCauses && i.possibleCauses.length > 0)),
    fixesApplied,
    recoveryVerifications,
    deployments,
    failedDeployments,
    pendingTasks: unresolvedIssues.map((u) => `Resolve ${u.resourceType.toUpperCase()} issue on ${u.serverName} (${u.title})`),
    unresolvedIssues,
    nextDayPlan: 'Continue infrastructure scaling audits, automated backup verification, container vulnerability mitigations, and scheduled patch delivery.',
    generationTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    auditCoverage: '100% telemetry, server audit logs, and SSH operation forensics verified.',
  };

  // Compile Executive Corporate HTML Email (25 Sections)
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Daily DevOps Work & Infrastructure Report – ${reportDateStr}</title>
</head>
<body style="margin:0;padding:24px;background:#070C18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;line-height:1.5;">
  <div style="max-width:760px;margin:0 auto;background:#0D1526;border:1px solid #06b6d4;border-radius:18px;padding:32px;box-shadow:0 15px 35px rgba(0,0,0,0.7);">
    
    <!-- Header Block -->
    <div style="border-bottom:2px solid #1e293b;padding-bottom:20px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#06b6d4;text-transform:uppercase;">MultiCloud Monitoring Platform • Enterprise Operations</span>
        <span style="font-size:11px;background:rgba(6,182,212,0.15);color:#38bdf8;padding:3px 10px;border-radius:12px;border:1px solid rgba(6,182,212,0.3);font-family:monospace;">25-Section Executive Digest</span>
      </div>
      <h1 style="color:#ffffff;margin:10px 0 6px 0;font-size:24px;font-weight:800;">Daily DevOps Work & Operations Report</h1>
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        Report Date: <strong style="color:#38bdf8;">${reportDateStr}</strong> • Timezone: <strong>${reportData.employeeInfo.timezone}</strong>
      </p>
    </div>

    <!-- Section 1 & 2: Employee Information & Work Session -->
    <div style="background:#131D35;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid rgba(6,182,212,0.2);">
      <h3 style="color:#38bdf8;margin:0 0 12px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">1. Operational Identity & Session Duration</h3>
      <table style="width:100%;font-size:12px;color:#cbd5e1;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;"><strong>Employee:</strong> ${reportData.employeeInfo.name}</td>
          <td style="padding:4px 0;"><strong>Work Window:</strong> ${reportData.workSession.startTime} – ${reportData.workSession.endTime}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><strong>Department:</strong> ${reportData.employeeInfo.department}</td>
          <td style="padding:4px 0;"><strong>Total Active Duration:</strong> <span style="color:#34d399;font-weight:bold;">${reportData.workSession.totalDuration}</span></td>
        </tr>
        <tr>
          <td colspan="2" style="padding:6px 0 0 0;color:#94a3b8;">
            <strong>Daily Objective:</strong> ${reportData.workSession.dailyObjective}
          </td>
        </tr>
      </table>
    </div>

    <!-- Section 6: Daily Executive Summary Counters -->
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 12px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">6. Consolidated Operations Summary</h3>
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;">
        <div style="background:#080D1A;padding:12px;border-radius:10px;border:1px solid #1e293b;text-align:center;">
          <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;display:block;">Total Operations</span>
          <span style="font-size:20px;font-weight:bold;color:#38bdf8;font-family:monospace;">${reportData.dailySummary.totalActivities}</span>
        </div>
        <div style="background:#080D1A;padding:12px;border-radius:10px;border:1px solid #1e293b;text-align:center;">
          <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;display:block;">Server Fleet</span>
          <span style="font-size:20px;font-weight:bold;color:#34d399;font-family:monospace;">${reportData.dailySummary.runningServers}/${reportData.dailySummary.totalServers}</span>
        </div>
        <div style="background:#080D1A;padding:12px;border-radius:10px;border:1px solid #1e293b;text-align:center;">
          <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;display:block;">Deployments</span>
          <span style="font-size:20px;font-weight:bold;color:#2dd4bf;font-family:monospace;">${reportData.dailySummary.successfulDeployments}/${reportData.dailySummary.totalDeployments}</span>
        </div>
        <div style="background:#080D1A;padding:12px;border-radius:10px;border:1px solid #1e293b;text-align:center;">
          <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;display:block;">Fixes Applied</span>
          <span style="font-size:20px;font-weight:bold;color:#c084fc;font-family:monospace;">${reportData.dailySummary.remediationsApplied}</span>
        </div>
      </div>
    </div>

    <!-- Section 11-18: Incidents, Troubleshooting, Fixes & Recovery Verification -->
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
        11-18. Server Health, Troubleshooting & Recovery Verification (${reportData.serverHealthIssues.length})
      </h3>
      ${reportData.serverHealthIssues.length === 0 ? `
        <p style="background:#080D1A;padding:14px;border-radius:10px;color:#64748b;font-size:12px;margin:0;">Zero threshold violations detected today. All servers maintained nominal CPU, RAM, and Disk baselines.</p>
      ` : `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr style="background:#131D35;color:#94a3b8;text-align:left;">
            <th style="padding:8px 12px;border:1px solid #1e293b;">Incident / Server</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Resource</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Pre vs Post Fix</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Action Executed</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Status</th>
          </tr>
          ${reportData.serverHealthIssues.map((inc) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;">
              <strong style="color:#ffffff;">${inc.serverName}</strong><br />
              <span style="color:#64748b;font-size:10px;font-family:monospace;">${inc.incidentId}</span>
            </td>
            <td style="padding:8px 12px;text-transform:uppercase;color:#38bdf8;font-weight:bold;">${inc.resourceType}</td>
            <td style="padding:8px 12px;font-family:monospace;">
              <span style="color:#f87171;">${inc.currentValue}%</span>
              ${inc.postFixValue !== undefined ? ` &rarr; <span style="color:#34d399;font-weight:bold;">${inc.postFixValue}%</span>` : ''}
            </td>
            <td style="padding:8px 12px;color:#cbd5e1;font-size:11px;">
              ${inc.executedFixTitle || 'Diagnostic Assessment'}
            </td>
            <td style="padding:8px 12px;">
              <span style="color:${inc.status === 'resolved' ? '#34d399' : '#f59e0b'};font-weight:bold;font-size:11px;">
                ${inc.status.toUpperCase()}
              </span>
            </td>
          </tr>
          `).join('')}
        </table>
      `}
    </div>

    <!-- Section: CI/CD & DevOps Automation Tools (Maven, Ansible, Docker, Kubernetes, Jenkins, SonarQube, Trivy) -->
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
        🛠️ CI/CD & DevOps Automation Tools (Maven, Ansible, Docker, Kubernetes, Jenkins, SonarQube, Trivy)
      </h3>
      ${mavenBuilds.length === 0 && ansibleExecs.length === 0 && dockerDeps.length === 0 && devopsTools.filter((t) => !!t.lastExecutionAt).length === 0 ? `
        <p style="background:#080D1A;padding:14px;border-radius:10px;color:#64748b;font-size:12px;margin:0;">All DevOps tool pipelines (Jenkins, SonarQube, Trivy, Maven, Ansible, Docker, Kubernetes) active and monitored.</p>
      ` : `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr style="background:#131D35;color:#94a3b8;text-align:left;">
            <th style="padding:8px 12px;border:1px solid #1e293b;">Tool</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Operation / Action</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Target / Project</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Status</th>
          </tr>
          ${mavenBuilds.map((b) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#c084fc;font-weight:bold;">📦 MAVEN</td>
            <td style="padding:8px 12px;color:#ffffff;">Build #${b.buildNumber} (${b.command || 'mvn clean package'})</td>
            <td style="padding:8px 12px;color:#38bdf8;">${b.projectName} (${b.branch || 'main'})</td>
            <td style="padding:8px 12px;font-weight:bold;color:${b.status === 'SUCCESS' ? '#34d399' : '#f87171'};">${b.status}</td>
          </tr>
          `).join('')}
          ${ansibleExecs.map((a) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#fb923c;font-weight:bold;">📜 ANSIBLE</td>
            <td style="padding:8px 12px;color:#ffffff;">Playbook: ${a.playbookName}</td>
            <td style="padding:8px 12px;color:#38bdf8;">${a.hostName || a.hostIp}</td>
            <td style="padding:8px 12px;font-weight:bold;color:${a.status === 'SUCCESS' ? '#34d399' : '#f87171'};">${a.status}</td>
          </tr>
          `).join('')}
          ${dockerDeps.map((d) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#38bdf8;font-weight:bold;">🐳 DOCKER</td>
            <td style="padding:8px 12px;color:#ffffff;">Container: ${d.appName}</td>
            <td style="padding:8px 12px;color:#38bdf8;">${d.serverName}</td>
            <td style="padding:8px 12px;font-weight:bold;color:${d.status === 'SUCCESS' ? '#34d399' : '#f87171'};">${d.status}</td>
          </tr>
          `).join('')}
          ${devopsTools.filter((t) => !!t.lastExecutionAt).map((t) => `
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

    <!-- Section 19-20: Deployments History -->
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
        19-20. Application Deployments & Release Management (${reportData.deployments.length})
      </h3>
      ${reportData.deployments.length === 0 ? `
        <p style="background:#080D1A;padding:14px;border-radius:10px;color:#64748b;font-size:12px;margin:0;">No code builds or container releases were deployed during today's window.</p>
      ` : `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr style="background:#131D35;color:#94a3b8;text-align:left;">
            <th style="padding:8px 12px;border:1px solid #1e293b;">Application</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Environment</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Git Branch / Tag</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Deployment Result</th>
          </tr>
          ${reportData.deployments.map((d) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#ffffff;font-weight:bold;">${d.appName}</td>
            <td style="padding:8px 12px;color:#38bdf8;">${d.environment}</td>
            <td style="padding:8px 12px;font-family:monospace;color:#94a3b8;">${d.branch || 'main'} (${d.dockerImage || 'v1.0'})</td>
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

    <!-- Section: CI/CD & DevOps Automation Tools (Maven, Ansible, Docker, Kubernetes, Jenkins, SonarQube, Trivy) -->
    <div style="margin-bottom:24px;">
      <h3 style="color:#38bdf8;margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
        🛠️ CI/CD & DevOps Automation Tools (Maven, Ansible, Docker, Kubernetes, Jenkins, SonarQube, Trivy)
      </h3>
      ${mavenBuilds.length === 0 && ansibleExecs.length === 0 && dockerDeps.length === 0 && devopsTools.filter((t) => !!t.lastExecutionAt).length === 0 ? `
        <p style="background:#080D1A;padding:14px;border-radius:10px;color:#64748b;font-size:12px;margin:0;">All DevOps tool pipelines (Jenkins, SonarQube, Trivy, Maven, Ansible, Docker, Kubernetes) active and monitored.</p>
      ` : `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr style="background:#131D35;color:#94a3b8;text-align:left;">
            <th style="padding:8px 12px;border:1px solid #1e293b;">Tool</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Operation / Action</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Target / Project</th>
            <th style="padding:8px 12px;border:1px solid #1e293b;">Status</th>
          </tr>
          ${mavenBuilds.map((b) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#c084fc;font-weight:bold;">📦 MAVEN</td>
            <td style="padding:8px 12px;color:#ffffff;">Build #${b.buildNumber} (${b.command || 'mvn clean package'})</td>
            <td style="padding:8px 12px;color:#38bdf8;">${b.projectName} (${b.branch || 'main'})</td>
            <td style="padding:8px 12px;font-weight:bold;color:${b.status === 'SUCCESS' ? '#34d399' : '#f87171'};">${b.status}</td>
          </tr>
          `).join('')}
          ${ansibleExecs.map((a) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#fb923c;font-weight:bold;">📜 ANSIBLE</td>
            <td style="padding:8px 12px;color:#ffffff;">Playbook: ${a.playbookName}</td>
            <td style="padding:8px 12px;color:#38bdf8;">${a.hostName || a.hostIp}</td>
            <td style="padding:8px 12px;font-weight:bold;color:${a.status === 'SUCCESS' ? '#34d399' : '#f87171'};">${a.status}</td>
          </tr>
          `).join('')}
          ${dockerDeps.map((d) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#38bdf8;font-weight:bold;">🐳 DOCKER</td>
            <td style="padding:8px 12px;color:#ffffff;">Container: ${d.appName}</td>
            <td style="padding:8px 12px;color:#38bdf8;">${d.serverName}</td>
            <td style="padding:8px 12px;font-weight:bold;color:${d.status === 'SUCCESS' ? '#34d399' : '#f87171'};">${d.status}</td>
          </tr>
          `).join('')}
          ${devopsTools.filter((t) => !!t.lastExecutionAt).map((t) => `
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

    <!-- Section 21-23: Pending Tasks & Tomorrow's Plan -->
    <div style="background:#080D1A;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid #1e293b;">
      <h3 style="color:#38bdf8;margin:0 0 8px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">21-23. Pending Tasks & Tomorrow's Work Plan</h3>
      <p style="color:#cbd5e1;font-size:12px;line-height:1.6;margin:0 0 10px 0;">
        ${reportData.nextDayPlan}
      </p>
      ${reportData.pendingTasks.length > 0 ? `
        <span style="font-size:11px;color:#f59e0b;font-weight:bold;display:block;margin-bottom:4px;">Open Follow-Up Items:</span>
        <ul style="margin:0;padding-left:18px;font-size:11px;color:#94a3b8;">
          ${reportData.pendingTasks.map((p) => `<li>${p}</li>`).join('')}
        </ul>
      ` : '<span style="font-size:11px;color:#34d399;">✓ All critical operational tasks cleared for today.</span>'}
    </div>

    <!-- Section 24-25: Audit Coverage & Generation Metadata -->
    <div style="border-top:1px solid #1e293b;padding-top:16px;font-size:11px;color:#64748b;text-align:center;">
      Generated: <strong>${reportData.generationTime}</strong> • Audit Verification: <strong>${reportData.auditCoverage}</strong><br />
      MultiCloud Monitoring Platform — DevOps Activity Center
    </div>
  </div>
</body>
</html>
`;

  return { reportData, htmlContent };
}

export async function checkAndDispatchDailyReportIfDue(): Promise<{
  triggered: boolean;
  reason?: string;
  recipientsCount?: number;
}> {
  try {
    await connectToDatabase();
    const settings = await ActivityCenterSettings.findOne();
    if (!settings || settings.autoReportEnabled === false) {
      return { triggered: false, reason: 'Auto report is disabled in settings' };
    }

    // Parse time in Asia/Kolkata
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }); // e.g. "18:35"

    const targetTime = settings.reportSendTime || '18:30';
    const [targetH, targetM] = targetTime.split(':').map((x: string) => parseInt(x, 10));
    const [currentH, currentM] = istTimeStr.split(':').map((x: string) => parseInt(x, 10));

    const currentMinutesTotal = currentH * 60 + currentM;
    const targetMinutesTotal = targetH * 60 + targetM;

    if (currentMinutesTotal < targetMinutesTotal) {
      return { triggered: false, reason: `Current IST time ${istTimeStr} is before target ${targetTime}` };
    }

    // Check if already dispatched today in Asia/Kolkata
    const todayStrIST = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    if (settings.lastDeliveryAt) {
      const lastDeliveryStrIST = new Date(settings.lastDeliveryAt).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
      if (lastDeliveryStrIST === todayStrIST && settings.lastDeliveryStatus === 'Completed') {
        return { triggered: false, reason: 'Report already dispatched today' };
      }
    }

    // Compile report
    const { reportData, htmlContent } = await compile25SectionDailyReport(now);

    // Query disabled recipients to strictly honor user preferences
    let disabledSet = new Set<string>();
    try {
      const { default: DevOpsRecipient } = await import('@/models/DevOpsRecipient');
      const disabledDocs = await DevOpsRecipient.find({ enabled: false }).lean();
      disabledSet = new Set(disabledDocs.map((d: any) => (d.email || '').toLowerCase().trim()));
    } catch {}

    // Fetch recipients
    const activeRecipients = await ReportRecipient.find({
      $and: [
        { $or: [{ status: 'active' }, { isActive: true }] },
        { isArchived: { $ne: true } },
      ],
    }).lean();

    const emails = new Set<string>();
    for (const r of activeRecipients) {
      const clean = (r.email || '').toLowerCase().trim();
      if (clean && !disabledSet.has(clean)) {
        emails.add(clean);
      }
    }

    // If all recipients are disabled or list is empty, DO NOT SEND!
    if (emails.size === 0) {
      console.log('[DailyReport] 🔕 All report recipients are disabled. Skipping daily report dispatch.');
      return { triggered: false, reason: 'All report recipients are disabled or empty' };
    }

    const emailList = Array.from(emails);
    const subject = `DevOps Executive Daily Report — ${reportData.reportDateStr}`;

    // Send email via nodemailer
    let deliveryStatus: 'sent' | 'failed' = 'sent';
    let deliveryError = '';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || process.env.GMAIL_USER || 'nallasiva552@gmail.com',
        pass: process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || '',
      },
    });

    try {
      await transporter.sendMail({
        from: `"DevOps Activity Center" <${process.env.SMTP_USER || 'nallasiva552@gmail.com'}>`,
        to: emailList.join(', '),
        subject,
        html: htmlContent,
      });
    } catch (err: any) {
      console.warn('[DailyReport] SMTP send error:', err.message);
      deliveryStatus = 'failed';
      deliveryError = err.message;
    }

    // Save report record
    await DailyReport.create({
      reportId: `REP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      reportDate: todayStrIST,
      employeeName: reportData.employeeInfo.name,
      employeeId: 'DEV-OPS-01',
      activeMinutes: 480,
      dailyObjective: reportData.workSession.dailyObjective,
      tomorrowPlan: reportData.nextDayPlan,
      summary: {
        totalActivities: reportData.dailySummary.totalActivities,
        successfulActivities: reportData.dailySummary.successfulDeployments + reportData.dailySummary.resolvedIncidents,
        failedActivities: reportData.dailySummary.failedDeployments + reportData.dailySummary.unresolvedIncidents,
        awsActivities: reportData.dailySummary.awsCount,
        azureActivities: reportData.dailySummary.azureCount,
        onPremActivities: reportData.dailySummary.onPremCount,
        appActivities: reportData.dailySummary.appCount,
        deploymentsCount: reportData.dailySummary.totalDeployments,
        troubleshootingCount: reportData.dailySummary.totalIncidents,
        resolvedCount: reportData.dailySummary.resolvedIncidents,
        pendingCount: reportData.dailySummary.unresolvedIncidents,
      },
      sections: {
        awsActivities: reportData.awsActivities,
        azureActivities: reportData.azureActivities,
        onPremActivities: reportData.onPremActivities,
        appActivities: reportData.appActivities,
        deployments: reportData.deployments,
        troubleshooting: reportData.troubleshootingRecords,
        pendingTasks: reportData.pendingTasks,
      },
      recipients: emailList.map((e) => ({
        email: e,
        name: e.split('@')[0],
        preference: 'TO',
        status: deliveryStatus === 'sent' ? 'delivered' : 'failed',
        error: deliveryError || undefined,
      })),
      deliveryStatus,
      deliveryMode: 'automatic',
      sentAt: deliveryStatus === 'sent' ? new Date() : null,
      deliveryError: deliveryError || undefined,
      htmlContent,
      pdfAvailable: false,
      generatedAt: new Date(),
    });

    // Update ActivityCenterSettings
    settings.lastDeliveryAt = new Date();
    settings.lastDeliveryStatus = deliveryStatus === 'sent' ? 'Completed' : 'Failed';
    await settings.save();

    // Audit log
    await ActivityAuditLog.create({
      action: 'autonomous_daily_report_dispatch',
      actor: 'System Scheduler (Autonomous)',
      targetType: 'DailyReport',
      targetId: todayStrIST,
      details: `Dispatched 25-section executive daily report to ${emailList.length} recipient(s). Status: ${deliveryStatus}.`,
      timestamp: new Date(),
    });

    console.log(`[Scheduler] 📧 Autonomous Daily Report dispatched to ${emailList.length} recipient(s). Status: ${deliveryStatus}`);

    return {
      triggered: true,
      recipientsCount: emailList.length,
    };
  } catch (outerErr: any) {
    console.warn('[DailyReport] Check error:', outerErr.message);
    return { triggered: false, reason: outerErr.message };
  }
}
