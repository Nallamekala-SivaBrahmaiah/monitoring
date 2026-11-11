import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const host = await AnsibleHost.findById(id)
      .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
      .lean();

    if (!host) {
      return NextResponse.json({ success: false, error: 'Host not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, host: { ...host, hasAuthSecret: true } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const host = await AnsibleHost.findById(id);
    if (!host) {
      return NextResponse.json({ success: false, error: 'Host not found' }, { status: 404 });
    }

    if (body.name) host.name = body.name.trim();
    if (body.instanceId !== undefined) host.instanceId = body.instanceId?.trim();
    if (body.ip) host.ip = body.ip.trim();
    if (body.privateIp !== undefined) host.privateIp = body.privateIp?.trim();
    if (body.provider) host.provider = body.provider.toLowerCase();
    if (body.region !== undefined) host.region = body.region?.trim();
    if (body.os) host.os = body.os.trim();
    if (body.username) host.username = body.username.trim();
    if (body.port) host.port = Number(body.port);
    if (body.authMethod) host.authMethod = body.authMethod;
    if (body.groups) host.groups = body.groups;
    if (body.variables) host.variables = body.variables;

    if (body.authSecret && body.authSecret.trim()) {
      const enc = encryptSecret(body.authSecret.trim());
      host.encryptedAuthSecret = enc.encrypted;
      host.authSecretIv = enc.iv;
      host.authSecretTag = enc.tag;
    }

    await host.save();

    const sanitized = host.toObject();
    delete (sanitized as any).encryptedAuthSecret;
    delete (sanitized as any).authSecretIv;
    delete (sanitized as any).authSecretTag;

    return NextResponse.json({
      success: true,
      host: { ...sanitized, hasAuthSecret: true },
      message: 'Host updated successfully.',
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

    const host = await AnsibleHost.findByIdAndDelete(id);
    if (!host) {
      return NextResponse.json({ success: false, error: 'Host not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Host "${host.name}" deleted from Ansible inventory.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

