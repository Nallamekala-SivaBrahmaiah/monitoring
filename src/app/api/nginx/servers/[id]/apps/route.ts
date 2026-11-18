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

    let apps = await NginxApp.find({ serverId: id }).sort({ createdAt: 1 }).lean();

    // If no apps registered yet for this server, attempt live SSH discovery on the server
    if (!apps || apps.length === 0) {
      // Check if there are real discovered apps on the machine
      let discovered: any[] = [];
      try {
        discovered = await discoverApplications(server.toObject());
      } catch (discErr: any) {
        console.warn(`[NginxApps] Discovery notice for ${server.name}:`, discErr.message);
      }

      if (discovered && discovered.length > 0) {
        const discoveredList: Partial<INginxAppData>[] = [];
        for (const da of discovered) {
          if (!da.directory) continue;
          discoveredList.push({
            serverId: id,
            serverName: server.name,
            serverHost: server.host,
            name: da.name || path.basename(da.directory),
            type: (da.type as any) || 'nodejs',
            frameworkName: da.frameworkName || 'Discovered Application',
            directory: da.directory,
            gitRepoUrl: da.gitRepoUrl || '',
            gitBranch: da.gitBranch || 'main',
            packageManager: (da.packageManager?.toLowerCase() as any) || 'auto',
            buildCommand: da.buildConfig || 'npm run build',
            startCommand: da.startCommand || 'npm start',
            pm2ProcessName: da.pm2Name || '',
            appPort: da.port || 3000,
            status: da.pm2Status === 'online' ? 'Deployed' : 'Stopped',
            healthStatus: da.pm2Status === 'online' ? 'Healthy' : 'Unknown',
            iconType: da.type === 'maven' ? 'cart' : da.type === 'nextjs' ? 'globe' : 'layers',
            lastDeployedAt: undefined,
            lastDeploymentDuration: undefined,
          });
        }

        if (discoveredList.length > 0) {
          await NginxApp.insertMany(discoveredList);
          apps = await NginxApp.find({ serverId: id }).sort({ createdAt: 1 }).lean();
        }
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
          packageManager,
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
        packageManager,
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
