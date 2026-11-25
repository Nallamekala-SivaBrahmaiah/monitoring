import connectToDatabase from '@/lib/mongodb';
import WorkSession, { IWorkSession } from '@/models/WorkSession';
import ActivityEvent, { IActivityEvent, ActivityPlatform } from '@/models/ActivityEvent';
import ActivityCenterSettings, { IActivityCenterSettings } from '@/models/ActivityCenterSettings';
import DeploymentRecord from '@/models/DeploymentRecord';
import TroubleshootingRecord from '@/models/TroubleshootingRecord';
import DailyReport from '@/models/DailyReport';
import AutomationExecution from '@/models/AutomationExecution';
import AnsibleExecution from '@/models/AnsibleExecution';
import DockerDeployment from '@/models/DockerDeployment';
import MavenBuild from '@/models/MavenBuild';
import NginxDeployment from '@/models/NginxDeployment';
import Alert from '@/models/Alert';
import { DevopsToolConfig } from '@/models/DevopsToolConfig';
import CloudResource from '@/models/CloudResource';

/**
 * Returns the current date in Asia/Kolkata timezone (YYYY-MM-DD).
 */
export function getKolkataDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Retrieves or initializes Activity Center settings.
 */
export async function getOrCreateSettings(): Promise<IActivityCenterSettings> {
  await connectToDatabase();
  let settings = await ActivityCenterSettings.findOne();
  if (!settings) {
    settings = await ActivityCenterSettings.create({
      trackingEnabled: true,
      autoReportEnabled: true,
      workStartTime: '09:30',
      workEndTime: '18:30',
      reportSendTime: '18:30',
      timezone: 'Asia/Kolkata',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      deliveryMode: 'automatic',
      defaultRecipientGroups: ['Sir', 'Project Manager', 'DevOps Lead', 'Manager'],
      includeAws: true,
      includeAzure: true,
      includeOnPrem: true,
      includeApp: true,
      includeDeployments: true,
      includeTroubleshooting: true,
      includePending: true,
      attachPdf: true,
      reportRetentionDays: 90,
    });
  }
  return settings;
}

/**
 * Retrieves the currently active or paused work session for today.
 */
export async function getActiveWorkSession(userId: string = 'devops-user'): Promise<IWorkSession | null> {
  await connectToDatabase();
  const today = getKolkataDateString();
  const session = await WorkSession.findOne({
    userId,
    workDate: today,
    status: { $in: ['active', 'paused'] },
  }).sort({ createdAt: -1 });

  return session;
}

/**
 * Starts a new work session for today.
 */
export async function startWorkSession(params: {
  userId?: string;
  userName?: string;
  dailyObjective?: string;
  project?: string;
}): Promise<IWorkSession | null> {
  await connectToDatabase();
  const today = getKolkataDateString();
  const userId = params.userId || 'devops-user';

  // Check if there's already an active session
  let existing = await WorkSession.findOne({
    userId,
    workDate: today,
    status: { $in: ['active', 'paused'] },
  });

  if (existing) {
    if (existing.status === 'paused') {
      return resumeWorkSession(existing._id.toString());
    }
    if (params.dailyObjective) {
      existing.dailyObjective = params.dailyObjective;
      await existing.save();
    }
    return existing;
  }

  const session = await WorkSession.create({
    userId,
    userName: params.userName || 'DevOps Engineer',
    workDate: today,
    startTime: new Date(),
    status: 'active',
    dailyObjective: params.dailyObjective || '',
    project: params.project || 'Multi-Cloud Infrastructure',
    totalActiveMinutes: 0,
    pauseMinutes: 0,
  });

  return session;
}

/**
 * Pauses an active work session.
 */
export async function pauseWorkSession(sessionId: string): Promise<IWorkSession | null> {
  await connectToDatabase();
  const session = await WorkSession.findById(sessionId);
  if (!session || session.status !== 'active') return session;

  const now = new Date();
  const activeElapsedMinutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(session.startTime).getTime()) / 60000) - session.pauseMinutes
  );

  session.status = 'paused';
  session.lastPauseTime = now;
  session.totalActiveMinutes = activeElapsedMinutes;
  await session.save();

  return session;
}

/**
 * Resumes a paused work session.
 */
