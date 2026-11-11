import connectToDatabase from '@/lib/mongodb';
import Alert, { IAlert } from '@/models/Alert';
import AlertThreshold, { IAlertThreshold } from '@/models/AlertThreshold';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import Notification from '@/models/Notification';
import NotificationPreferences from '@/models/NotificationPreferences';
import DevOpsRecipient from '@/models/DevOpsRecipient';
import AlertDelivery from '@/models/AlertDelivery';
import { getUnifiedServerInventory } from '@/lib/serverMonitoring/inventoryService';
import { dispatchAlertNotification } from './notificationService';
import { sendAlertEmail, sendResolvedEmail } from '@/lib/notifications/emailService';

export interface AlertThresholdSettings {
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
  defaultSeverity: 'critical' | 'warning' | 'info';
  criticalEscalationThreshold: number;
  reminderIntervalMinutes: number;
  enabled: boolean;
}

export const DEFAULT_THRESHOLDS: AlertThresholdSettings = {
  cpuThreshold: 70,
  memoryThreshold: 70,
  diskThreshold: 70,
  defaultSeverity: 'warning',
  criticalEscalationThreshold: 90,
  reminderIntervalMinutes: 60,
  enabled: true,
};

/**
 * Calculates metric threshold milestone tier (70%, 80%, 90%)
 */
export function getUsageTier(value: number): number {
  if (value >= 90) return 90;
  if (value >= 80) return 80;
  if (value >= 70) return 70;
  return 0;
}

/**
 * Retrieve enabled DevOps engineer email recipients from database.
 * Never seeds fake/dummy emails. Falls back to environment recipient if empty.
 */
export async function getEnabledDevOpsRecipients(): Promise<string[]> {
  try {
    await connectToDatabase();
    const docs = await DevOpsRecipient.find({ enabled: { $ne: false } }).lean();
    const recipients = docs.map((d: any) => d.email).filter(Boolean);
    if (recipients.length > 0) {
      return recipients;
    }

    // Fallback to configured ALERT_EMAIL_TO or GMAIL_USER if no recipients in DB
    const envRecipient = process.env.ALERT_EMAIL_TO || process.env.GMAIL_USER;
    if (envRecipient) {
      return [envRecipient.trim()];
    }
    return [];
  } catch (err) {
    console.warn('[AlertEngine] Error querying DevOps recipients:', err);
    return [];
  }
}

/**
 * Retrieve current active threshold policies.
 */
export async function getAlertThresholds(): Promise<AlertThresholdSettings> {
  try {
    await connectToDatabase();
    const config = await AlertThreshold.findOne().lean();
    if (config) {
      return {
        cpuThreshold: typeof config.cpuThreshold === 'number' ? config.cpuThreshold : 70,
        memoryThreshold: typeof config.memoryThreshold === 'number' ? config.memoryThreshold : 70,
        diskThreshold: typeof config.diskThreshold === 'number' ? config.diskThreshold : 70,
        defaultSeverity: config.defaultSeverity || 'warning',
        criticalEscalationThreshold:
          typeof config.criticalEscalationThreshold === 'number'
            ? config.criticalEscalationThreshold
            : 90,
        reminderIntervalMinutes:
          typeof config.reminderIntervalMinutes === 'number'
            ? config.reminderIntervalMinutes
            : 60,
        enabled: config.enabled !== false,
      };
    }
  } catch (err) {
    console.warn('[AlertEngine] Note: Using default alert thresholds (70%):', err);
  }
  return { ...DEFAULT_THRESHOLDS };
}

/**
 * Update threshold configuration (from Settings).
 */
export async function updateAlertThresholds(
  updates: Partial<AlertThresholdSettings>
): Promise<AlertThresholdSettings> {
  await connectToDatabase();
  const existing = await AlertThreshold.findOne();
  if (existing) {
    if (typeof updates.cpuThreshold === 'number') existing.cpuThreshold = updates.cpuThreshold;
    if (typeof updates.memoryThreshold === 'number')
      existing.memoryThreshold = updates.memoryThreshold;
    if (typeof updates.diskThreshold === 'number') existing.diskThreshold = updates.diskThreshold;
    if (updates.defaultSeverity) existing.defaultSeverity = updates.defaultSeverity;
    if (typeof updates.criticalEscalationThreshold === 'number')
      existing.criticalEscalationThreshold = updates.criticalEscalationThreshold;
    if (typeof updates.reminderIntervalMinutes === 'number')
      existing.reminderIntervalMinutes = updates.reminderIntervalMinutes;
    if (typeof updates.enabled === 'boolean') existing.enabled = updates.enabled;
    await existing.save();
    return getAlertThresholds();
  }

  await AlertThreshold.create({
    ...DEFAULT_THRESHOLDS,
    ...updates,
  });
  return getAlertThresholds();
}

