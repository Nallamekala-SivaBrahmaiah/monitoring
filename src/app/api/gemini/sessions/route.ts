import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AiChatSession from '@/models/AiChatSession';

// GET: List all saved chat sessions
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const sessions = await AiChatSession.find({})
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s: any) => ({
        id: s._id.toString(),
        title: s.title || 'DevOps Conversation',
        model: s.aiModel || s.model || 'gemini-2.5-flash',
        serverName: s.serverName,
        messageCount: Array.isArray(s.messages) ? s.messages.length : 0,
        messages: s.messages || [],
        updatedAt: s.updatedAt || s.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('[Gemini Sessions GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create or Update a chat session
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { sessionId, title, model, serverName, messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'Messages array is required.' }, { status: 400 });
    }

    let sessionDoc = null;

    if (sessionId && sessionId !== 'new') {
      sessionDoc = await AiChatSession.findById(sessionId);
    }

    const defaultTitle =
      title ||
      messages.find((m: any) => m.role === 'user')?.text?.slice(0, 45) ||
      'DevOps Conversation';

    if (sessionDoc) {
      sessionDoc.title = defaultTitle;
      if (model) sessionDoc.aiModel = model;
      if (serverName) sessionDoc.serverName = serverName;
      sessionDoc.messages = messages;
      sessionDoc.updatedAt = new Date();
      await sessionDoc.save();
    } else {
      sessionDoc = await AiChatSession.create({
        title: defaultTitle,
        aiModel: model || 'gemini-2.5-flash',
        serverName,
        messages,
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionDoc._id.toString(),
      session: {
        id: sessionDoc._id.toString(),
        title: sessionDoc.title,
        model: sessionDoc.aiModel || 'gemini-2.5-flash',
        serverName: sessionDoc.serverName,
        messageCount: sessionDoc.messages.length,
        messages: sessionDoc.messages,
        updatedAt: sessionDoc.updatedAt,
      },
    });
  } catch (err: any) {
    console.error('[Gemini Sessions POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove a chat session
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    if (id === 'all') {
      await AiChatSession.deleteMany({});
      return NextResponse.json({ success: true, message: 'All chat sessions deleted.' });
    }

    await AiChatSession.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Session deleted successfully.' });
  } catch (err: any) {
    console.error('[Gemini Sessions DELETE Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
