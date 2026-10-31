import connectToDatabase from '@/lib/mongodb';
import Alert, { IAlert } from '@/models/Alert';
import CloudResource from '@/models/CloudResource';

export async function evaluateResourceAlerts(): Promise<number> {
  let createdCount = 0;
  try {
    await connectToDatabase();

    // Look for high CPU utilization (> 85%) on real resources
    const highCpuResources = await CloudResource.find({
      'metrics.cpuUtilization': { $gt: 85 },
    }).lean();

    for (const r of highCpuResources) {
      const existing = await Alert.findOne({
        resourceId: r.resourceId,
        status: 'active',
        title: 'High CPU Utilization',
      });

      if (!existing) {
        await Alert.create({
          provider: r.provider,
          resourceId: r.resourceId,
          resourceName: r.name,
          severity: r.metrics.cpuUtilization! > 95 ? 'critical' : 'warning',
          title: 'High CPU Utilization',
          message: `${r.name} in ${r.region} is consuming ${r.metrics.cpuUtilization}% CPU.`,
          region: r.region,
          status: 'active',
          timestamp: new Date(),
        });
        createdCount++;
      }
    }
  } catch (err) {
    console.error('[Alert Engine] Evaluation error:', err);
  }

  return createdCount;
}

export async function getActiveAlerts(provider?: string) {
  await connectToDatabase();
  const query: any = { status: 'active' };
  if (provider && provider !== 'all') {
    query.provider = provider;
  }
  return Alert.find(query).sort({ timestamp: -1 }).limit(50).lean();
}
