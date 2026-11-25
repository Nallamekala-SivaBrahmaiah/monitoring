import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { getOrCreateSettings } from '@/lib/activityCenter/activityService';
import ActivityAuditLog from '@/models/ActivityAuditLog';

export async function GET() {
  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const settings = await getOrCreateSettings();

    const prev = settings.toObject();

    // Master ON / OFF switches requested by user
    if (body.trackingEnabled !== undefined) settings.trackingEnabled = Boolean(body.trackingEnabled);
    if (body.autoReportEnabled !== undefined) settings.autoReportEnabled = Boolean(body.autoReportEnabled);

    // Timing & Schedule
    if (body.workStartTime) settings.workStartTime = body.workStartTime;
    if (body.workEndTime) settings.workEndTime = body.workEndTime;
    if (body.reportSendTime) settings.reportSendTime = body.reportSendTime;
    if (body.timezone) settings.timezone = body.timezone;
    if (body.workingDays) settings.workingDays = body.workingDays;
    if (body.deliveryMode) settings.deliveryMode = body.deliveryMode;

    // Inclusions
    if (body.includeAws !== undefined) settings.includeAws = body.includeAws;
    if (body.includeAzure !== undefined) settings.includeAzure = body.includeAzure;
    if (body.includeOnPrem !== undefined) settings.includeOnPrem = body.includeOnPrem;
    if (body.includeApp !== undefined) settings.includeApp = body.includeApp;
    if (body.includeDeployments !== undefined) settings.includeDeployments = body.includeDeployments;
    if (body.includeTroubleshooting !== undefined) settings.includeTroubleshooting = body.includeTroubleshooting;
    if (body.includePending !== undefined) settings.includePending = body.includePending;
    if (body.attachPdf !== undefined) settings.attachPdf = body.attachPdf;

    // SMTP settings
    if (body.smtpHost !== undefined) settings.smtpHost = body.smtpHost;
    if (body.smtpPort !== undefined) settings.smtpPort = Number(body.smtpPort);
    if (body.smtpSecure !== undefined) settings.smtpSecure = body.smtpSecure;
    if (body.smtpUser !== undefined) settings.smtpUser = body.smtpUser;
    if (body.smtpPassword !== undefined) settings.smtpPassword = body.smtpPassword;
    if (body.senderName !== undefined) settings.senderName = body.senderName;
    if (body.senderEmail !== undefined) settings.senderEmail = body.senderEmail;

    // Webhook settings
    if (body.slackWebhookUrl !== undefined) settings.slackWebhookUrl = body.slackWebhookUrl;
    if (body.slackEnabled !== undefined) settings.slackEnabled = Boolean(body.slackEnabled);
    if (body.discordWebhookUrl !== undefined) settings.discordWebhookUrl = body.discordWebhookUrl;
    if (body.discordEnabled !== undefined) settings.discordEnabled = Boolean(body.discordEnabled);
    if (body.teamsWebhookUrl !== undefined) settings.teamsWebhookUrl = body.teamsWebhookUrl;
    if (body.teamsEnabled !== undefined) settings.teamsEnabled = Boolean(body.teamsEnabled);
    if (body.telegramBotToken !== undefined) settings.telegramBotToken = body.telegramBotToken;
    if (body.telegramChatId !== undefined) settings.telegramChatId = body.telegramChatId;
    if (body.telegramEnabled !== undefined) settings.telegramEnabled = Boolean(body.telegramEnabled);

    // Smart features & maintenance
    if (body.maintenanceMode !== undefined) settings.maintenanceMode = Boolean(body.maintenanceMode);
    if (body.alertDeduplicationEnabled !== undefined) settings.alertDeduplicationEnabled = Boolean(body.alertDeduplicationEnabled);
    if (body.aiExecutiveSummaryEnabled !== undefined) settings.aiExecutiveSummaryEnabled = Boolean(body.aiExecutiveSummaryEnabled);

    if (body.defaultRecipientGroups) settings.defaultRecipientGroups = body.defaultRecipientGroups;
    if (body.reportRetentionDays) settings.reportRetentionDays = Number(body.reportRetentionDays);

    await settings.save();

    await ActivityAuditLog.create({
      action: 'SETTINGS_UPDATED',
      actor: 'DevOps Engineer',
      targetType: 'ActivityCenterSettings',
      targetId: settings._id.toString(),
      details: `Updated settings. Tracking: ${settings.trackingEnabled ? 'ON' : 'OFF'}, Auto-Report: ${settings.autoReportEnabled ? 'ON' : 'OFF'}`,
      previousValue: prev,
      newValue: settings.toObject(),
    });

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
