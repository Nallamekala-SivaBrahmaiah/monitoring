import connectToDatabase from '@/lib/mongodb';
import CloudResource from '@/models/CloudResource';
import CloudAccount from '@/models/CloudAccount';
import { fetchAzureVMMetrics } from '@/lib/azure/metrics';
import { getAzureCredential } from '@/lib/azure/credentials';

export async function collectMetricsForActiveResources(): Promise<number> {
  let updated = 0;
  try {
    await connectToDatabase();

    // Query active VMs
    const azureVms = await CloudResource.find({
      provider: 'azure',
      resourceType: 'vm',
      status: 'Running',
    }).lean();

    const accountsMap = new Map<string, any>();

    for (const vm of azureVms) {
      if (!vm.subscriptionId) continue;

      let acc = accountsMap.get(vm.subscriptionId);
      if (!acc) {
        acc = await CloudAccount.findOne({ provider: 'azure', subscriptionId: vm.subscriptionId })
          .select('+clientSecret')
          .lean();
        if (acc) accountsMap.set(vm.subscriptionId, acc);
      }

      if (!acc?.tenantId || !acc?.clientId || !acc?.clientSecret) continue;

      try {
        const cred = getAzureCredential({
          tenantId: acc.tenantId,
          clientId: acc.clientId,
          clientSecret: acc.clientSecret,
        });
        const tokenResponse = await cred.getToken('https://management.azure.com/.default');
        const metrics = await fetchAzureVMMetrics(vm.resourceId, tokenResponse.token);

        await CloudResource.updateOne(
          { _id: vm._id },
          {
            $set: {
              metrics: {
                ...metrics,
                lastUpdated: new Date(),
              },
            },
          }
        );
        updated++;
      } catch (mErr) {
        // Telemetry fetch failed for individual VM
      }
    }
  } catch (err) {
    console.error('[Collect Metrics] Encountered error:', err);
  }

  return updated;
}
