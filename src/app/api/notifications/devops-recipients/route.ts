import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DevOpsRecipient from '@/models/DevOpsRecipient';
import { getEnabledDevOpsRecipients } from '@/lib/monitoring/alertEvaluationEngine';

// Email validation regex (RFC 5322 compliant simple form)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/notifications/devops-recipients
 * Returns all configured DevOps engineer recipients (sorted by addedOn ascending)
 * Ensures default seed recipients are present if database is empty.
 * Never returns SMTP credentials.
 */
export async function GET() {
  try {
    await connectToDatabase();
    // Ensure seeding runs if empty
    await getEnabledDevOpsRecipients();

    const recipients = await DevOpsRecipient.find().sort({ addedOn: 1 }).lean();

    const formatted = recipients.map((r: any) => ({
      id: r._id.toString(),
      email: r.email,
      role: r.role || 'DevOps Engineer',
      enabled: r.enabled !== false,
      addedOn: r.addedOn || r.createdAt || new Date(),
    }));

    return NextResponse.json({
      success: true,
      recipients: formatted,
      count: formatted.length,
      enabledCount: formatted.filter((r) => r.enabled).length,
    });
  } catch (err: any) {
    console.error('Error fetching DevOps recipients:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch DevOps recipients' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/devops-recipients
 * Add a new DevOps engineer recipient
 * Body: { email: string, role?: string }
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address (e.g., user@domain.com).' },
        { status: 400 }
      );
    }

    // Check if recipient already exists
    const existing = await DevOpsRecipient.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `DevOps engineer with email '${email}' already exists.` },
        { status: 409 }
      );
    }

    const role = (body.role && typeof body.role === 'string' && body.role.trim())
      ? body.role.trim()
      : 'DevOps Engineer';

    const newRecipient = await DevOpsRecipient.create({
      email,
      role,
      enabled: true,
      addedOn: new Date(),
    });

    return NextResponse.json({
      success: true,
      recipient: {
        id: newRecipient._id.toString(),
        email: newRecipient.email,
        role: newRecipient.role,
        enabled: newRecipient.enabled,
        addedOn: newRecipient.addedOn,
      },
    });
  } catch (err: any) {
    console.error('Error adding DevOps recipient:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add DevOps recipient' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/devops-recipients
 * Update recipient status (enable/disable) or role
 * Body: { id: string, enabled?: boolean, role?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Recipient ID is required.' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (typeof body.enabled === 'boolean') {
      updates.enabled = body.enabled;
    }
    if (typeof body.role === 'string' && body.role.trim()) {
      updates.role = body.role.trim();
    }

    const updated = await DevOpsRecipient.findByIdAndUpdate(
      body.id,
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'DevOps recipient not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      recipient: {
        id: updated._id.toString(),
        email: updated.email,
        role: updated.role,
        enabled: updated.enabled,
        addedOn: updated.addedOn,
      },
    });
  } catch (err: any) {
    console.error('Error updating DevOps recipient:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update DevOps recipient' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/devops-recipients
 * Remove a DevOps engineer recipient
 * Query: ?id=...
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Recipient ID is required.' },
        { status: 400 }
      );
    }

    const deleted = await DevOpsRecipient.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'DevOps recipient not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `DevOps recipient ${deleted.email} removed successfully.`,
    });
  } catch (err: any) {
    console.error('Error deleting DevOps recipient:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete DevOps recipient' },
      { status: 500 }
    );
  }
}

