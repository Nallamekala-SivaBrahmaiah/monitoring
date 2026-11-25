import { NextRequest, NextResponse } from 'next/server';
import { broadcastToWebhooks } from '@/lib/notifications/webhookBroadcaster';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, webhookUrl, botToken, chatId } = body;

    if (!channel) {
      return NextResponse.json({ error: 'Channel is required (slack, discord, teams, telegram)' }, { status: 400 });
    }

    const testSettings: any = {};
    if (channel === 'slack') {
      if (!webhookUrl) return NextResponse.json({ error: 'Slack Webhook URL is required' }, { status: 400 });
      testSettings.slackEnabled = true;
      testSettings.slackWebhookUrl = webhookUrl;
    } else if (channel === 'discord') {
      if (!webhookUrl) return NextResponse.json({ error: 'Discord Webhook URL is required' }, { status: 400 });
      testSettings.discordEnabled = true;
      testSettings.discordWebhookUrl = webhookUrl;
    } else if (channel === 'teams') {
      if (!webhookUrl) return NextResponse.json({ error: 'Teams Webhook URL is required' }, { status: 400 });
      testSettings.teamsEnabled = true;
      testSettings.teamsWebhookUrl = webhookUrl;
    } else if (channel === 'telegram') {
      if (!botToken || !chatId) {
        return NextResponse.json({ error: 'Telegram Bot Token and Chat ID are required' }, { status: 400 });
      }
      testSettings.telegramEnabled = true;
      testSettings.telegramBotToken = botToken;
      testSettings.telegramChatId = chatId;
    }

    const testPayload = {
      title: `⚡ [TEST ALERT] DevOps ${channel.toUpperCase()} Notification Connection Verified`,
      summary: `This is a live test notification from your Multi-Cloud Monitoring Platform. All systems operational.`,
      severity: 'success' as const,
      serversCount: 12,
      deploymentsCount: 5,
      incidentsCount: 0,
      aiBriefing: 'Test message verified: channel endpoint is reachable, webhook payload accepted, and ready for automated activity broadcasts.',
    };

    const results = await broadcastToWebhooks(testSettings, testPayload);
    const targetResult = results.find((r) => r.channel === channel);

    if (targetResult && targetResult.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully delivered test alert to ${channel.toUpperCase()}!`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: targetResult?.error || `Failed to deliver test message to ${channel}. Check URL and permissions.`,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook test failed' }, { status: 500 });
  }
}
