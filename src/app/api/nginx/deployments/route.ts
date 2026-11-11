import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NginxDeployment from '@/models/NginxDeployment';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get('serverId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const query: any = {};
    if (serverId && serverId !== 'all') {
      query.serverId = serverId;
    }
    if (status && status !== 'all') {
      query.status = status.toUpperCase();
    }

    const total = await NginxDeployment.countDocuments(query);
    const deployments = await NginxDeployment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      deployments,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const serverId = searchParams.get('serverId');

    if (id) {
      await NginxDeployment.findOneAndDelete({
        $or: [{ _id: id }, { deploymentId: id }],
      });
      return NextResponse.json({ success: true, message: `Deployment ${id} deleted.` });
    }

    const filter: any = {};
    if (serverId && serverId !== 'all') {
      filter.serverId = serverId;
    }

    const result = await NginxDeployment.deleteMany(filter);
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Cleaned ${result.deletedCount} deployment logs.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

