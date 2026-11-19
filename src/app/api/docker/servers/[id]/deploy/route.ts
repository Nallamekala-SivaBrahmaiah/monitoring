import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { resolveDockerServer, execute1ClickDockerDeployment } from '@/lib/docker/dockerEngine';
import DockerAppConfig from '@/models/DockerAppConfig';
import DockerDeployment from '@/models/DockerDeployment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const sid = server._id?.toString() || id;

    // Load or create default app config
    let config = await DockerAppConfig.findOne({ serverId: sid }).lean();
    if (!config) {
      config = {
        serverId: sid,
        appName: 'monitoring-app',
        gitRepoUrl: 'https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git',
        gitBranch: 'main',
        appDirectory: `/home/${server.username || 'siva'}/monitoring`,
        frontendDirectory: 'src',
        backendDirectory: 'src/server',
        frontendDockerfile: 'Dockerfile',
        backendDockerfile: 'Dockerfile',
        composeFilePath: 'docker-compose.yml',
        packageManager: 'npm',
        frontendContainerName: 'monitoring-frontend',
        backendContainerName: 'monitoring-backend',
        databaseContainerName: 'monitoring-database',
        redisContainerName: 'monitoring-redis-cache',
        nginxContainerName: 'monitoring-nginx-proxy',
        frontendPort: 3000,
        backendPort: 5000,
        healthCheckUrl: 'http://localhost:3000',
        healthCheckTimeout: 15,
      };
    }

    // Load deployment history
    const history = await DockerDeployment.find({ serverId: sid })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      serverId: sid,
      config,
      history,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { action = 'deploy', config: incomingConfig } = body;

    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const sid = server._id?.toString() || id;

    // Save configuration
    if (action === 'save_config' || incomingConfig) {
      const updated = await DockerAppConfig.findOneAndUpdate(
        { serverId: sid },
        { ...incomingConfig, serverId: sid },
        { upsert: true, new: true }
      ).lean();

      if (action === 'save_config') {
        return NextResponse.json({
          success: true,
          message: 'Docker application configuration saved successfully',
          config: updated,
        });
      }
    }

    // Load effective configuration
    let effectiveConfig = await DockerAppConfig.findOne({ serverId: sid }).lean();
    if (!effectiveConfig) {
      effectiveConfig = {
        serverId: sid,
        appName: 'monitoring-app',
        gitRepoUrl: 'https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git',
        gitBranch: 'main',
        appDirectory: `/home/${server.username || 'siva'}/monitoring`,
        frontendDirectory: 'src',
        backendDirectory: 'src/server',
        frontendDockerfile: 'Dockerfile',
        backendDockerfile: 'Dockerfile',
        composeFilePath: 'docker-compose.yml',
        packageManager: 'npm',
        frontendContainerName: 'monitoring-frontend',
        backendContainerName: 'monitoring-backend',
        databaseContainerName: 'monitoring-database',
        redisContainerName: 'monitoring-redis-cache',
        nginxContainerName: 'monitoring-nginx-proxy',
        frontendPort: 3000,
        backendPort: 5000,
        healthCheckUrl: 'http://localhost:3000',
        healthCheckTimeout: 15,
      };
    }

    // Execute 1-Click Deployment
    if (action === 'deploy') {
      const result = await execute1ClickDockerDeployment(server, effectiveConfig);
      return NextResponse.json({
        success: result.success,
        deploymentId: result.deploymentId,
        logs: result.logs,
        steps: result.steps,
        error: result.error,
      });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

