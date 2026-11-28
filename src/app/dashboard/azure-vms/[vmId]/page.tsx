'use client';

import React, { use, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { AzureVMDetailView } from '@/components/dashboard/AzureVMDetailView';
import { useMonitoring } from '@/context/MonitoringContext';
import { Loader2 } from 'lucide-react';

function AzureVMContent({ params }: { params: Promise<{ vmId: string }> }) {
  const resolvedParams = use(params);
  const vmId = resolvedParams.vmId;
  const decodedParam = decodeURIComponent(vmId).trim();
  const { filteredAzureVMs } = useMonitoring();
  const [fetchedVM, setFetchedVM] = useState<any>(null);
  const [loadingDirect, setLoadingDirect] = useState<boolean>(true);

  // Match from context
  const contextVM = filteredAzureVMs.find((v) => {
    if (!v) return false;
    const vName = (v.name || '').toLowerCase();
    const vId = (v.id || '').toLowerCase();
    const vVmId = (v.vmId || '').toLowerCase();
    const target = decodedParam.toLowerCase();

    return (
      vName === target ||
      vId === target ||
      vVmId === target ||
      vVmId.endsWith('/' + target) ||
      (v as any).resourceId?.toLowerCase() === target
    );
  });

  useEffect(() => {
    if (contextVM) {
      setLoadingDirect(false);
      return;
    }

    let isMounted = true;
    async function loadDirect() {
      try {
        const res = await fetch('/api/azure/vms');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const target = decodedParam.toLowerCase();
            const found = list.find((v: any) => {
              const vName = (v.name || '').toLowerCase();
              const vId = (v.id || '').toLowerCase();
              const vVmId = (v.vmId || '').toLowerCase();
              return (
                vName === target ||
                vId === target ||
                vVmId === target ||
                vVmId.endsWith('/' + target)
              );
            });
            if (found && isMounted) {
              setFetchedVM(found);
              return;
            }
          }
        }

        // Fallback: check /api/servers
        const srvRes = await fetch('/api/servers');
        if (srvRes.ok) {
          const srvList = await srvRes.json();
          if (Array.isArray(srvList)) {
            const target = decodedParam.toLowerCase();
            const foundSrv = srvList.find((s: any) => {
              const sName = (s.name || '').toLowerCase();
              const sId = (s._id || '').toLowerCase();
              const sCloudId = (s.cloudResourceId || '').toLowerCase();
              return (
                s.cloudProvider === 'azure' &&
                (sName === target || sId === target || sCloudId === target || sCloudId.endsWith('/' + target))
              );
            });
            if (foundSrv && isMounted) {
              setFetchedVM({
                id: foundSrv._id,
                vmId: foundSrv.cloudResourceId || foundSrv._id,
                name: foundSrv.name,
                resourceGroup: foundSrv.resourceGroup || 'default-rg',
                subscriptionId: foundSrv.subscriptionId || '',
                region: foundSrv.region || 'eastasia',
                vmSize: foundSrv.hardware?.cpuModel || 'Standard_D2s_v3',
                powerState: foundSrv.status === 'Online' ? 'Running' : 'Stopped',
                status: foundSrv.status,
                publicIp: foundSrv.publicIp || foundSrv.host || '-',
                privateIp: foundSrv.privateIp || '-',
                isSSHConnected: foundSrv.status === 'Online',
                cpuUsage: foundSrv.metrics?.cpu?.usagePercent ?? 0,
                memoryUsage: foundSrv.metrics?.memory?.usagePercent ?? 0,
                diskUsage: foundSrv.metrics?.disks?.[0]?.usagePercent ?? 0,
                uptime: foundSrv.os?.uptimeFormatted || 'Recently started',
                os: foundSrv.os?.name ? `${foundSrv.os.name} ${foundSrv.os.version || ''}` : 'Ubuntu 24.04.5 LTS',
              });
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load Azure VM directly:', err);
      } finally {
        if (isMounted) setLoadingDirect(false);
      }
    }

    loadDirect();
    return () => {
      isMounted = false;
    };
  }, [decodedParam, contextVM]);

  const vm = contextVM || fetchedVM;

  if (loadingDirect && !vm) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-400 flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#0089D6]" />
        <span className="text-xs">Loading Azure Virtual Machine details...</span>
      </div>
    );
  }

  if (!vm) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-300 flex flex-col items-center justify-center p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Azure Virtual Machine Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested VM ({decodedParam}) is not currently available or connected.
        </p>
        <Link
          href="/dashboard/azure-vms"
          className="px-4 py-2 bg-[#0089D6] hover:bg-[#0078D4] text-white text-xs font-semibold rounded-lg"
        >
          Return to Azure VMs
        </Link>
      </div>
    );
  }

  return <AzureVMDetailView vm={vm} />;
}

export default function AzureVMDetailsPage({
  params,
}: {
  params: Promise<{ vmId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] text-slate-400 flex items-center justify-center text-xs">
          Loading Azure Virtual Machine telemetry...
        </div>
      }
    >
      <AzureVMContent params={params} />
    </Suspense>
  );
}
