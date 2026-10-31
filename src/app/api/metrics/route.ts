import { NextResponse } from 'next/server';
import promClient from 'prom-client';
import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import CloudAccount from '@/models/CloudAccount';



// Initialize Prometheus Register
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom Cloud Metrics Gauges
const totalResourcesGauge = new promClient.Gauge({
  name: 'cloud_total_resources',
  help: 'Total count of monitored cloud resources',
  labelNames: ['provider', 'resourceType'],
  registers: [register],
});

const vmCpuGauge = new promClient.Gauge({
  name: 'cloud_vm_cpu_utilization_percent',
  help: 'CPU utilization percentage of virtual machines',
  labelNames: ['provider', 'resourceId', 'resourceName', 'region'],
  registers: [register],
});

export async function GET() {
  try {
    await connectToDatabase();

    // Collect latest counts from MongoDB
    const resources = await CloudResource.find().select('provider resourceType resourceId name region metrics status').lean();

    // Reset gauge values
    totalResourcesGauge.reset();
    vmCpuGauge.reset();

    for (const r of resources) {
      totalResourcesGauge.inc({ provider: r.provider, resourceType: r.resourceType });
      if (r.metrics?.cpuUtilization !== null && r.metrics?.cpuUtilization !== undefined) {
        vmCpuGauge.set(
          {
            provider: r.provider,
            resourceId: r.resourceId,
            resourceName: r.name,
            region: r.region,
          },
          r.metrics.cpuUtilization
        );
      }
    }

    const metricsData = await register.metrics();
    return new NextResponse(metricsData, {
      headers: {
        'Content-Type': register.contentType,
      },
    });
  } catch (err: any) {
    return new NextResponse(register.metrics ? await register.metrics() : '# Error collecting metrics', {
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
