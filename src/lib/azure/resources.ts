import { getAzureCredential, AzureCredentials } from './credentials';
import { fetchAzureVMMetrics } from './metrics';

export interface DiscoveredAzureResource {
  resourceId: string;
  name: string;
  resourceType: string;
  resourceGroup: string;
  region: string;
  subscriptionId: string;
  status: string;
  size?: string;
  privateIp?: string;
  publicIp?: string;
  metrics: {
    cpuUtilization: number | null;
    memoryUtilization: number | null;
    diskUtilization: number | null;
    networkIn: number | null;
    networkOut: number | null;
    lastUpdated: Date;
  };
  metadata: Record<string, any>;
}

export async function discoverAllAzureResources(
  subscriptionId: string,
  credentials: AzureCredentials,
  monitoredRegions: string[] = []
): Promise<DiscoveredAzureResource[]> {
  const resources: DiscoveredAzureResource[] = [];

  try {
    const cred = getAzureCredential(credentials);
    const tokenResponse = await cred.getToken('https://management.azure.com/.default');
    const token = tokenResponse.token;

    const monitoredSet = new Set(monitoredRegions.map((r) => r.toLowerCase().replace(/\s+/g, '')));

    let nextLink: string | null = `https://management.azure.com/subscriptions/${subscriptionId}/resources?api-version=2021-04-01&$expand=createdTime,changedTime`;

    while (nextLink) {
      const res: Response = await fetch(nextLink, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        console.warn(`[Azure ARM] Resources fetch failed: HTTP ${res.status}`);
        break;
      }

      const data: any = await res.json();
      const items = Array.isArray(data.value) ? data.value : [];

      for (const item of items) {
        const itemLocation = (item.location || '').toLowerCase().replace(/\s+/g, '');
        if (monitoredSet.size > 0 && itemLocation && !monitoredSet.has(itemLocation)) {
          continue;
        }

        const typeLower = (item.type || '').toLowerCase();
        let normalizedType = 'other';
        let status = 'Healthy';

        if (typeLower.includes('microsoft.compute/virtualmachines')) {
          normalizedType = 'vm';
          status = 'Running';
        } else if (typeLower.includes('microsoft.compute/virtualmachinescalesets')) {
          normalizedType = 'vmss';
          status = 'Running';
        } else if (typeLower.includes('microsoft.compute/disks')) {
          normalizedType = 'disk';
        } else if (typeLower.includes('microsoft.network/networkinterfaces')) {
          normalizedType = 'nic';
        } else if (typeLower.includes('microsoft.network/publicipaddresses')) {
          normalizedType = 'public_ip';
        } else if (typeLower.includes('microsoft.network/loadbalancers')) {
          normalizedType = 'load_balancer';
        } else if (typeLower.includes('microsoft.network/virtualnetworks')) {
          normalizedType = 'vnet';
        } else if (typeLower.includes('microsoft.containerservice/managedclusters')) {
          normalizedType = 'k8s_cluster';
        } else if (typeLower.includes('microsoft.storage/storageaccounts')) {
          normalizedType = 'storage_account';
        }

        const rgMatch = (item.id || '').match(/\/resourcegroups\/([^\/]+)/i);
        const resourceGroup = rgMatch ? rgMatch[1] : '';

        let size: string | undefined;
        let privateIp: string | undefined;
        let publicIp: string | undefined;
        let metrics = {
          cpuUtilization: null as number | null,
          memoryUtilization: null as number | null,
          diskUtilization: null as number | null,
          networkIn: null as number | null,
          networkOut: null as number | null,
          lastUpdated: new Date(),
        };

        if (normalizedType === 'vm') {
          try {
            const vmDetailRes = await fetch(
              `https://management.azure.com${item.id}?api-version=2023-09-01&$expand=instanceView`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            if (vmDetailRes.ok) {
              const vmDetail = await vmDetailRes.json();
              size = vmDetail.properties?.hardwareProfile?.vmSize;

              const statuses = vmDetail.properties?.instanceView?.statuses || [];
              const powerStatus = statuses.find((s: any) => s.code?.startsWith('PowerState/'));
              if (powerStatus) {
                const rawPower = (powerStatus.displayStatus || powerStatus.code.replace('PowerState/', '') || '').toLowerCase();
                if (rawPower.includes('run')) {
                  status = 'Running';
                } else if (rawPower.includes('dealloc') || rawPower.includes('stop')) {
                  status = 'Stopped';
                } else {
                  status = powerStatus.displayStatus || powerStatus.code.replace('PowerState/', '');
                }
              }

              const nics = vmDetail.properties?.networkProfile?.networkInterfaces || [];
              if (nics.length > 0 && nics[0].id) {
                const nicRes = await fetch(`https://management.azure.com${nics[0].id}?api-version=2023-05-01`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (nicRes.ok) {
                  const nicData = await nicRes.json();
                  const ipConfig = nicData.properties?.ipConfigurations?.[0];
                  privateIp = ipConfig?.properties?.privateIPAddress;
                  if (ipConfig?.properties?.publicIPAddress?.id) {
                    const pipRes = await fetch(
                      `https://management.azure.com${ipConfig.properties.publicIPAddress.id}?api-version=2023-05-01`,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (pipRes.ok) {
                      const pipData = await pipRes.json();
                      publicIp = pipData.properties?.ipAddress;
                    }
                  }
                }
              }
            }

            // Real Azure Monitor metrics
            const vmMetrics = await fetchAzureVMMetrics(item.id, token, size);
            metrics = {
              ...vmMetrics,
              lastUpdated: new Date(),
            };
          } catch (vmErr) {
            console.warn(`[Azure VM Detail] Note for ${item.name}:`, vmErr);
          }
        }

        resources.push({
          resourceId: item.id,
          name: item.name,
          resourceType: normalizedType,
          resourceGroup,
          region: item.location,
          subscriptionId,
          status,
          size,
          privateIp,
          publicIp,
          metrics,
          metadata: {
            tags: item.tags || {},
            sku: item.sku || {},
            kind: item.kind,
          },
        });
      }

      nextLink = data.nextLink || null;
    }
  } catch (err) {
    console.error('[Azure ARM] Discovery failed:', err);
  }

  return resources;
}
