'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import {
  DispatcherTopBar,
  DispatcherTabKey,
} from '@/components/dashboard/incident-dispatcher/DispatcherTopBar';
import { ActiveIncidentsTab } from '@/components/dashboard/incident-dispatcher/ActiveIncidentsTab';
import { DeliveryChannelsTab } from '@/components/dashboard/incident-dispatcher/DeliveryChannelsTab';
import { ActionGroupsTab } from '@/components/dashboard/incident-dispatcher/ActionGroupsTab';
import { EscalationOnCallTab } from '@/components/dashboard/incident-dispatcher/EscalationOnCallTab';
import { MaintenanceSilenceTab } from '@/components/dashboard/incident-dispatcher/MaintenanceSilenceTab';
import { DispatchLogsTab } from '@/components/dashboard/incident-dispatcher/DispatchLogsTab';
import { FleetHealthHeatmapTab } from '@/components/dashboard/incident-dispatcher/FleetHealthHeatmapTab';
import { AlertRulesTab } from '@/components/dashboard/incident-dispatcher/AlertRulesTab';
import { SelfHealingRemediationTab } from '@/components/dashboard/incident-dispatcher/SelfHealingRemediationTab';
import { AlertItem } from '@/types/monitoring';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Power,
  RotateCw,
  Flame,
  ShieldAlert,
} from 'lucide-react';

export default function IncidentDispatcherPage() {
  const [activeTab, setActiveTab] = useState<DispatcherTabKey>('incidents');
  const [connected, setConnected] = useState<boolean>(false);
  const [loadingConnection, setLoadingConnection] = useState<boolean>(false);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);

  // Alerts for ActiveIncidentsTab
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const showToast = useCallback((message: string, type: string = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  }, []);

  // Fetch connection config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/incident-dispatcher/config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setConnected(Boolean(data.connected));
      }
    } catch (err) {
      console.warn('Failed to fetch incident dispatcher config:', err);
    }
  }, []);

  // Toggle connection ON/OFF
  const handleToggleConnection = async () => {
    setLoadingConnection(true);
    const targetState = !connected;
    try {
      const res = await fetch('/api/incident-dispatcher/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connected: targetState }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConnected(data.connected);
        showToast(
          data.connected
            ? 'Incident Dispatcher CONNECTED to Alerts & Notifications pipeline!'
            : 'Incident Dispatcher DISCONNECTED. Standard alert mode active.',
          data.connected ? 'success' : 'warn'
        );
      } else {
        showToast(data.error || 'Failed to toggle connection state', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Connection error', 'error');
    } finally {
      setLoadingConnection(false);
    }
  };

  // Fetch live alerts
  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const res = await fetch('/api/alerts?status=all', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchAlerts();

    const interval = setInterval(() => {
      fetchAlerts();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchConfig, fetchAlerts]);

  // Alert Handlers
  const handleAcknowledge = async (id: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'acknowledge' }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' as any } : a))
        );
        showToast('Alert acknowledged successfully.');
      }
    } catch {
      showToast('Failed to acknowledge alert.', 'error');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'resolve' }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'resolved' as any } : a))
        );
        showToast('Alert marked as resolved.');
      }
    } catch {
      showToast('Failed to resolve alert.', 'error');
    }
  };

  const handleRemove = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    showToast('Alert cleared from incident feed.');
  };

  const handleAutoRemediate = async (alert: AlertItem) => {
    showToast(`Executing remediation playbook for alert ${alert.id}...`);
    setTimeout(() => {
      handleResolve(alert.id);
      showToast(`Remediation executed. Alert ${alert.id} mitigated.`, 'success');
    }, 1500);
  };

  const handleUpdateNote = async (id: string, note: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, notes: note } : a))
    );
    showToast('Incident note saved.');
  };

  const handleSimulateAlert = () => {
    const fakeAlert: AlertItem = {
      id: `sim-${Date.now()}`,
      title: 'High CPU utilization breach',
      resourceName: 'web-prod-ec2',
      resourceId: 'i-09f1938b8192a01',
      resourceType: 'EC2 Instance',
      provider: 'aws',
      metricName: 'cpu',
      value: 92.4,
      threshold: 85,
      severity: 'Critical',
      status: 'active',
      message: 'SIMULATED: High CPU utilization (92.4% > 85%) on web-prod-ec2',
      timestamp: new Date().toISOString(),
    };
    setAlerts((prev) => [fakeAlert, ...prev]);
    showToast('Simulated P1 incident injected.', 'warn');
  };

  const handleToggleMaintenance = () => {
    setMaintenanceMode((m) => !m);
    showToast(
      !maintenanceMode
        ? 'Global maintenance silence activated. Non-critical notifications silenced.'
        : 'Global maintenance silence deactivated.',
      !maintenanceMode ? 'warn' : 'success'
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col relative pb-20">
      <Sidebar />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Top Bar with ON / OFF Master Switch and Tab Navigation */}
          <DispatcherTopBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            connected={connected}
            onToggleConnection={handleToggleConnection}
            loadingConnection={loadingConnection}
            onRefresh={() => {
              fetchConfig();
              fetchAlerts();
              showToast('Refreshed Incident Dispatcher state.');
            }}
          />

          {/* If Disconnected (OFF) Warning Banner */}
          {!connected && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-300">
                    Incident Dispatcher is Currently DISCONNECTED (OFF)
                  </h4>
                  <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                    This module is not connected to the live monitoring alerts pipeline. Standard email notifications
                    and alerts are operating in standalone mode. Connect this module to activate action groups,
                    escalation policies, silence windows, and multi-channel dispatching.
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleConnection}
                disabled={loadingConnection}
                className="px-4 py-2 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 shrink-0 transition-colors shadow-sm"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Connect Module Now</span>
              </button>
            </div>
          )}

          {/* Tab Views */}
          <div className="min-h-[450px]">
            {activeTab === 'incidents' && (
              <ActiveIncidentsTab
                alerts={alerts}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onRemove={handleRemove}
                onAutoRemediate={handleAutoRemediate}
                onUpdateNote={handleUpdateNote}
                onSimulateAlert={handleSimulateAlert}
              />
            )}

            {activeTab === 'channels' && (
              <DeliveryChannelsTab onShowToast={showToast} />
            )}

            {activeTab === 'actionGroups' && (
              <ActionGroupsTab onShowToast={showToast} />
            )}

            {activeTab === 'escalation' && (
              <EscalationOnCallTab onShowToast={showToast} />
            )}

            {activeTab === 'silence' && (
              <MaintenanceSilenceTab
                maintenanceMode={maintenanceMode}
                onToggleMaintenance={handleToggleMaintenance}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'logs' && (
              <DispatchLogsTab onShowToast={showToast} />
            )}

            {activeTab === 'heatmap' && (
              <FleetHealthHeatmapTab
                onAlertTriggered={(srv, metric, val) =>
                  showToast(`Telemetry breach recorded on ${srv} (${metric}: ${val}%)`, 'warn')
                }
              />
            )}

            {activeTab === 'rules' && <AlertRulesTab />}

            {activeTab === 'remediation' && <SelfHealingRemediationTab />}
          </div>
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-[#0D2818] border-emerald-500/80 text-emerald-200'
                : toast.type === 'warn'
                ? 'bg-[#2E2009] border-amber-500/80 text-amber-200'
                : 'bg-[#2D1215] border-rose-500/80 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
