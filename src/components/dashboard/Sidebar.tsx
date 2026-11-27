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
  Radio,
  Palette,
  Shield,
  Zap,
  Flame,
  ChevronDown,
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

export type BrandStyleId = 'aurora' | 'stealth' | 'quantum' | 'prism';

interface BrandStylePreset {
  id: BrandStyleId;
  name: string;
  badge: string;
  desc: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BRAND_STYLE_PRESETS: BrandStylePreset[] = [
  {
    id: 'aurora',
    name: 'Cyber Neon Aurora',
    badge: 'Flagship Neon',
    desc: 'Holographic pulsing glow with live PRO observability telemetry',
    color: 'from-cyan-400 to-indigo-500',
    icon: Sparkles,
  },
  {
    id: 'stealth',
    name: 'Executive Stealth',
    badge: 'Enterprise Minimal',
    desc: 'Apple/Linear obsidian dark with diamond-etched mono styling',
    color: 'from-slate-200 to-slate-400',
    icon: Shield,
  },
  {
    id: 'quantum',
    name: 'Hyper-Grid Quantum',
    badge: 'Datadog Tech',
    desc: 'Emerald cyber radar with 99.99% high-availability engine',
    color: 'from-emerald-400 to-teal-500',
    icon: Zap,
  },
  {
    id: 'prism',
    name: 'Prism 3D Glass',
    badge: 'Stripe Fluid',
    desc: 'Liquid frosted glass with violet chromatic dispersion',
    color: 'from-purple-400 to-pink-500',
    icon: Flame,
  },
];

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

  // Dynamic Brand Header Style customization
  const [brandStyle, setBrandStyle] = useState<BrandStyleId>('aurora');
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const styleDropdownRef = React.useRef<HTMLDivElement | null>(null);

