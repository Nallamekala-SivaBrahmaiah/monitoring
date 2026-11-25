'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cloud,
  X,
  Check,
  Server,
  Sparkles,
  Wrench,
  Activity,
} from 'lucide-react';
import {
  MultiCloudBrandLogo,
  MavenLogo,
  TerraformLogo,
  AnsibleLogo,
  NginxLogo,
  DockerLogo,
  KubernetesLogo,
  JenkinsLogo,
  SonarQubeLogo,
  TrivyLogo,
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
  SettingsIcon,
} from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';

interface SidebarProps {
  activeAlertsCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  activeAlertsCount,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const navContainerRef = React.useRef<HTMLDivElement | null>(null);
  const {
    filteredAlerts,
  } = useMonitoring();

  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  // Safely scroll only the internal sidebar container if the active item is outside its visible viewport.
  // NEVER use scrollIntoView() here because native scrollIntoView() scrolls all ancestor containers up to window/body,
  // causing the main page, header, and cards to jump or scroll off-screen.
  React.useEffect(() => {
    if (!navContainerRef.current) return;
    const container = navContainerRef.current;
    const activeEl = container.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      if (elRect.top < containerRect.top) {
        container.scrollTop -= (containerRect.top - elRect.top + 12);
      } else if (elRect.bottom > containerRect.bottom) {
        container.scrollTop += (elRect.bottom - containerRect.bottom + 12);
      }
    }
  }, [pathname]);

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

  const navItems: Array<{
    label: string;
    href: string;
    icon: any;
    badge?: number | string;
  }> = [
    { label: 'Dashboard', href: '/', icon: DashboardIcon },
    { label: 'Home Style Studio', href: '/dashboard/style-studio', icon: Sparkles },
    { label: 'Cloud Accounts', href: '/dashboard/cloud-accounts', icon: CloudAccountsIcon },
    { label: 'Regions', href: '/dashboard/regions', icon: RegionsIcon },
    { label: 'Servers', href: '/dashboard/servers', icon: ServersFleetIcon },
    { label: 'EC2 Instances', href: '/dashboard/ec2', icon: AwsEc2Logo },
    { label: 'Azure Virtual Machines', href: '/dashboard/azure-vms', icon: AzureVmLogo },
    { label: 'On-Premises', href: '/dashboard/on-premises', icon: Server },
    { label: 'Server Scheduling', href: '/dashboard/schedules', icon: SchedulingIcon },
    { label: 'Server Setup & Automation', href: '/dashboard/server-automation', icon: Wrench },
    { label: 'Maven', href: '/dashboard/maven', icon: MavenLogo },
    { label: 'Terraform', href: '/dashboard/terraform', icon: TerraformLogo },
    { label: 'Ansible', href: '/dashboard/ansible', icon: AnsibleLogo },
    { label: 'Nginx', href: '/dashboard/nginx', icon: NginxLogo },
    { label: 'Docker Containers', href: '/dashboard/docker', icon: DockerLogo },
    { label: 'Kubernetes', href: '/dashboard/kubernetes', icon: KubernetesLogo },
    { label: 'DevSecops CI/CD Pipeline', href: '/dashboard/jenkins', icon: JenkinsLogo },
    { label: 'Metrics Explorer', href: '/dashboard/metrics', icon: MetricsExplorerIcon },
    {
      label: 'Alerts',
      href: '/dashboard/alerts',
      icon: AlertsIcon,
      badge: alertBadgeCount,
    },
    {
      label: 'Notification Channels',
      href: '/dashboard/notifications',
      icon: NotificationChannelsIcon,
      badge: unreadNotifCount,
    },
    { label: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
  ];

  const handleNavClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    onCloseMobile?.();

    if (typeof window !== 'undefined') {
      // 1. Instantly reset window and body scroll
      try {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant' as ScrollBehavior,
        });
      } catch {
        window.scrollTo(0, 0);
      }

      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }

      // 2. Reset any inner dashboard main or scrollable content containers
      try {
        const scrollContainers = document.querySelectorAll<HTMLElement>(
          'main, [data-scroll-container], [role="main"], .overflow-y-auto, .overflow-auto'
        );
        scrollContainers.forEach((el) => {
          if (!el.closest('aside')) {
            el.scrollTop = 0;
          }
        });
      } catch {}

      // 3. Dispatch global reset event
      window.dispatchEvent(new CustomEvent('app:reset-scroll'));
    }

    // If already on the same page, prevent redundant routing and ensure scroll is reset to top
    if (pathname === href) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' as ScrollBehavior,
      });
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111A2E] border-r border-[#1E293B] text-slate-300 w-64 select-none">
      {/* Brand Header */}
      <div className="px-4 py-3.5 flex items-center justify-between border-b border-[#1E293B]/70 shrink-0">
        <Link
          href="/"
          scroll={false}
          onClick={(e) => handleNavClick('/', e)}
          className="flex items-center gap-3 group"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#081226] border border-cyan-500/40 shadow-lg shadow-cyan-500/20 group-hover:scale-105 group-hover:border-cyan-400 transition-all shrink-0">
            <MultiCloudBrandLogo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight leading-snug">
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

      {/* Navigation List */}
      <div
        ref={navContainerRef}
        className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-700/60 hover:scrollbar-thumb-slate-600 scrollbar-track-transparent"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              scroll={false}
              data-active={isActive ? 'true' : 'false'}
              onClick={(e) => handleNavClick(item.href, e)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#18233C]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-4 h-4 flex items-center justify-center shrink-0 transition-transform ${
                    isActive
                      ? 'scale-105 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]'
                      : 'group-hover:scale-105 opacity-90 group-hover:opacity-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`flex items-center justify-center min-w-[18px] h-4 px-1 text-[9px] font-bold rounded-full shadow-sm shrink-0 ${
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
  );

  return (
    <>
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 z-30 w-64 h-screen overflow-hidden">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="fixed top-0 bottom-0 left-0 w-64 z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
