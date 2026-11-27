import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DevOpsProofRecipient from '@/models/DevOpsProofRecipient';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  try {
    await connectToDatabase();
    const recipients = await DevOpsProofRecipient.find().sort({ createdAt: 1 }).lean();

    const formatted = recipients.map((r: any) => ({
      id: r._id.toString(),
      email: r.email,
      name: r.name || '',
      role: r.role || 'CTO',
      enabled: r.enabled !== false,
      addedOn: r.addedOn || r.createdAt || new Date(),
    }));

    return NextResponse.json(
      { success: true, recipients: formatted, count: formatted.length },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error fetching proof recipients:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch proof recipients' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanEmail = body.email.toLowerCase().trim();
    const cleanName = body.name ? String(body.name).trim() : '';
    const cleanRole = body.role || 'CTO';

    const existing = await DevOpsProofRecipient.findOne({ email: cleanEmail }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'This email is already in your proof distribution roster.' },
        { status: 409, headers: NO_CACHE_HEADERS }
      );
    }

    const doc = await DevOpsProofRecipient.create({
      email: cleanEmail,
      name: cleanName,
      role: cleanRole,
      enabled: true,
      addedOn: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        recipient: {
          id: doc._id.toString(),
          email: doc.email,
          name: doc.name,
          role: doc.role,
          enabled: doc.enabled,
          addedOn: doc.addedOn,
        },
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error adding proof recipient:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add recipient' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

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

    const update: any = {};
    if (typeof body.enabled === 'boolean') update.enabled = body.enabled;
    if (body.role) update.role = body.role;
    if (body.name !== undefined) update.name = body.name;

    const doc = await DevOpsProofRecipient.findByIdAndUpdate(body.id, { $set: update }, { new: true }).lean();

    return NextResponse.json(
      { success: true, recipient: doc },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update recipient' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      await DevOpsProofRecipient.deleteMany({});
      return NextResponse.json(
        { success: true, message: 'All proof recipients removed successfully.' },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (!id && !email) {
      return NextResponse.json(
        { success: false, error: 'Recipient ID or Email is required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const filter: any = {};
    if (id) filter._id = id;
    else if (email) filter.email = email.toLowerCase().trim();

    await DevOpsProofRecipient.deleteOne(filter);

    return NextResponse.json(
      { success: true, message: 'Proof recipient removed successfully.' },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to remove recipient' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
