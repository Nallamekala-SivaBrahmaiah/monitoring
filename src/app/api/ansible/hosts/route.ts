import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';
import { ensurePlaybookTemplates, purgeFakeAnsibleData } from '@/lib/ansible/ansibleEngine';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await purgeFakeAnsibleData();
    await ensurePlaybookTemplates();

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');
    const status = searchParams.get('status');

    const query: any = {};
    if (provider && provider !== 'all') query.provider = provider.toLowerCase();
    if (status && status !== 'all') query.status = status;

    const hosts = await AnsibleHost.find(query)
      .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
      .sort({ createdAt: -1 })
      .lean();

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

    const sanitized = hosts.map((h: any) => {
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
        instanceId: effectiveInstanceId,
        hasAuthSecret: true,
      };
    });

    return NextResponse.json({ success: true, hosts: sanitized });
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
        { success: false, error: 'Server Name and IP Address are required.' },
        { status: 400 }
      );
    }

    if (!authSecret && authMethod === 'privateKey') {
      return NextResponse.json(
        { success: false, error: 'SSH Private Key is required for privateKey authentication.' },
        { status: 400 }
      );
    }

    // Encrypt secret with AES-256-GCM
    const encrypted = encryptSecret(authSecret || '');

    const newHost = await AnsibleHost.create({
      name: name.trim(),
      instanceId: instanceId ? instanceId.trim() : undefined,
      ip: ip.trim(),
      privateIp: privateIp ? privateIp.trim() : undefined,
      provider: provider.toLowerCase(),
      region: region ? region.trim() : undefined,
      os: os.trim(),
      username: username.trim(),
      port: Number(port) || 22,
      authMethod,
      encryptedAuthSecret: encrypted.encrypted,
      authSecretIv: encrypted.iv,
      authSecretTag: encrypted.tag,
      status: 'Disconnected',
      groups: Array.isArray(groups) ? groups : ['all'],
      variables: typeof variables === 'object' ? variables : {},
      sourceResourceId,
      sourceResourceType,
    });

    const sanitized = newHost.toObject();
    delete (sanitized as any).encryptedAuthSecret;
    delete (sanitized as any).authSecretIv;
    delete (sanitized as any).authSecretTag;

    return NextResponse.json({
      success: true,
      host: sanitized,
      message: `Managed node "${newHost.name}" registered successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
