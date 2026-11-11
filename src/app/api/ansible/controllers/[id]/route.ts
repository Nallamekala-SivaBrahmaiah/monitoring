import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleController from '@/models/AnsibleController';
import AnsibleHost from '@/models/AnsibleHost';
import { inspectRemoteSSHController } from '@/lib/ansible/ansibleController';
import { encryptSecret } from '@/lib/serverMonitoring/crypto';

/**
 * GET: Get a single controller's details and real-time status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const controller = await AnsibleController.findById(id);
    if (!controller) {
      return NextResponse.json({ success: false, error: 'Controller not found' }, { status: 404 });
    }

    const cidStr = String(controller._id);
    const workerCount = await AnsibleHost.countDocuments({
      $or: [{ controllerId: controller._id }, { controllerId: cidStr }],
    });

    const sanitized: any = controller.toObject();
    delete sanitized.encryptedAuthSecret;
    delete sanitized.authSecretIv;
    delete sanitized.authSecretTag;
    sanitized.hasAuthSecret = Boolean(controller.encryptedAuthSecret);
    sanitized.workerCount = workerCount;

    return NextResponse.json({ success: true, controller: sanitized });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT: Update controller settings or switch active controller
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const controller = await AnsibleController.findById(id);
    if (!controller) {
      return NextResponse.json({ success: false, error: 'Controller not found' }, { status: 404 });
    }

    // Switch active controller
    if (body.setActive) {
      await AnsibleController.updateMany({}, { $set: { isActive: false } });
      controller.isActive = true;
      await controller.save();

      const cidStr = String(controller._id);
      const workerCount = await AnsibleHost.countDocuments({
        $or: [{ controllerId: controller._id }, { controllerId: cidStr }],
      });

      const sanitized: any = controller.toObject();
      delete sanitized.encryptedAuthSecret;
      delete sanitized.authSecretIv;
      delete sanitized.authSecretTag;
      sanitized.hasAuthSecret = Boolean(controller.encryptedAuthSecret);
      sanitized.workerCount = workerCount;

      return NextResponse.json({
        success: true,
        message: `Switched active controller to "${controller.name}".`,
        controller: sanitized,
      });
    }

    // Update details
    if (body.name) controller.name = body.name.trim();
    if (body.description !== undefined) controller.description = body.description.trim();
    if (body.username) controller.username = body.username.trim();
    if (body.port) controller.port = Number(body.port) || 22;

    if (body.authSecret && body.authSecret.trim()) {
      const encrypted = encryptSecret(body.authSecret.trim());
      controller.encryptedAuthSecret = encrypted.encrypted;
      controller.authSecretIv = encrypted.iv;
      controller.authSecretTag = encrypted.tag;
    }

    await controller.save();

    const sanitized = controller.toObject();
    delete (sanitized as any).encryptedAuthSecret;
    delete (sanitized as any).authSecretIv;
    delete (sanitized as any).authSecretTag;

    return NextResponse.json({
      success: true,
      message: `Controller "${controller.name}" updated successfully.`,
      controller: sanitized,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Delete a controller and clean up its assigned workers (without deleting real cloud instances)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const controller = await AnsibleController.findById(id);
    if (!controller) {
      return NextResponse.json({ success: false, error: 'Controller not found' }, { status: 404 });
    }

    // Count assigned workers
    const assignedWorkerCount = await AnsibleHost.countDocuments({
      $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
    });

    // Remove all worker assignments associated with this controller
    await AnsibleHost.deleteMany({
      $or: [{ controllerId: controller._id }, { controllerId: String(controller._id) }],
    });

    // If this was the active controller, activate another controller
    const wasActive = controller.isActive;

    await AnsibleController.findByIdAndDelete(id);

    if (wasActive) {
      const nextController = await AnsibleController.findOne().sort({ createdAt: 1 });
      if (nextController) {
        nextController.isActive = true;
        await nextController.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: `Controller "${controller.name}" and its ${assignedWorkerCount} worker assignments removed successfully. Cloud VMs remain intact.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
