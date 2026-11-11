import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsiblePlaybook from '@/models/AnsiblePlaybook';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleExecution from '@/models/AnsibleExecution';
import { executeAnsiblePlaybook } from '@/lib/ansible/ansibleEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const playbook = await AnsiblePlaybook.findById(id);
    if (!playbook) {
      return NextResponse.json({ success: false, error: 'Playbook not found' }, { status: 404 });
    }

    const hostId = body.hostId;
    if (!hostId) {
      return NextResponse.json(
        { success: false, error: 'Target host is required to run playbook.' },
        { status: 400 }
      );
    }

    const host = await AnsibleHost.findById(hostId);
    if (!host) {
      return NextResponse.json({ success: false, error: 'Target host not found' }, { status: 404 });
    }

    const extraVars = body.extraVars !== undefined ? String(body.extraVars) : playbook.defaultExtraVars || '';

    // Generate unique Job ID
    const count = await AnsibleExecution.countDocuments();
    const jobId = `job-${Date.now().toString(36)}-${count + 1}`;

    const execution: any = await AnsibleExecution.create({
      jobId,
      playbookId: playbook._id,
      playbookName: playbook.name,
      hostId: host._id,
      hostName: host.name,
      hostIp: host.ip,
      extraVars,
      status: 'RUNNING',
      startTime: new Date(),
      durationSeconds: 0,
      logs: `[Ansible Engine] Enqueuing playbook "${playbook.name}" on host "${host.name}" (${host.ip})...\n`,
    });

    // Execute in background
    setImmediate(() => {
      executeAnsiblePlaybook(execution._id.toString()).catch((err) => {
        console.error(`[AnsibleAPI] Error running job ${jobId}:`, err);
      });
    });

    return NextResponse.json({
      success: true,
      jobId,
      executionId: execution._id,
      message: `Playbook "${playbook.name}" started on "${host.name}".`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
