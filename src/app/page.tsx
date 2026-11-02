'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Server,
  Boxes,
  Layers,
  AlertTriangle,
  Plus,
  Cloud,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ResourceOverviewChart } from '@/components/dashboard/ResourceOverviewChart';
import { CloudDistributionChart } from '@/components/dashboard/CloudDistributionChart';
import { ServerStatusChart } from '@/components/dashboard/ServerStatusChart';
import { EC2InstancesTable } from '@/components/dashboard/EC2InstancesTable';
import { AzureVMsTable } from '@/components/dashboard/AzureVMsTable';
import { RegionChart } from '@/components/dashboard/RegionChart';
import { RunningServices } from '@/components/dashboard/RunningServices';
import { RecentAlerts } from '@/components/dashboard/RecentAlerts';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { useMonitoring } from '@/context/MonitoringContext';

export default function DashboardPage() {
  const {
    cloudProvider,
    awsAccounts,
    azureSubscriptions,
    filteredEC2Instances,
    filteredAzureVMs,
    overviewMetrics,
  } = useMonitoring();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeAllViewTab, setActiveAllViewTab] = useState<'all' | 'azure' | 'ec2'>('all');

  const hasConnectedAws = awsAccounts.some((a) => a.status === 'Connected');
  const hasConnectedAzure = azureSubscriptions.some((s) => s.status === 'Connected');

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 space-y-6">
          {/* Row 1: Summary Cards */}
          <section aria-label="Dashboard Overview Metrics">
            <div
              className={`grid gap-3.5 ${
                cloudProvider === 'all'
                  ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
                  : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5'
              }`}
            >
              {/* Card 1: AWS Resources (Shown for All or AWS) */}
              {(cloudProvider === 'all' || cloudProvider === 'aws') && (
                <MetricCard
                  title="AWS Resources"
                  count={overviewMetrics.awsResources.total}
                  changeText={overviewMetrics.awsResources.changeText}
                  trendData={overviewMetrics.awsResources.trend}
                  color="#FF9900"
                  icon={<AwsLogo className="w-5 h-5 text-[#FF9900]" />}
                />
              )}

              {/* Card 2: Azure Resources (Shown for All or Azure) */}
              {(cloudProvider === 'all' || cloudProvider === 'azure') && (
                <MetricCard
                  title="Azure Resources"
                  count={overviewMetrics.azureResources.total}
                  changeText={overviewMetrics.azureResources.changeText}
                  trendData={overviewMetrics.azureResources.trend}
                  color="#0089D6"
                  icon={<AzureLogo className="w-4 h-4 text-[#0089D6]" />}
                />
              )}

              {/* Card 3: Total Servers */}
              <MetricCard
                title={
                  cloudProvider === 'aws'
                    ? 'Total EC2 Instances'
                    : cloudProvider === 'azure'
                    ? 'Total Azure VMs'
                    : 'Total Servers'
                }
                count={overviewMetrics.totalServers.total}
                changeText={overviewMetrics.totalServers.runningText}
                trendData={overviewMetrics.totalServers.trend}
                color="#10B981"
                icon={<Server className="w-4 h-4 text-[#10B981]" />}
              />

              {/* Card 4: Docker Containers */}
              <MetricCard
                title={
                  cloudProvider === 'aws'
                    ? 'AWS Containers'
                    : cloudProvider === 'azure'
                    ? 'Azure Containers'
                    : 'Docker Containers'
                }
                count={overviewMetrics.dockerContainers.total}
                changeText={overviewMetrics.dockerContainers.runningText}
                trendData={overviewMetrics.dockerContainers.trend}
                color="#818CF8"
                icon={<Boxes className="w-4 h-4 text-[#818CF8]" />}
              />

              {/* Card 5: K8s Clusters */}
              <MetricCard
                title={
                  cloudProvider === 'aws'
                    ? 'EKS Clusters'
                    : cloudProvider === 'azure'
                    ? 'AKS Clusters'
                    : 'K8s Clusters'
                }
                count={overviewMetrics.k8sClusters.total}
                changeText={overviewMetrics.k8sClusters.healthyText}
                trendData={overviewMetrics.k8sClusters.trend}
                color="#38BDF8"
                icon={<Layers className="w-4 h-4 text-[#38BDF8]" />}
              />

              {/* Card 6: Active Alerts */}
              <MetricCard
                title={
                  cloudProvider === 'aws'
                    ? 'AWS Alerts'
                    : cloudProvider === 'azure'
                    ? 'Azure Alerts'
                    : 'Active Alerts'
                }
                count={overviewMetrics.activeAlerts.total}
                changeText={overviewMetrics.activeAlerts.newText}
                trendData={overviewMetrics.activeAlerts.trend}
                color="#EF4444"
                isNegative={true}
                icon={<AlertTriangle className="w-4 h-4 text-[#EF4444]" />}
              />
            </div>
          </section>

          {/* Row 2: Performance Charts & Distributions (3 Cards) */}
          <section aria-label="Performance and Status Overview">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-6">
                <ResourceOverviewChart initialMetric="CPU" />
              </div>
              <div className="lg:col-span-3">
                <CloudDistributionChart />
              </div>
              <div className="lg:col-span-3">
                <ServerStatusChart />
              </div>
            </div>
          </section>

          {/* Row 3: Resource Tables with Cloud Provider Filtering */}
          <section aria-label="Compute Instances">
            {/* If Cloud Provider is AWS */}
            {cloudProvider === 'aws' && (
              <>
                {!hasConnectedAws ? (
                  <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-8 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-[#FF9900]/15 flex items-center justify-center text-[#FF9900]">
                      <AwsLogo className="w-6 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">
                      No AWS Accounts Connected
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Connect your AWS account via IAM Role ARN and External ID to start monitoring EC2 instances, EKS clusters, and CloudWatch metrics.
                    </p>
                    <Link
                      href="/dashboard/cloud-accounts"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Connect AWS Account</span>
                    </Link>
                  </div>
                ) : (
                  <EC2InstancesTable
                    instances={filteredEC2Instances}
                    showViewAllButton={true}
                    limit={5}
                  />
                )}
              </>
            )}

            {/* If Cloud Provider is Azure */}
            {cloudProvider === 'azure' && (
              <>
                {!hasConnectedAzure ? (
                  <div className="bg-[#111A2E] border border-[#1E293B] rounded-xl p-8 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-[#0089D6]/15 flex items-center justify-center text-[#0089D6]">
                      <AzureLogo className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white">
                      No Azure Subscriptions Connected
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Connect your Azure subscription with Tenant ID and Client ID to monitor Azure Virtual Machines, AKS clusters, and Azure Monitor telemetry.
                    </p>
                    <Link
                      href="/dashboard/cloud-accounts"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0089D6] hover:bg-[#0078D4] text-white font-semibold text-xs rounded-lg shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Connect Azure Subscription</span>
                    </Link>
                  </div>
                ) : (
                  <AzureVMsTable
                    vms={filteredAzureVMs}
                    showViewAllButton={true}
                    limit={5}
                  />
                )}
              </>
            )}

            {/* If Cloud Provider is All Clouds */}
            {cloudProvider === 'all' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 p-1 bg-[#111A2E] border border-[#1E293B] rounded-lg">
                    <button
                      onClick={() => setActiveAllViewTab('all')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        activeAllViewTab === 'all'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5 text-emerald-400" />
                      <span>All Compute Instances ({filteredAzureVMs.length + filteredEC2Instances.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveAllViewTab('azure')}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        activeAllViewTab === 'azure'
                          ? 'bg-[#0089D6] text-white shadow-sm shadow-blue-500/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <AzureLogo className="w-3.5 h-3.5" />
                      <span>Azure Virtual Machines ({filteredAzureVMs.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveAllViewTab('ec2')}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        activeAllViewTab === 'ec2'
                          ? 'bg-[#FF9900] text-slate-900 font-bold shadow-sm shadow-amber-500/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <AwsLogo className="w-4 h-3" />
                      <span>AWS EC2 Instances ({filteredEC2Instances.length})</span>
                    </button>
                  </div>
                </div>

                {/* Tab: ALL COMPUTE (Displays both Azure VMs and AWS EC2 instances) */}
                {activeAllViewTab === 'all' && (
                  <div className="space-y-6">
                    {/* Azure Virtual Machines Section */}
                    <div>
                      <AzureVMsTable
                        vms={filteredAzureVMs}
                        showViewAllButton={true}
                        limit={5}
                      />
                    </div>

                    {/* AWS EC2 Instances Section */}
                    <div>
                      <EC2InstancesTable
                        instances={filteredEC2Instances}
                        showViewAllButton={true}
                        limit={5}
                      />
                    </div>
                  </div>
                )}

                {/* Tab: Azure Only */}
                {activeAllViewTab === 'azure' && (
                  <AzureVMsTable
                    vms={filteredAzureVMs}
                    showViewAllButton={true}
                    limit={5}
                  />
                )}

                {/* Tab: AWS EC2 Only */}
                {activeAllViewTab === 'ec2' && (
                  <EC2InstancesTable
                    instances={filteredEC2Instances}
                    showViewAllButton={true}
                    limit={5}
                  />
                )}
              </div>
            )}
          </section>

          {/* Row 4: Top Regions, Running Services, Recent Alerts (3 Cards) */}
          <section aria-label="Regional Distribution, Services and Alerts">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-3">
                <RegionChart />
              </div>
              <div className="lg:col-span-5">
                <RunningServices />
              </div>
              <div className="lg:col-span-4">
                <RecentAlerts limit={3} />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
