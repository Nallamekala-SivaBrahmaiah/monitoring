import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/activityCenter/reportService';
import ActivityAuditLog from '@/models/ActivityAuditLog';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    const result = await sendTestEmail(email.trim());

    await ActivityAuditLog.create({
      action: 'TEST_EMAIL_SENT',
      actor: 'DevOps Engineer',
      targetType: 'Email',
      details: `Dispatched test email to ${email.trim()}. Message ID: ${result.messageId}`,
    });

    return NextResponse.json({
      success: true,
      message: `Test email successfully sent to ${email}`,
      messageId: result.messageId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
