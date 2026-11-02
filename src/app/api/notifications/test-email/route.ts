import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail, verifySmtpConnection } from '@/lib/notifications/emailService';
import { getEnabledDevOpsRecipients } from '@/lib/monitoring/alertEvaluationEngine';

/**
 * POST /api/notifications/test-email
 * Dispatches test email to all enabled DevOps engineers (or specific recipient).
 * Body: { recipient?: string, sendToAll?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    let targetRecipients: string[] | undefined;
    try {
      const body = await request.json();
      if (body.recipient && typeof body.recipient === 'string') {
        targetRecipients = [body.recipient.trim()];
      } else if (Array.isArray(body.recipients) && body.recipients.length > 0) {
        targetRecipients = body.recipients;
      }
    } catch {
      // No JSON body provided
    }

    // If no specific recipient specified, load all enabled DevOps engineers from database
    if (!targetRecipients || targetRecipients.length === 0) {
      targetRecipients = await getEnabledDevOpsRecipients();
    }

    if (!targetRecipients || targetRecipients.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No enabled DevOps engineer email recipients found. Please add or enable at least one DevOps recipient.',
        },
        { status: 400 }
      );
    }

    // Verify SMTP connection
    const verifyResult = await verifySmtpConnection();
    if (!verifyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `SMTP Connection Failed: ${verifyResult.error}. Please verify GMAIL_APP_PASSWORD and SMTP settings.`,
        },
        { status: 500 }
      );
    }

    // Send test email
    const sendResult = await sendTestEmail(targetRecipients);
    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to deliver email: ${sendResult.error}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      recipients: sendResult.recipients || targetRecipients,
      count: (sendResult.recipients || targetRecipients).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Test email route error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to dispatch test email' },
      { status: 500 }
    );
  }
}
