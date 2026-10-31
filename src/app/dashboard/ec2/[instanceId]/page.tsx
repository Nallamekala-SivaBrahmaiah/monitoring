'use client';

import React, { use, Suspense } from 'react';
import Link from 'next/link';
import { EC2InstanceDetailView } from '@/components/dashboard/EC2InstanceDetailView';
import { useMonitoring } from '@/context/MonitoringContext';

function EC2InstanceContent({ params }: { params: Promise<{ instanceId: string }> }) {
  const resolvedParams = use(params);
  const instanceId = resolvedParams.instanceId;
  const { filteredEC2Instances } = useMonitoring();

  const instance = filteredEC2Instances.find((i) => i.instanceId === instanceId || i.id === instanceId);

  if (!instance) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-300 flex flex-col items-center justify-center p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">EC2 Instance Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested instance ({instanceId}) is not currently available or connected.
        </p>
        <Link
          href="/dashboard/ec2"
          className="px-4 py-2 bg-[#FF9900] hover:bg-[#FF8800] text-black text-xs font-semibold rounded-lg"
        >
          Return to EC2 Instances
        </Link>
      </div>
    );
  }

  return <EC2InstanceDetailView instance={instance} />;
}

export default function EC2InstanceDetailsPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] text-slate-400 flex items-center justify-center text-xs">
          Loading EC2 instance details...
        </div>
      }
    >
      <EC2InstanceContent params={params} />
    </Suspense>
  );
}
