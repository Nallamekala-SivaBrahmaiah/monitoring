import { NextResponse } from 'next/server';
import { verifySmtpConnection } from '@/lib/notifications/emailService';

/**
 * GET /api/notifications/smtp-status
 * Checks Gmail SMTP connectivity and returns connection status.
 * SECURITY: Never returns SMTP credentials, passwords, or sender email addresses.
 */
export async function GET() {
  try {
    const result = await verifySmtpConnection();

    return NextResponse.json({
      success: result.success,
      status: result.status, // 'Connected' | 'Disconnected' | 'Error'
      service: result.service || 'smtp.gmail.com:587 (STARTTLS)',
      host: result.host || 'smtp.gmail.com',
      port: result.port || 587,
      secure: result.secure || false,
      error: result.error ? 'SMTP Connection Check Failed' : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        status: 'Error',
        service: 'smtp.gmail.com:587 (STARTTLS)',
        error: 'Unable to verify SMTP connection',
      },
      { status: 500 }
    );
  }
}

