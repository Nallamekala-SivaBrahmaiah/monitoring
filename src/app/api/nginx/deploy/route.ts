import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import NginxDeployment from '@/models/NginxDeployment';
import { deployBuildArchive, deployGitRepository, configureNginxSite } from '@/lib/nginx/nginxEngine';

/**
 * POST /api/nginx/deploy
 * Handles local build archive upload (ZIP) or GitHub repository deployment and initiates real deployment
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const formData = await req.formData();

    const deploySource = (formData.get('deploySource') as string) || 'local'; // 'local' | 'git'
    const file = formData.get('file') as File | null;
    const gitRepoUrl = (formData.get('gitRepoUrl') as string || '').trim();
    const gitBranch = (formData.get('gitBranch') as string || 'main').trim();
    const installCommand = (formData.get('installCommand') as string || 'npm install').trim();
    const buildCommand = (formData.get('buildCommand') as string || '').trim();

    const serverId = formData.get('serverId') as string;
    const appName = (formData.get('appName') as string || 'app').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const appType = (formData.get('appType') as any) || 'vite';
    const deploymentMode = (formData.get('deploymentMode') as any) || (appType === 'vite' || appType === 'react' ? 'static' : 'pm2-node');
    const deployDir = (formData.get('deployDir') as string || `/var/www/${appName}`).trim();
    const appPort = parseInt((formData.get('appPort') as string) || '3000', 10);
    const domain = (formData.get('domain') as string || '').trim();
    const pm2ProcessName = (formData.get('pm2ProcessName') as string || appName).trim();
    const startCommand = (formData.get('startCommand') as string || 'npm start').trim();
    const envVarsRaw = formData.get('envVars') as string;

    let envVars: Record<string, string> = {};
    if (envVarsRaw) {
      try {
        envVars = JSON.parse(envVarsRaw);
      } catch {
        // parse key=value lines
        envVarsRaw.split('\n').forEach((l) => {
          const eq = l.indexOf('=');
          if (eq > 0) {
            envVars[l.slice(0, eq).trim()] = l.slice(eq + 1).trim();
          }
        });
      }
    }

    if (deploySource === 'local' && !file) {
      return NextResponse.json({ success: false, error: 'Build archive file (ZIP) is required for local build deployment.' }, { status: 400 });
    }

    if (deploySource === 'git' && !gitRepoUrl) {
      return NextResponse.json({ success: false, error: 'GitHub repository URL is required for Git deployment.' }, { status: 400 });
    }

    if (!serverId) {
      return NextResponse.json({ success: false, error: 'Target server is required.' }, { status: 400 });
    }

    const server = await NginxServer.findById(serverId);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Target server not found.' }, { status: 404 });
    }

    // Generate unique deployment ID
    const count = await NginxDeployment.countDocuments();
    const deploymentId = `dep-${Date.now().toString(36)}-${count + 1}`;

    if (deploySource === 'git') {
      const deployment = await NginxDeployment.create({
        deploymentId,
        appName,
        appType,
        deploymentMode,
        deploySource: 'git',
        gitRepoUrl,
        gitBranch,
        serverId: server._id.toString(),
        serverName: server.name,
        serverHost: server.host,
        deployDir,
        appPort,
        domain,
        pm2ProcessName,
        startCommand,
        envVars,
        archiveName: `${gitRepoUrl}#${gitBranch}`,
        archiveSizeBytes: 0,
        status: 'PENDING',
        startTime: new Date(),
        logs: `[Deployment Manager] GitHub deployment initialized for "${appName}" from ${gitRepoUrl} (${gitBranch}) on ${server.name} (${server.host})...\n`,
      });

      // Execute real git deployment asynchronously in background
      setImmediate(async () => {
        try {
          await deployGitRepository(server.toObject(), deployment, {
            repoUrl: gitRepoUrl,
            branch: gitBranch,
            installCommand,
            buildCommand,
          });

          // If domain or reverse proxy configured, configure site
          if (domain || deploymentMode === 'static') {
            await configureNginxSite(server.toObject(), {
              domain: domain || `${appName}.local`,
              listenPort: 80,
              proxyPass: deploymentMode !== 'static' ? `http://127.0.0.1:${appPort}` : undefined,
              rootPath: deploymentMode === 'static' ? (buildCommand ? `${deployDir}/dist` : deployDir) : undefined,
              isStatic: deploymentMode === 'static',
              spaFallback: true,
            });
          }
        } catch (err: any) {
          console.error(`[NginxDeployment] Error running git deployment ${deploymentId}:`, err);
        }
      });

      return NextResponse.json({
        success: true,
        deploymentId,
        message: `GitHub deployment "${deploymentId}" started on server "${server.name}".`,
        deployment,
      });
    }

    // Local ZIP deployment
    const bytes = await file!.arrayBuffer();
    const zipBuffer = Buffer.from(bytes);

    const deployment = await NginxDeployment.create({
      deploymentId,
      appName,
      appType,
      deploymentMode,
      deploySource: 'local',
      serverId: server._id.toString(),
      serverName: server.name,
      serverHost: server.host,
      deployDir,
      appPort,
      domain,
      pm2ProcessName,
      startCommand,
      envVars,
      archiveName: file!.name,
      archiveSizeBytes: zipBuffer.length,
      status: 'UPLOADING',
      startTime: new Date(),
      logs: `[Deployment Manager] Local build job initialized for "${appName}" on ${server.name} (${server.host})...\n`,
    });

    // Execute real local build deployment asynchronously in background
    setImmediate(async () => {
      try {
        await deployBuildArchive(server.toObject(), deployment, zipBuffer);

        // If domain or reverse proxy configured, configure site
        if (domain || deploymentMode === 'static') {
          await configureNginxSite(server.toObject(), {
            domain: domain || `${appName}.local`,
            listenPort: 80,
            proxyPass: deploymentMode !== 'static' ? `http://127.0.0.1:${appPort}` : undefined,
            rootPath: deploymentMode === 'static' ? deployDir : undefined,
            isStatic: deploymentMode === 'static',
            spaFallback: true,
          });
        }
      } catch (err: any) {
        console.error(`[NginxDeployment] Error running local deployment ${deploymentId}:`, err);
      }
    });

    return NextResponse.json({
      success: true,
      deploymentId,
      message: `Deployment "${deploymentId}" initiated successfully on server "${server.name}".`,
      deployment,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