/**
 * Retrieve current notification preferences (Email & In-App)
 */
export async function getNotificationPreferences() {
  const devOpsRecipients = await getEnabledDevOpsRecipients();

  try {
    await connectToDatabase();
    const prefs = await NotificationPreferences.findOne({ userId: 'admin' }).lean();
    if (prefs) {
      return {
        emailNotificationsEnabled: prefs.emailNotificationsEnabled !== false,
        inAppNotificationsEnabled: prefs.inAppNotificationsEnabled !== false,
        alertRecipients: devOpsRecipients,
        notifyOnResolved: prefs.notifyOnResolved !== false,
        reminderIntervalMinutes: prefs.reminderIntervalMinutes || 60,
        minSeverity: prefs.minSeverity || 'warning',
      };
    }
  } catch (err) {
    console.warn('[AlertEngine] Preferences note:', err);
  }

  return {
    emailNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    alertRecipients: devOpsRecipients,
    notifyOnResolved: true,
    reminderIntervalMinutes: 60,
    minSeverity: 'warning' as const,
  };
}

export interface MetricEvaluationInput {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  provider: string;
  region?: string;
  metrics: {
    cpuUtilization?: number | null;
    memoryUtilization?: number | null;
    diskUtilization?: number | null;
    disks?: Array<{
      filesystem?: string;
      mount?: string;
      usagePercent: number | null | undefined;
    }>;
    timestamp?: Date;
  };
}

export interface EvaluationResult {
  resourceId: string;
  metric: string;
  filesystem?: string;
  value: number;
  threshold: number;
  action: 'created' | 'updated' | 'resolved' | 'none';
  alertId?: string;
}

// Set to track concurrent in-flight evaluations and prevent duplicate alert/email creation
const inFlightEvaluations = new Set<string>();

/**
 * Evaluates a single metric value against threshold with automatic lifecycle management:
 * - Trigger condition: value >= threshold
 * - Skip if value is null / undefined / NaN (never evaluate missing or mock metrics)
 * - Updates existing active alert if still exceeded
 * - Automatically resolves active alert if value returns below threshold
 * - Sends Gmail emails & dispatches in-app notifications
 */
