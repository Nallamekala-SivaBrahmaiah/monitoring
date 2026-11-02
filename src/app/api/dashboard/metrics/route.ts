import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Metric from '@/models/Metric';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const serverFilter = searchParams.get('server');
    const metricParam = searchParams.get('metric');

    const query: any = {};
    if (provider && provider !== 'all') {
      query.provider = provider;
    }
    if (metricParam && metricParam !== 'all') {
      query.metricName = { $regex: new RegExp(`^${metricParam}$`, 'i') };
    }

    // Build server and cloud resource name mapping
    const [servers, cloudRes] = await Promise.all([
      Server.find().select('_id name host cloudProvider').lean(),
      CloudResource.find().select('resourceId name publicIp provider').lean(),
    ]);

    const nameMap: Record<string, { name: string; host: string; provider: string }> = {};
    for (const s of (servers as any[])) {
      const sId = s._id.toString();
      nameMap[sId] = { name: s.name, host: s.host, provider: s.cloudProvider || 'other' };
      nameMap[`srv-${sId}`] = { name: s.name, host: s.host, provider: s.cloudProvider || 'other' };
    }
    for (const cr of (cloudRes as any[])) {
      if (cr.resourceId) {
        nameMap[cr.resourceId] = { name: cr.name, host: cr.publicIp || '', provider: cr.provider };
      }
    }

    if (serverFilter && serverFilter !== 'all') {
      const matchedIds = Object.keys(nameMap).filter(
        (id) => nameMap[id].name.toLowerCase() === serverFilter.toLowerCase() || id === serverFilter
      );
      if (matchedIds.length > 0) {
        query.resourceId = { $in: matchedIds };
      }
    }

    // Fetch latest time-series metrics from MongoDB in ascending chronological order (oldest to newest)
    let metrics = await Metric.find(query).sort({ timestamp: 1 }).limit(100).lean();

    if (metrics.length > 0) {
      return NextResponse.json(
        metrics.map((m: any) => {
          const info = nameMap[m.resourceId] || {
            name: m.resourceId.replace(/^srv-/, ''),
            host: '',
            provider: m.provider || 'azure',
          };
          return {
            id: m._id.toString(),
            resourceId: m.resourceId,
            serverName: info.name,
            host: info.host,
            metricName: m.metricName,
            value: m.value,
            unit: m.unit,
            provider: m.provider || info.provider || 'azure',
            timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
          };
        })
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
