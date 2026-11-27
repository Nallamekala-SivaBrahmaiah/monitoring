import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DevOpsRecipient from '@/models/DevOpsRecipient';
import NotificationPreferences from '@/models/NotificationPreferences';
import { getEnabledDevOpsRecipients } from '@/lib/monitoring/alertEvaluationEngine';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

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

    return NextResponse.json(
      {
        success: true,
        recipients: formatted,
        count: formatted.length,
        enabledCount: formatted.filter((r) => r.enabled).length,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error fetching DevOps recipients:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch DevOps recipients' },
      { status: 500, headers: NO_CACHE_HEADERS }
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
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const email = body.email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address (e.g., user@domain.com).' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Check if recipient already exists
    const existing = await DevOpsRecipient.findOne({ email });
    if (existing) {
      // Ensure it is also present in NotificationPreferences
      await NotificationPreferences.updateMany(
        {},
        { $addToSet: { alertRecipients: email } }
      );

      return NextResponse.json(
        {
          success: true,
          recipient: {
            id: existing._id.toString(),
            email: existing.email,
            role: existing.role,
            enabled: existing.enabled,
            addedOn: existing.addedOn,
          },
        },
        { headers: NO_CACHE_HEADERS }
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

    // Synchronize into NotificationPreferences
    await NotificationPreferences.updateMany(
      {},
      { $addToSet: { alertRecipients: email } }
    );

    return NextResponse.json(
      {
        success: true,
        recipient: {
          id: newRecipient._id.toString(),
          email: newRecipient.email,
          role: newRecipient.role,
          enabled: newRecipient.enabled,
          addedOn: newRecipient.addedOn,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error adding DevOps recipient:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add DevOps recipient' },
      { status: 500, headers: NO_CACHE_HEADERS }
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
        { status: 400, headers: NO_CACHE_HEADERS }
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
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'DevOps recipient not found.' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Synchronize enabled/disabled status into NotificationPreferences and ReportRecipient
    if (updated.enabled) {
      await NotificationPreferences.updateMany(
        {},
        { $addToSet: { alertRecipients: updated.email } }
      );
    } else {
      await NotificationPreferences.updateMany(
        {},
        { $pull: { alertRecipients: updated.email } }
      );
    }

    try {
      const { default: ReportRecipient } = await import('@/models/ReportRecipient');
      await ReportRecipient.updateMany(
        { email: { $regex: new RegExp(`^${updated.email}$`, 'i') } },
        { $set: { isActive: updated.enabled, status: updated.enabled ? 'active' : 'disabled' } }
      );
    } catch {}

    const enabledCount = await DevOpsRecipient.countDocuments({ enabled: { $ne: false } });
    if (enabledCount === 0) {
      await NotificationPreferences.updateMany(
        {},
        { $set: { emailNotificationsEnabled: false, alertRecipients: [] } }
      );
    } else {
      await NotificationPreferences.updateMany(
        {},
        { $set: { emailNotificationsEnabled: true } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        recipient: {
          id: updated._id.toString(),
          email: updated.email,
          role: updated.role,
          enabled: updated.enabled,
          addedOn: updated.addedOn,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error updating DevOps recipient:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update DevOps recipient' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * DELETE /api/notifications/devops-recipients
 * Remove a DevOps engineer recipient
 * Query: ?id=... or ?email=...
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!id && !email) {
      return NextResponse.json(
        { success: false, error: 'Recipient ID or Email is required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    let deleted: any = null;
    if (id) {
      deleted = await DevOpsRecipient.findByIdAndDelete(id);
    } else if (email) {
      deleted = await DevOpsRecipient.findOneAndDelete({ email });
    }

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'DevOps recipient not found.' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Pull from NotificationPreferences
    await NotificationPreferences.updateMany(
      {},
      { $pull: { alertRecipients: deleted.email } }
    );

    return NextResponse.json(
      {
        success: true,
        message: `DevOps recipient ${deleted.email} removed successfully.`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error deleting DevOps recipient:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete DevOps recipient' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

