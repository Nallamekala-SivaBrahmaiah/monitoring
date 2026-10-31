import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { EC2InstanceDetailView } from '@/components/dashboard/EC2InstanceDetailView';
import { mockEC2Instances } from '@/mock/monitoringData';

export function generateStaticParams() {
  return mockEC2Instances.map((inst) => ({
    instanceId: inst.instanceId,
  }));
}

export default async function EC2InstanceDetailsPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = await params;
  const instance =
    mockEC2Instances.find(
      (i) => i.instanceId === instanceId || i.id === instanceId
    ) || mockEC2Instances[0];

  if (!instance) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] text-slate-400 flex items-center justify-center text-xs">
          Loading instance details...
        </div>
      }
    >
      <EC2InstanceDetailView instance={instance} />
    </Suspense>
  );
}
