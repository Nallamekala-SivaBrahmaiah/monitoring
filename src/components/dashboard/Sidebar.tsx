'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cloud,
  X,
  Check,
  LogOut,
} from 'lucide-react';
import {
  MultiCloudBrandLogo,
  AwsLogo,
  AzureLogo,
  MavenLogo,
  AnsibleLogo,
  NginxLogo,
  DockerLogo,
  KubernetesLogo,
  AwsEc2Logo,
  AzureVmLogo,
  DashboardIcon,
  CloudAccountsIcon,
  RegionsIcon,
  ServersFleetIcon,
  SchedulingIcon,
  MetricsExplorerIcon,
  AlertsIcon,
  NotificationChannelsIcon,
  NotificationsIcon,
  MonitoringOverviewIcon,
  LogsIcon,
  SettingsIcon,
} from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';

interface SidebarProps {
  activeAlertsCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({
  activeAlertsCount,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const {
    cloudProvider,
    setCloudProvider,
    filteredAlerts,
  } = useMonitoring();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggedOutToast, setLoggedOutToast] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  React.useEffect(() => {
    async function loadUnreadCount() {
      try {
        const res = await fetch('/api/notifications?unreadOnly=true&limit=1');
        if (res.ok) {
          const data = await res.json();
          setUnreadNotifCount(data.unreadCount || 0);
        }
      } catch {}
    }
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const alertBadgeCount =
    activeAlertsCount !== undefined
      ? activeAlertsCount
      : filteredAlerts.filter((a) => a.status === 'active').length;

  // Reorganized menu items into logical groups with exact display priority
  const navSections: NavSection[] = [
    {
      title: 'Main Dashboard',
      items: [
        { label: 'Dashboard', href: '/', icon: DashboardIcon },
        {
          label: 'Notifications',
          href: '/dashboard/notifications',
          icon: NotificationsIcon,
          badge: unreadNotifCount,
        },
        {
          label: 'Notification Channels',
          href: '/dashboard/notification-channels',
          icon: NotificationChannelsIcon,
        },
      ],
    },
    {
      title: 'Cloud Infrastructure',
      items: [
        { label: 'Cloud Accounts', href: '/dashboard/cloud-accounts', icon: CloudAccountsIcon },
        { label: 'Regions', href: '/dashboard/regions', icon: RegionsIcon },
        { label: 'Servers', href: '/dashboard/servers', icon: ServersFleetIcon },
        { label: 'EC2 Instances', href: '/dashboard/ec2', icon: AwsEc2Logo },
        { label: 'Azure Virtual Machines', href: '/dashboard/azure-vms', icon: AzureVmLogo },
      ],
    },
    {
      title: 'Automation & Deployment',
      items: [
        { label: 'Server Scheduling', href: '/dashboard/schedules', icon: SchedulingIcon },
        { label: 'Maven', href: '/dashboard/maven', icon: MavenLogo },
        { label: 'Ansible', href: '/dashboard/ansible', icon: AnsibleLogo },
        { label: 'Nginx', href: '/dashboard/nginx', icon: NginxLogo },
      ],
    },
    {
      title: 'Container & Kubernetes',
      items: [
        { label: 'Docker Containers', href: '/dashboard/docker', icon: DockerLogo },
        { label: 'Kubernetes', href: '/dashboard/kubernetes', icon: KubernetesLogo },
      ],
    },
    {
      title: 'Monitoring & Observability',
      items: [
        { label: 'Monitoring', href: '/dashboard/monitoring', icon: MonitoringOverviewIcon },
        {
          label: 'Alerts',
          href: '/dashboard/alerts',
          icon: AlertsIcon,
          badge: alertBadgeCount,
        },
        { label: 'Logs', href: '/dashboard/logs', icon: LogsIcon },
        { label: 'Metrics', href: '/dashboard/metrics', icon: MetricsExplorerIcon },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
      ],
    },
  ];

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  };

  const isItemActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/dashboard';
    }
    if (pathname === href) {
      return true;
    }
    return pathname.startsWith(href + '/');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111A2E] border-r border-[#1E293B] text-slate-300 w-64 select-none">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#1E293B]/70 shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#081226] border border-cyan-500/40 shadow-lg shadow-cyan-500/20 group-hover:scale-105 group-hover:border-cyan-400 transition-all">
            <MultiCloudBrandLogo className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-snug">
              Multi-Cloud
              <br />
              Monitoring
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Observe • Monitor • Alert
            </p>
          </div>
        </Link>
        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Grouped Navigation List with Natural Vertical Scrolling */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {/* Section Category Title */}
            <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/90 flex items-center justify-between">
              <span>{section.title}</span>
            </div>

            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-[#18233C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 flex items-center justify-center shrink-0 transition-transform ${
                          active
                            ? 'scale-105 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]'
                            : 'group-hover:scale-105 opacity-90 group-hover:opacity-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`flex items-center justify-center min-w-[20px] h-4.5 px-1.5 text-[10px] font-bold rounded-full shadow-sm ${
                          typeof item.badge === 'string'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                            : typeof item.badge === 'number' && item.badge > 0
                            ? 'bg-rose-500 text-white'
                            : 'hidden'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Multi-Cloud Support Quick Switcher Box */}
      <div className="px-4 py-2.5 mx-3 mb-2 rounded-xl bg-[#0D1526]/80 border border-[#1E293B] shrink-0">
        <div className="text-[11px] font-medium text-slate-400 text-center mb-1.5">
          Multi-Cloud Support
        </div>
        <div className="flex items-center justify-around gap-2">
          <button
            onClick={() => setCloudProvider(cloudProvider === 'aws' ? 'all' : 'aws')}
            title="Filter by AWS"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
              cloudProvider === 'aws'
                ? 'bg-[#FF9900]/20 border border-[#FF9900]/50 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
            }`}
          >
            <AwsLogo className="w-4 h-4" />
            <span>AWS</span>
          </button>
          <div className="h-4 w-px bg-slate-700/60" />
          <button
            onClick={() => setCloudProvider(cloudProvider === 'azure' ? 'all' : 'azure')}
            title="Filter by Azure"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
              cloudProvider === 'azure'
                ? 'bg-[#0089D6]/20 border border-[#0089D6]/50 text-white shadow'
                : 'text-[#5EA0EF] hover:text-white hover:bg-[#18233C]'
            }`}
          >
            <AzureLogo className="w-4 h-4" />
            <span>Azure</span>
          </button>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0E1628]/60 relative shrink-0">
        <div className="flex items-center justify-between px-2 py-0.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">
              S
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200 leading-tight">
                Siva Brahmaiah
              </span>
              <span className="text-[11px] text-slate-400">Admin</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full mt-2 flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="absolute inset-x-2 bottom-2 p-3 bg-[#111A2E] border border-[#1E293B] rounded-xl shadow-2xl z-50 text-xs">
            <p className="font-semibold text-white mb-2">Confirm Logout?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded text-center"
              >
                Yes
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-1 bg-[#18233C] hover:bg-[#202E4E] text-slate-300 font-semibold rounded text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loggedOutToast && (
          <div className="absolute inset-x-2 bottom-2 p-2 bg-emerald-600/90 text-white text-xs font-semibold rounded-lg text-center shadow-lg">
            ✓ Logged out successfully (Demo Mode)
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 z-30 w-64 h-screen">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="fixed top-0 bottom-0 left-0 w-64 h-screen z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
