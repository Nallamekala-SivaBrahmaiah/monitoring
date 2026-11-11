import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxDeployment from '@/models/NginxDeployment';
import NginxServer from '@/models/NginxServer';
import { rollbackDeployment } from '@/lib/nginx/nginxEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const deployment = await NginxDeployment.findOne({
      $or: [{ _id: id }, { deploymentId: id }],
    });

    if (!deployment) {
      return NextResponse.json({ success: false, error: 'Deployment not found' }, { status: 404 });
    }

    const server = await NginxServer.findById(deployment.serverId);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Associated server not found' }, { status: 404 });
    }

    const res = await rollbackDeployment(server.toObject(), deployment);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

