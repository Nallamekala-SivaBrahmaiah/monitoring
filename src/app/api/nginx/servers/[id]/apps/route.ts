import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import NginxApp, { INginxAppData } from '@/models/NginxApp';
import { discoverApplications } from '@/lib/nginx/nginxEngine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const isNginxAppDoc = (a: any) => {
      if (!a) return false;
      const t = (a.type || '').toLowerCase();
      const pkg = (a.packageManager || '').toLowerCase();
      const f = (a.frameworkName || '').toLowerCase();
      const n = (a.name || '').toLowerCase();
      const d = (a.directory || '').toLowerCase();
      const excluded = ['docker', 'maven', 'gradle', 'kubernetes', 'jenkins', 'java-web-application'];
      if (n.startsWith('.')) return false;
      if (excluded.some((ex) => t.includes(ex) || pkg.includes(ex) || f.includes(ex) || n.includes(ex) || d.includes(ex))) {
        return false;
      }
      return true;
    };

    // Clean up any stale docker/maven/kubernetes/jenkins apps from Nginx collection
    const existingServerApps = await NginxApp.find({ serverId: id }).lean();
    const staleIds = existingServerApps
      .filter((a: any) => !isNginxAppDoc(a))
      .map((a: any) => a._id);
    if (staleIds.length > 0) {
      await NginxApp.deleteMany({ _id: { $in: staleIds } });
    }

    const scan = req.nextUrl?.searchParams?.get('scan') === 'true';
    let rawApps = await NginxApp.find({ serverId: id }).sort({ createdAt: 1 }).lean();
    let apps = rawApps.filter(isNginxAppDoc);

    // If scan requested or no apps registered yet, attempt live SSH discovery on the server
    if (scan || apps.length === 0) {
      let discovered: any[] = [];
      try {
        discovered = await discoverApplications(server.toObject());
      } catch (discErr: any) {
        console.warn(`[NginxApps] Discovery notice for ${server.name}:`, discErr.message);
      }

      if (discovered && discovered.length > 0) {
        for (const da of discovered) {
          if (!da.directory) continue;
          const appName = da.name || path.basename(da.directory);
          if (appName.startsWith('.') || da.directory.includes('/.nvm') || da.directory.includes('/.next')) {
            continue;
          }
          // Strictly exclude Docker, Maven, Gradle, Kubernetes, Jenkins
          const isExcluded = ['docker', 'maven', 'gradle', 'kubernetes', 'jenkins'].some((ex) =>
            (da.type || '').toLowerCase().includes(ex) ||
            (da.packageManager || '').toLowerCase().includes(ex) ||
            (da.frameworkName || '').toLowerCase().includes(ex) ||
            appName.toLowerCase().includes(ex)
          );
          if (isExcluded) continue;

          const rawPkg = (da.packageManager?.toLowerCase() as string) || 'npm';
          const validPkg = ['npm', 'pnpm', 'yarn', 'bun'].includes(rawPkg)
            ? rawPkg
            : 'npm';

          await NginxApp.findOneAndUpdate(
            { serverId: id, directory: da.directory },
            {
              $set: {
                serverId: id,
                serverName: server.name,
                serverHost: server.host,
                name: appName,
                type: (da.type as any) || 'nodejs',
                frameworkName: da.frameworkName || 'Nginx Web Application',
                directory: da.directory,
                gitRepoUrl: da.gitRepoUrl || '',
                gitBranch: da.gitBranch || 'main',
                packageManager: validPkg,
                buildCommand: da.buildConfig || 'npm run build',
                startCommand: da.startCommand || 'npm start',
                pm2ProcessName: da.pm2Name || '',
                appPort: da.port || 3000,
                status: da.pm2Status === 'online' ? 'Deployed' : 'Stopped',
                healthStatus: da.pm2Status === 'online' ? 'Healthy' : 'Unknown',
                iconType: da.type === 'nextjs' ? 'globe' : 'layers',
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
        rawApps = await NginxApp.find({ serverId: id }).sort({ createdAt: 1 }).lean();
        apps = rawApps.filter(isNginxAppDoc);
      }
    }

    server.discoveredAppCount = apps.length;
    await server.save();

    return NextResponse.json({
      success: true,
      apps,
      count: apps.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const server = await NginxServer.findById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const {
      _id,
      name,
      type = 'nodejs',
      frameworkName,
      directory,
      gitRepoUrl = '',
      gitBranch = 'main',
      packageManager = 'auto',
      buildCommand = '',
      startCommand = 'npm start',
      pm2ProcessName,
      appPort,
      domain = '',
      iconType = 'layers',
    } = body;

    if (!name || !directory) {
      return NextResponse.json(
        { success: false, error: 'Application Name and Directory are required.' },
        { status: 400 }
      );
    }

    const rawPkg = (packageManager?.toLowerCase() as string) || 'auto';
    const validPkg = ['auto', 'npm', 'pnpm', 'yarn', 'bun', 'maven', 'gradle', 'docker', 'pip', 'other'].includes(rawPkg)
      ? rawPkg
      : 'auto';

    let appDoc;
    if (_id) {
      appDoc = await NginxApp.findByIdAndUpdate(
        _id,
        {
          name,
          type,
          frameworkName: frameworkName || `${name} Service`,
          directory,
          gitRepoUrl,
          gitBranch,
          packageManager: validPkg,
          buildCommand,
          startCommand,
          pm2ProcessName: pm2ProcessName || name.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          appPort: appPort ? parseInt(appPort, 10) : undefined,
          domain,
          iconType,
        },
        { new: true }
      );
    } else {
      appDoc = await NginxApp.create({
        serverId: id,
        serverName: server.name,
        serverHost: server.host,
        name,
        type,
        frameworkName: frameworkName || `${name} Service`,
        directory,
        gitRepoUrl,
        gitBranch,
        packageManager: validPkg,
        buildCommand,
        startCommand,
        pm2ProcessName: pm2ProcessName || name.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        appPort: appPort ? parseInt(appPort, 10) : undefined,
        domain,
        status: 'Deployed',
        healthStatus: 'Healthy',
        iconType,
        lastDeployedAt: new Date(),
        lastDeploymentDuration: '1m 00s',
      });
    }

    return NextResponse.json({
      success: true,
      app: appDoc,
      message: _id ? 'Application updated successfully.' : 'Application registered successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');

    if (!appId) {
      return NextResponse.json({ success: false, error: 'appId parameter is required' }, { status: 400 });
    }

    await NginxApp.findOneAndDelete({ _id: appId, serverId: id });
    return NextResponse.json({ success: true, message: 'Application deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
