'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RotateCw,
  Plus,
  X,
  Users,
  Info,
  Bell,
  Radio,
  ExternalLink,
  CheckCheck,
  Search,
  Filter,
  ArrowLeft,
  Mail,
  Shield,
  Layers,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { NotificationsIcon, NotificationChannelsIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface DevOpsRecipientItem {
  id: string;
  email: string;
  role: string;
  enabled: boolean;
  addedOn: string;
}

interface SmtpStatus {
  status: 'Connected' | 'Disconnected' | 'Error';
  service: string;
  host: string;
  port: number;
  secure: boolean;
  error?: string | null;
}

interface InAppNotification {
  id: string;
  alertId?: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  provider?: string;
  resourceName?: string;
  resourceId?: string;
  metricName?: string;
  value?: number;
  threshold?: number;
  read: boolean;
  link?: string;
  emailDeliveryStatus?: string;
  createdAt: string;
}

// Iconic multi-color Gmail "M" Logo SVG
function GmailLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6.5C2 5.12 3.12 4 4.5 4H6V11L2 7.8V6.5Z" fill="#4285F4" />
      <path d="M22 6.5C22 5.12 20.88 4 19.5 4H18V11L22 7.8V6.5Z" fill="#34A853" />
      <path
        d="M6 4L12 8.5L18 4H19.5C20.88 4 22 5.12 22 6.5V7.8L12 14.5L2 7.8V6.5C2 5.12 3.12 4 4.5 4H6Z"
        fill="#EA4335"
      />
      <path d="M2 7.8V17.5C2 18.88 3.12 20 4.5 20H7V10.5L2 7.8Z" fill="#4285F4" />
      <path d="M22 7.8V17.5C22 18.88 20.88 20 19.5 20H17V10.5L22 7.8Z" fill="#34A853" />
      <path d="M7 10.5V20H17V10.5L12 14L7 10.5Z" fill="#FBBC05" />
    </svg>
  );
}

