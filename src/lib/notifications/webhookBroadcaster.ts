/**
 * Webhook Broadcaster for DevOps Notification Channels
 * Supports: Slack, Discord, Microsoft Teams, Telegram Bot
 */

export interface BroadcastPayload {
  title: string;
  summary: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  timestamp?: string;
  serversCount?: number;
  deploymentsCount?: number;
  incidentsCount?: number;
  aiBriefing?: string;
  actionUrl?: string;
}

export interface WebhookSendResult {
  channel: 'slack' | 'discord' | 'teams' | 'telegram';
  success: boolean;
  error?: string;
}

export async function broadcastToWebhooks(
  settings: any,
  payload: BroadcastPayload
): Promise<WebhookSendResult[]> {
  const results: WebhookSendResult[] = [];
  const promises: Promise<void>[] = [];

  const timeStr = payload.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const colorHex = payload.severity === 'error' ? '#ef4444' : payload.severity === 'warning' ? '#f59e0b' : '#10b981';

  // 1. SLACK WEBHOOK
  if (settings.slackEnabled && settings.slackWebhookUrl) {
    promises.push(
      (async () => {
        try {
          const body = {
            text: `*${payload.title}*\n${payload.summary}`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: payload.title,
                  emoji: true,
                },
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Status:*\n${payload.summary}` },
                  { type: 'mrkdwn', text: `*Timestamp (IST):*\n${timeStr}` },
                  { type: 'mrkdwn', text: `*Servers Monitored:*\n${payload.serversCount ?? 0} active` },
                  { type: 'mrkdwn', text: `*Deployments Today:*\n${payload.deploymentsCount ?? 0} runs` },
                ],
              },
              ...(payload.aiBriefing
                ? [
                    {
                      type: 'section',
                      text: {
                        type: 'mrkdwn',
                        text: `*🤖 Autonomous AI Summary:*\n>${payload.aiBriefing.replace(/\n/g, '\n>')}`,
                      },
                    },
                  ]
                : []),
            ],
          };

          const res = await fetch(settings.slackWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
          results.push({ channel: 'slack', success: true });
        } catch (err: any) {
          results.push({ channel: 'slack', success: false, error: err.message });
        }
      })()
    );
  }

  // 2. DISCORD WEBHOOK
  if (settings.discordEnabled && settings.discordWebhookUrl) {
    promises.push(
      (async () => {
        try {
          const colorDecimal = parseInt(colorHex.replace('#', ''), 16);
          const body = {
            content: `📢 **${payload.title}**`,
            embeds: [
              {
                title: payload.title,
                description: payload.summary,
                color: colorDecimal,
                fields: [
                  { name: 'Servers', value: `${payload.serversCount ?? 0} Hosts`, inline: true },
                  { name: 'Deployments', value: `${payload.deploymentsCount ?? 0} Runs`, inline: true },
                  { name: 'Incidents / Fixes', value: `${payload.incidentsCount ?? 0}`, inline: true },
                  ...(payload.aiBriefing
                    ? [{ name: '🤖 AI Executive Briefing', value: payload.aiBriefing.slice(0, 1024), inline: false }]
                    : []),
                ],
                footer: { text: `DevOps Notification Engine • ${timeStr}` },
              },
            ],
          };

          const res = await fetch(settings.discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
          results.push({ channel: 'discord', success: true });
        } catch (err: any) {
          results.push({ channel: 'discord', success: false, error: err.message });
        }
      })()
    );
  }

  // 3. MICROSOFT TEAMS WEBHOOK
  if (settings.teamsEnabled && settings.teamsWebhookUrl) {
    promises.push(
      (async () => {
        try {
          const body = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: colorHex.replace('#', ''),
            summary: payload.title,
            sections: [
              {
                activityTitle: payload.title,
                activitySubtitle: `Multi-Cloud DevOps Center • ${timeStr}`,
                text: payload.summary,
                facts: [
                  { name: 'Servers Monitored:', value: `${payload.serversCount ?? 0}` },
                  { name: 'Deployments:', value: `${payload.deploymentsCount ?? 0}` },
                  { name: 'Active Incidents:', value: `${payload.incidentsCount ?? 0}` },
                ],
              },
              ...(payload.aiBriefing
                ? [
                    {
                      text: `**🤖 AI Briefing:**\n\n${payload.aiBriefing}`,
                    },
                  ]
                : []),
            ],
          };

          const res = await fetch(settings.teamsWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
          results.push({ channel: 'teams', success: true });
        } catch (err: any) {
          results.push({ channel: 'teams', success: false, error: err.message });
        }
      })()
    );
  }

  // 4. TELEGRAM BOT
  if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
    promises.push(
      (async () => {
        try {
          const textMsg = `*${payload.title}*\n\n${payload.summary}\n\n• *Servers:* ${payload.serversCount ?? 0}\n• *Deployments:* ${payload.deploymentsCount ?? 0}\n• *Incidents:* ${payload.incidentsCount ?? 0}\n\n${payload.aiBriefing ? `*🤖 AI Briefing:*\n${payload.aiBriefing}\n\n` : ''}_Sent via DevOps Notification Engine • ${timeStr}_`;

          const tgUrl = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
          const res = await fetch(tgUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: settings.telegramChatId,
              text: textMsg,
              parse_mode: 'Markdown',
            }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
          results.push({ channel: 'telegram', success: true });
        } catch (err: any) {
          results.push({ channel: 'telegram', success: false, error: err.message });
        }
      })()
    );
  }

  await Promise.all(promises);
  return results;
}
