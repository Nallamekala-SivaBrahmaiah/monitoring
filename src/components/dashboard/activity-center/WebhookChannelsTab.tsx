'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Save,
  MessageSquare,
  Shield,
  Zap,
  Clock,
  Layers,
  Sliders,
  ExternalLink,
  Bot,
  BellRing,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export function WebhookChannelsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Slack state
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [showSlackUrl, setShowSlackUrl] = useState(false);

  // Discord state
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [showDiscordUrl, setShowDiscordUrl] = useState(false);

  // Microsoft Teams state
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('');
  const [showTeamsUrl, setShowTeamsUrl] = useState(false);

  // Telegram Bot state
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);

  // Smart Features & Maintenance
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [alertDeduplicationEnabled, setAlertDeduplicationEnabled] = useState(true);
  const [aiExecutiveSummaryEnabled, setAiExecutiveSummaryEnabled] = useState(true);

  // Fetch Settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity-center/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          const s = data.settings;
          setSlackEnabled(Boolean(s.slackEnabled));
          setSlackWebhookUrl(s.slackWebhookUrl || '');
          setDiscordEnabled(Boolean(s.discordEnabled));
          setDiscordWebhookUrl(s.discordWebhookUrl || '');
          setTeamsEnabled(Boolean(s.teamsEnabled));
          setTeamsWebhookUrl(s.teamsWebhookUrl || '');
          setTelegramEnabled(Boolean(s.telegramEnabled));
          setTelegramBotToken(s.telegramBotToken || '');
          setTelegramChatId(s.telegramChatId || '');

          setMaintenanceMode(Boolean(s.maintenanceMode));
          setAlertDeduplicationEnabled(s.alertDeduplicationEnabled !== false);
          setAiExecutiveSummaryEnabled(s.aiExecutiveSummaryEnabled !== false);
        }
      }
    } catch (err) {
      console.error('Failed to load webhook settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Settings
  const handleSaveSettings = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        slackEnabled,
        slackWebhookUrl: slackWebhookUrl.trim(),
        discordEnabled,
        discordWebhookUrl: discordWebhookUrl.trim(),
        teamsEnabled,
        teamsWebhookUrl: teamsWebhookUrl.trim(),
        telegramEnabled,
        telegramBotToken: telegramBotToken.trim(),
        telegramChatId: telegramChatId.trim(),
        maintenanceMode,
        alertDeduplicationEnabled,
        aiExecutiveSummaryEnabled,
      };

      const res = await fetch('/api/activity-center/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: 'Webhook channels & smart notification guardrails saved successfully!',
        });
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Test Webhook
  const handleTestWebhook = async (channel: 'slack' | 'discord' | 'teams' | 'telegram') => {
    setTestingChannel(channel);
    setFeedback(null);
    try {
      const payload: any = { channel };
      if (channel === 'slack') payload.webhookUrl = slackWebhookUrl.trim();
      if (channel === 'discord') payload.webhookUrl = discordWebhookUrl.trim();
      if (channel === 'teams') payload.webhookUrl = teamsWebhookUrl.trim();
      if (channel === 'telegram') {
        payload.botToken = telegramBotToken.trim();
        payload.chatId = telegramChatId.trim();
      }

      const res = await fetch('/api/activity-center/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || `Test alert successfully delivered to ${channel.toUpperCase()}!`,
        });
      } else {
        throw new Error(data.error || `Failed to deliver test alert to ${channel.toUpperCase()}`);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setTestingChannel(null);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0D1526]/85 border border-cyan-500/25 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400" />
              <span>Multi-Platform Webhooks &amp; Instant Messaging</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-3xl">
              Broadcast critical incidents, deployment milestones, and scheduled daily executive briefings directly into your team&apos;s active communication hubs with rich formatted cards.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              <span>Save Webhook Settings</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Grid of 4 Webhook Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. SLACK WEBHOOK */}
        <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Slack Incoming Webhook</span>
                </h3>
                <span className="text-[11px] text-gray-400">Post rich block cards into #devops-alerts</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSlackEnabled(!slackEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                slackEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {slackEnabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
              <span>{slackEnabled ? 'ENABLED' : 'DISABLED'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-300 font-semibold">Slack Webhook URL</label>
                <button
                  type="button"
                  onClick={() => setShowSlackUrl(!showSlackUrl)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {showSlackUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSlackUrl ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <input
                type={showSlackUrl ? 'text' : 'password'}
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://your-slack-incoming-webhook-url"
                className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs font-mono text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-gray-500 font-mono">Payload: Slack Block Kit JSON</span>
              <button
                type="button"
                onClick={() => handleTestWebhook('slack')}
                disabled={testingChannel === 'slack' || !slackWebhookUrl.trim()}
                className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${testingChannel === 'slack' ? 'animate-spin' : ''}`} />
                <span>Test Slack Card</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. DISCORD WEBHOOK */}
        <div className="bg-[#0D1526]/90 border border-blue-500/25 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Discord Webhook</span>
                </h3>
                <span className="text-[11px] text-gray-400">Embed multi-cloud metrics &amp; incident cards</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDiscordEnabled(!discordEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                discordEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {discordEnabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
              <span>{discordEnabled ? 'ENABLED' : 'DISABLED'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-300 font-semibold">Discord Webhook URL</label>
                <button
                  type="button"
                  onClick={() => setShowDiscordUrl(!showDiscordUrl)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {showDiscordUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showDiscordUrl ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <input
                type={showDiscordUrl ? 'text' : 'password'}
                value={discordWebhookUrl}
                onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/0000/XXXX"
                className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs font-mono text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-gray-500 font-mono">Payload: Discord Rich Embeds</span>
              <button
                type="button"
                onClick={() => handleTestWebhook('discord')}
                disabled={testingChannel === 'discord' || !discordWebhookUrl.trim()}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${testingChannel === 'discord' ? 'animate-spin' : ''}`} />
                <span>Test Discord Card</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. MICROSOFT TEAMS WEBHOOK */}
        <div className="bg-[#0D1526]/90 border border-indigo-500/25 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Microsoft Teams Connector</span>
                </h3>
                <span className="text-[11px] text-gray-400">Enterprise Office 365 Adaptive Cards</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTeamsEnabled(!teamsEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                teamsEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {teamsEnabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
              <span>{teamsEnabled ? 'ENABLED' : 'DISABLED'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-300 font-semibold">Teams Incoming Webhook URL</label>
                <button
                  type="button"
                  onClick={() => setShowTeamsUrl(!showTeamsUrl)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {showTeamsUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showTeamsUrl ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <input
                type={showTeamsUrl ? 'text' : 'password'}
                value={teamsWebhookUrl}
                onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                placeholder="https://outlook.office.com/webhook/XXXX"
                className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs font-mono text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-gray-500 font-mono">Payload: MS Teams MessageCard</span>
              <button
                type="button"
                onClick={() => handleTestWebhook('teams')}
                disabled={testingChannel === 'teams' || !teamsWebhookUrl.trim()}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${testingChannel === 'teams' ? 'animate-spin' : ''}`} />
                <span>Test Teams Card</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. TELEGRAM BOT NOTIFICATIONS */}
        <div className="bg-[#0D1526]/90 border border-sky-500/25 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Telegram On-Call Bot</span>
                </h3>
                <span className="text-[11px] text-gray-400">Instant mobile push to DevOps on-call channels</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTelegramEnabled(!telegramEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                telegramEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {telegramEnabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
              <span>{telegramEnabled ? 'ENABLED' : 'DISABLED'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-300 font-semibold">Bot API Token</label>
                  <button
                    type="button"
                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300"
                  >
                    {showTelegramToken ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                <input
                  type={showTelegramToken ? 'text' : 'password'}
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVw"
                  className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs font-mono text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div>
                <label className="text-gray-300 font-semibold block mb-1">Chat ID / Channel</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="@devops_channel or -100123456"
                  className="w-full px-3 py-2 bg-[#080D1A] border border-[#1E293B] rounded-xl text-xs font-mono text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/60"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-gray-500 font-mono">Payload: Telegram Markdownv2</span>
              <button
                type="button"
                onClick={() => handleTestWebhook('telegram')}
                disabled={testingChannel === 'telegram' || !telegramBotToken.trim() || !telegramChatId.trim()}
                className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${testingChannel === 'telegram' ? 'animate-spin' : ''}`} />
                <span>Test Telegram Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Features & Maintenance Guardrails */}
      <div className="bg-[#0D1526]/85 border border-[#1E293B] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>Intelligent Notification Guardrails &amp; Maintenance</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Maintenance Mode */}
          <div className="p-4 rounded-xl bg-[#080D1A] border border-[#1E293B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Maintenance Mode</span>
              </span>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  maintenanceMode
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {maintenanceMode ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Temporarily mutes non-critical alerts during planned cloud server upgrades and patch deployments.
            </p>
          </div>

          {/* Alert De-duplication */}
          <div className="p-4 rounded-xl bg-[#080D1A] border border-[#1E293B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Smart De-duplication</span>
              </span>
              <button
                type="button"
                onClick={() => setAlertDeduplicationEnabled(!alertDeduplicationEnabled)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  alertDeduplicationEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {alertDeduplicationEnabled ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Consolidates ongoing high CPU/disk spikes into a single live status thread to prevent email &amp; webhook spam.
            </p>
          </div>

          {/* AI Executive Digest */}
          <div className="p-4 rounded-xl bg-[#080D1A] border border-[#1E293B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Executive Briefing</span>
              </span>
              <button
                type="button"
                onClick={() => setAiExecutiveSummaryEnabled(!aiExecutiveSummaryEnabled)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  aiExecutiveSummaryEnabled
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {aiExecutiveSummaryEnabled ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Autonomously synthesizes natural language summaries of builds, deployments, and server health for daily reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
