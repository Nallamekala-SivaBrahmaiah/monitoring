import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import AnsibleHost from '@/models/AnsibleHost';

interface RouteContext {
  params: Promise<{ id: string; workerId: string }>;
}

/**
 * DELETE /api/ansible/controllers/:id/workers/:workerId
 * Removes the worker assignment from this controller.
 * IMPORTANT: This only deletes the Ansible worker record; it does NOT terminate or modify the cloud instance.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id, workerId } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid controller ID' }, { status: 400 });
    }
    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return NextResponse.json({ success: false, error: 'Invalid worker ID' }, { status: 400 });
    }

    const controller = await AnsibleController.findById(id);
    if (!controller) {
      return NextResponse.json({ success: false, error: 'Controller not found' }, { status: 404 });
    }

    const host = await AnsibleHost.findOne({
      _id: workerId,
      $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
    });

    if (!host) {
      return NextResponse.json(
        { success: false, error: 'Worker node not found under this controller' },
        { status: 404 }
      );
    }

    const hostName = host.name;
    await AnsibleHost.findByIdAndDelete(workerId);

    // Update live worker count on controller
    const count = await AnsibleHost.countDocuments({
      $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
    });
    await AnsibleController.updateOne({ _id: controller._id }, { $set: { workerCount: count } });

    return NextResponse.json({
      success: true,
      workerCount: count,
      message: `Worker "${hostName}" unassigned from controller "${controller.name}". Cloud instance remains intact.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
