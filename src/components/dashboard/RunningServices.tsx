'use client';

import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { mockRunningServices } from '@/mock/monitoringData';
import {
  Ec2Icon,
  EksIcon,
  AzureVmIcon,
  AksIcon,
} from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';

export function RunningServices() {
  const { cloudProvider } = useMonitoring();

  const services = mockRunningServices.filter((svc) => {
    if (cloudProvider === 'aws' && svc.provider !== 'aws') return false;
    if (cloudProvider === 'azure' && svc.provider !== 'azure') return false;
    return true;
  });

  const renderServiceIcon = (name: string) => {
    switch (name.toUpperCase()) {
      case 'EC2':
        return <Ec2Icon className="w-8 h-8 rounded-lg" />;
      case 'EKS':
        return <EksIcon className="w-8 h-8 rounded-lg" />;
      case 'VMS':
        return <AzureVmIcon className="w-8 h-8 rounded-lg" />;
      case 'AKS':
        return <AksIcon className="w-8 h-8 rounded-lg" />;
      default:
        return <Ec2Icon className="w-8 h-8 rounded-lg" />;
    }
  };

  return (
    <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
          <LayoutGrid className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-white">Running Services</h3>
      </div>

      <div className={`grid gap-3 my-auto ${services.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {services.map((svc) => (
          <div
            key={svc.id}
            className="bg-[#0D1526] hover:bg-[#15213a] border border-[#1E293B] hover:border-slate-700/80 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="mb-2 transition-transform group-hover:scale-105">
              {renderServiceIcon(svc.name)}
            </div>
            <div className="text-xs font-bold text-white tracking-wide">
              {svc.name}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {svc.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