async function evaluateSingleMetric(params: {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  provider: string;
  region: string;
  metricName: 'cpu' | 'memory' | 'disk';
  filesystem?: string;
  value: number | null | undefined;
  threshold: number;
  thresholds: AlertThresholdSettings;
  metricTimestamp?: Date;
}): Promise<EvaluationResult> {
  const {
    resourceId,
    resourceName,
    resourceType,
    provider,
    region,
    metricName,
    filesystem = '',
    value,
    threshold,
    thresholds,
    metricTimestamp,
  } = params;

  // 1. Missing metric handling: Do not treat missing metrics as 0%. Skip evaluation.
  if (value === null || value === undefined || isNaN(value)) {
    return {
      resourceId,
      metric: metricName,
      filesystem,
      value: 0,
      threshold,
      action: 'none',
    };
  }

  const roundedValue = Math.round(value * 10) / 10;
  const alertKey = `${resourceId}:${metricName}:${filesystem}`;

  // Prevent duplicate evaluations and duplicate emails from concurrent monitoring jobs
  if (inFlightEvaluations.has(alertKey)) {
    return {
      resourceId,
      metric: metricName,
      filesystem,
      value: roundedValue,
      threshold,
      action: 'none',
    };
  }

  inFlightEvaluations.add(alertKey);
  try {
    const now = metricTimestamp ? new Date(metricTimestamp) : new Date();

  // Determine direct link for notification
  let resourceLink = '/dashboard/alerts';
  if (resourceType === 'Server' || resourceId.startsWith('srv-')) {
    resourceLink = '/dashboard/servers';
  } else if (resourceType === 'AzureVM' || provider === 'azure') {
    resourceLink = '/dashboard/azure-vms';
  } else if (resourceType === 'EC2Instance' || provider === 'aws') {
    resourceLink = '/dashboard/ec2';
  }

  // Load notification preferences
  const prefs = await getNotificationPreferences();

  // Find existing active alert for this exact resource + metric + filesystem
  const existingAlert = await Alert.findOne({ alertKey, status: 'active' });

  // 2. Condition: value >= threshold -> Trigger or Update Alert
  if (roundedValue >= threshold) {
    const severity: 'critical' | 'high' | 'warning' =
      roundedValue >= thresholds.criticalEscalationThreshold
        ? 'critical'
        : roundedValue >= 80
        ? 'high'
        : thresholds.defaultSeverity === 'critical'
        ? 'critical'
        : 'warning';

    let title = '';
    let message = '';
    const metricTypeLabel =
      metricName === 'cpu' ? 'CPU' : metricName === 'memory' ? 'Memory' : 'Disk';

    if (metricName === 'cpu') {
      title = 'High CPU Utilization';
      message = `CPU usage on ${resourceName} reached ${roundedValue}%. Threshold: ${threshold}%.`;
    } else if (metricName === 'memory') {
      title = 'High Memory Utilization';
      message = `Memory usage on ${resourceName} reached ${roundedValue}%. Threshold: ${threshold}%.`;
    } else {
      const mountDisplay = filesystem || '/';
      title = `High Disk Usage (${mountDisplay})`;
      message = `Disk usage on ${mountDisplay} reached ${roundedValue}%. Threshold: ${threshold}%.`;
    }

    if (existingAlert) {
      // Update existing active alert while threshold remains exceeded
      existingAlert.peakValue = Math.max(existingAlert.peakValue || existingAlert.value, roundedValue);
      existingAlert.value = roundedValue;
      existingAlert.lastEvaluatedAt = now;
      existingAlert.message = message;
      existingAlert.threshold = threshold;
      if (severity === 'critical') {
        existingAlert.severity = 'critical';
      } else if (severity === 'high' && existingAlert.severity !== 'critical') {
        existingAlert.severity = 'high';
      }

      // Check tiered threshold escalation: 70% -> 80% -> 90%, or if initial email was never sent
      const currentTier = getUsageTier(roundedValue);
      const lastTier = existingAlert.lastNotifiedTier || 0;
      const needsInitialEmail = !existingAlert.emailSentAt;
      const hasEscalated = currentTier > lastTier;

      if (hasEscalated || needsInitialEmail) {
        existingAlert.lastNotifiedTier = currentTier || threshold;
        const tierTitle = needsInitialEmail
          ? title
          : `${metricTypeLabel} Escalation (${currentTier}% Tier)`;
        const tierMessage = needsInitialEmail
          ? message
          : `${metricTypeLabel} usage on ${resourceName} reached ${roundedValue}%, crossing the ${currentTier}% threshold tier.`;

        console.log(
          `[AlertEngine] 🚨 Triggering alert email for ${resourceName} (${metricTypeLabel} ${roundedValue}%, tier ${currentTier}%). Initial: ${needsInitialEmail}, Escalated: ${hasEscalated}`
        );

        if (prefs.emailNotificationsEnabled && prefs.alertRecipients.length > 0) {
          console.log(
            `[AlertEngine] ✉️ Sending alert email to ${prefs.alertRecipients.length} DevOps recipients: ${prefs.alertRecipients.join(', ')}`
          );
          const tierEmailResult = await sendAlertEmail(
            {
              serverName: resourceName,
              resourceId,
              ipAddress: resourceId.startsWith('srv-') ? undefined : resourceId,
              provider,
              region,
              metricType: metricTypeLabel,
              actualUsage: roundedValue,
              threshold: currentTier || threshold,
              diskMount: filesystem,
              severity: existingAlert.severity,
              triggeredTime: existingAlert.triggeredAt || now,
              resourceLink,
              escalationTier: currentTier || threshold,
            },
            prefs.alertRecipients
          );
          if (tierEmailResult.success) {
            existingAlert.emailSentAt = now;
          }

          if (!resourceName.startsWith('test-vm-')) {
            await AlertDelivery.create({
              alertId: existingAlert._id.toString(),
              metricType: metricTypeLabel,
              metricValue: roundedValue,
              threshold: currentTier || threshold,
              severity: existingAlert.severity,
              serverName: resourceName,
              provider: provider.toLowerCase(),
              resourceId,
              recipientsCount: prefs.alertRecipients.length,
              recipients: prefs.alertRecipients,
              deliveryStatus: tierEmailResult.success ? 'Delivered' : 'Failed',
              deliveredAt: now,
              readCount: 0,
              unreadCount: prefs.alertRecipients.length,
              link: resourceLink,
              isTestEmail: false,
              attemptCount: 1,
              smtpResponse: tierEmailResult.messageId || null,
              error: tierEmailResult.error || null,
            }).catch((err) => console.warn('[AlertEngine] AlertDelivery log error:', err.message));
          }
        }

        if (prefs.inAppNotificationsEnabled) {
          await Notification.create({
            userId: 'admin',
            alertId: existingAlert._id.toString(),
            title: tierTitle,
            message: tierMessage,
            severity: existingAlert.severity,
            provider,
            resourceName,
            resourceId,
            metricName,
            filesystem,
            value: roundedValue,
            threshold: currentTier || threshold,
            type: 'threshold_alert',
            read: false,
            link: resourceLink,
          }).catch(() => null);
        }
      }

      // Record significant value drift in history
      const lastHistory = existingAlert.history[existingAlert.history.length - 1];
      if (!lastHistory || Math.abs(lastHistory.value - roundedValue) >= 3) {
        existingAlert.history.push({
          timestamp: now,
          status: 'active',
          value: roundedValue,
          message,
        });
      }

      // Check reminder email & in-app notification
      if (prefs.emailNotificationsEnabled && existingAlert.emailSentAt) {
        const elapsedMinutes =
          (now.getTime() - new Date(existingAlert.emailSentAt).getTime()) / (1000 * 60);

        if (elapsedMinutes >= thresholds.reminderIntervalMinutes) {
          const emailResult = await sendAlertEmail(
            {
              serverName: resourceName,
              resourceId,
              ipAddress: resourceId.startsWith('srv-') ? undefined : resourceId,
              provider,
              region,
              metricType: metricTypeLabel,
              actualUsage: roundedValue,
              threshold,
              diskMount: filesystem,
              severity: existingAlert.severity,
              triggeredTime: existingAlert.triggeredAt,
              resourceLink,
            },
            prefs.alertRecipients
          );

          if (emailResult.success) {
            existingAlert.emailSentAt = now;
          }

          // Create in-app reminder notification
          if (prefs.inAppNotificationsEnabled) {
            await Notification.create({
              userId: 'admin',
              alertId: existingAlert._id.toString(),
              title: `[REMINDER] ${title}`,
              message,
              severity: existingAlert.severity,
              provider,
              resourceName,
              resourceId,
              metricName,
              filesystem,
              value: roundedValue,
              threshold,
              type: 'threshold_alert',
              read: false,
              link: resourceLink,
              emailDeliveryStatus: emailResult.success ? 'sent' : 'failed',
              emailDeliveryError: emailResult.error || null,
            }).catch(() => null);
          }
        }
      }

      // In-memory notification service
      await dispatchAlertNotification({
        alertId: existingAlert._id.toString(),
        title,
        message,
        severity: existingAlert.severity,
        provider,
        resourceName,
        metricName,
        value: roundedValue,
        threshold,
        lastNotificationSentAt: existingAlert.notificationSentAt,
        reminderIntervalMinutes: thresholds.reminderIntervalMinutes,
      });

      await existingAlert.save();

      return {
        resourceId,
        metric: metricName,
        filesystem,
        value: roundedValue,
        threshold,
        action: 'updated',
        alertId: existingAlert._id.toString(),
      };
    } else {
      // Create one new active alert occurrence
      const newAlert = new Alert({
        alertKey,
        provider,
        resourceId,
        resourceName,
        resourceType,
        severity,
        metricName,
        filesystem,
        value: roundedValue,
        peakValue: roundedValue,
        threshold,
        title,
        message,
        region: region || 'global',
        status: 'active',
        lastNotifiedTier: getUsageTier(roundedValue) || threshold,
        timestamp: now,
        triggeredAt: now,
        lastEvaluatedAt: now,
        history: [
          {
            timestamp: now,
            status: 'active',
            value: roundedValue,
            message,
          },
        ],
      });

      await newAlert.save();

      // Dispatch Gmail Email Alert
      let emailResult: { success: boolean; error?: string; messageId?: string } = {
        success: false,
        error: 'Email notifications disabled',
      };
      if (prefs.emailNotificationsEnabled && prefs.alertRecipients.length > 0) {
        console.log(
          `[AlertEngine] 🚨 New alert created for ${resourceName} (${metricTypeLabel} ${roundedValue}%). Sending email to ${prefs.alertRecipients.length} DevOps recipients: ${prefs.alertRecipients.join(', ')}`
        );
        emailResult = await sendAlertEmail(
          {
            serverName: resourceName,
            resourceId,
            ipAddress: resourceId.startsWith('srv-') ? undefined : resourceId,
            provider,
            region,
            metricType: metricTypeLabel,
            actualUsage: roundedValue,
            threshold,
            diskMount: filesystem,
            severity,
            triggeredTime: now,
            resourceLink,
            escalationTier: getUsageTier(roundedValue) || threshold,
          },
          prefs.alertRecipients
        );

        if (emailResult.success) {
          newAlert.emailSentAt = now;
        }

        if (!resourceName.startsWith('test-vm-')) {
          await AlertDelivery.create({
            alertId: newAlert._id.toString(),
            metricType: metricTypeLabel,
            metricValue: roundedValue,
            threshold,
            severity,
            serverName: resourceName,
            provider: provider.toLowerCase(),
            resourceId,
            recipientsCount: prefs.alertRecipients.length,
            recipients: prefs.alertRecipients,
            deliveryStatus: emailResult.success ? 'Delivered' : 'Failed',
            deliveredAt: now,
            readCount: 0,
            unreadCount: prefs.alertRecipients.length,
            link: resourceLink,
            isTestEmail: false,
            attemptCount: 1,
            smtpResponse: emailResult.messageId || null,
            error: emailResult.error || null,
          }).catch((err) => console.warn('[AlertEngine] AlertDelivery log error:', err.message));
        }
      }

      // Create In-App Notification document in MongoDB
      if (prefs.inAppNotificationsEnabled) {
        await Notification.create({
          userId: 'admin',
          alertId: newAlert._id.toString(),
          title,
          message,
          severity,
          provider,
          resourceName,
          resourceId,
          metricName,
          filesystem,
          value: roundedValue,
          threshold,
          type: 'threshold_alert',
          read: false,
          link: resourceLink,
          emailDeliveryStatus: emailResult.success ? 'sent' : 'failed',
          emailDeliveryError: emailResult.error || null,
        }).catch((err) => console.warn('[AlertEngine] Notification create error:', err.message));
      }

      // Dispatch in-memory real-time notification
      await dispatchAlertNotification({
        alertId: newAlert._id.toString(),
        title,
        message,
        severity,
        provider,
        resourceName,
        metricName,
        value: roundedValue,
        threshold,
        reminderIntervalMinutes: thresholds.reminderIntervalMinutes,
      });

      newAlert.notificationSentAt = now;
      await newAlert.save();

      return {
        resourceId,
        metric: metricName,
        filesystem,
        value: roundedValue,
        threshold,
        action: 'created',
        alertId: newAlert._id.toString(),
      };
    }
  }

  // 3. Condition: value < threshold -> Auto-resolve active alert if exists
  if (existingAlert && roundedValue < threshold) {
    existingAlert.status = 'resolved';
    existingAlert.resolvedAt = now;
    existingAlert.lastEvaluatedAt = now;
    existingAlert.peakValue = existingAlert.peakValue || existingAlert.value;
    existingAlert.value = roundedValue;
    existingAlert.severity = 'info';
    const metricTypeLabel =
      metricName === 'cpu' ? 'CPU' : metricName === 'memory' ? 'Memory' : 'Disk';
    const recoveryMessage = `${metricTypeLabel} usage on ${resourceName}${
      filesystem ? ` (${filesystem})` : ''
    } returned to ${roundedValue}% (below threshold of ${threshold}%).`;

    existingAlert.message = recoveryMessage;
    existingAlert.history.push({
      timestamp: now,
      status: 'resolved',
      value: roundedValue,
      message: recoveryMessage,
    });

    // Send Resolved Email Alert if enabled
    if (
      prefs.emailNotificationsEnabled &&
      prefs.notifyOnResolved &&
      existingAlert.emailSentAt &&
      !existingAlert.resolvedEmailSentAt &&
      prefs.alertRecipients.length > 0
    ) {
      console.log(
        `[AlertEngine] ✉️ Alert resolved: ${resourceName} (${metricTypeLabel} recovered to ${roundedValue}% < ${threshold}%). Sending recovery email to ${prefs.alertRecipients.length} DevOps recipients: ${prefs.alertRecipients.join(', ')}`
      );
      const resolvedEmailResult = await sendResolvedEmail(
        {
          serverName: resourceName,
          resourceId,
          ipAddress: resourceId.startsWith('srv-') ? undefined : resourceId,
          provider,
          region,
          metricType: metricTypeLabel,
          actualUsage: roundedValue,
          threshold,
          recoveryThreshold: `< ${threshold}%`,
          diskMount: filesystem,
          severity: 'info',
          triggeredTime: existingAlert.triggeredAt,
          recoveryTime: now,
          resourceLink,
        },
        prefs.alertRecipients
      );

      if (resolvedEmailResult.success) {
        existingAlert.resolvedEmailSentAt = now;
      }

      // Record recovery email delivery in AlertDelivery
      if (!resourceName.startsWith('test-vm-')) {
        await AlertDelivery.create({
          alertId: existingAlert._id.toString(),
          metricType: metricTypeLabel,
          metricValue: roundedValue,
          threshold,
          severity: 'info',
          serverName: resourceName,
          provider: provider.toLowerCase(),
          resourceId,
          recipientsCount: prefs.alertRecipients.length,
          recipients: prefs.alertRecipients,
          deliveryStatus: resolvedEmailResult.success ? 'Delivered' : 'Failed',
          deliveredAt: now,
          readCount: 0,
          unreadCount: prefs.alertRecipients.length,
          link: resourceLink,
          isTestEmail: false,
          attemptCount: 1,
          smtpResponse: resolvedEmailResult.messageId || null,
          error: resolvedEmailResult.error || null,
        }).catch((err) => console.warn('[AlertEngine] Recovery AlertDelivery log error:', err.message));
      }
    }

    // Create In-App Resolution Notification
    if (prefs.inAppNotificationsEnabled) {
      await Notification.create({
        userId: 'admin',
        alertId: existingAlert._id.toString(),
        title: `${metricTypeLabel} Alert Resolved`,
        message: recoveryMessage,
        severity: 'info',
        provider,
        resourceName,
        resourceId,
        metricName,
        filesystem,
        value: roundedValue,
        threshold,
        type: 'alert_resolved',
        read: false,
        link: resourceLink,
        emailDeliveryStatus: existingAlert.resolvedEmailSentAt ? 'sent' : 'skipped',
      }).catch((err) => console.warn('[AlertEngine] Resolved notif error:', err.message));
    }

    await existingAlert.save();

    console.log(
      `[AlertEngine] ✅ Alert resolved: ${alertKey} recovered to ${roundedValue}% < ${threshold}%`
    );

    return {
      resourceId,
      metric: metricName,
      filesystem,
      value: roundedValue,
      threshold,
      action: 'resolved',
      alertId: existingAlert._id.toString(),
    };
  }

  return {
    resourceId,
    metric: metricName,
    filesystem,
    value: roundedValue,
    threshold,
    action: 'none',
  };
  } finally {
    inFlightEvaluations.delete(alertKey);
  }
}