export async function resumeWorkSession(sessionId: string): Promise<IWorkSession | null> {
  await connectToDatabase();
  const session = await WorkSession.findById(sessionId);
  if (!session || session.status !== 'paused') return session;

  const now = new Date();
  if (session.lastPauseTime) {
    const pauseDelta = Math.max(
      0,
      Math.round((now.getTime() - new Date(session.lastPauseTime).getTime()) / 60000)
    );
    session.pauseMinutes += pauseDelta;
  }
  session.status = 'active';
  session.lastPauseTime = null;
  await session.save();

  return session;
}

/**
 * Ends a work session.
 */
export async function endWorkSession(sessionId: string, sessionNotes?: string): Promise<IWorkSession | null> {
  await connectToDatabase();
  const session = await WorkSession.findById(sessionId);
  if (!session || session.status === 'ended') return session;

  const now = new Date();
  if (session.status === 'paused' && session.lastPauseTime) {
    const pauseDelta = Math.max(
      0,
      Math.round((now.getTime() - new Date(session.lastPauseTime).getTime()) / 60000)
    );
    session.pauseMinutes += pauseDelta;
  }

  const totalElapsedMinutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(session.startTime).getTime()) / 60000)
  );

  session.status = 'ended';
  session.endTime = now;
  session.totalActiveMinutes = Math.max(0, totalElapsedMinutes - session.pauseMinutes);
  if (sessionNotes !== undefined) {
    session.sessionNotes = sessionNotes;
  }
  await session.save();

  return session;
}

/**
 * Logs a new activity event if master tracking is enabled.
 */
export async function logActivity(event: Partial<IActivityEvent>): Promise<IActivityEvent | null> {
  try {
    await connectToDatabase();
    const settings = await getOrCreateSettings();

    // Respect user's master ON/OFF switch
    if (!settings.trackingEnabled) {
      return null;
    }

    const eventId =
      event.eventId ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Avoid duplicate event within 5 seconds
    const existing = await ActivityEvent.findOne({ eventId });
    if (existing) return existing;

    // Attach active work session if not explicitly provided
    let workSessionId = event.workSessionId;
    if (!workSessionId) {
      const activeSession = await getActiveWorkSession();
      if (activeSession) {
        workSessionId = activeSession._id.toString();
      }
    }

    const doc = await ActivityEvent.create({
      eventId,
      platform: event.platform || 'application',
      module: event.module || 'system',
      resourceType: event.resourceType || 'Resource',
      resourceId: event.resourceId || '',
      resourceName: event.resourceName || 'Unknown Resource',
      action: event.action || 'Executed Operation',
      status: event.status || 'success',
      previousState: event.previousState || null,
      newState: event.newState || null,
      initiator: event.initiator || 'DevOps Engineer',
      details: event.details || '',
      metadata: event.metadata || {},
      source: event.source || 'Application Event',
      workSessionId: workSessionId || null,
      timestamp: event.timestamp || new Date(),
    });

    return doc;
  } catch (err) {
    console.error('Error logging DevOps activity:', err);
    return null;
  }
}

/**
 * Syncs real historical runs from AutomationExecution and Alert collections into ActivityEvent.
 */
