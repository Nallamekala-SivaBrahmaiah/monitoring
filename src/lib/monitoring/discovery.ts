import { runFullInfrastructureReconciliation } from '@/lib/sync/reconciliationEngine';

export async function runGlobalResourceDiscovery(): Promise<{
  totalResources: number;
  azureResources: number;
  awsResources: number;
}> {
  const result = await runFullInfrastructureReconciliation();

  return {
    totalResources: result.stats.azureResourcesDiscovered + result.stats.awsResourcesDiscovered,
    azureResources: result.stats.azureResourcesDiscovered,
    awsResources: result.stats.awsResourcesDiscovered,
  };
}
