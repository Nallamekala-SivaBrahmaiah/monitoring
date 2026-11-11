import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxServer from '@/models/NginxServer';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const server = await NginxServer.findById(id)
      .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
      .lean();

    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, server });
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

    const updates: any = {};
    if (body.name) updates.name = body.name.trim();
    if (body.host) updates.host = body.host.trim();
    if (body.port) updates.port = Number(body.port);
    if (body.username) updates.username = body.username.trim();
    if (body.cloudProvider) updates.cloudProvider = body.cloudProvider;
    if (body.region !== undefined) updates.region = body.region;
    if (body.instanceId !== undefined) updates.instanceId = body.instanceId;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    if (body.authSecret) {
      const enc = encryptSecret(body.authSecret);
      updates.authMethod = body.authMethod || 'privateKey';
      updates.encryptedAuthSecret = enc.encrypted;
      updates.authSecretIv = enc.iv;
      updates.authSecretTag = enc.tag;
    }

    const updated = await NginxServer.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .select('-encryptedAuthSecret -authSecretIv -authSecretTag')
      .lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, server: updated });
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

    const deleted = await NginxServer.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Server registration "${deleted.name}" removed successfully. Cloud resources were not affected.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

