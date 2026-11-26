import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DevOpsProofConfig from '@/models/DevOpsProofConfig';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  try {
    await connectToDatabase();
    let config = await DevOpsProofConfig.findOne().lean();

    if (!config) {
      config = await DevOpsProofConfig.create({
        engineerName: 'Siva',
        engineerRole: 'Lead DevOps Engineer',
        autoDispatchOnAction: true,
        scheduledDispatchEnabled: true,
        scheduledTime: '18:00',
        timezone: 'Asia/Kolkata',
        toolsMonitored: [
          'docker',
          'kubernetes',
          'maven',
          'ansible',
          'terraform',
          'jenkins',
          'sonarqube',
          'trivy',
          'server',
        ],
      });
    } else {
      if (!config.engineerRole) (config as any).engineerRole = 'Lead DevOps Engineer';
      if (!config.engineerName) (config as any).engineerName = 'Siva';
    }

    return NextResponse.json({ success: true, config }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error fetching proof config:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch config' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const update: any = {};
    if (typeof body.engineerName === 'string') update.engineerName = body.engineerName.trim();
    if (typeof body.engineerRole === 'string') update.engineerRole = body.engineerRole.trim();
    if (typeof body.autoDispatchOnAction === 'boolean') update.autoDispatchOnAction = body.autoDispatchOnAction;
    if (typeof body.scheduledDispatchEnabled === 'boolean') update.scheduledDispatchEnabled = body.scheduledDispatchEnabled;
    if (typeof body.scheduledTime === 'string') update.scheduledTime = body.scheduledTime.trim();
    if (typeof body.timezone === 'string') update.timezone = body.timezone.trim();
    if (Array.isArray(body.toolsMonitored)) update.toolsMonitored = body.toolsMonitored;

    const doc = await DevOpsProofConfig.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, returnDocument: 'after' }
    ).lean();

    return NextResponse.json(
      { success: true, message: 'Clock & Proof configuration updated successfully.', config: doc },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error saving proof config:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save config' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
