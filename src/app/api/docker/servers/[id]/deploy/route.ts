import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import {
  resolveDockerServer,
  execute1ClickDockerDeployment,
  scanServerClonedRepos,
  cloneRepoOnServer,
} from '@/lib/docker/dockerEngine';
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
    const defaultUser = server.username || 'azureuser';

    // 1. Actively scan the host VM via SSH for actually cloned git repositories
    const clonedRepos = await scanServerClonedRepos(server);

    // 2. Determine default or active config based on real cloned repos
    const defaultStackConfig = {
      serverId: sid,
      appName: clonedRepos.length > 0 ? clonedRepos[0].name : '',
      stackType: clonedRepos.length > 0 ? clonedRepos[0].stack : 'mern',
      gitRepoUrl: clonedRepos.length > 0 ? clonedRepos[0].url : '',
      gitBranch: clonedRepos.length > 0 ? clonedRepos[0].branch : 'main',
      appDirectory: clonedRepos.length > 0 ? clonedRepos[0].path : `/home/${defaultUser}/apps/mern`,
      frontendDirectory: 'src',
      backendDirectory: 'src/server',
      frontendDockerfile: 'Dockerfile',
      backendDockerfile: 'Dockerfile',
      composeFilePath: 'docker-compose.yml',
      packageManager: 'npm',
      buildCommand: 'npm run build',
      runCommand: 'npm start',
      frontendContainerName: 'mern-frontend',
      backendContainerName: 'mern-backend',
      databaseContainerName: 'mern-database',
      redisContainerName: 'mern-redis-cache',
      nginxContainerName: 'mern-nginx-proxy',
      frontendPort: 3001,
      backendPort: 5001,
      databasePort: 5431,
      healthCheckUrl: 'http://localhost:3001',
      healthCheckTimeout: 15,
    };

    // Load or create default app config
    let config = await DockerAppConfig.findOne({ serverId: sid }).lean();
    if (!config || config.gitRepoUrl?.includes('monitoring.git') || config.appName === 'monitoring-app') {
      config = defaultStackConfig;
    } else if (clonedRepos.length === 0 && config.gitRepoUrl?.includes('github.com/Nallamekala-SivaBrahmaiah/')) {
      // If VM has zero cloned repositories, do not display hardcoded sample template as if it were cloned
      config = {
        ...config,
        gitRepoUrl: '',
        appName: '',
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
      clonedRepos,
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

    // Scan VM for cloned repos
    if (action === 'scan_repos') {
      const clonedRepos = await scanServerClonedRepos(server);
      return NextResponse.json({
        success: true,
        clonedRepos,
      });
    }

    // Clone a repository to the VM
    if (action === 'clone_repo') {
      const { repoUrl, targetPath, branch = 'main', stackType = 'custom' } = body;
      const cloneRes = await cloneRepoOnServer(server, repoUrl, targetPath, branch);
      const clonedRepos = await scanServerClonedRepos(server);

      let updatedConfig = null;
      if (cloneRes.success) {
        const repoName = (targetPath || '').split('/').filter(Boolean).pop() || `${stackType}-app`;
        updatedConfig = await DockerAppConfig.findOneAndUpdate(
          { serverId: sid },
          {
            serverId: sid,
            appName: repoName,
            stackType,
            gitRepoUrl: repoUrl,
            gitBranch: branch,
            appDirectory: targetPath,
          },
          { upsert: true, new: true }
        ).lean();
      }

      return NextResponse.json({
        success: cloneRes.success,
        output: cloneRes.output,
        error: cloneRes.error,
        clonedRepos,
        config: updatedConfig,
      });
    }

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
    const defaultUser = server.username || 'azureuser';
    const defaultStackConfig = {
      serverId: sid,
      appName: 'mern-stack-app',
      stackType: 'mern',
      gitRepoUrl: '',
      gitBranch: 'main',
      appDirectory: `/home/${defaultUser}/apps/mern`,
      frontendDirectory: 'src',
      backendDirectory: 'src/server',
      frontendDockerfile: 'Dockerfile',
      backendDockerfile: 'Dockerfile',
      composeFilePath: 'docker-compose.yml',
      packageManager: 'npm',
      buildCommand: 'npm run build',
      runCommand: 'npm start',
      frontendContainerName: 'mern-frontend',
      backendContainerName: 'mern-backend',
      databaseContainerName: 'mern-database',
      redisContainerName: 'mern-redis-cache',
      nginxContainerName: 'mern-nginx-proxy',
      frontendPort: 3001,
      backendPort: 5001,
      databasePort: 5431,
      healthCheckUrl: 'http://localhost:3001',
      healthCheckTimeout: 15,
    };

    let effectiveConfig = await DockerAppConfig.findOne({ serverId: sid }).lean();
    if (!effectiveConfig || effectiveConfig.gitRepoUrl?.includes('monitoring.git') || effectiveConfig.appName === 'monitoring-app') {
      effectiveConfig = defaultStackConfig;
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

