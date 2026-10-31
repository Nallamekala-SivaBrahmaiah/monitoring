'use client';

import React, { use, Suspense } from 'react';
import Link from 'next/link';
import { AzureVMDetailView } from '@/components/dashboard/AzureVMDetailView';
import { useMonitoring } from '@/context/MonitoringContext';

function AzureVMContent({ params }: { params: Promise<{ vmId: string }> }) {
  const resolvedParams = use(params);
  const vmId = resolvedParams.vmId;
  const { filteredAzureVMs } = useMonitoring();

  const vm = filteredAzureVMs.find((v) => v.vmId === vmId || v.id === vmId);

  if (!vm) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-300 flex flex-col items-center justify-center p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Azure Virtual Machine Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested VM ({vmId}) is either not connected, from a deselected region, or still discovering.
        </p>
        <Link
          href="/dashboard/azure-vms"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
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
