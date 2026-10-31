import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';

/**
 * POST /api/servers/agent/heartbeat
 * Receives periodic telemetry push from a running monitoring agent.
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { token, version = '1.2.0', uptime, load, memory, docker, kubernetes } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Valid agent token required' }, { status: 401 });
    }

    const server = await Server.findOne({ 'agent.token': token });
    if (!server) {
      return NextResponse.json({ error: 'Unrecognized agent token' }, { status: 403 });
    }

    // Update agent state
    server.agent.installed = true;
    server.agent.version = version;
    server.agent.lastHeartbeat = new Date();
    server.agent.status = 'healthy';
    server.status = 'Online';
    server.lastHeartbeatAt = new Date();
    server.lastError = null;

    if (uptime && typeof uptime === 'number') {
      server.os.uptimeSeconds = uptime;
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const mins = Math.floor((uptime % 3600) / 60);
      server.os.uptimeFormatted = `${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m`;
    }

    if (load && typeof load === 'string') {
      const parts = load.trim().split(/\s+/);
      const load1 = parseFloat(parts[0]) || 0;
      const load5 = parseFloat(parts[1]) || 0;
      const load15 = parseFloat(parts[2]) || 0;
      server.metrics.cpu.loadAvg1m = load1;
      server.metrics.cpu.loadAvg5m = load5;
      server.metrics.cpu.loadAvg15m = load15;
      server.metrics.cpu.usagePercent = Math.min(100, Math.round((load1 / Math.max(1, server.hardware.cpuCores)) * 100));
      server.metrics.cpu.timestamp = new Date();
    }

    if (memory && typeof memory.total === 'number' && memory.total > 0) {
      server.metrics.memory.totalBytes = memory.total;
      server.metrics.memory.usedBytes = memory.used;
      server.metrics.memory.availableBytes = memory.available;
      server.metrics.memory.usagePercent = Math.min(100, Math.round(((memory.total - memory.available) / memory.total) * 100));
      server.metrics.memory.timestamp = new Date();
    }

    if (docker) {
      server.docker.detected = !!docker.detected;
      if (docker.version) server.docker.version = docker.version;
      if (typeof docker.runningCount === 'number') server.docker.runningCount = docker.runningCount;
      server.docker.lastSyncedAt = new Date();
    }

    if (kubernetes) {
      server.kubernetes.detected = !!kubernetes.detected;
      server.kubernetes.lastSyncedAt = new Date();
    }

    await server.save();

    return NextResponse.json({
      success: true,
      status: 'acknowledged',
      server: server.name,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Agent heartbeat error:', err);
    return NextResponse.json({ error: 'Internal server error processing heartbeat' }, { status: 500 });
  }
}
