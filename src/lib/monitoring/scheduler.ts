import connectToDatabase from '@/lib/mongodb';
import { runFullInfrastructureReconciliation } from '@/lib/sync/reconciliationEngine';
import { evaluateAllMonitoredResources } from '@/lib/monitoring/alertEvaluationEngine';

declare global {
  // eslint-disable-next-line no-var
  var __monitoringSchedulerRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var __monitoringSchedulerInterval: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __monitoringSchedulerLastRun: Date | undefined;
  // eslint-disable-next-line no-var
  var __monitoringSchedulerIsRunningCycle: boolean | undefined;
}

const SCHEDULER_INTERVAL_MS = 30000; // 30 seconds polling interval

/**
 * Executes a single infrastructure monitoring polling cycle:
 * 1. Synchronizes live telemetry from AWS EC2 instances, Azure VMs, and registered SSH servers.
 * 2. Evaluates CPU, Memory, and Disk metrics against configured threshold policies (>= 70%).
 * 3. Immediately triggers Gmail email alerts to all enabled DevOps engineers when thresholds are crossed.
 * 4. Logs delivery status to AlertDelivery.
 */
export async function runMonitoringCycle(): Promise<{
  success: boolean;
  timestamp: Date;
  evaluated?: number;
  alertsCreated?: number;
  alertsUpdated?: number;
  alertsResolved?: number;
  error?: string;
}> {
  if (global.__monitoringSchedulerIsRunningCycle) {
    const elapsed = global.__monitoringSchedulerLastRun
      ? Date.now() - global.__monitoringSchedulerLastRun.getTime()
      : 0;
    if (elapsed > 45000) {
      console.log('[Scheduler] ⚠️ Force-resetting stale monitoring cycle lock.');
      global.__monitoringSchedulerIsRunningCycle = false;
    } else {
      console.log('[Scheduler] ⏳ Previous monitoring cycle is still running. Skipping overlapping execution.');
      return { success: false, timestamp: new Date(), error: 'Previous cycle in progress' };
    }
  }

  global.__monitoringSchedulerIsRunningCycle = true;
  const cycleStart = new Date();
  console.log(`[Scheduler] 🚀 [${cycleStart.toISOString()}] Starting autonomous infrastructure monitoring cycle...`);

  try {
    await connectToDatabase();

    // Step 1: Reconcile all live infrastructure (Azure VMs, AWS EC2, Registered SSH Servers)
    // and automatically evaluate threshold-based alerts
    await runFullInfrastructureReconciliation();

    // Step 2: Ensure any additional resource metrics are evaluated
    const evalResult = await evaluateAllMonitoredResources();

    global.__monitoringSchedulerLastRun = new Date();
    const durationMs = Date.now() - cycleStart.getTime();

    console.log(
      `[Scheduler] ✅ [${new Date().toISOString()}] Monitoring cycle completed in ${durationMs}ms. ` +
      `Resources evaluated: ${evalResult.totalEvaluated}, Alerts: ${evalResult.activeCount} active ` +
      `(${evalResult.created} new, ${evalResult.updated} updated, ${evalResult.resolved} resolved).`
    );

    return {
      success: true,
      timestamp: new Date(),
      evaluated: evalResult.totalEvaluated,
      alertsCreated: evalResult.created,
      alertsUpdated: evalResult.updated,
      alertsResolved: evalResult.resolved,
    };
  } catch (err: any) {
    console.error(`[Scheduler] ❌ Monitoring cycle failed:`, err.message || err);
    return {
      success: false,
      timestamp: new Date(),
      error: err.message || 'Cycle error',
    };
  } finally {
    global.__monitoringSchedulerIsRunningCycle = false;
  }
}

/**
 * Starts the autonomous monitoring background scheduler if not already running.
 */
export function startMonitoringScheduler(): void {
  if (global.__monitoringSchedulerRunning) {
    return;
  }

  global.__monitoringSchedulerRunning = true;
  console.log('[Scheduler] 🟢 Initializing autonomous infrastructure monitoring scheduler (interval: 30s)...');

  // Trigger initial monitoring cycle shortly after startup (5 seconds)
  setTimeout(() => {
    runMonitoringCycle().catch((err) =>
      console.warn('[Scheduler] Initial cycle warning:', err.message)
    );
  }, 5000);

  // Set recurring interval every 30 seconds
  if (global.__monitoringSchedulerInterval) {
    clearInterval(global.__monitoringSchedulerInterval);
  }

  global.__monitoringSchedulerInterval = setInterval(() => {
    runMonitoringCycle().catch((err) =>
      console.warn('[Scheduler] Cycle execution error:', err.message)
    );
  }, SCHEDULER_INTERVAL_MS);
}

/**
 * Stops the scheduler (for graceful shutdown or test harnesses)
 */
export function stopMonitoringScheduler(): void {
  if (global.__monitoringSchedulerInterval) {
    clearInterval(global.__monitoringSchedulerInterval);
    global.__monitoringSchedulerInterval = undefined;
  }
  global.__monitoringSchedulerRunning = false;
  global.__monitoringSchedulerIsRunningCycle = false;
  console.log('[Scheduler] 🔴 Monitoring scheduler stopped.');
}

/**
 * Status diagnostic helper
 */
export function getSchedulerStatus() {
  return {
    isRunning: Boolean(global.__monitoringSchedulerRunning),
    isCycleRunning: Boolean(global.__monitoringSchedulerIsRunningCycle),
    intervalMs: SCHEDULER_INTERVAL_MS,
    lastRunAt: global.__monitoringSchedulerLastRun || null,
  };
}

