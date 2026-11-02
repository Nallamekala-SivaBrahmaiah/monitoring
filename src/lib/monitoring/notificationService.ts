export interface InAppNotification {
  id: string;
  alertId: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  provider: string;
  resourceName: string;
  metricName: string;
  value: number;
  threshold: number;
  timestamp: string;
  read: boolean;
}

// In-memory circular buffer for active in-app notifications
declare global {
  // eslint-disable-next-line no-var
  var activeInAppNotifications: InAppNotification[] | undefined;
}

const notificationsQueue: InAppNotification[] = global.activeInAppNotifications || [];
if (!global.activeInAppNotifications) {
  global.activeInAppNotifications = notificationsQueue;
}

export async function dispatchAlertNotification(params: {
  alertId: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  provider: string;
  resourceName: string;
  metricName: string;
  value: number;
  threshold: number;
  lastNotificationSentAt?: Date | null;
  reminderIntervalMinutes?: number;
}): Promise<boolean> {
  const {
    alertId,
    title,
    message,
    severity,
    provider,
    resourceName,
    metricName,
    value,
    threshold,
    lastNotificationSentAt,
    reminderIntervalMinutes = 60,
  } = params;

  // Check if reminder interval has passed
  if (lastNotificationSentAt) {
    const elapsedMinutes = (Date.now() - new Date(lastNotificationSentAt).getTime()) / (1000 * 60);
    if (elapsedMinutes < reminderIntervalMinutes) {
      // Suppress duplicate notification
      return false;
    }
  }

  // 1. Enqueue in-app notification
  const notificationItem: InAppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    alertId,
    title,
    message,
    severity,
    provider,
    resourceName,
    metricName,
    value,
    threshold,
    timestamp: new Date().toISOString(),
    read: false,
  };

  notificationsQueue.unshift(notificationItem);
  if (notificationsQueue.length > 50) {
    notificationsQueue.pop();
  }

  // 2. Log to console / channel dispatcher
  console.log(
    `[Notification Service] 🚨 ${severity.toUpperCase()} ALERT: ${title} - ${message} (${provider.toUpperCase()})`
  );

  return true;
}

export function getRecentNotifications(unreadOnly = false): InAppNotification[] {
  if (unreadOnly) {
    return notificationsQueue.filter((n) => !n.read);
  }
  return [...notificationsQueue];
}

export function markNotificationAsRead(id: string): void {
  const item = notificationsQueue.find((n) => n.id === id);
  if (item) {
    item.read = true;
  }
}

export function markAllNotificationsAsRead(): void {
  for (const n of notificationsQueue) {
    n.read = true;
  }
}

