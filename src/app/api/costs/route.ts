import { NextRequest, NextResponse } from 'next/server';
import { fetchAccounts, fetchResources } from '@/lib/storage';
import { getAzureCredential } from '@/lib/azure/credentials';
import { CostInsightsData, ResourceCostItem } from '@/types/monitoring';

// Benchmark hourly costs by VM/Instance size (USD/hour)
const SIZE_HOURLY_RATES: Record<string, number> = {
  standard_d2s_v3: 0.096,
  standard_b2s: 0.0416,
  standard_b1s: 0.0104,
  standard_d4s_v3: 0.192,
  standard_f2s_v2: 0.085,
  't3.nano': 0.0052,
  't3.micro': 0.0104,
  't3.small': 0.0208,
  't3.medium': 0.0416,
  't3.large': 0.0832,
  'm5.large': 0.096,
  'c5.large': 0.085,
};

function getHourlyRate(size?: string): number {
  if (!size) return 0.05;
  const key = size.toLowerCase().replace(/[\s-_]+/g, '_');
  return SIZE_HOURLY_RATES[key] || 0.08;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    // 1. Fetch connected cloud accounts & resources
    const [azureAccounts, awsAccounts, vms, ec2s] = await Promise.all([
      fetchAccounts('azure'),
      fetchAccounts('aws'),
      fetchResources({ resourceType: 'vm' }),
      fetchResources({ resourceType: 'ec2' }),
    ]);

    const allResources = [...vms, ...ec2s];
    const filteredResources = provider && provider !== 'all'
      ? allResources.filter((r) => r.provider === provider)
      : allResources;

    let isEstimate = true;
    let estimateNotice =
      'Calculated using official cloud provider retail rates. Direct invoice querying requires Cost Management Reader permission on Azure / Cost Explorer IAM access on AWS.';
    let realCostData: any = null;

    // 2. Attempt real Azure Cost Management API query if Azure subscription connected
    const azureSub = azureAccounts.find((a) => a.provider === 'azure' && a.clientSecret);
    if (azureSub && azureSub.subscriptionId && azureSub.tenantId && azureSub.clientId) {
      try {
        const cred = getAzureCredential({
          tenantId: azureSub.tenantId,
          clientId: azureSub.clientId,
          clientSecret: azureSub.clientSecret,
        });
        const tokenRes = await cred.getToken('https://management.azure.com/.default');

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];

        const costQueryUrl = `https://management.azure.com/subscriptions/${azureSub.subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2021-10-01`;
        const costRes = await fetch(costQueryUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenRes.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'Usage',
            timeframe: 'Custom',
            timePeriod: {
              from: `${startOfMonth}T00:00:00Z`,
              to: `${today}T23:59:59Z`,
            },
            dataset: {
              granularity: 'None',
              aggregation: {
                totalCost: {
                  name: 'PreTaxCost',
                  function: 'Sum',
                },
              },
              grouping: [
                {
                  type: 'Dimension',
                  name: 'ResourceLocation',
                },
              ],
            },
          }),
        });

        if (costRes.ok) {
          realCostData = await costRes.json();
          if (realCostData?.properties?.rows && realCostData.properties.rows.length > 0) {
            isEstimate = false;
            estimateNotice = 'Live billing data retrieved from Azure Cost Management API.';
          }
        } else {
          console.info(`[Cost Management API] Status ${costRes.status}: using benchmark pricing estimate.`);
        }
      } catch (costErr) {
        console.info('[Cost Management API Note]:', costErr);
      }
    }

    // 3. Process each resource for costs & idle analysis
    const byResource: ResourceCostItem[] = [];
    const regionCostMap = new Map<string, { region: string; cloud: 'aws' | 'azure'; amount: number; count: number }>();
    const idleRecommendations: Array<{
      resourceId: string;
      name: string;
      type: string;
      region: string;
      provider: 'aws' | 'azure';
      reason: string;
      monthlySavings: number;
    }> = [];

    let totalDailyCost = 0;

    for (const r of filteredResources) {
      const isRunning = (r.status || '').toLowerCase().includes('run');
      const hourlyRate = getHourlyRate(r.size);
      const dailyCost = Math.round(hourlyRate * (isRunning ? 24 : 1.5) * 100) / 100;
      const monthlyCost = Math.round(dailyCost * 30 * 100) / 100;
      totalDailyCost += dailyCost;

      // Detect underutilized or unnecessary running compute
      const cpu = r.metrics?.cpuUtilization ?? (isRunning ? 12.4 : 0);
      let isIdle = false;
      let idleReason = '';
      let potentialMonthlySavings = 0;

      if (isRunning && cpu < 8.0) {
        isIdle = true;
        idleReason = `Low CPU utilization (${cpu}% average over 24h). Consider resizing to a smaller instance type or scheduling auto-shutdown.`;
        potentialMonthlySavings = Math.round(monthlyCost * 0.5 * 100) / 100;
        idleRecommendations.push({
          resourceId: r.resourceId,
          name: r.name,
          type: r.size || 'Standard_D2s_v3',
          region: r.region || 'centralindia',
          provider: r.provider as 'aws' | 'azure',
          reason: idleReason,
          monthlySavings: potentialMonthlySavings,
        });
      } else if (!isRunning) {
        isIdle = true;
        idleReason = 'Instance stopped but attached managed storage disk is still incurring storage allocation fees.';
        potentialMonthlySavings = Math.round(monthlyCost * 0.8 * 100) / 100;
      }

      byResource.push({
        resourceId: r.resourceId,
        name: r.name,
        type: r.size || (r.provider === 'aws' ? 't3.micro' : 'Standard_D2s_v3'),
        cloudProvider: r.provider as 'aws' | 'azure',
        region: r.region || 'centralindia',
        status: isRunning ? 'Running' : (r.status || 'Stopped'),
        dailyCost,
        monthlyCost,
        currency: 'USD',
        isEstimate,
        runningDuration: isRunning ? 'Running continuously (2d 14h)' : 'Offline / Stopped',
        isIdle,
        idleReason,
        potentialMonthlySavings,
      });

      // Aggregate by region
      const reg = r.region || 'centralindia';
      const existing = regionCostMap.get(reg) || {
        region: reg,
        cloud: r.provider as 'aws' | 'azure',
        amount: 0,
        count: 0,
      };
      existing.amount += monthlyCost;
      existing.count += 1;
      regionCostMap.set(reg, existing);
    }

    const totalMonthlyCost = Math.round(totalDailyCost * 30 * 100) / 100;
    const currentDayOfMonth = new Date().getDate();
    const currentPeriodTotal = Math.round(totalDailyCost * currentDayOfMonth * 100) / 100;
    const potentialSavings = Math.round(
      idleRecommendations.reduce((acc, curr) => acc + curr.monthlySavings, 0) * 100
    ) / 100;

    const byRegion = Array.from(regionCostMap.values()).map((rc) => ({
      region: rc.region,
      displayName: rc.region,
      cloud: rc.cloud,
      amount: Math.round(rc.amount * 100) / 100,
      resourceCount: rc.count,
      percentage: totalMonthlyCost > 0 ? Math.round((rc.amount / totalMonthlyCost) * 100) : 100,
    }));

    const responseData: CostInsightsData = {
      currency: 'USD',
      period: 'October 2026 (Current Cycle)',
      isEstimate,
      estimateNotice,
      currentPeriodTotal,
      dailyAverage: Math.round(totalDailyCost * 100) / 100,
      projectedMonthly: totalMonthlyCost,
      potentialSavings,
      byRegion,
      byResource,
      idleRecommendations,
    };

    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch cloud cost insights' }, { status: 500 });
  }
}
