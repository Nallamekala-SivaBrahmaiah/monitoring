import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AzureVMDetailView } from '@/components/dashboard/AzureVMDetailView';
import { mockAzureVMs } from '@/mock/monitoringData';

export function generateStaticParams() {
  return mockAzureVMs.map((vm) => ({
    vmId: vm.vmId,
  }));
}

export default async function AzureVMDetailsPage({
  params,
}: {
  params: Promise<{ vmId: string }>;
}) {
  const { vmId } = await params;
  const vm =
    mockAzureVMs.find((v) => v.vmId === vmId || v.id === vmId) || mockAzureVMs[0];

  if (!vm) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] text-slate-400 flex items-center justify-center text-xs">
          Loading Azure VM details...
        </div>
      }
    >
      <AzureVMDetailView vm={vm} />
    </Suspense>
  );
}