export default function NotificationsPage({
  defaultTab = 'feed',
}: {
  defaultTab?: 'feed' | 'channels';
}) {
  const [activeTab, setActiveTab] = useState<'feed' | 'channels'>(defaultTab);

  // Synchronize defaultTab if prop changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Feed states
  const [feedNotifications, setFeedNotifications] = useState<InAppNotification[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [feedSearch, setFeedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'unread'>('all');

  // SMTP status
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatus>({
    status: 'Connected',
    service: 'smtp.gmail.com:587 (STARTTLS)',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
  });

  // DevOps Recipients
  const [recipients, setRecipients] = useState<DevOpsRecipientItem[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);

  // Add Recipient Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('DevOps Engineer');
  const [addError, setAddError] = useState('');
  const [addingRecipient, setAddingRecipient] = useState(false);

  // Test Email states
  const [testingSingle, setTestingSingle] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  // Fetch Feed notifications
  const fetchFeed = useCallback(async () => {
    setLoadingFeed(true);
    try {
      const res = await fetch('/api/notifications?limit=100');
      if (res.ok) {
        const data = await res.json();
        setFeedNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications feed:', err);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  // Fetch SMTP status
  const fetchSmtpStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/smtp-status');
      if (res.ok) {
        const data = await res.json();
        setSmtpStatus({
          status: data.status || 'Connected',
          service: data.service || 'smtp.gmail.com:587 (STARTTLS)',
          host: data.host || 'smtp.gmail.com',
          port: data.port || 587,
          secure: data.secure || false,
          error: data.error,
        });
      }
    } catch {}
  }, []);

  // Fetch DevOps recipients
  const fetchRecipients = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/devops-recipients');
      if (res.ok) {
        const data = await res.json();
        setRecipients(data.recipients || []);
      }
    } catch (err) {
      console.warn('Failed to fetch DevOps recipients:', err);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    fetchSmtpStatus();
    fetchRecipients();

    const interval = setInterval(() => {
      fetchFeed();
      fetchRecipients();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchFeed, fetchSmtpStatus, fetchRecipients]);

  // Feed Actions: Mark Single Read
  const handleMarkAsRead = async (id: string) => {
    setFeedNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true }),
      });
    } catch {}
  };

  // Feed Actions: Mark All Read
  const handleMarkAllRead = async () => {
    setFeedNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setToastMessage('All notifications marked as read.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch {}
  };

  // Feed Actions: Clear All
  const handleClearAllFeed = async () => {
    setFeedNotifications([]);
    setUnreadCount(0);
    try {
      await fetch('/api/notifications?clearAll=true', { method: 'DELETE' });
      setToastMessage('Notification history cleared.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch {}
  };

  // Toggle individual recipient enabled status
  const handleToggleRecipientStatus = async (id: string, currentStatus: boolean) => {
    const updatedStatus = !currentStatus;
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: updatedStatus } : r))
    );

    try {
      const res = await fetch('/api/notifications/devops-recipients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: updatedStatus }),
      });
      if (!res.ok) {
        setRecipients((prev) =>
          prev.map((r) => (r.id === id ? { ...r, enabled: currentStatus } : r))
        );
      }
    } catch {
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: currentStatus } : r))
      );
    }
  };

  // Add DevOps Engineer Recipient
  const handleAddDevOpsRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const email = newEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAddError('Please enter a valid email address.');
      return;
    }

    if (recipients.some((r) => r.email.toLowerCase() === email)) {
      setAddError('This email is already in the DevOps recipients list.');
      return;
    }

    setAddingRecipient(true);
    try {
      const res = await fetch('/api/notifications/devops-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecipients((prev) => [...prev, data.recipient]);
        setNewEmail('');
        setNewRole('DevOps Engineer');
        setIsAddModalOpen(false);
        setToastMessage(`Added ${data.recipient.email} to DevOps recipients.`);
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        setAddError(data.error || 'Failed to add recipient.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Network error.');
    } finally {
      setAddingRecipient(false);
    }
  };

  // Delete recipient
  const handleDeleteRecipient = async (id: string, email: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/notifications/devops-recipients?id=${id}`, {
        method: 'DELETE',
      });
      setToastMessage(`Removed ${email} from DevOps recipients.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to delete recipient:', err);
      fetchRecipients();
    }
  };

  // Send Single Test Email (Top Card Button)
  const handleSendSingleTestEmail = async () => {
    setTestingSingle(true);
    setToastMessage(null);
    setToastError(null);

    try {
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const count = data.count || recipients.filter((r) => r.enabled).length;
        setToastMessage(
          `Test email sent successfully to ${count} enabled DevOps engineer${count === 1 ? '' : 's'}!`
        );
      } else {
        setToastError(data.error || 'SMTP test failed.');
      }
    } catch (err: any) {
      setToastError(err.message || 'SMTP test request failed.');
    } finally {
      setTestingSingle(false);
      setTimeout(() => {
        setToastMessage(null);
        setToastError(null);
      }, 7000);
    }
  };

  // Send Test Email to All Enabled DevOps Engineers
  const handleSendTestEmailToAll = async () => {
    setTestingAll(true);
    setToastMessage(null);
    setToastError(null);

    const enabledRecipients = recipients.filter((r) => r.enabled).map((r) => r.email);
    if (enabledRecipients.length === 0) {
      setToastError('No enabled DevOps recipients found. Please enable at least one engineer.');
      setTestingAll(false);
      return;
    }

    try {
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: enabledRecipients }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage(
          `Test email sent successfully to ${data.count || enabledRecipients.length} enabled DevOps engineers!`
        );
      } else {
        setToastError(data.error || 'Failed to dispatch test email.');
      }
    } catch (err: any) {
      setToastError(err.message || 'Failed to dispatch test email.');
    } finally {
      setTestingAll(false);
      setTimeout(() => {
        setToastMessage(null);
        setToastError(null);
      }, 8000);
    }
  };

  const formatDateTime = (dateInput: string | Date | undefined) => {
    if (!dateInput) return '02-11-2026 09:15 AM';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '02-11-2026 09:15 AM';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = String(hours).padStart(2, '0');
      return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
    } catch {
      return '02-11-2026 09:15 AM';
    }
  };

  const enabledCount = recipients.filter((r) => r.enabled).length;
  const disabledCount = recipients.filter((r) => !r.enabled).length;

  // Filter feed items
  const filteredFeed = feedNotifications.filter((n) => {
    if (feedSearch) {
      const s = feedSearch.toLowerCase();
      const match =
        n.title?.toLowerCase().includes(s) ||
        n.message?.toLowerCase().includes(s) ||
        n.resourceName?.toLowerCase().includes(s);
      if (!match) return false;
    }
    if (severityFilter === 'unread') return !n.read;
    if (severityFilter === 'critical') return n.severity === 'critical';
    if (severityFilter === 'warning') return n.severity === 'warning';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col relative pb-20">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-blue-400 flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-white font-medium">
              {activeTab === 'feed' ? 'Notifications' : 'Notification Channels'}
            </span>
          </div>

          {/* Main Title & Dual Tab Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-[#1E293B]">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                {activeTab === 'feed' ? (
                  <>
                    <NotificationsIcon className="w-7 h-7" />
                    <span>In-App Notifications</span>
                  </>
                ) : (
                  <>
                    <NotificationChannelsIcon className="w-7 h-7" />
                    <span>Notification Channels</span>
                  </>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'feed'
                  ? 'Real-time alert events, telemetry violations, and system activity feed'
                  : 'Manage Gmail SMTP connectivity, alert delivery channels, and DevOps engineer distribution list'}
              </p>
            </div>

            {/* Tab Pills */}
            <div className="flex items-center bg-[#111A2E] p-1 rounded-xl border border-[#1E293B] shadow-sm self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('feed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'feed'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notifications Feed</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('channels')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'channels'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Channels &amp; DevOps</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {recipients.length}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: NOTIFICATIONS FEED */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              {/* Feed Controls */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search notifications by title, resource name, or threshold..."
                    value={feedSearch}
                    onChange={(e) => setFeedSearch(e.target.value)}
                    className="w-full bg-[#0D1526] border border-[#1E293B] text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  />
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px]">Filter:</span>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'unread', label: `Unread (${unreadCount})` },
                    { id: 'critical', label: 'Critical' },
                    { id: 'warning', label: 'Warning' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSeverityFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        severityFilter === f.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#0D1526] text-slate-400 hover:text-white border border-[#1E293B]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                    className="px-3 py-1.5 rounded-lg bg-[#0D1526] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Mark all read</span>
                  </button>

                  <button
                    onClick={handleClearAllFeed}
                    disabled={feedNotifications.length === 0}
                    className="px-3 py-1.5 rounded-lg bg-[#0D1526] hover:bg-rose-500/20 border border-[#1E293B] text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>

                  <button
                    onClick={fetchFeed}
                    disabled={loadingFeed}
                    className="p-1.5 rounded-lg bg-[#0D1526] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white transition-all"
                    title="Refresh feed"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loadingFeed ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Notification Items List */}
              <div className="space-y-2.5">
                {loadingFeed && feedNotifications.length === 0 ? (
                  <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400 text-xs">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                    <span>Loading in-app notifications...</span>
                  </div>
                ) : filteredFeed.length === 0 ? (
                  <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-12 text-center text-slate-500 space-y-2">
                    <Bell className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-sm font-semibold text-slate-400">No notifications found</p>
                    <p className="text-xs text-slate-500">
                      All systems operating within acceptable threshold limits.
                    </p>
                  </div>
                ) : (
                  filteredFeed.map((item) => {
                    const isCritical = item.severity === 'critical';
                    const isWarning = item.severity === 'warning';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          item.read
                            ? 'bg-[#111A2E]/70 border-[#1E293B] opacity-80 hover:opacity-100'
                            : isCritical
                            ? 'bg-[#1A1828] border-rose-500/40 shadow-sm'
                            : 'bg-[#121E36] border-blue-500/40 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Severity Indicator Icon */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isWarning
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isCritical
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : isWarning
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                {item.severity}
                              </span>

                              {item.provider && (
                                <span className="text-[10px] font-semibold text-slate-300 px-2 py-0.5 rounded bg-[#0D1526] border border-[#1E293B]">
                                  {item.provider.toUpperCase()}
                                </span>
                              )}

                              {item.resourceName && (
                                <span className="text-xs font-semibold text-white font-mono">
                                  {item.resourceName}
                                </span>
                              )}

                              {!item.read && (
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                              )}
                            </div>

                            <p className="text-xs text-slate-200 font-medium leading-relaxed">
                              {item.message}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span>{formatDateTime(item.createdAt)}</span>
                              {item.emailDeliveryStatus && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{item.emailDeliveryStatus}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions on right */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {item.link && (
                            <Link
                              href={item.link}
                              className="px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <span>View Alert</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}

                          {!item.read && (
                            <button
                              onClick={() => handleMarkAsRead(item.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#0D1526] hover:bg-[#18233C] border border-[#1E293B] text-slate-300 hover:text-white rounded-lg transition-all"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATION CHANNELS & DEVOPS RECIPIENTS */}
          {activeTab === 'channels' && (
            <div className="space-y-6">
              {/* CARD 1: Gmail SMTP Configuration */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0D1526] border border-[#1E293B] flex items-center justify-center shadow-inner shrink-0 p-2.5">
                    <GmailLogo className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Gmail SMTP Configuration
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configured and connected to send alerts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {/* Connected Badge */}
                  <div className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{smtpStatus.status}</span>
                  </div>

                  {/* Test Email Button */}
                  <button
                    onClick={handleSendSingleTestEmail}
                    disabled={testingSingle}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {testingSingle ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Test Email</span>
                  </button>
                </div>
              </div>

              {/* CARD 2: DevOps Engineer Email Recipients */}
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-6 shadow-sm space-y-5">
                {/* Header with "+ Add DevOps Engineer" on right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">
                        DevOps Engineer Email Recipients
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Add and manage DevOps engineers who will receive infrastructure alerts
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAddError('');
                      setIsAddModalOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add DevOps Engineer</span>
                  </button>
                </div>

                {/* Recipients Table */}
                <div className="overflow-x-auto rounded-xl border border-[#1E293B] bg-[#0D1526]/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#1E293B] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#111A2E]/60">
                        <th className="py-3.5 px-4 w-12 text-slate-400">#</th>
                        <th className="py-3.5 px-4">Email Address</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Added On</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]/70 text-xs">
                      {loadingRecipients ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            <RotateCw className="w-4 h-4 animate-spin inline-block mr-2" />
                            Loading DevOps recipients...
                          </td>
                        </tr>
                      ) : recipients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            No DevOps engineer recipients added yet.
                          </td>
                        </tr>
                      ) : (
                        recipients.map((rec, index) => (
                          <tr
                            key={rec.id}
                            className="hover:bg-[#18233C]/40 transition-colors group"
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-300">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-200 hover:underline cursor-pointer">
                              {rec.email}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 font-medium">
                              {rec.role || 'DevOps Engineer'}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={rec.enabled}
                                    onChange={() => handleToggleRecipientStatus(rec.id, rec.enabled)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                                <span
                                  className={`text-xs font-semibold ${
                                    rec.enabled ? 'text-emerald-400' : 'text-slate-400'
                                  }`}
                                >
                                  {rec.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                              {formatDateTime(rec.addedOn)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteRecipient(rec.id, rec.email)}
                                title="Remove recipient"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500/90 hover:text-rose-400" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Bar: Summary counts on left & Send Test Email to All on right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="p-1 rounded-full bg-blue-500/20 text-blue-400">
                      <Info className="w-3.5 h-3.5" />
                    </span>
                    <span>
                      Total Recipients: <strong className="text-white">{recipients.length}</strong>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span>
                      Enabled: <strong className="text-emerald-400">{enabledCount}</strong>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span>
                      Disabled: <strong className="text-slate-400">{disabledCount}</strong>
                    </span>
                  </div>

                  <button
                    onClick={handleSendTestEmailToAll}
                    disabled={testingAll || enabledCount === 0}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {testingAll ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send Test Email to All</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Add DevOps Engineer */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Add DevOps Engineer</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDevOpsRecipient} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. devops.lead@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0D1526] border border-[#1E293B] text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Role Description
                </label>
                <input
                  type="text"
                  placeholder="DevOps Engineer"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0D1526] border border-[#1E293B] text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {addError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingRecipient}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {addingRecipient ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{addingRecipient ? 'Adding...' : 'Add Engineer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING GREEN TOAST BANNER */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
          <div className="bg-[#0D2818] border border-emerald-500/80 rounded-xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3 text-white animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-emerald-100">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FLOATING RED TOAST BANNER */}
      {toastError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
          <div className="bg-[#2D1215] border border-rose-500/80 rounded-xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3 text-white animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="text-xs font-medium text-rose-100">{toastError}</span>
            </div>
            <button
              onClick={() => setToastError(null)}
              className="text-rose-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
