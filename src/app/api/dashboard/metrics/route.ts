import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Metric from '@/models/Metric';
import CloudResource from '@/models/CloudResource';



export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const query: any = {};
    if (provider && provider !== 'all') {
      query.provider = provider;
    }

    // Fetch latest time-series metrics from MongoDB
    const metrics = await Metric.find(query).sort({ timestamp: -1 }).limit(100).lean();

    if (metrics.length > 0) {
      return NextResponse.json(
        metrics.map((m: any) => ({
          id: m._id.toString(),
          resourceId: m.resourceId,
          metricName: m.metricName,
          value: m.value,
          unit: m.unit,
          timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
        }))
      );
    }

    // Fallback: extract latest non-null metric points from CloudResource
    const resources = await CloudResource.find({
      ...query,
      'metrics.cpuUtilization': { $ne: null },
    })
      .select('name resourceId provider region metrics updatedAt')
      .lean();

    return NextResponse.json(
      resources.map((r: any) => ({
        id: r._id.toString(),
        resourceId: r.resourceId,
        resourceName: r.name,
        provider: r.provider,
        cpu: r.metrics?.cpuUtilization,
        memory: r.metrics?.memoryUtilization,
        disk: r.metrics?.diskUtilization,
        networkIn: r.metrics?.networkIn,
        networkOut: r.metrics?.networkOut,
        timestamp: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    return NextResponse.json([], { status: 200 });
  }
}