/**
 * Evaluates all metrics (CPU, Memory, Disks) for a specific resource.
 */
export async function evaluateResourceMetrics(
  input: MetricEvaluationInput
): Promise<EvaluationResult[]> {
  await connectToDatabase();
  const thresholds = await getAlertThresholds();
  if (!thresholds.enabled) return [];

  const results: EvaluationResult[] = [];
  const region = input.region || 'global';
  const metricTimestamp = input.metrics.timestamp || new Date();

  // 1. Evaluate CPU Utilization (>= 70%)
  if (
    input.metrics.cpuUtilization !== null &&
    input.metrics.cpuUtilization !== undefined &&
    !isNaN(input.metrics.cpuUtilization)
  ) {
    const cpuRes = await evaluateSingleMetric({
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      resourceType: input.resourceType,
      provider: input.provider,
      region,
      metricName: 'cpu',
      value: input.metrics.cpuUtilization,
      threshold: thresholds.cpuThreshold,
      thresholds,
      metricTimestamp,
    });
    results.push(cpuRes);
  }

  // 2. Evaluate Memory Utilization (>= 70%)
  if (
    input.metrics.memoryUtilization !== null &&
    input.metrics.memoryUtilization !== undefined &&
    !isNaN(input.metrics.memoryUtilization)
  ) {
    const memRes = await evaluateSingleMetric({
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      resourceType: input.resourceType,
      provider: input.provider,
      region,
      metricName: 'memory',
      value: input.metrics.memoryUtilization,
      threshold: thresholds.memoryThreshold,
      thresholds,
      metricTimestamp,
    });
    results.push(memRes);
  }

  // 3. Evaluate Disk Utilization (>= 70%)
  // Check multi-mount disks array if present
  if (Array.isArray(input.metrics.disks) && input.metrics.disks.length > 0) {
    for (const d of input.metrics.disks) {
      if (d.usagePercent !== null && d.usagePercent !== undefined && !isNaN(d.usagePercent)) {
        const mount = d.mount || d.filesystem || '/';
        const diskRes = await evaluateSingleMetric({
          resourceId: input.resourceId,
          resourceName: input.resourceName,
          resourceType: input.resourceType,
          provider: input.provider,
          region,
          metricName: 'disk',
          filesystem: mount,
          value: d.usagePercent,
          threshold: thresholds.diskThreshold,
          thresholds,
          metricTimestamp,
        });
        results.push(diskRes);
      }
    }
  } else if (
    input.metrics.diskUtilization !== null &&
    input.metrics.diskUtilization !== undefined &&
    !isNaN(input.metrics.diskUtilization)
  ) {
    // Single disk metric fallback
    const diskRes = await evaluateSingleMetric({
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      resourceType: input.resourceType,
      provider: input.provider,
      region,
      metricName: 'disk',
      filesystem: '/',
      value: input.metrics.diskUtilization,
      threshold: thresholds.diskThreshold,
      thresholds,
      metricTimestamp,
    });
    results.push(diskRes);
  }

  return results;
}