export async function syncExistingActivities() {
  try {
    const executions = await AutomationExecution.find().sort({ startedAt: -1 }).limit(25).lean();
    for (const exec of executions) {
      const eventId = `auto_exec_${exec._id.toString()}`;
      const exists = await ActivityEvent.findOne({ eventId });
      if (!exists) {
        const toolsList =
          exec.selectedTools && exec.selectedTools.length > 0
            ? exec.selectedTools.map((t: any) => t.toolName).join(', ')
            : exec.scriptName || 'Automated Routine';

        await ActivityEvent.create({
          eventId,
          platform: 'onprem',
          module: 'server-automation',
          resourceType: 'Linux Server Node',
          resourceId: exec.serverId || '',
          resourceName: exec.serverName || 'Remote Host',
          action:
            exec.executionType === 'tool-installation'
              ? `Installed software packages: ${toolsList}`
              : `Executed custom script: ${exec.scriptName || 'Script'}`,
          status:
            exec.status === 'success'
              ? 'success'
              : exec.status === 'failed'
              ? 'failed'
              : 'in_progress',
          initiator: exec.initiatedBy || 'DevOps Engineer',
          details: `Host: ${exec.serverHost} • OS: ${exec.serverOs || 'Linux'} • Duration: ${exec.durationSeconds || 0}s`,
          source: 'Server Audit',
          timestamp: exec.startedAt || exec.createdAt,
        });
      }
    }

    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(25).lean();
    for (const alt of alerts) {
      const eventId = `alert_${alt._id.toString()}`;
      const exists = await ActivityEvent.findOne({ eventId });
      if (!exists) {
        const plat: ActivityPlatform =
          alt.provider === 'aws'
            ? 'aws'
            : alt.provider === 'azure'
            ? 'azure'
            : 'application';

        await ActivityEvent.create({
          eventId,
          platform: plat,
          module: 'alerts',
          resourceType: 'System Alert',
          resourceId: alt.resourceId || '',
          resourceName: alt.resourceName || 'Monitored Node',
          action: `Alert trigger: ${alt.metricName} exceeded threshold (${alt.value}%)`,
          status: alt.status === 'resolved' ? 'success' : 'failed',
          initiator: 'Autonomous Monitor',
          details: `Resource: ${alt.resourceName} • Severity: ${alt.severity?.toUpperCase()} • Metric: ${alt.metricName} (${alt.value}%)`,
          source: 'Application Event',
          timestamp: alt.createdAt,
        });
      }
    }

    // 3. Sync Maven Builds
    try {
      const mavenBuilds = await MavenBuild.find().sort({ createdAt: -1 }).limit(25).lean();
      for (const b of mavenBuilds) {
        const eventId = `mvn_build_${b._id.toString()}`;
        const exists = await ActivityEvent.findOne({ eventId });
        if (!exists) {
          await ActivityEvent.create({
            eventId,
            platform: 'application',
            module: 'maven',
            resourceType: 'Maven Build Project',
            resourceId: b._id.toString(),
            resourceName: b.projectName || 'Maven Application',
            action: `Maven Build #${b.buildNumber}: ${b.command || 'mvn clean package'} (${b.branch || 'main'})`,
            status: b.status === 'SUCCESS' ? 'success' : b.status === 'FAILED' ? 'failed' : 'in_progress',
            initiator: 'Maven Build Engine',
            details: `Branch: ${b.branch || 'main'} • Duration: ${b.durationSeconds || 0}s • Artifacts: ${b.artifacts?.length || 0} • Status: ${b.status}`,
            source: 'Application Event',
            timestamp: b.startTime || b.createdAt,
          });
        }
      }
    } catch (mvnErr) {
      console.warn('Maven sync error:', mvnErr);
    }

    // 4. Sync Ansible Playbook Executions
    try {
      const ansibleExecs = await AnsibleExecution.find().sort({ createdAt: -1 }).limit(25).lean();
      for (const a of ansibleExecs) {
        const eventId = `ansible_exec_${a._id.toString()}`;
        const exists = await ActivityEvent.findOne({ eventId });
        if (!exists) {
          await ActivityEvent.create({
            eventId,
            platform: 'onprem',
            module: 'ansible',
            resourceType: 'Ansible Playbook Run',
            resourceId: a._id.toString(),
            resourceName: a.playbookName || 'Ansible Playbook',
            action: `Ansible Playbook: ${a.playbookName} on ${a.hostName || a.hostIp}`,
            status: a.status === 'SUCCESS' ? 'success' : a.status === 'FAILED' ? 'failed' : 'in_progress',
            initiator: a.executedBy || 'Ansible Controller',
            details: `Target: ${a.hostIp} • Duration: ${a.durationSeconds || 0}s • Tasks: OK ${a.recap?.ok || 0}, Changed ${a.recap?.changed || 0}, Failed ${a.recap?.failed || 0}`,
            source: 'Server Audit',
            timestamp: a.startTime || a.createdAt,
          });
        }
      }
    } catch (ansErr) {
      console.warn('Ansible sync error:', ansErr);
    }

    // 5. Sync Docker Deployments
    try {
      const dockerDeps = await DockerDeployment.find().sort({ createdAt: -1 }).limit(25).lean();
      for (const d of dockerDeps) {
        const eventId = `docker_dep_${d._id.toString()}`;
        const exists = await ActivityEvent.findOne({ eventId });
        if (!exists) {
          await ActivityEvent.create({
            eventId,
            platform: 'onprem',
            module: 'docker',
            resourceType: 'Docker Container Deployment',
            resourceId: d._id.toString(),
            resourceName: d.appName || 'Docker Container',
            action: `Docker Container Deployed: ${d.appName} on ${d.serverName}`,
            status: d.status === 'SUCCESS' ? 'success' : d.status === 'FAILED' ? 'failed' : 'in_progress',
            initiator: 'Docker Engine',
            details: `Server: ${d.serverName} • Git: ${(d.gitCommit || 'HEAD').substring(0, 7)} • Steps: ${d.steps?.length || 0}`,
            source: 'Application Event',
            timestamp: d.startTime || d.createdAt,
          });
        }
      }
    } catch (docErr) {
      console.warn('Docker sync error:', docErr);
    }

    // 6. Sync Jenkins, SonarQube, Trivy Tool Runs
    try {
      const devopsTools = await DevopsToolConfig.find().lean();
      for (const t of devopsTools) {
        if (t.lastExecutionAt) {
          const eventId = `tool_${t.tool}_${new Date(t.lastExecutionAt).getTime()}`;
          const exists = await ActivityEvent.findOne({ eventId });
          if (!exists) {
            const toolLabel = t.tool === 'jenkins' ? 'Jenkins CI/CD' : t.tool === 'sonarqube' ? 'SonarQube Quality Gate' : 'Trivy Security Scan';
            await ActivityEvent.create({
              eventId,
              platform: 'application',
              module: t.tool,
              resourceType: `${t.tool.toUpperCase()} Operations`,
              resourceId: t._id.toString(),
              resourceName: t.lastExecutionServerName || t.tool.toUpperCase(),
              action: `${toolLabel}: Executed on ${t.lastExecutionServerName || 'Host'}`,
              status: t.lastExecutionStatus === 'success' ? 'success' : 'failed',
              initiator: 'DevOps Tool Automation',
              details: `Exit Code: ${t.lastExecutionExitCode || 0} • Target: ${t.lastExecutionServerHost || 'localhost'} • Action: ${t.lastExecutionAction || 'Audit'}`,
              source: 'Application Event',
              timestamp: t.lastExecutionAt,
            });
          }
        }
      }
    } catch (toolErr) {
      console.warn('DevOps tools sync error:', toolErr);
    }

    // 7. Sync Kubernetes Resources
    try {
      const k8sResources: any[] = await (CloudResource as any).find({
        resourceType: { $in: ['k8s_cluster', 'k8s_pod', 'container'] },
      }).lean();
      for (const k of k8sResources) {
        const eventId = `k8s_${k._id?.toString()}`;
        const exists = await ActivityEvent.findOne({ eventId });
        if (!exists) {
          await ActivityEvent.create({
            eventId,
            platform: 'application',
            module: 'kubernetes',
            resourceType: 'Kubernetes Workload',
            resourceId: k._id?.toString(),
            resourceName: k.name || 'K8s Cluster Node',
            action: `Kubernetes Cluster Monitored: Pods & Deployments Synchronized (${k.name || 'Workload'})`,
            status: 'success',
            initiator: 'Kubernetes Controller',
            details: `Namespace: default • Workload Active • Provider: ${k.provider || 'Cloud'}`,
            source: 'Application Event',
            timestamp: k.updatedAt || k.createdAt || new Date(),
          });
        }
      }
    } catch (k8sErr) {
      console.warn('Kubernetes sync error:', k8sErr);
    }
  } catch (err) {
    console.error('Error syncing existing activities:', err);
  }
}

