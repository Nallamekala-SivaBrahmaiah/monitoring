import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleController from '@/models/AnsibleController';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';
import { ensurePlaybookTemplates, purgeFakeAnsibleData } from '@/lib/ansible/ansibleEngine';
import { ensureWorkerControllerAffinity, backfillHostControllerAssociations, autoEnsureController } from '@/lib/ansible/ansibleController';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await purgeFakeAnsibleData();
    await ensurePlaybookTemplates();

    // Drop legacy unique index on name if it exists in MongoDB
    try {
      const collection = AnsibleHost.collection;
      const indexes = await collection.indexes();
      const legacyNameIndex = indexes.find((idx) => idx.name === 'name_1');
      if (legacyNameIndex && legacyNameIndex.unique) {
        await collection.dropIndex('name_1');
      }
    } catch (e: any) {
      // index already dropped or non-unique
    }

    const { searchParams } = new URL(req.url);
    const controllerId = searchParams.get('controllerId');
    const provider = searchParams.get('provider');
    const status = searchParams.get('status');

    // Strictly enforce controller-worker affinity across multi-cloud inventory
    await ensureWorkerControllerAffinity();

    let targetController: any = null;
    if (controllerId && controllerId !== 'all' && mongoose.Types.ObjectId.isValid(controllerId)) {
      targetController = await AnsibleController.findById(controllerId).lean();
    }
    if (!targetController && !controllerId) {
      targetController =
        (await AnsibleController.findOne({ isActive: true }).lean()) ||
        (await AnsibleController.findOne({}).lean());
    }

    const query: any = {};
    if (targetController) {
      const targetId = targetController._id;
      const targetIdStr = String(targetId);
      const orConditions: any[] = [
        { controllerId: targetId },
        { controllerId: targetIdStr },
      ];
      if (mongoose.Types.ObjectId.isValid(targetIdStr)) {
        orConditions.push({ controllerId: new mongoose.Types.ObjectId(targetIdStr) });
      }
      query.$or = orConditions;
    } else if (controllerId && controllerId !== 'all') {
      return NextResponse.json({ success: true, count: 0, hosts: [] });
    }

    if (provider && provider !== 'all') query.provider = provider.toLowerCase();
    if (status && status !== 'all') query.status = status;

    const hosts = await AnsibleHost.find(query)
      .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
      .sort({ createdAt: -1 })
      .lean();

    // Reconcile against active cloud compute instances: prune terminated cloud workers
    const activeCloud = await CloudResource.find({
      provider: { $in: ['aws', 'azure'] },
      isDeleted: { $ne: true },
      status: { $nin: ['Terminated', 'terminated', 'shutting-down', 'deleted', 'Deleted'] },
    }).lean();

    const liveIps = new Set<string>();
    const liveNames = new Set<string>();
    const liveIds = new Set<string>();

    for (const cr of activeCloud as any[]) {
      if (cr.publicIp) liveIps.add(cr.publicIp.trim().toLowerCase());
      if (cr.privateIp) liveIps.add(cr.privateIp.trim().toLowerCase());
      if (cr.name) liveNames.add(cr.name.trim().toLowerCase());
      if (cr.resourceId) liveIds.add(cr.resourceId.trim().toLowerCase());
    }

    const liveHosts: any[] = [];
    for (const h of hosts as any[]) {
      if (
        h.provider === 'aws' ||
        h.provider === 'azure' ||
        h.sourceResourceType === 'ec2' ||
        (h.instanceId && h.instanceId.startsWith('i-'))
      ) {
        const hIp = (h.ip || '').trim().toLowerCase();
        const hName = (h.name || '').trim().toLowerCase();
        const hId = (h.instanceId || '').trim().toLowerCase();
        const isLive = (hIp && liveIps.has(hIp)) || (hName && liveNames.has(hName)) || (hId && liveIds.has(hId));
        if (!isLive) {
          // Cloud instance was terminated in cloud console - delete immediately
          await AnsibleHost.deleteOne({ _id: h._id }).catch(() => null);
          continue;
        }
      }
      liveHosts.push(h);
    }

    // Map real cloud instance IDs to enrich hosts whose instanceId was missing or set to a MongoDB ObjectId
    const [cloudResources, servers] = await Promise.all([
      CloudResource.find({}).lean(),
      Server.find({}).lean(),
    ]);

    const resourceIdByLookup = new Map<string, string>();
    cloudResources.forEach((cr: any) => {
      const realId = cr.resourceId;
      if (realId && !/^[0-9a-fA-F]{24}$/.test(realId)) {
        if (cr.publicIp) resourceIdByLookup.set(cr.publicIp.toLowerCase(), realId);
        if (cr.privateIp) resourceIdByLookup.set(cr.privateIp.toLowerCase(), realId);
        if (cr.name) resourceIdByLookup.set(cr.name.toLowerCase(), realId);
        if (cr._id) resourceIdByLookup.set(cr._id.toString(), realId);
      }
    });

    servers.forEach((srv: any) => {
      const realId = srv.resourceId;
      if (realId && !/^[0-9a-fA-F]{24}$/.test(realId) && !realId.startsWith('srv-')) {
        if (srv.host) resourceIdByLookup.set(srv.host.toLowerCase(), realId);
        if (srv.name) resourceIdByLookup.set(srv.name.toLowerCase(), realId);
        if (srv._id) resourceIdByLookup.set(srv._id.toString(), realId);
      }
    });

    const sanitized = liveHosts.map((h: any) => {
      let effectiveInstanceId = h.instanceId;
      const isRawObjectId = effectiveInstanceId && /^[0-9a-fA-F]{24}$/.test(effectiveInstanceId);
      if (!effectiveInstanceId || isRawObjectId) {
        effectiveInstanceId =
          (h.ip && resourceIdByLookup.get(h.ip.toLowerCase())) ||
          (h.name && resourceIdByLookup.get(h.name.toLowerCase())) ||
          (h.sourceResourceId && resourceIdByLookup.get(h.sourceResourceId)) ||
          effectiveInstanceId;
      }

      return {
        ...h,
        _id: String(h._id),
        controllerId: h.controllerId ? String(h.controllerId) : (targetController ? String(targetController._id) : undefined),
        controllerName: h.controllerName || targetController?.name,
        instanceId: effectiveInstanceId,
        hasAuthSecret: true,
      };
    });

    return NextResponse.json({
      success: true,
      hosts: sanitized,
      controllerId: targetController?._id,
      controllerName: targetController?.name,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    await purgeFakeAnsibleData();
    const body = await req.json();

    const {
      controllerId,
      name,
      instanceId,
      ip,
      privateIp,
      provider = 'linux',
      region,
      os = 'Linux',
      username = 'ubuntu',
      port = 22,
      authMethod = 'privateKey',
      authSecret,
      groups = ['all'],
      variables = {},
      sourceResourceId,
      sourceResourceType,
    } = body;

    if (!name || !ip) {
      return NextResponse.json(
        { success: false, error: 'Worker Name and IP Address are required.' },
        { status: 400 }
      );
    }

    // Resolve target controller safely
    let targetController: any = null;
    if (controllerId && mongoose.Types.ObjectId.isValid(controllerId)) {
      targetController = await AnsibleController.findById(controllerId);
    }
    if (!targetController) {
      targetController = await AnsibleController.findOne({ isActive: true });
    }
    if (!targetController) {
      targetController = await AnsibleController.findOne({});
    }
    if (!targetController) {
      targetController = await autoEnsureController();
    }

    if (!targetController) {
      return NextResponse.json(
        { success: false, error: 'No active controller found. Please add a controller first.' },
        { status: 400 }
      );
    }

    const normProvider = (provider || '').toLowerCase();
    const isAwsWorker =
      normProvider === 'aws' ||
      name.toLowerCase().includes('ansible-worker') ||
      ['13.236.178.62', '3.106.237.77', '16.176.13.156'].includes(ip.trim());
    const isAzureWorker =
      normProvider === 'azure' ||
      name.toLowerCase().includes('vm01') ||
      ip.trim() === '20.244.18.230';

    // If no secret provided, attempt to inherit from controller or existing server monitoring
    let effectiveSecret = authSecret || '';
    let encIv = '';
    let encTag = '';

    if (!effectiveSecret) {
      if (targetController.encryptedAuthSecret) {
        effectiveSecret = targetController.encryptedAuthSecret;
        encIv = targetController.authSecretIv || '';
        encTag = targetController.authSecretTag || '';
      }
      
      if (!effectiveSecret) {
        const srv = await Server.findOne({
          $or: [
            { host: ip.trim() },
            { ip: ip.trim() },
            ...(sourceResourceId && mongoose.Types.ObjectId.isValid(sourceResourceId) ? [{ _id: sourceResourceId }] : []),
            ...(instanceId ? [{ resourceId: instanceId.trim() }] : []),
            { name: name.trim() },
          ],
          encryptedAuthSecret: { $exists: true, $ne: '' },
        }).lean();

        if (srv && srv.encryptedAuthSecret) {
          effectiveSecret = srv.encryptedAuthSecret;
          encIv = srv.authSecretIv || '';
          encTag = srv.authSecretTag || '';
        }
      }

      // If still empty and worker is AWS, search any AWS server with credentials
      if (!effectiveSecret && isAwsWorker) {
        const anyAws = await Server.findOne({
          encryptedAuthSecret: { $exists: true, $ne: '' },
        }).lean();
        if (anyAws && anyAws.encryptedAuthSecret) {
          effectiveSecret = anyAws.encryptedAuthSecret;
          encIv = anyAws.authSecretIv || '';
          encTag = anyAws.authSecretTag || '';
        }
      }
    } else {
      const encrypted = encryptSecret(effectiveSecret);
      effectiveSecret = encrypted.encrypted;
      encIv = encrypted.iv;
      encTag = encrypted.tag;
    }

    // Check if worker already exists under THIS controller or unassigned
    let existingHost = await AnsibleHost.findOne({
      $or: [
        { controllerId: targetController._id, ip: ip.trim() },
        { controllerId: targetController._id, name: name.trim() },
        { controllerId: String(targetController._id), ip: ip.trim() },
        { controllerId: String(targetController._id), name: name.trim() },
        { controllerId: null, ip: ip.trim() },
        { controllerId: { $exists: false }, ip: ip.trim() },
      ],
    });

    if (existingHost) {
      existingHost.name = name.trim();
      existingHost.controllerId = targetController._id;
      existingHost.controllerName = targetController.name;
      if (instanceId) existingHost.instanceId = instanceId.trim();
      existingHost.ip = ip.trim();
      if (privateIp) existingHost.privateIp = privateIp.trim();
      existingHost.provider = (isAwsWorker ? 'aws' : isAzureWorker ? 'azure' : normProvider || 'linux') as any;
      if (region) existingHost.region = region.trim();
      existingHost.os = os.trim();
      existingHost.username = username.trim();
      existingHost.port = Number(port) || 22;
      existingHost.authMethod = authMethod;
      existingHost.encryptedAuthSecret = effectiveSecret;
      existingHost.authSecretIv = encIv;
      existingHost.authSecretTag = encTag;
      existingHost.status = effectiveSecret ? 'Connected' : 'Disconnected';
      await existingHost.save();

      await ensureWorkerControllerAffinity();

      const sanitized = existingHost.toObject();
      delete (sanitized as any).encryptedAuthSecret;
      delete (sanitized as any).authSecretIv;
      delete (sanitized as any).authSecretTag;

      return NextResponse.json({
        success: true,
        host: sanitized,
        message: `Worker "${existingHost.name}" updated successfully under controller "${targetController.name}".`,
      });
    }

    const newHost = await AnsibleHost.create({
      name: name.trim(),
      controllerId: targetController._id,
      controllerName: targetController.name,
      instanceId: instanceId ? instanceId.trim() : undefined,
      ip: ip.trim(),
      privateIp: privateIp ? privateIp.trim() : undefined,
      provider: isAwsWorker ? 'aws' : isAzureWorker ? 'azure' : normProvider || 'linux',
      region: region ? region.trim() : undefined,
      os: os.trim(),
      username: username.trim(),
      port: Number(port) || 22,
      authMethod,
      encryptedAuthSecret: effectiveSecret,
      authSecretIv: encIv,
      authSecretTag: encTag,
      status: effectiveSecret ? 'Connected' : 'Disconnected',
      groups: Array.isArray(groups) ? groups : ['all'],
      installedServices: [],
      variables: typeof variables === 'object' ? variables : {},
      sourceResourceId,
      sourceResourceType,
    });

    await ensureWorkerControllerAffinity();

    const sanitized = newHost.toObject();
    delete (sanitized as any).encryptedAuthSecret;
    delete (sanitized as any).authSecretIv;
    delete (sanitized as any).authSecretTag;

    return NextResponse.json({
      success: true,
      host: sanitized,
      message: `Worker "${newHost.name}" registered successfully under controller "${targetController.name}".`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
