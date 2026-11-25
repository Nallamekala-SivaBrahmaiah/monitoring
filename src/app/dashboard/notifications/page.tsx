'use client';

import React, { useState, Suspense } from 'react';
import { RotateCw, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import {
  NotificationTopBar,
  NotificationTabKey,
} from '@/components/dashboard/notifications/NotificationTopBar';
import { DeliveryChannelsTab } from '@/components/dashboard/notifications/DeliveryChannelsTab';
import { ActionGroupsTab } from '@/components/dashboard/notifications/ActionGroupsTab';
import { EscalationOnCallTab } from '@/components/dashboard/notifications/EscalationOnCallTab';
import { MaintenanceSilenceTab } from '@/components/dashboard/notifications/MaintenanceSilenceTab';
import { DispatchLogsTab } from '@/components/dashboard/notifications/DispatchLogsTab';

interface ToastNotice {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}

function NotificationsContent() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTabKey>('channels');
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Notification channels & live telemetry stream synced!', 'info');
    }, 600);
  };

  const handleToggleMaintenance = () => {
    const nextState = !maintenanceMode;
    setMaintenanceMode(nextState);
    showToast(
      nextState
        ? 'Maintenance Mode activated! Non-critical alerts are muted.'
        : 'Maintenance Mode deactivated! All notification channels unmuted.',
      nextState ? 'warning' : 'success'
    );
  };

  const handleOpenCreateChannel = () => {
    setActiveTab('channels');
    showToast('Scroll to any channel card below to configure endpoints or recipients.', 'info');
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col relative pb-20 font-sans">
      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Top Bar with Module Customize Button & 5 Navigation Tabs */}
          <NotificationTopBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            maintenanceMode={maintenanceMode}
            onToggleMaintenance={handleToggleMaintenance}
            onRefresh={handleRefresh}
            onOpenCreateChannel={handleOpenCreateChannel}
            isRefreshing={isRefreshing}
          />

          {/* Active Tab View */}
          <div className="transition-all duration-300">
            {activeTab === 'channels' && (
              <DeliveryChannelsTab onShowToast={showToast} />
            )}

            {activeTab === 'action-groups' && (
              <ActionGroupsTab onShowToast={showToast} />
            )}

            {activeTab === 'escalation' && (
              <EscalationOnCallTab onShowToast={showToast} />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceSilenceTab
                maintenanceMode={maintenanceMode}
                onToggleMaintenance={handleToggleMaintenance}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'logs' && (
              <DispatchLogsTab onShowToast={showToast} />
            )}
          </div>
        </main>
      </div>

      {/* Floating Toast Notification Deck */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40'
                : toast.type === 'warning'
                ? 'bg-slate-900/95 text-amber-300 border-amber-500/40 shadow-amber-950/40'
                : 'bg-slate-900/95 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070C18] text-slate-100 flex items-center justify-center">
          <div className="flex items-center gap-2 text-cyan-400 text-sm">
            <RotateCw className="w-5 h-5 animate-spin" />
            <span>Loading Real-Time Notification Channels...</span>
          </div>
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}
