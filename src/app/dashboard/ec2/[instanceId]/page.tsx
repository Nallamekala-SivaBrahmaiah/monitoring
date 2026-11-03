'use client';

import React, { use, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { EC2InstanceDetailView } from '@/components/dashboard/EC2InstanceDetailView';
import { useMonitoring } from '@/context/MonitoringContext';
import { Loader2 } from 'lucide-react';

function EC2InstanceContent({ params }: { params: Promise<{ instanceId: string }> }) {
  const resolvedParams = use(params);
  const instanceId = resolvedParams.instanceId;
  const { filteredEC2Instances } = useMonitoring();
  const [fetchedInstance, setFetchedInstance] = useState<any>(null);
  const [loadingDirect, setLoadingDirect] = useState<boolean>(true);

  const contextInstance = filteredEC2Instances.find(
    (i) => i.instanceId === instanceId || i.id === instanceId
  );

  useEffect(() => {
    if (contextInstance) {
      setLoadingDirect(false);
      return;
    }

    let isMounted = true;
    async function loadDirect() {
      try {
        const res = await fetch('/api/aws/ec2');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const found = list.find((i: any) => i.instanceId === instanceId || i.id === instanceId);
            if (found && isMounted) {
              setFetchedInstance(found);
              return;
            }
          }
        }

        // Direct instance fallback lookup
        const directRes = await fetch(`/api/aws/ec2/instances/${encodeURIComponent(instanceId)}`);
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData && !directData.error && isMounted) {
            setFetchedInstance(directData);
          }
        }
      } catch (err) {
        console.warn('Failed to load instance directly:', err);
      } finally {
        if (isMounted) setLoadingDirect(false);
      }
    }

    loadDirect();
    return () => {
      isMounted = false;
    };
  }, [instanceId, contextInstance]);

  const instance = contextInstance || fetchedInstance;

  if (loadingDirect && !instance) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-400 flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        <span className="text-xs">Loading EC2 instance details...</span>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-300 flex flex-col items-center justify-center p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">EC2 Instance Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested instance ({instanceId}) is not currently available or connected.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-[#FF9900] hover:bg-[#FF8800] text-black text-xs font-semibold rounded-lg"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const safeInstance = instance
    ? {
        ...instance,
        historicalMetrics: {
          cpu: instance.historicalMetrics?.cpu || [],
          memory: instance.historicalMetrics?.memory || [],
          diskIo: instance.historicalMetrics?.diskIo || [],
          network: instance.historicalMetrics?.network || [],
        },
      }
    : null;

  return <EC2InstanceDetailView instance={safeInstance || instance} />;
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
