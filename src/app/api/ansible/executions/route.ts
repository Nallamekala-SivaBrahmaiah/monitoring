import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleExecution from '@/models/AnsibleExecution';
import AnsiblePlaybook from '@/models/AnsiblePlaybook';
import AnsibleHost from '@/models/AnsibleHost';
import { executeAnsiblePlaybook } from '@/lib/ansible/ansibleEngine';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const hostId = searchParams.get('hostId');
    const playbookId = searchParams.get('playbookId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const query: any = {};
    if (status && status !== 'all') query.status = status.toUpperCase();
    if (hostId && hostId !== 'all') query.hostId = hostId;
    if (playbookId && playbookId !== 'all') query.playbookId = playbookId;

    const total = await AnsibleExecution.countDocuments(query);
    const executions = await AnsibleExecution.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      executions,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Quick-run playbook from dashboard
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    let { hostId, hostName, playbookId, playbookName, extraVars = '' } = body;

    // Resolve host
    let host: any = null;
    const isAllHosts = hostId === 'all';
    if (isAllHosts) {
      host = await AnsibleHost.findOne();
    } else if (hostId) {
      host = await AnsibleHost.findById(hostId);
    } else if (hostName) {
      host = await AnsibleHost.findOne({ name: hostName });
    }

    if (!host) {
      // Pick first host as default if none specified
      host = await AnsibleHost.findOne();
    }

    if (!host) {
      return NextResponse.json(
        { success: false, error: 'No target server selected or found in inventory.' },
        { status: 400 }
      );
    }

    // Resolve playbook
    let playbook: any = null;
    if (playbookId) {
      playbook = await AnsiblePlaybook.findById(playbookId);
    } else if (playbookName) {
      playbook = await AnsiblePlaybook.findOne({ name: playbookName });
    }

    if (!playbook) {
      // Pick first playbook as default
      playbook = await AnsiblePlaybook.findOne();
    }

    if (!playbook) {
      return NextResponse.json(
        { success: false, error: 'No playbook selected or found.' },
        { status: 400 }
      );
    }

    // Generate Job ID
    const count = await AnsibleExecution.countDocuments();
    const jobId = `job-${Date.now().toString(36)}-${count + 1}`;

    const execution = await AnsibleExecution.create({
      jobId,
      playbookId: playbook._id,
      playbookName: playbook.name,
      hostId: host._id,
      hostName: isAllHosts ? 'All Managed Nodes' : host.name,
      hostIp: isAllHosts ? 'all' : host.ip,
      extraVars: typeof extraVars === 'object' ? JSON.stringify(extraVars) : String(extraVars),
      status: 'RUNNING',
      startTime: new Date(),
      durationSeconds: 0,
      logs: `[Ansible Engine] Starting job "${jobId}" for "${playbook.name}" on ${
        isAllHosts ? 'All Managed Nodes' : `"${host.name}" (${host.ip})`
      }...\n`,
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
      execution,
      message: `Job ${jobId} triggered successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

