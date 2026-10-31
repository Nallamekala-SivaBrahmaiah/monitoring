import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Conversation from '@/models/Conversation';

export async function GET() {
  try {
    await connectToDatabase();
    const conversations = await Conversation.find()
      .select('title messages createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(
      conversations.map((c: any) => ({
        id: c._id.toString(),
        title: c.title || 'New Chat',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c.messages?.length || 0,
        lastMessage: c.messages?.[c.messages.length - 1]?.content?.slice(0, 80) || '',
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const title = body.title || 'New Chat';

    const newConv = await Conversation.create({
      title,
      messages: [],
    });

    return NextResponse.json({
      id: newConv._id.toString(),
      title: newConv.title,
      messages: [],
      createdAt: newConv.createdAt,
      updatedAt: newConv.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create conversation' }, { status: 500 });
  }
}
