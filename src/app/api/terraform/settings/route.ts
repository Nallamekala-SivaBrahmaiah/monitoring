import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TerraformSetting from '@/models/TerraformSetting';

export async function GET() {
  try {
    await connectToDatabase();
    let settings = await TerraformSetting.findOne().lean();
    if (!settings) {
      settings = await TerraformSetting.create({
        defaultProvider: 'aws',
        defaultRegion: 'us-east-1',
        defaultTerraformVersion: '1.14.6',
        executionTimeoutSeconds: 300,
        defaultWorkspace: 'default',
        requireProductionApproval: true,
        enableStateLocking: true,
        autoFormatOnSave: true,
        sensitiveSecretRedaction: true,
      });
    }
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    let settings = await TerraformSetting.findOne();
    if (!settings) {
      settings = new TerraformSetting(body);
    } else {
      Object.assign(settings, body);
    }
    await settings.save();

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
