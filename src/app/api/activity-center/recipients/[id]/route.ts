import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ReportRecipient from '@/models/ReportRecipient';
import ActivityAuditLog from '@/models/ActivityAuditLog';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const recipient = await ReportRecipient.findById(id);
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    const prev = recipient.toObject();

    if (body.name) recipient.name = body.name.trim();
    if (body.designation !== undefined) recipient.designation = body.designation.trim();
    if (body.department !== undefined) recipient.department = body.department.trim();
    if (body.group) recipient.group = body.group;
    if (body.deliveryPreference) recipient.deliveryPreference = body.deliveryPreference;
    if (body.isActive !== undefined) recipient.isActive = body.isActive;
    if (body.isDefault !== undefined) recipient.isDefault = body.isDefault;
    if (body.notes !== undefined) recipient.notes = body.notes.trim();

    await recipient.save();

    await ActivityAuditLog.create({
      action: 'RECIPIENT_UPDATED',
      actor: 'DevOps Engineer',
      targetType: 'ReportRecipient',
      targetId: id,
      details: `Updated recipient ${recipient.name} (${recipient.email})`,
      previousValue: prev,
      newValue: recipient.toObject(),
    });

    return NextResponse.json({ success: true, recipient });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const recipient = await ReportRecipient.findById(id);
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    await ReportRecipient.findByIdAndDelete(id);

    await ActivityAuditLog.create({
      action: 'RECIPIENT_DELETED',
      actor: 'DevOps Engineer',
      targetType: 'ReportRecipient',
      targetId: id,
      details: `Removed report recipient ${recipient.name} (${recipient.email}).`,
    });

    return NextResponse.json({
      success: true,
      message: `Recipient "${recipient.name}" removed successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
