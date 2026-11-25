import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ServerIncident from '@/models/ServerIncident';
import { syncActiveAlertsToIncidents } from '@/lib/activityCenter/intelligentTroubleshooting';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    // Sync any new alerts into incident records
    await syncActiveAlertsToIncidents();

    const status = searchParams.get('status') || 'all';
    const resourceType = searchParams.get('resourceType') || 'all';
    const severity = searchParams.get('severity') || 'all';
    const server = searchParams.get('server') || '';

    const query: any = {};
    if (status !== 'all') {
      if (status === 'active') {
        query.status = { $in: ['active', 'investigating', 'fix_approved', 'fixing'] };
      } else if (status === 'resolved') {
        query.status = 'resolved';
      } else {
        query.status = status;
      }
    }
    if (resourceType !== 'all') {
      query.resourceType = resourceType;
    }
    if (severity !== 'all') {
      query.severity = severity;
    }
    if (server.trim()) {
      query.serverName = { $regex: server.trim(), $options: 'i' };
    }

    const [incidents, allIncidents] = await Promise.all([
      ServerIncident.find(query).sort({ startedAt: -1 }).limit(100).lean(),
      ServerIncident.find().lean(),
    ]);

    const activeCount = allIncidents.filter((i) => i.status !== 'resolved').length;
    const resolvedCount = allIncidents.filter((i) => i.status === 'resolved').length;
    const criticalCount = allIncidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length;
    const warningCount = allIncidents.filter((i) => i.severity === 'warning' && i.status !== 'resolved').length;

    const diskIssues = allIncidents.filter((i) => i.resourceType === 'disk' && i.status !== 'resolved').length;
    const memoryIssues = allIncidents.filter((i) => i.resourceType === 'memory' && i.status !== 'resolved').length;
    const cpuIssues = allIncidents.filter((i) => i.resourceType === 'cpu' && i.status !== 'resolved').length;

    return NextResponse.json({
      success: true,
      incidents,
      stats: {
        total: allIncidents.length,
        active: activeCount,
        resolved: resolvedCount,
        critical: criticalCount,
        warning: warningCount,
        diskIssues,
        memoryIssues,
        cpuIssues,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
