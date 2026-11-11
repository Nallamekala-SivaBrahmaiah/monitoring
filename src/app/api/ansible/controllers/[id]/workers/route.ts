import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import AnsibleHost from '@/models/AnsibleHost';
import Server from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/ansible/controllers/:controllerId/workers
 * List strictly the workers assigned to this controller.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid controller ID' }, { status: 400 });
    }

    const controller = await AnsibleController.findById(id).lean();
    if (!controller) {
      return NextResponse.json({ success: false, error: 'Controller not found' }, { status: 404 });
    }

    const targetId = new mongoose.Types.ObjectId(id);
    const workers = await AnsibleHost.find({
      $or: [{ controllerId: targetId }, { controllerId: id }],
    })
      .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      controllerId: id,
      controllerName: controller.name,
      count: workers.length,
      workers,
      hosts: workers, // Compatibility alias
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/ansible/controllers/:controllerId/workers
 * Register one or multiple workers strictly under this controller.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid controller ID' }, { status: 400 });
    }

    const controller = await AnsibleController.findById(id);
    if (!controller) {
      return NextResponse.json({ success: false, error: 'Controller not found' }, { status: 404 });
    }

    const body = await req.json();

    // Check if body is an array of workers or a single worker payload
    const items = Array.isArray(body.workers)
      ? body.workers
      : Array.isArray(body)
      ? body
      : [body];

    const results = [];

    for (const item of items) {
      const name = item.name || item.customName || 'Managed-Worker';
      const ip = (item.ip || item.ipAddress || item.host || '').trim();
      const privateIp = (item.privateIp || '').trim() || undefined;
      const instanceId = (item.instanceId || item.resourceId || '').trim() || undefined;
      const provider = (item.provider || item.cloudProvider || 'linux').toLowerCase();
      const region = (item.region || 'ap-southeast-2').trim();
      const os = (item.os || 'Ubuntu Linux').trim();
      const username = (item.username || (provider === 'azure' ? 'azureuser' : 'ubuntu')).trim();
      const port = Number(item.port) || 22;
      const authMethod = item.authMethod || 'privateKey';
      const sourceResourceId = item.sourceResourceId || item.serverId || undefined;

      if (!ip) continue;

      // Credential resolution
      let encSecret = '';
      let encIv = '';
      let encTag = '';

      if (item.authSecret && item.authSecret.trim()) {
        const encrypted = encryptSecret(item.authSecret.trim());
        encSecret = encrypted.encrypted;
        encIv = encrypted.iv;
        encTag = encrypted.tag;
      } else if (item.useExistingCredentials !== false) {
        // Inherit from target controller if available
        if (controller.encryptedAuthSecret) {
          encSecret = controller.encryptedAuthSecret;
          encIv = controller.authSecretIv || '';
          encTag = controller.authSecretTag || '';
        }
        // Inherit from server monitoring
        if (!encSecret) {
          const srv = await Server.findOne({
            $or: [
              { host: ip },
              { ip },
              ...(sourceResourceId && mongoose.Types.ObjectId.isValid(sourceResourceId) ? [{ _id: sourceResourceId }] : []),
              ...(instanceId ? [{ resourceId: instanceId }] : []),
              { name },
            ],
            encryptedAuthSecret: { $exists: true, $ne: '' },
          }).lean();

          if (srv && srv.encryptedAuthSecret) {
            encSecret = srv.encryptedAuthSecret;
            encIv = srv.authSecretIv || '';
            encTag = srv.authSecretTag || '';
          }
        }

        // AWS worker fallback to any AWS Server key
        if (!encSecret && provider === 'aws') {
          const anyAws = await Server.findOne({
            encryptedAuthSecret: { $exists: true, $ne: '' },
          }).lean();
          if (anyAws && anyAws.encryptedAuthSecret) {
            encSecret = anyAws.encryptedAuthSecret;
            encIv = anyAws.authSecretIv || '';
            encTag = anyAws.authSecretTag || '';
          }
        }
      }

      // Check if worker already exists under THIS controller
      let existingHost = await AnsibleHost.findOne({
        controllerId: controller._id,
        $or: [
          { ip },
          ...(instanceId ? [{ instanceId }] : []),
          { name },
        ],
      });

      if (existingHost) {
        existingHost.name = name;
        existingHost.ip = ip;
        if (privateIp) existingHost.privateIp = privateIp;
        if (instanceId) existingHost.instanceId = instanceId;
        existingHost.provider = provider as any;
        existingHost.region = region;
        existingHost.os = os;
        existingHost.username = username;
        existingHost.port = port;
        existingHost.authMethod = authMethod;
        if (encSecret) {
          existingHost.encryptedAuthSecret = encSecret;
          existingHost.authSecretIv = encIv;
          existingHost.authSecretTag = encTag;
          existingHost.status = 'Connected';
        }
        await existingHost.save();
        results.push(existingHost);
      } else {
        const newHost = await AnsibleHost.create({
          name,
          controllerId: controller._id,
          controllerName: controller.name,
          instanceId,
          ip,
          privateIp,
          provider,
          region,
          os,
          username,
          port,
          authMethod,
          encryptedAuthSecret: encSecret,
          authSecretIv: encIv,
          authSecretTag: encTag,
          status: encSecret ? 'Connected' : 'Disconnected',
          sourceResourceId,
          sourceResourceType: provider === 'aws' ? 'ec2' : provider === 'azure' ? 'azure-vm' : 'server',
          groups: [provider, 'all'],
          installedServices: [],
        });
        results.push(newHost);
      }
    }

    // Update live worker count on this controller
    const count = await AnsibleHost.countDocuments({
      $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
    });
    await AnsibleController.updateOne({ _id: controller._id }, { $set: { workerCount: count } });

    return NextResponse.json({
      success: true,
      controllerId: id,
      controllerName: controller.name,
      workerCount: count,
      registeredCount: results.length,
      workers: results.map((r) => {
        const obj: any = r.toObject();
        delete obj.encryptedAuthSecret;
        delete obj.authSecretIv;
        delete obj.authSecretTag;
        return obj;
      }),
      message: `Successfully registered ${results.length} worker node(s) under controller "${controller.name}".`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
