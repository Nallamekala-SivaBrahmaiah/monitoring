import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleExecution from '@/models/AnsibleExecution';
import AnsiblePlaybook from '@/models/AnsiblePlaybook';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleController from '@/models/AnsibleController';
import { executeAnsiblePlaybook } from '@/lib/ansible/ansibleEngine';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const controllerId = searchParams.get('controllerId');
    const status = searchParams.get('status');
    const hostId = searchParams.get('hostId');
    const playbookId = searchParams.get('playbookId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const query: any = {};
    if (controllerId && controllerId !== 'all') {
      query.$or = [{ controllerId }, { controllerId: { $exists: false } }];
    }
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
 * POST: Execute playbook through a controller across specified workers or groups
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    let {
      controllerId,
      hostId,
      hostName,
      targetWorkerIds,
      groupId,
      playbookId,
      playbookName,
      extraVars = '',
    } = body;

    // 1. Resolve Controller
    let targetController: any = null;
    if (controllerId) {
      targetController = await AnsibleController.findById(controllerId);
    }
    if (!targetController) {
      targetController =
        (await AnsibleController.findOne({ isActive: true })) ||
        (await AnsibleController.findOne({}));
    }

    if (!targetController) {
      return NextResponse.json(
        { success: false, error: 'No active Ansible Controller found. Please create a controller first.' },
        { status: 400 }
      );
    }

    // 2. Resolve Target Workers
    let resolvedWorkerIds: string[] = [];
    let resolvedWorkerNames: string[] = [];
    let primaryHost: any = null;
    let effectiveHostName = 'Target Nodes';
    let effectiveHostIp = 'all';

    if (Array.isArray(targetWorkerIds) && targetWorkerIds.length > 0) {
      const workers = await AnsibleHost.find({ _id: { $in: targetWorkerIds } });
      resolvedWorkerIds = workers.map((w) => w._id.toString());
      resolvedWorkerNames = workers.map((w) => w.name);
      primaryHost = workers[0];
      effectiveHostName = workers.length === 1 ? workers[0].name : `${workers.length} Managed Nodes`;
      effectiveHostIp = workers.length === 1 ? workers[0].ip : 'multiple';
    } else if (hostId && hostId !== 'all') {
      primaryHost = await AnsibleHost.findById(hostId);
      if (primaryHost) {
        resolvedWorkerIds = [primaryHost._id.toString()];
        resolvedWorkerNames = [primaryHost.name];
        effectiveHostName = primaryHost.name;
        effectiveHostIp = primaryHost.ip;
      }
    } else {
      // All managed nodes under THIS controller
      const allWorkers = await AnsibleHost.find({ controllerId: targetController._id });
      if (allWorkers.length > 0) {
        resolvedWorkerIds = allWorkers.map((w) => w._id.toString());
        resolvedWorkerNames = allWorkers.map((w) => w.name);
        primaryHost = allWorkers[0];
        effectiveHostName = `All Managed Nodes (${allWorkers.length})`;
        effectiveHostIp = 'all';
      }
    }

    if (!primaryHost && resolvedWorkerIds.length === 0) {
      return NextResponse.json(
        { success: false, error: `No target managed workers found under controller "${targetController.name}".` },
        { status: 400 }
      );
    }

    // 3. Resolve Playbook
    let playbook: any = null;
    if (playbookId) {
      playbook = await AnsiblePlaybook.findById(playbookId);
    } else if (playbookName) {
      playbook = await AnsiblePlaybook.findOne({ name: playbookName });
    }

    if (!playbook) {
      playbook = await AnsiblePlaybook.findOne();
    }

    if (!playbook) {
      return NextResponse.json(
        { success: false, error: 'No playbook selected or found in database.' },
        { status: 400 }
      );
    }

    // Generate Job ID
    const count = await AnsibleExecution.countDocuments();
    const jobId = `job-${Date.now().toString(36)}-${count + 1}`;

    const execution = await AnsibleExecution.create({
      jobId,
      controllerId: targetController._id,
      controllerName: targetController.name,
      playbookId: playbook._id,
      playbookName: playbook.name,
      hostId: primaryHost?._id,
      hostName: effectiveHostName,
      hostIp: effectiveHostIp,
      targetWorkerIds: resolvedWorkerIds,
      targetWorkerNames: resolvedWorkerNames,
      extraVars: typeof extraVars === 'object' ? JSON.stringify(extraVars) : String(extraVars),
      status: 'RUNNING',
      startTime: new Date(),
      durationSeconds: 0,
      logs: `[Ansible Engine] Starting job "${jobId}" for "${playbook.name}" via Controller "${targetController.name}" (${targetController.ipAddress}) on ${effectiveHostName}...\n`,
    });

    // Execute asynchronously
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
      controllerName: targetController.name,
      message: `Job ${jobId} triggered successfully through controller "${targetController.name}".`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
