import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import EmergencyPhone from '@/models/EmergencyPhone';
import NotificationPreferences from '@/models/NotificationPreferences';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Fetch all emergency phones from dedicated collection
    let phones = await EmergencyPhone.find().sort({ createdAt: 1 }).lean();

    // 2. Migration check: if EmergencyPhone collection is empty, seed from NotificationPreferences
    if (phones.length === 0) {
      const prefs = await NotificationPreferences.findOne({ userId: 'admin' }).lean();
      if (prefs && Array.isArray(prefs.phoneNumbers) && prefs.phoneNumbers.length > 0) {
        for (const p of prefs.phoneNumbers) {
          const clean = String(p).trim();
          if (clean.length >= 8) {
            await EmergencyPhone.updateOne(
              { phone: clean },
              { $set: { phone: clean, label: 'On-Call DevOps', enabled: true } },
              { upsert: true }
            );
          }
        }
        phones = await EmergencyPhone.find().sort({ createdAt: 1 }).lean();
      }
    }

    const formatted = phones.map((p: any) => ({
      id: p._id.toString(),
      phone: p.phone,
      label: p.label || 'On-Call DevOps',
      enabled: p.enabled !== false,
      createdAt: p.createdAt || new Date(),
    }));

    return NextResponse.json(
      {
        success: true,
        phones: formatted,
        count: formatted.length,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error fetching emergency phones:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch emergency phones' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (!body.phone || typeof body.phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phone number is required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanPhone = body.phone.trim();
    if (cleanPhone.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Phone number must have at least 8 digits.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const label = body.label ? String(body.label).trim() : 'On-Call DevOps';

    // Atomic upsert into EmergencyPhone collection
    const doc = await EmergencyPhone.findOneAndUpdate(
      { phone: cleanPhone },
      { $set: { phone: cleanPhone, label, enabled: true } },
      { upsert: true, returnDocument: 'after' }
    );

    // Keep NotificationPreferences.phoneNumbers in sync
    await NotificationPreferences.updateMany(
      {},
      { $addToSet: { phoneNumbers: cleanPhone } }
    );

    return NextResponse.json(
      {
        success: true,
        phone: {
          id: doc._id.toString(),
          phone: doc.phone,
          label: doc.label,
          enabled: doc.enabled,
          createdAt: doc.createdAt,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error saving emergency phone:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save emergency phone' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const id = searchParams.get('id');

    if (!phone && !id) {
      return NextResponse.json(
        { success: false, error: 'Phone or id is required for deletion.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    let deletedPhone = phone;
    if (id) {
      const found = await EmergencyPhone.findById(id).lean();
      if (found) {
        deletedPhone = (found as any).phone;
        await EmergencyPhone.deleteOne({ _id: id });
      }
    } else if (phone) {
      await EmergencyPhone.deleteOne({ phone });
    }

    if (deletedPhone) {
      await NotificationPreferences.updateMany(
        {},
        { $pull: { phoneNumbers: deletedPhone } }
      );
    }

    return NextResponse.json({ success: true, deletedPhone }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error removing emergency phone:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to remove emergency phone' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, phone, enabled } = body;

    if (!id && !phone) {
      return NextResponse.json(
        { success: false, error: 'id or phone required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const query = id ? { _id: id } : { phone };
    const updated = await EmergencyPhone.findOneAndUpdate(
      query,
      { $set: { enabled: Boolean(enabled) } },
      { returnDocument: 'after' }
    );

    return NextResponse.json({ success: true, phone: updated }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to toggle status' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
