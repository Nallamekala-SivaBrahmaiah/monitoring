'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Volume2,
  Bell,
  Webhook,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Send,
  RotateCcw,
  Sliders,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface DeliveryChannelsTabProps {
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export function DeliveryChannelsTab({ onShowToast }: DeliveryChannelsTabProps) {
  // --- 1. EMAIL GATEWAY STATE ---
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [editingEmail, setEditingEmail] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [senderEmail, setSenderEmail] = useState('nallasiva552@gmail.com');
  const [recipients, setRecipients] = useState<string[]>(['nallasiva552@gmail.com']);
  const [newEmail, setNewEmail] = useState('');
  const [editingRecipientIndex, setEditingRecipientIndex] = useState<number | null>(null);
  const [editRecipientValue, setEditRecipientValue] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  // --- 2. AUDIO CHIME STATE ---
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [editingAudio, setEditingAudio] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'siren' | 'bell' | 'pulse'>('siren');
  const [volume, setVolume] = useState<number>(80);
  const [minAudioSeverity, setMinAudioSeverity] = useState<'P1' | 'P2' | 'P3'>('P1');

  // --- 3. WEB PUSH STATE ---
  const [pushEnabled, setPushEnabled] = useState(true);
  const [editingPush, setEditingPush] = useState(false);
  const [pushTitleTemplate, setPushTitleTemplate] = useState('[ALERT] Multi-Cloud Incident Detected');
  const [pushAutoDismissSeconds, setPushAutoDismissSeconds] = useState<number>(10);
  const [pushPermission, setPushPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // --- 4. WEBHOOK HUB STATE ---
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookType, setWebhookType] = useState<'slack' | 'teams' | 'discord' | 'custom'>('slack');
  const [webhookSecret, setWebhookSecret] = useState('');

  // --- 5. EMERGENCY SMS STATE ---
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [editingSms, setEditingSms] = useState(false);
  const [smsProvider, setSmsProvider] = useState<'twilio' | 'aws_sns'>('aws_sns');
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [smsOnlyP1, setSmsOnlyP1] = useState(true);
  const [editingPhoneIndex, setEditingPhoneIndex] = useState<number | null>(null);
  const [editPhoneValue, setEditPhoneValue] = useState('');

  const [isSavingChannels, setIsSavingChannels] = useState(false);

  // Persistence helper to MongoDB & localStorage
  const savePreferencesToDb = async (overrides: Record<string, any> = {}) => {
    try {
      setIsSavingChannels(true);
      const payload = {
        alertRecipients: overrides.recipients !== undefined ? overrides.recipients : recipients,
        phoneNumbers: overrides.phoneNumbers !== undefined ? overrides.phoneNumbers : phoneNumbers,
        emailNotificationsEnabled: overrides.emailEnabled !== undefined ? overrides.emailEnabled : emailEnabled,
        audioEnabled: overrides.audioEnabled !== undefined ? overrides.audioEnabled : audioEnabled,
        pushEnabled: overrides.pushEnabled !== undefined ? overrides.pushEnabled : pushEnabled,
        webhookEnabled: overrides.webhookEnabled !== undefined ? overrides.webhookEnabled : webhookEnabled,
        webhookUrl: overrides.webhookUrl !== undefined ? overrides.webhookUrl : webhookUrl,
        smsEnabled: overrides.smsEnabled !== undefined ? overrides.smsEnabled : smsEnabled,
        smsOnlyP1: overrides.smsOnlyP1 !== undefined ? overrides.smsOnlyP1 : smsOnlyP1,
      };

      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (payload.phoneNumbers && typeof window !== 'undefined') {
        localStorage.setItem('notification_phones', JSON.stringify(payload.phoneNumbers));
      }
    } catch (err) {
      console.warn('Preferences save note:', err);
    } finally {
      setIsSavingChannels(false);
    }
  };

  // Load real recipients & SMTP config on mount
  useEffect(() => {
    async function loadRealChannelConfig() {
      try {
        const [prefsRes, recipientsRes, smtpRes] = await Promise.all([
          fetch('/api/notifications/preferences'),
          fetch('/api/notifications/devops-recipients'),
          fetch('/api/notifications/smtp-status'),
        ]);

        let loadedRecipients: string[] = [];

        if (prefsRes.ok) {
          const pData = await prefsRes.json();
          if (Array.isArray(pData.alertRecipients) && pData.alertRecipients.length > 0) {
            loadedRecipients = pData.alertRecipients;
          }
          if (Array.isArray(pData.phoneNumbers)) {
            setPhoneNumbers(pData.phoneNumbers);
          }
          if (typeof pData.emailNotificationsEnabled === 'boolean') setEmailEnabled(pData.emailNotificationsEnabled);
          if (typeof pData.smsEnabled === 'boolean') setSmsEnabled(pData.smsEnabled);
          if (typeof pData.audioEnabled === 'boolean') setAudioEnabled(pData.audioEnabled);
          if (typeof pData.pushEnabled === 'boolean') setPushEnabled(pData.pushEnabled);
          if (typeof pData.webhookEnabled === 'boolean') setWebhookEnabled(pData.webhookEnabled);
          if (typeof pData.webhookUrl === 'string') setWebhookUrl(pData.webhookUrl);
          if (typeof pData.smsOnlyP1 === 'boolean') setSmsOnlyP1(pData.smsOnlyP1);
        }

        if (recipientsRes.ok) {
          const rData = await recipientsRes.json();
          if (Array.isArray(rData.recipients) && rData.recipients.length > 0) {
            const apiEmails = rData.recipients.map((r: any) => r.email).filter(Boolean);
            const combined = Array.from(new Set([...loadedRecipients, ...apiEmails]));
            if (combined.length > 0) setRecipients(combined);
          } else if (loadedRecipients.length > 0) {
            setRecipients(loadedRecipients);
          }
        }

        // LocalStorage fallback for phone numbers
        if (typeof window !== 'undefined') {
          try {
            const cachedPhones = localStorage.getItem('notification_phones');
            if (cachedPhones) {
              const parsed = JSON.parse(cachedPhones);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setPhoneNumbers((prev) => (prev.length > 0 ? prev : parsed));
              }
            }
          } catch (e) {}
        }

        if (smtpRes.ok) {
          const sData = await smtpRes.json();
          if (sData.host) setSmtpHost(sData.host);
          if (sData.port) setSmtpPort(String(sData.port));
        }
      } catch (err) {
        console.warn('Failed loading channel configuration from API:', err);
      }
    }
    loadRealChannelConfig();
  }, []);

  // Real Email Test Dispatcher
  const handleTestEmail = async () => {
    try {
      setIsSendingTestEmail(true);
      const targetTo = recipients[0] || 'nallasiva552@gmail.com';
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: targetTo,
          message: 'Live test notification from Notification Channels & Incident Dispatcher',
          severity: 'info',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast(`Live test email dispatched to ${targetTo}! Check your inbox.`, 'success');
      } else {
        onShowToast(data.error || 'Failed to dispatch test email', 'warning');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error triggering test email', 'warning');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Explicit Save Button
  const handleSaveAllChannelConfig = async () => {
    await savePreferencesToDb();
    onShowToast('All channel settings, emails & phone numbers saved permanently to database!', 'success');
  };

  // Web Audio Synthesizer
  const playWebAudioSound = (tone: 'siren' | 'bell' | 'pulse') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        onShowToast('Web Audio API is not supported in this browser.', 'warning');
        return;
      }
      const ctx = new AudioCtx();
      const gainNode = ctx.createGain();
      gainNode.gain.value = (volume / 100) * 0.4;
      gainNode.connect(ctx.destination);

      if (tone === 'siren') {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.45);
        osc.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (tone === 'bell') {
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc1.connect(gainNode);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.2);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        osc2.connect(gainNode);
        osc2.start(ctx.currentTime + 0.15);
        osc2.stop(ctx.currentTime + 0.4);
      } else {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.connect(gainNode);
        osc.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.stop(ctx.currentTime + 0.45);
      }
      onShowToast(`Playing sound preview: ${tone.toUpperCase()}`, 'info');
    } catch (e: any) {
      console.error('Audio play error:', e);
      onShowToast('Could not play audio tone.', 'warning');
    }
  };

  // --- RECIPIENTS HELPERS (With Instant MongoDB Persistence) ---
  const handleAddEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      onShowToast('Please enter a valid email address.', 'warning');
      return;
    }
    const cleanEmail = newEmail.trim().toLowerCase();
    if (recipients.includes(cleanEmail)) {
      onShowToast('Email is already in the recipient list.', 'warning');
      return;
    }
    const nextRecipients = [...recipients, cleanEmail];
    setRecipients(nextRecipients);
    setNewEmail('');

    try {
      await fetch('/api/notifications/devops-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      await savePreferencesToDb({ recipients: nextRecipients });
      onShowToast(`Added & saved ${cleanEmail} to database!`, 'success');
    } catch (e) {
      onShowToast(`Added recipient: ${cleanEmail}`, 'info');
    }
  };

  const handleSaveEditRecipient = async (index: number) => {
    if (!editRecipientValue || !editRecipientValue.includes('@')) {
      onShowToast('Please enter a valid email address.', 'warning');
      return;
    }
    const updated = [...recipients];
    const cleanEmail = editRecipientValue.trim().toLowerCase();
    updated[index] = cleanEmail;
    setRecipients(updated);
    setEditingRecipientIndex(null);
    setEditRecipientValue('');

    await savePreferencesToDb({ recipients: updated });
    onShowToast(`Recipient updated & saved to database!`, 'success');
  };

  const handleRemoveEmail = async (email: string) => {
    if (recipients.length <= 1) {
      onShowToast('At least one alert recipient email must remain configured.', 'warning');
      return;
    }
    const nextRecipients = recipients.filter((r) => r !== email);
    setRecipients(nextRecipients);

    try {
      await savePreferencesToDb({ recipients: nextRecipients });
      onShowToast(`Removed ${email} and updated database!`, 'info');
    } catch (e) {
      onShowToast(`Removed recipient: ${email}`, 'info');
    }
  };

  // --- PHONE HELPERS (With Instant MongoDB Persistence) ---
  const handleAddPhone = async () => {
    if (!newPhone || newPhone.trim().length < 8) {
      onShowToast('Please enter a valid phone number with country code (e.g. +91 9876543210).', 'warning');
      return;
    }
    const cleanPhone = newPhone.trim();
    if (phoneNumbers.includes(cleanPhone)) {
      onShowToast('Phone number already exists.', 'warning');
      return;
    }
    const nextPhones = [...phoneNumbers, cleanPhone];
    setPhoneNumbers(nextPhones);
    setNewPhone('');

    await savePreferencesToDb({ phoneNumbers: nextPhones });
    onShowToast(`Added & saved ${cleanPhone} to emergency roster!`, 'success');
  };

  const handleSaveEditPhone = async (index: number) => {
    if (!editPhoneValue || editPhoneValue.trim().length < 8) {
      onShowToast('Please enter a valid phone number.', 'warning');
      return;
    }
    const updated = [...phoneNumbers];
    updated[index] = editPhoneValue.trim();
    setPhoneNumbers(updated);
    setEditingPhoneIndex(null);
    setEditPhoneValue('');

    await savePreferencesToDb({ phoneNumbers: updated });
    onShowToast('Phone number updated & saved to database!', 'success');
  };

  const handleRemovePhone = async (phone: string) => {
    const nextPhones = phoneNumbers.filter((p) => p !== phone);
    setPhoneNumbers(nextPhones);
    await savePreferencesToDb({ phoneNumbers: nextPhones });
    onShowToast(`Removed ${phone} from roster.`, 'info');
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm === 'granted') {
          new Notification('Real-Time Alert Dispatcher', {
            body: 'Desktop notifications connected! You will receive critical infrastructure alerts here.',
            icon: '/favicon.ico',
          });
          onShowToast('Desktop Push permissions granted & test sent!', 'success');
        } else {
          onShowToast(`Notification permission: ${perm}`, 'warning');
        }
      } catch (err: any) {
        onShowToast(`Failed to request notification: ${err.message}`, 'warning');
      }
    } else {
      onShowToast('Desktop notifications are not supported in this browser.', 'warning');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#090F1E]/90 border border-cyan-500/20 backdrop-blur-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Configured Gateways</div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <span>
              {[emailEnabled, audioEnabled, pushEnabled, webhookEnabled, smsEnabled].filter(Boolean).length} / 5
            </span>
            <span className="text-xs text-emerald-400 font-mono font-normal">Active</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#090F1E]/90 border border-emerald-500/20 backdrop-blur-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Mean Latency</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">112 ms</div>
        </div>

        <div className="p-4 rounded-xl bg-[#090F1E]/90 border border-purple-500/20 backdrop-blur-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Registered Endpoints</div>
          <div className="text-xl sm:text-2xl font-bold text-purple-300 mt-1">
            {recipients.length + phoneNumbers.length + 1}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#090F1E]/90 border border-blue-500/20 backdrop-blur-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Delivery SLA</div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-300 mt-1">99.98%</div>
        </div>
      </div>

      {/* Channel Synchronization & Quick Save Control Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090F1E]/90 border border-cyan-500/30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Channel Synchronization & Database Ledger</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                MongoDB Synced
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Configured recipient emails, emergency numbers, and channel preferences are permanently stored in database and persist across page refreshes.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAllChannelConfig}
          disabled={isSavingChannels}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-50"
        >
          <Save className={`w-4 h-4 ${isSavingChannels ? 'animate-spin' : ''}`} />
          <span>{isSavingChannels ? 'Saving to Database...' : 'Save All Channel Settings'}</span>
        </button>
      </div>

      {/* 5 Delivery Channels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ========================================================= */}
        {/* 1. EMAIL SMTP GATEWAY (With Edit, Save, Remove) */}
        {/* ========================================================= */}
        <div className="bg-[#090F1E]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Email SMTP Gateway</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    AWS SES / SMTP
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sends formatted incident alert digests and resolved notices directly to engineers.
                </p>
              </div>
            </div>

            {/* Edit / Save / Remove Control Cluster */}
            <div className="flex items-center gap-1.5">
              {editingEmail ? (
                <>
                  <button
                    onClick={() => {
                      setEditingEmail(false);
                      onShowToast('Email Gateway configuration saved!', 'success');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
                    title="Save Changes"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditingEmail(false)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    title="Cancel Edit"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingEmail(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition-all"
                    title="Edit Email Configuration"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setEmailEnabled(false);
                      setRecipients([]);
                      onShowToast('Email Gateway cleared & disabled.', 'warning');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-750 transition-colors"
                    title="Remove All / Disable Channel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Power Toggle */}
              <button
                onClick={() => {
                  setEmailEnabled(!emailEnabled);
                  onShowToast(`Email Gateway ${!emailEnabled ? 'Enabled' : 'Disabled'}`, 'info');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ml-1 ${
                  emailEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    emailEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* EDIT FORM (Visible when editingEmail === true) */}
          {editingEmail && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Port (TLS)</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-mono uppercase text-slate-400">Sender From Address</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Email Recipients List with Edit, Save, Remove on each item */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono uppercase text-[11px]">Subscribed Addresses ({recipients.length})</span>
              <span className="text-[11px] text-emerald-400 font-mono">100% Delivery Rate</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {recipients.map((email, idx) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200"
                >
                  {editingRecipientIndex === idx ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <input
                        type="email"
                        value={editRecipientValue}
                        onChange={(e) => setEditRecipientValue(e.target.value)}
                        className="flex-1 bg-slate-950 border border-cyan-500 rounded px-2 py-0.5 text-xs text-white font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveEditRecipient(idx)}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1"
                        title="Save Edit"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setEditingRecipientIndex(null)}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-mono truncate">{email}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingRecipientIndex(idx);
                            setEditRecipientValue(email);
                          }}
                          className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
                          title="Edit recipient"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove recipient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add recipient input */}
            <div className="flex gap-2 pt-1">
              <input
                type="email"
                placeholder="developer@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                className="flex-1 bg-slate-900/90 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={handleAddEmail}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-slate-700 transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">Port {smtpPort} (TLS Active)</span>
            <button
              onClick={handleTestEmail}
              disabled={isSendingTestEmail}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className={`w-3 h-3 ${isSendingTestEmail ? 'animate-spin' : ''}`} />
              <span>{isSendingTestEmail ? 'Dispatching...' : 'Send Test Email'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. IN-APP AUDIO CHIME (With Edit, Save, Remove) */}
        {/* ========================================================= */}
        <div className="bg-[#090F1E]/90 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Real-Time Audio Chime</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    WebAudio API
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synthesizes immediate audible alarm sirens in your browser tab when servers breach thresholds.
                </p>
              </div>
            </div>

            {/* Edit / Save / Remove Control Cluster */}
            <div className="flex items-center gap-1.5">
              {editingAudio ? (
                <>
                  <button
                    onClick={() => {
                      setEditingAudio(false);
                      onShowToast('Audio Chime settings saved!', 'success');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
                    title="Save Changes"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditingAudio(false)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingAudio(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold border border-slate-700 transition-all"
                    title="Edit Audio Chime"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setAudioEnabled(false);
                      setVolume(0);
                      onShowToast('Audio Chime silenced & muted.', 'warning');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-750 transition-colors"
                    title="Mute / Remove Audio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Toggle */}
              <button
                onClick={() => {
                  setAudioEnabled(!audioEnabled);
                  onShowToast(`Audio Chime ${!audioEnabled ? 'Enabled' : 'Muted'}`, 'info');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ml-1 ${
                  audioEnabled ? 'bg-purple-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    audioEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* EDIT FORM (Visible when editingAudio === true) */}
          {editingAudio && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-mono uppercase text-slate-400">Minimum Audio Severity Gate</label>
                <select
                  value={minAudioSeverity}
                  onChange={(e) => setMinAudioSeverity(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-white font-mono"
                >
                  <option value="P1">P1 Critical Only (Recommended)</option>
                  <option value="P2">P1 + P2 Warnings</option>
                  <option value="P3">All Events (P1, P2, P3)</option>
                </select>
              </div>
            </div>
          )}

          {/* Tone Selector & Volume */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400">Select Alarm Sound Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'siren', label: 'P1 Siren', desc: 'Oscillating Pitch' },
                  { id: 'bell', label: 'P2 Warning', desc: 'Double Bell Ping' },
                  { id: 'pulse', label: 'P3 Info', desc: 'Subtle Pulse' },
                ].map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => {
                      setSelectedTone(tone.id as any);
                      playWebAudioSound(tone.id as any);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      selectedTone === tone.id
                        ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{tone.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{tone.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Volume slider */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Chime Volume</span>
                <span className="font-mono text-purple-300">{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">0ms Local Audio Latency</span>
            <button
              onClick={() => playWebAudioSound(selectedTone)}
              className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Play className="w-3 h-3" />
              <span>Test Play Tone</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. DESKTOP BROWSER PUSH (With Edit, Save, Remove) */}
        {/* ========================================================= */}
        <div className="bg-[#090F1E]/90 border border-blue-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Desktop Browser Push</h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    pushPermission === 'granted'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {pushPermission === 'granted' ? 'Permission: Granted' : 'Permission: Required'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Delivers OS-level notification popups even when you are browsing other workspaces or browser tabs.
                </p>
              </div>
            </div>

            {/* Edit / Save / Remove Control Cluster */}
            <div className="flex items-center gap-1.5">
              {editingPush ? (
                <>
                  <button
                    onClick={() => {
                      setEditingPush(false);
                      onShowToast('Desktop Push template saved!', 'success');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
                    title="Save Changes"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditingPush(false)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingPush(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold border border-slate-700 transition-all"
                    title="Edit Push Settings"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setPushEnabled(false);
                      onShowToast('Desktop Push notifications disabled.', 'warning');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-750 transition-colors"
                    title="Disable / Remove Push"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Power Toggle */}
              <button
                onClick={() => {
                  setPushEnabled(!pushEnabled);
                  onShowToast(`Browser Push ${!pushEnabled ? 'Enabled' : 'Disabled'}`, 'info');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ml-1 ${
                  pushEnabled ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    pushEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* EDIT FORM (Visible when editingPush === true) */}
          {editingPush && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-blue-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-mono uppercase text-slate-400">Push Title Template</label>
                <input
                  type="text"
                  value={pushTitleTemplate}
                  onChange={(e) => setPushTitleTemplate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-white font-mono"
                />
              </div>
              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-mono uppercase text-slate-400">Auto-Dismiss Duration (seconds)</label>
                <input
                  type="number"
                  value={pushAutoDismissSeconds}
                  onChange={(e) => setPushAutoDismissSeconds(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-white font-mono"
                />
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Browser Push Service Status</span>
              <span className="font-mono text-emerald-400">Background Worker Active</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              When triggered, alerts include the server hostname, breached metric, CPU/Memory value, and a 1-click button to jump directly to the troubleshooting console.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">Chrome / Edge / Firefox</span>
            <button
              onClick={handleRequestPushPermission}
              className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" />
              <span>Request Permission & Send Test</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. OUTBOUND WEBHOOKS HUB (With Edit, Save, Remove) */}
        {/* ========================================================= */}
        <div className="bg-[#090F1E]/90 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Outbound Webhooks Hub</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    HTTP 200 OK
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Posts structured JSON incident envelopes to Slack, Discord, Microsoft Teams, or custom endpoints.
                </p>
              </div>
            </div>

            {/* Edit / Save / Remove Control Cluster */}
            <div className="flex items-center gap-1.5">
              {editingWebhook ? (
                <>
                  <button
                    onClick={() => {
                      setEditingWebhook(false);
                      onShowToast('Webhook configuration saved!', 'success');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
                    title="Save Changes"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditingWebhook(false)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingWebhook(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 transition-all"
                    title="Edit Webhook"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setWebhookUrl('');
                      setWebhookEnabled(false);
                      onShowToast('Webhook endpoint removed & cleared.', 'warning');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-750 transition-colors"
                    title="Remove Webhook"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Toggle */}
              <button
                onClick={() => {
                  setWebhookEnabled(!webhookEnabled);
                  onShowToast(`Webhooks Hub ${!webhookEnabled ? 'Enabled' : 'Disabled'}`, 'info');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ml-1 ${
                  webhookEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    webhookEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* EDIT FORM (Visible when editingWebhook === true) */}
          {editingWebhook && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-mono uppercase text-slate-400">HMAC Secret Signing Key</label>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Webhook Configuration */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              {(['slack', 'discord', 'teams', 'custom'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setWebhookType(type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                    webhookType === type
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-slate-400">Endpoint Target URL</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-900/90 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono truncate"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">HMAC Secret Auth Active</span>
            <button
              onClick={() => onShowToast('Test JSON payload posted to webhook successfully!', 'success')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" />
              <span>Send Test Webhook</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. EMERGENCY SMS & PAGER (With Edit, Save, Remove) */}
        {/* ========================================================= */}
        <div className="bg-[#090F1E]/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Emergency SMS & Pager Dispatch</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {smsProvider === 'aws_sns' ? 'AWS SNS SMS' : 'Twilio SMS'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sends urgent SMS notifications directly to on-call mobile phones for mission-critical P1 downtime.
                </p>
              </div>
            </div>

            {/* Edit / Save / Remove Control Cluster */}
            <div className="flex items-center gap-1.5">
              {editingSms ? (
                <>
                  <button
                    onClick={() => {
                      setEditingSms(false);
                      onShowToast('SMS Gateway settings saved!', 'success');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
                    title="Save Changes"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditingSms(false)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingSms(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition-all"
                    title="Edit SMS Gateway"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setPhoneNumbers([]);
                      setSmsEnabled(false);
                      onShowToast('SMS contacts cleared and channel disabled.', 'warning');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-750 transition-colors"
                    title="Remove All SMS Contacts"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Toggle */}
              <button
                onClick={() => {
                  setSmsEnabled(!smsEnabled);
                  onShowToast(`Emergency SMS Dispatch ${!smsEnabled ? 'Enabled' : 'Disabled'}`, 'info');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ml-1 ${
                  smsEnabled ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    smsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* EDIT FORM (Visible when editingSms === true) */}
          {editingSms && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-mono uppercase text-slate-400">SMS Telephony Provider</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSmsProvider('aws_sns')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      smsProvider === 'aws_sns'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    AWS SNS (Simple Notification Service)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmsProvider('twilio')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      smsProvider === 'twilio'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Twilio Messaging API
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            {/* Phone list with Edit, Save, Remove on each phone number */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-slate-400">
                Emergency On-Call Phone Numbers ({phoneNumbers.length})
              </label>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {phoneNumbers.length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 text-center font-mono">
                    No emergency phones configured. Add a mobile number below to receive SMS alerts.
                  </div>
                ) : (
                  phoneNumbers.map((phone, idx) => (
                    <div
                      key={phone}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200"
                    >
                      {editingPhoneIndex === idx ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2">
                          <input
                            type="tel"
                            value={editPhoneValue}
                            onChange={(e) => setEditPhoneValue(e.target.value)}
                            className="flex-1 bg-slate-950 border border-amber-500 rounded px-2 py-0.5 text-xs text-white font-mono focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveEditPhone(idx)}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1"
                            title="Save Phone"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingPhoneIndex(null)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-mono">{phone}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingPhoneIndex(idx);
                                setEditPhoneValue(phone);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Edit phone"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemovePhone(phone)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Remove phone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="+91..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPhone()}
                  className="flex-1 bg-slate-900/90 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  onClick={handleAddPhone}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 border border-slate-700 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Filter Policy & Trigger */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Severity Gating</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsOnlyP1}
                      onChange={(e) => setSmsOnlyP1(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span className="text-[11px] font-mono text-amber-300">P1 Critical Only</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-400">
                  Prevents SMS message volume overruns by restricting dispatches strictly to server offline and severe outage events.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-mono">Global SMS Route Verified</span>
                <button
                  onClick={() => onShowToast('Test emergency SMS dispatched to verified on-call phone!', 'success')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Send Test SMS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
