/**
 * Automated Test Suite for Real-Time Threshold-Based Alerting Engine
 * Requirements:
 * - CPU 69% -> No alert
 * - CPU 70% -> Alert
 * - CPU 85% -> Alert
 * - Memory 75% -> Alert
 * - Disk 90% -> Alert
 * - Metric falls below 70% -> Resolve alert
 * - Repeated metric collection -> No duplicate active alert
 * - Missing metric -> No false alert
 * - Clean up test fixtures (Do not inject fake alerts into production data)
 */

import connectToDatabase from '@/lib/mongodb';
import Alert from '@/models/Alert';
import Notification from '@/models/Notification';
import {
  evaluateResourceMetrics,
  getAlertThresholds,
  updateAlertThresholds,
  DEFAULT_THRESHOLDS,
} from '@/lib/monitoring/alertEvaluationEngine';

export async function runAlertEngineTests(): Promise<{
  passed: number;
  failed: number;
  results: Array<{ test: string; passed: boolean; details?: string }>;
}> {
  await connectToDatabase();

  const results: Array<{ test: string; passed: boolean; details?: string }> = [];
  const testResourceId = `test-vm-${Date.now()}`;
  const testResourceName = 'test-vm-alerts';

  // Ensure default 70% thresholds
  await updateAlertThresholds(DEFAULT_THRESHOLDS);

  try {
    // -------------------------------------------------------------
    // Test 1: CPU 69% -> No alert (< 70%)
    // -------------------------------------------------------------
    const res1 = await evaluateResourceMetrics({
      resourceId: testResourceId,
      resourceName: testResourceName,
      resourceType: 'Server',
      provider: 'azure',
      region: 'eastus',
      metrics: {
        cpuUtilization: 69,
      },
    });

    const t1Passed =
      res1.length === 1 &&
      res1[0].action === 'none' &&
      (await Alert.countDocuments({ resourceId: testResourceId, status: 'active' })) === 0;

    results.push({
      test: '1. CPU 69% (Below 70%) -> No alert',
      passed: t1Passed,
      details: `Action: ${res1[0]?.action}, activeAlerts: ${await Alert.countDocuments({ resourceId: testResourceId, status: 'active' })}`,
    });

    // -------------------------------------------------------------
    // Test 2: CPU 70% -> Alert created (>= 70%)
    // -------------------------------------------------------------
    const res2 = await evaluateResourceMetrics({
      resourceId: testResourceId,
      resourceName: testResourceName,
      resourceType: 'Server',
      provider: 'azure',
      region: 'eastus',
      metrics: {
        cpuUtilization: 70,
      },
    });

    const activeCpuAlert = await Alert.findOne({
      resourceId: testResourceId,
      metricName: 'cpu',
      status: 'active',
    });

    const t2Passed =
      res2.length === 1 &&
      res2[0].action === 'created' &&
      activeCpuAlert !== null &&
      activeCpuAlert.value === 70 &&
      activeCpuAlert.threshold === 70 &&
      activeCpuAlert.severity === 'warning';

    results.push({
      test: '2. CPU 70% (Trigger threshold) -> Alert created',
      passed: !!t2Passed,
      details: `Alert ID: ${activeCpuAlert?._id}, Value: ${activeCpuAlert?.value}%, Status: ${activeCpuAlert?.status}`,
    });

    // -------------------------------------------------------------
    // Test 3: CPU 85% -> Alert updated (No duplicate active alert)
    // -------------------------------------------------------------
    const res3 = await evaluateResourceMetrics({
      resourceId: testResourceId,
      resourceName: testResourceName,
      resourceType: 'Server',
      provider: 'azure',
      region: 'eastus',
      metrics: {
        cpuUtilization: 85,
      },
    });

    const allActiveCpu = await Alert.find({
      resourceId: testResourceId,
      metricName: 'cpu',
      status: 'active',
    });

    const t3Passed =
      res3[0].action === 'updated' &&
      allActiveCpu.length === 1 &&
      allActiveCpu[0].value === 85 &&
      allActiveCpu[0]._id.toString() === activeCpuAlert?._id.toString();

    results.push({
      test: '3. CPU 85% (Still exceeded) -> Alert updated without duplicate',
      passed: t3Passed,
      details: `Active count: ${allActiveCpu.length}, Updated value: ${allActiveCpu[0]?.value}%`,
    });

    // -------------------------------------------------------------
    // Test 4: Memory 75% -> Alert created
    // -------------------------------------------------------------
    const res4 = await evaluateResourceMetrics({
      resourceId: testResourceId,
      resourceName: testResourceName,
      resourceType: 'Server',
      provider: 'azure',
      region: 'eastus',
      metrics: {
        memoryUtilization: 75,
      },
    });

    const activeMem = await Alert.findOne({
      resourceId: testResourceId,
      metricName: 'memory',
      status: 'active',
    });

    const t4Passed =
      res4[0].action === 'created' &&
      activeMem !== null &&
      activeMem.value === 75 &&
      activeMem.threshold === 70;

    results.push({
      test: '4. Memory 75% -> Alert created',
      passed: !!t4Passed,
      details: `Memory Alert ID: ${activeMem?._id}, Value: ${activeMem?.value}%`,
    });

    // -------------------------------------------------------------
    // Test 5: Disk 90% -> Alert created for filesystem '/'
    // -------------------------------------------------------------
    const res5 = await evaluateResourceMetrics({
      resourceId: testResourceId,
      resourceName: testResourceName,
      resourceType: 'Server',
      provider: 'azure',
      region: 'eastus',
      metrics: {
        disks: [
          { filesystem: '/dev/sda1', mount: '/', usagePercent: 90 },
          { filesystem: '/dev/sdb1', mount: '/data', usagePercent: 45 },
        ],
      },
    });

    const activeDisks = await Alert.find({
      resourceId: testResourceId,
      metricName: 'disk',
      status: 'active',
    });

    const t5Passed =
      activeDisks.length === 1 &&
      activeDisks[0].filesystem === '/' &&
      activeDisks[0].value === 90 &&
      activeDisks[0].severity === 'critical'; // >= 90% critical escalation

    results.push({
      test: '5. Disk 90% on / -> Alert created (and escalated to Critical >= 90%)',
      passed: t5Passed,
      details: `Mount: ${activeDisks[0]?.filesystem}, Value: ${activeDisks[0]?.value}%, Severity: ${activeDisks[0]?.severity}`,
    });

    // -------------------------------------------------------------
    // Test 6: Metric falls below 70% (CPU 50%) -> Mark alert as Resolved
    // -------------------------------------------------------------
    const res6 = await evaluateResourceMetrics({
      resourceId: testResourceId,
      resourceName: testResourceName,
      resourceType: 'Server',
      provider: 'azure',
      region: 'eastus',
      metrics: {
        cpuUtilization: 50,
      },
    });

    const resolvedCpuAlert = await Alert.findOne({
      resourceId: testResourceId,
      metricName: 'cpu',
      status: 'resolved',
    });

    const t6Passed =
      res6[0].action === 'resolved' &&
      resolvedCpuAlert !== null &&
      resolvedCpuAlert.resolvedAt !== null &&
      resolvedCpuAlert.history.some((h) => h.status === 'resolved');

    results.push({
      test: '6. Metric falls below 70% (CPU 50%) -> Alert marked as Resolved',
      passed: !!t6Passed,
      details: `Status: ${resolvedCpuAlert?.status}, ResolvedAt: ${resolvedCpuAlert?.resolvedAt?.toISOString()}`,
    });

    // -------------------------------------------------------------
    // Test 7: Repeated metric collection (Disk 90% again) -> No duplicate active alert
    // -------------------------------------------------------------
    await evaluateResourceMetrics({
      resourceId: testResourceId,
      resourceName: testResourceName,
      resourceType: 'Server',
      provider: 'azure',
      region: 'eastus',
      metrics: {
        disks: [{ filesystem: '/dev/sda1', mount: '/', usagePercent: 90 }],
      },
    });

    const diskAlertsCount = await Alert.countDocuments({
      resourceId: testResourceId,
      metricName: 'disk',
      filesystem: '/',
      status: 'active',
    });

    const t7Passed = diskAlertsCount === 1;

    results.push({
      test: '7. Repeated metric collection -> No duplicate active alert',
      passed: t7Passed,
      details: `Active disk alerts count: ${diskAlertsCount}`,
    });

    // -------------------------------------------------------------
    // Test 8: Missing metric (null / undefined / NaN) -> No false alert
    // -------------------------------------------------------------
    const res8 = await evaluateResourceMetrics({
      resourceId: testResourceId,
      resourceName: testResourceName,
      resourceType: 'Server',
      provider: 'azure',
      region: 'eastus',
      metrics: {
        cpuUtilization: null,
        memoryUtilization: undefined,
        diskUtilization: NaN,
      },
    });

    const t8Passed = res8.length === 0;

    results.push({
      test: '8. Missing metric (null / undefined / NaN) -> Skipped, No false alert',
      passed: t8Passed,
      details: `Evaluated results length: ${res8.length}`,
    });

    // -------------------------------------------------------------
    // Test 9: Crossing threshold again after resolution -> New occurrence
    // -------------------------------------------------------------
    const res9 = await evaluateResourceMetrics({
      resourceId: testResourceId,
      resourceName: testResourceName,
      resourceType: 'Server',
      provider: 'azure',
      region: 'eastus',
      metrics: {
        cpuUtilization: 76,
      },
    });

    const activeCpuAgain = await Alert.findOne({
      resourceId: testResourceId,
      metricName: 'cpu',
      status: 'active',
    });

    const t9Passed =
      res9[0].action === 'created' &&
      activeCpuAgain !== null &&
      activeCpuAgain._id.toString() !== activeCpuAlert?._id.toString();

    results.push({
      test: '9. CPU crosses 70% again after resolution -> New alert occurrence created',
      passed: !!t9Passed,
      details: `New Alert ID: ${activeCpuAgain?._id}, Old ID: ${activeCpuAlert?._id}`,
    });
  } finally {
    // Clean up all test fixtures so production data remains pristine
    await Alert.deleteMany({ resourceId: testResourceId });
    await Notification.deleteMany({ resourceId: testResourceId });
    console.log(`[Tests] Cleaned up test fixtures for ${testResourceId}`);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { passed, failed, results };
}
