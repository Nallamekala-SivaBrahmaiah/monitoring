'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { KubernetesClusterInventory } from '@/components/dashboard/kubernetes/KubernetesClusterInventory';
import { KubernetesClusterDetailView } from '@/components/dashboard/kubernetes/KubernetesClusterDetailView';
import { SSHTerminalModal, SSHTerminalTarget } from '@/components/dashboard/SSHTerminalModal';
import { ConnectSSHModal, ConnectSSHTarget } from '@/components/dashboard/ConnectSSHModal';
import { IKubernetesServerInfo } from '@/lib/kubernetes/k8sServerService';

function KubernetesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlServerId = searchParams.get('server') || searchParams.get('serverId');

  const [servers, setServers] = useState<IKubernetesServerInfo[]>([]);
  const [selectedServer, setSelectedServer] = useState<IKubernetesServerInfo | null>(null);
  const [clusterData, setClusterData] = useState<any | null>(null);
  const [isLoadingServers, setIsLoadingServers] = useState<boolean>(true);
  const [isLoadingCluster, setIsLoadingCluster] = useState<boolean>(false);

  // Live Interactive SSH Terminal Modal
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTarget, setTerminalTarget] = useState<SSHTerminalTarget | null>(null);

  // SSH Credentials Configuration Modal (Fallback only if needed)
  const [sshModalOpen, setSshModalOpen] = useState(false);
  const [sshTarget, setSshTarget] = useState<ConnectSSHTarget | null>(null);

  // 1. Fetch Kubernetes Servers from Backend API
  const fetchServers = useCallback(async (doSync: boolean = false) => {
    setIsLoadingServers(true);
    try {
      const endpoint = doSync ? '/api/kubernetes/servers?sync=true' : '/api/kubernetes/servers';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const list: IKubernetesServerInfo[] = Array.isArray(data.servers) ? data.servers : [];
        setServers(list);

        // If a server was requested in the URL, select it
        if (urlServerId) {
          const matched = list.find(
            (s: IKubernetesServerInfo) =>
              s.id === urlServerId || s.name.toLowerCase() === urlServerId.toLowerCase()
          );
          if (matched) {
            setSelectedServer(matched);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Kubernetes servers:', err);
    } finally {
      setIsLoadingServers(false);
    }
  }, [urlServerId]);

  // 2. Fetch Live Cluster Data for the selected server
  const fetchClusterData = useCallback(async (server: IKubernetesServerInfo, force: boolean = false) => {
    setIsLoadingCluster(true);
    try {
      const endpoint = `/api/kubernetes/cluster/${server.id}${force ? '?force=true' : ''}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setClusterData(data);
      }
    } catch (err) {
      console.warn(`Failed to fetch cluster data for ${server.name}:`, err);
    } finally {
      setIsLoadingCluster(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    if (selectedServer) {
      fetchClusterData(selectedServer);
    } else {
      setClusterData(null);
    }
  }, [selectedServer, fetchClusterData]);

  // Handle selecting a cluster/server (updates URL for bookmarkability)
  const handleSelectServer = (server: IKubernetesServerInfo) => {
    setSelectedServer(server);
    const params = new URLSearchParams(window.location.search);
    params.set('server', server.name);
    router.replace(`/dashboard/kubernetes?${params.toString()}`);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  };

  // Handle returning to all clusters inventory
  const handleBackToInventory = () => {
    setSelectedServer(null);
    setClusterData(null);
    router.replace('/dashboard/kubernetes');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  };

  // Open Live SSH Terminal directly with saved credentials
  const handleOpenTerminal = (server: IKubernetesServerInfo) => {
    setTerminalTarget({
      id: server.id,
      sshServerId: server.id,
      name: server.name,
      host: server.hostname && server.hostname !== '-' ? server.hostname : (server.publicIp || ''),
      port: 22,
      username: server.cloudProvider.toLowerCase().includes('azure') ? 'siva' : 'ubuntu',
      cloudProvider: server.cloudProvider,
      region: server.region,
    });
    setTerminalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-8 space-y-6">
          {selectedServer ? (
            <KubernetesClusterDetailView
              server={selectedServer}
              clusterData={clusterData}
              loadingCluster={isLoadingCluster}
              onBack={handleBackToInventory}
              onRefresh={() => fetchClusterData(selectedServer, true)}
              onOpenTerminal={handleOpenTerminal}
            />
          ) : (
            <KubernetesClusterInventory
              servers={servers}
              isLoading={isLoadingServers}
              onRefresh={(doSync) => fetchServers(doSync)}
              onSelectServer={handleSelectServer}
              onOpenTerminal={handleOpenTerminal}
            />
          )}
        </main>
      </div>

      {/* 1. Live Interactive Web Terminal */}
      {terminalOpen && terminalTarget && (
        <SSHTerminalModal
          isOpen={terminalOpen}
          onClose={() => {
            setTerminalOpen(false);
            setTerminalTarget(null);
          }}
          target={terminalTarget}
          onConfigureSSH={(tgt) => {
            setTerminalOpen(false);
            setSshTarget({
              id: tgt.id || tgt.sshServerId || tgt.vmId,
              name: tgt.name,
              host: tgt.host && tgt.host !== '-' ? tgt.host : '',
              port: tgt.port || 22,
              username: tgt.username || (tgt.cloudProvider === 'azure' ? 'siva' : 'ubuntu'),
              authMethod: 'password',
              cloudProvider: (tgt.cloudProvider as any) || 'other',
              region: tgt.region,
            });
            setSshModalOpen(true);
          }}
        />
      )}

      {/* 2. Configure SSH Credentials Modal */}
      {sshModalOpen && sshTarget && (
        <ConnectSSHModal
          isOpen={sshModalOpen}
          onClose={() => {
            setSshModalOpen(false);
            setSshTarget(null);
          }}
          target={sshTarget}
          onSuccess={() => {
            setSshModalOpen(false);
            fetchServers(true);
            if (sshTarget) {
              setTerminalTarget({
                id: sshTarget.id,
                sshServerId: sshTarget.id,
                name: sshTarget.name,
                host: sshTarget.host,
                port: sshTarget.port,
                username: sshTarget.username,
                cloudProvider: sshTarget.cloudProvider,
              });
              setTerminalOpen(true);
            }
          }}
        />
      )}
    </div>
  );
}

export default function KubernetesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] text-slate-400 flex items-center justify-center text-xs">
          Loading Kubernetes Infrastructure telemetry...
        </div>
      }
    >
      <KubernetesPageContent />
    </Suspense>
  );
}
