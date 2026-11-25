import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ServerIncident from '@/models/ServerIncident';
import {
  runIntelligentInvestigation,
  executeApprovedFixOnServer,
  verifyPostFixRecovery,
} from '@/lib/activityCenter/intelligentTroubleshooting';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const incident = await ServerIncident.findOne({
      $or: [{ incidentId: id }, { _id: id }],
    }).lean();

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, incident });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { action, fixId, userName = 'DevOps Engineer' } = body;

    const incident = await ServerIncident.findOne({
      $or: [{ incidentId: id }, { _id: id }],
    });

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    if (action === 'investigate') {
      const updated = await runIntelligentInvestigation(incident.incidentId);
      return NextResponse.json({
        success: true,
        incident: updated,
        message: 'Investigation completed. Confirmed evidence and root causes identified.',
      });
    }

    if (action === 'execute-fix') {
      const res = await executeApprovedFixOnServer(
        incident.incidentId,
        fixId || incident.recommendedFixes[0]?.id,
        userName
      );
      return NextResponse.json({
        success: true,
        incident: res.incident,
        output: res.output,
        message: 'Approved remediation executed successfully.',
      });
    }

    if (action === 'verify-recovery') {
      const res = await verifyPostFixRecovery(incident.incidentId);
      return NextResponse.json({
        success: true,
        isRecovered: res.isRecovered,
        preValue: res.preValue,
        postValue: res.postValue,
        incident: res.incident,
        message: res.isRecovered
          ? `Recovery verified! Metric dropped from ${res.preValue}% to ${res.postValue}%.`
          : `Metric still elevated at ${res.postValue}%. Additional investigation recommended.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
