import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleAdHocExecution from '@/models/AnsibleAdHocExecution';
import {
  executeAnsibleAdHoc,
  validateCommandSafety,
  ALLOWED_ANSIBLE_MODULES,
} from '@/lib/ansible/ansibleAdHocEngine';

/**
 * GET /api/ansible/adhoc
 * Get Ad-hoc Command execution history with filtering and pagination.
 * Scoped strictly by controllerId.
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const controllerId = searchParams.get('controllerId');
    const workerId = searchParams.get('workerId');
    const moduleName = searchParams.get('module');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);

    const query: any = {};

    // Filter strictly by Controller ID
    if (controllerId && controllerId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(controllerId)) {
        query.controllerId = new mongoose.Types.ObjectId(controllerId);
      } else {
        query.controllerId = controllerId;
      }
    }

    if (workerId && workerId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(workerId)) {
        query.targetWorkerIds = new mongoose.Types.ObjectId(workerId);
      }
    }

    if (moduleName && moduleName !== 'all') {
      query.moduleName = moduleName.trim();
    }

    if (status && status !== 'all') {
      query.status = status.toUpperCase();
    }

    const total = await AnsibleAdHocExecution.countDocuments(query);
    const executions = await AnsibleAdHocExecution.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      executions: executions.map((ex) => ({
        ...ex,
        _id: String(ex._id),
        controllerId: String(ex.controllerId),
        targetWorkerIds: (ex.targetWorkerIds || []).map((id: any) => String(id)),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/ansible/adhoc
 * Launch an Ansible Ad-hoc command on target managed workers through the selected controller.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      controllerId,
      targetScope = 'all', // 'all' | 'single' | 'multiple'
      targetWorkerIds = [],
      moduleName = 'command',
      commandArgs = '',
      executedBy = 'Admin',
    } = body;

    // 1. Resolve Controller
    if (!controllerId) {
      return NextResponse.json(
        { success: false, error: 'Controller ID is required to execute ad-hoc commands.' },
        { status: 400 }
      );
    }

    const controller = await AnsibleController.findById(controllerId);
    if (!controller) {
      return NextResponse.json(
        { success: false, error: 'Selected Ansible Controller node was not found.' },
        { status: 404 }
      );
    }

    // 2. Validate Security and Arguments
    const safetyCheck = validateCommandSafety(moduleName, commandArgs);
    if (!safetyCheck.safe) {
      return NextResponse.json(
        { success: false, error: safetyCheck.reason },
        { status: 403 }
      );
    }

    // For modules requiring arguments
    const requiresArgs = ['command', 'shell', 'service', 'copy', 'file', 'user', 'apt', 'yum', 'dnf', 'package'];
    if (requiresArgs.includes(moduleName) && !commandArgs.trim()) {
      return NextResponse.json(
        { success: false, error: `Module "${moduleName}" requires command arguments to execute.` },
        { status: 400 }
      );
    }

    // 3. Resolve Target Workers strictly under this controller
    let workersToTarget: any[] = [];

    if (targetScope === 'all') {
      workersToTarget = await AnsibleHost.find({
        $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
      }).lean();
    } else {
      if (!Array.isArray(targetWorkerIds) || targetWorkerIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Please select at least one managed worker node.' },
          { status: 400 }
        );
      }

      workersToTarget = await AnsibleHost.find({
        _id: { $in: targetWorkerIds },
        $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
      }).lean();
    }

    if (workersToTarget.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No assigned worker nodes found for controller "${controller.name}". Ensure workers are registered under this controller.`,
        },
        { status: 400 }
      );
    }

    // 4. Generate unique Job ID
    const jobId = `adhoc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // 5. Create Execution Record
    const execution = await AnsibleAdHocExecution.create({
      jobId,
      controllerId: controller._id,
      controllerName: controller.name,
      targetScope,
      targetWorkerIds: workersToTarget.map((w) => w._id),
      targetWorkerNames: workersToTarget.map((w) => w.name),
      moduleName: moduleName.trim(),
      commandArgs: commandArgs.trim(),
      status: 'RUNNING',
      startTime: new Date(),
      logs: `[${new Date().toISOString()}] Job Queued: ${jobId}\n`,
      workerResults: workersToTarget.map((w) => ({
        workerId: String(w._id),
        workerName: w.name,
        workerIp: w.ip,
        status: 'SUCCESS',
        stdout: 'Queued for execution...',
        stderr: '',
        returnCode: 0,
        durationMs: 0,
        executionTime: '',
      })),
      executedBy,
    });

    // 6. Spawn Background Execution on Controller
    executeAnsibleAdHoc(execution._id.toString()).catch((err) => {
      console.error(`[AdHocExecution] Error executing job ${jobId}:`, err);
    });

    return NextResponse.json({
      success: true,
      jobId,
      executionId: execution._id.toString(),
      message: `Ad-hoc command queued on controller "${controller.name}" across ${workersToTarget.length} worker(s).`,
      execution: {
        ...execution.toObject(),
        _id: String(execution._id),
        controllerId: String(execution.controllerId),
        targetWorkerIds: execution.targetWorkerIds.map((id) => String(id)),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