/**
 * Returns true overview numbers from database for the specified date (default today).
 */
export async function getOverviewStats(dateStr?: string) {
  await connectToDatabase();
  await syncExistingActivities();
  const targetDate = dateStr || getKolkataDateString();

  const startOfDay = new Date(`${targetDate}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999+05:30`);

  // Query events recorded for this day
  const dateQuery = {
    timestamp: { $gte: startOfDay, $lte: endOfDay },
  };

  const [
    totalActivities,
    awsActivities,
    azureActivities,
    onPremActivities,
    appActivities,
    successfulActivities,
    failedActivities,
    deploymentsCount,
    failedDeploymentsCount,
    troubleshootingCount,
    resolvedIssuesCount,
    pendingTasksCount,
    activeSession,
    lastReport,
    recentEvents,
  ] = await Promise.all([
    ActivityEvent.countDocuments(dateQuery),
    ActivityEvent.countDocuments({ ...dateQuery, platform: 'aws' }),
    ActivityEvent.countDocuments({ ...dateQuery, platform: 'azure' }),
    ActivityEvent.countDocuments({ ...dateQuery, platform: 'onprem' }),
    ActivityEvent.countDocuments({ ...dateQuery, platform: 'application' }),
    ActivityEvent.countDocuments({ ...dateQuery, status: 'success' }),
    ActivityEvent.countDocuments({ ...dateQuery, status: 'failed' }),
    DeploymentRecord.countDocuments({ startTime: { $gte: startOfDay, $lte: endOfDay } }),
    DeploymentRecord.countDocuments({ startTime: { $gte: startOfDay, $lte: endOfDay }, status: 'failed' }),
    TroubleshootingRecord.countDocuments({ startedAt: { $gte: startOfDay, $lte: endOfDay } }),
    TroubleshootingRecord.countDocuments({ startedAt: { $gte: startOfDay, $lte: endOfDay }, status: 'Resolved' }),
    TroubleshootingRecord.countDocuments({ status: { $in: ['Open', 'In Progress', 'Unresolved'] } }),
    getActiveWorkSession(),
    DailyReport.findOne().sort({ generatedAt: -1 }).lean(),
    ActivityEvent.find(dateQuery).sort({ timestamp: -1 }).limit(10).lean(),
  ]);

  // Hourly distribution for chart (00:00 to 23:00)
  const hourlyAgg = await ActivityEvent.aggregate([
    { $match: dateQuery },
    {
      $project: {
        hour: { $hour: { date: '$timestamp', timezone: 'Asia/Kolkata' } },
        platform: 1,
      },
    },
    {
      $group: {
        _id: { hour: '$hour', platform: '$platform' },
        count: { $sum: 1 },
      },
    },
  ]);

  const hourlyTimeline: Array<{ hour: string; aws: number; azure: number; onprem: number; app: number; total: number }> = [];
  for (let h = 0; h < 24; h++) {
    const hourLabel = `${h.toString().padStart(2, '0')}:00`;
    let aws = 0;
    let azure = 0;
    let onprem = 0;
    let app = 0;

    for (const item of hourlyAgg) {
      if (item._id.hour === h) {
        if (item._id.platform === 'aws') aws = item.count;
        if (item._id.platform === 'azure') azure = item.count;
        if (item._id.platform === 'onprem') onprem = item.count;
        if (item._id.platform === 'application') app = item.count;
      }
    }

    hourlyTimeline.push({
      hour: hourLabel,
      aws,
      azure,
      onprem,
      app,
      total: aws + azure + onprem + app,
    });
  }

  return {
    targetDate,
    totalActivities,
    awsActivities,
    azureActivities,
    onPremActivities,
    appActivities,
    successfulDeployments: Math.max(0, deploymentsCount - failedDeploymentsCount),
    failedDeployments: failedDeploymentsCount,
    troubleshootingTasks: troubleshootingCount,
    resolvedIssues: resolvedIssuesCount,
    pendingTasks: pendingTasksCount,
    activeSession: activeSession
      ? {
          _id: activeSession._id.toString(),
          userId: activeSession.userId,
          userName: activeSession.userName,
          status: activeSession.status,
          startTime: activeSession.startTime,
          totalActiveMinutes: activeSession.totalActiveMinutes,
          pauseMinutes: activeSession.pauseMinutes,
          dailyObjective: activeSession.dailyObjective,
          project: activeSession.project,
        }
      : null,
    lastReportStatus: lastReport
      ? {
          reportId: lastReport.reportId,
          reportDate: lastReport.reportDate,
          deliveryStatus: lastReport.deliveryStatus,
          sentAt: lastReport.sentAt,
          recipientsCount: lastReport.recipients?.length || 0,
        }
      : null,
    platformDistribution: [
      { name: 'AWS Cloud', value: awsActivities, color: '#F59E0B' },
      { name: 'Azure Cloud', value: azureActivities, color: '#0EA5E9' },
      { name: 'On-Premises', value: onPremActivities, color: '#10B981' },
      { name: 'Application Modules', value: appActivities, color: '#8B5CF6' },
    ],
    hourlyTimeline,
    recentEvents,
  };
}