  // Load saved brand style from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('brand_header_style') as BrandStyleId | null;
      if (saved && ['aurora', 'stealth', 'quantum', 'prism'].includes(saved)) {
        setBrandStyle(saved);
      }
    } catch {}
  }, []);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(e.target as Node)) {
        setIsStyleDropdownOpen(false);
      }
    }
    if (isStyleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStyleDropdownOpen]);

  const handleSelectBrandStyle = (styleId: BrandStyleId) => {
    setBrandStyle(styleId);
    setIsStyleDropdownOpen(false);
    try {
      localStorage.setItem('brand_header_style', styleId);
    } catch {}
  };

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
    {
      label: 'Incident Dispatcher',
      href: '/dashboard/incident-dispatcher',
      icon: Radio,
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
      {/* Dynamic Ultra-Premium Brand Header */}
      <div className="relative px-3.5 py-3 border-b border-[#1E293B]/70 shrink-0 bg-gradient-to-r from-[#0C1528] via-[#0E172E] to-[#0A1224]">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            scroll={false}
            onClick={(e) => handleNavClick('/', e)}
            className="flex items-center gap-2.5 group flex-1 min-w-0"
          >
            {/* Style 1: Cyber Neon Aurora */}
            {brandStyle === 'aurora' && (
              <>
                <div className="relative group/logo shrink-0">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-xl blur-sm opacity-70 group-hover/logo:opacity-100 transition duration-500 animate-pulse" />
                  <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-b from-[#0F1B36] via-[#081226] to-[#040914] border border-cyan-400/60 shadow-lg shadow-cyan-500/25 group-hover:scale-105 group-hover:border-cyan-300 transition-all">
                    <MultiCloudBrandLogo className="w-6 h-6" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 text-sm tracking-tight leading-tight truncate">
                      Multi-Cloud
                    </h1>
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm shadow-cyan-500/30">
                      PRO
                    </span>
                  </div>
                  <div className="font-extrabold text-white text-xs tracking-tight truncate">
                    Monitoring
                  </div>
                  <p className="text-[9px] text-cyan-300/80 font-semibold tracking-wider flex items-center gap-1.5 mt-0.5 uppercase truncate">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Observe • Monitor • Alert</span>
                  </p>
                </div>
              </>
            )}

            {/* Style 2: Executive Stealth */}
            {brandStyle === 'stealth' && (
              <>
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#090D16] border border-white/20 shadow-2xl group-hover/logo:border-white/40 transition-all shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent rounded-xl pointer-events-none" />
                  <MultiCloudBrandLogo className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="font-mono font-black text-white text-xs tracking-wider uppercase leading-tight truncate">
                      MULTICLOUD
                    </h1>
                    <span className="px-1 py-0.2 rounded text-[7px] font-mono font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      ENTERPRISE
                    </span>
                  </div>
                  <div className="font-mono font-bold text-slate-300 text-[11px] tracking-wide uppercase truncate">
                    OPS PLATFORM
                  </div>
                  <p className="text-[9px] font-mono text-slate-400 tracking-tight mt-0.5 flex items-center gap-1 truncate">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>99.99% OBSERVE • ALERT</span>
                  </p>
                </div>
              </>
            )}

            {/* Style 3: Hyper-Grid Quantum */}
            {brandStyle === 'quantum' && (
              <>
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#061C24] via-[#04101A] to-[#020810] border-2 border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.35)] group-hover:border-emerald-300 transition-all shrink-0">
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <MultiCloudBrandLogo className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-400 text-sm tracking-tight leading-tight truncate">
                      CloudPulse
                    </h1>
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-black bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                      v2.4
                    </span>
                  </div>
                  <div className="font-bold text-slate-200 text-xs tracking-tight truncate">
                    Multi-Cloud Monitor
                  </div>
                  <p className="text-[9px] text-emerald-400 font-semibold tracking-wide flex items-center gap-1 mt-0.5 truncate">
                    <span>⚡</span>
                    <span>TELEMETRY • RADAR • ALERTS</span>
                  </p>
                </div>
              </>
            )}

            {/* Style 4: Prism 3D Glass */}
            {brandStyle === 'prism' && (
              <>
                <div className="relative group/logo shrink-0">
                  <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl blur-sm opacity-60 group-hover/logo:opacity-100 transition duration-300" />
                  <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_rgba(139,92,246,0.3)] group-hover/logo:scale-105 transition-all">
                    <MultiCloudBrandLogo className="w-6 h-6" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 text-sm tracking-tight leading-tight truncate">
                      Multi-Cloud
                    </h1>
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/50">
                      AI OPS
                    </span>
                  </div>
                  <div className="font-extrabold text-white text-xs tracking-tight truncate">
                    Intelligence Hub
                  </div>
                  <p className="text-[9px] text-purple-300/80 font-medium tracking-wide flex items-center gap-1 mt-0.5 truncate">
                    <span>✦</span>
                    <span>Observe • Monitor • Auto-Heal</span>
                  </p>
                </div>
              </>
            )}
          </Link>

          {/* Quick Style Switcher & Mobile Close */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsStyleDropdownOpen(!isStyleDropdownOpen);
              }}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950/80 text-slate-300 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/40 transition cursor-pointer shadow-sm"
              title="Select Brand Header Style (4 Options)"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            {mobileOpen && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Style Selector Dropdown Modal */}
        {isStyleDropdownOpen && (
          <div
            ref={styleDropdownRef}
            className="absolute top-full left-2 right-2 mt-2 rounded-2xl bg-[#070D1B] border-2 border-cyan-500/50 shadow-2xl shadow-black p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>Brand Header Theme</span>
              </div>
              <button
                type="button"
                onClick={() => setIsStyleDropdownOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {BRAND_STYLE_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = brandStyle === preset.id;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectBrandStyle(preset.id)}
                    className={`w-full flex items-start justify-between p-2 rounded-xl text-left transition cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/80 text-white shadow-md shadow-cyan-500/10'
                        : 'hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${preset.color} flex items-center justify-center text-slate-950 font-bold shrink-0 mt-0.5 shadow-sm`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate">{preset.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{preset.desc}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-1 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>Saved locally</span>
              <span className="text-cyan-400 font-bold">Local System Test</span>
            </div>
          </div>
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
