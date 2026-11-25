import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ReportRecipient from '@/models/ReportRecipient';
import ActivityAuditLog from '@/models/ActivityAuditLog';

export async function GET() {
  try {
    await connectToDatabase();
    const recipients = await ReportRecipient.find().sort({ group: 1, name: 1 }).lean();
    return NextResponse.json({ success: true, recipients });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { name, email, designation, department, group, deliveryPreference, isActive, isDefault, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Recipient name is required.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await ReportRecipient.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ error: `Recipient with email ${cleanEmail} already exists.` }, { status: 400 });
    }

    const recipient = await ReportRecipient.create({
      name: name.trim(),
      email: cleanEmail,
      designation: designation?.trim() || 'DevOps Lead',
      department: department?.trim() || 'Engineering',
      group: group || 'Manager',
      deliveryPreference: deliveryPreference || 'TO',
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault !== undefined ? isDefault : true,
      notes: notes?.trim() || '',
    });

    await ActivityAuditLog.create({
      action: 'RECIPIENT_ADDED',
      actor: 'DevOps Engineer',
      targetType: 'ReportRecipient',
      targetId: recipient._id.toString(),
      details: `Added new report recipient: ${recipient.name} (${recipient.email}) under group "${recipient.group}".`,
      newValue: recipient.toObject(),
    });

    return NextResponse.json({ success: true, recipient });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
