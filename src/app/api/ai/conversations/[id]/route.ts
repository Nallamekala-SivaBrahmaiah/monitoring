import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const conv = await Conversation.findById(id).lean();
    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: conv._id.toString(),
      title: conv.title,
      messages: conv.messages || [],
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch conversation' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const update: any = {};
    if (typeof body.title === 'string' && body.title.trim()) {
      update.title = body.title.trim();
    }

    const updated = await Conversation.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: updated._id.toString(),
      title: updated.title,
      messages: updated.messages || [],
      updatedAt: updated.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update conversation' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    await Conversation.findByIdAndDelete(id);

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete conversation' }, { status: 500 });
  }
}
