'use client';

import React, { useMemo } from 'react';
import { LayoutGrid, Boxes, Server, Layers } from 'lucide-react';
import {
  Ec2Icon,
  EksIcon,
  AzureVmIcon,
  AksIcon,
} from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';

interface ServiceCardItem {
  id: string;
  name: string;
  provider: 'aws' | 'azure' | 'all';
  countText: string;
  count: number;
  iconType: 'vms' | 'ec2' | 'eks' | 'aks' | 'docker';
}

export function RunningServices() {
  const {
    cloudProvider,
    filteredAzureVMs,
    filteredEC2Instances,
    filteredDockerContainers,
    filteredK8sClusters,
    customServers,
  } = useMonitoring();

  // Aggregate real active services counts
  const azureVmCount = Math.max(
    filteredAzureVMs.length,
    customServers.filter((s) => (s.cloudProvider || 'azure') === 'azure').length
  );
  const ec2Count = filteredEC2Instances.length;
  const dockerCount = filteredDockerContainers.length;
  const k8sCount = filteredK8sClusters.length;

  const services = useMemo<ServiceCardItem[]>(() => {
    const list: ServiceCardItem[] = [];

    if (cloudProvider === 'all') {
      list.push({
        id: 'azure-vms',
        name: 'Azure VMs',
        provider: 'azure',
        countText: `${azureVmCount} Active`,
        count: azureVmCount,
        iconType: 'vms',
      });
      list.push({
        id: 'aws-ec2',
        name: 'AWS EC2',
        provider: 'aws',
        countText: `${ec2Count} Active`,
        count: ec2Count,
        iconType: 'ec2',
      });
      list.push({
        id: 'docker-containers',
        name: 'Containers',
        provider: 'all',
        countText: `${dockerCount} Active`,
        count: dockerCount,
        iconType: 'docker',
      });
      list.push({
        id: 'k8s-clusters',
        name: 'Kubernetes',
        provider: 'all',
        countText: `${k8sCount} Clusters`,
        count: k8sCount,
        iconType: 'aks',
      });
    } else if (cloudProvider === 'azure') {
      list.push({
        id: 'azure-vms',
        name: 'Virtual Machines',
        provider: 'azure',
        countText: `${azureVmCount} Active`,
        count: azureVmCount,
        iconType: 'vms',
      });
      list.push({
        id: 'azure-aks',
        name: 'AKS Clusters',
        provider: 'azure',
        countText: `${k8sCount} Clusters`,
        count: k8sCount,
        iconType: 'aks',
      });
      list.push({
        id: 'docker-containers',
        name: 'Containers',
        provider: 'azure',
        countText: `${dockerCount} Active`,
        count: dockerCount,
        iconType: 'docker',
      });
      list.push({
        id: 'azure-disks',
        name: 'Disks / Volumes',
        provider: 'azure',
        countText: `${azureVmCount} Attached`,
        count: azureVmCount,
        iconType: 'vms',
      });
    } else if (cloudProvider === 'aws') {
      list.push({
        id: 'aws-ec2',
        name: 'EC2 Instances',
        provider: 'aws',
        countText: `${ec2Count} Active`,
        count: ec2Count,
        iconType: 'ec2',
      });
      list.push({
        id: 'aws-eks',
        name: 'EKS Clusters',
        provider: 'aws',
        countText: `${k8sCount} Clusters`,
        count: k8sCount,
        iconType: 'eks',
      });
      list.push({
        id: 'docker-containers',
        name: 'Containers',
        provider: 'aws',
        countText: `${dockerCount} Active`,
        count: dockerCount,
        iconType: 'docker',
      });
      list.push({
        id: 'aws-ebs',
        name: 'EBS Volumes',
        provider: 'aws',
        countText: `${ec2Count} Volumes`,
        count: ec2Count,
        iconType: 'ec2',
      });
    }

    return list;
  }, [cloudProvider, azureVmCount, ec2Count, dockerCount, k8sCount]);

  const renderServiceIcon = (iconType: string) => {
    switch (iconType) {
      case 'vms':
        return <AzureVmIcon className="w-8 h-8 rounded-lg shadow-sm" />;
      case 'ec2':
        return <Ec2Icon className="w-8 h-8 rounded-lg shadow-sm" />;
      case 'eks':
        return <EksIcon className="w-8 h-8 rounded-lg shadow-sm" />;
      case 'aks':
        return <AksIcon className="w-8 h-8 rounded-lg shadow-sm" />;
      case 'docker':
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Boxes className="w-5 h-5" />
          </div>
        );
      default:
        return <Server className="w-8 h-8 text-slate-400" />;
    }
  };

  const totalActive = services.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Running Services</h3>
            <span className="text-[11px] text-slate-400">
              Active multi-cloud compute and cluster workloads
            </span>
          </div>
        </div>

        {totalActive > 0 && (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            {totalActive} {totalActive === 1 ? 'Resource Online' : 'Resources Online'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-auto">
        {services.map((svc) => {
          const isActive = svc.count > 0;
          return (
            <div
              key={svc.id}
              className={`bg-[#0D1526] hover:bg-[#15213a] border rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group relative overflow-hidden ${
                isActive
                  ? 'border-slate-700/80 shadow-sm'
                  : 'border-[#1E293B] opacity-80 hover:opacity-100'
              }`}
            >
              {isActive && (
                <div className="absolute top-2 right-2 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              )}
              <div className="mb-2 transition-transform group-hover:scale-105">
                {renderServiceIcon(svc.iconType)}
              </div>
              <div className="text-xs font-bold text-white tracking-wide truncate max-w-[110px]">
                {svc.name}
              </div>
              <div
                className={`text-[11px] font-semibold mt-0.5 ${
                  isActive ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {svc.countText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