/**
 * Scans all registered SSH servers and discovered cloud resources (AWS EC2 & Azure VMs),
 * evaluating their real collected metrics against threshold policies.
 */
export async function evaluateAllMonitoredResources(): Promise<{
  totalEvaluated: number;
  created: number;
  updated: number;
  resolved: number;
  activeCount: number;
}> {
  await connectToDatabase();
  const thresholds = await getAlertThresholds();
  if (!thresholds.enabled) {
    const activeCount = await Alert.countDocuments({ status: 'active' });
    return { totalEvaluated: 0, created: 0, updated: 0, resolved: 0, activeCount };
  }

  let created = 0;
  let updated = 0;
  let resolved = 0;
  let totalEvaluated = 0;

  // Evaluate all real active servers from unified inventory
  const inventory = await getUnifiedServerInventory();
  for (const s of inventory) {
    if (s.metrics) {
      totalEvaluated++;
      const results = await evaluateResourceMetrics({
        resourceId: s.resourceId || s.id,
        resourceName: s.name,
        resourceType: s.cloudProvider === 'azure' ? 'AzureVM' : s.cloudProvider === 'aws' ? 'EC2Instance' : 'Server',
        provider: s.cloudProvider || 'other',
        region: s.region || 'global',
        metrics: {
          cpuUtilization: s.metrics.cpu,
          memoryUtilization: s.metrics.memory,
          diskUtilization: s.metrics.disk,
          timestamp: s.lastSyncedAt || s.lastConnectedAt || new Date(),
        },
      });

      for (const r of results) {
        if (r.action === 'created') created++;
        else if (r.action === 'updated') updated++;
        else if (r.action === 'resolved') resolved++;
      }
    }
  }

  // Purge any orphan alerts not matching active inventory
  const activeNames = new Set(inventory.map((s) => (s.name || '').toLowerCase().trim()).filter(Boolean));
  const activeIds = new Set(
    inventory
      .flatMap((s) => [s.resourceId, s.id, s.sshServerId, s.publicIp, s.host])
      .filter(Boolean)
      .map((x) => x!.toLowerCase().trim())
  );

  if (inventory.length > 0) {
    await Alert.deleteMany({
      $and: [
        {
          resourceName: {
            $nin: Array.from(activeNames).map((n) => new RegExp(`^${n}$`, 'i')),
          },
        },
        {
          resourceId: {
            $nin: Array.from(activeIds),
          },
        },
      ],
    }).catch(() => {});
  }

  const activeCount = await Alert.countDocuments({ status: 'active' });

  return {
    totalEvaluated,
    created,
    updated,
    resolved,
    activeCount,
  };
}
