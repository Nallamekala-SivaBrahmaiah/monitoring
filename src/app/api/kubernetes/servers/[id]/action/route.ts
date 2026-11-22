import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import { resolveDockerServer } from '@/lib/docker/dockerEngine';
import { executeK8sToolsAction } from '@/lib/kubernetes/k8sToolsEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const validActions = ['install', 'uninstall'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const server = await resolveDockerServer(id);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server not found for id: ${id}` },
        { status: 404 }
      );
    }

    const res = await executeK8sToolsAction(server, action);

    // Update state in MongoDB based on action result
    const serverDbId = server._id;

    if (action === 'install' && res.success) {
      if (serverDbId) {
        await Server.findByIdAndUpdate(serverDbId, {
          $set: {
            'kubernetes.detected': true,
            'kubernetes.version': 'v1.31.0',
            'kubernetes.nodeRole': 'control-plane',
            'kubernetes.lastSyncedAt': new Date(),
          },
        }).catch(() => {});
      }
    } else if (action === 'uninstall' && res.success) {
      if (serverDbId) {
        await Server.findByIdAndUpdate(serverDbId, {
          $set: {
            'kubernetes.detected': false,
            'kubernetes.version': '',
            'kubernetes.lastSyncedAt': new Date(),
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: res.success,
      action,
      cloudProvider: res.cloudProvider,
      tools: res.tools,
      output: res.output,
      message: res.success
        ? action === 'install'
          ? `Kubernetes & ${res.cloudProvider.toUpperCase()} CLI tools installed successfully.`
          : `Kubernetes & ${res.cloudProvider.toUpperCase()} CLI tools uninstalled successfully.`
        : res.error || 'Operation failed',
    });
  } catch (err: any) {
    console.error('Kubernetes server action failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
