import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import {
  checkServerTerraform,
  installServerTerraform,
  uninstallServerTerraform,
} from '@/lib/terraform/terraformService';

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch all registered Linux servers
    const servers = await Server.find({
      'os.name': { $not: { $regex: /windows/i } },
    })
      .select('name host port username cloudProvider status environment os')
      .lean();

    return NextResponse.json({ success: true, servers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { serverId, action = 'check' } = body;

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400 });
    }

    const server = await Server.findById(serverId).lean();
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    if (action === 'check') {
      const checkResult = await checkServerTerraform(server);
      return NextResponse.json({ success: true, checkResult });
    } else if (action === 'install') {
      const installResult = await installServerTerraform(server);
      return NextResponse.json({ success: installResult.success, installResult });
    } else if (action === 'uninstall') {
      const uninstallResult = await uninstallServerTerraform(server);
      return NextResponse.json({ success: uninstallResult.success, uninstallResult });
    }

    return NextResponse.json({ error: 'Invalid action. Supported: check, install, uninstall' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
