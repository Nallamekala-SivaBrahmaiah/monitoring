import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import NginxServer from '@/models/NginxServer';
import { resolveDockerServer, executeDockerHostAction } from '@/lib/docker/dockerEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const validActions = ['install', 'uninstall', 'start', 'stop', 'restart'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const res = await executeDockerHostAction(server, action);

    // Update state in MongoDB based on action result
    const serverDbId = server._id;

    if (action === 'install' && res.success) {
      if (serverDbId) {
        await Server.findByIdAndUpdate(serverDbId, {
          $set: {
            'docker.detected': true,
            'docker.status': 'running',
            'docker.version': 'docker.io',
            'docker.lastSyncedAt': new Date(),
          },
        }).catch(() => {});

        await NginxServer.findOneAndUpdate(
          { $or: [{ _id: serverDbId }, { host: server.host }] },
          { $set: { dockerInstalled: true, dockerStatus: 'RUNNING' } }
        ).catch(() => {});
      }
    } else if (action === 'uninstall' && res.success) {
      if (serverDbId) {
        await Server.findByIdAndUpdate(serverDbId, {
          $set: {
            'docker.detected': false,
            'docker.status': 'not_installed',
            'docker.version': null,
            'docker.containerCount': 0,
            'docker.runningContainers': 0,
            'docker.lastSyncedAt': new Date(),
          },
        }).catch(() => {});

        await NginxServer.findOneAndUpdate(
          { $or: [{ _id: serverDbId }, { host: server.host }] },
          { $set: { dockerInstalled: false, dockerStatus: 'NOT_INSTALLED' } }
        ).catch(() => {});
      }
    } else if (action === 'stop' && res.success) {
      if (serverDbId) {
        await Server.findByIdAndUpdate(serverDbId, {
          $set: { 'docker.status': 'stopped' },
        }).catch(() => {});
      }
    } else if (action === 'start' && res.success) {
      if (serverDbId) {
        await Server.findByIdAndUpdate(serverDbId, {
          $set: { 'docker.status': 'running' },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: res.success,
      action,
      output: res.output,
      message: res.success
        ? `Docker ${action} completed successfully on ${server.name || server.host}.`
        : `Docker ${action} command finished with issues: ${res.output.slice(-200)}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
