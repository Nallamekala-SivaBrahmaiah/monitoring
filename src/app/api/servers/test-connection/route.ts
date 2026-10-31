import { NextRequest, NextResponse } from 'next/server';
import { collectServerViaSSH } from '@/lib/serverMonitoring/sshCollector';

/**
 * POST /api/servers/test-connection
 * Tests SSH connectivity and credentials without saving to database.
 * Returns operating system and hardware discovery preview.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port = 22, username, authMethod = 'privateKey', authSecret } = body;

    if (!host || !username || !authSecret) {
      return NextResponse.json(
        { error: 'Host, username, and authentication secret are required for testing' },
        { status: 400 }
      );
    }

    const parsedPort = parseInt(port, 10) || 22;

    const specs = await collectServerViaSSH({
      host: host.trim(),
      port: parsedPort,
      username: username.trim(),
      authMethod,
      authSecret,
      timeoutMs: 10000,
    });

    return NextResponse.json({
      success: true,
      message: 'SSH Connection and host verification successful!',
      preview: {
        os: specs.os,
        hardware: specs.hardware,
        dockerDetected: specs.docker.detected,
        dockerVersion: specs.docker.version,
        dockerContainers: specs.docker.containersCount,
        k8sDetected: specs.kubernetes.detected,
        k8sVersion: specs.kubernetes.version,
        initialCpu: `${specs.metrics.cpu.usagePercent}%`,
        initialMemory: `${specs.metrics.memory.usagePercent}%`,
        disksCount: specs.metrics.disks.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Connection test failed',
      },
      { status: 422 }
    );
  }
}
