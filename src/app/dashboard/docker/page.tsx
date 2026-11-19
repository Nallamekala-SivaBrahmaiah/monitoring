'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { DockerHostInventory } from '@/components/dashboard/docker/DockerHostInventory';
import { DockerServerDetailView } from '@/components/dashboard/docker/DockerServerDetailView';
import { ConnectSSHModal, ConnectSSHTarget } from '@/components/dashboard/ConnectSSHModal';
import { IDockerHostDetails } from '@/lib/docker/dockerEngine';

function DockerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlHostId = searchParams.get('hostId') || searchParams.get('serverId');

  const [hosts, setHosts] = useState<IDockerHostDetails[]>([]);
  const [selectedHost, setSelectedHost] = useState<IDockerHostDetails | null>(null);
  const [isLoadingHosts, setIsLoadingHosts] = useState<boolean>(true);

  // SSH Modal State
  const [sshModalOpen, setSshModalOpen] = useState(false);
  const [sshTarget, setSshTarget] = useState<ConnectSSHTarget | null>(null);

  // 1. Fetch Docker Hosts from Backend API
  const fetchHosts = useCallback(async (doSync: boolean = false) => {
    setIsLoadingHosts(true);
    try {
      const endpoint = doSync ? '/api/docker/hosts?sync=true' : '/api/docker/hosts';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHosts(data);

          // If a host was requested in the URL, select it
          if (urlHostId) {
            const matched = data.find(
              (h: IDockerHostDetails) =>
                h.id === urlHostId || h.host === urlHostId || h.name.toLowerCase() === urlHostId.toLowerCase()
            );
            if (matched) {
              setSelectedHost(matched);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Docker hosts:', err);
    } finally {
      setIsLoadingHosts(false);
    }
  }, [urlHostId]);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  // Handle selecting a host (updates URL for bookmarkability)
  const handleSelectHost = (host: IDockerHostDetails) => {
    setSelectedHost(host);
    const params = new URLSearchParams(window.location.search);
    params.set('hostId', host.id);
    router.replace(`/dashboard/docker?${params.toString()}`);
  };

  // Handle returning to all hosts inventory
  const handleBackToInventory = () => {
    setSelectedHost(null);
    router.replace('/dashboard/docker');
  };

  // Open SSH Terminal for host
  const handleOpenTerminal = (host: IDockerHostDetails) => {
    setSshTarget({
      name: host.name,
      host: host.host,
      port: host.port || 22,
      username: host.username || 'ubuntu',
      authMethod: 'privateKey',
      hasSavedKey: true,
      cloudProvider: (host.cloudProvider === 'azure' || host.cloudProvider === 'aws' || host.cloudProvider === 'on-premise' || host.cloudProvider === 'gcp')
        ? (host.cloudProvider as any)
        : 'other',
    });
    setSshModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
          {selectedHost ? (
            <DockerServerDetailView
              host={selectedHost}
              onBack={handleBackToInventory}
              onOpenTerminal={handleOpenTerminal}
            />
          ) : (
            <DockerHostInventory
              hosts={hosts}
              isLoading={isLoadingHosts}
              onRefresh={(doSync) => fetchHosts(doSync)}
              onSelectHost={handleSelectHost}
            />
          )}
        </main>
      </div>

      {/* Connect SSH Modal */}
      {sshModalOpen && sshTarget && (
        <ConnectSSHModal
          isOpen={sshModalOpen}
          onClose={() => setSshModalOpen(false)}
          target={sshTarget}
          onSuccess={() => {
            setSshModalOpen(false);
            fetchHosts(true);
          }}
        />
      )}
    </div>
  );
}

export default function DockerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] text-slate-400 flex items-center justify-center text-xs">
          Loading Docker Infrastructure telemetry...
        </div>
      }
    >
      <DockerPageContent />
    </Suspense>
  );
}
